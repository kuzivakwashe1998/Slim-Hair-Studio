// Admin = Slim. Login requires his WhatsApp number + a secret PIN → signed session token (HMAC, 30 days).
// Upgrade path: swap `verifyCredentials` for Supabase Auth phone OTP delivered over WhatsApp (Twilio provider).
import { createHmac, timingSafeEqual } from "node:crypto";
import { ADMIN_WHATSAPP, ADMIN_PIN, JWT_SECRET } from "./config.js";

const norm = (p) => { let d = (p || "").replace(/\D/g, ""); if (d.startsWith("0")) d = "263" + d.slice(1); return d; };
const b64 = (s) => Buffer.from(s).toString("base64url");
const sign = (body) => createHmac("sha256", JWT_SECRET).update(body).digest("base64url");

export function verifyCredentials(phone, pin) {
  const okPhone = norm(phone) === norm(ADMIN_WHATSAPP);
  const a = Buffer.from(String(pin || "")), b = Buffer.from(String(ADMIN_PIN));
  const okPin = a.length === b.length && timingSafeEqual(a, b);
  return okPhone && okPin;
}
export function issueToken() {
  const body = b64(JSON.stringify({ sub: norm(ADMIN_WHATSAPP), role: "admin", exp: Date.now() + 30 * 864e5 }));
  return `${body}.${sign(body)}`;
}
export function verifyToken(token) {
  if (!token || !token.includes(".")) return null;
  const [body, sig] = token.split(".");
  const expect = sign(body);
  if (sig.length !== expect.length || !timingSafeEqual(Buffer.from(sig), Buffer.from(expect))) return null;
  const p = JSON.parse(Buffer.from(body, "base64url").toString());
  return p.exp > Date.now() && p.role === "admin" ? p : null;
}
export function requireAdmin(req, res, next) {
  const token = req.headers.authorization?.replace(/^Bearer /, "") || req.query.token;
  const p = verifyToken(token);
  if (!p) return res.status(401).json({ error: "Admin login required" });
  req.admin = p; next();
}
