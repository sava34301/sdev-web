import { extractBoardBlock, transpileBoard, transpileExpr } from '../src/lang/hardware/transpile';
import { stripBoardBlocks } from '../src/lang/hardware/strip';
import { findBoardById } from '../src/lang/hardware/board-db';
import { ARDUINO_LIBRARIES } from '../src/lang/hardware/arduino-api';
import {
  parseIntelHex,
  buildUf2FromHexOrBin,
  UF2_CONSTANTS,
  STK500V1,
  STK500V2,
  AVR109,
  encodeStk500v2Frame,
  decodeStk500v2Frame,
  slipEncode,
  slipDecode,
  flashAvr,
  flashStk500v2,
  flashAvr109,
  flashSamba,
  type WebSerialPort,
} from '../src/lang/hardware/web-serial';

let passed = 0;
let failed = 0;

function check(name: string, actual: unknown, expected: unknown) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) {
    passed++;
    console.log(`  ok   ${name}`);
  } else {
    failed++;
    console.log(`  FAIL ${name}\n       got:      ${a}\n       expected: ${e}`);
  }
}

function checkContains(name: string, haystack: string, needle: string) {
  if (haystack.includes(needle)) {
    passed++;
    console.log(`  ok   ${name}`);
  } else {
    failed++;
    console.log(`  FAIL ${name}\n       missing:  ${JSON.stringify(needle)}\n       in:       ${JSON.stringify(haystack)}`);
  }
}

console.log('Testing extractBoardBlock');

// Basic case
check(
  'Basic board block',
  extractBoardBlock('board "uno" { \n  use "Servo"\n}'),
  {
    boardId: 'uno',
    body: ' \n  use "Servo"\n',
    startIndex: 0,
    endIndex: 30,
  }
);

// Nested braces
check(
  'Nested braces',
  extractBoardBlock('board "uno" { if (true) { } }'),
  {
    boardId: 'uno',
    body: ' if (true) { } ',
    startIndex: 0,
    endIndex: 29,
  }
);

// Braces inside strings
check(
  'Braces inside string',
  extractBoardBlock('board "uno" { say "{" }'),
  {
    boardId: 'uno',
    body: ' say "{" ',
    startIndex: 0,
    endIndex: 23,
  }
);

// Escaped quotes inside strings
check(
  'Escaped quotes',
  extractBoardBlock('board "uno" { say "\\"{}" }'),
  {
    boardId: 'uno',
    body: ' say "\\"{}" ',
    startIndex: 0,
    endIndex: 26,
  }
);

// Braces inside comments
check(
  'Braces inside comments',
  extractBoardBlock('board "uno" { // }\n }'),
  {
    boardId: 'uno',
    body: ' // }\n ',
    startIndex: 0,
    endIndex: 21,
  }
);

// No valid block
check('No block', extractBoardBlock('just some regular code { }'), null);

// Unbalanced block (missing closing brace)
check('Unbalanced block', extractBoardBlock('board "uno" { code'), null);

// Whitespace variations
check(
  'Whitespace variations',
  extractBoardBlock('  board   "uno"   { code }  '),
  {
    boardId: 'uno',
    body: ' code ',
    startIndex: 2,
    endIndex: 26,
  }
);

// Multiple blocks (should only extract first)
check(
  'Multiple blocks',
  extractBoardBlock('board "uno" { one } board "mega" { two }'),
  {
    boardId: 'uno',
    body: ' one ',
    startIndex: 0,
    endIndex: 19,
  }
);

// Prefix code before block
check(
  'Prefix code',
  extractBoardBlock('say "hello"\nboard "uno" { code }'),
  {
    boardId: 'uno',
    body: ' code ',
    startIndex: 12,
    endIndex: 32,
  }
);

// `:: ... ;;` board block extraction and stripping
console.log('\nTesting board "id" :: ... ;; blocks');
const colonSrc = `forge x be 1
board "uno-r4-wifi" ::
  conjure setup() ::
    ponder x equals 1 ::
      pin led on
    otherwise ::
      pin led off
    ;;
  ;;
;;
speak(x)`;

const colonBlock = extractBoardBlock(colonSrc);
check('extractBoardBlock with :: ... ;; boardId', colonBlock?.boardId, 'uno-r4-wifi');
check('stripBoardBlocks with :: ... ;; preserves surrounding code', stripBoardBlocks(colonSrc).trim(), 'forge x be 1\n\n\n\n\n\n\n\n\n\nspeak(x)');

