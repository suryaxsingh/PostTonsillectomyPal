/**
 * STORAGE FOUNDATION
 * ==================
 *
 * A thin, typed, fail-safe wrapper over a key-value store.
 *
 * The backend is injected rather than imported, for two reasons:
 *   1. The whole data layer stays runnable under `node --test` with no React
 *      Native present, exactly as the clinical engine does.
 *   2. Swapping AsyncStorage for SQLite later touches only this file.
 *
 * SAFETY POSTURE
 * --------------
 * This app records medicine given to a child. Two failure modes matter:
 *
 *   - A silent write failure is dangerous. A parent who taps "given" and sees
 *     the tick must not have that dose quietly lost, or the 24-hour dose count
 *     under-reports and the app permits a dose it should have warned about.
 *     Every write therefore returns an explicit ok/error result. Callers must
 *     surface failures rather than assume success.
 *
 *   - Corrupt stored data must never crash the app or, worse, deserialise into
 *     a half-valid object that flows into a dose calculation. Reads validate
 *     shape before returning, and return null on anything unexpected. A missing
 *     profile sends the parent back through setup; a malformed one silently
 *     accepted could produce a wrong dose.
 *
 * Losing data fails safe. Trusting bad data does not.
 */

/** Minimal contract any backend must satisfy. Matches AsyncStorage's shape. */
export type StorageBackend = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
  getAllKeys(): Promise<readonly string[]>;
};

export type WriteResult = { ok: true } | { ok: false; error: string };

/**
 * Bumped only when the stored shape changes incompatibly. Keys are namespaced
 * by version so an old install's data is never reinterpreted under new rules;
 * a migration must read the old namespace explicitly.
 */
export const SCHEMA_VERSION = 1;

const NAMESPACE = "@tonsiltrack";

export function storageKey(name: string): string {
  return `${NAMESPACE}/v${SCHEMA_VERSION}/${name}`;
}

/** In-memory backend. Used by tests, and as a safe fallback. */
export class MemoryStorageBackend implements StorageBackend {
  private store = new Map<string, string>();

  /** Set to make the next write fail, for exercising error paths. */
  failNextWrite = false;

  async getItem(key: string): Promise<string | null> {
    return this.store.has(key) ? (this.store.get(key) as string) : null;
  }

  async setItem(key: string, value: string): Promise<void> {
    if (this.failNextWrite) {
      this.failNextWrite = false;
      throw new Error("simulated storage failure");
    }
    this.store.set(key, value);
  }

  async removeItem(key: string): Promise<void> {
    this.store.delete(key);
  }

  async getAllKeys(): Promise<readonly string[]> {
    return [...this.store.keys()];
  }

  /** Test helper: inject raw text to simulate corruption. */
  seedRaw(key: string, value: string): void {
    this.store.set(key, value);
  }
}

/**
 * Validates a decoded value before it is trusted.
 * Return null to reject; the caller then behaves as if nothing was stored.
 */
export type Validator<T> = (value: unknown) => T | null;

/**
 * Typed accessor for one stored value.
 *
 * Reads never throw: malformed JSON, a backend error, or a value failing
 * validation all yield null. Writes report failure explicitly.
 */
export class TypedStore<T> {
  // Fields are declared and assigned explicitly rather than via constructor
  // parameter properties: Node's strip-only TypeScript support cannot compile
  // those, and this project runs its tests directly on `node --test` with no
  // build step. Same applies to every class in this data layer.
  private backend: StorageBackend;
  private key: string;
  private validate: Validator<T>;

  constructor(backend: StorageBackend, key: string, validate: Validator<T>) {
    this.backend = backend;
    this.key = key;
    this.validate = validate;
  }

  async read(): Promise<T | null> {
    let raw: string | null;
    try {
      raw = await this.backend.getItem(this.key);
    } catch {
      // A backend read failure is indistinguishable from "nothing stored"
      // as far as safety goes: both mean we have no trustworthy data.
      return null;
    }

    if (raw === null) return null;

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return null;
    }

    try {
      return this.validate(parsed);
    } catch {
      // A validator that throws is treated as a rejection, never a crash.
      return null;
    }
  }

  async write(value: T): Promise<WriteResult> {
    let serialised: string;
    try {
      serialised = JSON.stringify(value);
    } catch (error) {
      return { ok: false, error: `could not serialise: ${describe(error)}` };
    }

    try {
      await this.backend.setItem(this.key, serialised);
      return { ok: true };
    } catch (error) {
      return { ok: false, error: describe(error) };
    }
  }

  async clear(): Promise<WriteResult> {
    try {
      await this.backend.removeItem(this.key);
      return { ok: true };
    } catch (error) {
      return { ok: false, error: describe(error) };
    }
  }
}

function describe(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

/**
 * Adapt React Native's AsyncStorage to the StorageBackend contract.
 *
 * The module is passed in rather than imported, so this file keeps zero
 * runtime dependencies and the whole data layer stays runnable under
 * `node --test`. Wire it up once the Expo app is scaffolded:
 *
 *   import AsyncStorage from "@react-native-async-storage/async-storage";
 *   const backend = createAsyncStorageBackend(AsyncStorage);
 *
 * AsyncStorage already matches this shape; the wrapper exists to pin the
 * contract explicitly and to give a single place to add retries or
 * instrumentation later.
 */
export function createAsyncStorageBackend(asyncStorage: {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
  getAllKeys(): Promise<readonly string[]>;
}): StorageBackend {
  return {
    getItem: (key) => asyncStorage.getItem(key),
    setItem: (key, value) => asyncStorage.setItem(key, value),
    removeItem: (key) => asyncStorage.removeItem(key),
    getAllKeys: () => asyncStorage.getAllKeys(),
  };
}

/** Removes every key this app owns. Used by a "reset app" action. */
export async function clearAllAppData(
  backend: StorageBackend,
): Promise<WriteResult> {
  try {
    const keys = await backend.getAllKeys();
    const ours = keys.filter((key) => key.startsWith(`${NAMESPACE}/`));
    for (const key of ours) {
      await backend.removeItem(key);
    }
    return { ok: true };
  } catch (error) {
    return { ok: false, error: describe(error) };
  }
}

// ---------------------------------------------------------------------------
// Shared validation helpers
// ---------------------------------------------------------------------------

export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

/** Finite numbers only: NaN and Infinity must never reach a dose calculation. */
export function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function isIsoDateString(value: unknown): value is string {
  return isNonEmptyString(value) && !Number.isNaN(Date.parse(value));
}

export function isOneOf<const T extends readonly string[]>(
  value: unknown,
  allowed: T,
): value is T[number] {
  return typeof value === "string" && (allowed as readonly string[]).includes(value);
}
