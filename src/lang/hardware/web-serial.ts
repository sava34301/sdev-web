// ============================================================
// Web Serial / WebUSB / UF2 — typed helpers + 7 board uploaders
// ============================================================
// Browser-only I/O guarded with `isWebSerialSupported()` / `isWebUsbSupported()`.
// Pure protocol builders/parsers (Intel HEX, UF2, STK500v1/v2, AVR109, SAM-BA,
// ESP SLIP) also run in Node for unit testing.

import type { BoardDescriptor } from './board-db';

function toBuf(bytes: number[] | Uint8Array): ArrayBuffer {
  const buf = new ArrayBuffer(bytes.length);
  new Uint8Array(buf).set(bytes as ArrayLike<number>);
  return buf;
}

export function isWebSerialSupported(): boolean {
  return typeof navigator !== 'undefined' && 'serial' in navigator;
}

export function isWebUsbSupported(): boolean {
  return typeof navigator !== 'undefined' && 'usb' in navigator;
}

// ----- Minimal types so we don't need @types/w3c-web-serial -----
export interface WebSerialPort {
  open(opts: {
    baudRate: number;
    dataBits?: number;
    stopBits?: number;
    parity?: 'none' | 'even' | 'odd';
    flowControl?: 'none' | 'hardware';
  }): Promise<void>;
  close(): Promise<void>;
  setSignals(signals: { dataTerminalReady?: boolean; requestToSend?: boolean }): Promise<void>;
  readable: ReadableStream<Uint8Array>;
  writable: WritableStream<BufferSource>;
  getInfo(): { usbVendorId?: number; usbProductId?: number };
}

interface NavWithSerial {
  serial: {
    requestPort(opts?: { filters?: { usbVendorId?: number; usbProductId?: number }[] }): Promise<WebSerialPort>;
    getPorts(): Promise<WebSerialPort[]>;
  };
}

export async function requestSerialPort(filters?: { vid: number; pid?: number }[]): Promise<WebSerialPort> {
  if (!isWebSerialSupported()) {
    throw new Error('Web Serial API not supported in this browser. Use Chrome, Edge, or Opera on desktop.');
  }
  const nav = navigator as unknown as NavWithSerial;
  return nav.serial.requestPort({
    filters: filters?.map((f) => ({
      usbVendorId: f.vid,
      ...(f.pid !== undefined ? { usbProductId: f.pid } : {}),
    })),
  });
}

export async function getGrantedPorts(): Promise<WebSerialPort[]> {
  if (!isWebSerialSupported()) return [];
  try {
    return await (navigator as unknown as NavWithSerial).serial.getPorts();
  } catch {
    return [];
  }
}

// --------------------------------------------------------------
// Intel-HEX & Base64-bin parser
// --------------------------------------------------------------
export interface ParsedHex {
  data: Uint8Array;     // flat program image, base 0 (or lowest segment offset)
  startAddress: number;
}

export function parseIntelHex(hex: string): ParsedHex {
  const trimmed = hex.trim();
  // If firmware is base64-encoded binary instead of Intel HEX:
  if (trimmed && !trimmed.startsWith(':')) {
    return { data: decodeBase64Bytes(trimmed), startAddress: 0 };
  }
  const lines = trimmed.split(/\r?\n/).filter(Boolean);
  const chunks: { addr: number; bytes: Uint8Array }[] = [];
  let upper = 0;
  let start = 0;
  let minAddr = Infinity;
  for (const ln of lines) {
    if (ln[0] !== ':') continue;
    const len = parseInt(ln.slice(1, 3), 16);
    const addr = parseInt(ln.slice(3, 7), 16);
    const rec = parseInt(ln.slice(7, 9), 16);
    const data = new Uint8Array(len);
    for (let i = 0; i < len; i++) data[i] = parseInt(ln.slice(9 + i * 2, 11 + i * 2), 16);
    switch (rec) {
      case 0x00: {
        const fullAddr = ((upper << 16) >>> 0) + addr;
        chunks.push({ addr: fullAddr, bytes: data });
        if (fullAddr < minAddr) minAddr = fullAddr;
        break;
      }
      case 0x01:
        break; // EOF
      case 0x02:
        upper = (((data[0] << 8) | data[1]) * 16) >>> 16;
        break;
      case 0x04:
        upper = (data[0] << 8) | data[1];
        break;
      case 0x05:
        start = ((data[0] << 24) | (data[1] << 16) | (data[2] << 8) | data[3]) >>> 0;
        break;
    }
  }
  if (chunks.length === 0) return { data: new Uint8Array(), startAddress: start };
  // If the HEX addresses start at RP2040 XIP base (0x10000000) or STM32 flash base (0x08000000),
  // rebase to minAddr so we don't allocate a 256MB buffer.
  const base = minAddr >= 0x08000000 ? minAddr : 0;
  const end = chunks.reduce((m, c) => Math.max(m, c.addr - base + c.bytes.length), 0);
  const buf = new Uint8Array(end).fill(0xFF);
  for (const c of chunks) buf.set(c.bytes, c.addr - base);
  return { data: buf, startAddress: base || start };
}

export function decodeBase64Bytes(b64: string): Uint8Array {
  const clean = b64.replace(/\s+/g, '');
  if (typeof atob === 'function') {
    const bin = atob(clean);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }
  const NodeBuffer = (globalThis as { Buffer?: { from(s: string, enc: string): Uint8Array } }).Buffer;
  if (!NodeBuffer) throw new Error('No base64 decoder available');
  return new Uint8Array(NodeBuffer.from(clean, 'base64'));
}

export function firmwareToBytes(firmware: string | Uint8Array): { data: Uint8Array; startAddress: number } {
  if (firmware instanceof Uint8Array) return { data: firmware, startAddress: 0 };
  return parseIntelHex(firmware);
}

// --------------------------------------------------------------
// Shared Serial stream helpers
// --------------------------------------------------------------
async function withReader<T>(
  port: WebSerialPort,
  fn: (
    reader: ReadableStreamDefaultReader<Uint8Array>,
    writer: WritableStreamDefaultWriter<BufferSource>
  ) => Promise<T>
): Promise<T> {
  const reader = port.readable.getReader();
  const writer = port.writable.getWriter();
  try {
    return await fn(reader, writer);
  } finally {
    try { reader.releaseLock(); } catch { /* ignore */ }
    try { writer.releaseLock(); } catch { /* ignore */ }
  }
}

