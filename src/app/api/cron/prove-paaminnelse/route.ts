import { NextRequest, NextResponse } from "next/server";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { sendBrevoEmail } from "@/lib/nyhetsbrev-email";
import { buildTips1Html, buildTips2Html, buildVinnback1Html, buildVinnback2Html, buildVinnback3Html } from "@/lib/kunde-oppfolging-email";

// Daglig cron (se vercel.json) -- håndterer HELE e-post-livssyklusen rundt en
// 14-dagers prøveperiode, i én kjøring for å unngå å legge til enda en
// cron-jobb i vercel.json (Vercel-planen tillater et begrenset antall):
//
//   dag ~4   tips1     -- motiverende, få speakerteamet i gang
//   dag ~8   tips2     -- motiverende, gjør arenaen unik (arenainfo/geofence/QR)
//   dag 11-13 paaminnelse -- legg inn kort før prøveperioden går ut (fantes fra før)
//   dag+7  etter avsluttet, ukonvertert prøve  vinnback1 -- speakerteam + sikkerhet
//   dag+37 etter avsluttet, ukonvertert prøve  vinnback2 -- arenaens egenart + kampkvalitet
//   dag+67 etter avsluttet, ukonvertert prøve  vinnback3 -- arenautvikling, siste i sekvensen
//
// Hvert trinn er vokter av sitt eget _sendt-flagg på abonnementer, så en
// rad kan aldri få samme e-post to ganger selv om cronen kjører flere ganger
// samme dag eller en rad blir stående i "aktiv" lenger enn normalt.

function dagerSiden(dager: number): string {
  return new Date(Date.now() - dager * 24 * 60 * 60 * 1000).toISOString();
}

type ProveRad = { id: string; arenaer: { arenanavn: string; epost: string | null; fornavn: string | null } | null };

async function sendTilProveKandidater(opts: {
  supabase: SupabaseClient;
  brevoKey: string;
  kolonne: "tips1_sendt" | "tips2_sendt";
  dagerGrense: number;
  emne: string;
  bygg: (navn: string, arenanavn: string) => string;
}): Promise<{ sendt: number; feil: string[] }> {
  const { supabase, brevoKey, kolonne, dagerGrense, emne, bygg } = opts;
  const { data } = await supabase
    .from("abonnementer")
    .select(`id, arenaer(arenanavn, epost, fornavn)`)
    .eq("prove_periode", true)
    .eq("status", "aktiv")
    .eq(kolonne, false)
    .lte("periode_start", dagerSiden(dagerGrense))
    .gte("periode_start", dagerSiden(20));

  let sendt = 0;
  const feil: string[] = [];
  for (const rad of (data ?? []) as unknown as ProveRad[]) {
    const epost = rad.arenaer?.epost;
    if (!epost) continue;
    const arenanavn = rad.arenaer?.arenanavn ?? "arenaen din";
    const navn = rad.arenaer?.fornavn || arenanavn;
    const result = await sendBrevoEmail({ brevoKey, epost, navn: arenanavn, emne, htmlContent: bygg(navn, arenanavn) });
    if (result.ok) {
      sendt++;
      await supabase.from("abonnementer").update({ [kolonne]: true }).eq("id", rad.id);
    } else {
      feil.push(`${epost}: ${result.error}`);
    }
  }
  return { sendt, feil };
}

async function sendTilVinnbackKandidater(opts: {
  supabase: SupabaseClient;
  brevoKey: string;
  kolonne: "vinnback1_sendt" | "vinnback2_sendt" | "vinnback3_sendt";
  forrigeKolonne: "vinnback1_sendt" | "vinnback2_sendt" | null;
  dagerGrense: number;
  emne: string;
  bygg: (navn: string, arenanavn: string) => string;
}): Promise<{ sendt: number; feil: string[] }> {
  const { supabase, brevoKey, kolonne, forrigeKolonne, dagerGrense, emne, bygg } = opts;
  let query = supabase
    .from("abonnementer")
    .select(`id, arenaer(arenanavn, epost, fornavn)`)
    .eq("prove_periode", true)
    .eq("status", "avsluttet")
    .eq(kolonne, false)
    .lte("periode_slutt", dagerSiden(dagerGrense));
  if (forrigeKolonne) query = query.eq(forrigeKolonne, true);

  const { data } = await query;

  let sendt = 0;
  const feil: string[] = [];
  for (const rad of (data ?? []) as unknown as ProveRad[]) {
    const epost = rad.arenaer?.epost;
    if (!epost) continue;
    const arenanavn = rad.arenaer?.arenanavn ?? "arenaen din";
    const navn = rad.arenaer?.fornavn || arenanavn;
    const result = await sendBrevoEmail({ brevoKey, epost, navn: arenanavn, emne, htmlContent: bygg(navn, arenanavn) });
    if (result.ok) {
      sendt++;
      await supabase.from("abonnementer").update({ [kolonne]: true }).eq("id", rad.id);
    } else {
      feil.push(`${epost}: ${result.error}`);
    }
  }
  return { sendt, feil };
}