// Test C++ scope resolution `AccelStepper::DRIVER` inside `:: ... ;;`
const scopeSrc = `board "uno" ::
  device motor be AccelStepper(AccelStepper::DRIVER, 2, 3)
  conjure setup() ::
    motor.setMaxSpeed(1000)
  ;;
;;`;
const scopeBlock = extractBoardBlock(scopeSrc);
check('C++ scope :: inside :: ... ;; block does not desync depth', scopeBlock?.boardId, 'uno');

console.log('\nTesting transpileBoard & DSL rules');
const uno = findBoardById('uno')!;

function transpileSnippet(body: string): string {
  const b = extractBoardBlock(`board "uno" ::\n${body}\n;;`);
  if (!b) throw new Error('Failed to extract board block');
  return transpileBoard(b, uno).ino;
}

// Multi-header library resolution (`Ethernet` -> `SPI.h` + `Ethernet.h`)
const ethIno = transpileSnippet(`use "Ethernet"\nuse "LiquidCrystal I2C"\nconjure setup() ::\n;;\nconjure loop() ::\n;;`);
checkContains('Ethernet includes SPI.h', ethIno, '#include <SPI.h>');
checkContains('Ethernet includes Ethernet.h', ethIno, '#include <Ethernet.h>');
checkContains('LiquidCrystal I2C includes LiquidCrystal_I2C.h', ethIno, '#include <LiquidCrystal_I2C.h>');

// `device` declarations
const devIno = transpileSnippet(`device arm be Servo\ndevice lcd be LiquidCrystal_I2C(0x27, 16, 2)`);
checkContains('device without args', devIno, 'Servo arm;');
checkContains('device with args', devIno, 'LiquidCrystal_I2C lcd(0x27, 16, 2);');

// `forge`, qualifiers, arrays, `set`, `define`
const varIno = transpileSnippet(`
fixed forge LED: int be 13
keep forge count: ulong be 0
volatile forge flag: bool be nope
forge notes be [262, 294, 330]
forge greeting: text be "hi"
set speed to 100
define MAX_VAL = 255
`);
checkContains('fixed forge typed', varIno, 'const int LED = 13;');
checkContains('keep forge ulong', varIno, 'static unsigned long count = 0;');
checkContains('volatile forge bool nope', varIno, 'volatile bool flag = false;');
checkContains('forge array literal', varIno, 'auto notes[] = {262, 294, 330};');
checkContains('forge text -> String', varIno, 'String greeting = "hi";');
checkContains('set to -> auto', varIno, 'auto speed = 100;');
checkContains('define = -> auto', varIno, 'auto MAX_VAL = 255;');

// Control flow (`ponder`, `otherwise ponder`, `otherwise`, `within ... sequence`, `cycle`, `yeet`, `skip`, `yield`)
const cfIno = transpileSnippet(`
conjure helper(a: int, b: int) ::
  ponder a equals b also a differs 0 ::
    yield a + b
  otherwise ponder a > b either isnt nope ::
    yield a
  otherwise ::
    yield 0
  ;;
;;
conjure loop() ::
  within i be sequence(8) ::
    within j be sequence(1, 10) ::
      within k be sequence(0, 100, 5) ::
        pin led toggle
      ;;
    ;;
  ;;
  cycle pin 2 read equals HIGH ::
    skip
    yeet
  ;;
;;
`);
checkContains('typed function params', cfIno, 'auto helper(int a, int b) {');
checkContains('ponder with equals and also', cfIno, 'if (a == b && a != 0) {');
checkContains('otherwise ponder with either and isnt', cfIno, '} else if (a > b || !false) {');
checkContains('otherwise ::', cfIno, '} else {');
checkContains('sequence(8)', cfIno, 'for (long i = 0; i < 8; i++) {');
checkContains('sequence(1, 10)', cfIno, 'for (long j = 1; j < 10; j++) {');
checkContains('sequence(0, 100, 5)', cfIno, 'for (long k = 0; (5) >= 0 ? k < 100 : k > 100; k += (5)) {');
checkContains('cycle with pin read', cfIno, 'while (digitalRead(2) == HIGH) {');
checkContains('skip -> continue', cfIno, 'continue;');
checkContains('yeet -> break', cfIno, 'break;');
checkContains('yield -> return', cfIno, 'return a + b;');

