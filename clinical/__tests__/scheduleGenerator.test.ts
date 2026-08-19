/**
 * Schedule generator tests.
 *
 * Key invariants: oxycodone is never scheduled, dexamethasone appears only on
 * prescribed days, and regular medicines produce a full day of doses rather
 * than V1's single "next dose".
 */

import test from "node:test";
import assert from "node:assert/strict";

import { medicationRules } from "../medicationRules.ts";
import { calculateDose } from "../doseCalculator.ts";
import {
  applyStatuses,
  findNextDose,
  generateDaySchedule,
  generateDayScheduleForMedication,
  getPostOpDay,
  isActiveOnDay,
  parseScheduleTime,
  resolveDoseStatus,
} from "../scheduleGenerator.ts";
import type { ScheduleInput } from "../scheduleGenerator.ts";
import type { DoseLogEntry, ScheduledDose } from "../types.ts";

const WEIGHT_KG = 20;
const DATE = new Date(2026, 7, 14); // 14 Aug 2026, local time

function inputFor(
  medId: keyof typeof medicationRules,
  extra: Partial<ScheduleInput> = {},
): ScheduleInput {
  const result = calculateDose(medicationRules[medId], WEIGHT_KG);
  if (!result.ok) throw new Error(`could not calculate ${medId}`);
  return { rule: medicationRules[medId], dose: result.dose, ...extra };
}

/** Narrows an optional to a value, failing the test if absent. */
function required<T>(value: T | undefined | null, label: string): T {
  assert.ok(value !== undefined && value !== null, `expected ${label}`);
  return value;
}

function timesOf(doses: ScheduledDose[]): string[] {
  return doses.map((d) => {
    const dt = new Date(d.scheduledDateTime);
    return `${String(dt.getHours()).padStart(2, "0")}:${String(
      dt.getMinutes(),
    ).padStart(2, "0")}`;
  });
}

test("parseScheduleTime accepts valid times and rejects malformed ones", () => {
  assert.equal(parseScheduleTime("06:00"), 360);
  assert.equal(parseScheduleTime("22:30"), 1350);
  assert.equal(parseScheduleTime("00:00"), 0);
  assert.equal(parseScheduleTime("23:59"), 1439);

  for (const bad of ["24:00", "6:0", "abc", "", "25:10", "12:60", "-1:00"]) {
    assert.equal(parseScheduleTime(bad), null, `${bad} should be rejected`);
  }
});

test("post-op day counts whole days, with surgery day as day 0", () => {
  const surgery = new Date(2026, 7, 10);
  assert.equal(getPostOpDay(surgery, new Date(2026, 7, 10)), 0);
  assert.equal(getPostOpDay(surgery, new Date(2026, 7, 11)), 1);
  assert.equal(getPostOpDay(surgery, new Date(2026, 7, 15)), 5);
  // A surgery date in the future clamps to 0 rather than going negative.
  assert.equal(getPostOpDay(new Date(2026, 7, 20), new Date(2026, 7, 10)), 0);
});

test("paracetamol generates all four QID doses for the day", () => {
  const doses = generateDayScheduleForMedication({
    input: inputFor("paracetamol"),
    date: DATE,
    postOpDay: 3,
  });

  assert.equal(doses.length, 4);
  assert.deepEqual(timesOf(doses), ["06:00", "12:00", "18:00", "22:00"]);
  assert.ok(doses.every((d) => d.doseMg === 300));
});

test("ibuprofen generates three TDS doses and celecoxib two BD doses", () => {
  const ibu = generateDayScheduleForMedication({
    input: inputFor("ibuprofen"),
    date: DATE,
    postOpDay: 3,
  });
  assert.equal(ibu.length, 3);
  assert.deepEqual(timesOf(ibu), ["08:00", "14:00", "20:00"]);

  const cel = generateDayScheduleForMedication({
    input: inputFor("celecoxib"),
    date: DATE,
    postOpDay: 3,
  });
  assert.equal(cel.length, 2);
  assert.deepEqual(timesOf(cel), ["08:00", "20:00"]);
});

