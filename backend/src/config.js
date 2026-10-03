import "dotenv/config";
export const PORT = process.env.PORT || 4000;
export const ECOCASH_NUMBER = process.env.ECOCASH_NUMBER || "0775430851";          // Slim: +263 77 543 0851
export const ADMIN_WHATSAPP = process.env.ADMIN_WHATSAPP || "+263775430851";        // admin identity = Slim's WhatsApp
export const ADMIN_PIN = process.env.ADMIN_PIN || "2468";                            // ⚠️ change in .env
export const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";
export const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN || "";                      // Meta Cloud API (optional)
export const WHATSAPP_PHONE_ID = process.env.WHATSAPP_PHONE_ID || "";
export const SLOTS = ["11:00", "11:30", "12:00", "12:30", "13:15", "13:45", "14:15", "14:45", "15:15", "15:45", "16:15", "16:45", "17:15", "17:45", "18:15"]; // 11am–7pm, 15-min lunch 13:00–13:15
export const CLOSED_WEEKDAYS = [0]; // Sunday
export const SERVICES = [
  { id: "fade", name: "Fade", price: 5, mins: 30, desc: "Classic fade cut", icon: "clipper" },
  { id: "beard", name: "Beard Trim", price: 3, mins: 15, desc: "Shape & trim", icon: "razor" },
  { id: "fade-beard", name: "Fade + Beard", price: 7, mins: 45, desc: "Full fresh-up", icon: "combo" },
  { id: "dreads", name: "Dreadlocks", price: 20, mins: 90, desc: "Dreadlock styling & maintenance", icon: "dreads" },
  { id: "color", name: "Hair Color", price: 10, mins: 60, desc: "Premium colour treatment", icon: "color" },
];
