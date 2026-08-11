/**
 * send-email — Supabase Auth "Send Email" Hook (Edge Function)
 *
 * Replaces Supabase's built-in auth email sending. Supabase Auth POSTs a signed
 * webhook payload here every time it needs to send an authentication email
 * (signup confirmation, password recovery, magic link, invite, email change,
 * reauthentication, and various notification-only emails). This function
 * verifies the payload, builds the correct action link, and sends the actual
 * email via Brevo's transactional email API.
 *
 * Contract (from Supabase docs — guides/auth/auth-hooks and
 * guides/auth/auth-hooks/send-email-hook):
 *
 *   Request:  POST, body = JSON { user: User, email_data: EmailData }
 *             Signed per the Standard Webhooks spec via headers:
 *               webhook-id, webhook-timestamp, webhook-signature
 *
 *   Success:  any of 200 / 202 / 204 with an empty (or `{}`) JSON body.
 *
 *   Failure:  4xx/5xx with JSON body `{ "error": { "http_code": N, "message": "..." } }`
 *             and a `Content-Type: application/json` header (required on every
 *             response, including errors — omitting it causes Supabase Auth to
 *             treat the response as an Internal Server Error regardless of
 *             your intended status code).
 *             401 is used here for "hook secret / signature invalid".
 *             500 is used for downstream (Brevo) send failures.
 *             429/503 would be treated as retryable by Supabase Auth (not used here).
 *
 *   Action link format (from the "Custom Auth Emails with React Email and
 *   Resend" guide and the Postmark i18n example, both under
 *   guides/auth/auth-hooks/send-email-hook / guides/functions/examples/...):
 *
 *     `${SUPABASE_URL}/auth/v1/verify?token=${token_hash}&type=${email_action_type}&redirect_to=${redirect_to}`
 *
 *   `SUPABASE_URL` is an Edge Function default secret (auto-injected by
 *   Supabase — see guides/functions/secrets), so it is NOT set manually.
 *
 * Env vars this function needs configured as Edge Function secrets:
 *   SEND_EMAIL_HOOK_SECRET  — the "v1,whsec_<base64>" secret shown when you
 *                             create the Send Email hook in the Dashboard
 *                             (Authentication → Hooks). Must be set manually.
 *   BREVO_API_KEY           — Brevo transactional email API key. Must be set manually.
 *   SUPABASE_URL            — auto-injected by Supabase, do not set manually.
 */

import { Webhook } from "https://esm.sh/standardwebhooks@1.0.0";

const BREVO_URL = "https://api.brevo.com/v3/smtp/email";

type Locale = "no" | "en";

// ── Hook payload types (per Supabase "Send Email Hook" JSON Schema) ────────

interface HookUser {
  id: string;
  email: string;
  new_email?: string;
  user_metadata?: Record<string, unknown>;
}

interface HookEmailData {
  token: string; // 6-digit OTP
  token_hash: string;
  redirect_to: string;
  email_action_type: string; // "signup" | "recovery" | "invite" | "magiclink" | "email_change" | "reauthentication" | "email" | ...notification types
  site_url: string;
  token_new: string;
  token_hash_new: string;
  old_email?: string;
  provider?: string;
  factor_type?: string;
}

interface HookPayload {
  user: HookUser;
  email_data: HookEmailData;
}

// ── Locale resolution ────────────────────────────────────────────────────

function getLocale(user: HookUser): Locale {
  const sprak = user.user_metadata?.["sprak"];
  return sprak === "en" ? "en" : "no";
}

// ── Action link builder (the safety-critical part) ──────────────────────
//
// Per Supabase docs, the confirmation/reset/magic-link URL is always:
//   {SUPABASE_URL}/auth/v1/verify?token={token_hash}&type={email_action_type}&redirect_to={redirect_to}
//
// Hitting this GoTrue endpoint verifies the token server-side and then
// redirects the browser to `redirect_to` (which must be an allow-listed URL
// in Auth > URL Configuration). We use URLSearchParams so redirect_to and any
// other values are correctly percent-encoded.

