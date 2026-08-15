import type { Metadata } from "next";
import { HomeContent } from "../HomeContent";
import { getDictionary } from "@/i18n/get-dictionary";

export const metadata: Metadata = {
  title: "ÅDIENCE — Exclusive venue streaming",
  description: "The exclusive audio channel for audiences physically present at the venue. A live audio platform from StoryPhone AS for sports and event venues and organizers — a global service, available to any venue with network coverage.",
  alternates: {
    canonical: "/en",
    languages: { no: "/", en: "/en" },
  },
  openGraph: {
    title: "ÅDIENCE — Exclusive venue streaming",
    description: "The exclusive audio channel for audiences physically present at the venue.",
    url: "https://app.adience.no/en",
    siteName: "Ådience",
    locale: "en_US",
    type: "website",
  },
};

// See src/app/page.tsx for notes on what this Service JSON-LD deliberately omits.
const serviceJsonLd = {
  "@context": "https://schema.org",
  "@type": "Service",
  serviceType: "Live audio platform for venues and events",
  name: "Ådience",
  description: "Ådience lets audiences physically present at a venue listen to exclusive audio — commentary and other audio content — through their own headphones, in real time via geofencing technology.",
  provider: {
    "@type": "Organization",
    name: "StoryPhone AS",
  },
  audience: {
    "@type": "BusinessAudience",
    audienceType: "Venue owners and organizers in sports and culture",
  },
  areaServed: "Worldwide",
  url: "https://app.adience.no/en",
};

export default function HomeEn() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceJsonLd) }}
      />
      <HomeContent dict={getDictionary("en")} locale="en" />
    </>
  );
}
