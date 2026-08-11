/**
 * fetch-wikipedia-logos.mjs
 *
 * Finds club crests on Wikipedia/Wikimedia Commons and uploads them to
 * Supabase Storage, then updates logo_url for each arena.
 *
 * Usage:
 *   --test     Run on first 5 Norwegian arenas (quality check)
 *   --confirm  Run for real on all arenas without logo_url
 *   --dry-run  Fetch images but skip upload/DB update
 *   --id <uuid>  Run on one specific arena
 */

import { createClient } from "@supabase/supabase-js";
import { setTimeout as sleep } from "timers/promises";

const SUPABASE_URL = "https://ebzcjomtkfqhbsrngnqb.supabase.co";
const SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImViemNqb210a2ZxaGJzcm5nbnFiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0NjIzMjksImV4cCI6MjA5NTAzODMyOX0.MQZfn4cN1j-lbL6-tUZV_xu5eoaWHhCwbGWemfgEjnc";
const UA       = "Adience-LogoFetch/1.0 (lagethune@gmail.com)";
const DELAY_MS = 1300;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ── CLI flags ──────────────────────────────────────────────────────────────
const args      = process.argv.slice(2);
const TEST_MODE = args.includes("--test");
const CONFIRM   = args.includes("--confirm");
const DRY_RUN   = args.includes("--dry-run");
const SINGLE_ID = args.includes("--id") ? args[args.indexOf("--id") + 1] : null;

if (!TEST_MODE && !CONFIRM && !DRY_RUN && !SINGLE_ID) {
  console.log(`
Usage:
  --test           Run on first 5 Norwegian arenas (quick quality check)
  --dry-run        Fetch images, print results, no upload/DB changes
  --confirm        Run on all arenas without logo_url
  --id <uuid>      Run on one specific arena
  --dry-run can be combined with --test or --confirm
`);
  process.exit(0);
}

// ── Scoring helpers ────────────────────────────────────────────────────────

// Filenames that indicate a club badge/logo
const LOGO_TERMS   = ["logo", "crest", "emblem", "badge", "wappen", "skjold", "merke", "shield", "blazon", "seal"];
// Substrings that disqualify an image (not club logos)
const REJECT_TERMS = [
  // Wikipedia/MediaWiki UI icons
  "oojs", "ooui", "icon", "pictogram", "symbol",
  // Generic Wikipedia templates
  "kaptan", "commons-logo", "wikipedia", "question", "edit-ltr", "edit-rtl",
  // Maps / road signs
  "kart", "map", "plassering", "grafikk", "graph", "chart", "diagram",
  "stamvei", "fylkesvei", "riksvei", "motorvei", "europavei", "route",
  "football_pictogram", "soccerball",
  // City/country imagery
  "byvåpen", "coat_of_arms", "riksvåpen", "fylkesvåpen",
  // Stadiums
  "stadion", "stadium", "arena", "ground",
  // People / photos
  "photo", "foto", "portrait", "headshot",
  // Kit / apparel
  "kit", "shirt", "jersey", "uniform",
  // Misc
  "flag", "flagg", "trophy", "cup", "medal",
];
// Minimum score to accept an image (prevents picking the "best of bad options")
const MIN_SCORE = 3;

function normName(s) {
  return s.toLowerCase().replace(/[_\-\s]/g, " ").replace(/\.(svg|png|jpg|jpeg|gif|webp)$/i, "").trim();
}

function scoreImage(fileName, ext, klubb) {
  const norm      = normName(fileName);
  const klubbNorm = klubb.toLowerCase().replace(/[^a-z0-9æøå ]/g, "").trim();
  const words     = klubbNorm.split(/\s+/).filter(w => w.length > 2);

  // Hard rejects — any reject term disqualifies the image immediately
  for (const t of REJECT_TERMS) {
    if (norm.includes(t)) return -999;
  }

  let score = 0;

  // Logo keyword in filename — the clearest positive signal
  const hasLogoKeyword = LOGO_TERMS.some(t => norm.includes(t));
  if (hasLogoKeyword) score += 7;

  // Club name words in filename
  const clubWordMatches = words.filter(w => norm.includes(w)).length;
  score += clubWordMatches * 5;

  // Format: SVG is almost always intentional (vector logos), PNG is ok
  if (ext === "svg") score += 2;
  else if (ext === "png") score += 1;

  // Penalty for filenames that look like auto-generated/numbered assets
  if (/\d{4,}/.test(norm)) score -= 4;

  return score;
}

