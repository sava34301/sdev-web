// @ts-nocheck -- bun test file; not part of the app build
import { expect, test, describe } from "bun:test";
import { parses, parseError } from "../sense";

describe("sense parsing functions", () => {
  describe("parses", () => {
    test("returns true for valid code", () => {
      expect(parses('set x to 5')).toBe(true);
      expect(parses('terminal "Hello, world!"')).toBe(true);
      expect(parses('to foo() \n 1 \n end')).toBe(true);
    });

    test("returns false for invalid code", () => {
      expect(parses('set x to')).toBe(false);
      expect(parses('terminal "unclosed string')).toBe(false);
      expect(parses('function () {')).toBe(false);
    });
  });

  describe("parseError", () => {
    test("returns null for valid code", () => {
      expect(parseError('set x to 5')).toBeNull();
      expect(parseError('terminal "Hello, world!"')).toBeNull();
      expect(parseError('to foo() \n 1 \n end')).toBeNull();
    });

    test("returns an error string for invalid code", () => {
      expect(typeof parseError('set x to')).toBe('string');
      expect(parseError('set x to')).not.toBeNull();

      expect(typeof parseError('terminal "unclosed string')).toBe('string');
      expect(parseError('terminal "unclosed string')).not.toBeNull();
    });
  });
});
