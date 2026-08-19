/**
 * Integration: persistence <-> clinical engine.
 *
 * Unit tests prove each module correct in isolation. This file proves they
 * compose, exercising the seam where a defect would be invisible to both:
 * the stored dose log feeding the rolling 24-hour safety check.
 *
 * The scenario is a real day of paracetamol QID, driven end to end.
 */

import test from "node:test";
import assert from "node:assert/strict";

import { MemoryStorageBackend } from "../storage.ts";
import { ChildProfileStore, canCalculateDoses, createChildProfile } from "../childProfile.ts";
import { createMedicationPlan, MedicationPlanStore } from "../medicationPlan.ts";
import { createDoseLogEntry, DoseLogStore } from "../doseLog.ts";

import { calculateDose } from "../../clinical/doseCalculator.ts";
import { medicationRules, RULE_VERSION } from "../../clinical/medicationRules.ts";
import {
  prnAvailability,
  validateDoseAdministration,
} from "../../clinical/safetyValidator.ts";
import {
  applyStatuses,
  findNextDose,
  generateDaySchedule,
} from "../../clinical/scheduleGenerator.ts";

const SURGERY = new Date(2026, 7, 10);
const DAY_4 = new Date(2026, 7, 14);

function setup() {
  const backend = new MemoryStorageBackend();
  return {
    backend,
    profiles: new ChildProfileStore(backend),
    plans: new MedicationPlanStore(backend),
    log: new DoseLogStore(backend),
  };
}

function paracetamolDose() {
  const result = calculateDose(medicationRules.paracetamol, 20);
  if (!result.ok) throw new Error("calculation failed");
  return result.dose;
}

test("a full setup-to-dosing flow persists and validates correctly", async () => {
  const { profiles, plans, log } = setup();

  // 1. Parent enters details. Weight starts unconfirmed, so dosing is blocked.
  const profile = createChildProfile({
    id: "child-1",
    nickname: "Sam",
    ageYears: 6,
    weightKg: 20,
    surgeryDate: SURGERY.toISOString(),
    surgeryType: "tonsillectomy",
    hospital: "JHH",
    now: DAY_4,
  });
  await profiles.save(profile);
  assert.equal(canCalculateDoses(await profiles.get()).allowed, false);

  // 2. Parent confirms the weight.
  await profiles.update({ weightConfirmed: true }, DAY_4);
  assert.equal(canCalculateDoses(await profiles.get()).allowed, true);

  // 3. Plan is calculated and stored, then confirmed against discharge paper.
  const dose = paracetamolDose();
  await plans.addPlan(
    createMedicationPlan({
      id: "plan-1",
      childId: "child-1",
      weightKgAtCalculation: 20,
      ruleVersion: RULE_VERSION,
      selectedMedicationIds: ["paracetamol"],
      calculatedMedications: [dose],
      now: DAY_4,
    }),
    DAY_4,
  );
  await plans.confirm("plan-1", DAY_4);

  const active = await plans.active();
  assert.ok(active, "confirmed plan should be active");
  assert.equal(active.weightKgAtCalculation, 20);

  // 4. The day's schedule is generated: paracetamol QID.
  const schedule = generateDaySchedule({
    inputs: [{ rule: medicationRules.paracetamol, dose }],
    date: DAY_4,
    postOpDay: 4,
  });
  assert.equal(schedule.length, 4);

  // 5. Parent gives the 06:00 dose. It is recorded and reflected in status.
  const first = schedule[0]!;
  const given = await log.append(
    createDoseLogEntry({
      id: "dose-1",
      medicationId: "paracetamol",
      displayName: dose.displayName,
      actualDateTime: first.scheduledDateTime,
      doseMg: dose.doseMg,
      status: "given",
      postOpDay: 4,
      scheduledDoseId: first.id,
      planId: "plan-1",
      ruleVersion: RULE_VERSION,
      now: new Date(first.scheduledDateTime),
    }),
  );
  assert.equal(given.ok, true);

  const midMorning = new Date(DAY_4.getFullYear(), DAY_4.getMonth(), DAY_4.getDate(), 9, 0);
  const withStatuses = applyStatuses({
    schedule,
    log: await log.all(),
    now: midMorning,
  });
  assert.equal(withStatuses[0]?.status, "given");
  assert.equal(findNextDose(withStatuses)?.id, schedule[1]?.id);
});

