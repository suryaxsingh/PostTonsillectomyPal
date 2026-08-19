/**
 * Safety validator tests.
 *
 * Focus is the scenarios V1 could not detect at all: repeated tick-off,
 * doses inside the minimum interval, and the oxycodone 24-hour ceiling.
 */

import test from "node:test";
import assert from "node:assert/strict";

import { medicationRules } from "../medicationRules.ts";
import { calculateDose } from "../doseCalculator.ts";
import {
  givenDosesInWindow,
  prnAvailability,
  validateDoseAdministration,
} from "../safetyValidator.ts";
import type { DoseLogEntry } from "../types.ts";

const WEIGHT_KG = 20;

function doseFor(medId: keyof typeof medicationRules) {
  const result = calculateDose(medicationRules[medId], WEIGHT_KG);
  if (!result.ok) throw new Error(`could not calculate ${medId}`);
  return result.dose;
}

function logEntry(
  medId: keyof typeof medicationRules,
  at: Date,
  overrides: Partial<DoseLogEntry> = {},
): DoseLogEntry {
  const dose = doseFor(medId);
  return {
    id: `${medId}-${at.toISOString()}`,
    medicationId: medId,
    displayName: dose.displayName,
    actualDateTime: at.toISOString(),
    doseMg: dose.doseMg,
    status: "given",
    postOpDay: 3,
    ...overrides,
  };
}

const NOW = new Date("2026-08-14T18:00:00.000Z");
function hoursAgo(h: number): Date {
  return new Date(NOW.getTime() - h * 60 * 60 * 1000);
}

test("a first dose with an empty log is safe", () => {
  const verdict = validateDoseAdministration({
    rule: medicationRules.paracetamol,
    dose: doseFor("paracetamol"),
    log: [],
    atTime: NOW,
  });

  assert.equal(verdict.dosesInWindow, 0);
  assert.equal(verdict.hoursSinceLastDose, null);
  // Only the unreviewed-rules advisory should be present.
  assert.deepEqual(
    verdict.issues.map((i) => i.code),
    ["rules_unreviewed"],
  );
});

test("the 24 hour window is rolling, not calendar-day", () => {
  // Four paracetamol doses spread over the previous evening.
  const log = [
    logEntry("paracetamol", hoursAgo(23)),
    logEntry("paracetamol", hoursAgo(17)),
    logEntry("paracetamol", hoursAgo(11)),
    logEntry("paracetamol", hoursAgo(5)),
  ];

  const verdict = validateDoseAdministration({
    rule: medicationRules.paracetamol,
    dose: doseFor("paracetamol"),
    log,
    atTime: NOW,
  });

  assert.equal(verdict.dosesInWindow, 4);
  assert.ok(verdict.issues.some((i) => i.code === "max_doses_24h"));
});

test("doses older than 24 hours age out of the window", () => {
  const log = [
    logEntry("paracetamol", hoursAgo(30)),
    logEntry("paracetamol", hoursAgo(26)),
    logEntry("paracetamol", hoursAgo(25)),
  ];

  const verdict = validateDoseAdministration({
    rule: medicationRules.paracetamol,
    dose: doseFor("paracetamol"),
    log,
    atTime: NOW,
  });

  assert.equal(verdict.dosesInWindow, 0);
  assert.equal(verdict.severity, "warn"); // unreviewed rules only
  assert.ok(!verdict.issues.some((i) => i.code === "max_doses_24h"));
});

test("skipped and missed entries do not count as administered medicine", () => {
  const log = [
    logEntry("paracetamol", hoursAgo(6), { status: "skipped" }),
    logEntry("paracetamol", hoursAgo(12), { status: "missed" }),
  ];

  assert.equal(givenDosesInWindow(log, "paracetamol", NOW).length, 0);

  const verdict = validateDoseAdministration({
    rule: medicationRules.paracetamol,
    dose: doseFor("paracetamol"),
    log,
    atTime: NOW,
  });
  assert.equal(verdict.dosesInWindow, 0);
  assert.ok(!verdict.issues.some((i) => i.code === "min_interval"));
});

test("a dose inside the minimum interval is flagged", () => {
  // Paracetamol minimum interval is 6 hours; last dose was 2 hours ago.
  const log = [logEntry("paracetamol", hoursAgo(2))];

  const verdict = validateDoseAdministration({
    rule: medicationRules.paracetamol,
    dose: doseFor("paracetamol"),
    log,
    atTime: NOW,
  });

  const issue = verdict.issues.find((i) => i.code === "min_interval");
  assert.ok(issue, "expected a minimum interval issue");
  assert.match(issue.message, /at least 6 hours apart/);
  assert.match(issue.message, /Do not give extra or double doses/);
});

test("a dose exactly at the minimum interval is permitted", () => {
  const log = [logEntry("paracetamol", hoursAgo(6))];

  const verdict = validateDoseAdministration({
    rule: medicationRules.paracetamol,
    dose: doseFor("paracetamol"),
    log,
    atTime: NOW,
  });

  assert.ok(!verdict.issues.some((i) => i.code === "min_interval"));
});

test("one medicine's history does not affect another's", () => {
  const log = [
    logEntry("paracetamol", hoursAgo(1)),
    logEntry("paracetamol", hoursAgo(7)),
    logEntry("paracetamol", hoursAgo(13)),
    logEntry("paracetamol", hoursAgo(19)),
  ];

  const verdict = validateDoseAdministration({
    rule: medicationRules.ibuprofen,
    dose: doseFor("ibuprofen"),
    log,
    atTime: NOW,
  });

  assert.equal(verdict.dosesInWindow, 0);
  assert.ok(!verdict.issues.some((i) => i.code === "max_doses_24h"));
});

