import { readFileSync } from "fs";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://ebzcjomtkfqhbsrngnqb.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImViemNqb210a2ZxaGJzcm5nbnFiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0NjIzMjksImV4cCI6MjA5NTAzODMyOX0.MQZfn4cN1j-lbL6-tUZV_xu5eoaWHhCwbGWemfgEjnc";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const arenaer = JSON.parse(
  readFileSync(`${process.env.HOME}/Desktop/arenaer-norge-geocoded.json`, "utf8")
).filter(a => a.lat && a.lng);

function toRow(a) {
  return {
    arenanavn:       `${a.klubb} – ${a.arena}`,
    kategori:        a.kategori === "fotball" ? "Outdoor Sports Venue" : "Indoor Sports Venue",
    by:              a.by,
    land:            "Norge",
    geofence_radius: 200,
    lat:             a.lat,
    lng:             a.lng,
    kapasitet:       a.kapasitet ? String(a.kapasitet) : null,
    synlig_i_app:    false,
    streaming_aktiv: false,
  };
}

const DRY_RUN = process.argv.includes("--dry-run");
const SAMPLE  = process.argv.includes("--sample");

if (DRY_RUN || SAMPLE) {
  const sample = arenaer.slice(0, 4).map(toRow);
  console.log("=== FORHÅNDSVISNING (4 rader) ===\n");
  sample.forEach(r => console.log(JSON.stringify(r, null, 2)));
  if (SAMPLE) {
    console.log("\nKjør med --confirm for å importere alle 42 arenaer.");
    process.exit(0);
  }
}

if (!process.argv.includes("--confirm") && !DRY_RUN) {
  console.log("Bruk --sample for forhåndsvisning, eller --confirm for full import.");
  process.exit(0);
}

if (process.argv.includes("--confirm")) {
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
}
