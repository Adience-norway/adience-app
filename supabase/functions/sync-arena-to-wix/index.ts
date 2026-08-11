/**
 * sync-arena-to-wix — Supabase Edge Function
 *
 * Creates or updates a Wix Contact from an arena's kontaktperson fields,
 * and applies the correct journey-stage label based on abonnementer.status.
 *
 * Invocation modes:
 *   A) Database webhook — INSERT on arenaer:
 *      { type: "INSERT", record: { ...arena row } }
 *
 *   B) Database webhook — UPDATE on abonnementer (status changed):
 *      { type: "UPDATE", table: "abonnementer", record: { arena_id, status, ... } }
 *
 *   C) Manual test by arena ID:
 *      POST body: { "arena_id": "<uuid>" }
 *
 *   D) Manual test with inline data:
 *      POST body: { "arena": { id, arenanavn, fornavn, etternavn, epost, telefon } }
 *
 * Env secrets required (Supabase dashboard → Edge Functions → Secrets):
 *   WIX_API_KEY              — Wix API key
 *   WIX_ACCOUNT_ID           — Wix account ID
 *   WIX_SITE_ID              — Wix site ID
 *   SUPABASE_URL             — injected automatically
 *   SUPABASE_SERVICE_ROLE_KEY — set manually in secrets
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const WIX_BASE        = "https://www.wixapis.com/contacts/v4";
const WIX_CONTACTS    = `${WIX_BASE}/contacts`;
const WIX_LABELS      = `${WIX_BASE}/labels`;

// ── Journey-stage label definitions ───────────────────────────────────────
// Keys must match what Wix assigns when labels are created.
// If you create labels via the Wix dashboard, update these keys to match.
// This function will auto-create labels if they don't exist yet.

const JOURNEY_LABELS: Record<string, { displayName: string; key: string }> = {
  lead:           { key: "custom.lead",            displayName: "Lead"             },
  demo_forespurt: { key: "custom.demo-forespurt",  displayName: "Demo forespurt"   },
  pilot_aktiv:    { key: "custom.pilot-aktiv",     displayName: "Pilot aktiv"      },
  aktiv:          { key: "custom.kunde-aktiv",     displayName: "Kunde aktiv"      },
  avsluttet:      { key: "custom.kunde-tidligere", displayName: "Kunde tidligere"  },
};

// All journey-stage keys — used to strip old labels before applying new one
const ALL_JOURNEY_KEYS = new Set(Object.values(JOURNEY_LABELS).map(l => l.key));

// Label that must never be removed by this sync (independent of journey stage)
const PROTECTED_LABELS = new Set(["custom.nyhetsbrev"]);

// ── Types ─────────────────────────────────────────────────────────────────

interface ArenaRecord {
  id: string;
  arenanavn: string;
  fornavn: string | null;
  etternavn: string | null;
  epost: string | null;
  telefon: string | null;
}

interface WixContact {
  id: string;
  info: {
    name?: { first?: string; last?: string };
    emails?: { items: Array<{ email: string }> };
    labelKeys?: string[];
  };
}

// ── Wix API helpers ────────────────────────────────────────────────────────

function wixHeaders(): Record<string, string> {
  const apiKey    = Deno.env.get("WIX_API_KEY") ?? "";
  const accountId = Deno.env.get("WIX_ACCOUNT_ID") ?? "";
  const siteId    = Deno.env.get("WIX_SITE_ID") ?? "";

  if (!apiKey || !accountId || !siteId) {
    throw new Error("Missing Wix env vars: WIX_API_KEY, WIX_ACCOUNT_ID, or WIX_SITE_ID");
  }

  return {
    "Content-Type":   "application/json",
    "Authorization":  apiKey,
    "wix-account-id": accountId,
    "wix-site-id":    siteId,
  };
}

/** Find an existing Wix contact by email. Returns the full contact (with labelKeys) or null. */
async function findContactByEmail(email: string): Promise<WixContact | null> {
  const url = new URL(WIX_CONTACTS);
  url.searchParams.set("filter", JSON.stringify({ "info.emails.email": email }));
  url.searchParams.set("fields", "info.labelKeys");

  const res = await fetch(url.toString(), { method: "GET", headers: wixHeaders() });
  if (!res.ok) {
    throw new Error(`Wix contacts search failed (${res.status}): ${await res.text()}`);
  }
  const data = await res.json();
  const contacts: WixContact[] = data?.contacts ?? [];
  return contacts[0] ?? null;
}

