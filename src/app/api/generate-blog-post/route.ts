import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";

// Turns real source material (podcast transcripts, book excerpts) into a
// draft blog post on the existing Wix site (adience.no), in Ådience's voice.
// Publishing is a human decision — this only ever creates a DRAFT; a person
// reviews and publishes it from the Wix editor.

const ArticleSchema = z.object({
  title: z.string(),
  excerpt: z.string(),
  sections: z.array(
    z.object({
      heading: z.string(),
      paragraphs: z.array(z.string()),
    })
  ),
});

function buildPrompt(emne: string, kildetekst: string, sprak: "no" | "en"): string {
  const spraakInstruks = sprak === "en"
    ? "Write the article in English."
    : "Skriv artikkelen på norsk.";

  return `Du skriver et blogginnlegg for Ådience (${sprak === "en" ? "in English" : "på norsk"}) basert på ekte kildemateriale under. Ådience er en tjeneste som gir publikum på arenaer og arrangementer en personlig lydopplevelse (speakerkommentarer, musikk fra scenen) direkte i øret via mobilen.

Emne for artikkelen: ${emne}

Kildemateriale (fra en bok/manus om speakerteam-metodikk, skrevet av en av grunnleggerne):
"""
${kildetekst}
"""

${spraakInstruks}

Skriv en autentisk, praktisk og engasjerende artikkel basert på kildematerialet over. Behold den ekte kunnskapen og de konkrete rådene fra kilden — ikke dikt opp noe som ikke støttes av materialet. Strukturer den med en tittel, et kort utdrag (excerpt, maks 2 setninger), og 2-4 seksjoner med hver sin overskrift og 1-3 avsnitt.

Hold hele artikkelen (excerpt + alle avsnitt til sammen) på rundt 350 ord totalt. Kort og fokusert — ikke en lang, uttømmende artikkel.`;
}

async function importWixMediaImage(url: string, displayName: string): Promise<string> {
  const res = await fetch("https://www.wixapis.com/site-media/v1/files/import", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: process.env.WIX_API_KEY!,
      "wix-site-id": process.env.WIX_SITE_ID!,
    },
    body: JSON.stringify({ url, displayName, mediaType: "IMAGE" }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.message ?? "Wix API-feil ved import av bilde.");
  return data.file.id as string;
}

async function createWixDraftPost(
  article: z.infer<typeof ArticleSchema>,
  sprak: "no" | "en",
  heroImage?: { id: string; altText: string }
) {
  const nodes: Record<string, unknown>[] = [];
  for (const section of article.sections) {
    nodes.push({
      type: "HEADING",
      id: "",
      nodes: [{ type: "TEXT", id: "", nodes: [], textData: { text: section.heading, decorations: [] } }],
      headingData: { level: 2 },
    });
    for (const paragraph of section.paragraphs) {
      nodes.push({
        type: "PARAGRAPH",
        id: "",
        nodes: [{ type: "TEXT", id: "", nodes: [], textData: { text: paragraph, decorations: [] } }],
        paragraphData: {},
      });
    }
  }

  const res = await fetch("https://www.wixapis.com/blog/v3/draft-posts", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: process.env.WIX_API_KEY!,
      "wix-site-id": process.env.WIX_SITE_ID!,
    },
    body: JSON.stringify({
      draftPost: {
        title: article.title,
        excerpt: article.excerpt,
        memberId: process.env.WIX_ACCOUNT_ID,
        language: sprak,
        richContent: { nodes },
        ...(heroImage ? { heroImage } : {}),
      },
    }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.message ?? "Wix API-feil ved oppretting av kladd.");
  return data.draftPost as { id: string };
}

export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "Mangler ANTHROPIC_API_KEY på serveren." }, { status: 500 });
  }
  if (!process.env.WIX_API_KEY || !process.env.WIX_SITE_ID || !process.env.WIX_ACCOUNT_ID) {
    return NextResponse.json({ error: "Mangler Wix-tilkobling på serveren." }, { status: 500 });
  }

  const body = (await req.json()) as {
    emne?: string;
    kildetekst?: string;
    sprak?: "no" | "en";
    heroImageUrl?: string;
    heroImageAlt?: string;
  };
  const { emne, kildetekst, sprak = "no", heroImageUrl, heroImageAlt } = body;

  if (!emne || !kildetekst) {
    return NextResponse.json({ error: "emne og kildetekst er påkrevd." }, { status: 400 });
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  try {
    const response = await client.messages.parse({
      model: "claude-opus-4-8",
      max_tokens: 4000,
      output_config: { effort: "medium", format: zodOutputFormat(ArticleSchema) },
      messages: [{ role: "user", content: buildPrompt(emne, kildetekst, sprak) }],
    });

    const article = response.parsed_output;
    if (!article) {
      return NextResponse.json({ error: "Fikk ikke generert artikkel." }, { status: 502 });
    }

    let heroImage: { id: string; altText: string } | undefined;
    if (heroImageUrl) {
      const fileId = await importWixMediaImage(heroImageUrl, `${article.title}.jpg`);
      heroImage = { id: fileId, altText: heroImageAlt || article.title };
    }

    const draftPost = await createWixDraftPost(article, sprak, heroImage);

    return NextResponse.json({
      artikkel: article,
      draftPostId: draftPost.id,
      editorUrl: `https://manage.wix.com/dashboard/${process.env.WIX_SITE_ID}/blog/post/${draftPost.id}`,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Ukjent feil";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
