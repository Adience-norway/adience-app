import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Verifiserer et cast-passord mot en stream_id uten å noensinne sende selve
// passordet (verken det innsendte eller det lagrede) tilbake til klienten —
// kun et boolsk svar. Bruker service-role-nøkkelen server-side, siden
// cast_passord-kolonnen er sperret for anon/authenticated i databasen (se
// migrasjonen lock_down_cast_passord_column_v2).
export async function POST(req: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ error: "Supabase er ikke fullstendig konfigurert på serveren." }, { status: 500 });
  }

  const body = (await req.json()) as { streamId?: string; passord?: string };
  const streamId = body.streamId?.trim();
  const passord = body.passord?.trim();
  if (!streamId || !passord) {
    return NextResponse.json({ ok: false, error: "Mangler stream-ID eller passord." }, { status: 400 });
  }

  const client = createClient(supabaseUrl, serviceRoleKey);
  const { data, error } = await client
    .from("arenaer")
    .select("cast_passord")
    .eq("stream_id", streamId)
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json({ ok: false, error: "Fant ingen arena med denne stream-ID-en." }, { status: 404 });
  }

  const ok = !!data.cast_passord && data.cast_passord === passord;
  return NextResponse.json({ ok });
}
