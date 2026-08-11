import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Lets the speaker team switch Showtime/Waiting mid-session without stopping
// the WebRTC connection. Re-verifies cast_passord server-side on every call
// (same credential as starting the broadcast) before relaying the mode
// change to the arena's Liquidsoap instance via the AMS host's narrow
// control-relay endpoint (see /etc/nginx/sites-available/adience-viewer-proxy
// and adience-control-relay.py on cast.adience.no).
export async function POST(req: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const controlSecret = process.env.ADIENCE_CONTROL_SECRET;
  if (!supabaseUrl || !serviceRoleKey || !controlSecret) {
    return NextResponse.json({ ok: false, error: "Serveren er ikke fullstendig konfigurert." }, { status: 500 });
  }

  const body = (await req.json()) as { streamId?: string; passord?: string; mode?: string };
  const streamId = body.streamId?.trim();
  const passord = body.passord?.trim();
  const mode = body.mode;
  if (!streamId || !passord || (mode !== "live" && mode !== "hold")) {
    return NextResponse.json({ ok: false, error: "Mangler stream-ID, passord, eller ugyldig modus." }, { status: 400 });
  }

  const client = createClient(supabaseUrl, serviceRoleKey);
  const { data, error } = await client
    .from("arenaer")
    .select("cast_passord")
    .eq("stream_id", streamId)
    .maybeSingle();

  if (error || !data || !data.cast_passord || data.cast_passord !== passord) {
    return NextResponse.json({ ok: false, error: "Ugyldig passord." }, { status: 403 });
  }

  try {
    const res = await fetch("https://cast.adience.no/control/mode", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Control-Secret": controlSecret },
      body: JSON.stringify({ streamId, mode }),
    });
    const relayResult = (await res.json()) as { ok: boolean; error?: string };
    if (!relayResult.ok) {
      return NextResponse.json({ ok: false, error: relayResult.error ?? "Ukjent feil fra sendeserveren." }, { status: 502 });
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: "Fikk ikke kontakt med sendeserveren." }, { status: 502 });
  }
}