// Hardware I/O, timing, speak, raw cpp { ... }
const hwIno = transpileSnippet(`
cpp {
  volatile int rawCounter = 0;
  void onPulse() { rawCounter++; }
}
conjure setup() ::
  pin led be output
  pin 2 be input_pullup
  pin 3 be input_pulldown
  analog reference internal
  attach 2 rising onPulse
  speak("Boot at", now(), "ms")
;;
conjure loop() ::
  forge v be analog 0 read
  forge d be read pin 2
  forge p be pulsein 7 high
  forge r be randint(1, 6)
  pin 9 pwm 128
  shiftout 11 12 msbfirst 0xAA
  tone 8 440 200
  notone 8
  wait 2 seconds
  wait 50 us
  detach 2
;;
`);
checkContains('raw cpp block preserved', hwIno, 'volatile int rawCounter = 0;');
checkContains('auto Serial.begin(9600) in setup when speak is used', hwIno, 'Serial.begin(9600);');
checkContains('pin led be output', hwIno, 'pinMode(LED_BUILTIN, OUTPUT);');
checkContains('pin 2 be input_pullup', hwIno, 'pinMode(2, INPUT_PULLUP);');
checkContains('pin 3 be input_pulldown', hwIno, 'pinMode(3, INPUT_PULLDOWN);');
checkContains('analog reference internal', hwIno, 'analogReference(INTERNAL);');
checkContains('attach interrupt', hwIno, 'attachInterrupt(digitalPinToInterrupt(2), onPulse, RISING);');
checkContains('multi-arg speak + now()', hwIno, 'Serial.print("Boot at"); Serial.print(" "); Serial.print(millis()); Serial.print(" "); Serial.println("ms");');
checkContains('analog 0 read -> analogRead(A0)', hwIno, 'auto v = analogRead(A0);');
checkContains('read pin 2 -> digitalRead(2)', hwIno, 'auto d = digitalRead(2);');
checkContains('pulsein 7 high -> pulseIn(7, HIGH)', hwIno, 'auto p = pulseIn(7, HIGH);');
checkContains('randint(1, 6) -> random(1, (6) + 1)', hwIno, 'auto r = random(1, (6) + 1);');
checkContains('pin 9 pwm 128 -> analogWrite(9, 128)', hwIno, 'analogWrite(9, 128);');
checkContains('shiftout -> shiftOut', hwIno, 'shiftOut(11, 12, MSBFIRST, 0xAA);');
checkContains('tone 3 args', hwIno, 'tone(8, 440, 200);');
checkContains('notone', hwIno, 'noTone(8);');
checkContains('wait 2 seconds', hwIno, 'delay((2) * 1000);');
checkContains('wait 50 us', hwIno, 'delayMicroseconds(50);');
checkContains('detach interrupt', hwIno, 'detachInterrupt(digitalPinToInterrupt(2));');

// Check that `.equals(...)` on an Arduino String is NOT mangled to `.==(...)`
check('String.equals(other) preserved', transpileExpr('cmd.equals("on")'), 'cmd.equals("on")');
check('infix equals converted', transpileExpr('x equals 42'), 'x == 42');

// Test every single example in ARDUINO_LIBRARIES
console.log('\nTesting all curated library examples in ARDUINO_LIBRARIES');
for (const lib of ARDUINO_LIBRARIES) {
  if (!lib.example) continue;
  const block = extractBoardBlock(`board "uno" ::\n${lib.example}\n;;`);
  check(`${lib.name}: extractBoardBlock succeeds`, Boolean(block), true);
  if (block) {
    const res = transpileBoard(block, uno);
    check(`${lib.name}: 0 transpiler warnings`, res.warnings, []);
    // Check balanced `{` and `}`
    const opens = (res.ino.match(/\{/g) ?? []).length;
    const closes = (res.ino.match(/\}/g) ?? []).length;
    check(`${lib.name}: balanced C++ braces (${opens})`, opens, closes);
  }
}

// ==============================================================
// Test UF2 block generation & SLIP framing
// ==============================================================
console.log('\nTesting UF2 block generator & SLIP framing');
const sampleHex = ':100000000C9434000C943E000C943E000C943E0082\n:00000001FF';
const parsed = parseIntelHex(sampleHex);
check('parseIntelHex parses 16 bytes', parsed.data.length, 16);

