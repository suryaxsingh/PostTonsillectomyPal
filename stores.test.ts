/**
 * Store tests: child profile, medication plan, dose log, pain check-in.
 *
 * Weighted toward the safety gates rather than CRUD: the weight-confirmation
 * gate, plan supersession, and the dose log's behaviour when a write fails or
 * the stored data is partly unreadable.
 */

import test from "node:test";
import assert from "node:assert/strict";

import { MemoryStorageBackend, storageKey } from "../storage.ts";
import {
  canCalculateDoses,
  ChildProfileStore,
  createChildProfile,
  validateChildProfile,
} from "../childProfile.ts";
import {
  createMedicationPlan,
  MedicationPlanStore,
  planIsStale,
} from "../medicationPlan.ts";
import { createDoseLogEntry, DoseLogStore } from "../doseLog.ts";
import {
  categoryForFaceValue,
  createPainCheckIn,
  guidanceForCategory,
  localDateKey,
  PAIN_CATEGORIES,
  PainCheckInStore,
  type PainFaceValue,
} from "../painCheckIn.ts";
import { calculateDose } from "../../clinical/doseCalculator.ts";
import { medicationRules, RULE_VERSION } from "../../clinical/medicationRules.ts";

const NOW = new Date("2026-08-14T09:00:00.000Z");

function profileFixture(overrides: Record<string, unknown> = {}) {
  return {
    ...createChildProfile({
      id: "child-1",
      nickname: "Sam",
      ageYears: 6,
      weightKg: 20,
      surgeryDate: "2026-08-10",
      surgeryType: "tonsillectomy" as const,
      hospital: "JHH" as const,
      now: NOW,
    }),
    ...overrides,
  };
}

function doseFor(medId: keyof typeof medicationRules) {
  const result = calculateDose(medicationRules[medId], 20);
  if (!result.ok) throw new Error(`could not calculate ${medId}`);
  return result.dose;
}

// ---------------------------------------------------------------------------
// Child profile
// ---------------------------------------------------------------------------

test("a new profile starts with weight unconfirmed", () => {
  const profile = profileFixture();
  assert.equal(profile.weightConfirmed, false);
});

