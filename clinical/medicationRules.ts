/**
 * CENTRAL MEDICATION RULES TABLE
 * ==============================
 *
 * This is the single source of truth for all paediatric post-tonsillectomy
 * dosing in this app. Values are transcribed from the rules table in
 * Medication.md / UX.md ("Updated Medication Rules Table").
 *
 * CLINICAL GOVERNANCE
 * -------------------
 * - No dosing constant may be duplicated anywhere else in the codebase.
 *   Screens and components must read from here via the dose calculator.
 * - RULE_VERSION must be bumped on ANY change to a dosing value. Every
 *   generated medication plan stores the version it was calculated under,
 *   so historical dose logs remain auditable.
 * - `reviewedBy` / `reviewedDate` are null until a clinician signs these
 *   rules off. `RULES_CLINICALLY_REVIEWED` below is the machine-readable
 *   gate; the UI is expected to surface an "not yet clinically reviewed"
 *   notice while it is false. Do not flip it without a real sign-off.
 */

import type { MedicationRule } from "./types.ts";

export const RULE_VERSION = "LOCAL-TONSIL-v1.0";
export const RULE_SOURCE = "AMH/local hospital protocol";

/**
 * Gate flag. False until a named clinician has reviewed the table below.
 * Source docs currently carry `reviewedBy: "TBD"` placeholders.
 */
export const RULES_CLINICALLY_REVIEWED = false;

const paracetamol: MedicationRule = {
  id: "paracetamol",
  genericName: "Paracetamol",
  brandNames: ["Panadol", "Dymadon", "Children's Panadol"],
  displayName: "Paracetamol / Panadol",

  ruleVersion: RULE_VERSION,
  source: RULE_SOURCE,
  reviewedBy: null,
  reviewedDate: null,

  isHighRisk: false,
  requiresPrescriptionConfirmation: true,
  breachSeverity: "warn",

  calculationType: "mg_per_kg",
  mgPerKg: 15,
  maxSingleDoseMg: 1000,
  maxDailyDoseMg: 4000,
  maxDosesIn24Hours: 4,

  frequencyLabel: "QID",
  dosesPerDay: 4,
  minIntervalHours: 6,
  preferredScheduleTimes: ["06:00", "12:00", "18:00", "22:00"],

  scheduleType: "regular",

  startPostOpDay: 0,
  endPostOpDay: 14,
  durationLabel: "Day 0 to Day 14",

  roundingSafety: "round_down",
  // 15 mg/kg: whole milligrams, +/-0.5mg is clinically irrelevant here.
  mgPrecision: 0,

  allowedFormulations: ["liquid", "tablet"],
  safetyWarnings: [
    "Do not give other medicines containing paracetamol unless advised.",
    "Do not give more than 4 doses in 24 hours.",
    "Do not exceed 1000 mg per dose.",
    "Follow your discharge instructions if they differ from this app.",
  ],
};

const ibuprofen: MedicationRule = {
  id: "ibuprofen",
  genericName: "Ibuprofen",
  brandNames: ["Nurofen"],
  displayName: "Ibuprofen / Nurofen",

  ruleVersion: RULE_VERSION,
  source: RULE_SOURCE,
  reviewedBy: null,
  reviewedDate: null,

  isHighRisk: false,
  requiresPrescriptionConfirmation: true,
  breachSeverity: "warn",

  calculationType: "mg_per_kg",
  mgPerKg: 10,
  maxSingleDoseMg: 400,
  maxDailyDoseMg: 1200,
  maxDosesIn24Hours: 3,

  frequencyLabel: "TDS",
  dosesPerDay: 3,
  minIntervalHours: 8,
  preferredScheduleTimes: ["08:00", "14:00", "20:00"],

  scheduleType: "regular",

  startPostOpDay: 0,
  endPostOpDay: 14,
  durationLabel: "As prescribed",

  roundingSafety: "round_down",
  // 10 mg/kg: whole milligrams.
  mgPrecision: 0,

  allowedFormulations: ["liquid", "tablet"],
  safetyWarnings: [
    "Only use ibuprofen if it was prescribed or recommended for your child.",
    "Do not give more than 3 doses in 24 hours.",
    "Do not exceed 400 mg per dose.",
    "Follow your discharge instructions if they differ from this app.",
  ],
};

const celecoxib: MedicationRule = {
  id: "celecoxib",
  genericName: "Celecoxib",
  brandNames: ["Celebrex"],
  displayName: "Celecoxib",

  ruleVersion: RULE_VERSION,
  source: RULE_SOURCE,
  reviewedBy: null,
  reviewedDate: null,

  isHighRisk: false,
  requiresPrescriptionConfirmation: true,
  breachSeverity: "warn",

  calculationType: "mg_per_kg",
  mgPerKg: 4,
  maxSingleDoseMg: 100,
  maxDailyDoseMg: 200,
  maxDosesIn24Hours: 2,

  frequencyLabel: "BD",
  dosesPerDay: 2,
  minIntervalHours: 12,
  preferredScheduleTimes: ["08:00", "20:00"],

  scheduleType: "regular",

  startPostOpDay: 0,
  endPostOpDay: 14,
  durationLabel: "As prescribed",

  roundingSafety: "round_down",
  // 4 mg/kg: whole milligrams.
  mgPrecision: 0,

  allowedFormulations: ["capsule", "liquid"],
  safetyWarnings: [
    "Only give celecoxib if it was prescribed.",
    "Do not give more than 2 doses in 24 hours.",
    "Do not exceed 100 mg per dose.",
    "Do not combine with other anti-inflammatory medicines unless advised.",
    "Follow your discharge instructions if they differ from this app.",
  ],
};

