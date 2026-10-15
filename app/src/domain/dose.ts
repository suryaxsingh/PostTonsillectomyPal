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
  /** Tablets/capsules: whole units per dose, and the strength of one unit. */
  units: number | null;
  unitMg: number | null;
  /**
   * True when even one tablet/capsule is more than the weight-based dose.
   * Nothing can be given in that form — the parent is pointed to the liquid.
   */
  tooStrong: boolean;
}

const SOLID: MedForm[] = ["tablet", "capsule"];

/**
 * Weight-based dose: min(weight × mgPerKg, maxSingleDoseMg), rounded down.
 * Returns null when weight is missing/invalid — no numeric dose may be rendered then.
 */
export function calcDose(medId: MedId, weightKg: number | null, choice?: FormChoice): CalculatedDose | null {
  if (weightKg === null || !(weightKg > 0)) return null;
  const r = RULES[medId];
  const weightDoseMg = roundDoseMg(Math.min(weightKg * r.mgPerKg, r.maxSingleDoseMg));
  const form = choice?.form;
  if (form && SOLID.includes(form) && r.solidUnitMg) {
    const units = Math.floor(weightDoseMg / r.solidUnitMg + 1e-9);
    const doseMg = Math.round(units * r.solidUnitMg * 10) / 10;
    return { medId, doseMg, doseMl: null, conc: null, form, units, unitMg: r.solidUnitMg, tooStrong: units === 0 };
  }
  if (form && SOLID.includes(form)) {
    return { medId, doseMg: weightDoseMg, doseMl: null, conc: null, form, units: null, unitMg: null, tooStrong: false };
  }
  const conc = form === "liquid" && choice?.conc && choice.conc > 0 ? choice.conc : null;
  const doseMl = conc ? Math.floor((weightDoseMg / conc) * 10 + 1e-9) / 10 : null;
  return { medId, doseMg: weightDoseMg, doseMl, conc, form, units: null, unitMg: null, tooStrong: false };
}

/** A dose that can actually be given and recorded. */
export function canGive(d: CalculatedDose | null): d is CalculatedDose {
  return !!d && !d.tooStrong;
}

export function unitWord(d: CalculatedDose, n: number): string {
  const w = d.form === "capsule" ? "capsule" : "tablet";
  return n === 1 ? w : w + "s";
}

/** e.g. "2 tablets of 500 mg" (whole units only). */
export function unitsLabel(d: CalculatedDose): string {
  return d.units + " " + unitWord(d, d.units ?? 0) + " of " + d.unitMg + " mg";
}

export function tooStrongLabel(d: CalculatedDose): string {
  return unitWord(d, 1) + " too strong — use liquid";
}

/** Longer explanation for plan review and the blocking modal. */
export function tooStrongDetail(d: CalculatedDose, who = "this child"): string {
  return `The smallest ${unitWord(d, 1)} (${d.unitMg} mg) is more than ${who}'s dose. Use the liquid form, or ask your pharmacist.`;
}

export function doseLabel(d: CalculatedDose | null): string {
  if (!d) return "dose not set";
  if (d.tooStrong) return tooStrongLabel(d);
  if (d.units !== null) return d.doseMg + " mg · " + unitsLabel(d);
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