const uf2 = buildUf2FromHexOrBin(sampleHex);
check('UF2 single block is 512 bytes', uf2.length, 512);
const uf2View = new DataView(uf2.buffer);
check('UF2 magicStart0', uf2View.getUint32(0, true), UF2_CONSTANTS.MAGIC_START0);
check('UF2 magicStart1', uf2View.getUint32(4, true), UF2_CONSTANTS.MAGIC_START1);
check('UF2 flags', uf2View.getUint32(8, true), UF2_CONSTANTS.FLAG_FAMILY_ID_PRESENT);
check('UF2 targetAddr', uf2View.getUint32(12, true), UF2_CONSTANTS.RP2040_FLASH_BASE);
check('UF2 payloadSize', uf2View.getUint32(16, true), 256);
check('UF2 blockNo', uf2View.getUint32(20, true), 0);
check('UF2 numBlocks', uf2View.getUint32(24, true), 1);
check('UF2 RP2040 familyId', uf2View.getUint32(28, true), UF2_CONSTANTS.RP2040_FAMILY_ID);
check('UF2 magicEnd', uf2View.getUint32(508, true), UF2_CONSTANTS.MAGIC_END);
check('UF2 payload matches hex bytes', Array.from(uf2.subarray(32, 36)), [0x0C, 0x94, 0x34, 0x00]);

// SLIP encode/decode round-trip
const rawSlipPayload = new Uint8Array([0x00, 0xC0, 0x11, 0xDB, 0x22]);
const slipEncoded = slipEncode(rawSlipPayload);
const slipDecoded = slipDecode(slipEncoded);
check('SLIP round-trip preserves 0xC0 and 0xDB escapes', Array.from(slipDecoded), Array.from(rawSlipPayload));

// STK500v2 frame encode/decode round-trip
const v2Frame = encodeStk500v2Frame(7, [STK500V2.CMD_SIGN_ON]);
const v2Decoded = decodeStk500v2Frame(v2Frame);
check('STK500v2 frame seq', v2Decoded.seq, 7);
check('STK500v2 frame body', Array.from(v2Decoded.body), [STK500V2.CMD_SIGN_ON]);

// ==============================================================
// Protocol Simulator Tests (STK500v1, STK500v2, AVR109, SAM-BA)
// ==============================================================
console.log('\nTesting Uploader Protocol State Machines');

function createSimulatedSerialPort(onHostWrite: (chunk: Uint8Array, pushToHost: (resp: number[] | Uint8Array) => void) => void): WebSerialPort {
  let controllerRef: ReadableStreamDefaultController<Uint8Array> | null = null;
  const pushToHost = (resp: number[] | Uint8Array) => {
    const arr = resp instanceof Uint8Array ? resp : new Uint8Array(resp);
    controllerRef?.enqueue(arr);
  };

  return {
    async open() {},
    async close() {},
    async setSignals() {},
    getInfo: () => ({ usbVendorId: 0x2341, usbProductId: 0x0043 }),
    readable: new ReadableStream<Uint8Array>({
      start(controller) {
        controllerRef = controller;
      },
    }),
    writable: new WritableStream<BufferSource>({
      write(chunk) {
        const bytes =
          chunk instanceof Uint8Array
            ? chunk
            : chunk instanceof ArrayBuffer
            ? new Uint8Array(chunk)
            : new Uint8Array(chunk.buffer, chunk.byteOffset, chunk.byteLength);
        onHostWrite(bytes, pushToHost);
      },
    }),
  };
}

