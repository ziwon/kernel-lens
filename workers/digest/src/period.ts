import type { DigestPeriod } from "@lkmlens/shared";

const DAY_MS = 86_400_000;

export interface DigestWindow {
  periodType: DigestPeriod;
  periodKey: string;
  title: string;
  startInclusive: string;
  endExclusive: string;
}

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function dailyWindow(now: Date): DigestWindow {
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const start = new Date(end.getTime() - DAY_MS);
  const key = isoDate(start);
  return { periodType: "daily", periodKey: key, title: `Daily digest — ${key}`, startInclusive: start.toISOString(), endExclusive: end.toISOString() };
}

export function weeklyWindow(now: Date): DigestWindow {
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const daysSinceMonday = (today.getUTCDay() + 6) % 7;
  const end = new Date(today.getTime() - daysSinceMonday * DAY_MS);
  const start = new Date(end.getTime() - 7 * DAY_MS);
  const thursday = new Date(start.getTime() + 3 * DAY_MS);
  const yearStart = new Date(Date.UTC(thursday.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((thursday.getTime() - yearStart.getTime()) / DAY_MS) + 1) / 7);
  const key = `${thursday.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
  return { periodType: "weekly", periodKey: key, title: `Weekly digest — ${key}`, startInclusive: start.toISOString(), endExclusive: end.toISOString() };
}
