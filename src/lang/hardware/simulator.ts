// ============================================================
// In-Browser Hardware Simulator (Virtual Breadboard & MCU Engine)
// ============================================================
// Simulates `board "<id>"` blocks and transpiled Arduino C++ sketches
// directly in the browser without physical hardware.

import { extractBoardBlock, transpileBoard } from './transpile';
import { readBoards } from './understand';
import { findBoardById, BOARDS, type BoardDescriptor } from './board-db';

export type PinMode = 'UNSET' | 'INPUT' | 'OUTPUT' | 'INPUT_PULLUP' | 'PWM' | 'SERVO';

export interface PinState {
  pin: number | string;
  label: string;
  mode: PinMode;
  digital: boolean; // true = HIGH (1), false = LOW (0)
  pwm: number;      // 0..255
  analog: number;   // 0..1023 (for A0..A5)
  servoAngle?: number; // 0..180
  toneHz?: number;     // buzzer frequency
  lastChangedMs: number;
}

export interface NeoPixelLed {
  index: number;
  r: number;
  g: number;
  b: number;
}

export interface SimulatorEvent {
  timestampMs: number;
  cycle: number;
  kind: 'pin' | 'serial' | 'wait' | 'tone' | 'servo' | 'neopixel' | 'setup' | 'loop';
  description: string;
}

export interface HardwareSimState {
  boardId: string;
  boardLabel: string;
  builtinLedPin: number;
  running: boolean;
  cycleCount: number;
  elapsedMs: number;
  baudRate: number;
  pins: Record<string, PinState>;
  analogInputs: Record<string, number>; // A0..A5 -> 0..1023
  buttonStates: Record<string, boolean>; // digital input pins -> pressed (HIGH/LOW)
  serialLog: string[];
  serialRxQueue: string[];
  neopixels: NeoPixelLed[];
  servoAngle: number | null;
  servoPin: number | null;
  activeToneHz: number | null;
  activeTonePin: number | null;
  variables: Record<string, number | string | boolean>;
  events: SimulatorEvent[];
  setupInstructions: SimInstruction[];
  loopInstructions: SimInstruction[];
  loopCursor: number;
  setupDone: boolean;
  error?: string;
}

export type SimInstruction =
  | { op: 'pinMode'; pin: string; mode: PinMode; raw: string }
  | { op: 'digitalWrite'; pin: string; valueExpr: string; raw: string }
  | { op: 'analogWrite'; pin: string; valueExpr: string; raw: string }
  | { op: 'serialBegin'; baud: number; raw: string }
  | { op: 'serialPrint'; expr: string; newline: boolean; raw: string }
  | { op: 'delay'; msExpr: string; raw: string }
  | { op: 'tone'; pin: string; hzExpr: string; durationExpr?: string; raw: string }
  | { op: 'noTone'; pin: string; raw: string }
  | { op: 'servoAttach'; name: string; pin: string; raw: string }
  | { op: 'servoWrite'; name: string; angleExpr: string; raw: string }
  | { op: 'neopixelSet'; indexExpr: string; rExpr: string; gExpr: string; bExpr: string; raw: string }
  | { op: 'neopixelClear'; raw: string }
  | { op: 'assign'; name: string; expr: string; raw: string }
  | { op: 'if'; condExpr: string; thenBody: SimInstruction[]; elseBody: SimInstruction[]; raw: string }
  | { op: 'repeat'; countExpr: string; body: SimInstruction[]; raw: string };

export function getBuiltinLedPin(boardId: string): number {
  const id = boardId.toLowerCase();
  if (id.includes('rp2040') || id.includes('pico')) return 25;
  if (id.includes('esp32')) return 2;
  if (id.includes('esp8266') || id.includes('d1') || id.includes('nodemcu')) return 2;
  return 13;
}

export function getBoardPinLayout(boardId: string): { digitalPins: number[]; analogPins: string[] } {
  const id = boardId.toLowerCase();
  if (id.includes('rp2040') || id.includes('pico')) {
    return {
      digitalPins: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 25],
      analogPins: ['A0', 'A1', 'A2', 'A3'],
    };
  }
  if (id.includes('esp32')) {
    return {
      digitalPins: [2, 4, 5, 12, 13, 14, 15, 16, 17, 18, 19, 21, 22, 23, 25, 26, 27],
      analogPins: ['A0', 'A3', 'A4', 'A6', 'A7'],
    };
  }
  return {
    digitalPins: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13],
    analogPins: ['A0', 'A1', 'A2', 'A3', 'A4', 'A5'],
  };
}

