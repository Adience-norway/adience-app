import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const EPOST_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Locale = "no" | "en";

const ERRORS: Record<Locale, {
  notConfigured: string; missingToken: string; invalidEmail: string; missingArena: string;
  invalidSession: string; noAccess: string; inviteFailed: string; grantFailedPrefix: string;
}> = {
  no: {
    notConfigured: "Supabase er ikke fullstendig konfigurert på serveren.",
    missingToken: "Mangler innloggingstoken.",
    invalidEmail: "Ugyldig e-postadresse.",
    missingArena: "Mangler arena-ID.",
    invalidSession: "Ugyldig eller utløpt innlogging.",
    noAccess: "Du er ikke eier av denne arenaen.",
    inviteFailed: "Kunne ikke invitere personen.",
    grantFailedPrefix: "Kunne ikke gi tilgang:",
  },
  en: {
    notConfigured: "Supabase isn't fully configured on the server.",
    missingToken: "Missing login token.",
    invalidEmail: "Invalid email address.",
    missingArena: "Missing arena ID.",
    invalidSession: "Invalid or expired login.",
    noAccess: "You are not the owner of this venue.",
    inviteFailed: "Couldn't invite the person.",
    grantFailedPrefix: "Couldn't grant access:",
  },
};

// Gir en person operatør-tilgang (holdmusikk/infotavle/Media, se
// enforce_operator_column_scope() og arena_tilganger) til en spesifikk
// arena -- kalt av arenaeieren selv fra Speakerteam-fanen, typisk etter at
// personen er sertifisert. Oppretter kontoen (invitasjon) hvis den ikke
// finnes fra før, ellers gis tilgangen direkte til den eksisterende kontoen.
export async function POST(req: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const body = (await req.json()) as { epost?: string; fornavn?: string; etternavn?: string; arenaId?: string; locale?: string };
  const locale: Locale = body.locale === "en" ? "en" : "no";
  const err = ERRORS[locale];

  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return NextResponse.json({ error: err.notConfigured }, { status: 500 });
  }

  const authHeader = req.headers.get("authorization");
  const callerToken = authHeader?.replace("Bearer ", "");
  if (!callerToken) {
    return NextResponse.json({ error: err.missingToken }, { status: 401 });
  }

  const epost = body.epost?.trim().toLowerCase();
  const fornavn = body.fornavn?.trim() || null;
  const etternavn = body.etternavn?.trim() || null;
  const arenaId = body.arenaId?.trim();

  if (!epost || !EPOST_REGEX.test(epost)) {
    return NextResponse.json({ error: err.invalidEmail }, { status: 400 });
  }
  if (!arenaId) {
    return NextResponse.json({ error: err.missingArena }, { status: 400 });
  }

  // Steg 1: bekreft at innringeren faktisk eier denne arenaen, via egen token (vanlig RLS).
  const callerClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${callerToken}` } },
  });
  const { data: callerUser, error: callerError } = await callerClient.auth.getUser();
  if (callerError || !callerUser?.user) {
    return NextResponse.json({ error: err.invalidSession }, { status: 401 });
  }
  const { data: eierTilgang } = await callerClient
    .from("arena_tilganger")
    .select("id")
    .eq("bruker_id", callerUser.user.id)
    .eq("arena_id", arenaId)
    .eq("rolle", "eier")
    .maybeSingle();
  if (!eierTilgang) {
    return NextResponse.json({ error: err.noAccess }, { status: 403 });
  }

  // Steg 2: finn eller opprett kontoen, og gi den operatør-tilgang.
  const adminClient = createClient(supabaseUrl, serviceRoleKey);

  const { data: eksisterende } = await adminClient
    .from("brukere")
    .select("id")
    .ilike("epost", epost)
    .maybeSingle();

  let brukerId: string;
  if (eksisterende) {
    brukerId = eksisterende.id;
  } else {
    const { data: invitert, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(epost, {
      data: { fornavn, etternavn },
      redirectTo: "https://app.adience.no/tilbakestill-passord",
    });
    if (inviteError || !invitert?.user) {
      return NextResponse.json({ error: inviteError?.message ?? err.inviteFailed }, { status: 500 });
    }
    brukerId = invitert.user.id;
  }

  const { error: grantError } = await adminClient
    .from("arena_tilganger")
    .upsert({ bruker_id: brukerId, arena_id: arenaId, rolle: "operator", tildelt_av: callerUser.user.id }, { onConflict: "bruker_id,arena_id" });
  if (grantError) {
    return NextResponse.json({ error: `${err.grantFailedPrefix} ${grantError.message}` }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