class SerialBufferReader {
  private queue: number[] = [];
  /**
   * The read that is still waiting for bytes. When a timeout fires we must NOT
   * start a second `reader.read()` — the first one is still queued inside the
   * stream and would swallow the next chunk, so every later reply would be lost.
   * Instead the same pending read is reused until it resolves.
   */
  private pending: Promise<ReadableStreamReadResult<Uint8Array>> | null = null;
  private closed = false;
  constructor(private reader: ReadableStreamDefaultReader<Uint8Array>) {}

  /** Wait up to `ms` for one chunk; returns false on timeout. */
  private async pull(ms: number): Promise<boolean> {
    if (this.closed) throw new Error('serial closed during read');
    if (!this.pending) {
      this.pending = this.reader.read();
      // Releasing the lock later rejects a still-waiting read; that is expected.
      this.pending.catch(() => {});
    }
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<'timeout'>((res) => {
      timer = setTimeout(() => res('timeout'), Math.max(0, ms));
    });
    try {
      const result = await Promise.race([this.pending, timeout]);
      if (result === 'timeout') return false;
      this.pending = null;
      if (result.done) {
        this.closed = true;
        throw new Error('serial closed during read');
      }
      if (result.value) {
        for (let i = 0; i < result.value.length; i++) this.queue.push(result.value[i]);
      }
      return true;
    } finally {
      if (timer !== undefined) clearTimeout(timer);
    }
  }

  async readN(n: number, timeoutMs = 1500): Promise<Uint8Array> {
    const deadline = Date.now() + timeoutMs;
    while (this.queue.length < n) {
      const remaining = deadline - Date.now();
      if (remaining <= 0 || !(await this.pull(remaining))) {
        if (this.queue.length >= n) break;
        throw new Error('serial read timeout');
      }
    }
    return new Uint8Array(this.queue.splice(0, n));
  }

  /** Read one byte, or null when nothing arrives in time. */
  async readByte(timeoutMs: number): Promise<number | null> {
    try {
      return (await this.readN(1, timeoutMs))[0];
    } catch (e) {
      if (e instanceof Error && e.message === 'serial read timeout') return null;
      throw e;
    }
  }

  /** Throw away everything already received plus anything arriving within `quietMs`. */
  async drain(quietMs = 30): Promise<void> {
    this.queue.length = 0;
    while (await this.pull(quietMs)) this.queue.length = 0;
  }

  async readUntilByte(delimiter: number, timeoutMs = 1500): Promise<Uint8Array> {
    const collected: number[] = [];
    const deadline = Date.now() + timeoutMs;
    while (true) {
      const b = (await this.readN(1, Math.max(10, deadline - Date.now())))[0];
      collected.push(b);
      if (b === delimiter) return new Uint8Array(collected);
    }
  }
}

/**
 * Reset an AVR the way avrdude's `arduino` programmer does: drop DTR/RTS,
 * wait, then assert them. The falling edge on the board's RESET line (through
 * its 100 nF capacitor) restarts the chip into the bootloader, which then
 * listens for roughly one second.
 */
async function resetAvr(port: WebSerialPort, waitMs = 250): Promise<void> {
  await port.setSignals({ dataTerminalReady: false, requestToSend: false });
  await new Promise((r) => setTimeout(r, waitMs));
  await port.setSignals({ dataTerminalReady: true, requestToSend: true });
  await new Promise((r) => setTimeout(r, Math.min(50, waitMs)));
}

/** 1200-baud touch reset used by Caterina (AVR109), SAM-BA (BOSSA), and RP2040. */
export async function touch1200Baud(port: WebSerialPort, settleMs = 300): Promise<void> {
  try {
    await port.open({ baudRate: 1200, dataBits: 8, stopBits: 1, parity: 'none' });
    await port.setSignals({ dataTerminalReady: false, requestToSend: false });
    await new Promise((r) => setTimeout(r, 80));
    await port.close();
    await new Promise((r) => setTimeout(r, settleMs));
  } catch {
    // Port may already be in bootloader mode or a test mock that only opens once.
    try { await port.close(); } catch { /* ignore */ }
  }
}

export interface FlashProgress {
  phase: 'reset' | 'sync' | 'write' | 'verify' | 'done';
  written?: number;
  total?: number;
}

// ==============================================================
// 1. STK500v1 — Uno R3, Nano (ATmega328P / ATmega168), ATtiny85
// ==============================================================
export const STK500V1 = {
  GET_SYNC: 0x30,
  CRC_EOP: 0x20,
  OK: 0x10,
  IN_SYNC: 0x14,
  GET_PARAMETER: 0x41,
  SET_DEVICE: 0x42,
  ENTER_PROGMODE: 0x50,
  LEAVE_PROGMODE: 0x51,
  LOAD_ADDRESS: 0x55,
  PROG_PAGE: 0x64,
  READ_SIGN: 0x75,
};

async function stk500v1Command(
  writer: WritableStreamDefaultWriter<BufferSource>,
  bufReader: SerialBufferReader,
  bytes: number[],
  expectExtra = 0
): Promise<Uint8Array> {
  await writer.write(toBuf([...bytes, STK500V1.CRC_EOP]));
  const [insync] = await bufReader.readN(1, 2000);
  if (insync !== STK500V1.IN_SYNC) {
    throw new Error(`STK500: expected IN_SYNC, got 0x${insync.toString(16)}`);
  }
  let extra: Uint8Array = new Uint8Array(0);
  if (expectExtra > 0) extra = await bufReader.readN(expectExtra, 2000);
  const [ok] = await bufReader.readN(1, 2000);
  if (ok !== STK500V1.OK) {
    throw new Error(`STK500: expected OK, got 0x${ok.toString(16)}`);
  }
  return extra;
}

