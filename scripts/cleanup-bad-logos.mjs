/**
 * cleanup-bad-logos.mjs
 * Removes incorrectly assigned logos from storage and nullifies logo_url.
 */
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://ebzcjomtkfqhbsrngnqb.supabase.co";
const SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImViemNqb210a2ZxaGJzcm5nbnFiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0NjIzMjksImV4cCI6MjA5NTAzODMyOX0.MQZfn4cN1j-lbL6-tUZV_xu5eoaWHhCwbGWemfgEjnc";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Clubs whose uploaded logo is wrong — identified from the run output
const BAD_CLUBS = [
  // Got Commons-logo.svg (Wikipedia UI icon)
  "BK Häcken",
  "Degerfors IF",
  "Falkenbergs FF",
  "Helsingborgs IF",
  "Kalmar FF",
  "Ljungskile SK",
  "Örgryte IS",
  "Sandvikens IF",
  "Västerås SK",
  // Got Norwegian municipal coat of arms instead of club logo
  "Fredrikstad",
  "Kongsvinger",
  "Kristiansund",
  "Lillehammer",
  "Lillestrøm",
  "Molde",
  "Moss",
  "Stavanger Oilers",
  "Ringerike Panthers",
  // Got wrong club's logo (Molde FK)
  "Landskrona BoIS",
  "Östersunds FK",
  // KFUM Oslo: "FC_Oslo_logo" from "Gamle Oslo Fotballklubb" — possibly wrong club era
  "KFUM Oslo",
];

const { data: arenaer, error } = await supabase
  .from("arenaer")
  .select("id, arenanavn, logo_url")
  .not("logo_url", "is", null);

if (error) { console.error(error.message); process.exit(1); }

let cleaned = 0;
for (const arena of arenaer) {
  const klubb = arena.arenanavn.split(" – ")[0].trim();
  if (!BAD_CLUBS.includes(klubb)) continue;

  // Delete from storage
  if (arena.logo_url) {
    const path = arena.logo_url.split("/arena-logoer/").at(-1);
    if (path) {
      const { error: storErr } = await supabase.storage.from("arena-logoer").remove([path]);
      if (storErr) console.warn(`  Storage delete feil for ${klubb}: ${storErr.message}`);
    }
  }

  // Nullify logo_url
  const { error: dbErr } = await supabase.from("arenaer").update({ logo_url: null }).eq("id", arena.id);
  if (dbErr) {
    console.error(`  DB-feil for ${klubb}: ${dbErr.message}`);
  } else {
    console.log(`  ✓ Ryddet: ${klubb}`);
    cleaned++;
  }
}

console.log(`\nFerdig: ${cleaned} logoer ryddet.`);