async function runProtocolSimulations() {
  // 1. STK500v1 simulator
  const stk1Flashed: number[] = [];
  const stk1Port = createSimulatedSerialPort((bytes, reply) => {
    const cmd = bytes[0];
    if (cmd === STK500V1.GET_SYNC || cmd === STK500V1.ENTER_PROGMODE || cmd === STK500V1.LOAD_ADDRESS || cmd === STK500V1.LEAVE_PROGMODE) {
      reply([STK500V1.IN_SYNC, STK500V1.OK]);
    } else if (cmd === STK500V1.PROG_PAGE) {
      const len = (bytes[1] << 8) | bytes[2];
      stk1Flashed.push(...bytes.subarray(4, 4 + len));
      reply([STK500V1.IN_SYNC, STK500V1.OK]);
    }
  });
  await flashAvr(stk1Port, sampleHex, undefined, { resetWaitMs: 1 });
  check('STK500v1 flashed 16 bytes accurately', stk1Flashed, Array.from(parsed.data));

  // 1b. STK500v1 with a slow bootloader: the first sync attempts go unanswered,
  // then the old sketch's stray bytes arrive before the real reply. Replies after
  // a read timeout must not be lost (regression: Uno R3 "could not synchronise").
  const slowFlashed: number[] = [];
  let ignoredSyncs = 0;
  const slowPort = createSimulatedSerialPort((bytes, reply) => {
    const cmd = bytes[0];
    if (cmd === STK500V1.GET_SYNC && ignoredSyncs < 3) { ignoredSyncs++; return; }
    if (cmd === STK500V1.GET_SYNC && ignoredSyncs === 3) {
      ignoredSyncs++;
      setTimeout(() => reply([0x00, 0x48, 0x69, STK500V1.IN_SYNC, STK500V1.OK]), 5);
      return;
    }
    if (cmd === STK500V1.PROG_PAGE) {
      const len = (bytes[1] << 8) | bytes[2];
      slowFlashed.push(...bytes.subarray(4, 4 + len));
    }
    reply([STK500V1.IN_SYNC, STK500V1.OK]);
  });
  await flashAvr(slowPort, sampleHex, undefined, { resetWaitMs: 40 });
  check('STK500v1 syncs with a slow bootloader and stray bytes', slowFlashed, Array.from(parsed.data));

  // 2. STK500v2 simulator
  const stk2Flashed: number[] = [];
  const stk2Port = createSimulatedSerialPort((bytes, reply) => {
    const { seq, body } = decodeStk500v2Frame(bytes);
    const cmd = body[0];
    if (cmd === STK500V2.CMD_PROGRAM_FLASH_ISP) {
      const len = (body[1] << 8) | body[2];
      stk2Flashed.push(...body.subarray(10, 10 + len));
    }
    reply(encodeStk500v2Frame(seq, [cmd, STK500V2.STATUS_CMD_OK]));
  });
  await flashStk500v2(stk2Port, sampleHex, undefined, { resetWaitMs: 1 });
  check('STK500v2 flashed 16 bytes accurately', stk2Flashed, Array.from(parsed.data));

  // 3. AVR109 (Caterina) simulator
  const avr109Flashed: number[] = [];
  const avr109Port = createSimulatedSerialPort((bytes, reply) => {
    const cmd = bytes[0];
    if (cmd === AVR109.SW_ID) {
      reply(new TextEncoder().encode('CATERIN'));
    } else if (cmd === AVR109.ENTER_PROG || cmd === AVR109.SET_ADDR || cmd === AVR109.LEAVE_PROG || cmd === AVR109.EXIT_BOOT) {
      reply([AVR109.CR]);
    } else if (cmd === AVR109.WRITE_BLOCK) {
      const len = (bytes[1] << 8) | bytes[2];
      avr109Flashed.push(...bytes.subarray(4, 4 + len));
      reply([AVR109.CR]);
    }
  });
  await flashAvr109(avr109Port, sampleHex, undefined, { skipTouchReset: true });
  check('AVR109 flashed 16 bytes accurately', avr109Flashed, Array.from(parsed.data));

  // 4. SAM-BA / BOSSA simulator
  const sambaFlashed: number[] = [];
  let expectingRawBytes = 0;
  const enc = new TextEncoder();
  const dec = new TextDecoder();
  const sambaPort = createSimulatedSerialPort((bytes, reply) => {
    if (expectingRawBytes > 0) {
      sambaFlashed.push(...bytes);
      expectingRawBytes -= bytes.length;
      return;
    }
    const text = dec.decode(bytes);
    if (text === 'N#') reply(enc.encode('\n\r'));
    else if (text === 'V#') reply(enc.encode('Arduino Bootloader (SAM-BA extended) 2.0\n\r'));
    else if (text.startsWith('X')) reply(enc.encode('X\n\r'));
    else if (text.startsWith('S')) {
      const m = /^S[0-9a-fA-F]+,([0-9a-fA-F]+)#$/.exec(text);
      if (m) expectingRawBytes = parseInt(m[1], 16);
    } else if (text.startsWith('Y')) {
      reply(enc.encode('Y\n\r'));
    }
  });
  await flashSamba(sambaPort, sampleHex, undefined, { skipTouchReset: true });
  check('SAM-BA flashed 16 bytes accurately', sambaFlashed, Array.from(parsed.data));

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
}

runProtocolSimulations().catch((e) => {
  console.error(e);
  process.exit(1);
});