function normalizePinKey(pin: string | number, builtinLed: number): string {
  const raw = String(pin).trim();
  if (/^LED_BUILTIN$/i.test(raw) || /^builtin$/i.test(raw)) return String(builtinLed);
  if (/^A\d+$/i.test(raw)) return raw.toUpperCase();
  const num = Number(raw);
  if (!Number.isNaN(num)) return String(num);
  return raw;
}

/**
 * Parse transpiled C++ `.ino` or raw sdev board body into executable simulation instructions.
 */
export function parseBoardInstructions(
  inoOrBody: string,
  builtinLedPin = 13
): {
  globals: SimInstruction[];
  setup: SimInstruction[];
  loop: SimInstruction[];
} {
  const globals: SimInstruction[] = [];
  const setup: SimInstruction[] = [];
  const loop: SimInstruction[] = [];

  // Extract setup() and loop() blocks from transpiled .ino
  const extractFnBody = (src: string, fnName: string): string | null => {
    const re = new RegExp(`\\b(?:void|conjure|to)\\s+${fnName}\\s*\\([^)]*\\)\\s*(?:\\{|::)`, 'i');
    const m = re.exec(src);
    if (!m) return null;
    const openChar = m[0].endsWith('{') ? '{' : '::';
    const startIdx = m.index + m[0].length;
    if (openChar === '{') {
      let depth = 1;
      let i = startIdx;
      while (i < src.length && depth > 0) {
        if (src[i] === '{') depth++;
        else if (src[i] === '}') depth--;
        i++;
      }
      return src.slice(startIdx, i - 1);
    } else {
      let depth = 1;
      let i = startIdx;
      while (i < src.length && depth > 0) {
        if (src.slice(i, i + 2) === '::') {
          depth++;
          i += 2;
          continue;
        }
        if (src.slice(i, i + 2) === ';;') {
          depth--;
          if (depth === 0) return src.slice(startIdx, i);
          i += 2;
          continue;
        }
        i++;
      }
      return src.slice(startIdx);
    }
  };

  const setupSrc = extractFnBody(inoOrBody, 'setup') ?? '';
  const loopSrc = extractFnBody(inoOrBody, 'loop') ?? '';

  // Also grab top-level variable definitions outside setup/loop
  const topLines = inoOrBody
    .replace(/void\s+setup\s*\([^)]*\)\s*\{[\s\S]*?\}/gi, '')
    .replace(/void\s+loop\s*\([^)]*\)\s*\{[\s\S]*?\}/gi, '');

  globals.push(...parseBlockLines(topLines, builtinLedPin));
  setup.push(...parseBlockLines(setupSrc, builtinLedPin));
  loop.push(...parseBlockLines(loopSrc, builtinLedPin));

  return { globals, setup, loop };
}