export async function flashAvr(
  port: WebSerialPort,
  hex: string,
  onProgress?: (p: FlashProgress) => void,
  opts?: { baudRate?: number; pageSize?: number; resetWaitMs?: number }
): Promise<void> {
  const { data } = firmwareToBytes(hex);
  const baudRate = opts?.baudRate ?? 115200;
  const pageSize = opts?.pageSize ?? 128;
  await port.open({ baudRate, dataBits: 8, stopBits: 1, parity: 'none' });
  try {
    await withReader(port, async (reader, writer) => {
      const bufReader = new SerialBufferReader(reader);
      const resetWait = opts?.resetWaitMs ?? 250;
      const attemptMs = Math.max(20, Math.min(200, resetWait));
      let synced = false;
      // The bootloader only listens for ~1 s after reset, so if the first window
      // is missed (slow USB adapter, board still running the old sketch) reset
      // again instead of giving up.
      for (let round = 0; round < 3 && !synced; round++) {
        onProgress?.({ phase: 'reset' });
        await resetAvr(port, resetWait);
        await bufReader.drain(Math.min(30, attemptMs));
        onProgress?.({ phase: 'sync' });
        for (let i = 0; i < 8 && !synced; i++) {
          await writer.write(toBuf([STK500V1.GET_SYNC, STK500V1.CRC_EOP]));
          // Scan for IN_SYNC so stray bytes from the old sketch can't misalign us.
          const until = Date.now() + attemptMs;
          while (Date.now() < until) {
            const b = await bufReader.readByte(until - Date.now());
            if (b === null) break;
            if (b !== STK500V1.IN_SYNC) continue;
            const ok = await bufReader.readByte(Math.max(20, until - Date.now()));
            if (ok === STK500V1.OK) { synced = true; break; }
          }
        }
      }
      if (!synced) {
        throw new Error(
          'STK500: could not synchronise with bootloader. Check that the right board and port are selected, ' +
          'close any other app using the port (Arduino IDE serial monitor), or press the board\'s RESET button ' +
          'just as the upload starts.'
        );
      }
      // Earlier GET_SYNC attempts may still be answered — discard those replies.
      await bufReader.drain(Math.min(50, attemptMs));

      await stk500v1Command(writer, bufReader, [STK500V1.ENTER_PROGMODE]);

      for (let offset = 0; offset < data.length; offset += pageSize) {
        const page = data.subarray(offset, Math.min(offset + pageSize, data.length));
        const wordAddr = (offset >> 1) & 0xFFFF;
        await stk500v1Command(writer, bufReader, [
          STK500V1.LOAD_ADDRESS,
          wordAddr & 0xFF,
          (wordAddr >> 8) & 0xFF,
        ]);
        await stk500v1Command(writer, bufReader, [
          STK500V1.PROG_PAGE,
          (page.length >> 8) & 0xFF,
          page.length & 0xFF,
          0x46,
          ...page,
        ]);
        onProgress?.({ phase: 'write', written: offset + page.length, total: data.length });
      }

      await stk500v1Command(writer, bufReader, [STK500V1.LEAVE_PROGMODE]);
      onProgress?.({ phase: 'done', written: data.length, total: data.length });
    });
  } finally {
    try { await port.close(); } catch { /* ignore */ }
  }
}

// ==============================================================
// 2. STK500v2 — Arduino Mega 2560 (ATmega2560)
// ==============================================================
export const STK500V2 = {
  MESSAGE_START: 0x1B,
  TOKEN: 0x0E,
  CMD_SIGN_ON: 0x01,
  CMD_SET_PARAMETER: 0x02,
  CMD_GET_PARAMETER: 0x03,
  CMD_LOAD_ADDRESS: 0x06,
  CMD_ENTER_PROGMODE_ISP: 0x10,
  CMD_LEAVE_PROGMODE_ISP: 0x11,
  CMD_PROGRAM_FLASH_ISP: 0x13,
  STATUS_CMD_OK: 0x00,
};

export function encodeStk500v2Frame(seq: number, body: number[] | Uint8Array): Uint8Array {
  const len = body.length;
  const frame = new Uint8Array(6 + len);
  frame[0] = STK500V2.MESSAGE_START;
  frame[1] = seq & 0xFF;
  frame[2] = (len >> 8) & 0xFF;
  frame[3] = len & 0xFF;
  frame[4] = STK500V2.TOKEN;
  frame.set(body, 5);
  let xor = 0;
  for (let i = 0; i < 5 + len; i++) xor ^= frame[i];
  frame[5 + len] = xor;
  return frame;
}

export function decodeStk500v2Frame(frame: Uint8Array): { seq: number; body: Uint8Array } {
  if (frame.length < 6 || frame[0] !== STK500V2.MESSAGE_START || frame[4] !== STK500V2.TOKEN) {
    throw new Error('STK500v2: invalid frame header');
  }
  const seq = frame[1];
  const len = (frame[2] << 8) | frame[3];
  if (frame.length < 6 + len) {
    throw new Error('STK500v2: truncated frame');
  }
  let xor = 0;
  for (let i = 0; i < 5 + len; i++) xor ^= frame[i];
  if (xor !== frame[5 + len]) {
    throw new Error(`STK500v2: checksum mismatch (expected 0x${xor.toString(16)}, got 0x${frame[5 + len].toString(16)})`);
  }
  return { seq, body: frame.slice(5, 5 + len) };
}

async function stk500v2Transact(
  writer: WritableStreamDefaultWriter<BufferSource>,
  bufReader: SerialBufferReader,
  seq: number,
  body: number[],
  timeoutMs = 2000
): Promise<Uint8Array> {
  const frame = encodeStk500v2Frame(seq, body);
  await writer.write(toBuf(frame));

  // Read until MESSAGE_START (0x1B)
  let start = 0;
  const deadline = Date.now() + timeoutMs;
  while (start !== STK500V2.MESSAGE_START) {
    const [b] = await bufReader.readN(1, Math.max(50, deadline - Date.now()));
    start = b;
  }
  const header = await bufReader.readN(4, timeoutMs); // seq, lenHi, lenLo, token
  if (header[3] !== STK500V2.TOKEN) {
    throw new Error(`STK500v2: expected TOKEN 0x0E, got 0x${header[3].toString(16)}`);
  }
  const len = (header[1] << 8) | header[2];
  const payloadAndChecksum = await bufReader.readN(len + 1, timeoutMs);
  const full = new Uint8Array(6 + len);
  full[0] = STK500V2.MESSAGE_START;
  full.set(header, 1);
  full.set(payloadAndChecksum, 5);
  const decoded = decodeStk500v2Frame(full);
  if (decoded.body[0] !== body[0] || decoded.body[1] !== STK500V2.STATUS_CMD_OK) {
    throw new Error(
      `STK500v2: command 0x${body[0].toString(16)} failed with status 0x${(decoded.body[1] ?? 0xFF).toString(16)}`
    );
  }
  return decoded.body;
}

