from PIL import Image, ImageDraw, ImageFilter, ImageFont
import random, os

W, H = 1920, 1080
BG, CARD, GOLD, WHITE, MUTED = (10, 10, 10), (20, 20, 20), (212, 175, 55), (255, 255, 255), (138, 138, 138)
RAW, OUT = "raw", "slides"
os.makedirs(OUT, exist_ok=True)

def font(name, size, wght=None):
    f = ImageFont.truetype(f"fonts/{name}.ttf", size)
    if wght:
        try: f.set_variation_by_axes([wght] if name == "Playfair" else [14, wght])
        except Exception: pass
    return f

SERIF = lambda s, w=500: font("Playfair", s, w)
SANS = lambda s, w=400: font("Inter", s, w)

def background():
    """Dark slate backdrop with soft gold glow + fine grain."""
    im = Image.new("RGB", (W, H), BG)
    glow = Image.new("RGB", (W, H), BG); g = ImageDraw.Draw(glow)
    g.ellipse((W*0.55, -300, W*1.25, 700), fill=(48, 38, 14))
    g.ellipse((-400, H*0.6, 600, H*1.4), fill=(30, 26, 14))
    glow = glow.filter(ImageFilter.GaussianBlur(220))
    im = Image.blend(im, glow, 0.9)
    noise = Image.effect_noise((W, H), 18).convert("L")
    im = Image.composite(im, Image.new("RGB", (W, H), (0, 0, 0)), noise.point(lambda v: 235 + (v - 128) // 6))
    return im

def phone(shot_path, height=920):
    """Wrap a screenshot in a minimal black phone frame with gold hairline."""
    shot = Image.open(shot_path).convert("RGB")
    ph = height; pw = int(ph * 390 / 844)
    shot = shot.resize((pw, ph), Image.LANCZOS)
    r = int(pw * 0.12); bezel = 14
    fw, fh = pw + bezel*2, ph + bezel*2
    frame = Image.new("RGBA", (fw + 40, fh + 40), (0, 0, 0, 0))
    # shadow
    sh = Image.new("RGBA", frame.size, (0, 0, 0, 0)); sd = ImageDraw.Draw(sh)
    sd.rounded_rectangle((20, 40, 20 + fw, 40 + fh), r + bezel, fill=(0, 0, 0, 170))
    sh = sh.filter(ImageFilter.GaussianBlur(28)); frame.alpha_composite(sh)
    d = ImageDraw.Draw(frame)
    d.rounded_rectangle((20, 20, 20 + fw, 20 + fh), r + bezel, fill=(16, 16, 16), outline=(212, 175, 55, 140), width=2)
    mask = Image.new("L", (pw, ph), 0); ImageDraw.Draw(mask).rounded_rectangle((0, 0, pw, ph), r, fill=255)
    frame.paste(shot, (20 + bezel, 20 + bezel), mask)
    # notch / dynamic island
    d.rounded_rectangle((20 + fw//2 - 55, 20 + bezel + 10, 20 + fw//2 + 55, 20 + bezel + 40), 15, fill=(8, 8, 8))
    return frame

def text(d, xy, s, f, fill=WHITE, anchor="la", spacing=0):
    d.text(xy, s, font=f, fill=fill, anchor=anchor)

def gold_line(d, x, y, w=72): d.rectangle((x, y, x + w, y + 2), fill=GOLD)

def slide(name, title, sub, shots, bullets=None, eyebrow=None, badge=None):
    im = background(); d = ImageDraw.Draw(im)
    # left copy block
    x = 130; y = 250
    if eyebrow: text(d, (x, y - 60), eyebrow.upper(), SANS(20, 500), GOLD)
    text(d, (x, y), title, SERIF(66, 500), WHITE); gold_line(d, x, y + 100)
    ty = y + 135
    for line in sub.split("\n"):
        text(d, (x, ty), line, SANS(26, 400), MUTED); ty += 40
    if bullets:
        ty += 30
        for b in bullets:
            d.ellipse((x, ty + 12, x + 8, ty + 20), fill=GOLD)
            text(d, (x + 26, ty), b, SANS(24, 400), (225, 225, 225)); ty += 46
    # phones on right
    n = len(shots); ph = 900 if n == 1 else 800 if n == 2 else 700
    frames = [phone(f"{RAW}/{s}.png", ph) for s in shots]
    gap = 40; total = sum(f.width for f in frames) + gap*(n-1)
    px = W - 120 - total; py = (H - frames[0].height)//2
    for f in frames: im.alpha_composite(f, (px, py)) if im.mode == "RGBA" else im.paste(f, (px, py), f); px += f.width + gap
    # footer
    text(d, (130, H - 70), "SLIM HAIR STUDIO  •  Booking App", SANS(18, 500), (90, 90, 90))
    text(d, (W - 130, H - 70), badge or name.split("-")[0].upper(), SANS(18, 500), GOLD, anchor="ra")
    im.save(f"{OUT}/{name}.png"); print("✓", name)

# ---------- COVER ----------
def cover():
    im = background(); d = ImageDraw.Draw(im)
    fr = [phone("raw/light-01-hero.png", 640), phone("raw/dark-01-hero.png", 760), phone("raw/dark-06-ecocash.png", 640)]
    xs = [W - 900, W - 660, W - 300]; ys = [(H - f.height)//2 + 40 for f in fr]
    im.paste(fr[0], (xs[0], ys[0]), fr[0]); im.paste(fr[2], (xs[2], ys[2]), fr[2]); im.paste(fr[1], (xs[1], ys[1]), fr[1])
    x, y = 130, 330
    # crown
    d.polygon([(x, y+40), (x+8, y), (x+22, y+22), (x+32, y-6), (x+42, y+22), (x+56, y), (x+64, y+40)], fill=GOLD); d.rectangle((x, y+44, x+64, y+54), fill=GOLD)
    text(d, (x, y + 80), "SLIM HAIR", SERIF(96, 500), GOLD); text(d, (x, y + 190), "STUDIO", SERIF(96, 500), GOLD)
    gold_line(d, x, y + 320, 120)
    text(d, (x, y + 345), "Harare's Premium Cut", SANS(30, 400), WHITE)
    text(d, (x, y + 395), "Luxury barber booking app  •  Homestead Rd, Harare", SANS(22, 400), MUTED)
    text(d, (130, H - 70), "Product Presentation  •  30 Sep 2026", SANS(18, 500), (90, 90, 90))
    im.save(f"{OUT}/00-cover.png"); print("✓ cover")

# ---------- THEME COMPARISON ----------
def themes():
    im = background(); d = ImageDraw.Draw(im)
    text(d, (W//2, 90), "Two Themes. One Brand.", SERIF(60, 500), WHITE, anchor="ma"); gold_line(d, W//2 - 36, 175)
    a, b = phone("raw/light-04-time.png", 760), phone("raw/dark-04-time.png", 760)
    im.paste(a, (W//2 - a.width - 60, 220), a); im.paste(b, (W//2 + 60, 220), b)
    text(d, (W//2 - a.width//2 - 60, H - 60), "LIGHT  •  Minimal", SANS(20, 500), MUTED, anchor="ma")
    text(d, (W//2 + b.width//2 + 60, H - 60), "DARK  •  Gold (default)", SANS(20, 500), GOLD, anchor="ma")
    im.save(f"{OUT}/07-themes.png"); print("✓ themes")

# ---------- FLOW OVERVIEW ----------
def flow():
    im = background(); d = ImageDraw.Draw(im)
    text(d, (W//2, 80), "Booking Flow", SERIF(60, 500), WHITE, anchor="ma"); gold_line(d, W//2 - 36, 165)
    steps = [("dark-02-services", "1  Service"), ("dark-04-time", "2  Date & Time"), ("dark-05-details", "3  Details"), ("dark-06-ecocash", "4  EcoCash"), ("dark-08-success", "5  Booked")]
    fr = [phone(f"raw/{s}.png", 640) for s, _ in steps]
    total = sum(f.width for f in fr) + 30*4; x = (W - total)//2
    for f, (_, lab) in zip(fr, steps):
        im.paste(f, (x, 230), f); text(d, (x + f.width//2, 900), lab, SANS(22, 500), GOLD, anchor="ma"); x += f.width + 30
    im.save(f"{OUT}/08-flow.png"); print("✓ flow")

# ---------- ARCHITECTURE ----------
def arch():
    im = background(); d = ImageDraw.Draw(im)
    text(d, (W//2, 80), "Architecture", SERIF(60, 500), WHITE, anchor="ma"); gold_line(d, W//2 - 36, 165)
    def box(x, y, w, h, title, lines, accent=False):
        d.rounded_rectangle((x, y, x+w, y+h), 24, fill=CARD, outline=GOLD if accent else (50, 50, 50), width=2)
        text(d, (x+36, y+34), title, SERIF(36, 500), GOLD); gold_line(d, x+36, y+90, 48)
        ty = y + 120
        for l in lines: text(d, (x+36, ty), l, SANS(23, 400), (220, 220, 220)); ty += 40
    box(160, 260, 620, 560, "Frontend", ["React 18 + Vite", "Tailwind CSS (dark / light tokens)", "Playfair Display + Inter", "Sticky CTA • bottom nav • PWA-ready", "api/client.js → single API boundary", "Offline fallback to localStorage", "Deploy: Vercel / Netlify"], True)
    box(1140, 260, 620, 560, "Backend", ["Node 20 + Express", "REST: services, availability, bookings", "Validation: Sundays closed, 409 on clash", "EcoCash USSD generator", "Proof-of-payment screenshot storage", "JSON store → Postgres-ready", "Deploy: Railway / Render / Fly"], True)
    # arrow
    d.line((790, 540, 1130, 540), fill=GOLD, width=3); d.polygon([(1130, 540), (1110, 530), (1110, 550)], fill=GOLD); d.polygon([(790, 540), (810, 530), (810, 550)], fill=GOLD)
    text(d, (960, 500), "JSON / HTTPS", SANS(20, 500), GOLD, anchor="ma")
    text(d, (960, 560), "/api/*", SANS(20, 400), MUTED, anchor="ma")
    text(d, (W//2, 880), "EcoCash  •  WhatsApp confirmation by Slim  •  Google Maps pin (-17.864995, 31.111877)", SANS(22, 400), MUTED, anchor="ma")
    im.save(f"{OUT}/09-architecture.png"); print("✓ arch")

cover()
slide("01-hero", "A Fashion-Brand\nFirst Impression", "Full-bleed editorial portrait, gold serif wordmark,\nrating and location at a glance.", ["dark-01-hero"], ["Tom Ford-inspired luxury minimal", "Dark mode default, one-tap light mode", "iPhone-first, safe-area aware"], "01 • Hero")
slide("02-services", "Services & Pricing", "Five services with duration and price.\nGold icon badges, gold ring on selection.", ["dark-02-services"], ["Fade $5 • Beard Trim $3 • Fade + Beard $7", "Dreadlocks $20 • Hair Color $10", "Live progress stepper: Service → Date & Time → Confirm"], "02 • Services")
slide("03-date-time", "Date & Time", "Next 7 days at a glance. Live availability\nfrom the backend — no double bookings.", ["dark-03-date", "dark-04-time"], ["Mon – Sat, 11:00 AM – 6:15 PM", "15-minute lunch at 1:00 PM", "Sundays closed and greyed out"], "03 • Calendar")
slide("04-details", "Customer Details", "Just a name and a WhatsApp number.\nSummary bar keeps the total visible.", ["dark-05-details"], ["Inline validation before payment", "Sticky gold CTA shows live price", "Confirmation arrives on WhatsApp"], "04 • Details")
slide("05-ecocash", "EcoCash Deposit", "Reserve the chair with a deposit.\nUSSD code generated for the exact amount.", ["dark-06-ecocash", "dark-07-proof"], ["*153*1*1*0775430851*5#  — Dial Now or Copy", "Upload payment screenshot (required)", "Slim verifies on WhatsApp"], "05 • Payment")
slide("06-success", "Booked & Tracked", "Instant confirmation, then a personal\nbooking history under Profile.", ["dark-08-success", "dark-09-bookings"], ["Receipt with deposit and proof thumbnail", "Status: awaiting confirmation → confirmed", "Saved on device and on the server"], "06 • Confirmation")
themes(); flow(); arch()