function parseBlockLines(blockText: string, builtinLedPin: number): SimInstruction[] {
  const rawLines = blockText
    .split(/\r?\n/)
    .map((l) => l.replace(/\/\/.*$/, '').trim())
    .filter((l) => l.length > 0 && l !== '{' && l !== '}' && l !== ';;');

  let idx = 0;

  function parseSequence(): SimInstruction[] {
    const out: SimInstruction[] = [];
    while (idx < rawLines.length) {
      const line = rawLines[idx];
      if (line === '}' || line.startsWith('}')) {
        idx++;
        break;
      }
      const inst = parseSingleOrCompound(line);
      if (inst) out.push(inst);
    }
    return out;
  }

  function parseSingleOrCompound(line: string): SimInstruction | null {
    idx++;
    const clean = line.replace(/;+\s*$/, '').trim();
    if (!clean || clean.startsWith('#include')) return null;

    // if (...) { ... }
    const ifMatch = /^(?:if|ponder)\s*\(?(.+?)\)?\s*(?:\{|::)?$/.exec(clean);
    if (ifMatch && (line.endsWith('{') || line.endsWith('::'))) {
      const condExpr = ifMatch[1].replace(/\)\s*$/, '').trim();
      const thenBody = parseSequence();
      let elseBody: SimInstruction[] = [];
      if (idx < rawLines.length && /^(?:\}\s*)?(?:else|otherwise)\b/.test(rawLines[idx])) {
        idx++;
        elseBody = parseSequence();
      }
      return { op: 'if', condExpr, thenBody, elseBody, raw: clean };
    }

    // for (int i = 0; i < N; i++) { ... }
    const forMatch = /^for\s*\(\s*(?:int\s+)?\w+\s*=\s*0\s*;\s*\w+\s*<\s*([^;]+)\s*;[^)]+\)\s*\{?$/.exec(clean);
    if (forMatch && line.endsWith('{')) {
      const countExpr = forMatch[1].trim();
      const body = parseSequence();
      return { op: 'repeat', countExpr, body, raw: clean };
    }

    // pinMode(pin, mode) or `pin 13 be output`
    const pmCpp = /^pinMode\s*\(\s*([^,]+)\s*,\s*([^)]+)\s*\)$/i.exec(clean);
    if (pmCpp) {
      const pin = normalizePinKey(pmCpp[1], builtinLedPin);
      const rawMode = pmCpp[2].trim().toUpperCase();
      const mode: PinMode =
        rawMode.includes('PULLUP') ? 'INPUT_PULLUP' : rawMode.includes('IN') ? 'INPUT' : 'OUTPUT';
      return { op: 'pinMode', pin, mode, raw: clean };
    }
    const pmSdev = /^pin\s+(\S+)\s+(?:be|is|to)\s+(output|input|input_pullup)$/i.exec(clean);
    if (pmSdev) {
      const pin = normalizePinKey(pmSdev[1], builtinLedPin);
      const mode = pmSdev[2].toUpperCase() as PinMode;
      return { op: 'pinMode', pin, mode, raw: clean };
    }

    // digitalWrite(pin, val) or `pin 13 write high`
    const dwCpp = /^digitalWrite\s*\(\s*([^,]+)\s*,\s*([^)]+)\s*\)$/i.exec(clean);
    if (dwCpp) {
      return {
        op: 'digitalWrite',
        pin: normalizePinKey(dwCpp[1], builtinLedPin),
        valueExpr: dwCpp[2].trim(),
        raw: clean,
      };
    }
    const dwSdev = /^pin\s+(\S+)\s+write\s+(.+)$/i.exec(clean);
    if (dwSdev) {
      return {
        op: 'digitalWrite',
        pin: normalizePinKey(dwSdev[1], builtinLedPin),
        valueExpr: dwSdev[2].trim(),
        raw: clean,
      };
    }

    // analogWrite(pin, val) or `pwm 9 write 128`
    const awCpp = /^analogWrite\s*\(\s*([^,]+)\s*,\s*([^)]+)\s*\)$/i.exec(clean);
    if (awCpp) {
      return {
        op: 'analogWrite',
        pin: normalizePinKey(awCpp[1], builtinLedPin),
        valueExpr: awCpp[2].trim(),
        raw: clean,
      };
    }
    const awSdev = /^(?:analog|pwm)\s+(?:write\s+)?(\S+)\s+(?:write\s+)?(.+)$/i.exec(clean);
    if (awSdev) {
      return {
        op: 'analogWrite',
        pin: normalizePinKey(awSdev[1], builtinLedPin),
        valueExpr: awSdev[2].trim(),
        raw: clean,
      };
    }

    // Serial.begin(baud) or `serial begin 9600`
    const sbCpp = /^Serial\.begin\s*\(\s*(\d+)\s*\)$/i.exec(clean);
    if (sbCpp) {
      return { op: 'serialBegin', baud: Number(sbCpp[1]), raw: clean };
    }
    const sbSdev = /^serial\s+begin\s+(\d+)$/i.exec(clean);
    if (sbSdev) {
      return { op: 'serialBegin', baud: Number(sbSdev[1]), raw: clean };
    }

    // Serial.print / Serial.println / serial print / serial println
    const spCpp = /^Serial\.(println|print)\s*\((.*)\)$/i.exec(clean);
    if (spCpp) {
      return {
        op: 'serialPrint',
        expr: spCpp[2].trim(),
        newline: spCpp[1].toLowerCase() === 'println',
        raw: clean,
      };
    }
    const spSdev = /^serial\s+(println|print)\s+(.+)$/i.exec(clean);
    if (spSdev) {
      return {
        op: 'serialPrint',
        expr: spSdev[2].trim(),
        newline: spSdev[1].toLowerCase() === 'println',
        raw: clean,
      };
    }

    // delay(ms) / wait ms
    const dlCpp = /^(?:delay|wait)\s*\(?\s*(.+?)\s*\)?$/i.exec(clean);
    if (dlCpp) {
      return { op: 'delay', msExpr: dlCpp[1].trim(), raw: clean };
    }

    // tone(pin, hz[, dur]) / noTone(pin)
    const toneCpp = /^tone\s*\(\s*([^,]+)\s*,\s*([^,)]+)(?:\s*,\s*([^)]+))?\s*\)$/i.exec(clean);
    if (toneCpp) {
      return {
        op: 'tone',
        pin: normalizePinKey(toneCpp[1], builtinLedPin),
        hzExpr: toneCpp[2].trim(),
        durationExpr: toneCpp[3]?.trim(),
        raw: clean,
      };
    }
    const noToneCpp = /^noTone\s*\(\s*([^)]+)\s*\)$/i.exec(clean);
    if (noToneCpp) {
      return {
        op: 'noTone',
        pin: normalizePinKey(noToneCpp[1], builtinLedPin),
        raw: clean,
      };
    }

    // Servo: name.attach(pin) / name.write(angle)
    const srvAttach = /^(\w+)\.attach\s*\(\s*([^)]+)\s*\)$/i.exec(clean);
    if (srvAttach) {
      return {
        op: 'servoAttach',
        name: srvAttach[1],
        pin: normalizePinKey(srvAttach[2], builtinLedPin),
        raw: clean,
      };
    }
    const srvWrite = /^(\w+)\.write\s*\(\s*([^)]+)\s*\)$/i.exec(clean);
    if (srvWrite && srvWrite[1].toLowerCase() !== 'serial' && srvWrite[1].toLowerCase() !== 'wire') {
      return {
        op: 'servoWrite',
        name: srvWrite[1],
        angleExpr: srvWrite[2].trim(),
        raw: clean,
      };
    }

    // NeoPixel: strip.setPixelColor(i, strip.Color(r, g, b)) or pixels.setPixelColor(i, r, g, b)
    const npSet = /^\w+\.setPixelColor\s*\(\s*([^,]+)\s*,\s*(?:\w+\.Color\s*\(\s*)?([^,]+)\s*,\s*([^,]+)\s*,\s*([^)]+)\)?\s*\)$/i.exec(clean);
    if (npSet) {
      return {
        op: 'neopixelSet',
        indexExpr: npSet[1].trim(),
        rExpr: npSet[2].trim(),
        gExpr: npSet[3].trim(),
        bExpr: npSet[4].replace(/\)+$/, '').trim(),
        raw: clean,
      };
    }
    if (/^\w+\.clear\s*\(\s*\)$/i.test(clean)) {
      return { op: 'neopixelClear', raw: clean };
    }

    // Variable declarations & assignments:
    // `int x = 10` / `float y = 2.5` / `forge x be 10` / `x = x + 1` / `x += 1`
    const augAssign = /^([a-zA-Z_]\w*)\s*(\+=|-=|\*=)\s*(.+)$/.exec(clean);
    if (augAssign) {
      const name = augAssign[1];
      const op = augAssign[2][0];
      return { op: 'assign', name, expr: `${name} ${op} (${augAssign[3]})`, raw: clean };
    }
    const incDec = /^([a-zA-Z_]\w*)\s*(\+\+|--)$/.exec(clean);
    if (incDec) {
      const name = incDec[1];
      const op = incDec[2] === '++' ? '+' : '-';
      return { op: 'assign', name, expr: `${name} ${op} 1`, raw: clean };
    }
    const varDecl = /^(?:(?:const\s+)?(?:int|long|float|double|bool|boolean|byte|String|auto|forge|set)\s+)?([a-zA-Z_]\w*)\s*(?:=|be|to)\s*(.+)$/i.exec(clean);
    if (varDecl) {
      return { op: 'assign', name: varDecl[1], expr: varDecl[2].trim(), raw: clean };
    }

    return null;
  }

  return parseSequence();
}

