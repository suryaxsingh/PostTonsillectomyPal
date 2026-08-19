/**
 * MEDICATION PLAN
 * ===============
 *
 * A plan is an immutable snapshot of what was calculated, from which weight,
 * under which rule version, and confirmed by the parent at which moment.
 *
 * WHY PLANS ARE VERSIONED RATHER THAN EDITED
 * ------------------------------------------
 * UX.md Screen 18: "Previous dose logs should remain stored but tagged to old
 * medication plan version." A dose given last Tuesday was given at last
 * Tuesday's dose, and editing the plan in place would silently rewrite history
 * — the log would claim a dose that was never given. So changing weight or
 * medicines supersedes the old plan and creates a new one; the old plan stays
 * readable so historical entries still resolve.
 *
 * Every plan records `ruleVersion` and `weightKgAtCalculation`, which together
 * with the dose log make each administered dose reconstructable after the fact
 * (UX.md "Developer Notes"). This is the audit trail.
 *
 * A plan is not usable until `parentConfirmed` is true. Both specs require the
 * parent to attest the plan matches their discharge paperwork before it drives
 * any schedule (PRD Step 4, Build Prompt 6.10).
 */

import type { CalculatedDose } from "../clinical/types.ts";
import {
  isFiniteNumber,
  isIsoDateString,
  isNonEmptyString,
  isObject,
  storageKey,
  TypedStore,
  type StorageBackend,
  type WriteResult,
} from "./storage.ts";

/** The exact attestation the parent ticks. Required copy; do not reword. */
export const PLAN_CONFIRMATION_TEXT =
  "I confirm these medicines were prescribed for my child and this plan " +
  "matches my discharge instructions.";

export type MedicationPlan = {
  id: string;
  childId: string;

  /** Weight the doses were calculated from, frozen at calculation time. */
  weightKgAtCalculation: number;
  /** Rules version in force at calculation time. */
  ruleVersion: string;

  selectedMedicationIds: string[];
  calculatedMedications: CalculatedDose[];

  /** Per-medicine chosen days, for selected_days medicines like dexamethasone. */
  selectedPostOpDays?: Record<string, number[]>;
  /** Per-medicine schedule time overrides, when the parent adjusted them. */
  customScheduleTimes?: Record<string, string[]>;

  parentConfirmed: boolean;
  /** When the parent ticked the attestation. Absent until confirmed. */
  parentConfirmedAt?: string;

  createdAt: string;
  /** Set when a newer plan replaces this one. Absent on the active plan. */
  supersededAt?: string;
};

const KEY = storageKey("medicationPlans");

function validateCalculatedDose(value: unknown): CalculatedDose | null {
  if (!isObject(value)) return null;
  if (!isNonEmptyString(value.medicationId)) return null;
  if (!isNonEmptyString(value.displayName)) return null;
  // A non-finite or negative dose must never round-trip out of storage.
  if (!isFiniteNumber(value.doseMg) || value.doseMg < 0) return null;
  if (!isFiniteNumber(value.maxSingleDoseMg)) return null;
  if (!isFiniteNumber(value.maxDailyDoseMg)) return null;
  if (!isFiniteNumber(value.maxDosesIn24Hours)) return null;
  if (!isFiniteNumber(value.minIntervalHours)) return null;
  if (!isNonEmptyString(value.ruleVersion)) return null;
  if (!isFiniteNumber(value.weightKgAtCalculation)) return null;
  if (!Array.isArray(value.safetyWarnings)) return null;

  // A stored dose above its own cap indicates corruption; reject rather than
  // let it reach a parent.
  if (value.doseMg > value.maxSingleDoseMg) return null;

  // doseMl is optional, but if present must be usable.
  if (value.doseMl !== undefined) {
    if (!isFiniteNumber(value.doseMl) || value.doseMl <= 0) return null;
  }

  return value as unknown as CalculatedDose;
}

export function validateMedicationPlan(value: unknown): MedicationPlan | null {
  if (!isObject(value)) return null;
  if (!isNonEmptyString(value.id)) return null;
  if (!isNonEmptyString(value.childId)) return null;
  if (!isFiniteNumber(value.weightKgAtCalculation) || value.weightKgAtCalculation <= 0) {
    return null;
  }
  if (!isNonEmptyString(value.ruleVersion)) return null;
  if (!Array.isArray(value.selectedMedicationIds)) return null;
  if (!value.selectedMedicationIds.every(isNonEmptyString)) return null;
  if (!Array.isArray(value.calculatedMedications)) return null;
  if (typeof value.parentConfirmed !== "boolean") return null;
  if (!isIsoDateString(value.createdAt)) return null;

  const medications: CalculatedDose[] = [];
  for (const entry of value.calculatedMedications) {
    const dose = validateCalculatedDose(entry);
    // One bad medication invalidates the plan. A partial plan could omit a
    // prescribed medicine without the parent noticing it had gone.
    if (!dose) return null;
    medications.push(dose);
  }

  return { ...(value as unknown as MedicationPlan), calculatedMedications: medications };
}

