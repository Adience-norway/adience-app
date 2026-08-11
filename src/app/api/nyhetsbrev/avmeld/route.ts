import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function bekreftelseHtml(melding: string): string {
  return `<!DOCTYPE html>
<html lang="no">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Avmeldt</title></head>
<body style="margin:0;padding:0;background-color:#073E46;font-family:Arial,Helvetica,sans-serif;display:flex;min-height:100vh;align-items:center;justify-content:center;">
  <div style="max-width:440px;padding:40px;text-align:center;">
    <div style="font-size:24px;font-weight:900;letter-spacing:0.12em;color:#33D3C4;margin-bottom:24px;">ÅDIENCE</div>
    <p style="font-size:17px;color:#ffffff;line-height:1.6;">${melding}</p>
    <a href="https://www.adience.no" style="display:inline-block;margin-top:24px;color:#33D3C4;text-decoration:none;font-size:14px;">← Tilbake til adience.no</a>
  </div>
</body>
</html>`;
}

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!token || !supabaseUrl || !serviceRoleKey) {
    return new NextResponse(bekreftelseHtml("Ugyldig avmeldingslenke."), {
      status: 400,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  // Bruker service_role fordi anon ikke har leserett på tabellen (hindrer at noen kan
  // liste ut abonnenter) — men det betyr UPDATE...WHERE ikke finner raden med anon-nøkkelen
  // heller, siden Postgres RLS krever SELECT-synlighet for å matche WHERE-klausulen.
  // Selve token-en (en ugjettelig UUID) er beviset på rett til å avmelde nettopp denne raden.
  const supabase = createClient(supabaseUrl, serviceRoleKey);
  const { error } = await supabase
    .from("nyhetsbrev_abonnenter")
    .update({ aktiv: false })
    .eq("unsubscribe_token", token);

  if (error) {
    return new NextResponse(bekreftelseHtml("Noe gikk galt. Prøv igjen, eller svar på en av e-postene våre."), {
      status: 500,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  return new NextResponse(
    bekreftelseHtml("Du er nå meldt av nyhetsbrevet. Du kan melde deg på igjen når som helst på adience.no."),
    { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } }
  );
}
