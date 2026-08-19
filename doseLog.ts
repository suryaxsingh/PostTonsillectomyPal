/**
 * DOSE LOG
 * ========
 *
 * The record of what medicine was actually given to the child, and when.
 *
 * This is the most safety-critical store in the app. The rolling 24-hour count
 * in `clinical/safetyValidator.ts` is computed entirely from these entries, so
 * a lost entry does not merely lose history — it causes the validator to
 * under-count and permit a dose it should have warned about.
 *
 * DESIGN CONSEQUENCES
 * -------------------
 * - Append-only. There is no update or delete of an administration record.
 *   A mistaken entry is corrected by appending a correcting entry, never by
 *   erasing the original. Erasure would make the log disagree with what the
 *   child actually received.
 *
 * - Writes report failure loudly. `append()` returns the stored entry only on
 *   success; the UI must not render a dose as "given" until it has that.
 *   Showing an optimistic tick over a failed write is precisely the bug that
 *   makes the 24-hour count wrong.
 *
 * - Entries carry `planId` and `ruleVersion`, so a dose given under an earlier
 *   plan still resolves against the plan it was actually given under, even
 *   after a weight change supersedes that plan (UX.md Screen 18).
 *
 * - Corrupt individual entries are skipped, not fatal — but see
 *   `readWithIntegrity()`, which reports how many were dropped. A caller
 *   computing a 24-hour count must know the log was incomplete, because a
 *   silently short log reads exactly like a safe one.
 */

import type { DoseLogEntry } from "../clinical/types.ts";
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

export const DOSE_STATUSES = ["given", "skipped", "missed"] as const;

/** A stored entry: the engine's shape plus the audit fields. */
export type StoredDoseLogEntry = DoseLogEntry & {
  /** Plan this dose was given under. Absent for pre-plan legacy entries. */
  planId?: string;
  /** Rules version in force when this dose was given. */
  ruleVersion?: string;
  /** When the record was written, as distinct from when the dose was given. */
  recordedAt: string;
};

const KEY = storageKey("doseLog");

export function validateDoseLogEntry(value: unknown): StoredDoseLogEntry | null {
  if (!isObject(value)) return null;

  if (!isNonEmptyString(value.id)) return null;
  if (!isNonEmptyString(value.medicationId)) return null;
  if (!isNonEmptyString(value.displayName)) return null;
  // An entry without a valid administration time cannot be placed in the
  // 24-hour window, so it cannot be allowed to count as one.
  if (!isIsoDateString(value.actualDateTime)) return null;
  if (!isFiniteNumber(value.doseMg) || value.doseMg < 0) return null;
  if (!isOneOf(value.status, DOSE_STATUSES)) return null;
  if (!isFiniteNumber(value.postOpDay)) return null;
  if (!isIsoDateString(value.recordedAt)) return null;

  if (value.doseMl !== undefined) {
    if (!isFiniteNumber(value.doseMl) || value.doseMl <= 0) return null;
  }

  return value as unknown as StoredDoseLogEntry;
}

export type LogIntegrity = {
  entries: StoredDoseLogEntry[];
  /** Entries present in storage but rejected as malformed. */
  droppedCount: number;
  /**
   * True when the log could not be read in full. A safety check computed from
   * a degraded log must be treated as unreliable, not as a clean result.
   */
  degraded: boolean;
};

export class DoseLogStore {
  private store: TypedStore<unknown[]>;

  constructor(backend: StorageBackend) {
    this.store = new TypedStore(backend, KEY, (value) =>
      Array.isArray(value) ? value : null,
    );
  }

  /**
   * Read the log, reporting any entries that failed validation.
   *
   * Prefer this over `all()` anywhere a safety decision depends on the result.
   */
  async readWithIntegrity(): Promise<LogIntegrity> {
    const raw = (await this.store.read()) ?? [];

    const entries: StoredDoseLogEntry[] = [];
    let dropped = 0;

    for (const candidate of raw) {
      const entry = validateDoseLogEntry(candidate);
      if (entry) {
        entries.push(entry);
      } else {
        dropped += 1;
      }
    }

    entries.sort(
      (a, b) => Date.parse(b.actualDateTime) - Date.parse(a.actualDateTime),
    );

    return { entries, droppedCount: dropped, degraded: dropped > 0 };
  }

