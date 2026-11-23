/**
 * Studio-wide daily video counter (Malaysia time). In memory only: it resets on
 * restart and is per server instance, so it is a safety net, not billing control.
 * Set a spending limit in the fal.ai dashboard for real cost control.
 */
let day = "";
let count = 0;

function todayMY(now: Date): string {
  return new Date(now.getTime() + 8 * 3600_000).toISOString().slice(0, 10);
}

export function dailyLimit(): number {
  const n = Number(process.env.DAILY_VIDEO_LIMIT ?? "0");
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}

/** Reserves one slot; returns false when today's limit is reached. */
export function takeSlot(limit: number = dailyLimit(), now: Date = new Date()): boolean {
  const d = todayMY(now);
  if (d !== day) {
    day = d;
    count = 0;
  }
  if (limit > 0 && count >= limit) return false;
  count++;
  return true;
}

/** Gives a slot back when the submit to fal failed. */
export function releaseSlot(): void {
  if (count > 0) count--;
}

export function usedToday(now: Date = new Date()): number {
  return todayMY(now) === day ? count : 0;
}

export function resetForTests(): void {
  day = "";
  count = 0;
}
