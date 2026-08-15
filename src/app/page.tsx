import type { Metadata } from "next";
import { HomeContent } from "./HomeContent";
import { getDictionary } from "@/i18n/get-dictionary";

export const metadata: Metadata = {
  title: "ÅDIENCE — Eksklusiv arenastreaming",
  description: "Den eksklusive lydkanalen for publikum som er fysisk til stede på arenaen. Live-lydplattform fra StoryPhone AS for arenaer og arrangører innen idrett og kultur — global tjeneste, tilgjengelig for enhver arena med nettverksdekning.",
  alternates: {
    canonical: "/",
    languages: { no: "/", en: "/en" },
  },
  openGraph: {
    title: "ÅDIENCE — Eksklusiv arenastreaming",
    description: "Den eksklusive lydkanalen for publikum som er fysisk til stede på arenaen.",
    url: "https://app.adience.no/",
    siteName: "Ådience",
    locale: "nb_NO",
    type: "website",
  },
};

// Service JSON-LD (schema.org) — describes the Ådience platform itself, offered by
// StoryPhone AS. Deliberately omits aggregateRating, review, and offers/price:
// none of those are verifiable facts in the codebase. areaServed is "Worldwide" —
// confirmed by the user (2026-07-31): any venue, anywhere with network coverage,
// can register and use Ådience.
const serviceJsonLd = {
  "@context": "https://schema.org",
  "@type": "Service",
  serviceType: "Live-lydplattform for arenaer og arrangementer",
  name: "Ådience",
  description: "Ådience lar publikum som er fysisk til stede på en arena lytte til eksklusiv lyd — kommentarer og annet lydinnhold — i egne hodetelefoner, i sanntid via geofencing-teknologi.",
  provider: {
    "@type": "Organization",
    name: "StoryPhone AS",
  },
  audience: {
    "@type": "BusinessAudience",
    audienceType: "Arenaeiere og arrangører innen idrett og kultur",
  },
  areaServed: "Worldwide",
  url: "https://app.adience.no",
};

export default function Home() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceJsonLd) }}
      />
      <HomeContent dict={getDictionary("no")} locale="no" />
    </>
  );
}