function buildActionLink(
  supabaseUrl: string,
  tokenHash: string,
  emailActionType: string,
  redirectTo: string,
): string {
  const base = `${supabaseUrl}/auth/v1/verify`;
  const params = new URLSearchParams({
    token: tokenHash,
    type: emailActionType,
    redirect_to: redirectTo,
  });
  return `${base}?${params.toString()}`;
}

// ── Bilingual copy ───────────────────────────────────────────────────────

interface ActionCopy {
  subject: string;
  heading: string;
  intro: string;
  ctaLabel: string;
  ignoreNote: string;
  codeIntro: string; // shown above the fallback OTP code
}

interface LocaleCopy {
  tagline: string;
  greeting: string;
  questions: string;
  footer: string;
  actions: Record<string, ActionCopy>;
}

const COPY: Record<Locale, LocaleCopy> = {
  no: {
    tagline: "ARENA AUDIO STREAMING",
    greeting: "Hei! 👋",
    questions: "Spørsmål? Kontakt oss på",
    footer: "Ådience AS · +47 901 82 288 · adience.no",
    actions: {
      signup: {
        subject: "Bekreft e-postadressen din — Ådience",
        heading: "Bekreft e-postadressen din",
        intro:
          "Takk for at du registrerte deg hos Ådience! Klikk på knappen under for å bekrefte e-postadressen din og aktivere kontoen.",
        ctaLabel: "Bekreft e-post",
        ignoreNote:
          "Hvis du ikke opprettet en konto hos Ådience, kan du trygt ignorere denne e-posten.",
        codeIntro: "Eller skriv inn denne koden manuelt:",
      },
      recovery: {
        subject: "Tilbakestill passordet ditt — Ådience",
        heading: "Tilbakestill passordet ditt",
        intro:
          "Vi mottok en forespørsel om å tilbakestille passordet for kontoen din hos Ådience. Klikk på knappen under for å velge et nytt passord.",
        ctaLabel: "Tilbakestill passord",
        ignoreNote:
          "Hvis du ikke ba om dette, kan du trygt ignorere denne e-posten — passordet ditt er uendret.",
        codeIntro: "Eller skriv inn denne koden manuelt:",
      },
      magiclink: {
        subject: "Din innloggingslenke — Ådience",
        heading: "Logg inn hos Ådience",
        intro:
          "Klikk på knappen under for å logge inn. Lenken kan kun brukes én gang og utløper snart.",
        ctaLabel: "Logg inn",
        ignoreNote:
          "Hvis du ikke prøvde å logge inn, kan du trygt ignorere denne e-posten.",
        codeIntro: "Eller skriv inn denne engangskoden manuelt:",
      },
      invite: {
        subject: "Du er invitert til Ådience",
        heading: "Du er invitert til Ådience",
        intro:
          "Du har blitt invitert til å opprette en konto hos Ådience. Klikk på knappen under for å godta invitasjonen og fullføre registreringen.",
        ctaLabel: "Godta invitasjon",
        ignoreNote:
          "Hvis du ikke forventet denne invitasjonen, kan du trygt ignorere denne e-posten.",
        codeIntro: "Eller skriv inn denne koden manuelt:",
      },
      email_change_current: {
        subject: "Bekreft endring av e-postadresse — Ådience",
        heading: "Bekreft endring av e-postadresse",
        intro:
          "Vi mottok en forespørsel om å endre e-postadressen på kontoen din hos Ådience. Klikk på knappen under for å bekrefte at forespørselen kom fra deg.",
        ctaLabel: "Bekreft endring",
        ignoreNote:
          "Hvis du ikke ba om denne endringen, kan du trygt ignorere denne e-posten.",
        codeIntro: "Eller skriv inn denne koden manuelt:",
      },
      email_change_new: {
        subject: "Bekreft din nye e-postadresse — Ådience",
        heading: "Bekreft din nye e-postadresse",
        intro:
          "Klikk på knappen under for å bekrefte denne e-postadressen som den nye e-postadressen for kontoen din hos Ådience.",
        ctaLabel: "Bekreft ny e-post",
        ignoreNote:
          "Hvis du ikke ba om denne endringen, kan du trygt ignorere denne e-posten.",
        codeIntro: "Eller skriv inn denne koden manuelt:",
      },
      reauthentication: {
        subject: "Din verifiseringskode — Ådience",
        heading: "Bekreft identiteten din",
        intro:
          "Bruk koden under for å bekrefte identiteten din hos Ådience. Koden utløper snart.",
        ctaLabel: "",
        ignoreNote:
          "Hvis du ikke ba om dette, kan du trygt ignorere denne e-posten.",
        codeIntro: "Din engangskode:",
      },
      default: {
        subject: "Varsel fra Ådience",
        heading: "Varsel fra Ådience",
        intro: "Det har skjedd en endring på kontoen din hos Ådience.",
        ctaLabel: "Åpne Ådience",
        ignoreNote:
          "Hvis dette ikke var deg, ta kontakt med oss på post@adience.no.",
        codeIntro: "Referansekode:",
      },
    },
  },
  en: {
    tagline: "ARENA AUDIO STREAMING",
    greeting: "Hi! 👋",
    questions: "Questions? Contact us at",
    footer: "Ådience AS · +47 901 82 288 · adience.no",
    actions: {
      signup: {
        subject: "Confirm your email address — Ådience",
        heading: "Confirm your email address",
        intro:
          "Thanks for signing up with Ådience! Click the button below to confirm your email address and activate your account.",
        ctaLabel: "Confirm email",
        ignoreNote:
          "If you didn't create an account with Ådience, you can safely ignore this email.",
        codeIntro: "Or enter this code manually:",
      },
      recovery: {
        subject: "Reset your password — Ådience",
        heading: "Reset your password",
        intro:
          "We received a request to reset the password for your Ådience account. Click the button below to choose a new one.",
        ctaLabel: "Reset password",
        ignoreNote:
          "If you didn't request this, you can safely ignore this email — your password is unchanged.",
        codeIntro: "Or enter this code manually:",
      },
      magiclink: {
        subject: "Your sign-in link — Ådience",
        heading: "Sign in to Ådience",
        intro:
          "Click the button below to sign in. This link can only be used once and expires shortly.",
        ctaLabel: "Sign in",
        ignoreNote:
          "If you didn't try to sign in, you can safely ignore this email.",
        codeIntro: "Or enter this one-time code manually:",
      },
      invite: {
        subject: "You've been invited to Ådience",
        heading: "You've been invited to Ådience",
        intro:
          "You've been invited to create an account with Ådience. Click the button below to accept the invitation and finish signing up.",
        ctaLabel: "Accept invitation",
        ignoreNote:
          "If you weren't expecting this invitation, you can safely ignore this email.",
        codeIntro: "Or enter this code manually:",
      },
      email_change_current: {
        subject: "Confirm your email change — Ådience",
        heading: "Confirm your email change",
        intro:
          "We received a request to change the email address on your Ådience account. Click the button below to confirm this request came from you.",
        ctaLabel: "Confirm change",
        ignoreNote:
          "If you didn't request this change, you can safely ignore this email.",
        codeIntro: "Or enter this code manually:",
      },
      email_change_new: {
        subject: "Confirm your new email address — Ådience",
        heading: "Confirm your new email address",
        intro:
          "Click the button below to confirm this address as the new email address for your Ådience account.",
        ctaLabel: "Confirm new email",
        ignoreNote:
          "If you didn't request this change, you can safely ignore this email.",
        codeIntro: "Or enter this code manually:",
      },
      reauthentication: {
        subject: "Your verification code — Ådience",
        heading: "Confirm your identity",
        intro:
          "Use the code below to confirm your identity on Ådience. It expires shortly.",
        ctaLabel: "",
        ignoreNote:
          "If you didn't request this, you can safely ignore this email.",
        codeIntro: "Your one-time code:",
      },
      default: {
        subject: "Notification from Ådience",
        heading: "Notification from Ådience",
        intro: "Something changed on your Ådience account.",
        ctaLabel: "Open Ådience",
        ignoreNote:
          "If this wasn't you, please contact us at post@adience.no.",
        codeIntro: "Reference code:",
      },
    },
  },
};

