import { RULES, type MedForm, type MedId } from "./rules";

export interface FormChoice {
  form: MedForm;
  /** mg/mL for liquids; null when not confirmed. */
  conc: number | null;
}

/** Parse a weight string. Returns null for missing, zero, negative or non-numeric input. */
export function parseWeight(raw: string | number | null | undefined): number | null {
  if (raw === null || raw === undefined) return null;
  const s = String(raw).trim().replace(",", ".");
  if (!/^\d+(\.\d+)?$/.test(s)) return null;
  const n = Number(s);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** Round down: to 1 decimal under 10 mg, to a whole number at/above 10 mg. */
export function roundDoseMg(mg: number): number {
  return mg >= 10 ? Math.floor(mg) : Math.floor(mg * 10 + 1e-9) / 10;
}

export interface CalculatedDose {
  medId: MedId;
  doseMg: number;
  /** null when not a liquid or concentration is unconfirmed. */
  doseMl: number | null;
  conc: number | null;
  form: MedForm | undefined;
}

/**
 * Weight-based dose: min(weight × mgPerKg, maxSingleDoseMg), rounded down.
 * Returns null when weight is missing/invalid — no numeric dose may be rendered then.
 */
export function calcDose(medId: MedId, weightKg: number | null, choice?: FormChoice): CalculatedDose | null {
  if (weightKg === null || !(weightKg > 0)) return null;
  const r = RULES[medId];
  const doseMg = roundDoseMg(Math.min(weightKg * r.mgPerKg, r.maxSingleDoseMg));
  const conc = choice?.form === "liquid" && choice.conc && choice.conc > 0 ? choice.conc : null;
  const doseMl = conc ? Math.floor((doseMg / conc) * 10 + 1e-9) / 10 : null;
  return { medId, doseMg, doseMl, conc, form: choice?.form };
}

export function doseLabel(d: CalculatedDose | null): string {
  if (!d) return "dose not set";
  return d.doseMg + " mg" + (d.doseMl !== null ? " · " + d.doseMl + " mL" : "");
}

/**
 * Rough plausibility check for an entered weight. Generic range 8–80 kg, plus a
 * wide band around an age-based estimate when age is known. This only prompts the
 * parent to double-check; it never changes the dose.
 */
export function weightLooksImplausible(weightKg: number | null, ageYears: number | null): boolean {
  if (weightKg === null) return false;
  if (weightKg < 8 || weightKg > 80) return true;
  if (ageYears !== null && ageYears >= 1 && ageYears <= 16) {
    const expected = ageYears <= 5 ? 2 * ageYears + 8 : ageYears <= 12 ? 3 * ageYears + 7 : 4 * ageYears;
    return weightKg < expected * 0.5 || weightKg > expected * 2;
  }
  return false;
}