/**
 * Evaluate an expression inside the simulated MCU context.
 */
export function evalSimExpr(
  expr: string,
  state: HardwareSimState
): number | string | boolean {
  const trimmed = expr.trim();
  if (!trimmed) return '';

  // String literal
  if (/^".*"$/.test(trimmed) || /^'.*'$/.test(trimmed)) {
    return trimmed.slice(1, -1);
  }

  // HIGH / LOW / true / false
  if (/^(?:HIGH|ON|TRUE)$/i.test(trimmed)) return 1;
  if (/^(?:LOW|OFF|FALSE)$/i.test(trimmed)) return 0;

  // String concatenation if `+` has quotes
  if (trimmed.includes('"')) {
    const parts = splitTopLevelPlus(trimmed);
    if (parts.length > 1) {
      return parts.map((p) => String(evalSimExpr(p, state))).join('');
    }
  }

  // Replace hardware function calls in expression:
  // digitalRead(pin), analogRead(pin), millis(), map(v, inMin, inMax, outMin, outMax), constrain(v, a, b)
  const resolved = trimmed
    .replace(/\bLED_BUILTIN\b/g, String(state.builtinLedPin))
    .replace(/\bHIGH\b/gi, '1')
    .replace(/\bLOW\b/gi, '0')
    .replace(/\bmillis\s*\(\s*\)/gi, String(state.elapsedMs))
    .replace(/\bdigitalRead\s*\(\s*([^)]+)\s*\)/gi, (_, p) => {
      const key = normalizePinKey(p, state.builtinLedPin);
      if (key in state.buttonStates) {
        const pinObj = state.pins[key];
        const pressed = state.buttonStates[key];
        if (pinObj?.mode === 'INPUT_PULLUP') return pressed ? '0' : '1';
        return pressed ? '1' : '0';
      }
      return state.pins[key]?.digital ? '1' : '0';
    })
    .replace(/\banalogRead\s*\(\s*([^)]+)\s*\)/gi, (_, p) => {
      const key = normalizePinKey(p, state.builtinLedPin);
      const aKey = key.startsWith('A') ? key : `A${key}`;
      return String(state.analogInputs[aKey] ?? state.analogInputs[key] ?? 512);
    })
    .replace(/\bmap\s*\(\s*([^,]+),([^,]+),([^,]+),([^,]+),([^)]+)\)/gi, (_, v, iMin, iMax, oMin, oMax) => {
      const val = Number(evalSimExpr(v, state));
      const a = Number(evalSimExpr(iMin, state));
      const b = Number(evalSimExpr(iMax, state));
      const c = Number(evalSimExpr(oMin, state));
      const d = Number(evalSimExpr(oMax, state));
      if (b === a) return String(c);
      return String(Math.round(((val - a) * (d - c)) / (b - a) + c));
    })
    .replace(/\bconstrain\s*\(\s*([^,]+),([^,]+),([^)]+)\)/gi, (_, v, lo, hi) => {
      const val = Number(evalSimExpr(v, state));
      const a = Number(evalSimExpr(lo, state));
      const b = Number(evalSimExpr(hi, state));
      return String(Math.min(b, Math.max(a, val)));
    });

  // Direct variable lookup
  if (resolved in state.variables) {
    return state.variables[resolved];
  }

  // Substitute known variables for arithmetic/boolean evaluation
  const withVars = resolved
    .replace(/\bequals\b/gi, '==')
    .replace(/\band\b/gi, '&&')
    .replace(/\bor\b/gi, '||')
    .replace(/\bnot\b/gi, '!')
    .replace(/\b([a-zA-Z_]\w*)\b/g, (id) => {
      if (id in state.variables) {
        const v = state.variables[id];
        return typeof v === 'string' ? JSON.stringify(v) : typeof v === 'boolean' ? (v ? '1' : '0') : String(v);
      }
      return id;
    });

  // Safe numeric/boolean evaluation
  if (/^[0-9+\-*/%().<>=!&|\s]+$/.test(withVars)) {
    try {
      const fn = new Function(`return (${withVars});`);
      const res = fn();
      if (typeof res === 'boolean') return res ? 1 : 0;
      if (typeof res === 'number' && Number.isFinite(res)) return res;
    } catch {
      // fall through
    }
  }

  const num = Number(withVars);
  if (!Number.isNaN(num)) return num;
  return withVars;
}

