import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { emailShell, sendBrevoEmail } from "@/lib/nyhetsbrev-email";

// Daglig cron (se vercel.json): sender én oppfølgingsmail til abonnenter som meldte
// seg på for minst 3 dager siden og ikke allerede har fått den. Bruker service_role
// fordi den må lese hele abonnentlisten (samme begrunnelse som send-artikkel).

function buildOppfolgingHtml(fornavn: string, unsubscribeToken: string): string {
  const innerHtml = `
    <p style="font-size:22px;font-weight:700;color:#ffffff;margin:0 0 8px 0;">
      Hei igjen, ${fornavn}!
    </p>
    <p style="font-size:16px;color:rgba(255,255,255,0.6);margin:0 0 24px 0;line-height:1.6;">
      Ådience handler om menneskene bak speakerteamet — ekte historier fra folk som skaper opplevelsen på arenaen, ikke bare teknologien bak. Har du fått med deg historiene våre ennå?
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:8px;">
      <tr>
        <td align="center">
          <a href="https://www.adience.no/blog" style="display:inline-block;background-color:#33D3C4;color:#073E46;text-decoration:none;padding:14px 32px;border-radius:8px;font-size:15px;font-weight:700;letter-spacing:0.04em;">
            Utforsk bloggen
          </a>
        </td>
      </tr>
    </table>`;
  return emailShell(innerHtml, unsubscribeToken);
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
  const treDagerSiden = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();

  const { data: abonnenter, error: dbError } = await supabase
    .from("nyhetsbrev_abonnenter")
    .select("epost, fornavn, unsubscribe_token")
    .eq("aktiv", true)
    .eq("oppfolging_sendt", false)
    .lte("opprettet", treDagerSiden);

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 });
  }

  let sendt = 0;
  const feil: string[] = [];

  for (const abonnent of abonnenter ?? []) {
    const result = await sendBrevoEmail({
      brevoKey,
      epost: abonnent.epost,
      navn: abonnent.fornavn || abonnent.epost,
      emne: "Har du fått med deg historiene våre?",
      htmlContent: buildOppfolgingHtml(abonnent.fornavn || "der", abonnent.unsubscribe_token),
    });

    if (result.ok) {
      sendt++;
      await supabase
        .from("nyhetsbrev_abonnenter")
        .update({ oppfolging_sendt: true })
        .eq("unsubscribe_token", abonnent.unsubscribe_token);
    } else {
      feil.push(`${abonnent.epost}: ${result.error}`);
    }
  }

  return NextResponse.json({ ok: true, sendt, kandidater: abonnenter?.length ?? 0, feil });
}
