import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";

type Locale = "no" | "en";

const ERRORS: Record<Locale, { notConfigured: string; missingToken: string; invalidSession: string; noAccess: string; noCustomer: string; genericError: string }> = {
  no: {
    notConfigured: "Betalingsløsningen er ikke fullstendig konfigurert på serveren.",
    missingToken: "Mangler innloggingstoken.",
    invalidSession: "Ugyldig eller utløpt innlogging.",
    noAccess: "Du er ikke eier av denne arenaen.",
    noCustomer: "Fant ingen betalingshistorikk for denne arenaen ennå.",
    genericError: "Kunne ikke åpne betalingsoversikten.",
  },
  en: {
    notConfigured: "The payment setup isn't fully configured on the server.",
    missingToken: "Missing login token.",
    invalidSession: "Invalid or expired login.",
    noAccess: "You are not the owner of this venue.",
    noCustomer: "No billing history found for this venue yet.",
    genericError: "Couldn't open the billing overview.",
  },
};

// Åpner Stripe sin hostede Customer Portal -- selvbetjent oppdatering av
// betalingskort, nedlasting av kvitteringer, og oppsigelse, uten at vi må
// bygge noe av det selv. Krever at arenaen allerede har en
// stripe_customer_id (dvs. har gjennomført minst én betaling/prøveperiode).
export async function POST(req: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

  const body = (await req.json()) as { arenaId?: string; locale?: string };
  const locale: Locale = body.locale === "en" ? "en" : "no";
  const err = ERRORS[locale];

  if (!supabaseUrl || !anonKey || !serviceRoleKey || !stripeSecretKey) {
    return NextResponse.json({ error: err.notConfigured }, { status: 500 });
  }

  const authHeader = req.headers.get("authorization");
  const callerToken = authHeader?.replace("Bearer ", "");
  if (!callerToken) {
    return NextResponse.json({ error: err.missingToken }, { status: 401 });
  }

  const arenaId = body.arenaId?.trim();
  if (!arenaId) {
    return NextResponse.json({ error: err.noAccess }, { status: 400 });
  }

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

  const adminClient = createClient(supabaseUrl, serviceRoleKey);
  const { data: abonnement } = await adminClient
    .from("abonnementer")
    .select("stripe_customer_id")
    .eq("arena_id", arenaId)
    .not("stripe_customer_id", "is", null)
    .order("opprettet", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!abonnement?.stripe_customer_id) {
    return NextResponse.json({ error: err.noCustomer }, { status: 404 });
  }

  const stripe = new Stripe(stripeSecretKey);
  const origin = req.headers.get("origin") ?? "https://app.adience.no";
  const minSideUrl = locale === "en" ? `${origin}/en/min-side` : `${origin}/min-side`;

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: abonnement.stripe_customer_id,
      return_url: `${minSideUrl}#oversikt`,
    });
    return NextResponse.json({ url: session.url });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : err.genericError }, { status: 500 });
  }
}
