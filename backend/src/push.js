// Web Push → Slim's phone even when the admin app is closed.
// VAPID keys: set VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY in .env; in dev they're generated once and cached in data/vapid.json.
import webpush from "web-push";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { supabase, supabaseEnabled } from "./db/supabase.js";
import { ADMIN_WHATSAPP } from "./config.js";

const DATA = join(dirname(fileURLToPath(import.meta.url)), "..", "data");
const SUBS_FILE = join(DATA, "push-subscriptions.json");

async function vapid() {
  if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) return { publicKey: process.env.VAPID_PUBLIC_KEY, privateKey: process.env.VAPID_PRIVATE_KEY };
  const f = join(DATA, "vapid.json");
  try { return JSON.parse(await readFile(f, "utf8")); } catch {}
  const k = webpush.generateVAPIDKeys(); await mkdir(DATA, { recursive: true }); await writeFile(f, JSON.stringify(k, null, 2)); return k;
}
const keys = await vapid();
webpush.setVapidDetails(`mailto:slim@slimhairstudio.co.zw`, keys.publicKey, keys.privateKey);
export const publicKey = keys.publicKey;

/* ---- subscription storage (file in dev, Supabase table in prod) ---- */
const subs = supabaseEnabled ? {
  async all() { const { data } = await supabase.from("push_subscriptions").select("*"); return data || []; },
  async add(s, ua) { await supabase.from("push_subscriptions").upsert({ endpoint: s.endpoint, subscription: s, user_agent: ua, owner: ADMIN_WHATSAPP }, { onConflict: "endpoint" }); },
  async remove(endpoint) { await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint); },
} : {
  async all() { try { return JSON.parse(await readFile(SUBS_FILE, "utf8")); } catch { return []; } },
  async add(s, ua) { const l = (await this.all()).filter((x) => x.endpoint !== s.endpoint); l.push({ endpoint: s.endpoint, subscription: s, user_agent: ua, created_at: new Date().toISOString() }); await mkdir(DATA, { recursive: true }); await writeFile(SUBS_FILE, JSON.stringify(l, null, 2)); },
  async remove(endpoint) { const l = (await this.all()).filter((x) => x.endpoint !== endpoint); await writeFile(SUBS_FILE, JSON.stringify(l, null, 2)); },
};
export const subscriptions = subs;

/** Send a push to every device Slim enabled alerts on. Dead subscriptions (410/404) are pruned. */
export async function pushToSlim(payload) {
  const list = await subs.all(); let sent = 0;
  await Promise.all(list.map(async (row) => {
    try { await webpush.sendNotification(row.subscription, JSON.stringify(payload), { TTL: 3600, urgency: "high", topic: payload.tag?.slice(0, 32) }); sent++; }
    catch (e) { if (e.statusCode === 410 || e.statusCode === 404) await subs.remove(row.endpoint); else console.warn("push failed:", e.statusCode, e.body || e.message); }
  }));
  return { devices: list.length, sent };
}
