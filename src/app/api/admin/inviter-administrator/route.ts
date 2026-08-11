import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const EPOST_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Locale = "no" | "en";

const ERRORS: Record<Locale, {
  notConfigured: string; missingToken: string; invalidEmail: string;
  invalidSession: string; noAccess: string; inviteFailed: string; flagFailedPrefix: string;
}> = {
  no: {
    notConfigured: "Supabase er ikke fullstendig konfigurert på serveren.",
    missingToken: "Mangler innloggingstoken.",
    invalidEmail: "Ugyldig e-postadresse.",
    invalidSession: "Ugyldig eller utløpt innlogging.",
    noAccess: "Du har ikke admin-tilgang til å gjøre dette.",
    inviteFailed: "Kunne ikke invitere brukeren.",
    flagFailedPrefix: "Bruker invitert, men klarte ikke sette admin-flagg:",
  },
  en: {
    notConfigured: "Supabase isn't fully configured on the server.",
    missingToken: "Missing login token.",
    invalidEmail: "Invalid email address.",
    invalidSession: "Invalid or expired login.",
    noAccess: "You don't have admin access to do this.",
    inviteFailed: "Couldn't invite the user.",
    flagFailedPrefix: "User invited, but couldn't set the admin flag:",
  },
};

// Inviterer en helt ny person som Ådience-administrator (de har ikke nødvendigvis
// noen konto fra før). To steg: 1) bekreft at DEN som ber om dette selv er admin
// (via deres egen innloggingstoken, under vanlig RLS), 2) bruk service_role til å
// faktisk opprette kontoen (Supabase Auth Admin API) og sette admin-flagget —
// begge steg krever ting anon-nøkkelen ikke har lov til.

export async function POST(req: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const body = (await req.json()) as { epost?: string; fornavn?: string; etternavn?: string; locale?: string };
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

  if (!epost || !EPOST_REGEX.test(epost)) {
    return NextResponse.json({ error: err.invalidEmail }, { status: 400 });
  }

  // Steg 1: bekreft at innringeren faktisk er admin, via deres egen token (vanlig RLS).
  const callerClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${callerToken}` } },
  });
  const { data: callerUser, error: callerError } = await callerClient.auth.getUser();
  if (callerError || !callerUser?.user) {
    return NextResponse.json({ error: err.invalidSession }, { status: 401 });
  }
  const { data: callerBruker } = await callerClient
    .from("brukere")
    .select("er_adience_admin")
    .eq("id", callerUser.user.id)
    .single();
  if (!callerBruker?.er_adience_admin) {
    return NextResponse.json({ error: err.noAccess }, { status: 403 });
  }

  // Steg 2: opprett/inviter den nye brukeren med service_role.
  const adminClient = createClient(supabaseUrl, serviceRoleKey);
  const { data: invitert, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(epost, {
    data: { fornavn, etternavn },
    redirectTo: "https://app.adience.no/tilbakestill-passord",
  });

  if (inviteError || !invitert?.user) {
    return NextResponse.json({ error: inviteError?.message ?? err.inviteFailed }, { status: 500 });
  }

  // Trigger'en handle_new_user() oppretter brukere-raden automatisk — vent kort og sett admin-flagget.
  const { error: updateError } = await adminClient
    .from("brukere")
    .update({ er_adience_admin: true })
    .eq("id", invitert.user.id);

  if (updateError) {
    return NextResponse.json({ error: `${err.flagFailedPrefix} ${updateError.message}` }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