// ── Wikipedia API ──────────────────────────────────────────────────────────

function wikiLang(land) {
  return land === "Sverige" ? "sv" : "no";
}

async function wikiApi(lang, params) {
  const url = new URL(`https://${lang}.wikipedia.org/w/api.php`);
  url.searchParams.set("format", "json");
  url.searchParams.set("formatversion", "2");
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url.toString(), {
    headers: { "User-Agent": UA, "Accept-Language": `${lang},en` },
  });
  if (!res.ok) throw new Error(`Wikipedia HTTP ${res.status}`);
  return res.json();
}

/**
 * Search Wikipedia for a club article.
 * Returns { title } or null.
 */
async function findArticle(klubb, lang) {
  const queries = [
    `${klubb} fotballklubb`,
    `${klubb} FK`,
    `${klubb}`,
  ];

  for (const q of queries) {
    const data = await wikiApi(lang, {
      action: "query",
      list: "search",
      srsearch: q,
      srlimit: "5",
      srnamespace: "0",
    });
    const hits = data?.query?.search ?? [];

    const klubbLow = klubb.toLowerCase();
    const match =
      hits.find(h => h.title.toLowerCase() === klubbLow) ??
      hits.find(h => h.title.toLowerCase().includes(klubbLow)) ??
      hits.find(h => klubbLow.includes(h.title.toLowerCase().split(" ")[0])) ??
      hits[0];

    if (match) return { title: match.title };
    await sleep(400);
  }
  return null;
}

/**
 * Get the Wikipedia "page image" — editors manually set this as the article's
 * main representative image, usually the club crest.
 */
async function getPageImage(title, lang) {
  const data = await wikiApi(lang, {
    action: "query",
    prop: "pageimages",
    piprop: "original|name",
    titles: title,
  });
  const page = data?.query?.pages?.[0];
  if (!page || page.missing || !page.original?.source) return null;

  const url      = page.original.source;
  const fileName = page.pageimage ?? url.split("/").pop();
  const ext      = fileName.split(".").pop().toLowerCase();
  return { fileName, url, ext };
}

/**
 * Scan all images listed in the article and pick the best candidate logo.
 * Resolves the winner to a direct download URL via imageinfo.
 */