// ── HTML email (same visual pattern as our welcome email) ───────────────

function buildHtml(
  locale: Locale,
  action: ActionCopy,
  actionLink: string | null,
  token: string,
): string {
  const c = COPY[locale];

  const ctaBlock = actionLink
    ? `
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:32px;">
            <tr><td align="center">
              <a href="${actionLink}" style="display:inline-block;background-color:#FF6B4A;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:8px;font-size:15px;font-weight:700;letter-spacing:0.04em;">${action.ctaLabel}</a>
            </td></tr>
          </table>
          <p style="font-size:13px;color:rgba(255,255,255,0.4);margin:24px 0 0 0;text-align:center;">${action.codeIntro}</p>
          <p style="font-size:20px;letter-spacing:0.15em;color:#33D3C4;font-weight:700;margin:8px 0 0 0;text-align:center;font-family:monospace;">${token}</p>
          <p style="font-size:12px;color:rgba(255,255,255,0.25);margin:24px 0 0 0;text-align:center;word-break:break-all;">
            <a href="${actionLink}" style="color:rgba(255,255,255,0.35);text-decoration:underline;">${actionLink}</a>
          </p>`
    : `
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:8px;">
            <tr><td align="center">
              <p style="font-size:13px;color:rgba(255,255,255,0.4);margin:0 0 8px 0;">${action.codeIntro}</p>
              <p style="font-size:32px;letter-spacing:0.25em;color:#33D3C4;font-weight:700;margin:0;font-family:monospace;">${token}</p>
            </td></tr>
          </table>`;

  return `<!DOCTYPE html>
<html lang="${locale}">
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
          <p style="font-size:18px;font-weight:700;color:#ffffff;margin:0 0 16px 0;">${action.heading}</p>
          <p style="font-size:16px;color:rgba(255,255,255,0.6);margin:0 0 8px 0;line-height:1.6;">${action.intro}</p>
          ${ctaBlock}
          <p style="font-size:13px;color:rgba(255,255,255,0.3);margin:32px 0 0 0;line-height:1.6;">${action.ignoreNote}</p>
        </td></tr>
        <tr><td style="padding:32px 0 0 0;text-align:center;">
          <p style="font-size:13px;color:rgba(255,255,255,0.3);margin:0 0 8px 0;">${c.questions} <a href="mailto:post@adience.no" style="color:#33D3C4;text-decoration:none;"> post@adience.no</a></p>
          <p style="font-size:12px;color:rgba(255,255,255,0.2);margin:0;">${c.footer}</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ── Brevo send ────────────────────────────────────────────────────────────

interface BrevoMessage {
  sender: { name: string; email: string };
  to: { email: string }[];
  subject: string;
  htmlContent: string;
}

function buildMessage(
  toEmail: string,
  locale: Locale,
  kind: string,
  actionLink: string | null,
  token: string,
): BrevoMessage {
  const action = COPY[locale].actions[kind] ?? COPY[locale].actions.default;
  return {
    sender: { name: "Ådience", email: "post@adience.no" },
    to: [{ email: toEmail }],
    subject: action.subject,
    htmlContent: buildHtml(locale, action, actionLink, token),
  };
}

// Builds the list of emails to send for this hook invocation. Almost always
// a single message; "email_change" can require two (one to the current
// address, one to the new address) when Secure Email Change is enabled.
function buildMessages(
  user: HookUser,
  emailData: HookEmailData,
  supabaseUrl: string,
  locale: Locale,
): BrevoMessage[] {
  const actionType = emailData.email_action_type;

  if (actionType === "email_change") {
    // Per Supabase docs, the field naming is counterintuitive:
    //   token_hash_new -> pairs with `token`     -> goes to the CURRENT email (user.email)
    //   token_hash     -> pairs with `token_new`  -> goes to the NEW email (user.new_email)
    const secureChange = Boolean(emailData.token_new && emailData.token_hash_new);
    const messages: BrevoMessage[] = [];

    if (secureChange) {
      const linkForCurrent = buildActionLink(
        supabaseUrl,
        emailData.token_hash_new,
        actionType,
        emailData.redirect_to,
      );
      messages.push(
        buildMessage(user.email, locale, "email_change_current", linkForCurrent, emailData.token),
      );

      const newEmail = user.new_email;
      if (newEmail) {
        const linkForNew = buildActionLink(
          supabaseUrl,
          emailData.token_hash,
          actionType,
          emailData.redirect_to,
        );
        messages.push(
          buildMessage(newEmail, locale, "email_change_new", linkForNew, emailData.token_new),
        );
      }
    } else {
      // Only one OTP/hash pair present (Secure Email Change disabled) — single
      // email to the new address, using whichever pair was actually sent.
      const tokenHash = emailData.token_hash || emailData.token_hash_new;
      const token = emailData.token || emailData.token_new;
      const newEmail = user.new_email ?? user.email;
      const link = buildActionLink(supabaseUrl, tokenHash, actionType, emailData.redirect_to);
      messages.push(buildMessage(newEmail, locale, "email_change_new", link, token));
    }

    return messages;
  }

  // All other action types: a single email to user.email.
  const kind = COPY[locale].actions[actionType] ? actionType : "default";
  const link = emailData.token_hash
    ? buildActionLink(supabaseUrl, emailData.token_hash, actionType, emailData.redirect_to)
    : null;
  return [buildMessage(user.email, locale, kind, link, emailData.token)];
}

async function sendViaBrevo(message: BrevoMessage, brevoApiKey: string): Promise<void> {
  const res = await fetch(BREVO_URL, {
    method: "POST",
    headers: {
      "api-key": brevoApiKey,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(message),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Brevo send failed (${res.status}): ${errText}`);
  }
}

