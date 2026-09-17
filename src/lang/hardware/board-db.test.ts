import { expect, test, describe } from 'bun:test';
import { findBoardById, detectBoardByUsb, BOARDS } from './board-db';

describe('board-db', () => {
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

    test('finds board by vid only fallback match', () => {
      // Find a board that has a fallback vid match (where only vid matters)
      // Actually, detectBoardByUsb uses BOARDS.find(b => b.usb.some(u => u.vid === vid))
      // So if vid matches, it returns it. Let's use 0x2341 which is Arduino.
      // But we need a PID that doesn't have an exact match.
      const board = detectBoardByUsb(0x2341, 0x9999);
      expect(board).toBeDefined();
      expect(board?.id).toBe('uno'); // 'uno' is the first one in the list with 0x2341
    });

    test('returns exact match before vid fallback match if both exist', () => {
      // 0x2341, 0x0042 is exact match for 'mega'.
      // If vid fallback was prioritized, it might return 'uno' since 'uno' is first in BOARDS and has vid 0x2341.
      const board = detectBoardByUsb(0x2341, 0x0042);
      expect(board).toBeDefined();
      expect(board?.id).toBe('mega');
    });

    test('returns undefined for unknown vid and pid', () => {
      const board = detectBoardByUsb(0x9999, 0x9999);
      expect(board).toBeUndefined();
    });
  });
});