test("dose calculation is gated on a confirmed weight", () => {
  assert.deepEqual(canCalculateDoses(null), {
    allowed: false,
    reason: "Enter your child's details first.",
  });

  const unconfirmed = profileFixture();
  const blocked = canCalculateDoses(unconfirmed);
  assert.equal(blocked.allowed, false);
  if (blocked.allowed) return;
  assert.match(blocked.reason, /confirm your child's weight/i);

  const confirmed = profileFixture({ weightConfirmed: true });
  assert.deepEqual(canCalculateDoses(confirmed), { allowed: true });
});

test("a zero or negative stored weight can never permit calculation", () => {
  for (const weightKg of [0, -5]) {
    const bad = profileFixture({ weightKg, weightConfirmed: true });
    assert.equal(canCalculateDoses(bad).allowed, false, `weight ${weightKg}`);
  }
});

test("changing the weight clears the confirmation", async () => {
  const backend = new MemoryStorageBackend();
  const store = new ChildProfileStore(backend);

  await store.save(profileFixture({ weightConfirmed: true }));
  assert.equal((await store.get())?.weightConfirmed, true);

  await store.update({ weightKg: 22 });

  const updated = await store.get();
  assert.equal(updated?.weightKg, 22);
  assert.equal(
    updated?.weightConfirmed,
    false,
    "a new weight must be re-confirmed before doses are recalculated",
  );
});

test("re-saving the same weight leaves confirmation intact", async () => {
  const backend = new MemoryStorageBackend();
  const store = new ChildProfileStore(backend);

  await store.save(profileFixture({ weightConfirmed: true }));
  await store.update({ nickname: "Sammy" });

  const updated = await store.get();
  assert.equal(updated?.nickname, "Sammy");
  assert.equal(updated?.weightConfirmed, true);
});

test("weight and confirmation can be set together in one update", async () => {
  const backend = new MemoryStorageBackend();
  const store = new ChildProfileStore(backend);

  await store.save(profileFixture({ weightConfirmed: true }));
  await store.update({ weightKg: 25, weightConfirmed: true });

  const updated = await store.get();
  assert.equal(updated?.weightKg, 25);
  assert.equal(updated?.weightConfirmed, true);
});

test("a corrupt stored profile reads as absent, not as a partial profile", async () => {
  const backend = new MemoryStorageBackend();
  const store = new ChildProfileStore(backend);

  backend.seedRaw(
    storageKey("childProfile"),
    JSON.stringify({ id: "child-1", weightKg: 20 }), // missing required fields
  );

  assert.equal(await store.get(), null);
});

test("profile validation rejects an unusable weight", () => {
  assert.equal(validateChildProfile(profileFixture({ weightKg: 0 })), null);
  assert.equal(validateChildProfile(profileFixture({ weightKg: -1 })), null);
  assert.equal(validateChildProfile(profileFixture({ weightKg: "20" })), null);
});

// ---------------------------------------------------------------------------
// Medication plan
// ---------------------------------------------------------------------------

function planFixture(id = "plan-1", weightKg = 20) {
  return createMedicationPlan({
    id,
    childId: "child-1",
    weightKgAtCalculation: weightKg,
    ruleVersion: RULE_VERSION,
    selectedMedicationIds: ["paracetamol", "ibuprofen"],
    calculatedMedications: [doseFor("paracetamol"), doseFor("ibuprofen")],
    now: NOW,
  });
}

test("a plan is not active until the parent confirms it", async () => {
  const store = new MedicationPlanStore(new MemoryStorageBackend());

  await store.addPlan(planFixture(), NOW);
  assert.equal(await store.active(), null, "unconfirmed plan must not be active");
  assert.ok(await store.latest(), "but it is still the latest plan for review");

  await store.confirm("plan-1", NOW);
  const active = await store.active();
  assert.equal(active?.id, "plan-1");
  assert.ok(active?.parentConfirmedAt);
});

test("adding a plan supersedes the previous one", async () => {
  const store = new MedicationPlanStore(new MemoryStorageBackend());

  await store.addPlan(planFixture("plan-1", 20), NOW);
  await store.confirm("plan-1", NOW);

  const later = new Date(NOW.getTime() + 60_000);
  await store.addPlan(planFixture("plan-2", 22), later);

  const all = await store.all();
  const first = all.find((p) => p.id === "plan-1");
  assert.ok(first?.supersededAt, "old plan should be superseded");

  // The superseded plan is retained so historical dose logs still resolve.
  assert.equal(all.length, 2);

  // And the new one is not active until separately confirmed.
  assert.equal(await store.active(), null);
});

test("a superseded plan cannot be confirmed", async () => {
  const store = new MedicationPlanStore(new MemoryStorageBackend());

  await store.addPlan(planFixture("plan-1"), NOW);
  await store.addPlan(planFixture("plan-2"), new Date(NOW.getTime() + 60_000));

  const result = await store.confirm("plan-1", NOW);
  assert.equal(result.ok, false);
});

test("a plan is stale when weight or rule version has moved on", () => {
  const plan = planFixture("plan-1", 20);

  assert.equal(planIsStale(plan, 20, RULE_VERSION), false);
  assert.equal(planIsStale(plan, 22, RULE_VERSION), true);
  assert.equal(planIsStale(plan, 20, "LOCAL-TONSIL-v2.0"), true);
  assert.equal(planIsStale(null, 20, RULE_VERSION), true);
});

test("a plan containing an over-cap dose is rejected wholesale", async () => {
  const store = new MedicationPlanStore(new MemoryStorageBackend());

  const tampered = planFixture();
  // 5000mg paracetamol, five times the single-dose maximum.
  tampered.calculatedMedications[0] = {
    ...tampered.calculatedMedications[0]!,
    doseMg: 5000,
  };

  const result = await store.addPlan(tampered, NOW);
  assert.equal(result.ok, false, "a plan with an impossible dose must not store");
});

// ---------------------------------------------------------------------------
// Dose log
// ---------------------------------------------------------------------------

function entryFixture(id: string, at: Date, overrides: Record<string, unknown> = {}) {
  return {
    ...createDoseLogEntry({
      id,
      medicationId: "paracetamol",
      displayName: "Paracetamol / Panadol",
      actualDateTime: at.toISOString(),
      doseMg: 300,
      status: "given",
      postOpDay: 4,
      planId: "plan-1",
      ruleVersion: RULE_VERSION,
      now: at,
    }),
    ...overrides,
  };
}

test("a dose entry round-trips with its audit fields", async () => {
  const store = new DoseLogStore(new MemoryStorageBackend());

  const result = await store.append(entryFixture("dose-1", NOW));
  assert.equal(result.ok, true);

  const [stored] = await store.all();
  assert.equal(stored?.planId, "plan-1");
  assert.equal(stored?.ruleVersion, RULE_VERSION);
  assert.ok(stored?.recordedAt);
});

test("a failed write reports that the dose was NOT recorded", async () => {
  const backend = new MemoryStorageBackend();
  const store = new DoseLogStore(backend);
  backend.failNextWrite = true;

  const result = await store.append(entryFixture("dose-1", NOW));
  assert.equal(result.ok, false);
  if (result.ok) return;

  // The message must be unambiguous: an optimistic UI tick here would make
  // the 24-hour count silently wrong.
  assert.match(result.error, /NOT recorded/);
  assert.equal((await store.all()).length, 0);
});

test("duplicate entry ids are refused", async () => {
  const store = new DoseLogStore(new MemoryStorageBackend());

  assert.equal((await store.append(entryFixture("dose-1", NOW))).ok, true);
  const second = await store.append(entryFixture("dose-1", NOW));
  assert.equal(second.ok, false);
  assert.equal((await store.all()).length, 1);
});

test("an entry with an unparseable time is refused", async () => {
  const store = new DoseLogStore(new MemoryStorageBackend());

  const result = await store.append(
    entryFixture("dose-1", NOW, { actualDateTime: "sometime yesterday" }),
  );
  assert.equal(result.ok, false, "an undateable dose cannot enter the 24h window");
});

test("a partly unreadable log is reported as degraded, not silently short", async () => {
  const backend = new MemoryStorageBackend();
  const store = new DoseLogStore(backend);

  backend.seedRaw(
    storageKey("doseLog"),
    JSON.stringify([
      entryFixture("dose-1", NOW),
      { id: "corrupt", medicationId: "paracetamol" }, // missing required fields
    ]),
  );

  const integrity = await store.readWithIntegrity();
  assert.equal(integrity.entries.length, 1);
  assert.equal(integrity.droppedCount, 1);
  assert.equal(
    integrity.degraded,
    true,
    "a safety count computed from this log must know it is incomplete",
  );
});

test("appending preserves entries that could not be parsed", async () => {
  const backend = new MemoryStorageBackend();
  const store = new DoseLogStore(backend);

  backend.seedRaw(
    storageKey("doseLog"),
    JSON.stringify([{ id: "corrupt", medicationId: "paracetamol" }]),
  );

  await store.append(entryFixture("dose-1", NOW));

  // The unreadable entry is still on disk, not compacted away.
  const raw = JSON.parse((await backend.getItem(storageKey("doseLog")))!);
  assert.equal(raw.length, 2);
  assert.ok(raw.some((e: { id: string }) => e.id === "corrupt"));
});

test("the log feeds the safety validator's 24 hour window", async () => {
  const store = new DoseLogStore(new MemoryStorageBackend());

  for (let i = 0; i < 4; i += 1) {
    await store.append(
      entryFixture(`dose-${i}`, new Date(NOW.getTime() - i * 6 * 60 * 60 * 1000)),
    );
  }

  const entries = await store.forMedication("paracetamol");
  assert.equal(entries.length, 4);
  // Newest first.
  assert.equal(entries[0]?.id, "dose-0");
});

test("scheduled doses are detected as already given", async () => {
  const store = new DoseLogStore(new MemoryStorageBackend());

  await store.append(
    entryFixture("dose-1", NOW, { scheduledDoseId: "sched-abc" }),
  );

  assert.equal(await store.isScheduledDoseGiven("sched-abc"), true);
  assert.equal(await store.isScheduledDoseGiven("sched-xyz"), false);
});

test("skipped doses do not register as given", async () => {
  const store = new DoseLogStore(new MemoryStorageBackend());

  await store.append(
    entryFixture("dose-1", NOW, { scheduledDoseId: "sched-abc", status: "skipped" }),
  );

  assert.equal(await store.isScheduledDoseGiven("sched-abc"), false);
});

// ---------------------------------------------------------------------------
// Pain check-in
// ---------------------------------------------------------------------------

test("face values map to categories in order", () => {
  const expected = [...PAIN_CATEGORIES];
  for (let value = 0; value <= 5; value += 1) {
    assert.equal(categoryForFaceValue(value as PainFaceValue), expected[value]);
  }
});

test("every pain category's guidance keeps the bleeding pathway visible", () => {
  for (const category of PAIN_CATEGORIES) {
    const guidance = guidanceForCategory(category);
    assert.match(
      guidance,
      /fresh bleeding/i,
      `${category} guidance must still route bleeding to emergency care`,
    );
    assert.match(guidance, /000/, `${category} guidance must mention 000`);
  }
});

test("the worst-pain message directs to urgent advice", () => {
  assert.match(guidanceForCategory("worst"), /urgent medical advice/i);
});

test("re-checking on the same day replaces that day's entry", async () => {
  const store = new PainCheckInStore(new MemoryStorageBackend());

  await store.save(
    createPainCheckIn({ id: "p1", childId: "child-1", painFaceValue: 1, postOpDay: 4, now: NOW }),
  );
  const later = new Date(NOW.getTime() + 5 * 60 * 60 * 1000);
  await store.save(
    createPainCheckIn({ id: "p2", childId: "child-1", painFaceValue: 4, postOpDay: 4, now: later }),
  );

  const all = await store.all();
  assert.equal(all.length, 1, "one check-in per day");
  assert.equal(all[0]?.painFaceValue, 4, "the later reading wins");
});

test("check-ins on different days are both kept", async () => {
  const store = new PainCheckInStore(new MemoryStorageBackend());

  await store.save(
    createPainCheckIn({ id: "p1", childId: "child-1", painFaceValue: 2, postOpDay: 4, now: NOW }),
  );
  const nextDay = new Date(NOW.getTime() + 24 * 60 * 60 * 1000);
  await store.save(
    createPainCheckIn({ id: "p2", childId: "child-1", painFaceValue: 3, postOpDay: 5, now: nextDay }),
  );

  assert.equal((await store.all()).length, 2);
  assert.equal((await store.forDate(NOW))?.painFaceValue, 2);
  assert.equal((await store.forDate(nextDay))?.painFaceValue, 3);
});

test("the day key follows local time, not UTC", () => {
  // 11pm local on the 14th belongs to the 14th, whatever UTC says.
  const lateEvening = new Date(2026, 7, 14, 23, 30);
  assert.equal(localDateKey(lateEvening), "2026-08-14");
});