// ── HTTP handler ──────────────────────────────────────────────────────────

function jsonError(httpCode: number, message: string): Response {
  return new Response(
    JSON.stringify({ error: { http_code: httpCode, message } }),
    { status: httpCode, headers: { "Content-Type": "application/json" } },
  );
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return jsonError(400, "Method not allowed");
  }

  const hookSecretRaw = Deno.env.get("SEND_EMAIL_HOOK_SECRET");
  const brevoApiKey = Deno.env.get("BREVO_API_KEY");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");

  if (!hookSecretRaw || !brevoApiKey || !supabaseUrl) {
    console.error(
      "send-email: missing required env vars (need SEND_EMAIL_HOOK_SECRET, BREVO_API_KEY; SUPABASE_URL is auto-injected)",
    );
    return jsonError(500, "Server misconfigured");
  }

  // IMPORTANT: read the raw body text — the signature is computed over the
  // exact bytes Supabase sent. Do NOT req.json() before verifying.
  const payload = await req.text();
  const headers = Object.fromEntries(req.headers);

  // Both Webhook construction (bad secret format, e.g. stray whitespace from
  // a copy-paste) and .verify() (bad signature) can throw — catch both so a
  // malformed secret returns a clean, logged 401 instead of crashing the
  // whole handler (which Supabase would surface as an opaque "Internal
  // Server Error" with no detail).
  let verified: HookPayload;
  try {
    const wh = new Webhook(hookSecretRaw.trim().replace("v1,whsec_", ""));
    verified = wh.verify(payload, headers) as HookPayload;
  } catch (err) {
    console.error("send-email: webhook signature verification failed:", err);
    return jsonError(401, "Invalid webhook signature");
  }

  const { user, email_data } = verified;
  const locale = getLocale(user);

  try {
    const messages = buildMessages(user, email_data, supabaseUrl, locale);
    for (const message of messages) {
      await sendViaBrevo(message, brevoApiKey);
    }
  } catch (err) {
    console.error("send-email: failed to send auth email via Brevo:", err);
    return jsonError(500, "Failed to send email");
  }

  // Success: Supabase Auth only requires a 200/202/204. An empty JSON object
  // is enough — no response body is otherwise interpreted.
  return new Response(JSON.stringify({}), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
