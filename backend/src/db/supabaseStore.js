import { supabase, PROOF_BUCKET } from "./supabase.js";

const toApi = (r) => r && ({
  id: r.id, name: r.name, phone: r.phone, serviceId: r.service_id, service: r.service,
  price: Number(r.price), deposit: Number(r.deposit), payment: r.payment, ussd: r.ussd,
  date: r.date, time: r.time, status: r.status, proofPath: r.proof_path, createdAt: r.created_at, updatedAt: r.updated_at,
});
const toRow = (b) => ({
  name: b.name, phone: b.phone, service_id: b.serviceId, service: b.service, price: b.price, deposit: b.deposit,
  payment: b.payment, ussd: b.ussd, date: b.date, time: b.time, proof_path: b.proofPath ?? null, status: b.status ?? "awaiting confirmation",
});
const q = () => supabase.from("bookings");
const must = ({ data, error }) => { if (error) throw Object.assign(new Error(error.message), { code: error.code }); return data; };

export const supabaseStore = {
  kind: "supabase",
  list: async () => must(await q().select("*").order("created_at", { ascending: false })).map(toApi),
  byId: async (id) => toApi(must(await q().select("*").eq("id", id).maybeSingle())),
  byDate: async (date) => must(await q().select("*").eq("date", date).neq("status", "cancelled")).map(toApi),
  byPhone: async (phone) => must(await q().select("*").eq("phone", phone.trim()).order("created_at", { ascending: false })).map(toApi),
  async create(b) {
    try { return toApi(must(await q().insert(toRow(b)).select().single())); }
    catch (e) { if (e.code === "23505") throw Object.assign(new Error("Slot already booked"), { status: 409 }); throw e; }
  },
  async update(id, patch) { return toApi(must(await q().update(patch).eq("id", id).select().maybeSingle())); },

  /** Upload a data-URL screenshot to private storage; returns object path. */
  async putProof(id, dataUrl) {
    const [meta, b64] = dataUrl.split(","); const mime = meta.match(/data:(.*?);/)?.[1] || "image/jpeg";
    const ext = mime.split("/")[1].replace("jpeg", "jpg"); const path = `${new Date().toISOString().slice(0, 10)}/${id}.${ext}`;
    const { error } = await supabase.storage.from(PROOF_BUCKET).upload(path, Buffer.from(b64, "base64"), { contentType: mime, upsert: true });
    if (error) throw new Error(error.message);
    await q().update({ proof_path: path }).eq("id", id);
    return path;
  },
  /** Short-lived signed URL so only Slim (via the API) can view it. */
  async proofUrl(b) {
    if (!b.proofPath) return null;
    const { data, error } = await supabase.storage.from(PROOF_BUCKET).createSignedUrl(b.proofPath, 60 * 10);
    if (error) throw new Error(error.message); return data.signedUrl;
  },
};