test("oxycodone is never placed in the routine schedule", () => {
  for (let day = 0; day <= 14; day += 1) {
    const doses = generateDayScheduleForMedication({
      input: inputFor("oxycodone"),
      date: DATE,
      postOpDay: day,
    });
    assert.equal(doses.length, 0, `oxycodone scheduled on day ${day}`);
    assert.equal(isActiveOnDay(medicationRules.oxycodone, day), false);
  }
});

test("dexamethasone appears only on its default prescribed days", () => {
  const scheduled: number[] = [];
  for (let day = 0; day <= 14; day += 1) {
    const doses = generateDayScheduleForMedication({
      input: inputFor("dexamethasone"),
      date: DATE,
      postOpDay: day,
    });
    if (doses.length > 0) scheduled.push(day);
  }
  assert.deepEqual(scheduled, [3, 5, 7]);
});

test("dexamethasone honours the alternative day pattern when prescribed", () => {
  const scheduled: number[] = [];
  for (let day = 0; day <= 14; day += 1) {
    const doses = generateDayScheduleForMedication({
      input: inputFor("dexamethasone", { selectedDays: [4, 5, 6] }),
      date: DATE,
      postOpDay: day,
    });
    if (doses.length > 0) scheduled.push(day);
  }
  assert.deepEqual(scheduled, [4, 5, 6]);
});

test("regular medicines stop after their active day range ends", () => {
  const day15 = generateDayScheduleForMedication({
    input: inputFor("paracetamol"),
    date: DATE,
    postOpDay: 15,
  });
  assert.equal(day15.length, 0);

  const day14 = generateDayScheduleForMedication({
    input: inputFor("paracetamol"),
    date: DATE,
    postOpDay: 14,
  });
  assert.equal(day14.length, 4);
});

test("a combined schedule is ordered by time across medicines", () => {
  const schedule = generateDaySchedule({
    inputs: [inputFor("paracetamol"), inputFor("ibuprofen"), inputFor("celecoxib")],
    date: DATE,
    postOpDay: 3,
  });

  // 4 + 3 + 2 doses.
  assert.equal(schedule.length, 9);
  assert.deepEqual(timesOf(schedule), [
    "06:00", "08:00", "08:00", "12:00", "14:00", "18:00", "20:00", "20:00", "22:00",
  ]);
});

test("custom times override the protocol defaults", () => {
  const doses = generateDayScheduleForMedication({
    input: inputFor("paracetamol", { customTimes: ["07:00", "13:00", "19:00", "23:00"] }),
    date: DATE,
    postOpDay: 2,
  });
  assert.deepEqual(timesOf(doses), ["07:00", "13:00", "19:00", "23:00"]);
});

test("malformed custom times are skipped rather than guessed", () => {
  const doses = generateDayScheduleForMedication({
    input: inputFor("paracetamol", { customTimes: ["07:00", "nonsense", "19:00"] }),
    date: DATE,
    postOpDay: 2,
  });
  assert.deepEqual(timesOf(doses), ["07:00", "19:00"]);
});

test("mL carries into the schedule only when concentration was confirmed", () => {
  const withMl = calculateDose(medicationRules.paracetamol, WEIGHT_KG, {
    mgPerMl: 24,
    confirmed: true,
  });
  if (!withMl.ok) throw new Error("calc failed");

  const doses = generateDayScheduleForMedication({
    input: { rule: medicationRules.paracetamol, dose: withMl.dose },
    date: DATE,
    postOpDay: 1,
  });
  assert.ok(doses.every((d) => d.doseMl === 12.5));

  const withoutMl = generateDayScheduleForMedication({
    input: inputFor("paracetamol"),
    date: DATE,
    postOpDay: 1,
  });
  assert.ok(withoutMl.every((d) => d.doseMl === undefined));
});

test("dose status progresses upcoming -> due -> overdue with the clock", () => {
  const dose = required(
    generateDayScheduleForMedication({
      input: inputFor("paracetamol", { customTimes: ["12:00"] }),
      date: DATE,
      postOpDay: 1,
    })[0],
    "a scheduled dose",
  );
  const scheduledMs = Date.parse(dose.scheduledDateTime);
  const at = (minutes: number) => new Date(scheduledMs + minutes * 60 * 1000);

  assert.equal(resolveDoseStatus({ dose, log: [], now: at(-30) }), "upcoming");
  assert.equal(resolveDoseStatus({ dose, log: [], now: at(0) }), "due");
  assert.equal(resolveDoseStatus({ dose, log: [], now: at(45) }), "due");
  assert.equal(resolveDoseStatus({ dose, log: [], now: at(120) }), "overdue");
});

