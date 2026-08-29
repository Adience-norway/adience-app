import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import QRCode from "qrcode";
import { sendBrevoEmail } from "@/lib/nyhetsbrev-email";

type Locale = "no" | "en";
type Mal = "speakerteam" | "meg-selv";

const ERRORS: Record<Locale, {
  notConfigured: string; missingToken: string; invalidSession: string; noAccess: string;
  invalidMal: string; noStreamId: string; noRecipients: string; genericError: string;
}> = {
  no: {
    notConfigured: "Serveren er ikke fullstendig konfigurert.",
    missingToken: "Mangler innloggingstoken.",
    invalidSession: "Ugyldig eller utløpt innlogging.",
    noAccess: "Du er ikke eier av denne arenaen.",
    invalidMal: "Ugyldig mottaker.",
    noStreamId: "Arenaen har ingen stream-ID ennå.",
    noRecipients: "Ingen i speakerteamet har registrert e-post ennå.",
    genericError: "Kunne ikke sende e-post.",
  },
  en: {
    notConfigured: "The server isn't fully configured.",
    missingToken: "Missing login token.",
    invalidSession: "Invalid or expired login.",
    noAccess: "You are not the owner of this venue.",
    invalidMal: "Invalid recipient.",
    noStreamId: "This venue doesn't have a stream ID yet.",
    noRecipients: "No one on the speaker team has a registered email yet.",
    genericError: "Couldn't send the email.",
  },
};