function splitTopLevelPlus(expr: string): string[] {
  const parts: string[] = [];
  let cur = '';
  let inQuote = false;
  let parenDepth = 0;
  for (let i = 0; i < expr.length; i++) {
    const ch = expr[i];
    if (ch === '"' && expr[i - 1] !== '\\') {
      inQuote = !inQuote;
      cur += ch;
    } else if (!inQuote && ch === '(') {
      parenDepth++;
      cur += ch;
    } else if (!inQuote && ch === ')') {
      parenDepth = Math.max(0, parenDepth - 1);
      cur += ch;
    } else if (!inQuote && parenDepth === 0 && ch === '+') {
      parts.push(cur.trim());
      cur = '';
    } else {
      cur += ch;
    }
  }
  if (cur.trim()) parts.push(cur.trim());
  return parts;
}

/**
 * Create a fresh simulator state from sdev source code containing a `board "<id>"` block.
 */
export function createHardwareSimState(
  source: string,
  overrideBoardId?: string
): HardwareSimState {
  const reading = readBoards(source);
  const understood = reading.source;
  const block = extractBoardBlock(understood);

  const boardId = overrideBoardId ?? block?.boardId ?? 'uno';
  const board: BoardDescriptor = findBoardById(boardId) ?? BOARDS[0];
  const builtinLedPin = getBuiltinLedPin(board.id);
  const layout = getBoardPinLayout(board.id);

  const pins: Record<string, PinState> = {};
  for (const dPin of layout.digitalPins) {
    pins[String(dPin)] = {
      pin: dPin,
      label: dPin === builtinLedPin ? `D${dPin} (LED)` : `D${dPin}`,
      mode: 'UNSET',
      digital: false,
      pwm: 0,
      analog: 0,
      lastChangedMs: 0,
    };
  }
  for (const aPin of layout.analogPins) {
    pins[aPin] = {
      pin: aPin,
      label: aPin,
      mode: 'INPUT',
      digital: false,
      pwm: 0,
      analog: 512,
      lastChangedMs: 0,
    };
  }

  const analogInputs: Record<string, number> = {};
  for (const aPin of layout.analogPins) {
    analogInputs[aPin] = aPin === 'A0' ? 512 : aPin === 'A1' ? 720 : 250;
  }

  const buttonStates: Record<string, boolean> = {
    '2': false,
    '3': false,
    '4': false,
  };

  const neopixels: NeoPixelLed[] = Array.from({ length: 8 }, (_, index) => ({
    index,
    r: 0,
    g: 0,
    b: 0,
  }));

  if (!block) {
    return {
      boardId: board.id,
      boardLabel: board.label,
      builtinLedPin,
      running: false,
      cycleCount: 0,
      elapsedMs: 0,
      baudRate: 9600,
      pins,
      analogInputs,
      buttonStates,
      serialLog: [],
      serialRxQueue: [],
      neopixels,
      servoAngle: null,
      servoPin: null,
      activeToneHz: null,
      activeTonePin: null,
      variables: {},
      events: [],
      setupInstructions: [],
      loopInstructions: [],
      loopCursor: 0,
      setupDone: false,
      error: 'No `board "<id>"` block found in current file.',
    };
  }

  const transpiled = transpileBoard(block, board);
  const parsed = parseBoardInstructions(transpiled.ino, builtinLedPin);

  const state: HardwareSimState = {
    boardId: board.id,
    boardLabel: board.label,
    builtinLedPin,
    running: false,
    cycleCount: 0,
    elapsedMs: 0,
    baudRate: 9600,
    pins,
    analogInputs,
    buttonStates,
    serialLog: [],
    serialRxQueue: [],
    neopixels,
    servoAngle: null,
    servoPin: null,
    activeToneHz: null,
    activeTonePin: null,
    variables: {},
    events: [],
    setupInstructions: [...parsed.globals, ...parsed.setup],
    loopInstructions: parsed.loop,
    loopCursor: 0,
    setupDone: false,
  };

  return state;
}