export async function flashStk500v2(
  port: WebSerialPort,
  hex: string,
  onProgress?: (p: FlashProgress) => void,
  opts?: { baudRate?: number; pageSize?: number; resetWaitMs?: number }
): Promise<void> {
  const { data } = firmwareToBytes(hex);
  const baudRate = opts?.baudRate ?? 115200;
  const pageSize = opts?.pageSize ?? 256;
  await port.open({ baudRate, dataBits: 8, stopBits: 1, parity: 'none' });
  try {
    onProgress?.({ phase: 'reset' });
    await resetAvr(port, opts?.resetWaitMs ?? 50);

    await withReader(port, async (reader, writer) => {
      const bufReader = new SerialBufferReader(reader);
      onProgress?.({ phase: 'sync' });
      let seq = 1;
      let signedOn = false;
      for (let attempt = 0; attempt < 8; attempt++) {
        try {
          await stk500v2Transact(writer, bufReader, seq++, [STK500V2.CMD_SIGN_ON], 400);
          signedOn = true;
          break;
        } catch {
          /* retry */
        }
      }
      if (!signedOn) {
        throw new Error('STK500v2: failed to sign on to Mega 2560 bootloader');
      }

      // Enter ISP programming mode
      await stk500v2Transact(writer, bufReader, seq++, [
        STK500V2.CMD_ENTER_PROGMODE_ISP,
        200, 100, 25, 32, 0, 0x53, 3, 0xAC, 0x53, 0x00, 0x00,
      ]);

      for (let offset = 0; offset < data.length; offset += pageSize) {
        const page = data.subarray(offset, Math.min(offset + pageSize, data.length));
        const wordAddr = (offset >>> 1) >>> 0;
        // Set bit 31 (0x80 in MSB) for large flash (> 64K words) per AVR068
        await stk500v2Transact(writer, bufReader, seq++, [
          STK500V2.CMD_LOAD_ADDRESS,
          ((wordAddr >>> 24) & 0xFF) | 0x80,
          (wordAddr >>> 16) & 0xFF,
          (wordAddr >>> 8) & 0xFF,
          wordAddr & 0xFF,
        ]);
        await stk500v2Transact(writer, bufReader, seq++, [
          STK500V2.CMD_PROGRAM_FLASH_ISP,
          (page.length >> 8) & 0xFF,
          page.length & 0xFF,
          0xC1, 10, 0x40, 0x4C, 0x20, 0xFF, 0xFF,
          ...page,
        ]);
        onProgress?.({ phase: 'write', written: offset + page.length, total: data.length });
      }

      await stk500v2Transact(writer, bufReader, seq++, [STK500V2.CMD_LEAVE_PROGMODE_ISP, 1, 1]);
      onProgress?.({ phase: 'done', written: data.length, total: data.length });
    });
  } finally {
    try { await port.close(); } catch { /* ignore */ }
  }
}

// ==============================================================
// 3. AVR109 / Caterina — Arduino Leonardo & Micro (ATmega32U4)
// ==============================================================
export const AVR109 = {
  SW_ID: 0x53,         // 'S' -> returns 7-char software identifier ("CATERIN")
  ENTER_PROG: 0x50,    // 'P' -> '\r'
  SET_ADDR: 0x41,      // 'A' + addrHi + addrLo -> '\r'
  WRITE_BLOCK: 0x42,   // 'B' + sizeHi + sizeLo + 'F' + bytes -> '\r'
  LEAVE_PROG: 0x4C,    // 'L' -> '\r'
  EXIT_BOOT: 0x45,     // 'E' -> '\r'
  CR: 0x0D,            // '\r'
};

export async function flashAvr109(
  port: WebSerialPort,
  hex: string,
  onProgress?: (p: FlashProgress) => void,
  opts?: { baudRate?: number; pageSize?: number; skipTouchReset?: boolean }
): Promise<void> {
  const { data } = firmwareToBytes(hex);
  const baudRate = opts?.baudRate ?? 57600;
  const pageSize = opts?.pageSize ?? 128;

  onProgress?.({ phase: 'reset' });
  if (!opts?.skipTouchReset) {
    await touch1200Baud(port, 250);
  }

  await port.open({ baudRate, dataBits: 8, stopBits: 1, parity: 'none' });
  try {
    await withReader(port, async (reader, writer) => {
      const bufReader = new SerialBufferReader(reader);
      onProgress?.({ phase: 'sync' });

      // Query bootloader software ID ('S' -> 7 bytes, e.g. "CATERIN")
      await writer.write(toBuf([AVR109.SW_ID]));
      const idBytes = await bufReader.readN(7, 2000);
      const idStr = new TextDecoder().decode(idBytes);
      if (!idStr.trim()) {
        throw new Error('AVR109: empty bootloader identifier');
      }

      // Enter programming mode ('P' -> '\r')
      await writer.write(toBuf([AVR109.ENTER_PROG]));
      const [pAck] = await bufReader.readN(1, 2000);
      if (pAck !== AVR109.CR) {
        throw new Error(`AVR109: expected CR after 'P', got 0x${pAck.toString(16)}`);
      }

      for (let offset = 0; offset < data.length; offset += pageSize) {
        const page = data.subarray(offset, Math.min(offset + pageSize, data.length));
        const wordAddr = (offset >> 1) & 0xFFFF;
        // Set address ('A', hi, lo)
        await writer.write(toBuf([AVR109.SET_ADDR, (wordAddr >> 8) & 0xFF, wordAddr & 0xFF]));
        const [aAck] = await bufReader.readN(1, 2000);
        if (aAck !== AVR109.CR) {
          throw new Error(`AVR109: expected CR after 'A', got 0x${aAck.toString(16)}`);
        }

        // Block load ('B', sizeHi, sizeLo, 'F', ...data)
        await writer.write(
          toBuf([
            AVR109.WRITE_BLOCK,
            (page.length >> 8) & 0xFF,
            page.length & 0xFF,
            0x46, // 'F' for Flash
            ...page,
          ])
        );
        const [bAck] = await bufReader.readN(1, 3000);
        if (bAck !== AVR109.CR) {
          throw new Error(`AVR109: expected CR after 'B', got 0x${bAck.toString(16)}`);
        }
        onProgress?.({ phase: 'write', written: offset + page.length, total: data.length });
      }

      // Leave programming mode ('L') and exit bootloader ('E')
      await writer.write(toBuf([AVR109.LEAVE_PROG]));
      await bufReader.readN(1, 1000);
      await writer.write(toBuf([AVR109.EXIT_BOOT]));
      await bufReader.readN(1, 1000);
      onProgress?.({ phase: 'done', written: data.length, total: data.length });
    });
  } finally {
    try { await port.close(); } catch { /* ignore */ }
  }
}