async function scanPageImages(title, lang, klubb) {
  const data = await wikiApi(lang, {
    action: "query",
    prop: "images",
    titles: title,
    imlimit: "50",
  });
  const imgs = data?.query?.pages?.[0]?.images ?? [];

  // Score all candidates
  const candidates = imgs
    .map(img => {
      const raw = img.title.replace(/^(File|Fil|Bild):/i, "");
      const ext = raw.split(".").pop().toLowerCase();
      if (!["svg", "png"].includes(ext)) return null;
      const s = scoreImage(raw, ext, klubb);
      if (s < MIN_SCORE) return null;    // reject if no meaningful positive signal
      return { raw, ext, score: s, title: img.title };
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score);

  if (!candidates.length) return null;

  // Resolve top candidate to a direct URL
  const best    = candidates[0];
  const infoRes = await wikiApi(lang, {
    action: "query",
    prop: "imageinfo",
    iiprop: "url",
    titles: best.title,
  });
  const fileUrl = infoRes?.query?.pages?.[0]?.imageinfo?.[0]?.url;
  if (!fileUrl) return null;

  return { fileName: best.raw, url: fileUrl, ext: best.ext, score: best.score };
}

// ── Image download + Supabase upload ──────────────────────────────────────

const MIME = { svg: "image/svg+xml", png: "image/png" };

async function downloadImage(url) {
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`Download HTTP ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

async function uploadToStorage(arenaId, buffer, ext) {
  const path        = `${arenaId}-wikipedia-logo.${ext}`;
  const contentType = MIME[ext] ?? "image/png";
  const { error }   = await supabase.storage
    .from("arena-logoer")
    .upload(path, buffer, { contentType, upsert: true });
  if (error) throw new Error(`Storage: ${error.message}`);
  return supabase.storage.from("arena-logoer").getPublicUrl(path).data.publicUrl;
}

async function updateLogoUrl(arenaId, logoUrl) {
  const { error } = await supabase.from("arenaer").update({ logo_url: logoUrl }).eq("id", arenaId);
  if (error) throw new Error(`DB: ${error.message}`);
}

// ── Per-arena logic ────────────────────────────────────────────────────────

async function processArena(arena, index, total) {
  const tag   = `[${String(index).padStart(2)}/${total}]`;
  const klubb = arena.arenanavn.split(" – ")[0].trim();
  const lang  = wikiLang(arena.land);

  process.stdout.write(`${tag} ${klubb} (${arena.land})… `);

  try {
    // 1. Find Wikipedia article
    await sleep(DELAY_MS);
    const article = await findArticle(klubb, lang);
    if (!article) {
      console.log("✗  Ingen Wikipedia-artikkel");
      return { ok: false, reason: "Ingen Wikipedia-artikkel" };
    }

    // 2. Try the "page image" (editors' chosen representative image)
    await sleep(DELAY_MS);
    let image     = await getPageImage(article.title, lang);
    let method    = "pageimage";

    // Score the page image — discard if it looks wrong or scores too low
    if (image) {
      const s = scoreImage(image.fileName, image.ext, klubb);
      if (s < MIN_SCORE || !["svg", "png"].includes(image.ext)) {
        process.stdout.write(`(pageimage rejected [score ${s}], scanning…) `);
        image = null;
      }
    }

    // 3. Fall back to scanning all page images
    if (!image) {
      await sleep(DELAY_MS);
      image  = await scanPageImages(article.title, lang, klubb);
      method = "scan";
    }

    if (!image) {
      console.log(`✗  «${article.title}»: ingen passende logo-bilde funnet`);
      return { ok: false, reason: `Artikkel «${article.title}»: ingen logo` };
    }

    const label = `«${article.title}» [${method}] → ${image.fileName} (${image.ext.toUpperCase()})`;

    if (DRY_RUN) {
      console.log(`✓  [DRY-RUN] ${label}`);
      console.log(`          ${image.url}`);
      return { ok: true, dryRun: true, label, imageUrl: image.url };
    }

    // 4. Download → upload → update DB
    const buffer    = await downloadImage(image.url);
    const publicUrl = await uploadToStorage(arena.id, buffer, image.ext);
    await updateLogoUrl(arena.id, publicUrl);

    console.log(`✓  ${label}`);
    return { ok: true, label, imageUrl: image.url, publicUrl };

  } catch (err) {
    console.log(`✗  FEIL: ${err.message}`);
    return { ok: false, reason: err.message };
  }
}

// ── Main ───────────────────────────────────────────────────────────────────

async function main() {
  let query = supabase
    .from("arenaer")
    .select("id, arenanavn, land, logo_url")
    .is("logo_url", null)
    .order("land")
    .order("arenanavn");

  if (SINGLE_ID) {
    query = supabase.from("arenaer").select("id, arenanavn, land, logo_url").eq("id", SINGLE_ID);
  }

  const { data: all, error } = await query;
  if (error) { console.error("Supabase feil:", error.message); process.exit(1); }
  if (!all?.length) { console.log("Ingen arenaer uten logo_url funnet."); process.exit(0); }

  let batch = all;
  if (TEST_MODE) {
    batch = all.filter(a => a.land === "Norge").slice(0, 5);
    console.log(`\n=== TEST-MODUS (${DRY_RUN ? "dry-run, " : ""}${batch.length} norske arenaer) ===\n`);
  } else {
    const mode = DRY_RUN ? "DRY-RUN" : "KJØRER";
    console.log(`\n=== ${mode}: ${batch.length} arenaer ===\n`);
  }

  const results = [];
  for (let i = 0; i < batch.length; i++) {
    const r = await processArena(batch[i], i + 1, batch.length);
    results.push({ arena: batch[i], ...r });
  }

  const ok   = results.filter(r => r.ok);
  const fail = results.filter(r => !r.ok);

  console.log("\n" + "─".repeat(60));
  console.log(`Fullført: ${ok.length}/${batch.length} logoer ${DRY_RUN ? "funnet (dry-run)" : "lastet opp"}`);

  if (fail.length) {
    console.log(`\nMislykkedes (${fail.length}) — håndter manuelt:`);
    fail.forEach(r => {
      const klubb = r.arena.arenanavn.split(" – ")[0].trim();
      console.log(`  • ${klubb} (${r.arena.land}): ${r.reason}`);
    });
  }

  if (DRY_RUN || TEST_MODE) {
    console.log("\nLegg til --confirm (uten --dry-run) for å laste opp og oppdatere databasen.");
  }
}

main().catch(err => { console.error(err); process.exit(1); });
