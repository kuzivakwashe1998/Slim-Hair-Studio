import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "./api/client.js";
import Admin from "./admin/Admin.jsx";
import Website from "./site/Website.jsx";

/* ---------------- CONFIG ---------------- */
// Slim's EcoCash number (+263 77 543 0851) in local USSD format
const ECOCASH_NUMBER = "0775430851";
const ussdFor = (amount) => `*153*1*1*${ECOCASH_NUMBER}*${amount}#`;

const SERVICES = [
  { id: "fade", name: "Fade", price: 5, mins: 30, desc: "Classic fade cut", icon: "clipper" },
  { id: "beard", name: "Beard Trim", price: 3, mins: 15, desc: "Shape & trim", icon: "razor" },
  { id: "fade-beard", name: "Fade + Beard", price: 7, mins: 45, desc: "Full fresh-up", icon: "combo" },
  { id: "dreads", name: "Dreadlocks", price: 20, mins: 90, desc: "Dreadlock styling & maintenance", icon: "dreads" },
  { id: "color", name: "Hair Color", price: 10, mins: 60, desc: "Premium colour treatment", icon: "color" },
];

const SLOTS = ["11:00", "11:30", "12:00", "12:30", "13:15", "13:45", "14:15", "14:45", "15:15", "15:45", "16:15", "16:45", "17:15", "17:45", "18:15"]; // 11am–7pm, 15-min lunch 13:00–13:15
// Demo "already booked" slots, only used when the API is offline
const DEMO_BOOKED = { 0: ["11:30", "15:15"], 1: ["12:00"], 2: ["13:45", "17:15"], 3: [], 4: ["11:00", "18:15"], 5: ["16:45"], 6: ["14:15"] };

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTHS_LONG = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const isClosed = (d) => d.getDay() === 0; // Sundays closed