/** Create a new Wix contact. Returns the created contact. */
async function createContact(arena: ArenaRecord): Promise<WixContact> {
  const body = {
    info: {
      name: { first: arena.fornavn ?? "", last: arena.etternavn ?? "" },
      emails:  arena.epost   ? { items: [{ email: arena.epost,   tag: "MAIN" }] } : undefined,
      phones:  arena.telefon ? { items: [{ phone: arena.telefon, tag: "MAIN" }] } : undefined,
      extendedFields: {
        items: {
          "custom.arenanavn": arena.arenanavn,
          "custom.arena_id":  arena.id,
        },
      },
    },
  };

  const res = await fetch(WIX_CONTACTS, {
    method: "POST", headers: wixHeaders(), body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Wix create contact failed (${res.status}): ${await res.text()}`);
  return (await res.json()).contact as WixContact;
}

/** Update an existing Wix contact by ID. */
async function updateContact(contactId: string, arena: ArenaRecord): Promise<WixContact> {
  const body = {
    info: {
      name: { first: arena.fornavn ?? "", last: arena.etternavn ?? "" },
      phones: arena.telefon ? { items: [{ phone: arena.telefon, tag: "MAIN" }] } : undefined,
      extendedFields: {
        items: {
          "custom.arenanavn": arena.arenanavn,
          "custom.arena_id":  arena.id,
        },
      },
    },
  };

  const res = await fetch(`${WIX_CONTACTS}/${contactId}`, {
    method: "PATCH", headers: wixHeaders(), body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Wix update contact failed (${res.status}): ${await res.text()}`);
  return (await res.json()).contact as WixContact;
}

// ── Label helpers ──────────────────────────────────────────────────────────

/**
 * Ensure all journey-stage labels exist in Wix. Wix returns 409/200 if
 * a label with the same key already exists — we treat both as success.
 * Call once per invocation to guarantee keys are valid before assigning.
 */
async function ensureJourneyLabelsExist(): Promise<void> {
  for (const { key, displayName } of Object.values(JOURNEY_LABELS)) {
    const res = await fetch(WIX_LABELS, {
      method: "POST",
      headers: wixHeaders(),
      body: JSON.stringify({ displayName, labelType: "USER_DEFINED" }),
    });
    // 200 = created, 409 = already exists — both are fine
    if (!res.ok && res.status !== 409) {
      const body = await res.text();
      console.warn(`[labels] Could not ensure label "${displayName}" (${key}): ${res.status} ${body}`);
    } else {
      console.log(`[labels] ✓ Label ensured: "${displayName}" (${key})`);
    }
  }
}

/**
 * Apply the correct journey-stage label to a contact.
 * Removes all OTHER journey-stage labels first, never touches protected labels.
 */
async function applyJourneyLabel(contactId: string, currentLabelKeys: string[], status: string): Promise<void> {
  const targetLabel = JOURNEY_LABELS[status];
  if (!targetLabel) {
    console.warn(`[labels] Unknown status "${status}" — no label applied`);
    return;
  }

  // Keys to remove: all journey labels the contact currently has, EXCEPT the target
  const toRemove = currentLabelKeys.filter(
    k => ALL_JOURNEY_KEYS.has(k) && k !== targetLabel.key && !PROTECTED_LABELS.has(k)
  );

  if (toRemove.length > 0) {
    console.log(`[labels] Removing ${toRemove.length} old journey label(s): ${toRemove.join(", ")}`);
    const res = await fetch(`${WIX_CONTACTS}/${contactId}/labels`, {
      method: "DELETE",
      headers: wixHeaders(),
      body: JSON.stringify({ labelKeys: toRemove }),
    });
    if (!res.ok) {
      console.warn(`[labels] Remove failed (${res.status}): ${await res.text()}`);
    }
  }

  // Add the target label (Wix is idempotent — adding an existing label is a no-op)
  console.log(`[labels] Applying label "${targetLabel.displayName}" (${targetLabel.key}) for status "${status}"`);
  const addRes = await fetch(`${WIX_CONTACTS}/${contactId}/labels`, {
    method: "POST",
    headers: wixHeaders(),
    body: JSON.stringify({ labelKeys: [targetLabel.key] }),
  });
  if (!addRes.ok) {
    throw new Error(`[labels] Add label failed (${addRes.status}): ${await addRes.text()}`);
  }
  console.log(`[labels] ✓ Label "${targetLabel.displayName}" active on contact ${contactId}`);
}

// ── Supabase helpers ───────────────────────────────────────────────────────

function supabaseClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
}

