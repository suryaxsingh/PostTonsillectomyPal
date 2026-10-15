import type { FormChoice } from "../domain/dose";
import type { DoseEvent } from "../domain/events";
import type { MedId } from "../domain/rules";
import type { ScheduledDose } from "../domain/schedule";
import type { PainSlot } from "../domain/time";

export type Screen =
  | "splash"
  | "welcome"
  | "disclaimer"
  | "emergencyWarning"
  | "childSetup"
  | "weightConfirm"
  | "surgery"
  | "medSelect"
  | "weightRetype"
  | "plan"
  | "reminders"
  | "app";

export const ONBOARDING: Screen[] = [
  "welcome",
  "disclaimer",
  "emergencyWarning",
  "childSetup",
  "weightConfirm",
  "surgery",
  "medSelect",
  "weightRetype",
  "plan",
  "reminders",
];

export type Tab = "home" | "timeline" | "medicines" | "questions" | "emergency" | "settings";
export type EmStage = "question" | "concerns" | "call" | "grabgo";

export interface Reminders {
  due: boolean;
  notTicked: boolean;
  wake: boolean;
  pain: boolean;
}

export interface PainEntry {
  date: string;
  slot: PainSlot;
  score: number;
  at: number;
  /** Optional private note. */
  note?: string;
}

/** Everything that survives a reload. */
export interface Persisted {
  v: 2;
  screen: Screen;
  tab: Tab;
  disclaimerAck: boolean;
  nickname: string;
  age: string;
  weight: string;
  surgeryType: string;
  surgeryDate: string | null;
  hospital: string;
  selected: Partial<Record<MedId, boolean>>;
  forms: Record<MedId, FormChoice>;
  planConfirmed: boolean;
  /** Increments every time a (re)confirmed plan is committed; recorded on dose events. */
  planVersion: number;
  reminders: Reminders;
  events: DoseEvent[];
  pain: PainEntry[];
  grabGo: Record<string, boolean>;
}

export type Modal =
  | { kind: "confirm"; dose: ScheduledDose }
  | { kind: "already"; dose: ScheduledDose }
  | { kind: "skipped" }
  | { kind: "oxy" }
  | { kind: "oxyBlocked" }
  | { kind: "weight" }
  | { kind: "checkWeight" }
  | { kind: "needWeight" }
  | { kind: "notSure" }
  | { kind: "reset" }
  | { kind: "editMeds" };

/** Session-only UI state. */
export interface Ui {
  modal: Modal | null;
  timelineDay: number | null;
  faqQuery: string;
  faqCat: string;
  faqOpen: number | null;
  openMed: MedId | null;
  emStage: EmStage;
  concerns: Record<string, boolean>;
  /** Face picked but not yet saved. */
  painDraft: number | null;
  /** Slot the parent tapped; null = the current time-of-day slot. */
  painSlot: PainSlot | null;
  /** Unsaved note text; null = use the saved note for the slot. */
  painNote: string | null;
  showPainLog: boolean;
  /** Second, independent entry of the weight (never pre-filled). */
  weightRetype: string;
}
