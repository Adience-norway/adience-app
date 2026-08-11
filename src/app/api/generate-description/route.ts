import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const SPORT_KATEGORIER = ["Outdoor Sports Venue", "Indoor Sports Venue"];

type Locale = "no" | "en";

const ERRORS: Record<Locale, { missingKey: string; missingName: string; noText: string; unknown: string }> = {
  no: {
    missingKey: "Mangler ANTHROPIC_API_KEY på serveren.",
    missingName: "arenanavn er påkrevd.",
    noText: "Fikk ikke generert tekst.",
    unknown: "Ukjent feil",
  },
  en: {
    missingKey: "Missing ANTHROPIC_API_KEY on the server.",
    missingName: "arenanavn is required.",
    noText: "Didn't get any generated text.",
    unknown: "Unknown error",
  },
};

function buildPrompt(arenanavn: string, kategori: string | null, by: string | null, stikkord: string | null, locale: Locale): string {
  if (locale === "en") {
    const sted = by ? ` in ${by}` : "";
    const erSport = kategori ? SPORT_KATEGORIER.includes(kategori) : false;

    const vinkling = erSport
      ? "Mention that the audience can hear the speaker team commentate the game directly in their own ear, and that this gives a more personal and immersive experience than just watching from the stands."
      : "Mention that the audience can hear music from the stage, commentary from the hosts, or other audio content directly in their ear, depending on the type of event.";

    const stikkordInstruks = stikkord?.trim()
      ? `\n- Weave these keywords/phrases in naturally where they fit, without just listing them: ${stikkord.trim()}`
      : "";

    return `Write a short marketing text in English (3-5 sentences) for the venue/place "${arenanavn}"${sted}, category: ${kategori ?? "unknown"}.

The text should:
- Introduce the venue/event in a warm and inviting way
- ${vinkling}
- Briefly explain that the Ådience app gives this audio experience directly on the phone of audience members who are physically present
- End with a short call-to-action to check tickets or contact info on the venue's own channels (use a generic phrasing like "see ticket info with us" since you don't have concrete links)${stikkordInstruks}

Formatting: break the text into short paragraphs of 1-2 sentences each, separated by a blank line (a real line break, "\\n\\n"). This is read on a phone screen, so it must never be one dense wall of text.

Don't use quotation marks around the whole text. Write only the text itself, no heading or explanation around it.`;
  }

  const sted = by ? ` i ${by}` : "";
  const erSport = kategori ? SPORT_KATEGORIER.includes(kategori) : false;

  const vinkling = erSport
    ? "Nevn at publikum kan høre speakerteamet kommentere kampen direkte i egne øret, og at dette gir en mer personlig og involverende opplevelse enn å bare se på fra tribunen."
    : "Nevn at publikum kan høre musikk fra scenen, kommentarer fra vertskapet, eller annet lydinnhold direkte i øret, avhengig av hva slags arrangement det er.";

  const stikkordInstruks = stikkord?.trim()
    ? `\n- Vev inn disse stikkordene/frasene naturlig der de passer, uten å bare liste dem opp: ${stikkord.trim()}`
    : "";

  return `Skriv en kort markedsføringstekst på norsk (3-5 setninger) for arenaen/stedet "${arenanavn}"${sted}, kategori: ${kategori ?? "ukjent"}.

Teksten skal:
- Introdusere stedet/arrangementet på en varm og innbydende måte
- ${vinkling}
- Forklare kort at Ådience-appen gir denne lydopplevelsen direkte på mobilen til publikum som er fysisk til stede
- Avslutte med en kort oppfordring om å sjekke billetter eller kontaktinformasjon på stedets egne kanaler (bruk en generisk formulering som "se billettinfo hos oss" siden du ikke har konkrete lenker)${stikkordInstruks}

Formatering: del teksten opp i korte avsnitt på 1-2 setninger hver, adskilt med blank linje (et ekte linjeskift, "\\n\\n"). Dette leses på en telefonskjerm, så det må aldri bli én tett tekstblokk.

Ikke bruk anførselstegn rundt hele teksten. Skriv kun selve teksten, ingen overskrift eller forklaring rundt.`;
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as { arenanavn?: string; kategori?: string | null; by?: string | null; stikkord?: string | null; locale?: string };
  const locale: Locale = body.locale === "en" ? "en" : "no";
  const err = ERRORS[locale];

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: err.missingKey }, { status: 500 });
  }

  const { arenanavn, kategori = null, by = null, stikkord = null } = body;

  if (!arenanavn) {
    return NextResponse.json({ error: err.missingName }, { status: 400 });
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  try {
    const response = await client.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 500,
      output_config: { effort: "low" },
      messages: [{ role: "user", content: buildPrompt(arenanavn, kategori, by, stikkord, locale) }],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    const tekst = textBlock?.type === "text" ? textBlock.text.trim() : "";

    if (!tekst) {
      return NextResponse.json({ error: err.noText }, { status: 502 });
    }

    return NextResponse.json({ tekst });
  } catch (e) {
    const message = e instanceof Error ? e.message : err.unknown;
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
