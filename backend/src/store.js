import { supabaseEnabled } from "./db/supabase.js";
import { fileStore } from "./db/fileStore.js";
import { supabaseStore } from "./db/supabaseStore.js";
export const store = supabaseEnabled ? supabaseStore : fileStore;
