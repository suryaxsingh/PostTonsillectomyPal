/**
 * Storage foundation tests.
 *
 * The point of these is the failure paths: corrupt data must not reach a dose
 * calculation, and a failed write must not look like a success.
 */

import test from "node:test";
import assert from "node:assert/strict";

import {
  clearAllAppData,
  MemoryStorageBackend,
  storageKey,
  TypedStore,
  type Validator,
} from "../storage.ts";

type Thing = { name: string; count: number };

const validateThing: Validator<Thing> = (value) => {
  if (typeof value !== "object" || value === null) return null;
  const candidate = value as Record<string, unknown>;
  if (typeof candidate.name !== "string") return null;
  if (typeof candidate.count !== "number" || !Number.isFinite(candidate.count)) {
    return null;
  }
  return { name: candidate.name, count: candidate.count };
};

function makeStore() {
  const backend = new MemoryStorageBackend();
  return { backend, store: new TypedStore(backend, storageKey("thing"), validateThing) };
}

test("a value round-trips through storage", async () => {
  const { store } = makeStore();

  const write = await store.write({ name: "paracetamol", count: 4 });
  assert.equal(write.ok, true);

  assert.deepEqual(await store.read(), { name: "paracetamol", count: 4 });
});

test("reading nothing yields null rather than throwing", async () => {
  const { store } = makeStore();
  assert.equal(await store.read(), null);
});

test("malformed JSON is rejected, not thrown", async () => {
  const { backend, store } = makeStore();
  backend.seedRaw(storageKey("thing"), "{not valid json");

  assert.equal(await store.read(), null);
});

test("structurally wrong data is rejected", async () => {
  const { backend, store } = makeStore();

  // Right JSON, wrong shape: count is a string.
  backend.seedRaw(storageKey("thing"), JSON.stringify({ name: "x", count: "4" }));
  assert.equal(await store.read(), null);

  // Missing field entirely.
  backend.seedRaw(storageKey("thing"), JSON.stringify({ name: "x" }));
  assert.equal(await store.read(), null);

  // An array where an object was expected.
  backend.seedRaw(storageKey("thing"), JSON.stringify([1, 2, 3]));
  assert.equal(await store.read(), null);
});

test("NaN and Infinity never survive a read", async () => {
  const { backend, store } = makeStore();

  // JSON.stringify turns NaN into null, but a hand-rolled payload can carry it.
  backend.seedRaw(storageKey("thing"), '{"name":"x","count":null}');
  assert.equal(await store.read(), null);

  backend.seedRaw(storageKey("thing"), '{"name":"x","count":1e999}');
  assert.equal(await store.read(), null);
});

test("a failed write reports the failure rather than reporting success", async () => {
  const { backend, store } = makeStore();
  backend.failNextWrite = true;

  const result = await store.write({ name: "oxycodone", count: 1 });
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.match(result.error, /simulated storage failure/);

  // And nothing was persisted.
  assert.equal(await store.read(), null);
});

test("a validator that throws is treated as rejection, not a crash", async () => {
  const backend = new MemoryStorageBackend();
  const exploding = new TypedStore<Thing>(backend, storageKey("boom"), () => {
    throw new Error("validator blew up");
  });
  backend.seedRaw(storageKey("boom"), JSON.stringify({ name: "x", count: 1 }));

  assert.equal(await exploding.read(), null);
});

test("a backend read failure reads as absent data", async () => {
  const failing = {
    async getItem(): Promise<string | null> {
      throw new Error("disk gone");
    },
    async setItem(): Promise<void> {},
    async removeItem(): Promise<void> {},
    async getAllKeys(): Promise<readonly string[]> {
      return [];
    },
  };

  const store = new TypedStore<Thing>(failing, storageKey("thing"), validateThing);
  assert.equal(await store.read(), null);
});

test("clear removes the value", async () => {
  const { store } = makeStore();
  await store.write({ name: "x", count: 1 });

  assert.equal((await store.clear()).ok, true);
  assert.equal(await store.read(), null);
});

test("clearAllAppData removes only this app's keys", async () => {
  const backend = new MemoryStorageBackend();
  backend.seedRaw(storageKey("a"), '{"x":1}');
  backend.seedRaw(storageKey("b"), '{"x":2}');
  backend.seedRaw("someone-elses-key", "keep me");

  assert.equal((await clearAllAppData(backend)).ok, true);

  const remaining = await backend.getAllKeys();
  assert.deepEqual(remaining, ["someone-elses-key"]);
});

test("keys are namespaced and versioned", () => {
  assert.equal(storageKey("doseLog"), "@tonsiltrack/v1/doseLog");
});
