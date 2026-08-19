/**
 * CHILD PROFILE
 * =============
 *
 * Shape per PRD.md section 6 and Master Build Prompt section 10.
 *
 * `weightConfirmed` is a safety gate, not a UI convenience. The specs are
 * explicit that the weight confirmation screen must not be skipped
 * (UX.md Screen 6, "Safety Requirement: Do not skip this screen in MVP") and
 * that no medication plan may be created from an unconfirmed weight
 * (Build Prompt 6.6). `canCalculateDoses()` below is the single check that
 * enforces this, so no screen has to remember to.
 *
 * Changing the weight clears the confirmation. That is deliberate: a new
 * weight is an unconfirmed weight until the parent says otherwise, and it
 * forces the plan to be recalculated and re-confirmed (UX.md 6.1).
 */

import {
  isFiniteNumber,
  isIsoDateString,
  isNonEmptyString,
  isObject,
  isOneOf,
  storageKey,
  TypedStore,
  type StorageBackend,
  type WriteResult,
} from "./storage.ts";

export const SURGERY_TYPES = [
  "tonsillectomy",
  "adenotonsillectomy",
  "not_sure",
] as const;
export type SurgeryType = (typeof SURGERY_TYPES)[number];

export const HOSPITALS = ["JHH", "Tamworth", "Other"] as const;
export type Hospital = (typeof HOSPITALS)[number];

export type ChildProfile = {
  id: string;
  /** Optional but encouraged. Used only for friendly display. */
  nickname?: string;
  ageYears: number;
  weightKg: number;
  /** True only after the parent passed the weight confirmation screen. */
  weightConfirmed: boolean;
  /** ISO date (YYYY-MM-DD or full ISO). Drives the post-op day. */
  surgeryDate: string;
  surgeryType: SurgeryType;
  hospital: Hospital;
  createdAt: string;
  updatedAt: string;
};

const KEY = storageKey("childProfile");

export function validateChildProfile(value: unknown): ChildProfile | null {
  if (!isObject(value)) return null;

  if (!isNonEmptyString(value.id)) return null;
  if (!isFiniteNumber(value.ageYears) || value.ageYears < 0) return null;
  // A non-positive weight must never survive a read: it would flow into
  // weightKg x mgPerKg and produce a zero or negative dose.
  if (!isFiniteNumber(value.weightKg) || value.weightKg <= 0) return null;
  if (typeof value.weightConfirmed !== "boolean") return null;
  if (!isIsoDateString(value.surgeryDate)) return null;
  if (!isOneOf(value.surgeryType, SURGERY_TYPES)) return null;
  if (!isOneOf(value.hospital, HOSPITALS)) return null;
  if (!isIsoDateString(value.createdAt)) return null;
  if (!isIsoDateString(value.updatedAt)) return null;
  if (value.nickname !== undefined && typeof value.nickname !== "string") {
    return null;
  }

  const profile: ChildProfile = {
    id: value.id,
    ageYears: value.ageYears,
    weightKg: value.weightKg,
    weightConfirmed: value.weightConfirmed,
    surgeryDate: value.surgeryDate,
    surgeryType: value.surgeryType,
    hospital: value.hospital,
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
  };
  if (value.nickname !== undefined) profile.nickname = value.nickname;
  return profile;
}

export class ChildProfileStore {
  private store: TypedStore<ChildProfile>;

  constructor(backend: StorageBackend) {
    this.store = new TypedStore(backend, KEY, validateChildProfile);
  }

  async get(): Promise<ChildProfile | null> {
    return this.store.read();
  }

  async save(profile: ChildProfile): Promise<WriteResult> {
    return this.store.write(profile);
  }

  async clear(): Promise<WriteResult> {
    return this.store.clear();
  }

  /**
   * Update fields on the stored profile.
   *
   * Changing weightKg to a different value clears weightConfirmed, forcing the
   * parent back through confirmation before any dose can be recalculated.
   */
  async update(
    changes: Partial<Omit<ChildProfile, "id" | "createdAt">>,
    now: Date = new Date(),
  ): Promise<WriteResult> {
    const existing = await this.get();
    if (!existing) {
      return { ok: false, error: "no child profile stored" };
    }

    const weightChanged =
      changes.weightKg !== undefined && changes.weightKg !== existing.weightKg;

    const updated: ChildProfile = {
      ...existing,
      ...changes,
      // A changed weight is unconfirmed until the parent re-confirms, unless
      // this same update is explicitly confirming it.
      weightConfirmed: weightChanged
        ? (changes.weightConfirmed ?? false)
        : (changes.weightConfirmed ?? existing.weightConfirmed),
      updatedAt: now.toISOString(),
    };

    const validated = validateChildProfile(updated);
    if (!validated) {
      return { ok: false, error: "update would produce an invalid profile" };
    }

    return this.store.write(validated);
  }
}

/** Creates a profile with confirmation withheld. Callers must confirm weight. */
export function createChildProfile(params: {
  id: string;
  nickname?: string;
  ageYears: number;
  weightKg: number;
  surgeryDate: string;
  surgeryType: SurgeryType;
  hospital: Hospital;
  now?: Date;
}): ChildProfile {
  const timestamp = (params.now ?? new Date()).toISOString();

  const profile: ChildProfile = {
    id: params.id,
    ageYears: params.ageYears,
    weightKg: params.weightKg,
    weightConfirmed: false,
    surgeryDate: params.surgeryDate,
    surgeryType: params.surgeryType,
    hospital: params.hospital,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  if (params.nickname !== undefined) profile.nickname = params.nickname;
  return profile;
}

/**
 * The gate on dose calculation. A profile must exist, carry a usable weight,
 * and have that weight confirmed by the parent.
 */
export function canCalculateDoses(
  profile: ChildProfile | null,
): { allowed: true } | { allowed: false; reason: string } {
  if (!profile) {
    return { allowed: false, reason: "Enter your child's details first." };
  }
  if (!isFiniteNumber(profile.weightKg) || profile.weightKg <= 0) {
    return {
      allowed: false,
      reason: "A weight is needed before medicine doses can be calculated.",
    };
  }
  if (!profile.weightConfirmed) {
    return {
      allowed: false,
      reason:
        "Please confirm your child's weight. Medicine doses are calculated " +
        "from it.",
    };
  }
  return { allowed: true };
}
