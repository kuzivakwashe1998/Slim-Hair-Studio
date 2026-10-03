import { useEffect, useRef, useState } from "react";

const SERVICES = [
  { name: "Fade", price: 5, mins: 30, desc: "Skin, low, mid or high. Blended to nothing, lined to the millimetre." },
  { name: "Beard Trim", price: 3, mins: 15, desc: "Shape, line-up and hot-towel finish for a clean, defined jaw." },
  { name: "Fade + Beard", price: 7, mins: 45, desc: "The full reset. Our most-booked service." },
  { name: "Dreadlocks", price: 20, mins: 90, desc: "Retwist, styling and maintenance for healthy, sharp locs." },
  { name: "Hair Color", price: 10, mins: 60, desc: "Premium colour and toning, matched to your skin and style." },
];
const REVIEWS = [
  { name: "Tinashe M.", text: "Cleanest fade in Harare, no debate. Booked on WhatsApp, paid the deposit on EcoCash, in and out in 30 minutes.", stars: 5 },
  { name: "Kuda C.", text: "Slim treats a haircut like tailoring. The studio feels like a fashion house, not a barbershop.", stars: 5 },
  { name: "Rudo N.", text: "My locs have never looked this sharp. Worth every dollar and the drive to Homestead Rd.", stars: 5 },
];
const MAPS = "https://www.google.com/maps/search/?api=1&query=-17.864995,31.111877";
const DIRECTIONS = "https://www.google.com/maps/dir/?api=1&destination=-17.864995,31.111877";
const WA = "https://wa.me/263775430851?text=" + encodeURIComponent("Hi Slim, I'd like to book a cut.");

function useReveal() {
  const ref = useRef(null); const [on, setOn] = useState(false);
  useEffect(() => {
    const el = ref.current; if (!el || !("IntersectionObserver" in window)) { setOn(true); return; }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setOn(true); io.disconnect(); } }, { threshold: 0.05, rootMargin: "0px 0px -5% 0px" });
    io.observe(el);
    const safety = setTimeout(() => setOn(true), 4000); // never leave content hidden
    return () => { io.disconnect(); clearTimeout(safety); };
  }, []);
  return [ref, on];
}
function Reveal({ children, className = "", delay = 0 }) {
  const [ref, on] = useReveal();
  return <div ref={ref} style={{ transitionDelay: `${delay}ms` }} className={`transition-all duration-1000 ease-out ${on ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"} ${className}`}>{children}</div>;
}
function Eyebrow({ children }) { return <div className="flex items-center gap-3 text-gold text-[11px] tracking-[0.35em] uppercase"><span className="h-px w-8 bg-gold" />{children}</div>; }
const Crown = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="#D4AF37"><path d="M3 17l2-10 5 5 2-7 2 7 5-5 2 10zM3 18h18v2H3z" /></svg>;