test("a logged outcome overrides any clock-derived status", () => {
  const dose = required(
    generateDayScheduleForMedication({
      input: inputFor("paracetamol", { customTimes: ["12:00"] }),
      date: DATE,
      postOpDay: 1,
    })[0],
    "a scheduled dose",
  );
  const scheduledMs = Date.parse(dose.scheduledDateTime);
  const wayLater = new Date(scheduledMs + 10 * 60 * 60 * 1000);

  const log: DoseLogEntry[] = [
    {
      id: "log-1",
      medicationId: "paracetamol",
      displayName: "Paracetamol / Panadol",
      scheduledDoseId: dose.id,
      actualDateTime: new Date(scheduledMs + 5 * 60 * 1000).toISOString(),
      doseMg: 300,
      status: "given",
      postOpDay: 1,
    },
  ];

  // Would otherwise be "overdue" ten hours on.
  assert.equal(resolveDoseStatus({ dose, log, now: wayLater }), "given");

  const applied = required(
    applyStatuses({ schedule: [dose], log, now: wayLater })[0],
    "an updated dose",
  );
  assert.equal(applied.status, "given");
  assert.ok(applied.actualGivenDateTime);
});

test("findNextDose prioritises overdue doses over merely upcoming ones", () => {
  const schedule = generateDaySchedule({
    inputs: [inputFor("paracetamol")],
    date: DATE,
    postOpDay: 1,
  });
  const noon = new Date(DATE.getFullYear(), DATE.getMonth(), DATE.getDate(), 13, 30);

  const withStatuses = applyStatuses({ schedule, log: [], now: noon });
  const next = required(findNextDose(withStatuses), "a next dose");

  // 06:00 and 12:00 are both past; 06:00 is overdue and comes first.
  assert.equal(timesOf([next])[0], "06:00");
  assert.equal(next.status, "overdue");
});

test("findNextDose skips doses already given or skipped", () => {
  const schedule = generateDaySchedule({
    inputs: [inputFor("paracetamol")],
    date: DATE,
    postOpDay: 1,
  });
  const early = new Date(DATE.getFullYear(), DATE.getMonth(), DATE.getDate(), 5, 0);

  const log: DoseLogEntry[] = [
    {
      id: "log-1",
      medicationId: "paracetamol",
      displayName: "Paracetamol / Panadol",
      scheduledDoseId: required(schedule[0], "first dose").id,
      actualDateTime: early.toISOString(),
      doseMg: 300,
      status: "given",
      postOpDay: 1,
    },
  ];

  const withStatuses = applyStatuses({ schedule, log, now: early });
  const next = required(findNextDose(withStatuses), "a next dose");
  assert.equal(timesOf([next])[0], "12:00");
});

test("findNextDose returns null when the day is fully actioned", () => {
  const schedule = generateDaySchedule({
    inputs: [inputFor("celecoxib")],
    date: DATE,
    postOpDay: 1,
  });
  const now = new Date(DATE.getFullYear(), DATE.getMonth(), DATE.getDate(), 21, 0);

  const log: DoseLogEntry[] = schedule.map((dose, index) => ({
    id: `log-${index}`,
    medicationId: "celecoxib",
    displayName: "Celecoxib",
    scheduledDoseId: dose.id,
    actualDateTime: dose.scheduledDateTime,
    doseMg: 80,
    status: "given" as const,
    postOpDay: 1,
  }));

  const withStatuses = applyStatuses({ schedule, log, now });
  assert.equal(findNextDose(withStatuses), null);
});

test("the generated schedule never exceeds a medicine's daily dose count", () => {
  for (const id of ["paracetamol", "ibuprofen", "celecoxib", "dexamethasone"] as const) {
    for (let day = 0; day <= 14; day += 1) {
      const doses = generateDayScheduleForMedication({
        input: inputFor(id),
        date: DATE,
        postOpDay: day,
      });
      assert.ok(
        doses.length <= medicationRules[id].maxDosesIn24Hours,
        `${id} scheduled ${doses.length} doses on day ${day}`,
      );
    }
  }
});
