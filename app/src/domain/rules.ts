/**
 * Clinical rules table.
 *
 * v1.0 was clinically signed off (reported by the app owner, 2026-10-11).
 * v1.1 adds whole-tablet/capsule rounding for paracetamol (500 mg),
 * ibuprofen (200 mg) and celecoxib (100 mg) — NEEDS SIGN-OFF.
 * Any change to this table needs a new clinical sign-off and must bump
 * RULE_VERSION; the version is recorded against every dose event.
 */
export const RULE_VERSION = "LOCAL-TONSIL-v1.1";

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
  /** Plain-English frequency shown to parents (no QID/TDS/BD abbreviations). */
  freqLabel: string;
  /**
   * Default time of the first dose of the day ("HH:MM", 24h), used only when no
   * earlier dose carries over. Later doses follow minIntervalHours after the
   * previous dose was actually given. Null for PRN.
   */
  firstTime: string | null;
  scheduleType: ScheduleType;
  /** For selected_days medicines: post-op days the dose is given on. */
  postOpDays?: number[];
  daysLabel: string;
  concs: ConcOption[];
  /** The solid form offered alongside liquid. */
  solidForm: "tablet" | "capsule";
  /**
   * Strength of one tablet/capsule in mg, or null when solid doses are shown
   * in mg only. Solid doses are rounded DOWN to a whole number of these, so
   * they never exceed the weight-based dose.
   */
  solidUnitMg: number | null;
  warnings: string[];
}

export const RULES: Record<MedId, MedRule> = {
  paracetamol: {
    id: "paracetamol",
    name: "Paracetamol / Panadol",
    shortName: "Paracetamol",
    sub: "Regular pain relief",
    mgPerKg: 15,
    maxSingleDoseMg: 1000,
    maxDosesIn24Hours: 4,
    minIntervalHours: 6,
    freq: "QID",
    freqLabel: "4 times a day",
    firstTime: "06:00",
    scheduleType: "regular",
    daysLabel: "Day 0–14",
    concs: [
      { label: "24 mg/mL", value: 24 },
      { label: "48 mg/mL", value: 48 },
      { label: "Not sure", value: null },
    ],
    solidForm: "tablet",
    solidUnitMg: 500,
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
    sub: "Anti-inflammatory",
    mgPerKg: 10,
    maxSingleDoseMg: 400,
    maxDosesIn24Hours: 3,
    minIntervalHours: 8,
    freq: "TDS",
    freqLabel: "3 times a day",
    firstTime: "08:00",
    scheduleType: "regular",
    daysLabel: "As prescribed",
    concs: [
      { label: "20 mg/mL", value: 20 },
      { label: "40 mg/mL", value: 40 },
      { label: "Not sure", value: null },
    ],
    solidForm: "tablet",
    solidUnitMg: 200,
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
    sub: "Anti-inflammatory",
    mgPerKg: 4,
    maxSingleDoseMg: 100,
    maxDosesIn24Hours: 2,
    minIntervalHours: 12,
    freq: "BD",
    freqLabel: "2 times a day",
    firstTime: "08:00",
    scheduleType: "regular",
    daysLabel: "As prescribed",
    concs: [
      { label: "Enter manually", value: null },
      { label: "Not sure", value: null },
    ],
    solidForm: "capsule",
    solidUnitMg: 100,
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
    freqLabel: "Once a day",
    firstTime: "08:00",
    scheduleType: "selected_days",
    postOpDays: [3, 5, 7],
    daysLabel: "Day 3, 5, 7",
    concs: [
      { label: "0.5 mg/mL", value: 0.5 },
      { label: "1 mg/mL", value: 1 },
      { label: "Not sure", value: null },
    ],
    solidForm: "tablet",
    solidUnitMg: null,
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
    freqLabel: "Only if needed",
    firstTime: null,
    scheduleType: "prn",
    daysLabel: "Limited / local",
    concs: [
      { label: "1 mg/mL", value: 1 },
      { label: "5 mg/mL", value: 5 },
      { label: "Not sure", value: null },
    ],
    solidForm: "tablet",
    solidUnitMg: null,
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
