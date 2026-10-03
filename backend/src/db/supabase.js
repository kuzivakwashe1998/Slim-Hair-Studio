import { createClient } from "@supabase/supabase-js";
const url = process.env.SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
export const supabaseEnabled = Boolean(url && key);
export const supabase = supabaseEnabled ? createClient(url, key, { auth: { persistSession: false } }) : null;
export const PROOF_BUCKET = "proofs";
