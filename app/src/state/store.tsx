import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { calcDose, canGive, parseWeight, type CalculatedDose, type FormChoice } from "../domain/dose";
import { makeEvent, safetyCheck, type DoseEvent, type SafetyCheck } from "../domain/events";
import { MED_ORDER, type MedId } from "../domain/rules";
import { daySchedule, selectedMeds, type DoseWithStatus, type ScheduledDose } from "../domain/schedule";
import { dateKey, daysSinceSurgery, minutesOfDay, painSlotOf, postOpDay, type PainSlot } from "../domain/time";
import { currentPermission, type Perm } from "./notifications";
import type { Modal, PainEntry, Persisted, Screen, Tab, Ui } from "./types";

export const STORE_KEY = "ptpal.state.v2";

const DEFAULT_FORMS: Record<MedId, FormChoice> = {
  paracetamol: { form: "liquid", conc: null },
  ibuprofen: { form: "liquid", conc: null },
  celecoxib: { form: "capsule", conc: null },
  dexamethasone: { form: "tablet", conc: null },
  oxycodone: { form: "liquid", conc: 1 },
};

export function defaultPersisted(): Persisted {
  return {
    v: 2,
    screen: "splash",
    tab: "home",
    disclaimerAck: false,
    nickname: "",
    age: "",
    weight: "",
    surgeryType: "tonsillectomy",
    surgeryDate: null,
    hospital: "JHH",
    selected: { paracetamol: true, ibuprofen: true, celecoxib: false, dexamethasone: false, oxycodone: false },
    forms: { ...DEFAULT_FORMS },
    planConfirmed: false,
    planVersion: 0,
    reminders: { due: true, notTicked: true, wake: true, pain: false },
    events: [],
    pain: [],
    grabGo: {},
  };
}

const DEFAULT_UI: Ui = {
  modal: null,
  timelineDay: null,
  faqQuery: "",
  faqCat: "All",
  faqOpen: null,
  openMed: null,
  emStage: "question",
  concerns: {},
  painDraft: null,
  painSlot: null,
  painNote: null,
  showPainLog: false,
};

export function loadPersisted(): Persisted {
  const base = defaultPersisted();
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return base;
    const saved = JSON.parse(raw) as Partial<Persisted>;
    if (saved.v !== 2) return base;
    const merged: Persisted = { ...base, ...saved, forms: { ...DEFAULT_FORMS, ...(saved.forms ?? {}) } };
    // Older builds stored pain as am/pm halves.
    merged.pain = (merged.pain ?? []).map((e) => {
      const old = e as PainEntry & { half?: "am" | "pm" };
      return old.slot ? e : { ...e, slot: old.half === "pm" ? "afternoon" : "morning" };
    });
    // Returning parent lands straight on Home at the current recovery day.
    if (merged.planConfirmed || merged.screen === "app") {
      merged.screen = "app";
      merged.tab = "home";
    }
    return merged;
  } catch {
    return base;
  }
}

function savePersisted(p: Persisted) {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(p));
  } catch {
    /* storage full or blocked — the app still works for this session */
  }
}

export interface Derived {
  now: number;
  today: string;
  nowMin: number;
  weightKg: number | null;
  hasWeight: boolean;
  day: number;
  rawDays: number;
  childName: string;
  selectedIds: MedId[];
  doses: Record<MedId, CalculatedDose | null>;
  todays: DoseWithStatus[];
  oxyInPlan: boolean;
  oxySafety: SafetyCheck;
  painSlotNow: PainSlot;
  /** Today's saved pain check-ins by slot. */
  painToday: Partial<Record<PainSlot, PainEntry>>;
}

interface Ctx {
  p: Persisted;
  ui: Ui;
  d: Derived;
  notifyPerm: Perm;
  setNotifyPerm: (p: Perm) => void;
  set: (patch: Partial<Persisted> | ((p: Persisted) => Partial<Persisted>)) => void;
  setUi: (patch: Partial<Ui> | ((u: Ui) => Partial<Ui>)) => void;
  go: (screen: Screen) => void;
  goTab: (tab: Tab) => void;
  openModal: (m: Modal) => void;
  closeModal: () => void;
  recordScheduled: (dose: ScheduledDose, type: "given" | "skipped") => void;
  retract: (event: DoseEvent) => void;
  recordOxy: () => void;
  savePain: (score: number, slot: PainSlot, note: string) => void;
  resetAll: () => void;
}

const AppCtx = createContext<Ctx | null>(null);

