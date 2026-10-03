// Frontend ↔ Backend boundary. All server calls live here.
// Falls back to localStorage when the API is unreachable so the UI still demos offline.
const BASE = import.meta.env.VITE_API_URL || "/api";
const LS_KEY = "slim_bookings";

const ls = {
  read: () => { try { return JSON.parse(localStorage.getItem(LS_KEY) || "[]"); } catch { return []; } },
  write: (list) => localStorage.setItem(LS_KEY, JSON.stringify(list)),
};

async function http(path, opts) {
  const res = await fetch(BASE + path, { headers: { "Content-Type": "application/json" }, ...opts });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) { const e = new Error(body.error || res.statusText); e.status = res.status; throw e; }
  return body;
}

export const api = {
  async services(fallback) { try { return await http("/services"); } catch { return fallback; } },

  async availability(date) {
    try { return await http(`/availability?date=${date}`); }
    catch { return { date, offline: true, taken: ls.read().filter((b) => b.date === date).map((b) => b.time) }; }
  },

  async createBooking(payload) {
    try {
      const b = await http("/bookings", { method: "POST", body: JSON.stringify(payload) });
      ls.write([...ls.read(), { ...b, proof: payload.proof }]); // mirror locally for the Profile tab
      return { ...b, proof: payload.proof };
    } catch (e) {
      if (e.status) throw e; // real server rejection (e.g. 409 slot taken) — surface it
      const b = { id: crypto.randomUUID(), ...payload, status: "awaiting confirmation", offline: true, createdAt: new Date().toISOString() };
      ls.write([...ls.read(), b]); return b;
    }
  },

  async myBookings(phone) {
    try { if (phone) return await http(`/bookings?phone=${encodeURIComponent(phone)}`); } catch {}
    return ls.read();
  },
};
