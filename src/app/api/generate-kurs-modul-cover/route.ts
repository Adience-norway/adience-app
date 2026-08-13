import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import Anthropic from "@anthropic-ai/sdk";

type Locale = "no" | "en";

const ERRORS: Record<Locale, {
  notConfigured: string; missingKey: string; missingToken: string;
  invalidSession: string; noAccess: string; invalidModule: string;
  generateFailed: string; uploadFailed: string; saveFailed: string;
}> = {
  no: {
    notConfigured: "Supabase er ikke fullstendig konfigurert på serveren.",
    missingKey: "Mangler OPENAI_API_KEY på serveren.",
    missingToken: "Mangler innloggingstoken.",
    invalidSession: "Ugyldig eller utløpt innlogging.",
    noAccess: "Du har ikke admin-tilgang til å gjøre dette.",
    invalidModule: "Ugyldig modul.",
    generateFailed: "Klarte ikke generere bildet.",
    uploadFailed: "Klarte ikke laste opp bildet.",
    saveFailed: "Bildet ble generert, men kunne ikke lagres.",
  },
  en: {
    notConfigured: "Supabase isn't fully configured on the server.",
    missingKey: "Missing OPENAI_API_KEY on the server.",
    missingToken: "Missing login token.",
    invalidSession: "Invalid or expired login.",
    noAccess: "You don't have admin access to do this.",
    invalidModule: "Invalid module.",
    generateFailed: "Couldn't generate the image.",
    uploadFailed: "Couldn't upload the image.",
    saveFailed: "The image was generated, but couldn't be saved.",
  },
};

// Fast stilprofil -- samme som /api/generate-kurs-bilde -- skaper visuell
// helhet på tvers av alle fem modul-illustrasjonene.
const STILPROFIL =
  "Editorial illustration for a sports/event-venue speaker training course. " +
  "Clean, modern, minimalist style. Color palette dominated by deep teal " +
  "(#073E46), bright teal accent (#33D3C4), and warm coral (#FF6B4A) on a " +
  "dark background. Wide 3:2 header composition. No text, no logos, no " +
  "watermarks, no readable signage anywhere in the image.";

// Standard-motiv per modul -- brukes når admin ikke selv skriver en prompt,
// slik at "generer alle" fungerer uten at noen må tenke ut et motiv selv.
const MODUL_MOTIV = [
  "A diverse speaker team of three people wearing headsets, standing together in an empty stadium tunnel, looking out toward the pitch. A sense of camaraderie and teamwork.",
  "A sound engineer's hands adjusting sliders on an audio mixing console, headphones resting nearby, a broadcast booth overlooking a sports arena bowl.",
  "A stadium announcer speaking into a microphone with an energetic, blurred crowd in the background and a big screen visible. Live event atmosphere.",
  "A calm safety briefing in an arena control room: a clipboard with a plan, a radio handset on the table. A sense of preparedness and responsibility.",
  "A speaker team shaking hands after a successful broadcast, warm sunset light across empty stadium stands. A sense of accomplishment.",
];

