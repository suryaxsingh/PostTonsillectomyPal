/**
 * DOSE CALCULATOR
 * ===============
 *
 * Pure functions. No UI imports, no storage, no side effects.
 *
 * Core rule (Medication.md, "Dose Calculation Rule"):
 *   rawDoseMg        = childWeightKg x mgPerKg
 *   calculatedDoseMg = min(rawDoseMg, maxSingleDoseMg)
 *   doseMl           = calculatedDoseMg / concentrationMgPerMl   [only if confirmed]
 *
 * SAFETY POSTURE
 * --------------
 * - Rounding is always DOWNWARD. A dose rounded up could breach the single-dose
 *   cap; a dose rounded down cannot. Where the two conflict, under-dosing is the
 *   recoverable error.
 * - mL is returned ONLY when a concentration has been explicitly confirmed.
 *   An unconfirmed or zero concentration yields undefined, never a guess.
 *   (PRD 3.5: "The app must not infer mL volume without a confirmed concentration.")
 * - An implausible or missing weight yields a refusal, not a number.
 *
 * RESOLVED SPEC CONFLICT — rounding granularity
 * ---------------------------------------------
 * The rule skeletons in Medication.md specify `roundingType: "nearest_mg"`, but
 * the testing matrix in the same document expects fractional milligrams for the
 * low-dose medicines: dexamethasone and oxycodone at 15 kg are both listed as
 * 1.5 mg, and at 25 kg as 2.5 mg. Whole-milligram rounding would move those by
 * 20-33% — on an opioid, in a child.
 *
 * Resolution (product decision, 2026-08-14): rounding granularity is set PER
 * MEDICINE via `mgPrecision`, not globally.
 *   - paracetamol, ibuprofen, celecoxib -> whole milligrams, honouring the
 *     "nearest_mg" intent where the difference is clinically irrelevant.
 *   - dexamethasone, oxycodone          -> tenths of a milligram, preserving
 *     the doses the published matrix specifies.
 *
 * Every row of the matrix passes under this scheme. The "nearest_mg" wording in
 * the source document should be corrected to match. Still to be confirmed at
 * clinician sign-off.
 *
 * Rounding remains DOWNWARD in all cases, including for the whole-milligram
 * medicines: rounding to nearest could push a dose above its single-dose cap
 * (e.g. 999.6 mg -> 1000 mg is fine, but 1000.4 -> 1000 relies on the cap having
 * been applied first, and nearest-rounding a capped value is never safe).
 */

import type { CalculatedDose, MedicationRule } from "./types.ts";

/** Clinically plausible paediatric weight bounds, used to refuse absurd input. */
export const MIN_PLAUSIBLE_WEIGHT_KG = 3;
export const MAX_PLAUSIBLE_WEIGHT_KG = 150;

/**
 * Weights outside this narrower band are accepted but should trigger the
 * "Please check this weight" confirmation prompt in the UI (UX.md Screen 5).
 */
export const TYPICAL_WEIGHT_LOW_KG = 8;
export const TYPICAL_WEIGHT_HIGH_KG = 100;

/** Fallback only; each rule carries its own mgPrecision. */
const DEFAULT_MG_DECIMAL_PLACES = 2;
const ML_DECIMAL_PLACES = 1;

/** Guards against binary floating-point error just below a rounding boundary. */
const EPSILON = 1e-9;

/**
 * Round downward to a fixed number of decimal places.
 * Never returns a value greater than `value`.
 */
export function roundDown(value: number, decimalPlaces: number): number {
  const factor = 10 ** decimalPlaces;
  return Math.floor(value * factor + EPSILON) / factor;
}

export type WeightValidity =
  | { valid: true; needsConfirmation: boolean }
  | { valid: false; reason: string };

export function validateWeightKg(weightKg: unknown): WeightValidity {
  const weight = Number(weightKg);

  if (!Number.isFinite(weight)) {
    return { valid: false, reason: "Weight is required to calculate a dose." };
  }
  if (weight <= 0) {
    return { valid: false, reason: "Weight must be greater than zero." };
  }
  if (weight < MIN_PLAUSIBLE_WEIGHT_KG || weight > MAX_PLAUSIBLE_WEIGHT_KG) {
    return {
      valid: false,
      reason:
        "Please check this weight. Medicine doses depend on it. " +
        "If this weight is correct, contact your treating team or pharmacist.",
    };
  }

  return {
    valid: true,
    needsConfirmation:
      weight < TYPICAL_WEIGHT_LOW_KG || weight > TYPICAL_WEIGHT_HIGH_KG,
  };
}

