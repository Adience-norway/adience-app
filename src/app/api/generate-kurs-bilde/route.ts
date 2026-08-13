import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type Locale = "no" | "en";

const ERRORS: Record<Locale, {
  notConfigured: string; missingKey: string; missingToken: string;
  invalidSession: string; noAccess: string; missingPrompt: string;
  generateFailed: string; uploadFailed: string; saveFailed: string;
}> = {
  no: {
    notConfigured: "Supabase er ikke fullstendig konfigurert på serveren.",
    missingKey: "Mangler OPENAI_API_KEY på serveren.",
    missingToken: "Mangler innloggingstoken.",
    invalidSession: "Ugyldig eller utløpt innlogging.",
    noAccess: "Du har ikke admin-tilgang til å gjøre dette.",
    missingPrompt: "Beskriv hva bildet skal vise.",
    generateFailed: "Klarte ikke generere bildet.",
    uploadFailed: "Klarte ikke laste opp bildet.",
    saveFailed: "Bildet ble generert, men kunne ikke lagres i kurset.",
  },
  en: {
    notConfigured: "Supabase isn't fully configured on the server.",
    missingKey: "Missing OPENAI_API_KEY on the server.",
    missingToken: "Missing login token.",
    invalidSession: "Invalid or expired login.",
    noAccess: "You don't have admin access to do this.",
    missingPrompt: "Describe what the image should show.",
    generateFailed: "Couldn't generate the image.",
    uploadFailed: "Couldn't upload the image.",
    saveFailed: "The image was generated, but couldn't be saved to the course.",
  },
};

// Fast stilprofil bakt inn i alle prompter -- dette er det som skaper visuell
// helhet mellom modulene, selv om hvert bilde genereres uavhengig av de andre.
// Ingen tekst/logoer i selve bildet -- AI-modeller lager nesten alltid feil
// stavet eller uleselig tekst, og det ville sett ut som en feil i kurset.
const STILPROFIL =
  "Editorial illustration for a sports/event-venue speaker training course. " +
  "Clean, modern, minimalist style. Color palette dominated by deep teal " +
  "(#073E46), bright teal accent (#33D3C4), and warm coral (#FF6B4A) on a " +
  "dark background. Wide 3:2 header composition. No text, no logos, no " +
  "watermarks, no readable signage anywhere in the image.";

export async function POST(req: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;

  const body = (await req.json()) as {
    prompt?: string; modulIndex?: number; sprak?: string; locale?: string;
  };
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

  const prompt = body.prompt?.trim();
  const modulIndex = body.modulIndex;
  const sprak = body.sprak === "en" ? "en" : "no";
  if (!prompt) {
    return NextResponse.json({ error: err.missingPrompt }, { status: 400 });
  }
  if (typeof modulIndex !== "number" || modulIndex < 0 || modulIndex > 4) {
    return NextResponse.json({ error: err.missingPrompt }, { status: 400 });
  }

  // Bekreft at innringeren faktisk er admin, via deres egen token (vanlig RLS)
  // -- samme mønster som /api/admin/inviter-administrator.
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

  // Generer bildet via OpenAI. gpt-image-1 returnerer alltid base64 (ingen url-modus).
  let b64: string;
  try {
    const genRes = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: { Authorization: `Bearer ${openaiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-image-1",
        prompt: `${STILPROFIL}\n\nMotiv: ${prompt}`,
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

  // Last opp til kurs-media med service_role (samme bucket admin-UI-et bruker for manuell opplasting).
  const adminClient = createClient(supabaseUrl, serviceRoleKey);
  const path = `${modulIndex}/${sprak}/ai-${Date.now()}.png`;
  const bytes = Buffer.from(b64, "base64");
  const { data: uploadData, error: uploadError } = await adminClient.storage
    .from("kurs-media")
    .upload(path, bytes, { contentType: "image/png" });
  if (uploadError || !uploadData) {
    return NextResponse.json({ error: err.uploadFailed }, { status: 502 });
  }
  const publicUrl = adminClient.storage.from("kurs-media").getPublicUrl(uploadData.path).data.publicUrl;

  // Sett inn som en vanlig bilde-blokk, bakerst i modulen.
  const { data: eksisterende } = await adminClient
    .from("kurs_innhold")
    .select("rekkefolge")
    .eq("modul_index", modulIndex)
    .eq("sprak", sprak)
    .order("rekkefolge", { ascending: false })
    .limit(1);
  const nesteRekkefolge = (eksisterende?.[0]?.rekkefolge ?? -1) + 1;

  const { data: nyBlokk, error: insertError } = await adminClient
    .from("kurs_innhold")
    .insert({ modul_index: modulIndex, sprak, rekkefolge: nesteRekkefolge, type: "bilde", innhold: publicUrl })
    .select("*")
    .single();
  if (insertError || !nyBlokk) {
    return NextResponse.json({ error: err.saveFailed, url: publicUrl }, { status: 500 });
  }

  return NextResponse.json({ ok: true, blokk: nyBlokk });
}
