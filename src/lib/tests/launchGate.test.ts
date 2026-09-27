import { describe, it, expect } from 'bun:test';
import { isLaunched, LAUNCH_DATE } from '../launchGate';

describe('isLaunched', () => {
  it('should return false when current date is before LAUNCH_DATE', () => {
    // 1 second before launch
    const beforeDate = new Date(LAUNCH_DATE.getTime() - 1000);
    expect(isLaunched(beforeDate)).toBe(false);
  });

  it('should return true when current date is exactly LAUNCH_DATE', () => {
    // Exactly at launch
    const exactDate = new Date(LAUNCH_DATE.getTime());
    expect(isLaunched(exactDate)).toBe(true);
  });

  it('should return true when current date is after LAUNCH_DATE', () => {
    // 1 second after launch
    const afterDate = new Date(LAUNCH_DATE.getTime() + 1000);
    expect(isLaunched(afterDate)).toBe(true);
  });
});
