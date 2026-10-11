import { RULES, RULE_VERSION, type MedId } from "./rules";

/**
 * Append-only dose-event log. Events are never edited or deleted; a mistaken
 * entry is undone by appending a "retracted" event that points at it. Every
 * event records the dose, weight, rule version and plan version it was made
 * against so the history can be audited.
 */
export interface DoseEvent {
  id: string;
  type: "given" | "skipped" | "retracted";
  medId: MedId;
  /** "HH:MM" scheduled slot, or null for PRN doses. */
  slotTime: string | null;
  /** Local date key of the schedule day the event belongs to. */
  slotDate: string;
  /** Epoch ms when the parent recorded it. */
  at: number;
  doseMg: number | null;
  doseMl: number | null;
  weightKg: number | null;
  ruleVersion: string;
  planVersion: number;
  /** For "retracted": id of the event being undone. */
  retracts?: string;
}

export type NewDoseEvent = Omit<DoseEvent, "id" | "ruleVersion">;

export function makeEvent(e: NewDoseEvent): DoseEvent {
  const rand = Math.random().toString(36).slice(2, 8);
  return { ...e, id: e.at.toString(36) + "-" + rand, ruleVersion: RULE_VERSION };
}

/** Given/skipped events that have not been retracted. */
export function activeEvents(events: DoseEvent[]): DoseEvent[] {
  const retracted = new Set(events.filter((e) => e.type === "retracted" && e.retracts).map((e) => e.retracts));
  return events.filter((e) => e.type !== "retracted" && !retracted.has(e.id));
}

/** Latest active record for a scheduled slot, if any. */
export function slotRecord(events: DoseEvent[], slotDate: string, medId: MedId, slotTime: string): DoseEvent | null {
  let found: DoseEvent | null = null;
  for (const e of activeEvents(events)) {
    if (e.slotDate === slotDate && e.medId === medId && e.slotTime === slotTime) {
      if (!found || e.at >= found.at) found = e;
    }
  }
  return found;
}

/** Active "given" events for a medicine within the last `hours` before `now`. */
export function givenWithin(events: DoseEvent[], medId: MedId, now: number, hours = 24): DoseEvent[] {
  const since = now - hours * 3_600_000;
  return activeEvents(events)
    .filter((e) => e.type === "given" && e.medId === medId && e.at > since && e.at <= now)
    .sort((a, b) => a.at - b.at);
}

export function lastGiven(events: DoseEvent[], medId: MedId, now: number): DoseEvent | null {
  const list = activeEvents(events).filter((e) => e.type === "given" && e.medId === medId && e.at <= now);
  return list.reduce<DoseEvent | null>((acc, e) => (!acc || e.at > acc.at ? e : acc), null);
}

export interface SafetyCheck {
  countIn24h: number;
  max: number;
  last: DoseEvent | null;
  /** "cap": max doses reached in rolling 24h; "interval": too soon after the last dose. */
  blocked: "cap" | "interval" | null;
  /** Earliest time another dose is allowed (epoch ms), when blocked. */
  nextAllowedAt: number | null;
}

/** Rolling-24h cap and minimum-interval check for a medicine. */
export function safetyCheck(events: DoseEvent[], medId: MedId, now: number): SafetyCheck {
  const r = RULES[medId];
  const recent = givenWithin(events, medId, now, 24);
  const last = lastGiven(events, medId, now);
  if (recent.length >= r.maxDosesIn24Hours) {
    const freeAt = recent[recent.length - r.maxDosesIn24Hours].at + 24 * 3_600_000;
    return { countIn24h: recent.length, max: r.maxDosesIn24Hours, last, blocked: "cap", nextAllowedAt: freeAt };
  }
  if (last && now - last.at < r.minIntervalHours * 3_600_000) {
    return {
      countIn24h: recent.length,
      max: r.maxDosesIn24Hours,
      last,
      blocked: "interval",
      nextAllowedAt: last.at + r.minIntervalHours * 3_600_000,
    };
  }
  return { countIn24h: recent.length, max: r.maxDosesIn24Hours, last, blocked: null, nextAllowedAt: null };
}
