import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { emailShell, sendBrevoEmail } from "@/lib/nyhetsbrev-email";

// Manuell/on-demand utsendelse: varsler alle aktive abonnenter om en ny artikkel.
// Kalles av oss (ikke en offentlig, brukerutløst rute) etter at et blogginnlegg er
// publisert på Wix. Bruker service_role fordi den må lese HELE abonnentlisten —
// noe anon-nøkkelen bevisst ikke får lov til (se RLS på nyhetsbrev_abonnenter).
// Beskyttet med samme CRON_SECRET-mønster som /api/cron/* -- ingen browser-sesjon
// finnes på tidspunktet dette kalles, så et delt hemmelig (ikke bruker-JWT) passer.

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildArtikkelHtml(tittel: string, ingress: string, url: string, unsubscribeToken: string): string {
  const innerHtml = `
    <p style="font-size:13px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#33D3C4;margin:0 0 12px 0;">
      Ny artikkel
    </p>
    <p style="font-size:22px;font-weight:700;color:#ffffff;margin:0 0 12px 0;line-height:1.3;">
      ${escapeHtml(tittel)}
    </p>
    <p style="font-size:16px;color:rgba(255,255,255,0.6);margin:0 0 24px 0;line-height:1.6;">
      ${escapeHtml(ingress)}
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:8px;">
      <tr>
        <td align="center">
          <a href="${escapeHtml(url)}" style="display:inline-block;background-color:#FF6B4A;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:8px;font-size:15px;font-weight:700;letter-spacing:0.04em;">
            Les artikkelen
          </a>
        </td>
      </tr>
    </table>`;
  return emailShell(innerHtml, unsubscribeToken);
}

export async function POST(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.get("authorization");
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const brevoKey = process.env.BREVO_API_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ error: "Supabase service-role er ikke konfigurert på serveren." }, { status: 500 });
  }
  if (!brevoKey) {
    return NextResponse.json({ error: "Mangler BREVO_API_KEY på serveren." }, { status: 500 });
  }

  const body = (await req.json()) as { tittel?: string; ingress?: string; url?: string };
  const { tittel, ingress, url } = body;

  if (!tittel || !ingress || !url) {
    return NextResponse.json({ error: "tittel, ingress og url er påkrevd." }, { status: 400 });
  }
  if (!/^https:\/\/(www\.)?adience\.no\//.test(url)) {
    return NextResponse.json({ error: "url må peke til adience.no." }, { status: 400 });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);
  const { data: abonnenter, error: dbError } = await supabase
    .from("nyhetsbrev_abonnenter")
    .select("epost, fornavn, unsubscribe_token")
    .eq("aktiv", true);

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
      emne: `Ny artikkel: ${tittel}`,
      htmlContent: buildArtikkelHtml(tittel, ingress, url, abonnent.unsubscribe_token),
    });

    if (result.ok) {
      sendt++;
    } else {
      feil.push(`${abonnent.epost}: ${result.error}`);
    }
  }

  return NextResponse.json({ ok: true, sendt, totalAbonnenter: abonnenter?.length ?? 0, feil });
}