async function fetchArena(arenaId: string): Promise<ArenaRecord> {
  const { data, error } = await supabaseClient()
    .from("arenaer")
    .select("id, arenanavn, fornavn, etternavn, epost, telefon")
    .eq("id", arenaId)
    .single();
  if (error || !data) throw new Error(`Arena ikke funnet: ${error?.message ?? "no data"}`);
  return data as ArenaRecord;
}

async function fetchAbonnementStatus(arenaId: string): Promise<string> {
  const { data } = await supabaseClient()
    .from("abonnementer")
    .select("status")
    .eq("arena_id", arenaId)
    .order("opprettet", { ascending: false })
    .limit(1)
    .maybeSingle();
  // Default to "lead" if no abonnement row exists yet
  return data?.status ?? "lead";
}

// ── Main handler ───────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405, headers: { "Content-Type": "application/json" },
    });
  }

  let arena: ArenaRecord | null = null;
  let statusOverride: string | null = null; // set when triggered by abonnementer update

  try {
    const payload = await req.json();

    // ── Mode A: arenaer INSERT webhook
    if (payload?.table === "arenaer" && payload?.record?.arenanavn) {
      arena = payload.record as ArenaRecord;
      console.log(`[webhook/arenaer] INSERT: ${arena.arenanavn} (${arena.id})`);
    }

    // ── Mode B: abonnementer UPDATE webhook (status changed)
    else if (payload?.table === "abonnementer" && payload?.record?.arena_id) {
      const arenaId = payload.record.arena_id as string;
      statusOverride = payload.record.status as string;
      console.log(`[webhook/abonnementer] status → "${statusOverride}" for arena ${arenaId}`);
      arena = await fetchArena(arenaId);
    }

    // ── Mode C: { arena_id: "<uuid>" }
    else if (payload?.arena_id) {
      arena = await fetchArena(payload.arena_id);
      console.log(`[manual] Arena hentet fra DB: ${arena.arenanavn} (${arena.id})`);
    }

    // ── Mode D: { arena: { ... } }
    else if (payload?.arena?.arenanavn) {
      arena = payload.arena as ArenaRecord;
      statusOverride = payload.status ?? null;
      console.log(`[manual] Inline arena: ${arena.arenanavn}`);
    }

    else {
      return new Response(JSON.stringify({
        error: "Ugyldig payload. Forvent { arena_id }, { arena: {...} }, eller webhook-format."
      }), { status: 400, headers: { "Content-Type": "application/json" } });
    }

    // ── Guard: must have email to sync
    if (!arena.epost) {
      const msg = `${arena.arenanavn} har ingen epost — hopper over`;
      console.warn(`[skip] ${msg}`);
      return new Response(JSON.stringify({ skipped: true, reason: msg }), {
        status: 200, headers: { "Content-Type": "application/json" },
      });
    }

    // ── Resolve abonnement status (use webhook value, or fetch from DB)
    const status = statusOverride ?? await fetchAbonnementStatus(arena.id);
    console.log(`[status] Resolved status: "${status}" → label "${JOURNEY_LABELS[status]?.displayName ?? "ukjent"}"`);

    // ── Ensure all journey labels exist in Wix (idempotent)
    await ensureJourneyLabelsExist();

    // ── Find or create the Wix contact
    console.log(`[wix] Søker etter kontakt: ${arena.epost}`);
    const existing = await findContactByEmail(arena.epost);

    let contact: WixContact;
    let action: "created" | "updated";

    if (existing) {
      console.log(`[wix] Eksisterende kontakt funnet: ${existing.id} — oppdaterer…`);
      contact = await updateContact(existing.id, arena);
      action  = "updated";
    } else {
      console.log(`[wix] Ingen kontakt funnet — oppretter ny…`);
      contact = await createContact(arena);
      action  = "created";
    }

    // ── Apply journey-stage label
    const currentKeys = existing?.info?.labelKeys ?? [];
    await applyJourneyLabel(contact.id, currentKeys, status);

    console.log(`[wix] ✓ ${action === "created" ? "Opprettet" : "Oppdatert"}: kontakt ${contact.id} — ${arena.arenanavn} — label: ${JOURNEY_LABELS[status]?.displayName}`);

    return new Response(JSON.stringify({
      success:        true,
      action,
      wix_contact_id: contact.id,
      arena_id:       arena.id,
      arenanavn:      arena.arenanavn,
      status_synced:  status,
      label_applied:  JOURNEY_LABELS[status]?.displayName ?? null,
    }), { status: 200, headers: { "Content-Type": "application/json" } });

  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[error] ${message}`);
    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 500, headers: { "Content-Type": "application/json" },
    });
  }
});