export async function POST(req: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;

  const body = (await req.json()) as { modulIndex?: number; prompt?: string; locale?: string };
  const locale: Locale = body.locale === "en" ? "en" : "no";
  const err = ERRORS[locale];

  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return NextResponse.json({ error: err.notConfigured }, { status: 500 });
  }
  if (!openaiKey) {
    return NextResponse.json({ error: err.missingKey }, { status: 500 });
  }

  const authHeader = req.headers.get("authorization");
  const callerToken = authHeader?.replace("Bearer ", "");
  if (!callerToken) {
    return NextResponse.json({ error: err.missingToken }, { status: 401 });
  }

  const modulIndex = body.modulIndex;
  if (typeof modulIndex !== "number" || modulIndex < 0 || modulIndex > 4) {
    return NextResponse.json({ error: err.invalidModule }, { status: 400 });
  }

  const callerClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${callerToken}` } },
  });
  const { data: callerUser, error: callerError } = await callerClient.auth.getUser();
  if (callerError || !callerUser?.user) {
    return NextResponse.json({ error: err.invalidSession }, { status: 401 });
  }
  const { data: callerBruker } = await callerClient
    .from("brukere")
    .select("er_adience_admin")
    .eq("id", callerUser.user.id)
    .single();
  if (!callerBruker?.er_adience_admin) {
    return NextResponse.json({ error: err.noAccess }, { status: 403 });
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey);

  // Ingen egen prompt gitt -- hent modulens faktiske kursTekst og la Claude
  // trekke ut et konkret visuelt motiv fra INNHOLDET, i stedet for å alltid
  // falle tilbake på det samme faste, generiske motivet for modulen.
  let motiv = body.prompt?.trim();
  if (!motiv) {
    const { data: tekstBlokker } = await adminClient
      .from("kurs_innhold")
      .select("innhold")
      .eq("modul_index", modulIndex)
      .eq("type", "tekst")
      .in("sprak", ["no", "en"])
      .order("rekkefolge", { ascending: true });
    const kursTekst = (tekstBlokker ?? []).map((b) => b.innhold).join("\n\n");

    if (kursTekst && process.env.ANTHROPIC_API_KEY) {
      try {
        const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
        const response = await anthropic.messages.create({
          model: "claude-opus-4-8",
          max_tokens: 200,
          output_config: { effort: "low" },
          messages: [{
            role: "user",
            content: `Read this speaker-training course module text (may be in Norwegian):\n\n${kursTekst}\n\nDescribe, in one or two vivid sentences in English, a single concrete visual scene that captures this module's central theme -- suitable as a prompt for an AI image generator. No text/logos/signage in the scene. Reply with only the scene description, nothing else.`,
          }],
        });
        const textBlock = response.content.find((b) => b.type === "text");
        const avledet = textBlock?.type === "text" ? textBlock.text.trim() : "";
        if (avledet) motiv = avledet;
      } catch {
        // Faller tilbake på standardmotivet under -- ikke kritisk.
      }
    }
    if (!motiv) motiv = MODUL_MOTIV[modulIndex];
  }

  let b64: string;
  try {
    const genRes = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: { Authorization: `Bearer ${openaiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-image-1",
        prompt: `${STILPROFIL}\n\nMotiv: ${motiv}`,
        size: "1536x1024",
        quality: "medium",
      }),
    });
    if (!genRes.ok) {
      const errText = await genRes.text();
      throw new Error(errText);
    }
    const genData = await genRes.json();
    b64 = genData?.data?.[0]?.b64_json;
    if (!b64) throw new Error("no b64_json in response");
  } catch (e) {
    const message = e instanceof Error ? e.message : err.generateFailed;
    return NextResponse.json({ error: `${err.generateFailed} (${message})` }, { status: 502 });
  }

  const path = `covers/${modulIndex}-${Date.now()}.png`;
  const bytes = Buffer.from(b64, "base64");
  const { data: uploadData, error: uploadError } = await adminClient.storage
    .from("kurs-media")
    .upload(path, bytes, { contentType: "image/png" });
  if (uploadError || !uploadData) {
    return NextResponse.json({ error: err.uploadFailed }, { status: 502 });
  }
  const publicUrl = adminClient.storage.from("kurs-media").getPublicUrl(uploadData.path).data.publicUrl;

  const { data: cover, error: upsertError } = await adminClient
    .from("kurs_modul_cover")
    .upsert({ modul_index: modulIndex, bilde_url: publicUrl, kilde: "ai", oppdatert: new Date().toISOString() })
    .select("*")
    .single();
  if (upsertError || !cover) {
    return NextResponse.json({ error: err.saveFailed, url: publicUrl }, { status: 500 });
  }

  return NextResponse.json({ ok: true, cover });
}
