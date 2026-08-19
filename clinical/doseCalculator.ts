/**
 * Dose calculator tests.
 *
 * The primary fixture is the published testing matrix from Medication.md
 * ("Updated Testing Matrix With Expected mg Doses"), reproduced verbatim.
 * Every expected value below is taken from that table, not derived from
 * this implementation.
 */

import test from "node:test";
import assert from "node:assert/strict";

import { medicationRules, validateRuleTable } from "../medicationRules.ts";
import {
  calculateDose,
  exceedsDailyMaximum,
  projectedDailyTotalMg,
  roundDown,
  validateWeightKg,
} from "../doseCalculator.ts";

/** Expected mg by weight, transcribed from the spec's matrix. */
const MATRIX: Array<{
  weightKg: number;
  paracetamol: number;
  ibuprofen: number;
  celecoxib: number;
  dexamethasone: number;
  oxycodone: number;
}> = [
  { weightKg: 10, paracetamol: 150, ibuprofen: 100, celecoxib: 40, dexamethasone: 1, oxycodone: 1 },
  { weightKg: 15, paracetamol: 225, ibuprofen: 150, celecoxib: 60, dexamethasone: 1.5, oxycodone: 1.5 },
  { weightKg: 20, paracetamol: 300, ibuprofen: 200, celecoxib: 80, dexamethasone: 2, oxycodone: 2 },
  { weightKg: 25, paracetamol: 375, ibuprofen: 250, celecoxib: 100, dexamethasone: 2.5, oxycodone: 2.5 },
  { weightKg: 30, paracetamol: 450, ibuprofen: 300, celecoxib: 100, dexamethasone: 3, oxycodone: 3 },
  { weightKg: 40, paracetamol: 600, ibuprofen: 400, celecoxib: 100, dexamethasone: 4, oxycodone: 4 },
  { weightKg: 50, paracetamol: 750, ibuprofen: 400, celecoxib: 100, dexamethasone: 5, oxycodone: 5 },
  { weightKg: 60, paracetamol: 900, ibuprofen: 400, celecoxib: 100, dexamethasone: 6, oxycodone: 5 },
  { weightKg: 70, paracetamol: 1000, ibuprofen: 400, celecoxib: 100, dexamethasone: 7, oxycodone: 5 },
  { weightKg: 80, paracetamol: 1000, ibuprofen: 400, celecoxib: 100, dexamethasone: 8, oxycodone: 5 },
  { weightKg: 90, paracetamol: 1000, ibuprofen: 400, celecoxib: 100, dexamethasone: 8, oxycodone: 5 },
];

function doseMgFor(medId: keyof typeof medicationRules, weightKg: number): number {
  const result = calculateDose(medicationRules[medId], weightKg);
  assert.equal(result.ok, true, `expected a dose for ${medId} at ${weightKg}kg`);
  if (!result.ok) throw new Error("unreachable");
  return result.dose.doseMg;
}

test("rule table is internally consistent", () => {
  assert.deepEqual(validateRuleTable(), []);
});

test("published testing matrix: every weight, every medicine", () => {
  for (const row of MATRIX) {
    assert.equal(
      doseMgFor("paracetamol", row.weightKg),
      row.paracetamol,
      `paracetamol at ${row.weightKg}kg`,
    );
    assert.equal(
      doseMgFor("ibuprofen", row.weightKg),
      row.ibuprofen,
      `ibuprofen at ${row.weightKg}kg`,
    );
    assert.equal(
      doseMgFor("celecoxib", row.weightKg),
      row.celecoxib,
      `celecoxib at ${row.weightKg}kg`,
    );
    assert.equal(
      doseMgFor("dexamethasone", row.weightKg),
      row.dexamethasone,
      `dexamethasone at ${row.weightKg}kg`,
    );
    assert.equal(
      doseMgFor("oxycodone", row.weightKg),
      row.oxycodone,
      `oxycodone at ${row.weightKg}kg`,
    );
  }
});

test("capping is reported when the mg/kg result exceeds the single-dose max", () => {
  const uncapped = calculateDose(medicationRules.paracetamol, 30);
  assert.equal(uncapped.ok && uncapped.dose.capped, false);

  const capped = calculateDose(medicationRules.paracetamol, 90);
  assert.equal(capped.ok && capped.dose.capped, true);
  assert.equal(capped.ok && capped.dose.doseMg, 1000);
});

test("no dose ever exceeds its single-dose maximum across a weight sweep", () => {
  for (const id of Object.keys(medicationRules) as Array<keyof typeof medicationRules>) {
    const rule = medicationRules[id];
    for (let w = 3; w <= 150; w += 0.5) {
      const result = calculateDose(rule, w);
      assert.equal(result.ok, true, `${id} at ${w}kg should calculate`);
      if (!result.ok) continue;
      assert.ok(
        result.dose.doseMg <= rule.maxSingleDoseMg,
        `${id} at ${w}kg produced ${result.dose.doseMg}mg, above cap ${rule.maxSingleDoseMg}mg`,
      );
    }
  }
});

test("a full day at the calculated dose never breaches the daily maximum", () => {
  for (const id of Object.keys(medicationRules) as Array<keyof typeof medicationRules>) {
    const rule = medicationRules[id];
    for (let w = 3; w <= 150; w += 0.5) {
      const result = calculateDose(rule, w);
      if (!result.ok) continue;
      assert.equal(
        exceedsDailyMaximum(result.dose),
        false,
        `${id} at ${w}kg: ${projectedDailyTotalMg(result.dose)}mg/day exceeds ${rule.maxDailyDoseMg}mg`,
      );
    }
  }
});

