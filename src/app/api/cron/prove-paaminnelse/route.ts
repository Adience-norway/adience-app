import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendBrevoEmail } from "@/lib/nyhetsbrev-email";

// Daglig cron (se vercel.json): varsler arenaer hvis 14-dagers prøveperiode
// (abonnementer.prove_periode) går ut om 0-3 dager, med en enkel CTA om å
// legge inn kort på Min Side for å fortsette. Prøveperioden krever ikke kort
// ved registrering (se /api/stripe/checkout), så uten dette varselet ville
// prøvekunder bare "falle av" uten forvarsel når Stripe prøver å belaste et
// kort som ikke finnes.

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
  const om3Dager = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
  const naa = new Date().toISOString();

  const { data: kandidater, error: dbError } = await supabase
    .from("abonnementer")
    .select("id, arena_id, periode_slutt, arenaer(arenanavn, epost)")
    .eq("prove_periode", true)
    .eq("status", "aktiv")
    .eq("paaminnelse_sendt", false)
    .gte("periode_slutt", naa)
    .lte("periode_slutt", om3Dager);

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 });
  }

  let sendt = 0;
  const feil: string[] = [];

  for (const rad of (kandidater ?? []) as unknown as { id: string; arenaer: { arenanavn: string; epost: string | null } | null }[]) {
    const epost = rad.arenaer?.epost;
    const arenanavn = rad.arenaer?.arenanavn ?? "arenaen din";
    if (!epost) continue;

    const result = await sendBrevoEmail({
      brevoKey,
      epost,
      navn: arenanavn,
      emne: "Prøveperioden din på Ådience går snart ut",
      htmlContent: buildPaaminnelseHtml(arenanavn),
    });

    if (result.ok) {
      sendt++;
      await supabase.from("abonnementer").update({ paaminnelse_sendt: true }).eq("id", rad.id);
    } else {
      feil.push(`${epost}: ${result.error}`);
    }
  }

  return NextResponse.json({ ok: true, sendt, kandidater: kandidater?.length ?? 0, feil });
}
