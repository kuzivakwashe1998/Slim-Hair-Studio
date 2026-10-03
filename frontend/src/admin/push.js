// Register the service worker + subscribe this device for background alerts.
const b64ToU8 = (s) => { const p = "=".repeat((4 - (s.length % 4)) % 4); const r = atob((s + p).replace(/-/g, "+").replace(/_/g, "/")); return Uint8Array.from([...r].map((c) => c.charCodeAt(0))); };

export const pushSupported = () => "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
export const isStandalone = () => window.matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
export const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent);

export async function registerSW() {
  if (!("serviceWorker" in navigator)) return null;
  return navigator.serviceWorker.register("/sw.js", { scope: "/" });
}
export async function currentSubscription() {
  const reg = await navigator.serviceWorker?.getRegistration("/"); return reg ? reg.pushManager.getSubscription() : null;
}
export async function enablePush(api, token) {
  if (!pushSupported()) throw new Error("Push not supported in this browser");
  if (isIOS() && !isStandalone()) throw new Error("On iPhone: tap Share → Add to Home Screen, then open the app and enable alerts");
  const perm = await Notification.requestPermission();
  if (perm !== "granted") throw new Error("Notifications were blocked — allow them in browser settings");
  const reg = await registerSW(); await navigator.serviceWorker.ready;
  const { publicKey } = await api("/admin/push/public-key", token);
  const sub = (await reg.pushManager.getSubscription()) || (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToU8(publicKey) }));
  return api("/admin/push/subscribe", token, { method: "POST", body: JSON.stringify({ subscription: sub.toJSON() }) });
}
export async function disablePush(api, token) {
  const sub = await currentSubscription(); if (!sub) return;
  await api("/admin/push/subscribe", token, { method: "DELETE", body: JSON.stringify({ endpoint: sub.endpoint }) }); await sub.unsubscribe();
}