test("stored doses drive the rolling 24 hour validator", async () => {
  const { log } = setup();
  const dose = paracetamolDose();

  const base = new Date(2026, 7, 14, 6, 0);
  // Four doses at the protocol's 6-hour spacing.
  for (let i = 0; i < 4; i += 1) {
    const at = new Date(base.getTime() + i * 6 * 60 * 60 * 1000);
    await log.append(
      createDoseLogEntry({
        id: `dose-${i}`,
        medicationId: "paracetamol",
        displayName: dose.displayName,
        actualDateTime: at.toISOString(),
        doseMg: dose.doseMg,
        status: "given",
        postOpDay: 4,
        now: at,
      }),
    );
  }

  // A fifth dose, an hour after the fourth, breaches both count and interval.
  const fifthAttempt = new Date(base.getTime() + 19 * 60 * 60 * 1000);
  const verdict = validateDoseAdministration({
    rule: medicationRules.paracetamol,
    dose,
    log: await log.all(),
    atTime: fifthAttempt,
  });

  assert.equal(verdict.dosesInWindow, 4);
  assert.ok(verdict.issues.some((i) => i.code === "max_doses_24h"));
  assert.ok(verdict.issues.some((i) => i.code === "min_interval"));
  assert.equal(verdict.severity, "warn");
});

test("skipped doses stored in the log do not consume the daily allowance", async () => {
  const { log } = setup();
  const dose = paracetamolDose();
  const base = new Date(2026, 7, 14, 6, 0);

  for (let i = 0; i < 4; i += 1) {
    const at = new Date(base.getTime() + i * 60 * 60 * 1000);
    await log.append(
      createDoseLogEntry({
        id: `skip-${i}`,
        medicationId: "paracetamol",
        displayName: dose.displayName,
        actualDateTime: at.toISOString(),
        doseMg: dose.doseMg,
        status: "skipped",
        postOpDay: 4,
        now: at,
      }),
    );
  }

  const verdict = validateDoseAdministration({
    rule: medicationRules.paracetamol,
    dose,
    log: await log.all(),
    atTime: new Date(base.getTime() + 5 * 60 * 60 * 1000),
  });

  assert.equal(verdict.dosesInWindow, 0, "skipped medicine was never given");
  assert.ok(!verdict.issues.some((i) => i.code === "max_doses_24h"));
});

test("oxycodone PRN availability reads from the stored log", async () => {
  const { log } = setup();
  const result = calculateDose(medicationRules.oxycodone, 20);
  if (!result.ok) throw new Error("calculation failed");
  const dose = result.dose;
  assert.equal(dose.doseMg, 2);

  const base = new Date(2026, 7, 14, 8, 0);
  await log.append(
    createDoseLogEntry({
      id: "oxy-1",
      medicationId: "oxycodone",
      displayName: dose.displayName,
      actualDateTime: base.toISOString(),
      doseMg: dose.doseMg,
      status: "given",
      postOpDay: 4,
      now: base,
    }),
  );

  // Two hours later: inside the 6-hour minimum interval.
  const tooSoon = new Date(base.getTime() + 2 * 60 * 60 * 1000);
  const blocked = prnAvailability({
    rule: medicationRules.oxycodone,
    log: await log.all(),
    atTime: tooSoon,
  });
  assert.equal(blocked.dosesUsed, 1);
  assert.equal(blocked.canGiveNow, false);

  // Seven hours later: the interval has elapsed.
  const clear = new Date(base.getTime() + 7 * 60 * 60 * 1000);
  const allowed = prnAvailability({
    rule: medicationRules.oxycodone,
    log: await log.all(),
    atTime: clear,
  });
  assert.equal(allowed.canGiveNow, true);
  assert.equal(allowed.dosesRemaining, 3);
});