export function AppProvider({ children, initial }: { children: ReactNode; initial?: Persisted }) {
  const [p, setP] = useState<Persisted>(() => initial ?? loadPersisted());
  const [ui, setUiState] = useState<Ui>(DEFAULT_UI);
  const [now, setNow] = useState(() => Date.now());
  const [notifyPerm, setNotifyPerm] = useState<Perm>(currentPermission);

  useEffect(() => savePersisted(p), [p]);

  // Real clock: recompute "now" every 30s and whenever the app comes back to the foreground.
  useEffect(() => {
    const tick = () => setNow(Date.now());
    const id = window.setInterval(tick, 30_000);
    const onVis = () => document.visibilityState === "visible" && tick();
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  const set = useCallback<Ctx["set"]>((patch) => {
    setP((prev) => ({ ...prev, ...(typeof patch === "function" ? patch(prev) : patch) }));
  }, []);
  const setUi = useCallback<Ctx["setUi"]>((patch) => {
    setUiState((prev) => ({ ...prev, ...(typeof patch === "function" ? patch(prev) : patch) }));
  }, []);

  const d = useMemo<Derived>(() => {
    const weightKg = parseWeight(p.weight);
    const today = dateKey(now);
    const day = postOpDay(p.surgeryDate, now);
    const ids = selectedMeds(p.selected);
    const doses = Object.fromEntries(MED_ORDER.map((id) => [id, calcDose(id, weightKg, p.forms[id])])) as Record<
      MedId,
      CalculatedDose | null
    >;
    const nowMin = minutesOfDay(now);
    return {
      now,
      today,
      nowMin,
      weightKg,
      hasWeight: weightKg !== null,
      day,
      rawDays: daysSinceSurgery(p.surgeryDate, now),
      childName: p.nickname.trim() || "your child",
      selectedIds: ids,
      doses,
      todays: daySchedule(p.selected, day, p.events, today, nowMin),
      oxyInPlan: ids.includes("oxycodone"),
      oxySafety: safetyCheck(p.events, "oxycodone", now),
      painSlotNow: painSlotOf(now),
      painToday: Object.fromEntries(p.pain.filter((e) => e.date === today).map((e) => [e.slot, e])),
    };
  }, [p, now]);

  const go = useCallback((screen: Screen) => {
    setP((prev) => ({ ...prev, screen }));
    setUiState((u) => ({ ...u, modal: null }));
  }, []);

  const goTab = useCallback((tab: Tab) => {
    setP((prev) => ({ ...prev, screen: "app", tab }));
    setUiState((u) => ({
      ...u,
      modal: null,
      faqOpen: null,
      timelineDay: tab === "timeline" ? null : u.timelineDay,
      emStage: tab === "emergency" ? "question" : u.emStage,
    }));
  }, []);

  const openModal = useCallback((m: Modal) => setUiState((u) => ({ ...u, modal: m })), []);
  const closeModal = useCallback(() => setUiState((u) => ({ ...u, modal: null })), []);

  const recordScheduled = useCallback<Ctx["recordScheduled"]>(
    (dose, type) => {
      const at = Date.now();
      const calc = d.doses[dose.medId];
      if (type === "given" && !canGive(calc)) return;
      const e = makeEvent({
        type,
        medId: dose.medId,
        slotTime: dose.time,
        slotIndex: dose.slot,
        slotDate: dateKey(at),
        at,
        doseMg: type === "given" ? (calc?.doseMg ?? null) : null,
        doseMl: type === "given" ? (calc?.doseMl ?? null) : null,
        weightKg: d.weightKg,
        planVersion: p.planVersion,
      });
      setP((prev) => ({ ...prev, events: [...prev.events, e] }));
      setNow(at);
    },
    [d.doses, d.weightKg, p.planVersion],
  );

  const retract = useCallback<Ctx["retract"]>(
    (target) => {
      const at = Date.now();
      const e = makeEvent({
        type: "retracted",
        medId: target.medId,
        slotTime: target.slotTime,
        slotIndex: target.slotIndex,
        slotDate: target.slotDate,
        at,
        doseMg: null,
        doseMl: null,
        weightKg: d.weightKg,
        planVersion: p.planVersion,
        retracts: target.id,
      });
      setP((prev) => ({ ...prev, events: [...prev.events, e] }));
    },
    [d.weightKg, p.planVersion],
  );

  const recordOxy = useCallback(() => {
    const at = Date.now();
    // Re-check at the moment of recording, not just when the modal opened.
    if (safetyCheck(p.events, "oxycodone", at).blocked || !canGive(d.doses.oxycodone)) {
      setNow(at);
      setUiState((u) => ({ ...u, modal: { kind: "oxyBlocked" } }));
      return;
    }
    const calc = d.doses.oxycodone;
    const e = makeEvent({
      type: "given",
      medId: "oxycodone",
      slotTime: null,
      slotDate: dateKey(at),
      at,
      doseMg: calc.doseMg,
      doseMl: calc.doseMl,
      weightKg: d.weightKg,
      planVersion: p.planVersion,
    });
    setP((prev) => ({ ...prev, events: [...prev.events, e] }));
    setNow(at);
    setUiState((u) => ({ ...u, modal: null }));
  }, [p.events, p.planVersion, d.doses.oxycodone, d.weightKg]);

  const savePain = useCallback((score: number, slot: PainSlot, note: string) => {
    const at = Date.now();
    const entry: PainEntry = { date: dateKey(at), slot, score, at, ...(note.trim() ? { note: note.trim() } : {}) };
    setP((prev) => ({
      ...prev,
      pain: [...prev.pain.filter((x) => !(x.date === entry.date && x.slot === entry.slot)), entry],
    }));
    setUiState((u) => ({ ...u, painDraft: null, painNote: null }));
  }, []);

  const resetAll = useCallback(() => {
    try {
      localStorage.removeItem(STORE_KEY);
    } catch {
      /* ignore */
    }
    setP(defaultPersisted());
    setUiState(DEFAULT_UI);
  }, []);

  const value: Ctx = {
    p,
    ui,
    d,
    notifyPerm,
    setNotifyPerm,
    set,
    setUi,
    go,
    goTab,
    openModal,
    closeModal,
    recordScheduled,
    retract,
    recordOxy,
    savePain,
    resetAll,
  };
  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>;
}

export function useApp(): Ctx {
  const c = useContext(AppCtx);
  if (!c) throw new Error("useApp outside AppProvider");
  return c;
}