function validatePlanList(value: unknown): MedicationPlan[] | null {
  if (!Array.isArray(value)) return null;
  const plans: MedicationPlan[] = [];
  for (const entry of value) {
    const plan = validateMedicationPlan(entry);
    // Skip individual corrupt plans rather than losing the whole history:
    // an unreadable superseded plan should not destroy the active one.
    if (plan) plans.push(plan);
  }
  return plans;
}

export class MedicationPlanStore {
  private store: TypedStore<MedicationPlan[]>;

  constructor(backend: StorageBackend) {
    this.store = new TypedStore(backend, KEY, validatePlanList);
  }

  /** Every plan, newest first. Includes superseded plans. */
  async all(): Promise<MedicationPlan[]> {
    const plans = (await this.store.read()) ?? [];
    return [...plans].sort(
      (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt),
    );
  }

  /**
   * The plan currently driving the schedule: not superseded, and confirmed.
   * An unconfirmed plan is deliberately not active.
   */
  async active(): Promise<MedicationPlan | null> {
    const plans = await this.all();
    return (
      plans.find((plan) => plan.supersededAt === undefined && plan.parentConfirmed) ??
      null
    );
  }

  /** The newest plan regardless of confirmation, for the review screen. */
  async latest(): Promise<MedicationPlan | null> {
    const plans = await this.all();
    return plans.find((plan) => plan.supersededAt === undefined) ?? null;
  }

  async byId(planId: string): Promise<MedicationPlan | null> {
    const plans = await this.all();
    return plans.find((plan) => plan.id === planId) ?? null;
  }

  /**
   * Store a new plan, superseding any existing un-superseded ones.
   * The new plan arrives unconfirmed; call confirm() once the parent attests.
   */
  async addPlan(
    plan: MedicationPlan,
    now: Date = new Date(),
  ): Promise<WriteResult> {
    const validated = validateMedicationPlan(plan);
    if (!validated) {
      return { ok: false, error: "plan failed validation" };
    }

    const existing = await this.all();
    const timestamp = now.toISOString();

    const superseded = existing.map((old) =>
      old.supersededAt === undefined && old.id !== validated.id
        ? { ...old, supersededAt: timestamp }
        : old,
    );

    return this.store.write([validated, ...superseded.filter((p) => p.id !== validated.id)]);
  }

  /** Record the parent's attestation against a specific plan. */
  async confirm(planId: string, now: Date = new Date()): Promise<WriteResult> {
    const plans = await this.all();
    const target = plans.find((plan) => plan.id === planId);
    if (!target) {
      return { ok: false, error: `no plan with id ${planId}` };
    }
    if (target.supersededAt !== undefined) {
      return { ok: false, error: "cannot confirm a superseded plan" };
    }

    const updated = plans.map((plan) =>
      plan.id === planId
        ? { ...plan, parentConfirmed: true, parentConfirmedAt: now.toISOString() }
        : plan,
    );

    return this.store.write(updated);
  }

  async clear(): Promise<WriteResult> {
    return this.store.clear();
  }
}

export function createMedicationPlan(params: {
  id: string;
  childId: string;
  weightKgAtCalculation: number;
  ruleVersion: string;
  selectedMedicationIds: string[];
  calculatedMedications: CalculatedDose[];
  selectedPostOpDays?: Record<string, number[]>;
  customScheduleTimes?: Record<string, string[]>;
  now?: Date;
}): MedicationPlan {
  const plan: MedicationPlan = {
    id: params.id,
    childId: params.childId,
    weightKgAtCalculation: params.weightKgAtCalculation,
    ruleVersion: params.ruleVersion,
    selectedMedicationIds: params.selectedMedicationIds,
    calculatedMedications: params.calculatedMedications,
    parentConfirmed: false,
    createdAt: (params.now ?? new Date()).toISOString(),
  };
  if (params.selectedPostOpDays) plan.selectedPostOpDays = params.selectedPostOpDays;
  if (params.customScheduleTimes) plan.customScheduleTimes = params.customScheduleTimes;
  return plan;
}

/**
 * True when the stored plan no longer reflects the profile it was built from,
 * meaning it must be recalculated and re-confirmed before further use.
 */
export function planIsStale(
  plan: MedicationPlan | null,
  currentWeightKg: number,
  currentRuleVersion: string,
): boolean {
  if (!plan) return true;
  if (plan.weightKgAtCalculation !== currentWeightKg) return true;
  if (plan.ruleVersion !== currentRuleVersion) return true;
  return false;
}
