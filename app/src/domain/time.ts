const DAY_MS = 86_400_000;

/** Local calendar date as "YYYY-MM-DD" (not UTC — matters in Australia). */
export function dateKey(d: Date | number): string {
  const x = typeof d === "number" ? new Date(d) : d;
  return x.getFullYear() + "-" + String(x.getMonth() + 1).padStart(2, "0") + "-" + String(x.getDate()).padStart(2, "0");
}

export function parseDateKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** Minutes since local midnight. */
export function minutesOfDay(d: Date | number): number {
  const x = typeof d === "number" ? new Date(d) : d;
  return x.getHours() * 60 + x.getMinutes();
}

export function toMin(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

/** "18:00" → "6:00 pm" */
export function fmt12(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  const ap = h >= 12 ? "pm" : "am";
  const hh = h % 12 === 0 ? 12 : h % 12;
  return hh + ":" + String(m).padStart(2, "0") + " " + ap;
}

export function fmtMin(mins: number): string {
  const h = Math.floor(mins / 60) % 24;
  const m = mins % 60;
  return fmt12(String(h).padStart(2, "0") + ":" + String(m).padStart(2, "0"));
}

export function fmtTime(ms: number): string {
  return fmtMin(minutesOfDay(ms));
}

/** Whole calendar days from surgery date to `now`, unclamped (can be negative or > 14). */
export function daysSinceSurgery(surgeryDate: string | null, now: Date | number): number {
  if (!surgeryDate) return 0;
  const a = parseDateKey(surgeryDate);
  const b = parseDateKey(dateKey(now));
  return Math.round((b.getTime() - a.getTime()) / DAY_MS);
}

/** Post-op day clamped to 0–14. */
export function postOpDay(surgeryDate: string | null, now: Date | number): number {
  return Math.max(0, Math.min(14, daysSinceSurgery(surgeryDate, now)));
}

export function dateLabel(d: Date | number): string {
  return new Date(d).toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "long" });
}

export type PainSlot = "morning" | "afternoon" | "evening";
export const PAIN_SLOTS: [PainSlot, string][] = [
  ["morning", "Morning"],
  ["afternoon", "Afternoon"],
  ["evening", "Evening"],
];

/** Morning before 12:00, afternoon 12:00–17:00, evening after 17:00. */
export function painSlotOf(d: Date | number): PainSlot {
  const m = minutesOfDay(d);
  return m < 12 * 60 ? "morning" : m < 17 * 60 ? "afternoon" : "evening";
}
