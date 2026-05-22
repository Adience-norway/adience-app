import { NextRequest, NextResponse } from "next/server";

const BREVO_URL = "https://api.brevo.com/v3/smtp/email";

function buildHtml(fornavn: string, streamId: string): string {
  const deepQrUrl = `adience://${streamId}`;
  return `<!DOCTYPE html>
<html lang="no">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#052630;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#052630;padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

        <!-- Header -->
        <tr><td style="padding:0 0 32px 0;text-align:center;">
          <div style="font-size:28px;font-weight:900;letter-spacing:0.12em;color:#21D4BD;">ÅDIENCE</div>
          <div style="font-size:13px;color:rgba(255,255,255,0.4);letter-spacing:0.08em;margin-top:4px;">ARENA AUDIO STREAMING</div>
        </td></tr>

        <!-- Card -->
        <tr><td style="background-color:#1E293B;border-radius:16px;padding:48px 40px;border:1px solid rgba(33,212,189,0.15);">

          <!-- Greeting -->
          <p style="font-size:22px;font-weight:700;color:#ffffff;margin:0 0 8px 0;">
            Hei ${fornavn}! 👋
          </p>
          <p style="font-size:16px;color:rgba(255,255,255,0.6);margin:0 0 32px 0;line-height:1.6;">
            Velkommen til Ådience! Din gratis 14-dagers pilot er nå aktivert. Her er alt du trenger for å komme i gang.
          </p>

          <!-- Stream ID box -->
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color:rgba(33,212,189,0.06);border:1px solid rgba(33,212,189,0.2);border-radius:10px;margin-bottom:32px;">
            <tr><td style="padding:20px 24px;">
              <div style="font-size:11px;color:rgba(255,255,255,0.4);letter-spacing:0.12em;font-family:monospace;margin-bottom:8px;">DIN STREAM ID</div>
              <div style="font-size:22px;color:#21D4BD;font-family:monospace;font-weight:500;letter-spacing:0.06em;">${streamId}</div>
            </td></tr>
          </table>

          <!-- QR / Deep link -->
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color:rgba(255,107,74,0.06);border:1px solid rgba(255,107,74,0.2);border-radius:10px;margin-bottom:32px;">
            <tr><td style="padding:20px 24px;">
              <div style="font-size:11px;color:rgba(255,255,255,0.4);letter-spacing:0.12em;font-family:monospace;margin-bottom:8px;">APP-LENKE / QR</div>
              <a href="${deepQrUrl}" style="font-size:15px;color:#FF6B4A;font-family:monospace;text-decoration:none;word-break:break-all;">${deepQrUrl}</a>
              <p style="font-size:13px;color:rgba(255,255,255,0.4);margin:8px 0 0 0;">Scan QR-koden i Ådience-appen, eller del lenken med ditt publikum.</p>
            </td></tr>
          </table>

          <!-- 14-day instructions -->
          <p style="font-size:15px;font-weight:700;color:#ffffff;margin:0 0 16px 0;">De neste 14 dagene:</p>
          <table width="100%" cellpadding="0" cellspacing="0">
            ${[
              ["1", "Test streamen", "Gå til adience.no/cast og start en testsending med din Stream ID."],
              ["2", "Del med publikum", "Bruk QR-koden eller app-lenken for å invitere de første lytterne."],
              ["3", "Se statistikk", "Logg inn på adience.no/min-side for å se lyttertall og engasjement."],
              ["4", "Sett opp geofence", "Definer arenaens perimeter i geofence-editoren på min-side."],
            ].map(([n, title, desc]) => `
            <tr><td style="padding:0 0 16px 0;">
              <table cellpadding="0" cellspacing="0"><tr>
                <td style="vertical-align:top;padding-right:14px;">
                  <div style="width:28px;height:28px;background-color:rgba(33,212,189,0.15);border-radius:50%;text-align:center;line-height:28px;font-size:12px;font-weight:700;color:#21D4BD;">${n}</div>
                </td>
                <td>
                  <div style="font-size:14px;font-weight:600;color:#ffffff;margin-bottom:2px;">${title}</div>
                  <div style="font-size:13px;color:rgba(255,255,255,0.5);line-height:1.5;">${desc}</div>
                </td>
              </tr></table>
            </td></tr>`).join("")}
          </table>

          <!-- CTA -->
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:32px;">
            <tr>
              <td align="center">
                <a href="https://adience.no/cast" style="display:inline-block;background-color:#FF6B4A;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:8px;font-size:15px;font-weight:700;letter-spacing:0.04em;">
                  Start sending nå
                </a>
              </td>
            </tr>
          </table>

        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:32px 0 0 0;text-align:center;">
          <p style="font-size:13px;color:rgba(255,255,255,0.3);margin:0 0 8px 0;">
            Spørsmål? Svar på denne e-posten eller kontakt oss på
            <a href="mailto:post@adience.no" style="color:#21D4BD;text-decoration:none;"> post@adience.no</a>
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

  const { epost, fornavn, streamId } = await req.json() as {
    epost: string;
    fornavn: string;
    streamId: string;
  };

  if (!epost || !streamId) {
    return NextResponse.json({ error: "Missing epost or streamId" }, { status: 400 });
  }

  const payload = {
    sender: { name: "Ådience", email: "post@adience.no" },
    to: [{ email: epost, name: fornavn || epost }],
    subject: "Velkommen til Ådience! 🎧",
    htmlContent: buildHtml(fornavn || "der", streamId),
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
