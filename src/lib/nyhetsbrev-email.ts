export function emailShell(innerHtml: string, unsubscribeToken: string): string {
  const avmeldUrl = `https://app.adience.no/api/nyhetsbrev/avmeld?token=${unsubscribeToken}`;
  return `<!DOCTYPE html>
<html lang="no">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#073E46;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#073E46;padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

        <tr><td style="padding:0 0 32px 0;text-align:center;">
          <div style="font-size:28px;font-weight:900;letter-spacing:0.12em;color:#33D3C4;">ÅDIENCE</div>
          <div style="font-size:13px;color:rgba(255,255,255,0.4);letter-spacing:0.08em;margin-top:4px;">BAK MIKROFONEN</div>
        </td></tr>

        <tr><td style="background-color:#1E293B;border-radius:16px;padding:48px 40px;border:1px solid rgba(51,211,196,0.15);">
          ${innerHtml}
        </td></tr>

        <tr><td style="padding:32px 0 0 0;text-align:center;">
          <p style="font-size:13px;color:rgba(255,255,255,0.3);margin:0 0 8px 0;">
            Spørsmål? Svar på denne e-posten eller kontakt oss på
            <a href="mailto:post@adience.no" style="color:#33D3C4;text-decoration:none;"> post@adience.no</a>
          </p>
          <p style="font-size:12px;color:rgba(255,255,255,0.2);margin:0 0 8px 0;">
            Ådience AS · adience.no · Du får denne fordi du meldte deg på nyhetsbrevet på adience.no
          </p>
          <p style="font-size:12px;margin:0;">
            <a href="${avmeldUrl}" style="color:rgba(255,255,255,0.35);text-decoration:underline;">Meld deg av nyhetsbrevet</a>
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export async function sendBrevoEmail(opts: {
  brevoKey: string;
  epost: string;
  navn: string;
  emne: string;
  htmlContent: string;
}): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "api-key": opts.brevoKey,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      sender: { name: "Ådience", email: "post@adience.no" },
      to: [{ email: opts.epost, name: opts.navn || opts.epost }],
      subject: opts.emne,
      htmlContent: opts.htmlContent,
    }),
  });

  if (!res.ok) {
    return { ok: false, error: await res.text() };
  }
  return { ok: true };
}
