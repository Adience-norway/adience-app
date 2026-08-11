/**
 * set-pilotarena-badge.mjs
 * Uploads the shared Ådience pilot badge and sets it as logo_url on all arenas.
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";

const SUPABASE_URL = "https://ebzcjomtkfqhbsrngnqb.supabase.co";
const SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImViemNqb210a2ZxaGJzcm5nbnFiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0NjIzMjksImV4cCI6MjA5NTAzODMyOX0.MQZfn4cN1j-lbL6-tUZV_xu5eoaWHhCwbGWemfgEjnc";

const BADGE_PATH = `${process.env.HOME}/Desktop/adience-pilotarena-badge.png`;
const STORAGE_FILENAME = "standard-pilotarena-badge.png";
const BUCKET = "arena-logoer";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// 1. Upload badge
console.log(`Laster opp ${STORAGE_FILENAME}…`);
const file = readFileSync(BADGE_PATH);
const { error: uploadErr } = await supabase.storage
  .from(BUCKET)
  .upload(STORAGE_FILENAME, file, { contentType: "image/png", upsert: true });

if (uploadErr) {
  console.error("Opplasting feilet:", uploadErr.message);
  process.exit(1);
}

// 2. Get public URL
const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(STORAGE_FILENAME);
console.log(`Public URL: ${publicUrl}\n`);

// 3. Fetch all 74 demo arenas (synlig_i_app = false = the imports)
const { data: arenaer, error: fetchErr } = await supabase
  .from("arenaer")
  .select("id, arenanavn")
  .eq("synlig_i_app", false)
  .order("arenanavn");

if (fetchErr) { console.error("Fetch feilet:", fetchErr.message); process.exit(1); }
console.log(`Oppdaterer ${arenaer.length} arenaer…\n`);

// 4. Update all in one batch UPDATE
const { error: updateErr, count } = await supabase
  .from("arenaer")
  .update({ logo_url: publicUrl })
  .eq("synlig_i_app", false);

if (updateErr) {
  console.error("Batch-oppdatering feilet:", updateErr.message);
  process.exit(1);
}

// 5. Verify
const { data: updated } = await supabase
  .from("arenaer")
  .select("id")
  .eq("logo_url", publicUrl);

console.log(`✓ ${updated?.length ?? "?"} arenaer oppdatert med standard pilotarena-badge.`);
