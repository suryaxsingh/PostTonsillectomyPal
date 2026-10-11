import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "./App";
import { dateKey } from "./domain/time";
import { AppProvider, defaultPersisted, STORE_KEY } from "./state/store";
import type { Persisted } from "./state/types";

function setup(patch: Partial<Persisted>) {
  const initial = { ...defaultPersisted(), ...patch };
  return render(
    <AppProvider initial={initial}>
      <App />
    </AppProvider>,
  );
}

const daysAgo = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return dateKey(d);
};

const confirmedApp: Partial<Persisted> = {
  screen: "app",
  tab: "home",
  disclaimerAck: true,
  nickname: "Sam",
  age: "5",
  weight: "18.5",
  surgeryDate: daysAgo(5),
  selected: { paracetamol: true, ibuprofen: true, oxycodone: true },
  forms: {
    paracetamol: { form: "liquid", conc: 48 },
    ibuprofen: { form: "liquid", conc: 20 },
    celecoxib: { form: "capsule", conc: null },
    dexamethasone: { form: "tablet", conc: null },
    oxycodone: { form: "liquid", conc: 1 },
  },
  planConfirmed: true,
  planVersion: 1,
};

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 9, 11, 13, 10));
  localStorage.clear();
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("Home", () => {
  it("shows the recovery day and weight-based doses", () => {
    setup(confirmedApp);
    expect(screen.getByText("Day 5")).toBeTruthy();
    expect(screen.getAllByText("277 mg · 5.7 mL").length).toBeGreaterThan(0);
    expect(screen.getByText("1.8 mg")).toBeTruthy();
  });

  it("never records a dose in one tap — a confirm sheet restates the dose first", () => {
    setup(confirmedApp);
    const row = screen.getByRole("button", { name: /12:00 pm Paracetamol/ });
    fireEvent.click(row);
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText("Mark as given?")).toBeTruthy();
    expect(within(dialog).getByText("Sam")).toBeTruthy();
    expect(within(dialog).getByText("277 mg · 5.7 mL")).toBeTruthy();
    expect(row.className).toContain("overdue");

    fireEvent.click(within(dialog).getByRole("button", { name: "Yes, given now" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByRole("button", { name: /12:00 pm Paracetamol/ }).className).toContain("given");

    const saved = JSON.parse(localStorage.getItem(STORE_KEY)!) as Persisted;
    expect(saved.events).toHaveLength(1);
    expect(saved.events[0]).toMatchObject({ type: "given", medId: "paracetamol", doseMg: 277, ruleVersion: "LOCAL-TONSIL-v1.0", planVersion: 1 });
  });

  it("undoing a dose appends a retraction rather than deleting the record", () => {
    setup(confirmedApp);
    fireEvent.click(screen.getByRole("button", { name: /12:00 pm Paracetamol/ }));
    fireEvent.click(screen.getByRole("button", { name: "Yes, given now" }));
    fireEvent.click(screen.getByRole("button", { name: /12:00 pm Paracetamol/ }));
    fireEvent.click(screen.getByRole("button", { name: "Mark as not given" }));
    const saved = JSON.parse(localStorage.getItem(STORE_KEY)!) as Persisted;
    expect(saved.events.map((e) => e.type)).toEqual(["given", "retracted"]);
    expect(screen.getByRole("button", { name: /12:00 pm Paracetamol/ }).className).toContain("overdue");
  });

  it("blocks oxycodone inside the minimum interval", () => {
    setup(confirmedApp);
    fireEvent.click(screen.getByRole("button", { name: "Give a dose now" }));
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Yes, given now" }));
    expect(screen.getByText("1 of 4 doses recorded in the last 24 hours")).toBeTruthy();

    act(() => vi.setSystemTime(new Date(2026, 9, 11, 15, 0)));
    fireEvent.click(screen.getByRole("button", { name: "Give a dose now" }));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText("Do not give another dose")).toBeTruthy();
    expect(within(dialog).queryByRole("button", { name: "Yes, given now" })).toBeNull();
  });
});

describe("zero-weight gating", () => {
  it("renders no numeric dose anywhere without a weight", () => {
    const { container } = setup({ ...confirmedApp, weight: "" });
    expect(container.textContent).not.toMatch(/\d+(\.\d+)? mg/);
    expect(screen.queryByRole("button", { name: "Mark as given" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Give a dose now" })).toBeNull();

    fireEvent.click(screen.getAllByRole("button", { name: /Paracetamol/ })[0]);
    expect(within(screen.getByRole("dialog")).getByText("Dose not calculated")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Yes, given now" })).toBeNull();
  });

  it("blocks plan review without a weight", () => {
    const { container } = setup({ ...confirmedApp, screen: "plan", planConfirmed: false, weight: "0" });
    expect(container.textContent).not.toMatch(/\d+(\.\d+)? mg ?$/m);
    expect(screen.getAllByText("Dose needs a weight").length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole("checkbox", { name: /I confirm/ }));
    fireEvent.click(screen.getByRole("button", { name: "Use this medicine plan" }));
    expect(within(screen.getByRole("dialog")).getByText("Dose not calculated")).toBeTruthy();
  });
});

describe("plan invalidation", () => {
  it("changing the weight clears the confirmed plan", () => {
    setup(confirmedApp);
    fireEvent.click(screen.getByRole("button", { name: "MEDICINES" }));
    fireEvent.click(screen.getByRole("button", { name: "Edit child weight" }));
    fireEvent.click(screen.getByRole("button", { name: "Continue and recalculate" }));
    fireEvent.change(screen.getByLabelText("Weight (kg)"), { target: { value: "20" } });
    const saved = JSON.parse(localStorage.getItem(STORE_KEY)!) as Persisted;
    expect(saved.planConfirmed).toBe(false);
    expect(saved.screen).toBe("childSetup");
  });
});
