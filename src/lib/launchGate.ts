// Official launch: July 12, 2026 at 14:00 Europe/Sofia (UTC+3 in summer)
// Stored as a UTC instant so countdown works the same worldwide.
export const LAUNCH_DATE = new Date('2026-07-12T14:00:00+03:00');

export function isLaunched(now: Date = new Date()): boolean {
  return now.getTime() >= LAUNCH_DATE.getTime();
}
