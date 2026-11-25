import { findBoardById, detectBoardByUsb, canFlashInBrowser, canCompileInCloud, BOARDS } from '../src/lang/hardware/board-db';

let passed = 0;
let failed = 0;

function describe(name: string, fn: () => void) {
  console.log(`\n${name}`);
  fn();
}

function test(name: string, fn: () => void) {
  try {
    fn();
    passed++;
    console.log(`  ok   ${name}`);
  } catch (e) {
    failed++;
    console.log(`  FAIL ${name}: ${(e as Error).message}`);
  }
}

function expect(actual: unknown) {
  return {
    toBe(expected: unknown) {
      if (actual !== expected) {
        throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
      }
    },
    toBeDefined() {
      if (actual === undefined) {
        throw new Error(`Expected defined, got undefined`);
      }
    },
    toBeUndefined() {
      if (actual !== undefined) {
        throw new Error(`Expected undefined, got ${JSON.stringify(actual)}`);
      }
    },
    toBeGreaterThanOrEqual(min: number) {
      if (typeof actual !== 'number' || actual < min) {
        throw new Error(`Expected ${actual} >= ${min}`);
      }
    },
  };
}

describe('board-db', () => {
  describe('catalogue completeness', () => {
    const requiredIds = [
      'uno', 'uno-r4-minima', 'uno-r4-wifi', 'uno-q',
      'nano', 'nano-old', 'nano-every', 'nano-33-iot', 'nano-33-ble', 'nano-rp2040', 'nano-esp32',
      'mega', 'leonardo', 'micro',
      'mkr-wifi-1010', 'mkr-zero', 'mkr-wan-1310',
      'zero', 'due', 'giga', 'portenta-h7',
      'esp32', 'esp32-c3', 'esp32-s2', 'esp32-s3', 'esp8266',
      'pico', 'pico-w', 'attiny85', 'teensy41',
    ];

    test('contains at least 30 boards', () => {
      expect(BOARDS.length).toBeGreaterThanOrEqual(30);
    });

    for (const id of requiredIds) {
      test(`includes board "${id}" with valid FQBN and uploader`, () => {
        const b = findBoardById(id);
        expect(b).toBeDefined();
        expect(b?.id).toBe(id);
        expect(Boolean(b?.fqbn && b.fqbn.includes(':'))).toBe(true);
      });
    }
  });

  describe('findBoardById', () => {
    test('finds existing board by id', () => {
      const board = findBoardById('uno');
      expect(board).toBeDefined();
      expect(board?.id).toBe('uno');
      expect(board?.mcu).toBe('ATmega328P');
    });

    test('returns undefined for unknown board id', () => {
      const board = findBoardById('unknown-board-id');
      expect(board).toBeUndefined();
    });
  });

  describe('detectBoardByUsb', () => {
    test('finds board by exact vid and pid match', () => {
      const board = detectBoardByUsb(0x2341, 0x0043);
      expect(board).toBeDefined();
      expect(board?.id).toBe('uno');
    });

    test('finds Uno R4 WiFi by exact vid and pid', () => {
      const board = detectBoardByUsb(0x2341, 0x1002);
      expect(board).toBeDefined();
      expect(board?.id).toBe('uno-r4-wifi');
    });

    test('finds Uno R4 Minima by exact vid and pid', () => {
      const board = detectBoardByUsb(0x2341, 0x0069);
      expect(board).toBeDefined();
      expect(board?.id).toBe('uno-r4-minima');
    });

    test('finds board by vid only fallback match', () => {
      const board = detectBoardByUsb(0x2341, 0x9999);
      expect(board).toBeDefined();
      expect(board?.id).toBe('uno');
    });

    test('returns exact match before vid fallback match if both exist', () => {
      const board = detectBoardByUsb(0x2341, 0x0042);
      expect(board).toBeDefined();
      expect(board?.id).toBe('mega');
    });

    test('returns undefined for unknown vid and pid', () => {
      const board = detectBoardByUsb(0x9999, 0x9999);
      expect(board).toBeUndefined();
    });
  });

  describe('capabilities helpers', () => {
    test('canFlashInBrowser returns true for browser-supported uploaders and false for app-lab / arduino-cli', () => {
      expect(canFlashInBrowser(findBoardById('uno')!)).toBe(true);
      expect(canFlashInBrowser(findBoardById('mega')!)).toBe(true);
      expect(canFlashInBrowser(findBoardById('leonardo')!)).toBe(true);
      expect(canFlashInBrowser(findBoardById('uno-r4-wifi')!)).toBe(true);
      expect(canFlashInBrowser(findBoardById('uno-r4-minima')!)).toBe(true);
      expect(canFlashInBrowser(findBoardById('esp32')!)).toBe(true);
      expect(canFlashInBrowser(findBoardById('pico')!)).toBe(true);
      expect(canFlashInBrowser(findBoardById('uno-q')!)).toBe(false);
      expect(canFlashInBrowser(findBoardById('teensy41')!)).toBe(false);
    });

    test('canCompileInCloud is true only for verified Wokwi boards', () => {
      expect(canCompileInCloud(findBoardById('uno')!)).toBe(true);
      expect(canCompileInCloud(findBoardById('mega')!)).toBe(true);
      expect(canCompileInCloud(findBoardById('esp32')!)).toBe(true);
      expect(canCompileInCloud(findBoardById('pico')!)).toBe(true);
      expect(canCompileInCloud(findBoardById('uno-r4-wifi')!)).toBe(false);
      expect(canCompileInCloud(findBoardById('uno-q')!)).toBe(false);
    });
  });
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