// ==============================================================
// 4. SAM-BA / BOSSA — Uno R4 WiFi, Zero, Due, MKR, Nano 33
// ==============================================================
export async function flashSamba(
  port: WebSerialPort,
  firmware: string | Uint8Array,
  onProgress?: (p: FlashProgress) => void,
  opts?: { flashBase?: number; chunkSize?: number; skipTouchReset?: boolean }
): Promise<void> {
  const { data } = firmwareToBytes(firmware);
  const flashBase = opts?.flashBase ?? 0x00002000;
  const chunkSize = opts?.chunkSize ?? 256;
  const enc = new TextEncoder();

  onProgress?.({ phase: 'reset' });
  if (!opts?.skipTouchReset) {
    await touch1200Baud(port, 300);
  }

  await port.open({ baudRate: 115200, dataBits: 8, stopBits: 1, parity: 'none' });
  try {
    await withReader(port, async (reader, writer) => {
      const bufReader = new SerialBufferReader(reader);
      onProgress?.({ phase: 'sync' });

      // Set normal (binary) mode: "N#" -> "\n\r"
      await writer.write(toBuf(enc.encode('N#')));
      await bufReader.readN(2, 2000);

      // Query version: "V#" -> "...\r"
      await writer.write(toBuf(enc.encode('V#')));
      await bufReader.readUntilByte(0x0D, 2000);

      // Erase flash region ("X<addr>#" -> "X\n\r")
      const baseHex = flashBase.toString(16).padStart(8, '0');
      await writer.write(toBuf(enc.encode(`X${baseHex}#`)));
      await bufReader.readUntilByte(0x0D, 3000);

      const sramBufAddr = 0x20001000;
      for (let offset = 0; offset < data.length; offset += chunkSize) {
        const chunk = data.subarray(offset, Math.min(offset + chunkSize, data.length));
        const lenHex = chunk.length.toString(16).padStart(8, '0');
        const sramHex = sramBufAddr.toString(16).padStart(8, '0');
        const dstHex = (flashBase + offset).toString(16).padStart(8, '0');

        // Send chunk to SRAM buffer: "S<sramAddr>,<len>#" + raw bytes
        await writer.write(toBuf(enc.encode(`S${sramHex},${lenHex}#`)));
        await writer.write(toBuf(chunk));

        // Copy SRAM buffer to Flash: "Y<sramAddr>,0#" -> "Y\n\r", then "Y<dstAddr>,<len>#" -> "Y\n\r"
        await writer.write(toBuf(enc.encode(`Y${sramHex},0#`)));
        await bufReader.readUntilByte(0x0D, 2000);
        await writer.write(toBuf(enc.encode(`Y${dstHex},${lenHex}#`)));
        await bufReader.readUntilByte(0x0D, 2000);

        onProgress?.({ phase: 'write', written: offset + chunk.length, total: data.length });
      }

      // Reset / jump to application ("K#")
      await writer.write(toBuf(enc.encode('K#')));
      onProgress?.({ phase: 'done', written: data.length, total: data.length });
    });
  } finally {
    try { await port.close(); } catch { /* ignore */ }
  }
}

// ==============================================================
// 5. WebUSB DFU 1.1 / DfuSe — Uno R4 Minima, Giga R1, Portenta H7
// ==============================================================
export interface WebUsbDeviceLike {
  open(): Promise<void>;
  close(): Promise<void>;
  selectConfiguration(configurationValue: number): Promise<void>;
  claimInterface(interfaceNumber: number): Promise<void>;
  releaseInterface(interfaceNumber: number): Promise<void>;
  controlTransferOut(
    setup: {
      requestType: 'class' | 'standard' | 'vendor';
      recipient: 'interface' | 'device' | 'endpoint' | 'other';
      request: number;
      value: number;
      index: number;
    },
    data?: BufferSource
  ): Promise<{ bytesWritten: number; status: string }>;
  controlTransferIn(
    setup: {
      requestType: 'class' | 'standard' | 'vendor';
      recipient: 'interface' | 'device' | 'endpoint' | 'other';
      request: number;
      value: number;
      index: number;
    },
    length: number
  ): Promise<{ data?: DataView; status: string }>;
}

const DFU_REQ = {
  DETACH: 0x00,
  DNLOAD: 0x01,
  UPLOAD: 0x02,
  GETSTATUS: 0x03,
  CLRSTATUS: 0x04,
  GETSTATE: 0x05,
  ABORT: 0x06,
};

async function dfuGetStatus(dev: WebUsbDeviceLike, iface = 0): Promise<{ state: number; pollTimeout: number }> {
  const res = await dev.controlTransferIn(
    { requestType: 'class', recipient: 'interface', request: DFU_REQ.GETSTATUS, value: 0, index: iface },
    6
  );
  const dv = res.data;
  if (!dv || dv.byteLength < 6) return { state: 2, pollTimeout: 1 };
  const pollTimeout = dv.getUint8(1) | (dv.getUint8(2) << 8) | (dv.getUint8(3) << 16);
  const state = dv.getUint8(4);
  return { state, pollTimeout };
}