test("oxycodone at its 24 hour ceiling warns without softening the message", () => {
  const log = [
    logEntry("oxycodone", hoursAgo(24 - 1)),
    logEntry("oxycodone", hoursAgo(16)),
    logEntry("oxycodone", hoursAgo(10)),
    logEntry("oxycodone", hoursAgo(7)),
  ];

  const verdict = validateDoseAdministration({
    rule: medicationRules.oxycodone,
    dose: doseFor("oxycodone"),
    log,
    atTime: NOW,
  });

  const issue = verdict.issues.find((i) => i.code === "max_doses_24h");
  assert.ok(issue);
  // Product decision: the parent may proceed, so this is a warning...
  assert.equal(issue.severity, "warn");
  // ...but the required full-strength copy must survive the downgrade.
  assert.match(issue.message, /Do not give another dose unless advised by a doctor/);
});

test("every rule currently uses the warn dial", () => {
  for (const id of Object.keys(medicationRules) as Array<keyof typeof medicationRules>) {
    assert.equal(
      medicationRules[id].breachSeverity,
      "warn",
      `${id} breachSeverity`,
    );
  }
});

test("a rule switched to block reports block, so the dial still works", () => {
  const strictOxycodone = {
    ...medicationRules.oxycodone,
    breachSeverity: "block" as const,
  };
  const log = [
    logEntry("oxycodone", hoursAgo(20)),
    logEntry("oxycodone", hoursAgo(14)),
    logEntry("oxycodone", hoursAgo(8)),
    logEntry("oxycodone", hoursAgo(7)),
  ];

  const verdict = validateDoseAdministration({
    rule: strictOxycodone,
    dose: doseFor("oxycodone"),
    log,
    atTime: NOW,
  });

  assert.equal(verdict.severity, "block");
});

test("marking the same scheduled dose twice is detected", () => {
  const entry = logEntry("paracetamol", hoursAgo(1), {
    scheduledDoseId: "sched-1",
  });

  const verdict = validateDoseAdministration({
    rule: medicationRules.paracetamol,
    dose: doseFor("paracetamol"),
    log: [entry],
    atTime: NOW,
    scheduledDoseId: "sched-1",
  });

  assert.ok(verdict.issues.some((i) => i.code === "duplicate_dose"));
});

test("future-dated log entries are ignored", () => {
  const future = new Date(NOW.getTime() + 3 * 60 * 60 * 1000);
  const log = [logEntry("paracetamol", future)];

  assert.equal(givenDosesInWindow(log, "paracetamol", NOW).length, 0);
});

test("malformed timestamps are discarded rather than throwing", () => {
  const log = [logEntry("paracetamol", NOW, { actualDateTime: "not-a-date" })];

  assert.doesNotThrow(() => givenDosesInWindow(log, "paracetamol", NOW));
  assert.equal(givenDosesInWindow(log, "paracetamol", NOW).length, 0);
});

test("PRN availability reports remaining doses and when the next is allowed", () => {
  const log = [
    logEntry("oxycodone", hoursAgo(8)),
    logEntry("oxycodone", hoursAgo(2)),
  ];

  const availability = prnAvailability({
    rule: medicationRules.oxycodone,
    log,
    atTime: NOW,
  });

  assert.equal(availability.dosesUsed, 2);
  assert.equal(availability.dosesRemaining, 2);
  assert.equal(availability.canGiveNow, false); // only 2h since last, needs 6
  const nextAllowed = availability.nextDoseAllowedAt;
  assert.ok(nextAllowed);
  assert.equal(
    nextAllowed.getTime(),
    hoursAgo(2).getTime() + 6 * 60 * 60 * 1000,
  );
});

test("PRN availability permits a dose once the interval has elapsed", () => {
  const log = [logEntry("oxycodone", hoursAgo(7))];

  const availability = prnAvailability({
    rule: medicationRules.oxycodone,
    log,
    atTime: NOW,
  });

  assert.equal(availability.canGiveNow, true);
  assert.equal(availability.dosesRemaining, 3);
});

test("PRN availability blocks at the ceiling until the oldest dose ages out", () => {
  const log = [
    logEntry("oxycodone", hoursAgo(20)),
    logEntry("oxycodone", hoursAgo(14)),
    logEntry("oxycodone", hoursAgo(8)),
    logEntry("oxycodone", hoursAgo(7)),
  ];

  const availability = prnAvailability({
    rule: medicationRules.oxycodone,
    log,
    atTime: NOW,
  });

  assert.equal(availability.dosesRemaining, 0);
  assert.equal(availability.canGiveNow, false);
  // Oldest dose was 20h ago, so it clears the window in 4 more hours.
  const clearsAt = availability.nextDoseAllowedAt;
  assert.ok(clearsAt);
  assert.equal(
    clearsAt.getTime(),
    hoursAgo(20).getTime() + 24 * 60 * 60 * 1000,
  );
});

test("no validator message ever suggests catching up or doubling", () => {
  const log = [
    logEntry("paracetamol", hoursAgo(1)),
    logEntry("paracetamol", hoursAgo(2)),
    logEntry("paracetamol", hoursAgo(3)),
    logEntry("paracetamol", hoursAgo(4)),
  ];

  const verdict = validateDoseAdministration({
    rule: medicationRules.paracetamol,
    dose: doseFor("paracetamol"),
    log,
    atTime: NOW,
  });

  for (const issue of verdict.issues) {
    assert.doesNotMatch(issue.message, /catch up|double up|make up the dose/i);
  }
});
