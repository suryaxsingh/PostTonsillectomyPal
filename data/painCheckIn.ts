/**
 * PAIN CHECK-IN
 * =============
 *
 * One faces-scale check-in per day, per PRD.md section 4.
 *
 * The parent-facing UI shows faces, never numbers (PRD 4.2). The numeric
 * `painFaceValue` exists only so check-ins can be stored and compared; it must
 * not be surfaced as a score, which would invite parents to read it as a
 * clinical measurement it is not.
 *
 * Guidance copy is keyed off the category rather than the number, so the
 * wording in PRD 4.3 and UX.md Screen 15 stays in one place.
 *
 * Re-checking on the same day replaces that day's entry. Pain changes through
 * the day and the later reading is the current one; keeping both would imply a
 * trend line the single daily prompt cannot support.
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

export const PAIN_CATEGORIES = [
  "none",
  "mild",
  "moderate",
  "bad",
  "very_bad",
  "worst",
] as const;
export type PainCategory = (typeof PAIN_CATEGORIES)[number];

export type PainFaceValue = 0 | 1 | 2 | 3 | 4 | 5;

export type PainCheckIn = {
  id: string;
  childId: string;
  /** Calendar day, YYYY-MM-DD. One check-in per day. */
  date: string;
  postOpDay: number;
  painFaceValue: PainFaceValue;
  painCategory: PainCategory;
  createdAt: string;
};

const KEY = storageKey("painCheckIns");

/** Face value to category. The single mapping; do not duplicate it. */
export function categoryForFaceValue(value: PainFaceValue): PainCategory {
  return PAIN_CATEGORIES[value] ?? "moderate";
}

/**
 * Guidance shown after a check-in (PRD 4.3, UX.md Screen 15).
 *
 * Every message ends with the bleeding pathway, because the spec requires the
 * emergency route to stay visible regardless of pain score (PRD 4.3: "The app
 * should still direct bleeding to emergency care regardless of pain score").
 */
export const BLEEDING_REMINDER =
  "If there is any fresh bleeding, use Emergency or call 000.";

export function guidanceForCategory(category: PainCategory): string {
  switch (category) {
    case "none":
    case "mild":
      return (
        "Good. Keep following the medicine plan as prescribed. Pain can still " +
        "worsen over the next few days. " +
        BLEEDING_REMINDER
      );
    case "moderate":
      return (
        "This can be common after tonsillectomy, especially around days 4-7. " +
        "Keep giving medicines as prescribed. " +
        BLEEDING_REMINDER
      );
    case "bad":
    case "very_bad":
      return (
        "Pain can be severe after tonsillectomy. Check that medicines have " +
        "been given as prescribed. Seek medical advice if pain remains " +
        "uncontrolled or you are worried. " +
        BLEEDING_REMINDER
      );
    case "worst":
      return (
        "If your child's pain is not controlled despite prescribed medicine, " +
        "or they cannot take medicine, seek urgent medical advice. " +
        BLEEDING_REMINDER
      );
  }
}

export function validatePainCheckIn(value: unknown): PainCheckIn | null {
  if (!isObject(value)) return null;
  if (!isNonEmptyString(value.id)) return null;
  if (!isNonEmptyString(value.childId)) return null;
  if (!isNonEmptyString(value.date)) return null;
  if (!isFiniteNumber(value.postOpDay)) return null;
  if (!isFiniteNumber(value.painFaceValue)) return null;
  if (![0, 1, 2, 3, 4, 5].includes(value.painFaceValue)) return null;
  if (!isOneOf(value.painCategory, PAIN_CATEGORIES)) return null;
  if (!isIsoDateString(value.createdAt)) return null;

  return value as unknown as PainCheckIn;
}

function validateCheckInList(value: unknown): PainCheckIn[] | null {
  if (!Array.isArray(value)) return null;
  const checkIns: PainCheckIn[] = [];
  for (const entry of value) {
    const checkIn = validatePainCheckIn(entry);
    if (checkIn) checkIns.push(checkIn);
  }
  return checkIns;
}

/** Local calendar day as YYYY-MM-DD. Deliberately not UTC: a check-in at
 *  11pm belongs to that evening, not the next morning in London. */
export function localDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export class PainCheckInStore {
  private store: TypedStore<PainCheckIn[]>;

  constructor(backend: StorageBackend) {
    this.store = new TypedStore(backend, KEY, validateCheckInList);
  }

  /** All check-ins, most recent day first. */
  async all(): Promise<PainCheckIn[]> {
    const checkIns = (await this.store.read()) ?? [];
    return [...checkIns].sort((a, b) => b.date.localeCompare(a.date));
  }

  async forDate(date: Date): Promise<PainCheckIn | null> {
    const key = localDateKey(date);
    const checkIns = await this.all();
    return checkIns.find((checkIn) => checkIn.date === key) ?? null;
  }

  /** Save a check-in, replacing any existing entry for the same day. */
  async save(checkIn: PainCheckIn): Promise<WriteResult> {
    const validated = validatePainCheckIn(checkIn);
    if (!validated) {
      return { ok: false, error: "pain check-in failed validation" };
    }

    const existing = await this.all();
    const others = existing.filter((entry) => entry.date !== validated.date);

    return this.store.write([validated, ...others]);
  }

  async clear(): Promise<WriteResult> {
    return this.store.clear();
  }
}

export function createPainCheckIn(params: {
  id: string;
  childId: string;
  painFaceValue: PainFaceValue;
  postOpDay: number;
  now?: Date;
}): PainCheckIn {
  const timestamp = params.now ?? new Date();

  return {
    id: params.id,
    childId: params.childId,
    date: localDateKey(timestamp),
    postOpDay: params.postOpDay,
    painFaceValue: params.painFaceValue,
    painCategory: categoryForFaceValue(params.painFaceValue),
    createdAt: timestamp.toISOString(),
  };
}