  /** All valid entries, newest first. */
  async all(): Promise<StoredDoseLogEntry[]> {
    return (await this.readWithIntegrity()).entries;
  }

  /**
   * Append an administration record.
   *
   * Returns the stored entry on success. The caller must not treat a dose as
   * recorded unless this resolves with ok: true.
   */
  async append(
    entry: StoredDoseLogEntry,
  ): Promise<
    { ok: true; entry: StoredDoseLogEntry } | { ok: false; error: string }
  > {
    const validated = validateDoseLogEntry(entry);
    if (!validated) {
      return { ok: false, error: "dose log entry failed validation" };
    }

    const { entries, degraded, droppedCount } = await this.readWithIntegrity();

    if (entries.some((existing) => existing.id === validated.id)) {
      return { ok: false, error: `dose log entry ${validated.id} already exists` };
    }

    // Preserve unreadable entries verbatim rather than dropping them on write:
    // a corrupt entry we cannot parse may still be recoverable later, and
    // silently compacting the log would destroy that chance.
    const rawExisting = (await this.store.read()) ?? [];
    const preserved = degraded
      ? rawExisting.filter((candidate) => validateDoseLogEntry(candidate) === null)
      : [];

    const result = await this.store.write([...preserved, ...entries, validated]);
    if (!result.ok) {
      return {
        ok: false,
        error:
          `${result.error}. The dose was NOT recorded — ` +
          `do not rely on the app's dose count until this is resolved.` +
          (droppedCount > 0 ? ` (${droppedCount} unreadable entries preserved.)` : ""),
      };
    }

    return { ok: true, entry: validated };
  }

  /** Entries for one medicine, newest first. */
  async forMedication(medicationId: string): Promise<StoredDoseLogEntry[]> {
    const { entries } = await this.readWithIntegrity();
    return entries.filter((entry) => entry.medicationId === medicationId);
  }

  /** Entries on one post-op day, oldest first, for the day's history view. */
  async forPostOpDay(postOpDay: number): Promise<StoredDoseLogEntry[]> {
    const { entries } = await this.readWithIntegrity();
    return entries
      .filter((entry) => entry.postOpDay === postOpDay)
      .sort(
        (a, b) => Date.parse(a.actualDateTime) - Date.parse(b.actualDateTime),
      );
  }

  /** Has this scheduled dose already been recorded as given? */
  async isScheduledDoseGiven(scheduledDoseId: string): Promise<boolean> {
    const { entries } = await this.readWithIntegrity();
    return entries.some(
      (entry) =>
        entry.scheduledDoseId === scheduledDoseId && entry.status === "given",
    );
  }

  async clear(): Promise<WriteResult> {
    return this.store.clear();
  }
}

export function createDoseLogEntry(params: {
  id: string;
  medicationId: string;
  displayName: string;
  actualDateTime: string;
  doseMg: number;
  doseMl?: number;
  status: "given" | "skipped" | "missed";
  postOpDay: number;
  scheduledDoseId?: string;
  scheduledDateTime?: string;
  planId?: string;
  ruleVersion?: string;
  now?: Date;
}): StoredDoseLogEntry {
  const entry: StoredDoseLogEntry = {
    id: params.id,
    medicationId: params.medicationId,
    displayName: params.displayName,
    actualDateTime: params.actualDateTime,
    doseMg: params.doseMg,
    status: params.status,
    postOpDay: params.postOpDay,
    recordedAt: (params.now ?? new Date()).toISOString(),
  };

  if (params.doseMl !== undefined) entry.doseMl = params.doseMl;
  if (params.scheduledDoseId) entry.scheduledDoseId = params.scheduledDoseId;
  if (params.scheduledDateTime) entry.scheduledDateTime = params.scheduledDateTime;
  if (params.planId) entry.planId = params.planId;
  if (params.ruleVersion) entry.ruleVersion = params.ruleVersion;

  return entry;
}