export default function Website({ theme, onToggleTheme }) {
  const [scrolled, setScrolled] = useState(false); const [menu, setMenu] = useState(false);
  useEffect(() => { const f = () => setScrolled(window.scrollY > 40); f(); window.addEventListener("scroll", f); return () => window.removeEventListener("scroll", f); }, []);
  const nav = [["Services", "#services"], ["The Studio", "#studio"], ["Work", "#work"], ["Reviews", "#reviews"], ["Visit", "#visit"]];

  return (
    <div className="bg-bg text-fg font-sans">
      {/* ---------- NAV ---------- */}
      <header className={`fixed top-0 inset-x-0 z-50 transition-all duration-500 ${scrolled || menu ? "bg-bg/85 backdrop-blur-md border-b border-fg/10 text-fg" : "text-white"}`}>
        <div className="max-w-7xl mx-auto px-6 h-16 md:h-20 flex items-center justify-between">
          <a href="#top" className="flex items-center gap-2.5"><Crown /><span className="font-serif tracking-[0.25em] text-sm md:text-base">SLIM HAIR STUDIO</span></a>
          <nav className="hidden md:flex items-center gap-10">
            {nav.map(([l, h]) => <a key={h} href={h} className={`link-sweep text-[12px] tracking-[0.25em] uppercase transition-colors ${scrolled ? "text-muted hover:text-fg" : "text-white/70 hover:text-white"}`}>{l}</a>)}
          </nav>
          <div className="flex items-center gap-3">
            <button onClick={onToggleTheme} aria-label="Toggle theme" className={`w-9 h-9 rounded-full border flex items-center justify-center text-sm hover:text-gold hover:border-gold ${scrolled || menu ? "border-fg/15 text-muted" : "border-white/30 text-white/80"}`}>{theme === "dark" ? "☀" : "☾"}</button>
            <a href="#/book" className="hidden md:inline-flex bg-gold text-[#0A0A0A] px-6 py-3 text-[11px] font-semibold tracking-[0.3em] uppercase hover:brightness-110 transition">Book Now</a>
            <button onClick={() => setMenu(!menu)} className="md:hidden w-9 h-9 flex flex-col items-center justify-center gap-1.5" aria-label="Menu"><span className={`w-5 h-px bg-current transition ${menu ? "rotate-45 translate-y-[3.5px]" : ""}`} /><span className={`w-5 h-px bg-current transition ${menu ? "-rotate-45 -translate-y-[3.5px]" : ""}`} /></button>
          </div>
        </div>
        {menu && <div className="md:hidden border-t border-fg/10 px-6 py-6 flex flex-col gap-5 bg-bg/95">{nav.map(([l, h]) => <a key={h} href={h} onClick={() => setMenu(false)} className="text-sm tracking-[0.25em] uppercase text-muted">{l}</a>)}<a href="#/book" className="btn-primary text-center py-4 text-[11px] font-semibold tracking-[0.3em] uppercase">Book Now</a></div>}
      </header>

      {/* ---------- HERO ---------- */}
      <section id="top" className="relative min-h-[100svh] flex items-end md:items-center overflow-hidden bg-[#0A0A0A] text-white">
        <img src="/hero.jpg" alt="" className="absolute inset-0 w-full h-full object-cover object-[60%_20%] md:object-[70%_center] scale-105" />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/55 to-black/20 md:bg-gradient-to-r md:from-black md:via-black/70 md:to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-bg to-transparent" />
        <div className="relative max-w-7xl mx-auto px-6 pb-24 md:pb-0 w-full">
          <div className="max-w-2xl">
            <Reveal><Eyebrow>Harare • Homestead Rd</Eyebrow></Reveal>
            <Reveal delay={150}><h1 className="font-serif text-[3.2rem] leading-[0.95] md:text-[6.5rem] tracking-wide mt-6">SLIM<br />HAIR<br />STUDIO</h1></Reveal>
            <Reveal delay={300}><p className="mt-8 text-white/65 text-base md:text-lg max-w-md leading-relaxed">Harare's premium cut. A private studio where a haircut is treated like tailoring — precise, unhurried, yours.</p></Reveal>
            <Reveal delay={450} className="mt-10 flex flex-wrap items-center gap-4">
              <a href="#/book" className="group bg-gold text-[#0A0A0A] shadow-[0_10px_40px_-10px_#D4AF37] hover:brightness-110 inline-flex items-center gap-4 px-8 py-4 text-[11px] font-semibold tracking-[0.3em] uppercase transition">Book Your Chair <span className="h-px w-6 bg-current transition-all group-hover:w-10" /></a>
              <a href="#services" className="link-sweep text-[11px] tracking-[0.3em] uppercase text-white/60 hover:text-white py-4">View services</a>
            </Reveal>
            <Reveal delay={600} className="mt-12 md:mt-14 flex items-center gap-5 md:gap-8 text-[12px] text-white/60">
              <div><span className="text-gold font-serif text-xl md:text-2xl">4.9</span> <span className="text-gold">★</span><div className="tracking-[0.2em] uppercase text-[9px] md:text-[10px] mt-1 whitespace-nowrap">128 reviews</div></div>
              <div className="h-8 w-px bg-white/15" />
              <div><span className="font-serif text-xl md:text-2xl text-white">$5</span><div className="tracking-[0.2em] uppercase text-[9px] md:text-[10px] mt-1 whitespace-nowrap">Signature fade</div></div>
              <div className="h-8 w-px bg-white/15" />
              <div><span className="font-serif text-xl md:text-2xl text-white whitespace-nowrap">Mon – Sat</span><div className="tracking-[0.2em] uppercase text-[9px] md:text-[10px] mt-1 whitespace-nowrap">11am – 7pm</div></div>
            </Reveal>
          </div>
        </div>
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 hidden md:flex flex-col items-center gap-3 text-[10px] tracking-[0.4em] uppercase text-white/40"><span>Scroll</span><span className="w-px h-10 bg-gradient-to-b from-gold to-transparent" /></div>
      </section>

      {/* ---------- SERVICES ---------- */}
      <section id="services" className="max-w-7xl mx-auto px-6 py-24 md:py-36">
        <div className="grid md:grid-cols-12 gap-12">
          <div className="md:col-span-4">
            <Reveal><Eyebrow>Services</Eyebrow><h2 className="font-serif text-4xl md:text-5xl mt-5 leading-tight">The Menu</h2><p className="text-muted mt-5 leading-relaxed">Five things, done properly. Every service includes a consultation, hot towel and a line-up.</p><a href="#/book" className="inline-flex mt-8 btn-primary px-7 py-3.5 text-[11px] font-semibold tracking-[0.3em] uppercase">Book Now</a></Reveal>
          </div>
          <ul className="md:col-span-8 divide-y divide-fg/10 border-y border-fg/10">
            {SERVICES.map((s, i) => (
              <Reveal key={s.name} delay={i * 80}>
                <li className="group flex items-start justify-between gap-6 py-7 hover:pl-3 transition-all duration-500">
                  <div><div className="font-serif text-2xl md:text-3xl group-hover:text-gold transition-colors">{s.name}</div><p className="text-muted text-sm mt-2 max-w-md">{s.desc}</p></div>
                  <div className="text-right shrink-0"><div className="font-serif text-3xl text-gold">${s.price}</div><div className="text-[11px] tracking-[0.2em] uppercase text-muted mt-1">{s.mins} min</div></div>
                </li>
              </Reveal>
            ))}
          </ul>
        </div>
      </section>

      {/* ---------- STUDIO / ABOUT ---------- */}
      <section id="studio" className="bg-card border-y border-fg/5">
        <div className="max-w-7xl mx-auto px-6 py-24 md:py-36 grid md:grid-cols-2 gap-14 items-center">
          <Reveal className="relative">
            <img src="/slim-portrait.jpg" alt="Slim, master barber" className="w-full aspect-[4/5] object-cover" />
            <div className="absolute -bottom-5 -right-3 md:-right-6 bg-bg border border-gold/40 px-6 py-4"><div className="font-serif text-gold text-3xl">10+</div><div className="text-[10px] tracking-[0.25em] uppercase text-muted">Years on the clippers</div></div>
          </Reveal>
          <div>
            <Reveal><Eyebrow>The Studio</Eyebrow><h2 className="font-serif text-4xl md:text-5xl mt-5 leading-tight">One chair.<br />One barber.<br />No rush.</h2></Reveal>
            <Reveal delay={150}><p className="text-muted mt-7 leading-relaxed">Slim Hair Studio is a private, appointment-only studio on Homestead Rd. No queue, no walk-ins over your shoulder — just your slot, your chair and a barber who's been perfecting fades for over a decade.</p><p className="text-muted mt-4 leading-relaxed">Every booking is secured with a small EcoCash deposit, so your time is protected and you're never kept waiting.</p></Reveal>
            <Reveal delay={300} className="mt-10 grid grid-cols-3 gap-6">
              {[["Private", "Appointment only"], ["Precise", "Consultation first"], ["Punctual", "Deposit-secured slots"]].map(([t, d]) => <div key={t} className="border-l border-gold/50 pl-4"><div className="font-serif text-xl">{t}</div><div className="text-[11px] text-muted mt-1">{d}</div></div>)}
            </Reveal>
          </div>
        </div>
      </section>

      {/* ---------- WORK / GALLERY ---------- */}
      <section id="work" className="max-w-7xl mx-auto px-6 py-24 md:py-36">
        <Reveal className="flex items-end justify-between gap-6 mb-12"><div><Eyebrow>Work</Eyebrow><h2 className="font-serif text-4xl md:text-5xl mt-5">Recent Cuts</h2></div><a href="https://instagram.com/slimhairstudio" target="_blank" rel="noreferrer" className="link-sweep hidden md:block text-[11px] tracking-[0.3em] uppercase text-muted hover:text-fg">@slimhairstudio</a></Reveal>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-5">
          {[["/gallery-fade.jpg", "Skin fade", "md:col-span-2 md:row-span-2"], ["/gallery-dreads.jpg", "Dreadlocks"], ["/gallery-studio.jpg", "The chair"], ["/hero.jpg", "Fade + Beard", "md:col-span-2"]].map(([src, cap, cls = ""], i) => (
            <Reveal key={src} delay={i * 100} className={`group relative overflow-hidden ${cls} ${i === 0 ? "col-span-2 aspect-square md:aspect-auto" : "aspect-square"}`}>
              <img src={src} alt={cap} className="w-full h-full object-cover transition-transform duration-[1.5s] group-hover:scale-105" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="absolute bottom-4 left-4 text-white text-[11px] tracking-[0.3em] uppercase translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-500">{cap}</div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ---------- REVIEWS ---------- */}
      <section id="reviews" className="bg-card border-y border-fg/5">
        <div className="max-w-7xl mx-auto px-6 py-24 md:py-36">
          <Reveal className="text-center max-w-xl mx-auto"><div className="flex justify-center"><Eyebrow>Reviews</Eyebrow></div><h2 className="font-serif text-4xl md:text-5xl mt-5">Word on the street</h2><div className="mt-4 text-gold tracking-[0.3em]">★★★★★ <span className="text-muted text-sm tracking-normal ml-2">4.9 from 128 clients</span></div></Reveal>
          <div className="grid md:grid-cols-3 gap-6 mt-14">
            {REVIEWS.map((r, i) => (
              <Reveal key={r.name} delay={i * 120}><blockquote className="h-full bg-bg border border-fg/10 hover:border-gold/50 transition-colors p-8 flex flex-col"><div className="font-serif text-gold text-5xl leading-none">“</div><p className="text-fg/90 leading-relaxed mt-2 flex-1">{r.text}</p><footer className="mt-6 flex items-center justify-between"><span className="text-sm">{r.name}</span><span className="text-gold text-xs tracking-[0.2em]">{"★".repeat(r.stars)}</span></footer></blockquote></Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- VISIT ---------- */}
      <section id="visit" className="max-w-7xl mx-auto px-6 py-24 md:py-36">
        <div className="grid md:grid-cols-2 gap-14">
          <div>
            <Reveal><Eyebrow>Visit</Eyebrow><h2 className="font-serif text-4xl md:text-5xl mt-5 leading-tight">Homestead Rd,<br />Harare</h2></Reveal>
            <Reveal delay={150} className="mt-10 space-y-6 text-sm">
              <div className="flex gap-5"><span className="text-gold text-[10px] tracking-[0.3em] uppercase w-24 pt-1">Hours</span><div><div className="flex justify-between gap-10"><span>Monday – Saturday</span><span className="text-fg">11:00 – 19:00</span></div><div className="flex justify-between gap-10 text-muted mt-1"><span>Sunday</span><span>Closed</span></div><div className="text-muted text-xs mt-2">Last appointment 6:15 PM · Short break 1:00 – 1:15 PM</div></div></div>
              <div className="flex gap-5"><span className="text-gold text-[10px] tracking-[0.3em] uppercase w-24 pt-1">Contact</span><div><a href={WA} target="_blank" rel="noreferrer" className="link-sweep hover:text-gold">WhatsApp +263 77 543 0851</a><div className="mt-1"><a href="https://instagram.com/slimhairstudio" target="_blank" rel="noreferrer" className="link-sweep hover:text-gold">Instagram @slimhairstudio</a></div></div></div>
              <div className="flex gap-5"><span className="text-gold text-[10px] tracking-[0.3em] uppercase w-24 pt-1">Payment</span><div>EcoCash deposit to secure your slot · balance in cash or EcoCash on the day</div></div>
            </Reveal>
            <Reveal delay={300} className="mt-10 flex flex-wrap gap-4">
              <a href="#/book" className="btn-primary btn-primary-glow px-8 py-4 text-[11px] font-semibold tracking-[0.3em] uppercase">Book Your Chair</a>
              <a href={DIRECTIONS} target="_blank" rel="noreferrer" className="border border-gold text-gold px-8 py-4 text-[11px] font-semibold tracking-[0.3em] uppercase hover:bg-gold hover:text-bg transition-colors">Get Directions</a>
            </Reveal>
          </div>
          <Reveal delay={200}>
            <a href={MAPS} target="_blank" rel="noreferrer" className="group block relative aspect-[4/3] md:aspect-auto md:h-full min-h-[320px] bg-card border border-fg/10 overflow-hidden">
              {/* stylised map tile */}
              <svg className="absolute inset-0 w-full h-full opacity-40" viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice"><defs><pattern id="g" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M40 0H0V40" fill="none" stroke="currentColor" strokeWidth=".5" /></pattern></defs><rect width="400" height="300" fill="url(#g)" className="text-fg/30" /><path d="M0 170 C80 150 140 190 220 160 S340 120 400 140" stroke="#D4AF37" strokeWidth="3" fill="none" opacity=".7" /><path d="M120 0 C130 90 110 180 150 300" stroke="currentColor" strokeWidth="2" fill="none" className="text-fg/30" /><path d="M0 60 L400 90" stroke="currentColor" strokeWidth="1.5" className="text-fg/20" /></svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6">
                <span className="relative flex h-5 w-5"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-gold opacity-50" /><span className="relative inline-flex rounded-full h-5 w-5 bg-gold border-2 border-bg" /></span>
                <div className="font-serif text-2xl mt-5">Homestead Rd</div><div className="text-muted text-xs tracking-[0.2em] uppercase mt-1">−17.864995, 31.111877</div>
                <div className="mt-6 text-[11px] tracking-[0.3em] uppercase text-gold group-hover:underline underline-offset-4">Open in Google Maps →</div>
              </div>
            </a>
          </Reveal>
        </div>
      </section>

      {/* ---------- CTA BAND ---------- */}
      <section className="relative overflow-hidden border-y border-fg/5 bg-[#0A0A0A] text-white">
        <img src="/gallery-studio.jpg" alt="" className="absolute inset-0 w-full h-full object-cover opacity-40" />
        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/80 to-black/40" />
        <div className="relative max-w-7xl mx-auto px-6 py-24 md:py-32 text-center">
          <Reveal><Crown /><h2 className="font-serif text-4xl md:text-6xl mt-5">Your chair is waiting.</h2><p className="text-white/60 mt-5 max-w-md mx-auto">Pick a service, choose your time, secure it with a $5 EcoCash deposit. Slim confirms on WhatsApp.</p><a href="#/book" className="inline-flex mt-10 bg-gold text-[#0A0A0A] shadow-[0_10px_40px_-10px_#D4AF37] hover:brightness-110 px-10 py-4 text-[11px] font-semibold tracking-[0.3em] uppercase">Book Now</a></Reveal>
        </div>
      </section>

      {/* ---------- FOOTER ---------- */}
      <footer className="max-w-7xl mx-auto px-6 py-14 grid md:grid-cols-4 gap-10 text-sm">
        <div className="md:col-span-2"><div className="flex items-center gap-2.5"><Crown /><span className="font-serif tracking-[0.25em]">SLIM HAIR STUDIO</span></div><p className="text-muted text-xs mt-4 max-w-xs leading-relaxed">Harare's premium cut. Private, appointment-only barber studio on Homestead Rd.</p></div>
        <div className="text-xs space-y-3"><div className="text-[10px] tracking-[0.3em] uppercase text-muted">Explore</div>{nav.map(([l, h]) => <a key={h} href={h} className="block hover:text-gold">{l}</a>)}<a href="#/book" className="block text-gold">Book Now</a></div>
        <div className="text-xs space-y-3"><div className="text-[10px] tracking-[0.3em] uppercase text-muted">Contact</div><a href={WA} target="_blank" rel="noreferrer" className="block hover:text-gold">+263 77 543 0851</a><a href="https://instagram.com/slimhairstudio" target="_blank" rel="noreferrer" className="block hover:text-gold">@slimhairstudio</a><a href={MAPS} target="_blank" rel="noreferrer" className="block hover:text-gold">Homestead Rd, Harare</a><div className="text-muted">Mon – Sat · 11am – 7pm</div></div>
        <div className="md:col-span-4 border-t border-fg/10 pt-6 flex flex-wrap justify-between gap-3 text-[10px] tracking-[0.25em] uppercase text-fg/30"><span>© {new Date().getFullYear()} Slim Hair Studio</span><a href="#/admin" className="hover:text-gold">Slim's admin</a></div>
      </footer>

      {/* mobile sticky book */}
      <a href="#/book" className="md:hidden fixed bottom-4 inset-x-4 z-40 btn-primary btn-primary-glow text-center py-4 text-[11px] font-semibold tracking-[0.3em] uppercase rounded-2xl">Book Now • from $3</a>
    </div>
  );
}