export async function flashDfuWebUsb(
  board: BoardDescriptor,
  firmware: string | Uint8Array,
  onProgress?: (p: FlashProgress) => void,
  injectedDevice?: WebUsbDeviceLike
): Promise<void> {
  const { data } = firmwareToBytes(firmware);
  let dev = injectedDevice;
  if (!dev) {
    if (!isWebUsbSupported()) {
      throw new Error('WebUSB API not supported in this browser. Use Chrome or Edge on desktop.');
    }
    const navUsb = (navigator as unknown as {
      usb: { requestDevice(opts: { filters: { vendorId: number; productId?: number }[] }): Promise<WebUsbDeviceLike> };
    }).usb;
    dev = await navUsb.requestDevice({
      filters: board.usb.map((u) => ({ vendorId: u.vid, ...(u.pid ? { productId: u.pid } : {}) })),
    });
  }

  await dev.open();
  try {
    await dev.selectConfiguration(1);
    await dev.claimInterface(0);
    onProgress?.({ phase: 'sync' });

    const st0 = await dfuGetStatus(dev, 0);
    if (st0.state === 10 /* dfuERROR */) {
      await dev.controlTransferOut({
        requestType: 'class',
        recipient: 'interface',
        request: DFU_REQ.CLRSTATUS,
        value: 0,
        index: 0,
      });
    }

    // DfuSe Set Address Pointer (command 0x21 + 4-byte LE address) at block 0
    const flashBase = board.flashBase ?? 0x00004000;
    const setAddrCmd = new Uint8Array([
      0x21,
      flashBase & 0xFF,
      (flashBase >>> 8) & 0xFF,
      (flashBase >>> 16) & 0xFF,
      (flashBase >>> 24) & 0xFF,
    ]);
    await dev.controlTransferOut(
      { requestType: 'class', recipient: 'interface', request: DFU_REQ.DNLOAD, value: 0, index: 0 },
      toBuf(setAddrCmd)
    );
    await dfuGetStatus(dev, 0);

    const xferSize = 1024;
    let blockNum = 2; // DfuSe data blocks start at wValue = 2
    for (let offset = 0; offset < data.length; offset += xferSize) {
      const chunk = data.subarray(offset, Math.min(offset + xferSize, data.length));
      await dev.controlTransferOut(
        { requestType: 'class', recipient: 'interface', request: DFU_REQ.DNLOAD, value: blockNum++, index: 0 },
        toBuf(chunk)
      );
      const st = await dfuGetStatus(dev, 0);
      if (st.pollTimeout > 0 && !injectedDevice) {
        await new Promise((r) => setTimeout(r, Math.min(st.pollTimeout, 50)));
      }
      onProgress?.({ phase: 'write', written: offset + chunk.length, total: data.length });
    }

    // Zero-length DFU_DNLOAD to manifest firmware and reset
    await dev.controlTransferOut(
      { requestType: 'class', recipient: 'interface', request: DFU_REQ.DNLOAD, value: 0, index: 0 },
      new ArrayBuffer(0)
    );
    await dfuGetStatus(dev, 0);
    onProgress?.({ phase: 'done', written: data.length, total: data.length });
  } finally {
    try { await dev.releaseInterface(0); } catch { /* ignore */ }
    try { await dev.close(); } catch { /* ignore */ }
  }
}

// ==============================================================
// 6. ESP32 / ESP32-C3 / ESP32-S2 / ESP32-S3 / ESP8266 (SLIP)
// ==============================================================
export const ESP_ROM = {
  SLIP_END: 0xC0,
  SLIP_ESC: 0xDB,
  SLIP_ESC_END: 0xDC,
  SLIP_ESC_ESC: 0xDD,
  FLASH_BEGIN: 0x02,
  FLASH_DATA: 0x03,
  FLASH_END: 0x04,
  SYNC: 0x08,
};

export function slipEncode(payload: Uint8Array | number[]): Uint8Array {
  const out: number[] = [ESP_ROM.SLIP_END];
  for (let i = 0; i < payload.length; i++) {
    const b = payload[i];
    if (b === ESP_ROM.SLIP_END) {
      out.push(ESP_ROM.SLIP_ESC, ESP_ROM.SLIP_ESC_END);
    } else if (b === ESP_ROM.SLIP_ESC) {
      out.push(ESP_ROM.SLIP_ESC, ESP_ROM.SLIP_ESC_ESC);
    } else {
      out.push(b);
    }
  }
  out.push(ESP_ROM.SLIP_END);
  return new Uint8Array(out);
}

export function slipDecode(frame: Uint8Array): Uint8Array {
  const out: number[] = [];
  for (let i = 0; i < frame.length; i++) {
    const b = frame[i];
    if (b === ESP_ROM.SLIP_END) continue;
    if (b === ESP_ROM.SLIP_ESC) {
      const next = frame[++i];
      if (next === ESP_ROM.SLIP_ESC_END) out.push(ESP_ROM.SLIP_END);
      else if (next === ESP_ROM.SLIP_ESC_ESC) out.push(ESP_ROM.SLIP_ESC);
      else throw new Error('SLIP: invalid escape sequence');
    } else {
      out.push(b);
    }
  }
  return new Uint8Array(out);
}

export function buildEspCommandPacket(op: number, data: Uint8Array, checksum = 0): Uint8Array {
  const pkt = new Uint8Array(8 + data.length);
  const dv = new DataView(pkt.buffer);
  dv.setUint8(0, 0x00); // direction = request
  dv.setUint8(1, op);
  dv.setUint16(2, data.length, true);
  dv.setUint32(4, checksum >>> 0, true);
  pkt.set(data, 8);
  return slipEncode(pkt);
}

function espChecksum(data: Uint8Array): number {
  let cs = 0xEF;
  for (let i = 0; i < data.length; i++) cs ^= data[i];
  return cs >>> 0;
}

