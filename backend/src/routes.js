import { Router } from "express";
import { store } from "./store.js";
import { SERVICES, SLOTS, CLOSED_WEEKDAYS, ECOCASH_NUMBER } from "./config.js";
import { verifyCredentials, issueToken, requireAdmin } from "./auth.js";
import { bus, notifyNewBooking, notifyStatus } from "./notify.js";
import { publicKey as vapidPublicKey, subscriptions, pushToSlim } from "./push.js";

const r = Router();
const ussdFor = (amount) => `*153*1*1*${ECOCASH_NUMBER}*${amount}#`;
const isClosed = (date) => CLOSED_WEEKDAYS.includes(new Date(date + "T00:00:00").getDay());
const safe = ({ proof, proofPath, ...b }) => ({ ...b, hasProof: !!(proof || proofPath) });
const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);

/* ---------------- PUBLIC ---------------- */
r.get("/services", (_req, res) => res.json(SERVICES));
r.get("/payment-info", (req, res) => res.json({ provider: "EcoCash", number: ECOCASH_NUMBER, ussd: ussdFor(Number(req.query.amount) || 0) }));

r.get("/availability", wrap(async (req, res) => {
  const { date } = req.query;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date || "")) return res.status(400).json({ error: "date must be YYYY-MM-DD" });
  if (isClosed(date)) return res.json({ date, closed: true, slots: [] });
  const taken = new Set((await store.byDate(date)).map((b) => b.time));
  res.json({ date, closed: false, slots: SLOTS.map((time) => ({ time, available: !taken.has(time) })) });
}));

// Customer's own bookings (by phone). Full list is admin-only below.
r.get("/bookings", wrap(async (req, res) => {
  if (!req.query.phone) return res.status(401).json({ error: "phone required (admins use /admin/bookings)" });
  res.json((await store.byPhone(req.query.phone)).map(safe));
}));

r.post("/bookings", wrap(async (req, res) => {
  const { name, phone, serviceId, date, time, proof } = req.body || {};
  const service = SERVICES.find((s) => s.id === serviceId);
  if (!name?.trim() || name.trim().length < 2) return res.status(400).json({ error: "Name required" });
  if ((phone || "").replace(/\D/g, "").length < 9) return res.status(400).json({ error: "Valid WhatsApp number required" });
  if (!service) return res.status(400).json({ error: "Unknown service" });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date || "")) return res.status(400).json({ error: "Invalid date" });
  if (isClosed(date)) return res.status(400).json({ error: "Closed on Sundays" });
  if (!SLOTS.includes(time)) return res.status(400).json({ error: "Invalid time slot" });
  if (!proof?.startsWith("data:image/")) return res.status(400).json({ error: "Payment confirmation screenshot required" });
  if ((await store.byDate(date)).some((b) => b.time === time)) return res.status(409).json({ error: "Slot already booked" });

  let booking;
  try {
    booking = await store.create({ name: name.trim(), phone: phone.trim(), serviceId, service: service.name, price: service.price, date, time, deposit: service.price, payment: "EcoCash", ussd: ussdFor(service.price), ...(store.kind === "file" ? { proof } : {}) });
    if (store.kind !== "file") booking.proofPath = await store.putProof(booking.id, proof);
  } catch (e) { if (e.status === 409) return res.status(409).json({ error: e.message }); throw e; }

  console.log("New booking:", safe(booking));
  notifyNewBooking(safe(booking)); // → dings Slim's admin app (+ WhatsApp if configured)
  res.status(201).json(safe(booking));
}));

/* ---------------- ADMIN (Slim) ---------------- */
r.post("/admin/login", (req, res) => {
  const { phone, pin } = req.body || {};
  if (!verifyCredentials(phone, pin)) return res.status(401).json({ error: "Wrong WhatsApp number or PIN" });
  res.json({ token: issueToken(), admin: { phone, name: "Slim" } });
});
r.get("/admin/me", requireAdmin, (req, res) => res.json({ ok: true, admin: req.admin, store: store.kind }));

r.get("/admin/bookings", requireAdmin, wrap(async (req, res) => {
  let list = await store.list();
  if (req.query.date) list = list.filter((b) => b.date === req.query.date);
  if (req.query.status) list = list.filter((b) => b.status === req.query.status);
  res.json(list.map(safe));
}));

r.get("/admin/bookings/:id/proof", requireAdmin, wrap(async (req, res) => {
  const b = await store.byId(req.params.id);
  if (!b) return res.status(404).json({ error: "Not found" });
  const url = await store.proofUrl(b);
  if (!url) return res.status(404).json({ error: "No proof" });
  if (url.startsWith("data:")) { const [meta, data] = url.split(","); return res.type(meta.match(/data:(.*?);/)?.[1] || "image/jpeg").send(Buffer.from(data, "base64")); }
  res.redirect(url); // signed Supabase Storage URL (10 min)
}));

r.patch("/admin/bookings/:id", requireAdmin, wrap(async (req, res) => {
  const { status } = req.body || {};
  if (!["confirmed", "cancelled", "awaiting confirmation"].includes(status)) return res.status(400).json({ error: "Invalid status" });
  const b = await store.update(req.params.id, { status });
  if (!b) return res.status(404).json({ error: "Not found" });
  notifyStatus(safe(b)); res.json(safe(b));
}));

// Live feed → Slim's admin app. Server-Sent Events; token passed as ?token= because EventSource can't set headers.
r.get("/admin/stream", requireAdmin, (req, res) => {
  res.set({ "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive", "X-Accel-Buffering": "no" });
  res.flushHeaders();
  const send = (ev) => res.write(`event: ${ev.type}\ndata: ${JSON.stringify(ev)}\n\n`);
  res.write(`event: hello\ndata: ${JSON.stringify({ store: store.kind, at: Date.now() })}\n\n`);
  const ping = setInterval(() => res.write(": ping\n\n"), 25000);
  bus.on("booking", send);
  req.on("close", () => { clearInterval(ping); bus.off("booking", send); });
});

// Web Push — alerts even when the admin app is closed
r.get("/admin/push/public-key", requireAdmin, (_req, res) => res.json({ publicKey: vapidPublicKey }));
r.post("/admin/push/subscribe", requireAdmin, wrap(async (req, res) => {
  const s = req.body?.subscription; if (!s?.endpoint || !s?.keys) return res.status(400).json({ error: "Invalid subscription" });
  await subscriptions.add(s, req.headers["user-agent"] || ""); res.json({ ok: true, devices: (await subscriptions.all()).length });
}));
r.delete("/admin/push/subscribe", requireAdmin, wrap(async (req, res) => { if (req.body?.endpoint) await subscriptions.remove(req.body.endpoint); res.json({ ok: true }); }));
r.get("/admin/push/devices", requireAdmin, wrap(async (_req, res) => res.json((await subscriptions.all()).map((x) => ({ endpoint: x.endpoint.slice(0, 40) + "…", user_agent: x.user_agent, created_at: x.created_at })))));
r.post("/admin/push/test", requireAdmin, wrap(async (_req, res) => res.json(await pushToSlim({ title: "💈 Test alert — SLIM HAIR STUDIO", body: "This is how a new booking will grab your attention.", tag: "test", url: "/#/admin", kind: "test" }))));

// Lets Slim test the ding from the admin app
r.post("/admin/test-ding", requireAdmin, (_req, res) => { bus.emit("booking", { type: "booking.test", booking: { name: "Test", service: "Fade", time: "12:00", date: "today", deposit: 5 } }); res.json({ ok: true }); });

export default r;
