import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
const FILE = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "data", "bookings.json");
const readAll = async () => { try { return JSON.parse(await readFile(FILE, "utf8")); } catch { return []; } };
const writeAll = async (l) => { await mkdir(dirname(FILE), { recursive: true }); await writeFile(FILE, JSON.stringify(l, null, 2)); };

export const fileStore = {
  kind: "file",
  list: async () => (await readAll()).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  byId: async (id) => (await readAll()).find((b) => b.id === id) || null,
  byDate: async (date) => (await readAll()).filter((b) => b.date === date && b.status !== "cancelled"),
  byPhone: async (phone) => { const p = phone.replace(/\D/g, ""); return (await readAll()).filter((b) => b.phone.replace(/\D/g, "") === p); },
  async create(data) {
    const list = await readAll();
    const b = { id: randomUUID(), status: "awaiting confirmation", createdAt: new Date().toISOString(), ...data };
    list.push(b); await writeAll(list); return b;
  },
  async update(id, patch) {
    const list = await readAll(); const i = list.findIndex((b) => b.id === id);
    if (i < 0) return null; list[i] = { ...list[i], ...patch, updatedAt: new Date().toISOString() }; await writeAll(list); return list[i];
  },
  // proofs are inline data URLs in dev
  async putProof(id, dataUrl) { return dataUrl; },
  async proofUrl(b) { return b.proof || null; },
};
