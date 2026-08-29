import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";

type Locale = "no" | "en";

const ERRORS: Record<Locale, { notConfigured: string; missingToken: string; invalidSession: string; noAccess: string; invalidPlan: string; genericError: string }> = {
  no: {
    notConfigured: "Betalingsløsningen er ikke fullstendig konfigurert på serveren.",
    missingToken: "Mangler innloggingstoken.",
    invalidSession: "Ugyldig eller utløpt innlogging.",
    noAccess: "Du er ikke eier av denne arenaen.",
    invalidPlan: "Ugyldig abonnementstype.",
    genericError: "Kunne ikke starte betaling.",
  },
  en: {
    notConfigured: "The payment setup isn't fully configured on the server.",
    missingToken: "Missing login token.",
    invalidSession: "Invalid or expired login.",
    noAccess: "You are not the owner of this venue.",
    invalidPlan: "Invalid plan type.",
    genericError: "Couldn't start checkout.",
  },
};

type Plan = "month" | "year" | "event";

// Starter en Stripe Checkout-økt for et abonnement (månedlig/årlig, løpende)
// eller en engangsbetaling (per arrangement). Kalt fra AbonnementSection på
// Min Side -- eieren trykker en knapp, vi lager en Checkout-økt og sender
// dem videre til Stripe sin hostede betalingsside. Selve aktiveringen av
// abonnementet skjer i /api/stripe/webhook når betalingen faktisk fullføres,
// ikke her -- denne ruten bare oppretter økten.
export async function POST(req: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  const priceMonthly = process.env.STRIPE_PRICE_MONTHLY;
  const priceYearly = process.env.STRIPE_PRICE_YEARLY;
  const priceEvent = process.env.STRIPE_PRICE_EVENT;

  const body = (await req.json()) as { arenaId?: string; plan?: string; locale?: string; trial?: boolean };
  const locale: Locale = body.locale === "en" ? "en" : "no";
  const err = ERRORS[locale];

  if (!supabaseUrl || !anonKey || !serviceRoleKey || !stripeSecretKey || !priceMonthly || !priceYearly || !priceEvent) {
    return NextResponse.json({ error: err.notConfigured }, { status: 500 });
  }

  const authHeader = req.headers.get("authorization");
  const callerToken = authHeader?.replace("Bearer ", "");
  if (!callerToken) {
    return NextResponse.json({ error: err.missingToken }, { status: 401 });
  }

  const arenaId = body.arenaId?.trim();
  const plan = body.plan as Plan | undefined;
  if (!arenaId || !plan || !["month", "year", "event"].includes(plan)) {
    return NextResponse.json({ error: err.invalidPlan }, { status: 400 });
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
  const { data: arena } = await adminClient
    .from("arenaer")
    .select("arenanavn, epost, adresse_gate, postnummer")
    .eq("id", arenaId)
    .single();
  const { data: eksisterendeAbonnement } = await adminClient
    .from("abonnementer")
    .select("stripe_customer_id")
    .eq("arena_id", arenaId)
    .not("stripe_customer_id", "is", null)
    .order("opprettet", { ascending: false })
    .limit(1)
    .maybeSingle();

  const stripe = new Stripe(stripeSecretKey);
  const origin = req.headers.get("origin") ?? "https://app.adience.no";
  const minSideUrl = locale === "en" ? `${origin}/en/min-side` : `${origin}/min-side`;

  const priceId = plan === "month" ? priceMonthly : plan === "year" ? priceYearly : priceEvent;
  const mode: Stripe.Checkout.SessionCreateParams.Mode = plan === "event" ? "payment" : "subscription";
  // 14-dagers prøveperiode: kun ment for førstegangsregistrering (se
  // registrer/RegistrerPageContent.tsx) -- kortet registreres med det samme,
  // ingen belastning før prøveperioden er over, og abonnementet starter
  // automatisk med mindre eieren aktivt sier opp innen fristen. Sperret hvis
  // en ANNEN arena på samme adresse allerede har vært gjennom minst ett
  // abonnement/arrangement før -- ellers kan noen bare opprette en ny konto
  // på samme sted for å hente ut gratis prøveperiode på nytt.
  let adresseAlleredeBrukt = false;
  if (body.trial === true && mode === "subscription" && arena?.adresse_gate && arena?.postnummer) {
    const { data: andreArenaerPaSammeAdresse } = await adminClient
      .from("arenaer")
      .select("id")
      .neq("id", arenaId)
      .ilike("adresse_gate", arena.adresse_gate.trim())
      .eq("postnummer", arena.postnummer.trim());
    const andreArenaIder = (andreArenaerPaSammeAdresse ?? []).map(a => a.id);
    if (andreArenaIder.length > 0) {
      const { count } = await adminClient
        .from("abonnementer")
        .select("id", { count: "exact", head: true })
        .in("arena_id", andreArenaIder);
      adresseAlleredeBrukt = (count ?? 0) > 0;
    }
  }
  const trial = body.trial === true && mode === "subscription" && !adresseAlleredeBrukt;

  try {
    const session = await stripe.checkout.sessions.create({
      mode,
      line_items: [{ price: priceId, quantity: 1 }],
      customer: eksisterendeAbonnement?.stripe_customer_id ?? undefined,
      customer_email: eksisterendeAbonnement?.stripe_customer_id ? undefined : (arena?.epost ?? undefined),
      client_reference_id: arenaId,
      // Spørrestrengen må stå FØR hash-fragmentet for at URLSearchParams på
      // mottakersiden faktisk skal kunne lese den (alt etter # er kun tekst
      // i fragmentet, ikke en ekte query-parameter).
      success_url: `${minSideUrl}?checkout=success&plan=${plan}#oversikt`,
      cancel_url: `${minSideUrl}?checkout=cancelled#oversikt`,
      metadata: { arena_id: arenaId, plan, arenanavn: arena?.arenanavn ?? "", trial: trial ? "true" : "false" },
      subscription_data: mode === "subscription"
        ? {
            metadata: { arena_id: arenaId, plan },
            ...(trial ? { trial_period_days: 14 } : {}),
          }
        : undefined,
      // Vi gir bort 14 dager med en begrenset (150 lyttere) tjeneste -- da er
      // det unødvendig friksjon å kreve kort med det samme. "if_required"
      // hopper over kort-steget når ingenting forfaller ved selve økten (som
      // er tilfellet her, siden trial_period_days er satt over). Ved ordinært
      // kjøp (ikke prøve) forfaller beløpet med det samme, så da kreves kort
      // uansett -- "always" der er derfor bare eksplisitt, ikke en innstramming.
      payment_method_collection: mode === "subscription" ? (trial ? "if_required" : "always") : undefined,
    });

    if (!session.url) {
      return NextResponse.json({ error: err.genericError }, { status: 500 });
    }
    return NextResponse.json({ url: session.url });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : err.genericError }, { status: 500 });
  }
}
