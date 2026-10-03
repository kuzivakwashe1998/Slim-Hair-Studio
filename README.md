# SLIM HAIR STUDIO — Booking App

```
slim-hair-studio/
├── frontend/   React + Vite + Tailwind  (what customers see)
└── backend/    Node + Express API       (bookings, availability, EcoCash info)
```

## Routes
| URL | What |
|---|---|
| `/` | **Marketing website** — hero, menu, studio, gallery, reviews, visit/map, CTA (desktop + mobile, dark/light) |
| `/#/book` | **Booking app** — services → date → time → details → EcoCash → confirmation |
| `/#/admin` | **Slim's admin** — login, live feed + chime, push alerts, confirm/cancel, proofs |

## Frontend  (`frontend/`)
| Path | Purpose |
|---|---|
| `src/site/Website.jsx` | Marketing website (landing page) |
| `src/App.jsx` | Router + booking app UI: hero, services, stepper, calendar, time slots, details, EcoCash modal, proof upload, success, bottom nav, My Bookings |
| `src/api/client.js` | **Only** place that talks to the backend. Falls back to localStorage if API is down |
| `src/index.css` / `tailwind.config.js` | Brand tokens (#0A0A0A / #141414 / #D4AF37), Playfair + Inter, gold animations |
| `public/hero.jpg`, `public/favicon.svg` | Hero image, "S" monogram favicon |
| `vite.config.js` | Dev proxy `/api` → `http://localhost:4000` |

```bash
cd frontend && npm install && npm run dev      # http://localhost:5173
# production: npm run build  → deploy dist/ to Vercel/Netlify, set VITE_API_URL=https://your-api/api
```

## Backend  (`backend/`)
| Path | Purpose |
|---|---|
| `src/server.js` | Express app, CORS, JSON (5 MB for screenshots) |
| `src/routes.js` | REST endpoints + validation (Sundays closed, double-booking = 409, proof required) |
| `src/store.js` | JSON-file storage in `data/bookings.json` — swap for Postgres/Supabase here |
| `src/config.js` | Services & prices, time slots, closed days, Slim's EcoCash number |

```bash
cd backend && npm install && npm run dev       # http://localhost:4000/api
```

### API
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/health` | Liveness |
| GET | `/api/services` | Service list with prices |
| GET | `/api/availability?date=YYYY-MM-DD` | Slots with `available` flag (or `closed: true`) |
| GET | `/api/payment-info?amount=5` | EcoCash number + USSD string |
| POST | `/api/bookings` | Create booking `{name, phone, serviceId, date, time, proof}` |
| GET | `/api/bookings?phone=…` | Customer's bookings (no phone = all, for Slim) |
| GET | `/api/bookings/:id/proof` | View the EcoCash screenshot |
| PATCH | `/api/bookings/:id` | Slim sets `status: confirmed / cancelled` |

Booking object: `{ id, name, phone, serviceId, service, price, deposit, payment:"EcoCash", ussd, date, time, status, createdAt }`

## Slim's Admin  (`/#/admin`)
Login = Slim's WhatsApp number (+263 77 543 0851) + PIN (`ADMIN_PIN` in backend `.env`). Session token lasts 30 days.
- Live feed via Server-Sent Events → **signature 3-note gold chime + vibration + browser notification** the instant a booking lands
- Counters (Awaiting / Confirmed / Cancelled), NEW highlight, one-tap **WhatsApp** reply with a pre-written confirmation, Confirm / Cancel
- View EcoCash proof (signed URL, admin only) • "Test ding ♪" button • Install as an app via **Add to Home Screen**
- **Background alerts (Web Push):** tap *Enable* once → every new booking pushes a notification to Slim's phone even when the app/browser is closed,
  with the signature "S-L-I-M" vibration pattern, stays on screen until tapped, and opens straight to the booking. Multiple devices supported.
  On iPhone: Share → Add to Home Screen first (iOS 16.4+), then enable inside the installed app.

## Go-live with Supabase (Postgres + Storage)
1. Create a project at supabase.com → SQL editor → run `backend/supabase/schema.sql`
   (creates `bookings` table with unique slot index, RLS, realtime, and the private `proofs` bucket).
2. `cp backend/.env.example backend/.env` and fill in `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, a new `ADMIN_PIN`, and a long `JWT_SECRET`.
3. Restart the API — health check shows `"store": "supabase"`. Screenshots now go to Storage; only the object path is in Postgres.
4. Set `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` (`npx web-push generate-vapid-keys`) so push subscriptions survive redeploys. Requires HTTPS in production.
5. Optional WhatsApp push to Slim on every booking: set `WHATSAPP_TOKEN` + `WHATSAPP_PHONE_ID` (Meta Cloud API).

### Admin API
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/admin/login` | `{phone, pin}` → `{token}` |
| GET | `/api/admin/bookings?date=&status=` | All bookings |
| PATCH | `/api/admin/bookings/:id` | `{status}` confirmed / cancelled / awaiting confirmation |
| GET | `/api/admin/bookings/:id/proof` | EcoCash screenshot (signed URL on Supabase) |
| GET | `/api/admin/stream?token=` | SSE live feed: `booking.created`, `booking.updated` |
| POST | `/api/admin/test-ding` | Fires a test event |
| GET | `/api/admin/push/public-key` | VAPID public key |
| POST/DELETE | `/api/admin/push/subscribe` | Register / remove this device |
| GET | `/api/admin/push/devices` | Devices with alerts on |
| POST | `/api/admin/push/test` | Send a test push to all devices |

## Next steps
- Swap PIN login for Supabase Auth phone-OTP delivered over WhatsApp (Twilio provider) — `auth.js` is the only file to change
- Reminders to customers 1h before their slot
