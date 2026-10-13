/**
 * Reminder delivery. On the web this can only fire while the app is open (or
 * suspended in the background on some browsers); the Home overdue banner is
 * the always-on fallback. A native (Capacitor) build should replace `notify`
 * with OS-scheduled local notifications, one per dose time.
 */
export type Perm = NotificationPermission | "unsupported";

export function currentPermission(): Perm {
  return typeof Notification === "undefined" ? "unsupported" : Notification.permission;
}

/**
 * Ask for notification permission. Always settles within `timeoutMs`: some
 * browsers never answer (or only support the old callback form), and the
 * parent must still get through to Home.
 */
export function requestPermission(timeoutMs = 4000): Promise<Perm> {
  if (typeof Notification === "undefined") return Promise.resolve("unsupported");
  if (Notification.permission !== "default") return Promise.resolve(Notification.permission);
  return new Promise((resolve) => {
    let done = false;
    const finish = (p?: NotificationPermission) => {
      if (done) return;
      done = true;
      resolve(p ?? Notification.permission);
    };
    setTimeout(() => finish(), timeoutMs);
    try {
      const r = Notification.requestPermission(finish);
      if (r && typeof r.then === "function") r.then(finish, () => finish());
    } catch {
      finish();
    }
  });
}

export async function notify(title: string, body: string, tag: string): Promise<void> {
  if (currentPermission() !== "granted") return;
  const opts: NotificationOptions = { body, tag, icon: "icons/icon-192.png", badge: "icons/icon-192.png" };
  try {
    // Android Chrome only allows notifications via a service worker registration.
    const reg = "serviceWorker" in navigator ? await navigator.serviceWorker.getRegistration() : undefined;
    if (reg) {
      await reg.showNotification(title, opts);
      return;
    }
    new Notification(title, opts);
  } catch {
    /* best effort — banner fallback still shows */
  }
}
