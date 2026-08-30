// ============================================================
// Web Serial — typed helpers + Intel HEX flasher
// ============================================================
// Browser-only. Guard callers with `isWebSerialSupported()`.


function toBuf(bytes: number[] | Uint8Array): ArrayBuffer {
  const buf = new ArrayBuffer(bytes.length);
  new Uint8Array(buf).set(bytes as ArrayLike<number>);
  return buf;
}
export function isWebSerialSupported(): boolean {
  return typeof navigator !== 'undefined' && 'serial' in navigator;
}

// ----- Minimal types so we don't need @types/w3c-web-serial -----
export interface WebSerialPort {
  open(opts: { baudRate: number; dataBits?: number; stopBits?: number; parity?: 'none' | 'even' | 'odd'; flowControl?: 'none' | 'hardware' }): Promise<void>;
  close(): Promise<void>;
  setSignals(signals: { dataTerminalReady?: boolean; requestToSend?: boolean }): Promise<void>;
  readable: ReadableStream<Uint8Array>;
  // Loose buffer type avoids ArrayBuffer/SharedArrayBuffer variance noise.
  writable: WritableStream<BufferSource>;
  getInfo(): { usbVendorId?: number; usbProductId?: number };
}

interface NavWithSerial { serial: { requestPort(opts?: { filters?: { usbVendorId?: number; usbProductId?: number }[] }): Promise<WebSerialPort>; getPorts(): Promise<WebSerialPort[]> } }

export async function requestSerialPort(filters?: { vid: number; pid?: number }[]): Promise<WebSerialPort> {
  if (!isWebSerialSupported()) throw new Error('Web Serial API not supported in this browser. Use Chrome, Edge, or Opera on desktop.');
  const nav = navigator as unknown as NavWithSerial;
  return nav.serial.requestPort({
    filters: filters?.map(f => ({ usbVendorId: f.vid, ...(f.pid !== undefined ? { usbProductId: f.pid } : {}) })),
  });
}

export async function getGrantedPorts(): Promise<WebSerialPort[]> {
  if (!isWebSerialSupported()) return [];
  try {
    // Embedded previews disallow the "serial" permission policy; treat that
    // as "no ports granted" rather than letting it surface as a crash.
    return await (navigator as unknown as NavWithSerial).serial.getPorts();
  } catch {
    return [];
  }
}

// --------------------------------------------------------------
// Intel-HEX parser — used to convert arduino-cli's .hex to bytes.
// --------------------------------------------------------------
export interface ParsedHex {
  data: Uint8Array;     // flat program image, base 0
  startAddress: number;
}

export function parseIntelHex(hex: string): ParsedHex {
  const lines = hex.split(/\r?\n/).filter(Boolean);
  const chunks: { addr: number; bytes: Uint8Array }[] = [];
  let upper = 0;
  let start = 0;
  for (const ln of lines) {
    if (ln[0] !== ':') continue;
    const len = parseInt(ln.substr(1, 2), 16);
    const addr = parseInt(ln.substr(3, 4), 16);
    const rec = parseInt(ln.substr(7, 2), 16);
    const data = new Uint8Array(len);
    for (let i = 0; i < len; i++) data[i] = parseInt(ln.substr(9 + i * 2, 2), 16);
    switch (rec) {
      case 0x00: chunks.push({ addr: (upper << 16) | addr, bytes: data }); break;
      case 0x01: break; // EOF
      case 0x02: upper = ((data[0] << 8) | data[1]) >>> 0; upper = (upper * 16) >>> 16; break;
      case 0x04: upper = (data[0] << 8) | data[1]; break;
      case 0x05: start = (data[0] << 24) | (data[1] << 16) | (data[2] << 8) | data[3]; break;
    }
  }
  if (chunks.length === 0) return { data: new Uint8Array(), startAddress: start };
  const end = chunks.reduce((m, c) => Math.max(m, c.addr + c.bytes.length), 0);
  const buf = new Uint8Array(end).fill(0xFF);
  for (const c of chunks) buf.set(c.bytes, c.addr);
  return { data: buf, startAddress: start };
}