test("mL is withheld unless a concentration is explicitly confirmed", () => {
  const rule = medicationRules.paracetamol;

  const noConcentration = calculateDose(rule, 20);
  assert.equal(noConcentration.ok && noConcentration.dose.doseMl, undefined);

  const unconfirmed = calculateDose(rule, 20, { mgPerMl: 24, confirmed: false });
  assert.equal(unconfirmed.ok && unconfirmed.dose.doseMl, undefined);

  const zero = calculateDose(rule, 20, { mgPerMl: 0, confirmed: true });
  assert.equal(zero.ok && zero.dose.doseMl, undefined);

  const negative = calculateDose(rule, 20, { mgPerMl: -5, confirmed: true });
  assert.equal(negative.ok && negative.dose.doseMl, undefined);

  const nan = calculateDose(rule, 20, { mgPerMl: Number.NaN, confirmed: true });
  assert.equal(nan.ok && nan.dose.doseMl, undefined);
});

test("mL is calculated against a confirmed concentration", () => {
  // 20kg paracetamol = 300mg. At 120mg/5mL (24mg/mL) that is 12.5mL.
  const result = calculateDose(medicationRules.paracetamol, 20, {
    mgPerMl: 24,
    confirmed: true,
  });
  assert.equal(result.ok && result.dose.doseMg, 300);
  assert.equal(result.ok && result.dose.doseMl, 12.5);
  assert.equal(result.ok && result.dose.concentrationMgPerMl, 24);
});

test("mL rounds down, never up", () => {
  // 15kg ibuprofen = 150mg. At 100mg/5mL (20mg/mL) that is exactly 7.5mL.
  const exact = calculateDose(medicationRules.ibuprofen, 15, {
    mgPerMl: 20,
    confirmed: true,
  });
  assert.equal(exact.ok && exact.dose.doseMl, 7.5);

  // 10kg paracetamol = 150mg at 40mg/mL = 3.75mL, must floor to 3.7 not 3.8.
  const rounded = calculateDose(medicationRules.paracetamol, 10, {
    mgPerMl: 40,
    confirmed: true,
  });
  assert.equal(rounded.ok && rounded.dose.doseMl, 3.7);
});

test("implausible or missing weights are refused, not guessed", () => {
  const rule = medicationRules.paracetamol;

  for (const bad of [0, -5, Number.NaN, Number.POSITIVE_INFINITY, 1, 200]) {
    const result = calculateDose(rule, bad as number);
    assert.equal(result.ok, false, `weight ${bad} should be refused`);
  }
});

test("outlier but plausible weights calculate while flagging for confirmation", () => {
  assert.deepEqual(validateWeightKg(5), { valid: true, needsConfirmation: true });
  assert.deepEqual(validateWeightKg(120), { valid: true, needsConfirmation: true });
  assert.deepEqual(validateWeightKg(20), { valid: true, needsConfirmation: false });
});

test("roundDown is resistant to floating point error at boundaries", () => {
  // 0.1 * 15 is 1.5000000000000002 in IEEE 754.
  assert.equal(roundDown(0.1 * 15, 2), 1.5);
  // 0.1 * 35 is 3.5000000000000004.
  assert.equal(roundDown(0.1 * 35, 2), 3.5);
  assert.equal(roundDown(2.999999999999, 2), 3);
  assert.equal(roundDown(1.239, 2), 1.23);
});

test("high-dose medicines round to whole milligrams", () => {
  // 22.5kg paracetamol = 337.5mg raw, rounds down to 337.
  assert.equal(doseMgFor("paracetamol", 22.5), 337);
  assert.equal(Number.isInteger(doseMgFor("paracetamol", 22.5)), true);
  // 13.7kg ibuprofen = 137mg raw.
  assert.equal(doseMgFor("ibuprofen", 13.75), 137);
  // 11.3kg celecoxib = 45.2mg raw, rounds down to 45.
  assert.equal(doseMgFor("celecoxib", 11.3), 45);
});

test("low-dose medicines keep tenth-of-a-milligram precision", () => {
  // These are the rows that whole-mg rounding would have broken.
  assert.equal(doseMgFor("oxycodone", 15), 1.5);
  assert.equal(doseMgFor("oxycodone", 25), 2.5);
  assert.equal(doseMgFor("dexamethasone", 15), 1.5);
  assert.equal(doseMgFor("dexamethasone", 25), 2.5);
  // And a non-matrix weight, to confirm it is precision not a lookup table.
  assert.equal(doseMgFor("oxycodone", 18), 1.8);
  assert.equal(doseMgFor("dexamethasone", 42), 4.2);
});

test("the precision policy is per-medicine and deliberate", () => {
  // Guards against someone globalising this back to one value.
  assert.equal(medicationRules.paracetamol.mgPrecision, 0);
  assert.equal(medicationRules.ibuprofen.mgPrecision, 0);
  assert.equal(medicationRules.celecoxib.mgPrecision, 0);
  assert.equal(medicationRules.dexamethasone.mgPrecision, 1);
  assert.equal(medicationRules.oxycodone.mgPrecision, 1);
});

test("rounding is downward, never upward, at every precision", () => {
  // Paracetamol 20.06kg = 300.9mg. Nearest would give 301; we must give 300.
  assert.equal(doseMgFor("paracetamol", 20.06), 300);
  // Oxycodone 19.9kg = 1.99mg. Nearest would give 2.0; we must give 1.9.
  assert.equal(doseMgFor("oxycodone", 19.9), 1.9);
});

test("every calculated dose carries its audit metadata", () => {
  const result = calculateDose(medicationRules.oxycodone, 20);
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.dose.ruleVersion, "LOCAL-TONSIL-v1.0");
  assert.equal(result.dose.weightKgAtCalculation, 20);
  assert.ok(result.dose.safetyWarnings.length > 0);
});
