/* SLIM HAIR STUDIO — service worker: background push alerts for Slim's admin */
const SIGNATURE_VIBRATION = [120, 60, 120, 60, 400, 120, 120, 60, 120]; // "S-L-I-M" — distinct from a normal WhatsApp buzz

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let data = {}; try { data = event.data.json(); } catch { data = { title: "SLIM HAIR STUDIO", body: event.data?.text() || "New booking" }; }
  const show = self.registration.showNotification(data.title || "💈 New booking", {
    body: data.body || "",
    tag: data.tag || "booking",
    renotify: true,                 // buzz again even if a previous booking notification is still showing
    requireInteraction: true,       // stays on screen until Slim taps it
    vibrate: SIGNATURE_VIBRATION,
    icon: "/icon-192.png", badge: "/icon-192.png",
    data: { url: data.url || "/#/admin", bookingId: data.bookingId, kind: data.kind },
    actions: [{ action: "open", title: "Open booking" }, { action: "dismiss", title: "Later" }],
  });
  // If the admin app is open anywhere, tell it to play the gold chime too
  const ping = self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((cs) => cs.forEach((c) => c.postMessage({ type: "slim:push", data })));
  event.waitUntil(Promise.all([show, ping]));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  if (event.action === "dismiss") return;
  const url = new URL(event.notification.data?.url || "/#/admin", self.location.origin).href;
  event.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((cs) => {
    const c = cs.find((w) => w.url.startsWith(self.location.origin));
    return c ? c.focus().then((w) => w.navigate?.(url) || w) : self.clients.openWindow(url);
  }));
});