// --------------------------------------------------------------
// STK500v1 — Arduino Uno / Nano (ATmega328P) bootloader protocol.
// Reference: https://github.com/Optiboot/optiboot and AVR061.
// --------------------------------------------------------------
const STK = {
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

async function withReader<T>(port: WebSerialPort, fn: (reader: ReadableStreamDefaultReader<Uint8Array>, writer: WritableStreamDefaultWriter<BufferSource>) => Promise<T>): Promise<T> {
  const reader = port.readable.getReader();
  const writer = port.writable.getWriter();
  try { return await fn(reader, writer); }
  finally {
    try { reader.releaseLock(); } catch { /* ignore */ }
    try { writer.releaseLock(); } catch { /* ignore */ }
  }
}

async function readN(reader: ReadableStreamDefaultReader<Uint8Array>, n: number, timeoutMs = 1000): Promise<Uint8Array> {
  const out = new Uint8Array(n);
  let got = 0;
  const deadline = performance.now() + timeoutMs;
  while (got < n) {
    const remaining = deadline - performance.now();
    if (remaining <= 0) throw new Error('serial read timeout');
    const result = await Promise.race([
      reader.read(),
      new Promise<{ done: true; value?: Uint8Array }>((_, rej) => setTimeout(() => rej(new Error('serial read timeout')), remaining)),
    ]);
    if (result.done) throw new Error('serial closed during read');
    const chunk = result.value!;
    const take = Math.min(chunk.length, n - got);
    out.set(chunk.subarray(0, take), got);
    got += take;
  }
  return out;
}

async function command(writer: WritableStreamDefaultWriter<BufferSource>, reader: ReadableStreamDefaultReader<Uint8Array>, bytes: number[], expectExtra = 0): Promise<Uint8Array> {
  await writer.write(toBuf([...bytes, STK.CRC_EOP]));
  const [insync] = await readN(reader, 1, 2000);
  if (insync !== STK.IN_SYNC) throw new Error(`STK500: expected IN_SYNC, got 0x${insync.toString(16)}`);
  let extra: Uint8Array = new Uint8Array(new ArrayBuffer(0));
  if (expectExtra > 0) extra = await readN(reader, expectExtra, 2000);
  const [ok] = await readN(reader, 1, 2000);
  if (ok !== STK.OK) throw new Error(`STK500: expected OK, got 0x${ok.toString(16)}`);
  return extra;
}

/** Reset the AVR by toggling DTR — the standard Arduino "auto-reset". */
async function resetAvr(port: WebSerialPort): Promise<void> {
  await port.setSignals({ dataTerminalReady: false, requestToSend: false });
  await new Promise(r => setTimeout(r, 100));
  await port.setSignals({ dataTerminalReady: true, requestToSend: true });
  await new Promise(r => setTimeout(r, 50));
  await port.setSignals({ dataTerminalReady: false, requestToSend: false });
  await new Promise(r => setTimeout(r, 50));
}

export interface FlashProgress { phase: 'reset' | 'sync' | 'write' | 'verify' | 'done'; written?: number; total?: number; }

/**
 * Flash an ATmega328P (Uno / Nano w/ optiboot or stk500v1 @115200).
 * `hex` is the Intel HEX text produced by arduino-cli.
 */
export async function flashAvr(port: WebSerialPort, hex: string, onProgress?: (p: FlashProgress) => void): Promise<void> {
  const { data } = parseIntelHex(hex);
  await port.open({ baudRate: 115200, dataBits: 8, stopBits: 1, parity: 'none' });
  try {
    onProgress?.({ phase: 'reset' });
    await resetAvr(port);

    await withReader(port, async (reader, writer) => {
      onProgress?.({ phase: 'sync' });
      // Try to sync up to 10 times.
      let synced = false;
      for (let i = 0; i < 10; i++) {
        try {
          await writer.write(toBuf([STK.GET_SYNC, STK.CRC_EOP]));
          const [a, b] = await readN(reader, 2, 250);
          if (a === STK.IN_SYNC && b === STK.OK) { synced = true; break; }
        } catch { /* retry */ }
      }
      if (!synced) throw new Error('STK500: could not synchronise with bootloader (is the board in bootloader mode? wrong board?)');

      await command(writer, reader, [STK.ENTER_PROGMODE]);

      const PAGE = 128; // ATmega328P page size in bytes
      for (let offset = 0; offset < data.length; offset += PAGE) {
        const page = data.subarray(offset, Math.min(offset + PAGE, data.length));
        // STK500 addresses are word addresses for flash.
        const wordAddr = (offset / 2) & 0xFFFF;
        await command(writer, reader, [STK.LOAD_ADDRESS, wordAddr & 0xFF, (wordAddr >> 8) & 0xFF]);
        await command(writer, reader, [STK.PROG_PAGE, (page.length >> 8) & 0xFF, page.length & 0xFF, 0x46, ...page]);
        onProgress?.({ phase: 'write', written: offset + page.length, total: data.length });
      }

      await command(writer, reader, [STK.LEAVE_PROGMODE]);
      onProgress?.({ phase: 'done', written: data.length, total: data.length });
    });
  } finally {
    try { await port.close(); } catch { /* ignore */ }
  }
}

/** Open a serial port for monitor mode and stream decoded lines through onLine. */
export async function openSerialMonitor(
  port: WebSerialPort,
  baud: number,
  onChunk: (text: string) => void,
  signal: AbortSignal,
): Promise<void> {
  await port.open({ baudRate: baud, dataBits: 8, stopBits: 1, parity: 'none' });
  const reader = port.readable.getReader();
  const decoder = new TextDecoder();
  signal.addEventListener('abort', () => { reader.cancel().catch(() => {}); });
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
