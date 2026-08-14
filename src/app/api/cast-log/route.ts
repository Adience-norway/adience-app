import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Logger start/slutt for en sending på arenaens FASTE stream-ID -- kalt fra
// /cast, ikke fra en innlogget bruker. Verifiseres mot cast_passord (samme
// mønster som /api/cast-auth) siden dette skriver til databasen og ikke kan
// stole på anon-nøkkelen alene.
export async function POST(req: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ error: "Supabase er ikke fullstendig konfigurert på serveren." }, { status: 500 });
  }

  const body = (await req.json()) as { streamId?: string; passord?: string; action?: "start" | "stop" };
  const streamId = body.streamId?.trim();
  const passord = body.passord?.trim();
  const action = body.action;
  if (!streamId || !passord || (action !== "start" && action !== "stop")) {
    return NextResponse.json({ ok: false, error: "Mangler stream-ID, passord eller gyldig action." }, { status: 400 });
  }

  const client = createClient(supabaseUrl, serviceRoleKey);
  const { data: arena, error: arenaError } = await client
    .from("arenaer")
    .select("cast_passord")
    .eq("stream_id", streamId)
    .maybeSingle();
  if (arenaError || !arena || arena.cast_passord !== passord) {
    return NextResponse.json({ ok: false, error: "Ugyldig stream-ID eller passord." }, { status: 401 });
  }

  if (action === "start") {
    const { error } = await client.from("sendingslogg").insert({ stream_id: streamId });
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  // action === "stop": lukk den nyeste åpne økten for denne stream-ID-en.
  const { data: apen } = await client
    .from("sendingslogg")
    .select("id")
    .eq("stream_id", streamId)
    .is("avsluttet_at", null)
    .order("startet_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (apen) {
    const { error } = await client.from("sendingslogg").update({ avsluttet_at: new Date().toISOString() }).eq("id", apen.id);
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
