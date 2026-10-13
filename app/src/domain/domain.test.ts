import { describe, expect, it } from "vitest";
import { calcDose, canGive, doseLabel, parseWeight, roundDoseMg, weightLooksImplausible } from "./dose";
import { activeEvents, makeEvent, safetyCheck, type NewDoseEvent } from "./events";
import { RULE_VERSION } from "./rules";
import { daySchedule, statusOf } from "./schedule";
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

describe("tablets and capsules", () => {
  const tab = { form: "tablet" as const, conc: null };
  it("rounds paracetamol down to whole 500 mg tablets", () => {
    expect(calcDose("paracetamol", 40, tab)).toMatchObject({ doseMg: 500, units: 1, tooStrong: false }); // 600 mg → 1 tablet
    expect(calcDose("paracetamol", 70, tab)).toMatchObject({ doseMg: 1000, units: 2 }); // capped 1000 → 2 tablets
    expect(doseLabel(calcDose("paracetamol", 70, tab))).toBe("1000 mg · 2 tablets");
  });
  it("rounds ibuprofen down to whole 200 mg tablets", () => {
    expect(calcDose("ibuprofen", 25, tab)).toMatchObject({ doseMg: 200, units: 1 }); // 250 → 200
    expect(calcDose("ibuprofen", 45, tab)).toMatchObject({ doseMg: 400, units: 2 }); // capped 400
  });
  it("never goes above the weight-based dose; flags tablets that are too strong", () => {
    const small = calcDose("paracetamol", 18.5, tab)!; // 277 mg < one 500 mg tablet
    expect(small.tooStrong).toBe(true);
    expect(canGive(small)).toBe(false);
    expect(doseLabel(small)).toBe("500 mg tablets are too strong — use the liquid");
    expect(canGive(calcDose("paracetamol", 18.5, { form: "liquid", conc: 48 }))).toBe(true);
  });
  it("labels capsules as capsules", () => {
    expect(doseLabel(calcDose("celecoxib", 30, { form: "capsule", conc: null }))).toBe("100 mg · 1 capsule"); // 120 → 100
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
  const DAY = "2026-10-11";
  const at = (h: number, m = 0, day = 11) => new Date(2026, 9, day, h, m).getTime();
  const times = (rows: { medId: string; time: string }[], med: string) => rows.filter((r) => r.medId === med).map((r) => r.time);
  const given = (medId: "paracetamol" | "ibuprofen", slot: number, ms: number, slotDate = DAY) =>
    ev({ at: ms, medId, slotIndex: slot, slotTime: null, slotDate });

  it("starts from default first times when nothing has been given, excluding PRN and off-days", () => {
    const rows = daySchedule(sel, 4, [], DAY, 0);
    expect(times(rows, "paracetamol")).toEqual(["06:00", "12:00", "18:00"]);
    expect(times(rows, "ibuprofen")).toEqual(["08:00", "16:00"]);
    expect(rows.some((r) => r.medId === "oxycodone" || r.medId === "dexamethasone")).toBe(false);
    expect(daySchedule(sel, 5, [], DAY, 0).some((r) => r.medId === "dexamethasone")).toBe(true);
  });

  it("works each next dose out from when the previous one was actually given", () => {
    // Paracetamol first given at 8:00 → next 2:00 pm → 8:00 pm (6-hourly).
    let rows = daySchedule(sel, 4, [given("paracetamol", 0, at(8))], DAY, 9 * 60);
    expect(times(rows, "paracetamol")).toEqual(["06:00", "14:00", "20:00"]);
    expect(rows.find((r) => r.key === "paracetamol-0")!.status).toBe("given");

    // Second dose given late at 3:10 pm → third moves to 9:10 pm.
    rows = daySchedule(sel, 4, [given("paracetamol", 0, at(8)), given("paracetamol", 1, at(15, 10))], DAY, 16 * 60);
    expect(times(rows, "paracetamol")).toEqual(["06:00", "14:00", "21:10"]);

    // Ibuprofen first given at 9:00 → 5:00 pm (8-hourly); the next would be 1 am tomorrow.
    rows = daySchedule(sel, 4, [given("ibuprofen", 0, at(9))], DAY, 10 * 60);
    expect(times(rows, "ibuprofen")).toEqual(["08:00", "17:00"]);
  });

  it("carries on overnight: today's first dose follows yesterday's last dose", () => {
    const last = given("paracetamol", 2, at(20, 0, 10), "2026-10-10");
    const rows = daySchedule(sel, 4, [last], DAY, 0);
    expect(times(rows, "paracetamol")).toEqual(["02:00", "08:00", "14:00", "20:00"]);
  });

  it("is due 15 min before, overdue 30 min after", () => {
    const d = { key: "paracetamol-1", medId: "paracetamol" as const, slot: 1, time: "12:00" };
    expect(statusOf(d, null, 11 * 60 + 44)).toBe("upcoming");
    expect(statusOf(d, null, 11 * 60 + 45)).toBe("due");
    expect(statusOf(d, null, 12 * 60 + 29)).toBe("due");
    expect(statusOf(d, null, 12 * 60 + 30)).toBe("overdue");
  });

  it("honours retractions and keeps days separate", () => {
    const g = given("paracetamol", 0, at(8));
    const undo = ev({ at: at(8, 1), type: "retracted", medId: "paracetamol", slotIndex: 0, slotTime: null, slotDate: DAY, retracts: g.id });
    const rows = daySchedule({ paracetamol: true }, 4, [g, undo], DAY, 9 * 60);
    expect(rows[0].status).toBe("overdue");
    expect(times(rows, "paracetamol")).toEqual(["06:00", "12:00", "18:00"]);
    expect(activeEvents([g, undo])).toHaveLength(0);
    expect(daySchedule({ paracetamol: true }, 4, [g], "2026-10-12", 0)[0].status).toBe("upcoming");
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
