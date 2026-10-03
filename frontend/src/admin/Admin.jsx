import { useEffect, useRef, useState } from "react";
import { playDing, unlockAudio } from "./ding.js";
import { pushSupported, registerSW, currentSubscription, enablePush, disablePush, isIOS, isStandalone } from "./push.js";

const BASE = import.meta.env.VITE_API_URL || "/api";
const TOKEN_KEY = "slim_admin_token";
const to12h = (t) => { if (!/^\d\d:\d\d$/.test(t)) return t; const [h, m] = t.split(":").map(Number); return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`; };
const streamUrl = (token) => (BASE.startsWith("http") ? BASE : window.location.origin + BASE) + `/admin/stream?token=${encodeURIComponent(token)}`;

async function api(path, token, opts = {}) {
  const res = await fetch(BASE + path, { ...opts, headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(opts.headers || {}) } });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(body.error || res.statusText), { status: res.status });
  return body;
}

export default function Admin({ theme, onToggleTheme }) {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY) || "");
  if (!token) return <Login onToken={(t) => { localStorage.setItem(TOKEN_KEY, t); setToken(t); }} />;
  return <Dashboard token={token} onLogout={() => { localStorage.removeItem(TOKEN_KEY); setToken(""); }} theme={theme} onToggleTheme={onToggleTheme} />;
}

/* ---------------- LOGIN ---------------- */
function Login({ onToken }) {
  const [phone, setPhone] = useState("+263 77 543 0851");
  const [pin, setPin] = useState("");
  const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setErr("");
    try { unlockAudio(); const { token } = await api("/admin/login", null, { method: "POST", body: JSON.stringify({ phone, pin }) }); onToken(token); }
    catch (e) { setErr(e.message); } finally { setBusy(false); }
  };
  return (
    <div className="min-h-screen bg-bg text-fg flex items-center justify-center p-6">
      <form onSubmit={submit} className="w-full max-w-sm rounded-3xl bg-card border border-gold/30 p-7">
        <div className="font-serif text-gold tracking-[0.2em] text-center text-sm">SLIM HAIR STUDIO</div>
        <h1 className="text-2xl font-semibold text-center mt-2">Slim's Admin</h1>
        <p className="text-muted text-[13px] text-center mt-1">Sign in with your WhatsApp number</p>
        <label className="block mt-6 text-[11px] tracking-[0.2em] uppercase text-muted">WhatsApp number</label>
        <input value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" className="mt-2 w-full rounded-xl bg-bg border border-fg/10 focus:border-gold outline-none px-4 py-3.5" />
        <label className="block mt-4 text-[11px] tracking-[0.2em] uppercase text-muted">PIN</label>
        <input value={pin} onChange={(e) => setPin(e.target.value)} type="password" inputMode="numeric" autoFocus placeholder="••••" className="mt-2 w-full rounded-xl bg-bg border border-fg/10 focus:border-gold outline-none px-4 py-3.5 tracking-[0.5em]" />
        {err && <p className="text-red-400 text-[13px] mt-3 text-center">{err}</p>}
        <button disabled={busy} className="btn-primary btn-primary-glow mt-6 w-full rounded-2xl py-4 font-semibold">{busy ? "Signing in…" : "Sign In"}</button>
        <a href="#/" className="block text-center text-[12px] text-muted mt-4 hover:text-gold">← Back to booking site</a>
      </form>
    </div>
  );
}

/* ---------------- DASHBOARD ---------------- */
function Dashboard({ token, onLogout, theme, onToggleTheme }) {
  const [list, setList] = useState([]); const [err, setErr] = useState("");
  const [live, setLive] = useState("connecting"); const [storeKind, setStoreKind] = useState("");
  const [filter, setFilter] = useState("awaiting confirmation");
  const [sound, setSound] = useState(() => localStorage.getItem("slim_admin_sound") !== "off");
  const [fresh, setFresh] = useState(new Set()); const [toast, setToast] = useState(null);
  const [proofOf, setProofOf] = useState(null);
  const [push, setPush] = useState("unknown"); // unknown | off | on | unsupported
  const [pushMsg, setPushMsg] = useState("");
  const esRef = useRef(null);

  // Background alerts: register SW, detect current state, listen for SW → page messages (chime when app is open)
  useEffect(() => {
    if (!pushSupported()) { setPush("unsupported"); return; }
    registerSW().then(() => currentSubscription()).then((s) => setPush(s ? "on" : "off")).catch(() => setPush("off"));
    const onMsg = (e) => { if (e.data?.type === "slim:push" && sound) playDing(); };
    navigator.serviceWorker.addEventListener("message", onMsg);
    return () => navigator.serviceWorker.removeEventListener("message", onMsg);
  }, [sound]);
  const togglePush = async () => {
    setPushMsg("");
    try {
      if (push === "on") { await disablePush(api, token); setPush("off"); setPushMsg("Alerts off on this phone"); }
      else { const r = await enablePush(api, token); setPush("on"); setPushMsg(`Alerts on • ${r.devices} device${r.devices === 1 ? "" : "s"} enabled`); }
    } catch (e) { setPushMsg(e.message); }
  };
  const testPush = async () => { try { const r = await api("/admin/push/test", token, { method: "POST" }); setPushMsg(r.sent ? `Sent to ${r.sent} device${r.sent === 1 ? "" : "s"} — lock your phone and wait` : "No devices enabled yet"); } catch (e) { setPushMsg(e.message); } };

  const load = async () => { try { setList(await api("/admin/bookings", token)); setErr(""); } catch (e) { setErr(e.message); if (e.status === 401) onLogout(); } };
  useEffect(() => { load(); Notification?.requestPermission?.(); }, []);

  // Live feed → ding
  useEffect(() => {
    const es = new EventSource(streamUrl(token)); esRef.current = es;
    es.addEventListener("hello", (e) => { setLive("live"); setStoreKind(JSON.parse(e.data).store); });
    es.onerror = () => setLive("reconnecting");
    const onBooking = (e) => {
      const { booking, type } = JSON.parse(e.data);
      if (sound) playDing();
      setFresh((s) => new Set([...s, booking.id]));
      setToast(`${booking.name} • ${booking.service} • ${booking.date} ${to12h(booking.time)}`); setTimeout(() => setToast(null), 6000);
      if (document.hidden && Notification.permission === "granted") new Notification("💈 New booking", { body: `${booking.name} — ${booking.service}, ${to12h(booking.time)}`, tag: booking.id });
      if (type !== "booking.test") load();
    };
    es.addEventListener("booking.created", onBooking);
    es.addEventListener("booking.test", onBooking);
    es.addEventListener("booking.updated", () => load());
    return () => es.close();
  }, [token, sound]);

  const setStatus = async (id, status) => { try { await api(`/admin/bookings/${id}`, token, { method: "PATCH", body: JSON.stringify({ status }) }); load(); } catch (e) { setErr(e.message); } };
  const toggleSound = () => { const n = !sound; setSound(n); localStorage.setItem("slim_admin_sound", n ? "on" : "off"); if (n) { unlockAudio(); playDing(); } };
  const testDing = () => { unlockAudio(); api("/admin/test-ding", token, { method: "POST" }); };
  const wa = (b) => `https://wa.me/${b.phone.replace(/\D/g, "").replace(/^0/, "263")}?text=${encodeURIComponent(`Hi ${b.name}, Slim here 💈 Your ${b.service} on ${b.date} at ${to12h(b.time)} is confirmed. See you at Homestead Rd!`)}`;

  const shown = list.filter((b) => filter === "all" || b.status === filter);
  const counts = { "awaiting confirmation": 0, confirmed: 0, cancelled: 0 }; list.forEach((b) => counts[b.status] = (counts[b.status] || 0) + 1);

  return (
    <div className="min-h-screen bg-bg text-fg">
      <header className="sticky top-0 z-30 bg-bg/90 backdrop-blur-md border-b border-fg/10">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-full bg-gold flex items-center justify-center font-serif text-bg">S</span>
            <div><div className="font-semibold leading-tight">Slim's Admin</div><div className="text-[10px] text-muted uppercase tracking-[0.15em]">{storeKind === "supabase" ? "Supabase" : "Local store"} • <span className={live === "live" ? "text-emerald-400" : "text-amber-400"}>{live}</span></div></div>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={toggleSound} title="Ding on new booking" className={`w-9 h-9 rounded-full border flex items-center justify-center ${sound ? "border-gold text-gold" : "border-fg/15 text-muted"}`}>{sound ? "🔔" : "🔕"}</button>
            <button onClick={onToggleTheme} className="w-9 h-9 rounded-full border border-fg/15 text-muted flex items-center justify-center">{theme === "dark" ? "☀️" : "🌙"}</button>
            <button onClick={onLogout} className="text-[12px] text-muted hover:text-gold px-2">Log out</button>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 pb-24">
        {/* summary */}
        <div className="grid grid-cols-3 gap-3 mt-5">
          {[["awaiting confirmation", "Awaiting", "text-gold"], ["confirmed", "Confirmed", "text-emerald-400"], ["cancelled", "Cancelled", "text-muted"]].map(([k, l, c]) => (
            <button key={k} onClick={() => setFilter(k)} className={`rounded-2xl bg-card border p-4 text-left ${filter === k ? "border-gold" : "border-fg/[0.06]"}`}>
              <div className={`font-serif text-3xl ${c}`}>{counts[k] || 0}</div><div className="text-[11px] text-muted uppercase tracking-[0.15em] mt-1">{l}</div>
            </button>
          ))}
        </div>
        {/* background alerts */}
        <div className={`mt-4 rounded-2xl border p-4 ${push === "on" ? "border-emerald-500/40 bg-emerald-500/5" : "border-gold/40 bg-gold/5"}`}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="font-semibold text-[15px]">{push === "on" ? "📳 Alerts on — even when closed" : push === "unsupported" ? "Alerts not supported here" : "🔕 Get alerts when the app is closed"}</div>
              <div className="text-[12px] text-muted mt-0.5">{push === "on" ? "New bookings buzz this phone with the Slim pattern and open straight to the booking." : isIOS() && !isStandalone() ? "iPhone: Share → Add to Home Screen, open it, then enable." : "Push notification with the signature Slim vibration."}</div>
            </div>
            {push !== "unsupported" && <button onClick={togglePush} className={`shrink-0 rounded-xl px-4 py-2.5 text-[13px] font-semibold ${push === "on" ? "border border-fg/15 text-muted" : "btn-primary btn-primary-glow"}`}>{push === "on" ? "Turn off" : "Enable"}</button>}
          </div>
          {(pushMsg || push === "on") && <div className="flex items-center justify-between mt-3 text-[12px]"><span className="text-muted">{pushMsg}</span>{push === "on" && <button onClick={testPush} className="text-gold">Send test alert</button>}</div>}
        </div>

        <div className="flex items-center justify-between mt-5">
          <button onClick={() => setFilter("all")} className={`text-[12px] ${filter === "all" ? "text-gold" : "text-muted"}`}>Show all ({list.length})</button>
          <button onClick={testDing} className="text-[12px] text-muted hover:text-gold">Test ding ♪</button>
        </div>
        {err && <p className="mt-3 rounded-xl border border-red-400/30 bg-red-400/5 px-4 py-3 text-red-300 text-[13px]">{err}</p>}

        {/* list */}
        <ul className="mt-3 space-y-3">
          {shown.length === 0 && <li className="rounded-2xl bg-card border border-fg/[0.06] py-12 text-center text-muted text-sm">Nothing here yet.</li>}
          {shown.map((b) => (
            <li key={b.id} className={`rounded-2xl bg-card border p-4 transition-all ${fresh.has(b.id) ? "border-gold shadow-[0_0_30px_-10px_#D4AF37]" : "border-fg/[0.06]"}`} onClick={() => setFresh((s) => { const n = new Set(s); n.delete(b.id); return n; })}>
              <div className="flex items-start gap-3">
                <button onClick={() => b.hasProof && setProofOf(b)} className="w-14 h-14 rounded-xl bg-gold/10 border border-gold/30 flex items-center justify-center text-gold text-[10px] uppercase tracking-wider shrink-0">{b.hasProof ? "Proof" : "—"}</button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2"><span className="font-semibold truncate">{b.name}</span><span className="font-serif text-gold text-lg">${b.deposit}</span></div>
                  <div className="text-[13px] text-muted">{b.service} • {b.date} • <span className="text-fg">{to12h(b.time)}</span></div>
                  <div className="text-[12px] text-muted mt-0.5">{b.phone}</div>
                  <div className={`text-[10px] uppercase tracking-[0.15em] mt-1 ${b.status === "confirmed" ? "text-emerald-400" : b.status === "cancelled" ? "text-muted" : "text-gold"}`}>{b.status}{fresh.has(b.id) && " • NEW"}</div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 mt-3">
                <a href={wa(b)} target="_blank" rel="noreferrer" className="rounded-xl border border-emerald-500/50 text-emerald-400 py-2.5 text-center text-[12px] font-medium">WhatsApp</a>
                {b.status !== "confirmed" ? <button onClick={() => setStatus(b.id, "confirmed")} className="btn-primary rounded-xl py-2.5 text-[12px] font-semibold">Confirm</button>
                  : <button onClick={() => setStatus(b.id, "awaiting confirmation")} className="rounded-xl border border-fg/15 py-2.5 text-[12px]">Un-confirm</button>}
                {b.status !== "cancelled" ? <button onClick={() => setStatus(b.id, "cancelled")} className="rounded-xl border border-fg/15 text-muted py-2.5 text-[12px]">Cancel</button>
                  : <button onClick={() => setStatus(b.id, "awaiting confirmation")} className="rounded-xl border border-fg/15 py-2.5 text-[12px]">Restore</button>}
              </div>
            </li>
          ))}
        </ul>
      </main>

      {toast && <div className="fixed bottom-6 inset-x-4 z-40 mx-auto max-w-md rounded-2xl bg-card border border-gold px-4 py-3 shadow-[0_10px_40px_-10px_#D4AF37] animate-pop"><div className="text-[11px] uppercase tracking-[0.2em] text-gold">💈 New booking</div><div className="text-[14px] mt-0.5">{toast}</div></div>}

      {proofOf && (
        <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4" onClick={() => setProofOf(null)}>
          <div className="max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
            <div className="text-center text-muted text-[12px] mb-2">{proofOf.name} • EcoCash ${proofOf.deposit}</div>
            <img src={`${BASE}/admin/bookings/${proofOf.id}/proof?token=${encodeURIComponent(token)}`} alt="EcoCash proof" className="w-full rounded-2xl border border-gold/40" />
            <button onClick={() => setProofOf(null)} className="mt-3 w-full rounded-2xl border border-fg/20 py-3 text-sm">Close</button>
          </div>
        </div>
      )}
    </div>
  );
}
