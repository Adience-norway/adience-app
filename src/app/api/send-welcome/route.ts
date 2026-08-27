import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const BREVO_URL = "https://api.brevo.com/v3/smtp/email";

type Locale = "no" | "en";

const COPY: Record<Locale, {
  subject: string; tagline: string; greeting: (n: string) => string; intro: string;
  streamIdLabel: string; appLinkLabel: string; qrHint: string; nextDays: string;
  steps: [string, string][]; ctaButton: string; questions: string;
}> = {
  no: {
    subject: "Velkommen til Ådience! 🎧",
    tagline: "ARENA AUDIO STREAMING",
    greeting: (n) => `Hei ${n}! 👋`,
    intro: "Velkommen til Ådience! Din gratis 14-dagers pilot er nå aktivert. Her er alt du trenger for å komme i gang.",
    streamIdLabel: "DIN STREAM ID",
    appLinkLabel: "APP-LENKE / QR",
    qrHint: "Scan QR-koden i Ådience-appen, eller del lenken med ditt publikum.",
    nextDays: "De neste 14 dagene:",
    steps: [
      ["Test streamen", "Gå til {cast} og start en testsending med din Stream ID."],
      ["Del med publikum", "Bruk QR-koden eller app-lenken for å invitere de første lytterne."],
      ["Se statistikk", "Logg inn på {minSide} for å se lyttertall og engasjement."],
      ["Sett opp geofence", "Definer arenaens perimeter i geofence-editoren på min-side."],
    ],
    ctaButton: "Start sending nå",
    questions: "Spørsmål? Svar på denne e-posten eller kontakt oss på",
  },
  en: {
    subject: "Welcome to Ådience! 🎧",
    tagline: "VENUE AUDIO STREAMING",
    greeting: (n) => `Hi ${n}! 👋`,
    intro: "Welcome to Ådience! Your free 14-day pilot is now active. Here's everything you need to get started.",
    streamIdLabel: "YOUR STREAM ID",
    appLinkLabel: "APP LINK / QR",
    qrHint: "Scan the QR code in the Ådience app, or share the link with your audience.",
    nextDays: "Over the next 14 days:",
    steps: [
      ["Test the stream", "Go to {cast} and start a test broadcast with your Stream ID."],
      ["Share with your audience", "Use the QR code or app link to invite your first listeners."],
      ["View statistics", "Log in at {minSide} to see listener numbers and engagement."],
      ["Set up your geofence", "Define the venue's perimeter in the geofence editor on My page."],
    ],
    ctaButton: "Start broadcasting now",
    questions: "Questions? Reply to this email or contact us at",
  },
};