const dexamethasone: MedicationRule = {
  id: "dexamethasone",
  genericName: "Dexamethasone",
  brandNames: [],
  displayName: "Dexamethasone",

  ruleVersion: RULE_VERSION,
  source: RULE_SOURCE,
  reviewedBy: null,
  reviewedDate: null,

  isHighRisk: false,
  requiresPrescriptionConfirmation: true,
  breachSeverity: "warn",

  calculationType: "mg_per_kg",
  mgPerKg: 0.1,
  maxSingleDoseMg: 8,
  maxDailyDoseMg: 8,
  maxDosesIn24Hours: 1,

  frequencyLabel: "OD",
  dosesPerDay: 1,
  minIntervalHours: 24,
  preferredScheduleTimes: ["08:00"],

  // Given only on specific post-op days, never as a daily regular medicine.
  scheduleType: "selected_days",
  defaultPostOpDays: [3, 5, 7],
  alternativePostOpDays: [4, 5, 6],

  startPostOpDay: 3,
  endPostOpDay: 7,
  durationLabel: "Day 3, 5 and 7, or as prescribed",

  roundingSafety: "round_down",
  // 0.1 mg/kg: a whole mg would shift the dose by up to 33%.
  mgPrecision: 1,

  allowedFormulations: ["tablet", "liquid"],
  safetyWarnings: [
    "Only give dexamethasone if prescribed.",
    "Give only on the days listed in your discharge instructions.",
    "Do not give more than 1 dose in 24 hours.",
    "Do not exceed 8 mg per dose.",
    "Follow your discharge instructions if they differ from this app.",
  ],
};

const oxycodone: MedicationRule = {
  id: "oxycodone",
  genericName: "Oxycodone",
  brandNames: [],
  displayName: "Oxycodone",

  ruleVersion: RULE_VERSION,
  source: RULE_SOURCE,
  reviewedBy: null,
  reviewedDate: null,

  // High risk: drives the extra confirmation gate and sedation warnings.
  isHighRisk: true,
  requiresPrescriptionConfirmation: true,
  breachSeverity: "warn",

  calculationType: "mg_per_kg",
  mgPerKg: 0.1,
  maxSingleDoseMg: 5,
  maxDailyDoseMg: 20,
  maxDosesIn24Hours: 4,

  frequencyLabel: "PRN",
  dosesPerDay: 4,
  minIntervalHours: 6,
  // Deliberately empty: oxycodone is never placed in the routine schedule.
  preferredScheduleTimes: [],

  scheduleType: "prn",

  startPostOpDay: 0,
  endPostOpDay: 14,
  durationLabel: "PRN only, as prescribed",

  roundingSafety: "round_down",
  // 0.1 mg/kg opioid: a whole mg would shift the dose by up to 33%.
  mgPrecision: 1,

  allowedFormulations: ["liquid", "tablet"],
  safetyWarnings: [
    "Oxycodone can cause sleepiness and breathing problems.",
    "Only give oxycodone if it was specifically prescribed.",
    "Give only as needed and exactly as prescribed.",
    "Do not give more than 4 doses in 24 hours.",
    "Do not exceed 5 mg per dose.",
    "Seek urgent medical help if your child is excessively sleepy, difficult to wake, or has breathing difficulty.",
  ],
};

export const medicationRules = {
  paracetamol,
  ibuprofen,
  celecoxib,
  dexamethasone,
  oxycodone,
} as const;

export type MedicationId = keyof typeof medicationRules;

export const ALL_MEDICATION_IDS = Object.keys(medicationRules) as MedicationId[];

export function getRule(id: string): MedicationRule | undefined {
  return (medicationRules as Record<string, MedicationRule>)[id];
}

/**
 * Internal consistency check over the table. Exposed so it can run as a
 * test, guaranteeing the invariant the spec states:
 *   calculatedDoseMg x maxDosesIn24Hours <= maxDailyDoseMg
 * must hold at the single-dose cap.
 */
export function validateRuleTable(): string[] {
  const problems: string[] = [];

  for (const id of ALL_MEDICATION_IDS) {
    const rule = medicationRules[id];

    if (rule.mgPerKg <= 0) {
      problems.push(`${id}: mgPerKg must be positive`);
    }
    if (rule.maxSingleDoseMg <= 0) {
      problems.push(`${id}: maxSingleDoseMg must be positive`);
    }
    if (rule.maxSingleDoseMg > rule.maxDailyDoseMg) {
      problems.push(`${id}: maxSingleDoseMg exceeds maxDailyDoseMg`);
    }
    if (rule.maxSingleDoseMg * rule.maxDosesIn24Hours > rule.maxDailyDoseMg) {
      problems.push(
        `${id}: maxSingleDoseMg x maxDosesIn24Hours (${
          rule.maxSingleDoseMg * rule.maxDosesIn24Hours
        }) exceeds maxDailyDoseMg (${rule.maxDailyDoseMg})`,
      );
    }
    // 24h / minInterval must physically permit maxDosesIn24Hours.
    if (rule.minIntervalHours * rule.maxDosesIn24Hours > 24 + 1e-9) {
      problems.push(
        `${id}: minIntervalHours x maxDosesIn24Hours exceeds 24 hours`,
      );
    }
    if (rule.scheduleType === "prn" && rule.preferredScheduleTimes.length > 0) {
      problems.push(`${id}: PRN medicines must not define schedule times`);
    }
    if (
      rule.scheduleType === "regular" &&
      rule.preferredScheduleTimes.length !== rule.dosesPerDay
    ) {
      problems.push(
        `${id}: preferredScheduleTimes count does not match dosesPerDay`,
      );
    }
    if (rule.scheduleType === "selected_days" && !rule.defaultPostOpDays) {
      problems.push(`${id}: selected_days schedule requires defaultPostOpDays`);
    }
  }

  return problems;
}
