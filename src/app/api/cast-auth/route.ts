import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type Locale = "no" | "en";

const INACTIVE_MESSAGE: Record<Locale, string> = {
  no: "Abonnementet på denne arenaen er ikke aktivt. Ta kontakt med Ådience på post@adience.no for å aktivere det.",
  en: "This venue's subscription isn't active. Contact Ådience at post@adience.no to activate it.",
};

// Verifiserer et cast-passord mot en stream_id uten å noensinne sende selve
// passordet (verken det innsendte eller det lagrede) tilbake til klienten —
// kun et boolsk svar. Bruker service-role-nøkkelen server-side, siden
// cast_passord-kolonnen er sperret for anon/authenticated i databasen (se
// migrasjonen lock_down_cast_passord_column_v2).
//
// streaming_aktiv er den faktiske tjenestebryteren -- satt av Ådience-admin
// manuelt, eller automatisk av /api/stripe/webhook når et abonnement
// aktiveres/avsluttes. Dette er eneste sted i appen som håndhever den: uten
// riktig passord kommer man uansett ikke inn, men et RIKTIG passord på en
// arena uten aktivt abonnement skal heller ikke slippe gjennom.
export async function POST(req: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ error: "Supabase er ikke fullstendig konfigurert på serveren." }, { status: 500 });
  }

  const body = (await req.json()) as { streamId?: string; passord?: string; locale?: string };
  const streamId = body.streamId?.trim();
  const passord = body.passord?.trim();
  const locale: Locale = body.locale === "en" ? "en" : "no";
  if (!streamId || !passord) {
    return NextResponse.json({ ok: false, error: "Mangler stream-ID eller passord." }, { status: 400 });
  }

  const client = createClient(supabaseUrl, serviceRoleKey);
  const { data, error } = await client
    .from("arenaer")
    .select("cast_passord, arenanavn, streaming_aktiv")
    .eq("stream_id", streamId)
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json({ ok: false, error: "Fant ingen arena med denne stream-ID-en." }, { status: 404 });
  }

  const passordRiktig = !!data.cast_passord && data.cast_passord === passord;
  if (!passordRiktig) {
    // arenanavn kun med i svaret ved korrekt passord — ikke lekk arenanavn til noen som bare gjetter på stream-ID-en.
    return NextResponse.json({ ok: false });
  }

  if (!data.streaming_aktiv) {
    return NextResponse.json({ ok: false, error: INACTIVE_MESSAGE[locale] });
  }

  return NextResponse.json({ ok: true, arenaNavn: data.arenanavn });
}
