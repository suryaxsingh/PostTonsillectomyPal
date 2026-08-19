/**
 * SCHEDULE GENERATOR
 * ==================
 *
 * Produces the full list of scheduled doses for a given post-op day.
 * Pure functions over the rules table; no storage or UI imports.
 *
 * Behaviour by scheduleType (Build Prompt section 9):
 *   - "regular"        Every preferred time, every day inside the active range.
 *                      Paracetamol QID, ibuprofen TDS, celecoxib BD.
 *   - "selected_days"  Only on the prescribed post-op days. Dexamethasone
 *                      defaults to [3, 5, 7] with [4, 5, 6] as the alternative.
 *   - "prn"            Never scheduled. Oxycodone is surfaced as a PRN card
 *                      only; this generator deliberately returns nothing for it.
 *
 * This replaces V1's makeNextDoseForMed, which could only ever compute a single
 * "dose #2" from a manually typed first-dose time and had no concept of a day's
 * full schedule.
 */

import type {
  CalculatedDose,
  DoseLogEntry,
  DoseStatus,
  MedicationRule,
  ScheduledDose,
} from "./types.ts";

const MINUTE_MS = 60 * 1000;

/** A dose is "due" from its scheduled time until this many minutes after. */
export const DUE_WINDOW_MINUTES = 30;
/** Past this many minutes with no action, a dose is treated as overdue. */
export const OVERDUE_AFTER_MINUTES = 60;

/** Parse "HH:MM" into minutes past midnight. Returns null if malformed. */
export function parseScheduleTime(time: string): number | null {
  const match = /^([01]?\d|2[0-3]):([0-5]\d)$/.exec(time.trim());
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

/** Whole days elapsed since surgery. Day of surgery is day 0. */
export function getPostOpDay(surgeryDate: Date, today: Date): number {
  const surgeryMidnight = new Date(
    surgeryDate.getFullYear(),
    surgeryDate.getMonth(),
    surgeryDate.getDate(),
  );
  const todayMidnight = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );
  const diffDays = Math.floor(
    (todayMidnight.getTime() - surgeryMidnight.getTime()) / (24 * 60 * MINUTE_MS),
  );
  return Math.max(0, diffDays);
}

/** Whether a medicine is active on a given post-op day. */
export function isActiveOnDay(
  rule: MedicationRule,
  postOpDay: number,
  selectedDays?: number[],
): boolean {
  if (rule.scheduleType === "prn") return false;

  if (rule.scheduleType === "selected_days") {
    const days = selectedDays ?? rule.defaultPostOpDays ?? [];
    return days.includes(postOpDay);
  }

  return postOpDay >= rule.startPostOpDay && postOpDay <= rule.endPostOpDay;
}

export type ScheduleInput = {
  rule: MedicationRule;
  dose: CalculatedDose;
  /** Overrides preferredScheduleTimes when the parent has adjusted times. */
  customTimes?: string[];
  /** For selected_days medicines: which days were actually prescribed. */
  selectedDays?: number[];
};

/**
 * Build the scheduled doses for one medicine on one calendar day.
 * Returns an empty array for PRN medicines and inactive days.
 */
export function generateDayScheduleForMedication(params: {
  input: ScheduleInput;
  date: Date;
  postOpDay: number;
}): ScheduledDose[] {
  const { input, date, postOpDay } = params;
  const { rule, dose, customTimes, selectedDays } = input;

  if (!isActiveOnDay(rule, postOpDay, selectedDays)) return [];

  const times = customTimes ?? rule.preferredScheduleTimes;
  if (times.length === 0) return [];

  const doses: ScheduledDose[] = [];

  for (const time of times) {
    const minutes = parseScheduleTime(time);
    if (minutes === null) continue; // Malformed times are skipped, never guessed.

    const scheduled = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      Math.floor(minutes / 60),
      minutes % 60,
      0,
      0,
    );

    doses.push({
      id: `${rule.id}-${scheduled.toISOString()}`,
      medicationId: rule.id,
      displayName: rule.displayName,
      scheduledDateTime: scheduled.toISOString(),
      postOpDay,
      doseMg: dose.doseMg,
      doseMl: dose.doseMl,
      status: "upcoming",
    });
  }

  return doses.sort(
    (a, b) =>
      Date.parse(a.scheduledDateTime) - Date.parse(b.scheduledDateTime),
  );
}

/**
 * Build the combined, time-ordered schedule for every selected medicine
 * on one day. PRN medicines are excluded by construction.
 */
export function generateDaySchedule(params: {
  inputs: ScheduleInput[];
  date: Date;
  postOpDay: number;
}): ScheduledDose[] {
  const { inputs, date, postOpDay } = params;

  return inputs
    .flatMap((input) =>
      generateDayScheduleForMedication({ input, date, postOpDay }),
    )
    .sort(
      (a, b) =>
        Date.parse(a.scheduledDateTime) - Date.parse(b.scheduledDateTime),
    );
}

/**
 * Resolve a scheduled dose's live status against the dose log and clock.
 *
 * A logged outcome always wins: once a parent records given/skipped/missed,
 * the clock cannot revise it. Only untouched doses move through
 * upcoming -> due -> overdue.
 */
export function resolveDoseStatus(params: {
  dose: ScheduledDose;
  log: DoseLogEntry[];
  now: Date;
}): DoseStatus {
  const { dose, log, now } = params;

  const logged = log.find((entry) => entry.scheduledDoseId === dose.id);
  if (logged) return logged.status;

  const scheduledMs = Date.parse(dose.scheduledDateTime);
  if (Number.isNaN(scheduledMs)) return "upcoming";

  const minutesLate = (now.getTime() - scheduledMs) / MINUTE_MS;

  if (minutesLate < 0) return "upcoming";
  if (minutesLate <= DUE_WINDOW_MINUTES) return "due";
  if (minutesLate <= OVERDUE_AFTER_MINUTES) return "due";
  return "overdue";
}

/** Apply live statuses across a day's schedule. */
export function applyStatuses(params: {
  schedule: ScheduledDose[];
  log: DoseLogEntry[];
  now: Date;
}): ScheduledDose[] {
  const { schedule, log, now } = params;

  return schedule.map((dose) => {
    const status = resolveDoseStatus({ dose, log, now });
    const logged = log.find((entry) => entry.scheduledDoseId === dose.id);

    return {
      ...dose,
      status,
      actualGivenDateTime:
        logged?.status === "given" ? logged.actualDateTime : undefined,
    };
  });
}

/**
 * The next dose still awaiting action, for the dashboard's "Next due" card.
 * Given and skipped doses are excluded; overdue doses take priority because
 * they need attention now.
 */
export function findNextDose(
  schedule: ScheduledDose[],
): ScheduledDose | null {
  const outstanding = schedule.filter(
    (dose) => dose.status !== "given" && dose.status !== "skipped",
  );
  if (outstanding.length === 0) return null;

  const byTime = (a: ScheduledDose, b: ScheduledDose) =>
    Date.parse(a.scheduledDateTime) - Date.parse(b.scheduledDateTime);

  const overdue = outstanding
    .filter((dose) => dose.status === "overdue")
    .sort(byTime);

  return overdue[0] ?? outstanding.sort(byTime)[0] ?? null;
}
