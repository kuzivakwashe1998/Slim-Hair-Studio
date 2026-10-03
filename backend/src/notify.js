import { EventEmitter } from "node:events";
import { ADMIN_WHATSAPP, WHATSAPP_TOKEN, WHATSAPP_PHONE_ID } from "./config.js";
import { pushToSlim } from "./push.js";

export const bus = new EventEmitter(); bus.setMaxListeners(100);

/** Fire a booking event: admin app(s) listening on /api/admin/stream get it instantly and play the ding. */
export function notifyNewBooking(b) {
  bus.emit("booking", { type: "booking.created", booking: b });
  pushToSlim({
    title: "💈 New booking — SLIM HAIR STUDIO",
    body: `${b.name} • ${b.service} • ${b.date} at ${b.time} • $${b.deposit} EcoCash deposit`,
    tag: `booking-${b.id}`, url: "/#/admin", bookingId: b.id, kind: "booking",
  }).then((r) => console.log("push:", r)).catch((e) => console.warn("push error:", e.message));
  sendWhatsApp(b).catch((e) => console.warn("WhatsApp notify failed:", e.message));
}
export function notifyStatus(b) { bus.emit("booking", { type: "booking.updated", booking: b }); }

/** Optional: also message Slim on WhatsApp via Meta Cloud API (set WHATSAPP_TOKEN + WHATSAPP_PHONE_ID). */
async function sendWhatsApp(b) {
  if (!WHATSAPP_TOKEN || !WHATSAPP_PHONE_ID) return;
  const to = ADMIN_WHATSAPP.replace(/\D/g, "").replace(/^0/, "263");
  const body = `💈 New booking\n${b.service} • $${b.deposit} deposit\n${b.date} at ${b.time}\n${b.name} — ${b.phone}\nOpen admin to confirm.`;
  const r = await fetch(`https://graph.facebook.com/v20.0/${WHATSAPP_PHONE_ID}/messages`, {
    method: "POST", headers: { Authorization: `Bearer ${WHATSAPP_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ messaging_product: "whatsapp", to, type: "text", text: { body } }),
  });
  if (!r.ok) throw new Error(await r.text());
}