test("a weight change supersedes the plan while the old dose log survives", async () => {
  const { plans, log } = setup();
  const dose = paracetamolDose();

  await plans.addPlan(
    createMedicationPlan({
      id: "plan-1",
      childId: "child-1",
      weightKgAtCalculation: 20,
      ruleVersion: RULE_VERSION,
      selectedMedicationIds: ["paracetamol"],
      calculatedMedications: [dose],
      now: DAY_4,
    }),
    DAY_4,
  );
  await plans.confirm("plan-1", DAY_4);

  await log.append(
    createDoseLogEntry({
      id: "dose-1",
      medicationId: "paracetamol",
      displayName: dose.displayName,
      actualDateTime: DAY_4.toISOString(),
      doseMg: dose.doseMg,
      status: "given",
      postOpDay: 4,
      planId: "plan-1",
      ruleVersion: RULE_VERSION,
      now: DAY_4,
    }),
  );

  // Weight corrected to 24kg; a new plan is calculated.
  const heavier = calculateDose(medicationRules.paracetamol, 24);
  if (!heavier.ok) throw new Error("calculation failed");

  const later = new Date(DAY_4.getTime() + 60 * 60 * 1000);
  await plans.addPlan(
    createMedicationPlan({
      id: "plan-2",
      childId: "child-1",
      weightKgAtCalculation: 24,
      ruleVersion: RULE_VERSION,
      selectedMedicationIds: ["paracetamol"],
      calculatedMedications: [heavier.dose],
      now: later,
    }),
    later,
  );

  // The historical dose still resolves against the plan it was given under.
  const entries = await log.all();
  assert.equal(entries[0]?.planId, "plan-1");
  assert.equal(entries[0]?.doseMg, 300, "history records what was actually given");

  const originalPlan = await plans.byId("plan-1");
  assert.ok(originalPlan, "the superseded plan is still readable");
  assert.equal(originalPlan.weightKgAtCalculation, 20);
  assert.ok(originalPlan.supersededAt);

  // And the new plan needs its own confirmation before it can drive anything.
  assert.equal(await plans.active(), null);
});

test("data survives a simulated app restart", async () => {
  const backend = new MemoryStorageBackend();
  const dose = paracetamolDose();

  // First "launch": write everything.
  {
    const profiles = new ChildProfileStore(backend);
    const plans = new MedicationPlanStore(backend);
    const log = new DoseLogStore(backend);

    await profiles.save(
      createChildProfile({
        id: "child-1",
        ageYears: 6,
        weightKg: 20,
        surgeryDate: SURGERY.toISOString(),
        surgeryType: "tonsillectomy",
        hospital: "JHH",
        now: DAY_4,
      }),
    );
    await profiles.update({ weightConfirmed: true }, DAY_4);
    await plans.addPlan(
      createMedicationPlan({
        id: "plan-1",
        childId: "child-1",
        weightKgAtCalculation: 20,
        ruleVersion: RULE_VERSION,
        selectedMedicationIds: ["paracetamol"],
        calculatedMedications: [dose],
        now: DAY_4,
      }),
      DAY_4,
    );
    await plans.confirm("plan-1", DAY_4);
    await log.append(
      createDoseLogEntry({
        id: "dose-1",
        medicationId: "paracetamol",
        displayName: dose.displayName,
        actualDateTime: DAY_4.toISOString(),
        doseMg: dose.doseMg,
        status: "given",
        postOpDay: 4,
        now: DAY_4,
      }),
    );
  }

  // Second "launch": fresh store instances over the same backend.
  {
    const profiles = new ChildProfileStore(backend);
    const plans = new MedicationPlanStore(backend);
    const log = new DoseLogStore(backend);

    const profile = await profiles.get();
    assert.equal(profile?.weightKg, 20);
    assert.equal(profile?.weightConfirmed, true);
    assert.equal(canCalculateDoses(profile).allowed, true);

    assert.equal((await plans.active())?.id, "plan-1");
    assert.equal((await log.all()).length, 1);
  }
});
