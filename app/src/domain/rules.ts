/**
 * Clinical rules table.
 *
 * Clinically signed off as LOCAL-TONSIL-v1.0 (sign-off reported by the app
 * owner, 2026-10-11 — keep the signed record with the clinical team).
 * Any change to this table needs a new clinical sign-off and must bump
 * RULE_VERSION; the version is recorded against every dose event.
 */
export const RULE_VERSION = "LOCAL-TONSIL-v1.0";

export type MedId = "paracetamol" | "ibuprofen" | "celecoxib" | "dexamethasone" | "oxycodone";
export type MedForm = "liquid" | "tablet" | "capsule" | "other";
export type ScheduleType = "regular" | "selected_days" | "prn";

export interface ConcOption {
  label: string;
  /** mg/mL, or null for "not sure" / "enter manually" */
  value: number | null;
}

export interface MedRule {
  id: MedId;
  name: string;
  /** Short name used in lists ("Paracetamol" rather than "Paracetamol / Panadol"). */
  shortName: string;
  sub: string;
  mgPerKg: number;
  maxSingleDoseMg: number;
  maxDosesIn24Hours: number;
  minIntervalHours: number;
  freq: "QID" | "TDS" | "BD" | "OD" | "PRN";
  /** Fixed daily times, "HH:MM", 24h. Empty for PRN. */
  times: string[];
  scheduleType: ScheduleType;
  /** For selected_days medicines: post-op days the dose is given on. */
  postOpDays?: number[];
  daysLabel: string;
  concs: ConcOption[];
  warnings: string[];
}

export const RULES: Record<MedId, MedRule> = {
  paracetamol: {
    id: "paracetamol",
    name: "Paracetamol / Panadol",
    shortName: "Paracetamol",
    sub: "Regular pain relief · QID",
    mgPerKg: 15,
    maxSingleDoseMg: 1000,
    maxDosesIn24Hours: 4,
    minIntervalHours: 6,
    freq: "QID",
    times: ["06:00", "12:00", "18:00", "22:00"],
    scheduleType: "regular",
    daysLabel: "Day 0–14",
    concs: [
      { label: "24 mg/mL", value: 24 },
      { label: "48 mg/mL", value: 48 },
      { label: "Not sure", value: null },
    ],
    warnings: [
      "Do not give other medicines containing paracetamol unless advised.",
      "Do not give more than 4 doses in 24 hours.",
      "Do not exceed 1000 mg per dose.",
    ],
  },
  ibuprofen: {
    id: "ibuprofen",
    name: "Ibuprofen / Nurofen",
    shortName: "Ibuprofen",
    sub: "Anti-inflammatory · TDS",
    mgPerKg: 10,
    maxSingleDoseMg: 400,
    maxDosesIn24Hours: 3,
    minIntervalHours: 8,
    freq: "TDS",
    times: ["08:00", "14:00", "20:00"],
    scheduleType: "regular",
    daysLabel: "As prescribed",
    concs: [
      { label: "20 mg/mL", value: 20 },
      { label: "40 mg/mL", value: 40 },
      { label: "Not sure", value: null },
    ],
    warnings: [
      "Only use ibuprofen if it was prescribed or recommended for your child.",
      "Do not give more than 3 doses in 24 hours.",
      "Do not exceed 400 mg per dose.",
    ],
  },
  celecoxib: {
    id: "celecoxib",
    name: "Celecoxib",
    shortName: "Celecoxib",
    sub: "Anti-inflammatory · BD",
    mgPerKg: 4,
    maxSingleDoseMg: 100,
    maxDosesIn24Hours: 2,
    minIntervalHours: 12,
    freq: "BD",
    times: ["08:00", "20:00"],
    scheduleType: "regular",
    daysLabel: "As prescribed",
    concs: [
      { label: "Enter manually", value: null },
      { label: "Not sure", value: null },
    ],
    warnings: [
      "Only give celecoxib if it was prescribed.",
      "Do not combine with other anti-inflammatory medicines unless advised.",
    ],
  },
  dexamethasone: {
    id: "dexamethasone",
    name: "Dexamethasone",
    shortName: "Dexamethasone",
    sub: "Steroid · selected days only",
    mgPerKg: 0.1,
    maxSingleDoseMg: 8,
    maxDosesIn24Hours: 1,
    minIntervalHours: 24,
    freq: "OD",
    times: ["08:00"],
    scheduleType: "selected_days",
    postOpDays: [3, 5, 7],
    daysLabel: "Day 3, 5, 7",
    concs: [
      { label: "0.5 mg/mL", value: 0.5 },
      { label: "1 mg/mL", value: 1 },
      { label: "Not sure", value: null },
    ],
    warnings: [
      "Only give dexamethasone if prescribed.",
      "Give only on the days listed in your discharge instructions.",
    ],
  },
  oxycodone: {
    id: "oxycodone",
    name: "Oxycodone",
    shortName: "Oxycodone",
    sub: "Strong pain relief · only if needed",
    mgPerKg: 0.1,
    maxSingleDoseMg: 5,
    maxDosesIn24Hours: 4,
    minIntervalHours: 6,
    freq: "PRN",
    times: [],
    scheduleType: "prn",
    daysLabel: "Limited / local",
    concs: [
      { label: "1 mg/mL", value: 1 },
      { label: "5 mg/mL", value: 5 },
      { label: "Not sure", value: null },
    ],
    warnings: [
      "Oxycodone can cause sleepiness and breathing problems.",
      "Only give oxycodone if it was specifically prescribed.",
      "Do not give more than 4 doses in 24 hours.",
      "Seek urgent help if your child is very drowsy, hard to wake, or has breathing difficulty.",
    ],
  },
};

export const MED_ORDER: MedId[] = ["paracetamol", "ibuprofen", "celecoxib", "dexamethasone", "oxycodone"];

export const OXY_WARNING =
  "Can cause sleepiness and breathing problems. Seek urgent help if your child is very drowsy or hard to wake.";