async function readSlipFrame(bufReader: SerialBufferReader, timeoutMs = 2000): Promise<Uint8Array> {
  // Read until starting 0xC0
  const deadline = Date.now() + timeoutMs;
  while (true) {
    const [b] = await bufReader.readN(1, Math.max(50, deadline - Date.now()));
    if (b === ESP_ROM.SLIP_END) break;
  }
  const raw: number[] = [ESP_ROM.SLIP_END];
  while (true) {
    const [b] = await bufReader.readN(1, Math.max(50, deadline - Date.now()));
    raw.push(b);
    if (b === ESP_ROM.SLIP_END && raw.length > 2) break;
  }
  return slipDecode(new Uint8Array(raw));
}

export async function flashEsp(
  port: WebSerialPort,
  firmware: string | Uint8Array,
  onProgress?: (p: FlashProgress) => void,
  board?: BoardDescriptor,
  opts?: { blockSize?: number; flashOffset?: number }
): Promise<void> {
  const { data } = firmwareToBytes(firmware);
  const baudRate = board?.baudRate ?? 115200;
  const blockSize = opts?.blockSize ?? 1024;
  const flashOffset = opts?.flashOffset ?? 0x10000;

  await port.open({ baudRate, dataBits: 8, stopBits: 1, parity: 'none' });
  try {
    onProgress?.({ phase: 'reset' });
    // Classic ESP32/ESP8266 auto-reset into ROM bootloader using DTR (IO0) & RTS (EN)
    await port.setSignals({ dataTerminalReady: false, requestToSend: true });
    await new Promise((r) => setTimeout(r, 50));
    await port.setSignals({ dataTerminalReady: true, requestToSend: false });
    await new Promise((r) => setTimeout(r, 50));
    await port.setSignals({ dataTerminalReady: false, requestToSend: false });

    await withReader(port, async (reader, writer) => {
      const bufReader = new SerialBufferReader(reader);
      onProgress?.({ phase: 'sync' });

      // SYNC packet: 0x07 0x07 0x12 0x20 followed by thirty-two 0x55 bytes
      const syncData = new Uint8Array(36);
      syncData.set([0x07, 0x07, 0x12, 0x20], 0);
      syncData.fill(0x55, 4);
      const syncPkt = buildEspCommandPacket(ESP_ROM.SYNC, syncData, 0);

      let synced = false;
      for (let attempt = 0; attempt < 8; attempt++) {
        try {
          await writer.write(toBuf(syncPkt));
          const resp = await readSlipFrame(bufReader, 300);
          if (resp[0] === 0x01 && resp[1] === ESP_ROM.SYNC) {
            synced = true;
            break;
          }
        } catch {
          /* retry */
        }
      }
      if (!synced) {
        throw new Error('ESP: failed to sync with ROM bootloader (hold BOOT while pressing RESET)');
      }

      const numBlocks = Math.ceil(data.length / blockSize) || 1;
      const beginPayload = new Uint8Array(16);
      const bdv = new DataView(beginPayload.buffer);
      bdv.setUint32(0, data.length, true);
      bdv.setUint32(4, numBlocks, true);
      bdv.setUint32(8, blockSize, true);
      bdv.setUint32(12, flashOffset, true);
      await writer.write(toBuf(buildEspCommandPacket(ESP_ROM.FLASH_BEGIN, beginPayload, 0)));
      await readSlipFrame(bufReader, 3000);

      for (let seq = 0; seq < numBlocks; seq++) {
        const offset = seq * blockSize;
        const slice = data.subarray(offset, Math.min(offset + blockSize, data.length));
        const padded = new Uint8Array(blockSize).fill(0xFF);
        padded.set(slice, 0);

        const dataPayload = new Uint8Array(16 + blockSize);
        const ddv = new DataView(dataPayload.buffer);
        ddv.setUint32(0, blockSize, true);
        ddv.setUint32(4, seq, true);
        ddv.setUint32(8, 0, true);
        ddv.setUint32(12, 0, true);
        dataPayload.set(padded, 16);

        const pkt = buildEspCommandPacket(ESP_ROM.FLASH_DATA, dataPayload, espChecksum(padded));
        await writer.write(toBuf(pkt));
        await readSlipFrame(bufReader, 3000);
        onProgress?.({
          phase: 'write',
          written: Math.min(offset + blockSize, data.length),
          total: data.length,
        });
      }

      const endPayload = new Uint8Array(4);
      new DataView(endPayload.buffer).setUint32(0, 0, true); // 0 = reboot into app
      await writer.write(toBuf(buildEspCommandPacket(ESP_ROM.FLASH_END, endPayload, 0)));
      await readSlipFrame(bufReader, 2000);
      onProgress?.({ phase: 'done', written: data.length, total: data.length });
    });
  } finally {
    try { await port.close(); } catch { /* ignore */ }
  }
}

// ==============================================================
// 7. RP2040 UF2 generator + File System Access / Download flasher
// ==============================================================
export const UF2_CONSTANTS = {
  MAGIC_START0: 0x0A324655, // "UF2\n"
  MAGIC_START1: 0x9E5D5157,
  MAGIC_END: 0x0AB16F30,
  FLAG_FAMILY_ID_PRESENT: 0x00002000,
  RP2040_FAMILY_ID: 0xE48BFF56,
  RP2040_FLASH_BASE: 0x10000000,
};

/**
 * Convert Intel HEX or raw binary bytes into a standard 512-byte-per-block
 * RP2040 UF2 image (256 payload bytes per block).
 */
export function buildUf2FromHexOrBin(
  firmware: string | Uint8Array,
  baseAddr = UF2_CONSTANTS.RP2040_FLASH_BASE,
  familyId = UF2_CONSTANTS.RP2040_FAMILY_ID
): Uint8Array {
  const { data, startAddress } = firmwareToBytes(firmware);
  const targetBase = startAddress >= 0x10000000 ? startAddress : baseAddr;
  const payloadSize = 256;
  const numBlocks = Math.max(1, Math.ceil(data.length / payloadSize));
  const out = new Uint8Array(numBlocks * 512);

  for (let blockNo = 0; blockNo < numBlocks; blockNo++) {
    const blockOffset = blockNo * 512;
    const dv = new DataView(out.buffer, blockOffset, 512);
    const srcOffset = blockNo * payloadSize;
    const slice = data.subarray(srcOffset, Math.min(srcOffset + payloadSize, data.length));

    dv.setUint32(0, UF2_CONSTANTS.MAGIC_START0, true);
    dv.setUint32(4, UF2_CONSTANTS.MAGIC_START1, true);
    dv.setUint32(8, UF2_CONSTANTS.FLAG_FAMILY_ID_PRESENT, true);
    dv.setUint32(12, (targetBase + srcOffset) >>> 0, true);
    dv.setUint32(16, payloadSize, true);
    dv.setUint32(20, blockNo, true);
    dv.setUint32(24, numBlocks, true);
    dv.setUint32(28, familyId >>> 0, true);
    out.set(slice, blockOffset + 32);
    dv.setUint32(508, UF2_CONSTANTS.MAGIC_END, true);
  }

  return out;
}

