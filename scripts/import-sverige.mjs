import { readFileSync } from "fs";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://ebzcjomtkfqhbsrngnqb.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImViemNqb210a2ZxaGJzcm5nbnFiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0NjIzMjksImV4cCI6MjA5NTAzODMyOX0.MQZfn4cN1j-lbL6-tUZV_xu5eoaWHhCwbGWemfgEjnc";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const arenaer = JSON.parse(
  readFileSync(`${process.env.HOME}/Desktop/arenaer-sverige-geocoded.json`, "utf8")
).filter(a => a.lat && a.lng);

function toRow(a) {
  return {
    arenanavn:       `${a.klubb} – ${a.arena}`,
    kategori:        "Outdoor Sports Venue",
    by:              a.by,
    land:            "Sverige",
    geofence_radius: 200,
    lat:             a.lat,
    lng:             a.lng,
    synlig_i_app:    false,
    streaming_aktiv: false,
  };
}

const SAMPLE  = process.argv.includes("--sample");
const CONFIRM = process.argv.includes("--confirm");

if (SAMPLE) {
  console.log("=== FORHÅNDSVISNING (4 rader) ===\n");
  arenaer.slice(0, 4).map(toRow).forEach(r => console.log(JSON.stringify(r, null, 2)));
  console.log("\nKjør med --confirm for å importere alle 32 arenaer.");
  process.exit(0);
}

if (!CONFIRM) {
  console.log("Bruk --sample for forhåndsvisning, eller --confirm for full import.");
  process.exit(0);
}

console.log(`\nImporterer ${arenaer.length} arenaer til Supabase…\n`);
let ok = 0, fail = 0;

for (const a of arenaer) {
  const row = toRow(a);
  const { error } = await supabase.from("arenaer").insert(row);
  if (error) {
    console.log(`  ✗ ${row.arenanavn}: ${error.message}`);
    fail++;
  } else {
    console.log(`  ✓ ${row.arenanavn}`);
    ok++;
  }
}

console.log(`\n─────────────────────────────────────`);
console.log(`Importert: ${ok}/${arenaer.length}`);
if (fail) console.log(`Feilet:    ${fail}`);
