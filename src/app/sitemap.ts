import type { MetadataRoute } from "next";

const BASE_URL = "https://app.adience.no";

// Only genuinely public, indexable marketing/informational routes are listed
// here. Excluded on purpose:
// - /min-side, /admin, /cast (+ their /en variants) and /tilbakestill-passord:
//   login/password-gated internal tools, marked noindex in their own metadata.
// - /api/*, /.well-known/*: not pages.
// - /a/[streamId]: dynamic smart-link with no enumerable set of IDs and no
//   unique indexable content per ID (marked noindex in its own metadata).
export default function sitemap(): MetadataRoute.Sitemap {
  const pairs: Array<{ no: string; en: string; priority: number; changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"] }> = [
    { no: "/", en: "/en", priority: 1, changeFrequency: "monthly" },
    { no: "/demo", en: "/en/demo", priority: 0.8, changeFrequency: "monthly" },
    { no: "/registrer", en: "/en/registrer", priority: 0.8, changeFrequency: "monthly" },
  ];

  const entries: MetadataRoute.Sitemap = [];
  for (const pair of pairs) {
    const languages = { no: `${BASE_URL}${pair.no}`, en: `${BASE_URL}${pair.en}` };
    entries.push({
      url: `${BASE_URL}${pair.no}`,
      lastModified: new Date(),
      changeFrequency: pair.changeFrequency,
      priority: pair.priority,
      alternates: { languages },
    });
    entries.push({
      url: `${BASE_URL}${pair.en}`,
      lastModified: new Date(),
      changeFrequency: pair.changeFrequency,
      priority: Math.round((pair.priority - 0.1) * 10) / 10,
      alternates: { languages },
    });
  }

  return entries;
}