/**
 * A confirmed liquid concentration. The `confirmed` flag is deliberately
 * explicit rather than inferred from the presence of a number, so that a
 * value entered but not confirmed can never leak into an mL display.
 */
export type ConcentrationInput = {
  mgPerMl: number;
  confirmed: boolean;
};

export type DoseCalculationResult =
  | { ok: true; dose: CalculatedDose }
  | { ok: false; reason: string };

/**
 * Calculate a single dose for one medicine at one weight.
 *
 * `concentration` is optional. When absent, unconfirmed, or non-positive,
 * the returned dose carries mg only and `doseMl` is undefined.
 */
export function calculateDose(
  rule: MedicationRule,
  weightKg: number,
  concentration?: ConcentrationInput,
): DoseCalculationResult {
  const weightCheck = validateWeightKg(weightKg);
  if (!weightCheck.valid) {
    return { ok: false, reason: weightCheck.reason };
  }

  const rawDoseMg = weightKg * rule.mgPerKg;
  const cappedMg = Math.min(rawDoseMg, rule.maxSingleDoseMg);
  // Cap first, then round down. Order matters: rounding a value that has not
  // been capped could leave it above the maximum.
  const doseMg = roundDown(cappedMg, rule.mgPrecision ?? DEFAULT_MG_DECIMAL_PLACES);

  // Defensive: rounding down must never produce a value above the cap.
  if (doseMg > rule.maxSingleDoseMg) {
    return {
      ok: false,
      reason:
        "This medicine cannot be calculated yet. Please check your discharge " +
        "instructions or speak to your pharmacist or treating team.",
    };
  }

  const dose: CalculatedDose = {
    medicationId: rule.id,
    displayName: rule.displayName,
    doseMg,
    capped: rawDoseMg > rule.maxSingleDoseMg,
    frequencyLabel: rule.frequencyLabel,
    maxSingleDoseMg: rule.maxSingleDoseMg,
    maxDailyDoseMg: rule.maxDailyDoseMg,
    maxDosesIn24Hours: rule.maxDosesIn24Hours,
    minIntervalHours: rule.minIntervalHours,
    scheduleType: rule.scheduleType,
    safetyWarnings: rule.safetyWarnings,
    ruleVersion: rule.ruleVersion,
    weightKgAtCalculation: weightKg,
  };

  // mL is added only against a confirmed, positive, finite concentration.
  if (
    concentration &&
    concentration.confirmed &&
    Number.isFinite(concentration.mgPerMl) &&
    concentration.mgPerMl > 0
  ) {
    dose.doseMl = roundDown(doseMg / concentration.mgPerMl, ML_DECIMAL_PLACES);
    dose.concentrationMgPerMl = concentration.mgPerMl;
  }

  return { ok: true, dose };
}

/**
 * Total milligrams this medicine would deliver across a full day at the
 * calculated dose. Used by the safety validator to check the daily ceiling.
 */
export function projectedDailyTotalMg(dose: CalculatedDose): number {
  return roundDown(dose.doseMg * dose.maxDosesIn24Hours, DEFAULT_MG_DECIMAL_PLACES);
}

/**
 * True when a full day at this dose would breach the daily maximum.
 * Per spec: calculatedDoseMg x maxDosesIn24Hours <= maxDailyDoseMg.
 */
export function exceedsDailyMaximum(dose: CalculatedDose): boolean {
  return projectedDailyTotalMg(dose) > dose.maxDailyDoseMg + EPSILON;
}

/** Display helper. Trims trailing zeros so 150.00 reads as "150 mg". */
export function formatMg(doseMg: number): string {
  return `${Number(doseMg.toFixed(DEFAULT_MG_DECIMAL_PLACES))} mg`;
}

/** Display helper. Returns null when no confirmed concentration was supplied. */
export function formatMl(dose: CalculatedDose): string | null {
  if (dose.doseMl === undefined) return null;
  return `${Number(dose.doseMl.toFixed(ML_DECIMAL_PLACES))} mL`;
}