const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const loadBookings = () => { try { return JSON.parse(localStorage.getItem("slim_bookings") || "[]"); } catch { return []; } };
const to12h = (t) => { const [h, m] = t.split(":").map(Number); return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`; };

const compressImage = (file, max = 900, q = 0.8) => new Promise((res, rej) => {
  const url = URL.createObjectURL(file); const img = new Image();
  img.onload = () => {
    const r = Math.min(1, max / Math.max(img.width, img.height));
    const c = document.createElement("canvas"); c.width = img.width * r; c.height = img.height * r;
    c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
    URL.revokeObjectURL(url); res(c.toDataURL("image/jpeg", q));
  };
  img.onerror = rej; img.src = url;
});

/* ---------------- ICONS ---------------- */
const I = {
  clipper: <path d="M9 3h6v5H9zM8 8h8l1 3H7zM8 11h8v9a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1zM10 5h1M13 5h1M12 14v4" />,
  razor: <path d="M8 3h8v7H8zM11 10h2v10l-1 1-1-1zM10 6h4" />,
  combo: <path d="M6 5l5 5M6 19l5-5M11 10l7-7M11 14l7 7M4 4h.01M4 20h.01M14 12h6" />,
  dreads: <path d="M12 3c-4 0-7 3-7 7v2M12 3c4 0 7 3 7 7v2M9 6v14M12 5v16M15 6v14M6 12v7M18 12v7" />,
  color: <path d="M12 3s6 7 6 11a6 6 0 0 1-12 0c0-4 6-11 6-11zM9 15a3 3 0 0 0 3 3" />,
  crown: <path d="M3 17l2-10 5 5 2-7 2 7 5-5 2 10zM3 17h18v3H3z" />,
  pin: <path d="M12 21s7-6 7-11a7 7 0 1 0-14 0c0 5 7 11 7 11zM12 12a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" />,
  clock: <path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2" />,
  home: <path d="M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" />,
  cal: <path d="M4 5h16v15H4zM4 10h16M8 3v4M16 3v4" />,
  scissors: <path d="M6 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM6 21a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM20 4L8.1 15.9M14.5 14.5L20 20M8.1 8.1L12 12" />,
  user: <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0" />,
  check: <path d="M5 12l5 5L20 7" />,
  camera: <path d="M3 8h4l2-3h6l2 3h4v12H3zM12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" />,
  ig: <path d="M7 3h10a4 4 0 0 1 4 4v10a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V7a4 4 0 0 1 4-4zM12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM17.5 6.5h.01" />,
};
const Icon = ({ n, size = 20, className = "", stroke = "currentColor", fill = "none" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={stroke} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={className}>{I[n]}</svg>
);

const GOLD_GRAD = "btn-primary";

/* ---------------- APP ---------------- */
export default function App() {
  const today = useMemo(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; }, []);
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => { const d = new Date(today); d.setDate(d.getDate() + i); return d; }), [today]);
  const firstOpen = days.findIndex((d) => !isClosed(d));

  const [service, setService] = useState(null);
  const [dayIdx, setDayIdx] = useState(firstOpen);
  const selected = days[dayIdx];
  const [time, setTime] = useState(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [bookings, setBookings] = useState(loadBookings);
  const [taken, setTaken] = useState(new Set());
  const [apiOffline, setApiOffline] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState("");
  const [pending, setPending] = useState(null);
  const [success, setSuccess] = useState(null);
  const [copied, setCopied] = useState(false);
  const [proof, setProof] = useState(null);
  const [proofErr, setProofErr] = useState(false);
  const [tab, setTab] = useState("home");
  const [theme, setTheme] = useState(() => localStorage.getItem("slim_theme") || "dark");
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem("slim_theme", theme);
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", theme === "dark" ? "#0A0A0A" : "#FFFFFF");
  }, [theme]);
  const toggleTheme = () => setTheme((t) => (t === "dark" ? "light" : "dark"));
  const [route, setRoute] = useState(() => window.location.hash);
  useEffect(() => { const f = () => { setRoute(window.location.hash); if (/^#\/(book|admin)/.test(window.location.hash) || window.location.hash === "" ) window.scrollTo(0, 0); }; window.addEventListener("hashchange", f); return () => window.removeEventListener("hashchange", f); }, []);
  if (route.startsWith("#/admin")) return <Admin theme={theme} onToggleTheme={toggleTheme} />;
  if (!route.startsWith("#/book")) return <Website theme={theme} onToggleTheme={toggleTheme} />;
  const [shake, setShake] = useState(false);
  const fileRef = useRef(null);
  const detailsRef = useRef(null);
  const timeRef = useRef(null);

  const selectedDate = iso(selected);
  const bookedForDay = taken;

  // Load availability from the backend whenever the day changes (or after a booking)
  useEffect(() => {
    let live = true;
    api.availability(selectedDate).then((a) => {
      if (!live) return;
      if (a.offline) { setApiOffline(true); setTaken(new Set([...(DEMO_BOOKED[dayIdx] || []), ...a.taken])); }
      else { setApiOffline(false); setTaken(new Set(a.slots.filter((s) => !s.available).map((s) => s.time))); }
    });
    return () => { live = false; };
  }, [selectedDate, bookings.length]);

  useEffect(() => { setTime(null); }, [selectedDate]);

  const price = service?.price ?? 0;
  const detailsOk = name.trim().length > 1 && phone.replace(/\D/g, "").length >= 9;
  const valid = service && time && detailsOk;
  const step = !service ? 1 : !time ? 2 : 3;
  const fmtDay = (d) => `${DAYS[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()}`;

  const scrollTo = (ref) => ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });

  const book = () => {
    if (!valid) {
      setShake(true); setTimeout(() => setShake(false), 500);
      if (!service) window.scrollTo({ top: 0, behavior: "smooth" }); else if (!time) scrollTo(timeRef); else scrollTo(detailsRef);
      return;
    }
    setPending({ name: name.trim(), service: service.name, date: selectedDate, time, phone: phone.trim(), price });
  };
  const onProof = async (e) => { const f = e.target.files?.[0]; if (!f) return; try { setProof(await compressImage(f)); setProofErr(false); } catch { setProofErr(true); } };
  const confirmPaid = async () => {
    if (!proof) { setProofErr(true); return; }
    setSubmitting(true); setApiError("");
    try {
      const booking = await api.createBooking({ name: pending.name, phone: pending.phone, serviceId: service.id, service: pending.service, price: pending.price, deposit: pending.price, payment: "EcoCash", date: pending.date, time: pending.time, proof });
      console.log("Booking:", { ...booking, proof: "[image]" });
      setBookings(loadBookings());
      setPending(null); setSuccess(booking); setProof(null);
    } catch (e) {
      setApiError(e.message || "Booking failed");
      if (e.status === 409) { setPending(null); setTime(null); }
    } finally { setSubmitting(false); }
  };
  const copyUssd = async (code) => { try { await navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch {} };
  const reset = () => { setSuccess(null); setProof(null); setProofErr(false); setTime(null); setName(""); setPhone(""); setService(null); setDayIdx(firstOpen); window.scrollTo({ top: 0, behavior: "smooth" }); };

  const myBookings = [...bookings].reverse();

  return (
    <div className="min-h-screen bg-bg text-fg">
      {/* Phone-shell on desktop, full-bleed on mobile */}
      <div className="relative mx-auto w-full max-w-md md:my-6 md:rounded-[2.2rem] md:border md:border-fg/10 md:shadow-[0_30px_80px_-20px_rgba(0,0,0,.9)] md:overflow-hidden bg-bg min-h-screen md:min-h-[calc(100vh-3rem)]">

        {tab === "home" && (
          <>
            {/* ---------- HERO ---------- */}
            <section className="relative h-[46svh] min-h-[340px] max-h-[460px] w-full">
              <img src="/hero.jpg" alt="Slim Hair Studio" className="absolute inset-0 w-full h-full object-cover object-[50%_18%]" />
              <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/20 to-bg" />
              <ThemeToggle theme={theme} onToggle={toggleTheme} className="absolute top-[max(0.9rem,env(safe-area-inset-top))] right-4" />
              <a href="#/" className="absolute top-[max(0.9rem,env(safe-area-inset-top))] left-4 z-20 h-10 px-4 rounded-full border border-gold/50 bg-bg/60 backdrop-blur-md flex items-center gap-2 text-gold text-[11px] tracking-[0.2em] uppercase hover:bg-gold hover:text-bg transition-all">← Site</a>
              <div className="absolute inset-x-0 bottom-0 px-6 pb-2 text-center">
                <h1 className="font-serif text-[1.75rem] leading-none tracking-[0.06em] text-gold whitespace-nowrap inline-flex items-center justify-center gap-2 animate-fadeUp">
                  <Icon n="crown" size={20} className="text-gold shrink-0" /><span>SLIM HAIR STUDIO</span>
                </h1>
                <p className="mt-3 text-[13px] text-muted animate-fadeUp [animation-delay:.15s]">
                  Premium Barber • 4.9 <span className="text-gold">★</span> (128 reviews) • Homestead Rd
                </p>
                <p className="mt-1 text-[11px] tracking-[0.3em] uppercase text-fg/50 animate-fadeUp [animation-delay:.3s]">Harare's Premium Cut</p>
              </div>
            </section>

            <main className="px-5 pb-44">
              {/* ---------- SERVICES ---------- */}
              <section className="pt-6">
                <h2 className="text-[22px] font-semibold tracking-tight mb-4">Services</h2>
                <ul className="space-y-3">
                  {SERVICES.map((s) => {
                    const active = service?.id === s.id;
                    return (
                      <li key={s.id}>
                        <button onClick={() => { setService(s); }} className={`w-full text-left rounded-2xl bg-card border px-4 py-4 flex items-center gap-4 transition-all duration-300 ${active ? "border-gold shadow-[0_0_0_1px_#D4AF37,0_0_30px_-10px_#D4AF37]" : "border-fg/[0.06] hover:border-fg/20 active:scale-[.99]"}`}>
                          <span className={`shrink-0 w-12 h-12 rounded-full flex items-center justify-center transition-colors bg-gold`}>
                            <Icon n={s.icon} size={22} stroke="#0A0A0A" />
                          </span>
                          <span className="flex-1 min-w-0">
                            <span className="block text-[17px] font-semibold tracking-tight">{s.name}</span>
                            <span className="block text-[12px] text-muted mt-0.5 truncate">{s.mins}min • {s.desc}</span>
                          </span>
                          <span className="text-right shrink-0">
                            <span className="block font-serif text-2xl text-gold leading-none">${s.price}</span>
                            <span className="block text-[12px] text-muted mt-1">{s.mins}min</span>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </section>

              {/* ---------- BOOKING FLOW ---------- */}
              <section className="pt-8">
                <h2 className="text-[13px] font-semibold tracking-[0.2em] uppercase text-center mb-4">Booking Flow</h2>
                <Stepper step={step} />
              </section>

              {/* ---------- DATE ---------- */}
              <section className="pt-8" ref={timeRef}>
                <h2 className="text-[22px] font-semibold tracking-tight mb-4">Select Date</h2>
                <div className="flex gap-3 overflow-x-auto no-scrollbar -mx-5 px-5 pb-2 snap-x">
                  {days.map((d, i) => {
                    const active = dayIdx === i; const isToday = i === 0; const closed = isClosed(d);
                    return (
                      <button key={i} disabled={closed} onClick={() => setDayIdx(i)} className={`snap-start shrink-0 w-[4.6rem] py-4 rounded-2xl flex flex-col items-center gap-1 border transition-all duration-300 ${closed ? "border-fg/5 bg-card/40 text-fg/25 cursor-not-allowed" : active ? "btn-primary border-transparent btn-primary-glow" : isToday ? "border-gold/60 bg-card text-gold" : "border-fg/10 bg-card text-fg hover:border-gold/50"}`}>
                        <span className="text-[10px] tracking-[0.25em] uppercase opacity-80">{isToday ? "Today" : DAYS[d.getDay()]}</span>
                        <span className={`font-serif text-2xl leading-none ${closed ? "line-through decoration-fg/20" : ""}`}>{d.getDate()}</span>
                        <span className="text-[10px] tracking-[0.2em] uppercase opacity-80">{closed ? "Closed" : MONTHS[d.getMonth()]}</span>
                      </button>
                    );
                  })}
                </div>
              </section>

              {/* ---------- TIME ---------- */}
              <section className="pt-8">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-[22px] font-semibold tracking-tight">Select Time</h2>
                  <span className="flex items-center gap-1.5 text-[12px] text-muted"><Icon n="clock" size={14} className="text-gold" /> {fmtDay(selected)}</span>
                </div>
                {isClosed(selected) ? (
                  <div className="rounded-2xl bg-card border border-fg/[0.06] py-8 text-center text-muted text-sm">Slim rests on Sundays. Pick another day.</div>
                ) : (
                  <div className="flex flex-wrap gap-2.5">
                    {SLOTS.map((t) => {
                      const booked = bookedForDay.has(t); const active = time === t;
                      return (
                        <button key={t} disabled={booked} onClick={() => setTime(t)} className={`px-4 py-3 rounded-xl text-[15px] font-medium border transition-all duration-300 ${booked ? "border-fg/5 bg-card/40 text-fg/20 line-through cursor-not-allowed" : active ? `${GOLD_GRAD} border-transparent text-bg font-semibold shadow-[0_0_24px_-6px_#D4AF37]` : "border-fg/15 bg-card text-fg hover:border-gold/60"}`}>
                          {to12h(t)}
                        </button>
                      );
                    })}
                  </div>
                )}
              </section>

              {apiError && !pending && <p className="mt-4 rounded-xl border border-red-400/30 bg-red-400/5 px-4 py-3 text-center text-red-300 text-[13px]">{apiError}</p>}

              {/* ---------- DETAILS ---------- */}
              <section className="pt-8" ref={detailsRef}>
                <h2 className="text-[22px] font-semibold tracking-tight mb-4">Your Details</h2>
                <div className={`space-y-3 ${shake ? "animate-[shake_.4s_ease]" : ""}`}>
                  <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" className="w-full rounded-xl bg-card border border-fg/10 focus:border-gold outline-none px-4 py-4 text-[15px] placeholder:text-fg/25 transition-colors" />
                  <input value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" inputMode="tel" placeholder="WhatsApp number  •  +263 77 000 0000" className="w-full rounded-xl bg-card border border-fg/10 focus:border-gold outline-none px-4 py-4 text-[15px] placeholder:text-fg/25 transition-colors" />
                </div>
                {service && (
                  <div className="mt-4 rounded-2xl bg-card border border-fg/[0.06] px-4 py-3 flex items-center justify-between text-[13px]">
                    <span className="text-muted">{service.name} • {fmtDay(selected)}{time ? ` • ${to12h(time)}` : ""}</span>
                    <span className="font-serif text-gold text-lg">${price}</span>
                  </div>
                )}
              </section>

              {/* ---------- FOOTER ---------- */}
              <footer className="pt-10 pb-4 text-center text-[12px] text-muted space-y-2">
                <div className="font-serif text-gold tracking-[0.25em] text-sm">SLIM HAIR STUDIO</div>
                {apiOffline && <p className="text-[10px] uppercase tracking-[0.2em] text-fg/25">Offline demo · bookings saved on this device</p>}
                <a href="https://www.google.com/maps/search/?api=1&query=-17.864995,31.111877" target="_blank" rel="noreferrer" className="flex items-center justify-center gap-1.5 hover:text-gold transition-colors"><Icon n="pin" size={13} className="text-gold" /> Homestead Rd, Harare, Zimbabwe</a>
                <a href="https://www.google.com/maps/dir/?api=1&destination=-17.864995,31.111877" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-full border border-gold/50 px-3 py-1 text-[11px] text-gold hover:bg-gold hover:text-bg transition-colors">Get Directions</a>
                <p className="flex items-center justify-center gap-1.5"><Icon n="clock" size={13} className="text-gold" /> Mon – Sat • 11am – 7pm • Closed Sundays</p>
                <a href="https://instagram.com/slimhairstudio" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 hover:text-gold transition-colors"><Icon n="ig" size={13} className="text-gold" /> @slimhairstudio</a>
                <p><a href="#/admin" className="text-[10px] uppercase tracking-[0.2em] text-fg/25 hover:text-gold">Slim's admin</a></p>
              </footer>
            </main>
          </>
        )}

        {tab === "bookings" && (
          <main className="px-5 pt-14 pb-32 min-h-screen">
            <ThemeToggle theme={theme} onToggle={toggleTheme} className="absolute top-[max(0.9rem,env(safe-area-inset-top))] right-4" />
            <h1 className="font-serif text-gold text-2xl tracking-[0.08em] text-center">My Bookings</h1>
            <p className="text-center text-muted text-[12px] mt-1">Saved on this device</p>
            {myBookings.length === 0 ? (
              <div className="mt-10 rounded-2xl bg-card border border-fg/[0.06] py-12 text-center text-muted text-sm">No bookings yet.<br /><button onClick={() => setTab("home")} className="text-gold mt-3 underline underline-offset-4">Book your first cut</button></div>
            ) : (
              <ul className="mt-6 space-y-3">
                {myBookings.map((b, i) => (
                  <li key={i} className="rounded-2xl bg-card border border-fg/[0.06] p-4 flex gap-4 items-center">
                    {b.proof ? <img src={b.proof} alt="" className="w-14 h-14 rounded-xl object-cover border border-gold/30" /> : <span className="w-14 h-14 rounded-xl bg-gold/10 flex items-center justify-center"><Icon n="scissors" size={20} className="text-gold" /></span>}
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold">{b.service} <span className="font-serif text-gold ml-1">${b.price}</span></div>
                      <div className="text-[12px] text-muted mt-0.5">{b.date} • {to12h(b.time)}</div>
                      <div className="text-[11px] text-gold/80 mt-1 uppercase tracking-[0.15em]">{b.status || "awaiting confirmation"}</div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </main>
        )}

        {/* ---------- STICKY CTA + BOTTOM NAV ---------- */}
        {tab === "home" && (
          <div className="fixed md:absolute bottom-0 inset-x-0 z-40 mx-auto max-w-md">
            <div className="px-5 pt-6 pb-3 bg-gradient-to-t from-bg via-bg/95 to-transparent">
              <button onClick={book} className={`w-full rounded-2xl py-4 text-[17px] font-semibold text-bg transition-all duration-300 active:scale-[.99] ${GOLD_GRAD} ${valid ? "btn-primary-glow hover:brightness-105" : "opacity-90"}`}>
                {service ? `Confirm Booking — $${price}` : "Book Now"}
              </button>
              <p className="text-center text-[11px] text-muted mt-2">{valid ? "You'll receive a confirmation via WhatsApp" : !service ? "Select a service to begin" : !time ? "Select a time" : "Enter your name & WhatsApp number"}</p>
            </div>
            <BottomNav tab={tab} setTab={setTab} onServices={() => window.scrollTo({ top: 0, behavior: "smooth" })} onCalendar={() => scrollTo(timeRef)} />
          </div>
        )}
        {tab !== "home" && (
          <div className="fixed md:absolute bottom-0 inset-x-0 z-40 mx-auto max-w-md">
            <BottomNav tab={tab} setTab={setTab} />
          </div>
        )}

        {/* ---------- ECOCASH PAYMENT ---------- */}
        {pending && (() => { const code = ussdFor(pending.price); return (
          <div className="fixed inset-0 z-50 bg-bg/80 backdrop-blur-sm flex items-end md:items-center justify-center" onClick={() => setPending(null)}>
            <div onClick={(e) => e.stopPropagation()} className="relative bg-card border border-fg/10 w-full max-w-md rounded-t-3xl md:rounded-3xl max-h-[92svh] overflow-y-auto no-scrollbar p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] animate-pop">
              <div className="mx-auto w-10 h-1 rounded-full bg-fg/15 mb-5 md:hidden" />
              <button onClick={() => setPending(null)} className="absolute top-4 right-5 text-muted hover:text-fg text-2xl leading-none">×</button>
              <div className="text-[11px] tracking-[0.3em] uppercase text-gold">Step 3 • Confirm</div>
              <h3 className="text-2xl font-semibold tracking-tight mt-1">Reserve Your Chair</h3>
              <p className="text-muted text-sm mt-1">Pay <span className="text-fg font-medium">${pending.price} deposit</span> to confirm via EcoCash</p>

              <div className="mt-5 rounded-2xl bg-bg border border-gold/30 px-4 py-4">
                <div className="text-[10px] tracking-[0.3em] uppercase text-muted">Dial on your phone</div>
                <div className="font-serif text-2xl text-gold tracking-wider mt-1 break-all">{code}</div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <a href={`tel:${encodeURIComponent(code)}`} className="rounded-xl border border-gold text-gold py-3 text-center text-[13px] font-medium hover:bg-gold hover:text-bg transition-colors">Dial Now</a>
                <button onClick={() => copyUssd(code)} className="rounded-xl border border-fg/15 py-3 text-[13px] font-medium hover:border-gold transition-colors">{copied ? "Copied ✓" : "Copy Code"}</button>
              </div>

              <div className="mt-5 rounded-2xl bg-bg/60 px-4 py-3 text-[13px] text-muted space-y-1">
                <p className="flex justify-between"><span>Service</span><span className="text-fg">{pending.service}</span></p>
                <p className="flex justify-between"><span>When</span><span className="text-fg">{fmtDay(selected)} • {to12h(pending.time)}</span></p>
                <p className="flex justify-between"><span>Deposit</span><span className="text-gold font-serif text-base">${pending.price}</span></p>
              </div>

              <div className="mt-5">
                <div className="text-[11px] tracking-[0.2em] uppercase text-muted mb-2">Payment Confirmation <span className="text-gold">*</span></div>
                <input ref={fileRef} type="file" accept="image/*" onChange={onProof} className="hidden" />
                {proof ? (
                  <div className="rounded-2xl border border-gold/60 bg-bg p-2.5 flex items-center gap-3">
                    <img src={proof} alt="Payment confirmation" className="w-16 h-16 rounded-xl object-cover" />
                    <div className="flex-1 text-[13px]"><div className="text-gold">Screenshot attached ✓</div><button onClick={() => fileRef.current?.click()} className="text-muted underline underline-offset-2 hover:text-fg mt-1">Change</button></div>
                    <button onClick={() => setProof(null)} className="text-muted hover:text-fg px-2 text-xl leading-none">×</button>
                  </div>
                ) : (
                  <button onClick={() => fileRef.current?.click()} className={`w-full rounded-2xl border border-dashed py-6 flex flex-col items-center gap-2 transition-colors ${proofErr ? "border-red-400/70 bg-red-400/5" : "border-fg/20 hover:border-gold/60 bg-bg"}`}>
                    <span className="w-10 h-10 rounded-full bg-gold flex items-center justify-center"><Icon n="camera" size={18} stroke="#0A0A0A" /></span>
                    <span className="text-[13px] text-fg/85">Upload EcoCash confirmation screenshot</span>
                    <span className="text-[11px] text-muted">Camera or gallery</span>
                  </button>
                )}
                {proofErr && !proof && <p className="text-red-400/90 text-[11px] mt-2">Please attach your payment screenshot</p>}
              </div>

              {apiError && <p className="mt-4 text-center text-red-400/90 text-[12px]">{apiError}</p>}
              <button onClick={confirmPaid} disabled={submitting} className={`mt-5 w-full rounded-2xl py-4 text-[16px] font-semibold text-bg transition-all ${GOLD_GRAD} ${proof && !submitting ? "btn-primary-glow" : "opacity-50"}`}>{submitting ? "Sending…" : "I've Paid • Confirm"}</button>
              <p className="text-center text-[11px] text-muted mt-3">Slim verifies payment on WhatsApp</p>
            </div>
          </div>
        ); })()}

        {/* ---------- SUCCESS ---------- */}
        {success && (
          <div className="fixed inset-0 z-50 bg-bg/85 backdrop-blur-sm flex items-center justify-center p-6" onClick={reset}>
            <div onClick={(e) => e.stopPropagation()} className="bg-card border border-gold/40 w-full max-w-sm rounded-3xl p-8 text-center animate-pop">
              <div className={`mx-auto w-16 h-16 rounded-full ${GOLD_GRAD} flex items-center justify-center mb-5 shadow-[0_0_40px_-8px_#D4AF37]`}><Icon n="check" size={26} /></div>
              <h3 className="text-2xl font-semibold tracking-tight">Booked!</h3>
              <p className="text-muted text-sm mt-1">Slim will confirm on WhatsApp</p>
              <div className="mt-5 rounded-2xl bg-bg/60 px-4 py-3 text-[13px] space-y-1 text-left">
                <p className="flex justify-between text-muted"><span>Service</span><span className="text-fg">{success.service}</span></p>
                <p className="flex justify-between text-muted"><span>When</span><span className="text-fg">{fmtDay(selected)} • {to12h(success.time)}</span></p>
                <p className="flex justify-between text-muted"><span>Deposit</span><span className="text-gold">${success.deposit} • EcoCash</span></p>
              </div>
              {success.proof && <img src={success.proof} alt="" className="mx-auto mt-4 h-20 w-20 rounded-xl object-cover border border-gold/40" />}
              <button onClick={reset} className={`mt-6 w-full rounded-2xl py-3.5 text-[15px] font-semibold text-bg ${GOLD_GRAD}`}>Done</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------------- SUB-COMPONENTS ---------------- */
function ThemeToggle({ theme, onToggle, className = "" }) {
  const dark = theme === "dark";
  return (
    <button onClick={onToggle} aria-label={dark ? "Switch to light mode" : "Switch to dark mode"} className={`z-20 w-10 h-10 rounded-full border border-gold/50 bg-bg/60 backdrop-blur-md flex items-center justify-center text-gold hover:bg-gold hover:text-bg transition-all ${className}`}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        {dark ? <><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></> : <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />}
      </svg>
    </button>
  );
}

function Stepper({ step }) {
  const steps = ["Service", "Date & Time", "Confirm"];
  return (
    <div className="flex items-center">
      {steps.map((label, i) => {
        const n = i + 1; const done = step > n; const active = step === n;
        return (
          <div key={label} className="flex items-center flex-1 last:flex-none">
            <div className="flex items-center gap-2 shrink-0">
              <span className={`w-6 h-6 rounded-full text-[12px] font-semibold flex items-center justify-center transition-all ${done || active ? `${GOLD_GRAD} text-bg` : "border border-fg/20 text-muted"}`}>{done ? "✓" : n}</span>
              <span className={`text-[13px] font-medium ${active ? "text-fg" : done ? "text-gold" : "text-muted"}`}>{label}</span>
            </div>
            {i < steps.length - 1 && (
              <div className="flex-1 mx-3 h-px bg-fg/10 relative overflow-hidden">
                <span className={`absolute inset-y-0 left-0 bg-gold transition-all duration-700 ${done ? "w-full" : "w-0"}`} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function BottomNav({ tab, setTab, onServices, onCalendar }) {
  const items = [
    { id: "home", label: "Home", icon: "home", fn: () => { setTab("home"); window.scrollTo({ top: 0, behavior: "smooth" }); } },
    { id: "calendar", label: "Calendar", icon: "cal", fn: () => { setTab("home"); setTimeout(() => onCalendar?.(), 50); } },
    { id: "services", label: "Services", icon: "scissors", fn: () => { setTab("home"); setTimeout(() => onServices?.(), 50); } },
    { id: "bookings", label: "Profile", icon: "user", fn: () => setTab("bookings") },
  ];
  return (
    <nav className="bg-bg/95 backdrop-blur-md border-t border-fg/[0.07] px-2 pt-2 pb-[max(0.6rem,env(safe-area-inset-bottom))]">
      <div className="grid grid-cols-4">
        {items.map((it) => {
          const active = tab === it.id || (it.id === "home" && tab === "home");
          return (
            <button key={it.id} onClick={it.fn} className={`flex flex-col items-center gap-1 py-1 text-[11px] transition-colors ${active ? "text-gold" : "text-muted hover:text-fg"}`}>
              <Icon n={it.icon} size={20} fill={active && it.id === "home" ? "#D4AF37" : "none"} />
              {it.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
