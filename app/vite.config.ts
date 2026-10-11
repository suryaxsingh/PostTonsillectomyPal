import react from "@vitejs/plugin-react";
import { readdirSync } from "node:fs";
import { join } from "node:path";
import type { Plugin } from "vite";
import { defineConfig } from "vitest/config";

/**
 * Emits sw.js with a precache list of every built asset, so the installed app
 * works fully offline. Cache name changes with each build.
 */
function serviceWorker(): Plugin {
  return {
    name: "ptpal-sw",
    apply: "build",
    generateBundle(_, bundle) {
      const pub = (dir: string): string[] =>
        readdirSync(join("public", dir), { withFileTypes: true }).flatMap((e) =>
          e.isDirectory() ? pub(join(dir, e.name)) : [join(dir, e.name).replace(/\\/g, "/")],
        );
      const files = ["./", ...Object.keys(bundle).filter((f) => !f.endsWith(".map")), ...pub("")].map((f) =>
        f === "./" ? f : "./" + f.replace(/^\//, ""),
      );
      const version = Date.now().toString(36);
      const source = `/* generated */
const CACHE = "ptpal-${version}";
const FILES = ${JSON.stringify(files)};
self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  );
});
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return;
  if (e.request.mode === "navigate") {
    e.respondWith(fetch(e.request).catch(() => caches.match("./")));
    return;
  }
  e.respondWith(caches.match(e.request).then((hit) => hit || fetch(e.request)));
});
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  e.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => (list[0] ? list[0].focus() : self.clients.openWindow("./"))),
  );
});
`;
      this.emitFile({ type: "asset", fileName: "sw.js", source });
    },
  };
}

export default defineConfig({
  base: "./",
  plugins: [react(), serviceWorker()],
  build: { target: "es2020" },
  test: { environment: "jsdom" },
});
