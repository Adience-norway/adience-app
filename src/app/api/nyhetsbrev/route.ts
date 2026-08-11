import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";
import { emailShell, sendBrevoEmail } from "@/lib/nyhetsbrev-email";

const EPOST_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function buildVelkomstHtml(fornavn: string, unsubscribeToken: string): string {
  const innerHtml = `
    <p style="font-size:22px;font-weight:700;color:#ffffff;margin:0 0 8px 0;">
      Hei ${fornavn}! 👋
    </p>
    <p style="font-size:16px;color:rgba(255,255,255,0.6);margin:0 0 24px 0;line-height:1.6;">
      Takk for at du følger Ådience. Du får nå beskjed når vi publiserer nye artikler og historier fra menneskene bak speakerteamet — ekte samtaler, ikke reklame.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:8px;">
      <tr>
        <td align="center">
          <a href="https://www.adience.no/blog" style="display:inline-block;background-color:#FF6B4A;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:8px;font-size:15px;font-weight:700;letter-spacing:0.04em;">
            Les siste artikkel
          </a>
        </td>
      </tr>
    </table>`;
  return emailShell(innerHtml, unsubscribeToken);
}

export async function POST(req: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const brevoKey = process.env.BREVO_API_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json({ error: "Supabase er ikke konfigurert på serveren." }, { status: 500 });
  }

  const body = (await req.json()) as { epost?: string; fornavn?: string; kilde?: string };
  const epost = body.epost?.trim().toLowerCase();
  const fornavn = body.fornavn?.trim() || null;
  const kilde = body.kilde?.trim() || "hjemmeside";

  if (!epost || !EPOST_REGEX.test(epost)) {
    return NextResponse.json({ error: "Ugyldig e-postadresse." }, { status: 400 });
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  const unsubscribeToken = randomUUID();

  const { error: dbError } = await supabase
    .from("nyhetsbrev_abonnenter")
    .insert({ epost, fornavn, kilde, unsubscribe_token: unsubscribeToken });

  // 23505 = unique_violation (allerede påmeldt) — det er ikke en feil for brukeren,
  // men da vet vi ikke det ekte unsubscribe_token-et for denne raden, så vi lar
  // velkomstmailen (som trenger tokenet) være uten for et duplikat-forsøk.
  if (dbError && dbError.code !== "23505") {
    return NextResponse.json({ error: dbError.message }, { status: 500 });
  }
  const erNyPameldt = !dbError;

  if (brevoKey && erNyPameldt) {
    const result = await sendBrevoEmail({
      brevoKey,
      epost,
      navn: fornavn || epost,
      emne: "Velkommen til Ådience 🎧",
      htmlContent: buildVelkomstHtml(fornavn || "der", unsubscribeToken),
    });

    if (!result.ok) {
      // Kontakten er allerede lagret i databasen selv om velkomstmailen feiler her.
      return NextResponse.json({ ok: true, warning: result.error }, { status: 200 });
    }
  }

  return NextResponse.json({ ok: true });
}
