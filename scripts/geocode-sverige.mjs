import { readFileSync, writeFileSync } from "fs";
import { setTimeout as sleep } from "timers/promises";

const INPUT  = `${process.env.HOME}/Desktop/arenaer-sverige-import.json`;
const OUTPUT = `${process.env.HOME}/Desktop/arenaer-sverige-geocoded.json`;
const UA     = "Adience-DataImport/1.0 (lagethune@gmail.com)";

const arenaer = JSON.parse(readFileSync(INPUT, "utf8"));

async function geocode(arena, by, land) {
  const q   = encodeURIComponent(`${arena}, ${by}, ${land}`);
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${q}`;
  const res = await fetch(url, { headers: { "User-Agent": UA, "Accept-Language": "sv,no,en" } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  if (!data.length) return null;
  return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon), display_name: data[0].display_name };
}

// Fallback queries for known tricky arenas
const FALLBACKS = {
  "3Arena (Tele2 Arena)": ["Tele2 Arena, Stockholm, Sverige", "Tele2 Arena, Stockholm"],
  "Rögle IP":             ["Rögle IP, Mjölby", "Mjölby IP, Sverige"],
  "Hitachi Energy Arena": ["Hitachi Energy Arena, Västerås", "Västerås Arena, Sverige"],
  "Platinumcars Arena":   ["Platinumcars Arena, Norrköping", "Norrköping Arena, Sverige"],
  "Falcon Alkoholfri Arena": ["Falkenbergs IP, Sverige", "Falkenberg stadion, Sverige"],
};

const results  = [];
const failures = [];
const seen     = new Map(); // arena → geo (cache shared arenas)

for (let i = 0; i < arenaer.length; i++) {
  const a = arenaer[i];
  process.stdout.write(`[${String(i+1).padStart(2)}/${arenaer.length}] ${a.arena} (${a.by})… `);

  // Use cached result for shared arenas (Gamla Ullevi, Tele2 Arena)
  if (seen.has(a.arena)) {
    const geo = seen.get(a.arena);
    results.push({ ...a, lat: geo.lat, lng: geo.lng, display_name: geo.display_name });
    console.log(`✓  ${geo.lat.toFixed(5)}, ${geo.lng.toFixed(5)}  [delt arena, gjenbrukt]`);
    continue;
  }

  try {
    let geo = await geocode(a.arena, a.by, a.land);

    // Try fallbacks if primary query fails
    if (!geo && FALLBACKS[a.arena]) {
      for (const q of FALLBACKS[a.arena]) {
        await sleep(1100);
        const parts = q.split(", ");
        geo = await geocode(parts[0], parts.slice(1).join(", "), "");
        if (geo) break;
      }
    }

    if (geo) {
      results.push({ ...a, lat: geo.lat, lng: geo.lng, display_name: geo.display_name });
      seen.set(a.arena, geo);
      console.log(`✓  ${geo.lat.toFixed(5)}, ${geo.lng.toFixed(5)}`);
    } else {
      results.push({ ...a, lat: null, lng: null, display_name: null });
      failures.push(a);
      console.log("✗  INGEN TREFF");
    }
  } catch (e) {
    results.push({ ...a, lat: null, lng: null, display_name: null });
    failures.push(a);
    console.log(`✗  FEIL: ${e.message}`);
  }

  if (i < arenaer.length - 1) await sleep(1100);
}

writeFileSync(OUTPUT, JSON.stringify(results, null, 2), "utf8");

console.log("\n─────────────────────────────────────────────");
console.log(`Fullført: ${results.filter(r => r.lat).length}/${arenaer.length} geocodet`);
if (failures.length) {
  console.log(`\nMislykkedes (${failures.length}):`);
  failures.forEach(f => console.log(`  • ${f.arena} (${f.by}) — ${f.liga}`));
} else {
  console.log("Alle geocodet uten feil!");
}
console.log(`\nResultat lagret til: ${OUTPUT}`);