function ensurePin(state: HardwareSimState, pinKey: string): PinState {
  if (!state.pins[pinKey]) {
    state.pins[pinKey] = {
      pin: pinKey,
      label: `D${pinKey}`,
      mode: 'UNSET',
      digital: false,
      pwm: 0,
      analog: 0,
      lastChangedMs: state.elapsedMs,
    };
  }
  return state.pins[pinKey];
}

function logEvent(
  state: HardwareSimState,
  kind: SimulatorEvent['kind'],
  description: string
): void {
  state.events.push({
    timestampMs: state.elapsedMs,
    cycle: state.cycleCount,
    kind,
    description,
  });
  if (state.events.length > 120) {
    state.events.shift();
  }
}

/**
 * Execute a single instruction on the simulated board state.
 */
export function executeSimInstruction(
  inst: SimInstruction,
  state: HardwareSimState
): void {
  switch (inst.op) {
    case 'pinMode': {
      const p = ensurePin(state, inst.pin);
      p.mode = inst.mode;
      p.lastChangedMs = state.elapsedMs;
      logEvent(state, 'pin', `pinMode(${inst.pin}, ${inst.mode})`);
      break;
    }
    case 'digitalWrite': {
      const p = ensurePin(state, inst.pin);
      if (p.mode === 'UNSET') p.mode = 'OUTPUT';
      const val = evalSimExpr(inst.valueExpr, state);
      const high = val === 1 || val === true || String(val).toUpperCase() === 'HIGH';
      p.digital = high;
      p.pwm = high ? 255 : 0;
      p.lastChangedMs = state.elapsedMs;
      logEvent(state, 'pin', `Pin ${inst.pin} → ${high ? 'HIGH (5V)' : 'LOW (0V)'}`);
      break;
    }
    case 'analogWrite': {
      const p = ensurePin(state, inst.pin);
      p.mode = 'PWM';
      const rawVal = Number(evalSimExpr(inst.valueExpr, state));
      const clamped = Math.max(0, Math.min(255, Number.isFinite(rawVal) ? Math.round(rawVal) : 0));
      p.pwm = clamped;
      p.digital = clamped > 0;
      p.lastChangedMs = state.elapsedMs;
      logEvent(state, 'pin', `PWM Pin ${inst.pin} → ${clamped}/255 (${Math.round((clamped / 255) * 100)}%)`);
      break;
    }
    case 'serialBegin': {
      state.baudRate = inst.baud;
      logEvent(state, 'serial', `Serial UART initialized @ ${inst.baud} baud`);
      break;
    }
    case 'serialPrint': {
      const val = evalSimExpr(inst.expr, state);
      const text = String(val);
      if (inst.newline || state.serialLog.length === 0) {
        state.serialLog.push(text);
      } else {
        state.serialLog[state.serialLog.length - 1] += text;
      }
      if (state.serialLog.length > 200) state.serialLog.shift();
      logEvent(state, 'serial', `Serial TX: ${JSON.stringify(text)}`);
      break;
    }
    case 'delay': {
      const ms = Math.max(0, Number(evalSimExpr(inst.msExpr, state)) || 0);
      state.elapsedMs += ms;
      logEvent(state, 'wait', `delay(${ms} ms)`);
      break;
    }
    case 'tone': {
      const hz = Math.max(20, Math.min(20000, Number(evalSimExpr(inst.hzExpr, state)) || 440));
      state.activeToneHz = hz;
      state.activeTonePin = Number(inst.pin) || 8;
      const p = ensurePin(state, inst.pin);
      p.toneHz = hz;
      logEvent(state, 'tone', `Buzzer Pin ${inst.pin} → ${hz} Hz`);
      break;
    }
    case 'noTone': {
      state.activeToneHz = null;
      state.activeTonePin = null;
      const p = ensurePin(state, inst.pin);
      p.toneHz = undefined;
      logEvent(state, 'tone', `Buzzer Pin ${inst.pin} silenced`);
      break;
    }
    case 'servoAttach': {
      const pinNum = Number(inst.pin) || 9;
      state.servoPin = pinNum;
      if (state.servoAngle === null) state.servoAngle = 90;
      const p = ensurePin(state, String(pinNum));
      p.mode = 'SERVO';
      p.servoAngle = state.servoAngle;
      logEvent(state, 'servo', `Servo '${inst.name}' attached to Pin ${pinNum}`);
      break;
    }
    case 'servoWrite': {
      const angle = Math.max(0, Math.min(180, Math.round(Number(evalSimExpr(inst.angleExpr, state)) || 0)));
      state.servoAngle = angle;
      if (state.servoPin !== null) {
        const p = ensurePin(state, String(state.servoPin));
        p.servoAngle = angle;
      }
      logEvent(state, 'servo', `Servo '${inst.name}' → ${angle}°`);
      break;
    }
    case 'neopixelSet': {
      const idx = Math.max(0, Math.min(state.neopixels.length - 1, Math.round(Number(evalSimExpr(inst.indexExpr, state)) || 0)));
      const r = Math.max(0, Math.min(255, Math.round(Number(evalSimExpr(inst.rExpr, state)) || 0)));
      const g = Math.max(0, Math.min(255, Math.round(Number(evalSimExpr(inst.gExpr, state)) || 0)));
      const b = Math.max(0, Math.min(255, Math.round(Number(evalSimExpr(inst.bExpr, state)) || 0)));
      state.neopixels[idx] = { index: idx, r, g, b };
      logEvent(state, 'neopixel', `NeoPixel[${idx}] → RGB(${r}, ${g}, ${b})`);
      break;
    }
    case 'neopixelClear': {
      state.neopixels = state.neopixels.map((np) => ({ ...np, r: 0, g: 0, b: 0 }));
      logEvent(state, 'neopixel', 'NeoPixels cleared');
      break;
    }
    case 'assign': {
      state.variables[inst.name] = evalSimExpr(inst.expr, state);
      break;
    }
    case 'if': {
      const cond = evalSimExpr(inst.condExpr, state);
      const truthy = Boolean(cond) && cond !== 0 && cond !== '0' && cond !== 'false';
      const branch = truthy ? inst.thenBody : inst.elseBody;
      for (const sub of branch) {
        executeSimInstruction(sub, state);
      }
      break;
    }
    case 'repeat': {
      const count = Math.max(0, Math.min(256, Math.round(Number(evalSimExpr(inst.countExpr, state)) || 0)));
      for (let i = 0; i < count; i++) {
        for (const sub of inst.body) {
          executeSimInstruction(sub, state);
        }
      }
      break;
    }
  }
}

