import { describe, expect, it } from "vitest";
import { calcDose, doseLabel, parseWeight, roundDoseMg, weightLooksImplausible } from "./dose";
import { activeEvents, makeEvent, safetyCheck, slotRecord, type NewDoseEvent } from "./events";
import { RULE_VERSION } from "./rules";
import { dayStatuses, scheduleForDay, statusOf } from "./schedule";
import { daysSinceSurgery, fmt12, postOpDay } from "./time";

const H = 3_600_000;

function ev(p: Partial<NewDoseEvent> & Pick<NewDoseEvent, "at">): ReturnType<typeof makeEvent> {
  return makeEvent({
    type: "given",
    medId: "oxycodone",
    slotTime: null,
    slotDate: "2026-10-11",
    doseMg: 1.8,
    doseMl: 1.8,
    weightKg: 18.5,
    planVersion: 1,
    ...p,
  });
}

describe("parseWeight", () => {
  it("rejects missing, zero, negative and non-numeric weights", () => {
    for (const bad of ["", "0", "0.0", "-3", "abc", "18kg", null, undefined, "1e3"]) {
      expect(parseWeight(bad as string)).toBeNull();
    }
  });
  it("accepts decimals with dot or comma", () => {
    expect(parseWeight("18.5")).toBe(18.5);
    expect(parseWeight(" 18,5 ")).toBe(18.5);
  });
});

describe("calcDose", () => {
  it("never produces a dose without a weight", () => {
    expect(calcDose("paracetamol", null)).toBeNull();
    expect(calcDose("paracetamol", 0)).toBeNull();
    expect(doseLabel(null)).toBe("dose not set");
  });

  it("matches the prototype worked example (18.5 kg)", () => {
    const p = calcDose("paracetamol", 18.5, { form: "liquid", conc: 48 })!;
    expect(p.doseMg).toBe(277);
    expect(p.doseMl).toBe(5.7);
    const o = calcDose("oxycodone", 18.5, { form: "liquid", conc: 1 })!;
    expect(o.doseMg).toBe(1.8);
    expect(o.doseMl).toBe(1.8);
  });

  it("caps at the maximum single dose", () => {
    expect(calcDose("paracetamol", 90)!.doseMg).toBe(1000);
    expect(calcDose("ibuprofen", 60)!.doseMg).toBe(400);
    expect(calcDose("oxycodone", 70)!.doseMg).toBe(5);
  });

  it("rounds down — 1 decimal under 10 mg, whole mg at/above 10 mg", () => {
    expect(roundDoseMg(1.89)).toBe(1.8);
    expect(roundDoseMg(9.99)).toBe(9.9);
    expect(roundDoseMg(10.9)).toBe(10);
    expect(roundDoseMg(277.5)).toBe(277);
    expect(calcDose("dexamethasone", 23)!.doseMg).toBe(2.3);
  });

  it("only shows mL for a liquid with a confirmed concentration", () => {
    expect(calcDose("paracetamol", 20, { form: "liquid", conc: null })!.doseMl).toBeNull();
    expect(calcDose("paracetamol", 20, { form: "tablet", conc: 48 })!.doseMl).toBeNull();
    expect(doseLabel(calcDose("paracetamol", 20, { form: "liquid", conc: 24 }))).toBe("300 mg · 12.5 mL");
  });
});

describe("weightLooksImplausible", () => {
  it("flags out-of-range weights", () => {
    expect(weightLooksImplausible(5, null)).toBe(true);
    expect(weightLooksImplausible(120, null)).toBe(true);
    expect(weightLooksImplausible(18.5, 5)).toBe(false);
    expect(weightLooksImplausible(60, 3)).toBe(true);
  });
});

describe("time", () => {
  it("computes post-op day from local dates, clamped 0–14", () => {
    const now = new Date(2026, 9, 11, 13, 10);
    expect(postOpDay("2026-10-06", now)).toBe(5);
    expect(postOpDay("2026-10-11", now)).toBe(0);
    expect(postOpDay("2026-10-20", now)).toBe(0);
    expect(daysSinceSurgery("2026-09-01", now)).toBe(40);
    expect(postOpDay("2026-09-01", now)).toBe(14);
    expect(postOpDay(null, now)).toBe(0);
  });
  it("formats 12-hour times", () => {
    expect(fmt12("00:00")).toBe("12:00 am");
    expect(fmt12("12:00")).toBe("12:00 pm");
    expect(fmt12("18:05")).toBe("6:05 pm");
  });
});