function buildStreamInfoHtml(opts: {
  navn: string; arenanavn: string; streamId: string; castPassord: string; castUrl: string; qrDataUrl: string; locale: Locale;
}): string {
  const c = opts.locale === "en"
    ? {
        tagline: "ARENA AUDIO STREAMING",
        greeting: `Hi ${opts.navn}!`,
        intro: `${opts.arenanavn} uses Ådience for audio streaming. Here's the login for the broadcast tool, and the QR code your audience uses to join.`,
        streamIdLabel: "STREAM ID", passwordLabel: "PASSWORD", qrLabel: "AUDIENCE QR CODE",
        ctaButton: "Open the broadcast tool",
        questions: "Questions? Reply to this email or contact us at",
      }
    : {
        tagline: "ARENA AUDIO STREAMING",
        greeting: `Hei ${opts.navn}!`,
        intro: `${opts.arenanavn} bruker Ådience til lydstreaming. Her er innloggingen til castingverktøyet, og QR-koden publikum bruker for å bli med.`,
        streamIdLabel: "STREAM-ID", passwordLabel: "PASSORD", qrLabel: "QR-KODE FOR PUBLIKUM",
        ctaButton: "Åpne castingverktøyet",
        questions: "Spørsmål? Svar på denne e-posten eller kontakt oss på",
      };

  return `<!DOCTYPE html>
<html lang="${opts.locale}">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#073E46;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#073E46;padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

        <tr><td style="padding:0 0 32px 0;text-align:center;">
          <div style="font-size:28px;font-weight:900;letter-spacing:0.12em;color:#33D3C4;">ÅDIENCE</div>
          <div style="font-size:13px;color:rgba(255,255,255,0.4);letter-spacing:0.08em;margin-top:4px;">${c.tagline}</div>
        </td></tr>

        <tr><td style="background-color:#1E293B;border-radius:16px;padding:48px 40px;border:1px solid rgba(51,211,196,0.15);">
          <p style="font-size:22px;font-weight:700;color:#ffffff;margin:0 0 8px 0;">${c.greeting}</p>
          <p style="font-size:16px;color:rgba(255,255,255,0.6);margin:0 0 32px 0;line-height:1.6;">${c.intro}</p>

          <table width="100%" cellpadding="0" cellspacing="0" style="background-color:rgba(51,211,196,0.06);border:1px solid rgba(51,211,196,0.2);border-radius:10px;margin-bottom:16px;">
            <tr><td style="padding:20px 24px;">
              <div style="font-size:11px;color:rgba(255,255,255,0.4);letter-spacing:0.12em;font-family:monospace;margin-bottom:8px;">${c.streamIdLabel}</div>
              <div style="font-size:22px;color:#33D3C4;font-family:monospace;font-weight:500;letter-spacing:0.06em;">${opts.streamId}</div>
            </td></tr>
          </table>

          <table width="100%" cellpadding="0" cellspacing="0" style="background-color:rgba(255,107,74,0.06);border:1px solid rgba(255,107,74,0.2);border-radius:10px;margin-bottom:32px;">
            <tr><td style="padding:20px 24px;">
              <div style="font-size:11px;color:rgba(255,255,255,0.4);letter-spacing:0.12em;font-family:monospace;margin-bottom:8px;">${c.passwordLabel}</div>
              <div style="font-size:22px;color:#FF6B4A;font-family:monospace;font-weight:500;letter-spacing:0.06em;">${opts.castPassord}</div>
            </td></tr>
          </table>

          <p style="font-size:11px;color:rgba(255,255,255,0.4);letter-spacing:0.12em;font-family:monospace;margin:0 0 12px 0;text-align:center;">${c.qrLabel}</p>
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
            <tr><td align="center">
              <img src="${opts.qrDataUrl}" alt="QR" width="220" height="220" style="display:block;border-radius:8px;" />
            </td></tr>
          </table>

          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td align="center">
              <a href="${opts.castUrl}" style="display:inline-block;background-color:#FF6B4A;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:8px;font-size:15px;font-weight:700;letter-spacing:0.04em;">
                ${c.ctaButton}
              </a>
            </td></tr>
          </table>
        </td></tr>

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
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const brevoKey = process.env.BREVO_API_KEY;

  const body = (await req.json()) as { arenaId?: string; mal?: string; locale?: string };
  const locale: Locale = body.locale === "en" ? "en" : "no";
  const err = ERRORS[locale];

  if (!supabaseUrl || !anonKey || !serviceRoleKey || !brevoKey) {
    return NextResponse.json({ error: err.notConfigured }, { status: 500 });
  }

  const authHeader = req.headers.get("authorization");
  const callerToken = authHeader?.replace("Bearer ", "");
  if (!callerToken) {
    return NextResponse.json({ error: err.missingToken }, { status: 401 });
  }

  const arenaId = body.arenaId?.trim();
  const mal = body.mal as Mal | undefined;
  if (!arenaId || (mal !== "speakerteam" && mal !== "meg-selv")) {
    return NextResponse.json({ error: err.invalidMal }, { status: 400 });
  }

  // Samme eierskaps-mønster som /api/stripe/checkout: verifiser via
  // innringerens egen token, ikke via klient-oppgitt arenaId alene.
  const callerClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${callerToken}` } },
  });
  const { data: callerUser, error: callerError } = await callerClient.auth.getUser();
  if (callerError || !callerUser?.user) {
    return NextResponse.json({ error: err.invalidSession }, { status: 401 });
  }
  const { data: eierTilgang } = await callerClient
    .from("arena_tilganger")
    .select("id")
    .eq("bruker_id", callerUser.user.id)
    .eq("arena_id", arenaId)
    .eq("rolle", "eier")
    .maybeSingle();
  if (!eierTilgang) {
    return NextResponse.json({ error: err.noAccess }, { status: 403 });
  }

  // cast_passord er sperret for vanlig select (se lock_down_cast_passord_column_v2)
  // -- service_role hopper over RLS, men det er trygt her siden eierskap
  // allerede er bekreftet over med innringerens EGEN token.
  const adminClient = createClient(supabaseUrl, serviceRoleKey);
  const { data: arena } = await adminClient
    .from("arenaer")
    .select("arenanavn, stream_id, cast_passord")
    .eq("id", arenaId)
    .single();
  if (!arena?.stream_id || !arena.cast_passord) {
    return NextResponse.json({ error: err.noStreamId }, { status: 400 });
  }

  let mottakere: { epost: string; navn: string }[] = [];
  if (mal === "meg-selv") {
    if (callerUser.user.email) {
      mottakere = [{ epost: callerUser.user.email, navn: arena.arenanavn }];
    }
  } else {
    const { data: speakerteam } = await adminClient
      .from("speakerteam")
      .select("epost, fornavn")
      .eq("arena_id", arenaId);
    mottakere = (speakerteam ?? [])
      .filter((s) => s.epost)
      .map((s) => ({ epost: s.epost as string, navn: s.fornavn || (s.epost as string) }));
  }
  if (mottakere.length === 0) {
    return NextResponse.json({ error: err.noRecipients }, { status: 400 });
  }

  const castUrl = locale === "en" ? "https://app.adience.no/en/cast" : "https://app.adience.no/cast";
  const qrDataUrl = await QRCode.toDataURL(`https://app.adience.no/a/${arena.stream_id}`, {
    width: 440, margin: 2, color: { dark: "#073E46", light: "#33D3C4" },
  });

  let sendt = 0;
  const feil: string[] = [];
  for (const mottaker of mottakere) {
    const result = await sendBrevoEmail({
      brevoKey,
      epost: mottaker.epost,
      navn: mottaker.navn,
      emne: locale === "en" ? `Ådience streaming details — ${arena.arenanavn}` : `Ådience streaminginfo — ${arena.arenanavn}`,
      htmlContent: buildStreamInfoHtml({
        navn: mottaker.navn, arenanavn: arena.arenanavn, streamId: arena.stream_id,
        castPassord: arena.cast_passord, castUrl, qrDataUrl, locale,
      }),
    });
    if (result.ok) sendt++; else feil.push(`${mottaker.epost}: ${result.error}`);
  }

  if (sendt === 0) {
    return NextResponse.json({ error: err.genericError }, { status: 502 });
  }
  return NextResponse.json({ ok: true, sendt, feil });
}
