/**
 * Phase 3.2 — pure utility helpers for the FHS pipeline.
 *
 * Nothing here touches I/O, the wall clock, or randomness. Every
 * function below is referentially transparent — the same inputs
 * always produce the same outputs. This makes the entire score
 * pipeline easy to test, replay, and reason about.
 */

export function clamp(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) return min;
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

/**
 * Round to the nearest integer using "round half away from zero" —
 * the Math.round default in JS. We re-export it as a named helper so
 * the score pipeline reads intent ("snap to integer") rather than
 * relying on global Math.round, and so we can swap the strategy
 * (banker's rounding ?) in one place if calibration ever requires it.
 */
export function roundInt(value: number): number {
  return Math.round(value);
}

/**
 * Round to N decimals. Used by axis components that need to expose
 * a human-readable number (runway months, savings rate percent…)
 * to the delta engine without dragging in float drift.
 */
export function round(value: number, decimals: number): number {
  const k = 10 ** decimals;
  return Math.round(value * k) / k;
}

/**
 * Compute the ISO 8601 week label of a local date in the form
 * "YYYY-Www", e.g. "2026-W23". The input is interpreted as a
 * wall-clock date in the user's local timezone — the caller is
 * responsible for converting UTC → local before calling.
 *
 * ISO weeks :
 *   - Start on Monday
 *   - Week 1 is the week containing the first Thursday of the year
 *   - A January date can belong to the previous year's last week
 *   - A December date can belong to the next year's week 1
 */
export function isoWeekString(localDate: Date): string {
  // Clone to avoid mutating caller's date.
  const d = new Date(
    Date.UTC(
      localDate.getFullYear(),
      localDate.getMonth(),
      localDate.getDate(),
    ),
  );
  // Shift to the Thursday of the same ISO week — that Thursday's year
  // is the ISO year by definition.
  const dayNum = d.getUTCDay() || 7; // Sunday → 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const isoYear = d.getUTCFullYear();
  // Week 1 contains Jan 4th (always — ISO 8601 invariant).
  const jan4 = new Date(Date.UTC(isoYear, 0, 4));
  const weekNum =
    1 +
    Math.round(
      ((d.getTime() - jan4.getTime()) / 86400000 - 3 + ((jan4.getUTCDay() || 7) - 1)) /
        7,
    );
  return `${isoYear}-W${String(weekNum).padStart(2, "0")}`;
}

/**
 * Subtract N weeks from an ISO week string and return the resulting
 * ISO week string. Used by the Momentum engine to look back over a
 * fixed window.
 *
 * Naive but correct : parse → date → subtract days → re-encode.
 */
export function subtractIsoWeeks(week: string, n: number): string {
  const match = week.match(/^(\d{4})-W(\d{2})$/);
  if (!match) throw new Error(`Invalid ISO week : ${week}`);
  const [, yearStr, weekStr] = match;
  const year = Number(yearStr);
  const weekNum = Number(weekStr);
  // ISO week 1's Monday : Jan 4th of that year, shifted to Monday.
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const jan4Day = jan4.getUTCDay() || 7;
  const week1Monday = new Date(jan4);
  week1Monday.setUTCDate(jan4.getUTCDate() - jan4Day + 1);
  // Monday of the input week.
  const targetMonday = new Date(week1Monday);
  targetMonday.setUTCDate(week1Monday.getUTCDate() + (weekNum - 1) * 7);
  // Subtract N weeks.
  targetMonday.setUTCDate(targetMonday.getUTCDate() - n * 7);
  return isoWeekString(targetMonday);
}

/**
 * Convert a UTC Date to a Date object whose wall-clock fields read as
 * if they were in the given IANA timezone. Used by the snapshot
 * writer to decide whether "Sunday 23:00 local" has been reached.
 *
 * Returns a Date instance — the timestamp itself is shifted, NOT the
 * timezone metadata (JS Date has none). So `result.getDay()` etc.
 * yield the local day/hour, which is what we want.
 */
export function toUserTimezone(date: Date, timezone: string): Date {
  // Intl.DateTimeFormat with a specific timezone gives us the local
  // wall-clock fields as strings. We re-encode into a UTC Date so
  // the .getXxx() readers yield the LOCAL values.
  try {
    const fmt = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
    const parts = fmt.formatToParts(date);
    const get = (type: string) =>
      Number(parts.find((p) => p.type === type)?.value ?? "0");
    return new Date(
      Date.UTC(
        get("year"),
        get("month") - 1,
        get("day"),
        get("hour") % 24,
        get("minute"),
        get("second"),
      ),
    );
  } catch {
    // Unknown timezone : fall back to UTC. The caller has guarded
    // against this case ; we never want the score pipeline to throw.
    return date;
  }
}

/**
 * Given the user's current local time, return the ISO week label of
 * the most recent ISO week whose Sunday 23:00 has elapsed — i.e. the
 * latest week that can legitimately be sealed.
 *
 *   - Monday 00:00 through Sunday 22:59 of week W
 *       → returns previous week (W - 1), which ended last Sunday 23:00
 *   - Sunday 23:00 of week W or later (until next Sunday 23:00)
 *       → returns week W
 *
 * This is the canonical "what should we attempt to seal now ?" answer.
 * The writer then checks idempotently whether that week's snapshot
 * already exists before writing.
 */
export function latestSealableWeek(localNow: Date): string {
  // localNow comes from toUserTimezone(): UTC fields read as local
  // wall-clock. Sunday is getUTCDay() === 0.
  const day = localNow.getUTCDay();
  const hour = localNow.getUTCHours();
  const thisWeek = isoWeekString(localNow);
  if (day === 0 && hour >= 23) return thisWeek;
  return subtractIsoWeeks(thisWeek, 1);
}