/**
 * Run `setup()` if not yet run, or advance one single instruction in `loop()`.
 */
export function stepHardwareSimulator(prev: HardwareSimState): HardwareSimState {
  const next: HardwareSimState = {
    ...prev,
    pins: Object.fromEntries(Object.entries(prev.pins).map(([k, v]) => [k, { ...v }])),
    analogInputs: { ...prev.analogInputs },
    buttonStates: { ...prev.buttonStates },
    serialLog: [...prev.serialLog],
    serialRxQueue: [...prev.serialRxQueue],
    neopixels: prev.neopixels.map((n) => ({ ...n })),
    variables: { ...prev.variables },
    events: [...prev.events],
  };

  if (!next.setupDone) {
    for (const inst of next.setupInstructions) {
      executeSimInstruction(inst, next);
    }
    next.setupDone = true;
    next.loopCursor = 0;
    logEvent(next, 'setup', 'setup() completed');
    return next;
  }

  if (next.loopInstructions.length === 0) {
    return next;
  }

  if (next.loopCursor >= next.loopInstructions.length) {
    next.loopCursor = 0;
    next.cycleCount += 1;
  }

  const inst = next.loopInstructions[next.loopCursor];
  next.loopCursor += 1;
  executeSimInstruction(inst, next);

  if (next.loopCursor >= next.loopInstructions.length) {
    next.loopCursor = 0;
    next.cycleCount += 1;
  }

  return next;
}

/**
 * Execute one full `loop()` iteration (after ensuring `setup()` has completed).
 */
export function runHardwareLoopCycle(prev: HardwareSimState): HardwareSimState {
  let state = prev;
  if (!state.setupDone) {
    state = stepHardwareSimulator(state);
  }
  const count = Math.max(1, state.loopInstructions.length);
  for (let i = 0; i < count; i++) {
    state = stepHardwareSimulator(state);
  }
  return state;
}