function buildPaaminnelseHtml(arenanavn: string): string {
  return `<!DOCTYPE html>
<html lang="no">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#073E46;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#073E46;padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

        <tr><td style="padding:0 0 32px 0;text-align:center;">
          <div style="font-size:28px;font-weight:900;letter-spacing:0.12em;color:#33D3C4;">ÅDIENCE</div>
          <div style="font-size:13px;color:rgba(255,255,255,0.4);letter-spacing:0.08em;margin-top:4px;">ARENA AUDIO STREAMING</div>
        </td></tr>

        <tr><td style="background-color:#1E293B;border-radius:16px;padding:48px 40px;border:1px solid rgba(51,211,196,0.15);">
          <p style="font-size:22px;font-weight:700;color:#ffffff;margin:0 0 8px 0;">
            Prøveperioden til ${arenanavn} går snart ut
          </p>
          <p style="font-size:16px;color:rgba(255,255,255,0.6);margin:0 0 24px 0;line-height:1.6;">
            De 14 gratis prøvedagene deres nærmer seg slutten. For å fortsette uten avbrudd i sendingen, legg inn et betalingskort på Min Side før perioden går ut.
          </p>
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:8px;">
            <tr>
              <td align="center">
                <a href="https://app.adience.no/min-side#oversikt" style="display:inline-block;background-color:#FF6B4A;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:8px;font-size:15px;font-weight:700;letter-spacing:0.04em;">
                  Fortsett abonnementet
                </a>
              </td>
            </tr>
          </table>
          <p style="font-size:13px;color:rgba(255,255,255,0.4);margin:24px 0 0 0;line-height:1.6;">
            Gjør du ingenting, avsluttes prøveperioden automatisk og sendingen stopper -- ingen overraskende belastning.
          </p>
        </td></tr>

        <tr><td style="padding:32px 0 0 0;text-align:center;">
          <p style="font-size:13px;color:rgba(255,255,255,0.3);margin:0 0 8px 0;">
            Spørsmål? Svar på denne e-posten eller kontakt oss på
            <a href="mailto:post@adience.no" style="color:#33D3C4;text-decoration:none;"> post@adience.no</a>
          </p>
          <p style="font-size:12px;color:rgba(255,255,255,0.2);margin:0;">
            Ådience AS · +47 901 82 288 · adience.no
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.get("authorization");
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const brevoKey = process.env.BREVO_API_KEY;

  if (!supabaseUrl || !serviceRoleKey || !brevoKey) {
    return NextResponse.json({ error: "Mangler konfigurasjon på serveren." }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  // ─── Betalingspåminnelse (fantes fra før) ───
  const om3Dager = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
  const naa = new Date().toISOString();
  const { data: paaminnelseKandidater, error: dbError } = await supabase
    .from("abonnementer")
    .select("id, arenaer(arenanavn, epost)")
    .eq("prove_periode", true)
    .eq("status", "aktiv")
    .eq("paaminnelse_sendt", false)
    .gte("periode_slutt", naa)
    .lte("periode_slutt", om3Dager);

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 });
  }

  let paaminnelseSendt = 0;
  const paaminnelseFeil: string[] = [];
  for (const rad of (paaminnelseKandidater ?? []) as unknown as { id: string; arenaer: { arenanavn: string; epost: string | null } | null }[]) {
    const epost = rad.arenaer?.epost;
    const arenanavn = rad.arenaer?.arenanavn ?? "arenaen din";
    if (!epost) continue;
    const result = await sendBrevoEmail({
      brevoKey, epost, navn: arenanavn,
      emne: "Prøveperioden din på Ådience går snart ut",
      htmlContent: buildPaaminnelseHtml(arenanavn),
    });
    if (result.ok) {
      paaminnelseSendt++;
      await supabase.from("abonnementer").update({ paaminnelse_sendt: true }).eq("id", rad.id);
    } else {
      paaminnelseFeil.push(`${epost}: ${result.error}`);
    }
  }

  // ─── Motiverende midt-i-prøven-tips ───
  const tips1 = await sendTilProveKandidater({
    supabase, brevoKey, kolonne: "tips1_sendt", dagerGrense: 4,
    emne: "Har speakerteamet deres kommet i gang?",
    bygg: (navn) => buildTips1Html(navn, "no"),
  });
  const tips2 = await sendTilProveKandidater({
    supabase, brevoKey, kolonne: "tips2_sendt", dagerGrense: 8,
    emne: "Tre måter å gjøre arenaen deres unik",
    bygg: (navn, arenanavn) => buildTips2Html(navn, arenanavn, "no"),
  });

  // ─── Vinnback-sekvens for prøve som ble avsluttet uten konvertering ───
  const vinnback1 = await sendTilVinnbackKandidater({
    supabase, brevoKey, kolonne: "vinnback1_sendt", forrigeKolonne: null, dagerGrense: 7,
    emne: "Vi savner dere",
    bygg: (navn, arenanavn) => buildVinnback1Html(navn, arenanavn, "no"),
  });
  const vinnback2 = await sendTilVinnbackKandidater({
    supabase, brevoKey, kolonne: "vinnback2_sendt", forrigeKolonne: "vinnback1_sendt", dagerGrense: 37,
    emne: "Hva gjør arenaen deres spesiell?",
    bygg: (navn, arenanavn) => buildVinnback2Html(navn, arenanavn, "no"),
  });
  const vinnback3 = await sendTilVinnbackKandidater({
    supabase, brevoKey, kolonne: "vinnback3_sendt", forrigeKolonne: "vinnback2_sendt", dagerGrense: 67,
    emne: "Ådience er klar når dere er",
    bygg: (navn, arenanavn) => buildVinnback3Html(navn, arenanavn, "no"),
  });

  return NextResponse.json({
    ok: true,
    paaminnelse: { sendt: paaminnelseSendt, feil: paaminnelseFeil },
    tips1, tips2, vinnback1, vinnback2, vinnback3,
  });
}
