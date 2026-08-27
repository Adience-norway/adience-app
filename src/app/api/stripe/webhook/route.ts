import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";

// Stripe sin webhook -- eneste sted som faktisk AKTIVERER et abonnement eller
// registrerer en engangsbetaling. /api/stripe/checkout oppretter bare en
// Checkout-økt; det er hendelsene herfra (etter at kunden faktisk har betalt)
// som skriver til abonnementer-tabellen. Kjører med service-role siden dette
// ikke er en innlogget bruker-forespørsel.
export async function POST(req: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!supabaseUrl || !serviceRoleKey || !stripeSecretKey || !webhookSecret) {
    console.error("stripe webhook: missing required env vars");
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  const stripe = new Stripe(stripeSecretKey);
  const payload = await req.text();
  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  } catch (err) {
    console.error("stripe webhook: signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const arenaId = session.metadata?.arena_id ?? session.client_reference_id;
        const plan = session.metadata?.plan;
        if (!arenaId) break;

        if (session.mode === "subscription") {
          const betalingsintervall = plan === "year" ? "ar" : "maned";
          const belop = (session.amount_total ?? 0) / 100;
          await supabase.from("abonnementer").insert({
            arena_id: arenaId,
            type: plan === "year" ? "arlig" : "manedlig",
            status: "aktiv",
            stripe_customer_id: typeof session.customer === "string" ? session.customer : session.customer?.id,
            stripe_subscription_id: typeof session.subscription === "string" ? session.subscription : session.subscription?.id,
            belop_per_periode: belop,
            betalingsintervall,
            periode_start: new Date().toISOString(),
          });
        } else {
          // Engangsbetaling per arrangement -- ingen løpende periode.
          const belop = (session.amount_total ?? 0) / 100;
          await supabase.from("abonnementer").insert({
            arena_id: arenaId,
            type: "engangsarrangement",
            status: "aktiv",
            stripe_customer_id: typeof session.customer === "string" ? session.customer : session.customer?.id,
            total_pris: belop,
            periode_start: new Date().toISOString(),
            periode_slutt: new Date().toISOString(),
          });
        }

        // Dette er der betaling faktisk kobles til tjenesten: streaming_aktiv
        // er det eneste stedet i appen (/api/cast-auth) som håndhever om
        // arenaen kan sende. Uten denne linjen ville betaling bare vært en
        // rad i en tabell, uten noen reell effekt for kunden.
        await supabase.from("arenaer").update({ streaming_aktiv: true }).eq("id", arenaId);
        break;
      }

      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        // past_due = Stripe prøver fortsatt på nytt (Smart Retries, typisk
        // 1-2 uker) -- ikke behandle som avsluttet med det samme, ellers
        // mister kunden tjenesten på dag én av et enkelt mislykket kortforsøk,
        // lenge før Stripe faktisk har gitt opp. streaming_aktiv holdes derfor
        // på under nåde-perioden; kun status endres, så Min Side kan vise et
        // tydelig "oppdater kortet ditt"-varsel.
        const streamingAktiv = sub.status === "active" || sub.status === "trialing" || sub.status === "past_due";
        const nyStatus = sub.status === "active" || sub.status === "trialing"
          ? "aktiv"
          : sub.status === "past_due"
            ? "betalingsproblem"
            : "avsluttet";
        const item = sub.items.data[0];
        await supabase
          .from("abonnementer")
          .update({
            status: nyStatus,
            periode_start: item ? new Date(item.current_period_start * 1000).toISOString() : undefined,
            periode_slutt: item ? new Date(item.current_period_end * 1000).toISOString() : undefined,
          })
          .eq("stripe_subscription_id", sub.id);

        const arenaId = sub.metadata?.arena_id;
        if (arenaId) {
          await supabase.from("arenaer").update({ streaming_aktiv: streamingAktiv }).eq("id", arenaId);
        }
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        await supabase
          .from("abonnementer")
          .update({ status: "avsluttet" })
          .eq("stripe_subscription_id", sub.id);

        const arenaId = sub.metadata?.arena_id;
        if (arenaId) {
          await supabase.from("arenaer").update({ streaming_aktiv: false }).eq("id", arenaId);
        }
        break;
      }

      default:
        break;
    }
  } catch (err) {
    console.error("stripe webhook: failed to process event:", event.type, err);
    return NextResponse.json({ error: "Failed to process event" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