describe("schedule", () => {
  const sel = { paracetamol: true, ibuprofen: true, dexamethasone: true, oxycodone: true };

  it("lists fixed-time doses, sorted, excluding PRN and off-days", () => {
    const d4 = scheduleForDay(sel, 4).map((d) => d.key);
    expect(d4).toEqual([
      "paracetamol-06:00",
      "ibuprofen-08:00",
      "paracetamol-12:00",
      "ibuprofen-14:00",
      "paracetamol-18:00",
      "ibuprofen-20:00",
      "paracetamol-22:00",
    ]);
    expect(scheduleForDay(sel, 5).some((d) => d.medId === "dexamethasone")).toBe(true);
  });

  it("is due 15 min before, overdue 30 min after", () => {
    const d = { key: "paracetamol-12:00", medId: "paracetamol" as const, time: "12:00" };
    expect(statusOf(d, null, 11 * 60 + 44)).toBe("upcoming");
    expect(statusOf(d, null, 11 * 60 + 45)).toBe("due");
    expect(statusOf(d, null, 12 * 60 + 29)).toBe("due");
    expect(statusOf(d, null, 12 * 60 + 30)).toBe("overdue");
  });

  it("derives slot status from the append-only log, honouring retractions", () => {
    const at = new Date(2026, 9, 11, 12, 5).getTime();
    const given = ev({ at, medId: "paracetamol", slotTime: "12:00" });
    const sched = scheduleForDay({ paracetamol: true }, 5);
    let rows = dayStatuses(sched, [given], "2026-10-11", 13 * 60);
    expect(rows.find((r) => r.time === "12:00")!.status).toBe("given");
    expect(rows.find((r) => r.time === "06:00")!.status).toBe("overdue");

    const undo = ev({ at: at + 1000, type: "retracted", medId: "paracetamol", slotTime: "12:00", retracts: given.id });
    rows = dayStatuses(sched, [given, undo], "2026-10-11", 13 * 60);
    expect(rows.find((r) => r.time === "12:00")!.status).toBe("overdue");
    expect(activeEvents([given, undo])).toHaveLength(0);

    // A different day's record does not leak across midnight.
    expect(slotRecord([given], "2026-10-12", "paracetamol", "12:00")).toBeNull();
  });

  it("stamps every event with the rule version", () => {
    expect(ev({ at: 1 }).ruleVersion).toBe(RULE_VERSION);
  });
});

describe("safetyCheck (PRN caps)", () => {
  const t0 = new Date(2026, 9, 11, 0, 0).getTime();

  it("blocks within the minimum interval", () => {
    const log = [ev({ at: t0 })];
    const c = safetyCheck(log, "oxycodone", t0 + 5 * H);
    expect(c.blocked).toBe("interval");
    expect(c.nextAllowedAt).toBe(t0 + 6 * H);
    expect(safetyCheck(log, "oxycodone", t0 + 6 * H).blocked).toBeNull();
  });

  it("blocks at the rolling 24-hour cap, across midnight", () => {
    const log = [0, 6, 12, 18].map((h) => ev({ at: t0 + h * H }));
    const c = safetyCheck(log, "oxycodone", t0 + 23 * H);
    expect(c.countIn24h).toBe(4);
    expect(c.blocked).toBe("cap");
    expect(c.nextAllowedAt).toBe(t0 + 24 * H);
    // Just after the first dose leaves the window, one slot frees up.
    expect(safetyCheck(log, "oxycodone", t0 + 24 * H + 1).blocked).toBeNull();
  });

  it("ignores retracted doses", () => {
    const g = ev({ at: t0 });
    const r = ev({ at: t0 + 1, type: "retracted", retracts: g.id });
    expect(safetyCheck([g, r], "oxycodone", t0 + H).blocked).toBeNull();
  });
});