export async function flashUf2(
  board: BoardDescriptor,
  firmware: string | Uint8Array,
  onProgress?: (p: FlashProgress) => void
): Promise<{ method: 'fs-access' | 'download'; bytes: number }> {
  onProgress?.({ phase: 'sync' });
  const uf2 = buildUf2FromHexOrBin(firmware);
  onProgress?.({ phase: 'write', written: uf2.length, total: uf2.length });

  // Try File System Access API (`showDirectoryPicker`) so users can select the mounted RPI-RP2 volume directly
  const win = typeof window !== 'undefined' ? (window as unknown as {
    showDirectoryPicker?: (opts?: { mode?: 'readwrite' }) => Promise<{
      getFileHandle(name: string, opts: { create: boolean }): Promise<{
        createWritable(): Promise<{ write(data: BufferSource): Promise<void>; close(): Promise<void> }>;
      }>;
    }>;
  }) : undefined;

  if (win?.showDirectoryPicker) {
    try {
      const dir = await win.showDirectoryPicker({ mode: 'readwrite' });
      const fileHandle = await dir.getFileHandle(`${board.id}-firmware.uf2`, { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(toBuf(uf2));
      await writable.close();
      onProgress?.({ phase: 'done', written: uf2.length, total: uf2.length });
      return { method: 'fs-access', bytes: uf2.length };
    } catch {
      // Fall back to standard browser download if the user cancels the directory picker
    }
  }

  if (typeof document !== 'undefined' && typeof URL !== 'undefined') {
    const blob = new Blob([toBuf(uf2)], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${board.id}-firmware.uf2`;
    a.click();
    URL.revokeObjectURL(url);
  }
  onProgress?.({ phase: 'done', written: uf2.length, total: uf2.length });
  return { method: 'download', bytes: uf2.length };
}

// ==============================================================
// Unified dispatcher: flashBoard
// ==============================================================
export async function flashBoard(
  board: BoardDescriptor,
  port: WebSerialPort | null,
  firmware: string | Uint8Array,
  onProgress?: (p: FlashProgress) => void
): Promise<void> {
  switch (board.uploader) {
    case 'stk500v1':
    case 'avrdude-stk500': {
      if (!port) throw new Error('Select a serial port before uploading.');
      const hexStr = typeof firmware === 'string' ? firmware : new TextDecoder().decode(firmware);
      await flashAvr(port, hexStr, onProgress, {
        baudRate: board.baudRate,
        pageSize: board.pageSize,
      });
      return;
    }
    case 'stk500v2': {
      if (!port) throw new Error('Select a serial port before uploading.');
      const hexStr = typeof firmware === 'string' ? firmware : new TextDecoder().decode(firmware);
      await flashStk500v2(port, hexStr, onProgress, {
        baudRate: board.baudRate,
        pageSize: board.pageSize,
      });
      return;
    }
    case 'avr109': {
      if (!port) throw new Error('Select a serial port before uploading.');
      const hexStr = typeof firmware === 'string' ? firmware : new TextDecoder().decode(firmware);
      await flashAvr109(port, hexStr, onProgress, {
        baudRate: board.baudRate,
        pageSize: board.pageSize,
      });
      return;
    }
    case 'samba': {
      if (!port) throw new Error('Select a serial port before uploading.');
      await flashSamba(port, firmware, onProgress, {
        flashBase: board.flashBase,
      });
      return;
    }
    case 'dfu': {
      await flashDfuWebUsb(board, firmware, onProgress);
      return;
    }
    case 'esptool': {
      if (!port) throw new Error('Select a serial port before uploading.');
      await flashEsp(port, firmware, onProgress, board);
      return;
    }
    case 'uf2': {
      await flashUf2(board, firmware, onProgress);
      return;
    }
    case 'app-lab': {
      throw new Error(
        `${board.label} runs a Linux + Zephyr MCU architecture and is deployed via Arduino App Lab or arduino-cli over ADB/network rather than browser Web Serial. Use "Export .ino" to open in Arduino App Lab.`
      );
    }
    case 'arduino-cli': {
      throw new Error(
        `${board.label} uses a vendor HID bootloader (HalfKay). Use the local arduino-cli build server or export the compiled firmware for Teensy Loader.`
      );
    }
  }
}

// ==============================================================
// Serial Monitor (bidirectional)
// ==============================================================
export async function openSerialMonitor(
  port: WebSerialPort,
  baud: number,
  onChunk: (text: string) => void,
  signal: AbortSignal
): Promise<void> {
  await port.open({ baudRate: baud, dataBits: 8, stopBits: 1, parity: 'none' });
  const reader = port.readable.getReader();
  const decoder = new TextDecoder();
  signal.addEventListener('abort', () => {
    reader.cancel().catch(() => {});
  });
  try {
    while (!signal.aborted) {
      const { value, done } = await reader.read();
      if (done) break;
      if (value) onChunk(decoder.decode(value, { stream: true }));
    }
  } finally {
    try { reader.releaseLock(); } catch { /* ignore */ }
    try { await port.close(); } catch { /* ignore */ }
  }
}

export async function sendSerialText(port: WebSerialPort, text: string): Promise<void> {
  const writer = port.writable.getWriter();
  try {
    await writer.write(toBuf(new TextEncoder().encode(text)));
  } finally {
    try { writer.releaseLock(); } catch { /* ignore */ }
  }
}
