import { slotRecord, type DoseEvent } from "./events";
import { MED_ORDER, RULES, type MedId } from "./rules";
import { toMin } from "./time";

export interface ScheduledDose {
  key: string;
  medId: MedId;
  time: string;
}

export type DoseStatus = "given" | "skipped" | "overdue" | "due" | "upcoming";

/** Minutes before the scheduled time that a dose shows as "due". */
export const DUE_WINDOW_BEFORE = 15;
/** Minutes after the scheduled time that an un-ticked dose becomes "overdue". */
export const OVERDUE_AFTER = 30;

export function selectedMeds(selected: Partial<Record<MedId, boolean>>): MedId[] {
  return MED_ORDER.filter((id) => selected[id]);
}

/** The fixed-time doses for a post-op day. PRN medicines are never scheduled. */
export function scheduleForDay(selected: Partial<Record<MedId, boolean>>, postOpDay: number): ScheduledDose[] {
  const out: ScheduledDose[] = [];
  for (const id of selectedMeds(selected)) {
    const r = RULES[id];
    if (r.scheduleType === "prn") continue;
    if (r.scheduleType === "selected_days" && !r.postOpDays?.includes(postOpDay)) continue;
    for (const t of r.times) out.push({ key: id + "-" + t, medId: id, time: t });
  }
  return out.sort((a, b) => toMin(a.time) - toMin(b.time) || MED_ORDER.indexOf(a.medId) - MED_ORDER.indexOf(b.medId));
}

export function statusOf(dose: ScheduledDose, record: DoseEvent | null, nowMin: number): DoseStatus {
  if (record) return record.type === "skipped" ? "skipped" : "given";
  const t = toMin(dose.time);
  if (nowMin >= t + OVERDUE_AFTER) return "overdue";
  if (nowMin >= t - DUE_WINDOW_BEFORE) return "due";
  return "upcoming";
}

export interface DoseWithStatus extends ScheduledDose {
  status: DoseStatus;
  record: DoseEvent | null;
}

export function dayStatuses(
  schedule: ScheduledDose[],
  events: DoseEvent[],
  slotDate: string,
  nowMin: number,
): DoseWithStatus[] {
  return schedule.map((d) => {
    const record = slotRecord(events, slotDate, d.medId, d.time);
    return { ...d, record, status: statusOf(d, record, nowMin) };
  });
}