function buildHtml(fornavn: string, streamId: string, locale: Locale): string {
  const deepQrUrl = `https://app.adience.no/a/${streamId}`;
  const c = COPY[locale];
  const castUrl = locale === "en" ? "https://app.adience.no/en/cast" : "https://app.adience.no/cast";
  const minSideUrl = locale === "en" ? "https://app.adience.no/en/min-side" : "https://app.adience.no/min-side";
  const castLink = `<a href="${castUrl}" style="color:#33D3C4;text-decoration:none;">${castUrl.replace("https://", "")}</a>`;
  const minSideLink = `<a href="${minSideUrl}" style="color:#33D3C4;text-decoration:none;">${minSideUrl.replace("https://", "")}</a>`;

  return `<!DOCTYPE html>
<html lang="${locale}">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#073E46;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#073E46;padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

        <!-- Header -->
        <tr><td style="padding:0 0 32px 0;text-align:center;">
          <div style="font-size:28px;font-weight:900;letter-spacing:0.12em;color:#33D3C4;">ÅDIENCE</div>
          <div style="font-size:13px;color:rgba(255,255,255,0.4);letter-spacing:0.08em;margin-top:4px;">${c.tagline}</div>
        </td></tr>

        <!-- Card -->
        <tr><td style="background-color:#1E293B;border-radius:16px;padding:48px 40px;border:1px solid rgba(51,211,196,0.15);">

          <!-- Greeting -->
          <p style="font-size:22px;font-weight:700;color:#ffffff;margin:0 0 8px 0;">
            ${c.greeting(fornavn)}
          </p>
          <p style="font-size:16px;color:rgba(255,255,255,0.6);margin:0 0 32px 0;line-height:1.6;">
            ${c.intro}
          </p>

          <!-- Stream ID box -->
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color:rgba(51,211,196,0.06);border:1px solid rgba(51,211,196,0.2);border-radius:10px;margin-bottom:32px;">
            <tr><td style="padding:20px 24px;">
              <div style="font-size:11px;color:rgba(255,255,255,0.4);letter-spacing:0.12em;font-family:monospace;margin-bottom:8px;">${c.streamIdLabel}</div>
              <div style="font-size:22px;color:#33D3C4;font-family:monospace;font-weight:500;letter-spacing:0.06em;">${streamId}</div>
            </td></tr>
          </table>

          <!-- QR / Deep link -->
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color:rgba(255,107,74,0.06);border:1px solid rgba(255,107,74,0.2);border-radius:10px;margin-bottom:32px;">
            <tr><td style="padding:20px 24px;">
              <div style="font-size:11px;color:rgba(255,255,255,0.4);letter-spacing:0.12em;font-family:monospace;margin-bottom:8px;">${c.appLinkLabel}</div>
              <a href="${deepQrUrl}" style="font-size:15px;color:#FF6B4A;font-family:monospace;text-decoration:none;word-break:break-all;">${deepQrUrl}</a>
              <p style="font-size:13px;color:rgba(255,255,255,0.4);margin:8px 0 0 0;">${c.qrHint}</p>
            </td></tr>
          </table>

          <!-- 14-day instructions -->
          <p style="font-size:15px;font-weight:700;color:#ffffff;margin:0 0 16px 0;">${c.nextDays}</p>
          <table width="100%" cellpadding="0" cellspacing="0">
            ${c.steps.map(([title, desc], i) => `
            <tr><td style="padding:0 0 16px 0;">
              <table cellpadding="0" cellspacing="0"><tr>
                <td style="vertical-align:top;padding-right:14px;">
                  <div style="width:28px;height:28px;background-color:rgba(51,211,196,0.15);border-radius:50%;text-align:center;line-height:28px;font-size:12px;font-weight:700;color:#33D3C4;">${i + 1}</div>
                </td>
                <td>
                  <div style="font-size:14px;font-weight:600;color:#ffffff;margin-bottom:2px;">${title}</div>
                  <div style="font-size:13px;color:rgba(255,255,255,0.5);line-height:1.5;">${desc.replace("{cast}", castLink).replace("{minSide}", minSideLink)}</div>
                </td>
              </tr></table>
            </td></tr>`).join("")}
          </table>

          <!-- CTA -->
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:32px;">
            <tr>
              <td align="center">
                <a href="${castUrl}" style="display:inline-block;background-color:#FF6B4A;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:8px;font-size:15px;font-weight:700;letter-spacing:0.04em;">
                  ${c.ctaButton}
                </a>
              </td>
            </tr>
          </table>

        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:32px 0 0 0;text-align:center;">
          <p style="font-size:13px;color:rgba(255,255,255,0.3);margin:0 0 8px 0;">
            ${c.questions}
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

export async function POST(req: NextRequest) {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "BREVO_API_KEY not configured" }, { status: 500 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ error: "Supabase er ikke konfigurert på serveren." }, { status: 500 });
  }

  const { epost, fornavn, streamId, locale: rawLocale } = await req.json() as {
    epost: string;
    fornavn: string;
    streamId: string;
    locale?: string;
  };
  const locale: Locale = rawLocale === "en" ? "en" : "no";

  if (!epost || !streamId) {
    return NextResponse.json({ error: "Missing epost or streamId" }, { status: 400 });
  }

  // Kalles rett etter registrering, FØR e-postbekreftelse -- det finnes ingen
  // innlogget sesjon på dette tidspunktet, så vi kan ikke kreve en bruker-JWT.
  // I stedet: bekreft at epost+streamId faktisk tilhører en nyopprettet arena,
  // via service_role. Uten dette var ruten et åpent e-post-relé (fritt "epost"
  // og "fornavn" til en vilkårlig mottaker).
  const adminClient = createClient(supabaseUrl, serviceRoleKey);
  const { data: matchendeArena } = await adminClient
    .from("arenaer")
    .select("id")
    .eq("stream_id", streamId)
    .ilike("epost", epost.trim())
    .maybeSingle();
  if (!matchendeArena) {
    return NextResponse.json({ error: "Fant ingen arena som matcher epost og streamId." }, { status: 403 });
  }

  const payload = {
    sender: { name: "Ådience", email: "post@adience.no" },
    to: [{ email: epost, name: fornavn || epost }],
    subject: COPY[locale].subject,
    htmlContent: buildHtml(fornavn || (locale === "en" ? "there" : "der"), streamId, locale),
  };

  const res = await fetch(BREVO_URL, {
    method: "POST",
    headers: {
      "api-key": apiKey,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const body = await res.text();
    return NextResponse.json({ error: body }, { status: res.status });
  }

  return NextResponse.json({ ok: true });
}
