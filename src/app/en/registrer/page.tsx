import type { Metadata } from "next";
import { RegistrerPageContent } from "../../registrer/RegistrerPageContent";
import { getDictionary } from "@/i18n/get-dictionary";

export const metadata: Metadata = {
  title: "Register your venue — Ådience",
  description: "Register your venue with a 14-day free pilot, or register a single event. Ådience is offered by StoryPhone AS to venue owners and organizers in sports and culture.",
  alternates: {
    canonical: "/en/registrer",
    languages: { no: "/registrer", en: "/en/registrer" },
  },
  openGraph: {
    title: "Register your venue — Ådience",
    description: "Register your venue with a 14-day free pilot, or register a single event.",
    url: "https://app.adience.no/en/registrer",
    siteName: "Ådience",
    locale: "en_US",
    type: "website",
  },
};

const breadcrumbJsonLd = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: "https://app.adience.no/en" },
    { "@type": "ListItem", position: 2, name: "Register", item: "https://app.adience.no/en/registrer" },
  ],
};

export default function RegistrerPageEn() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <RegistrerPageContent dict={getDictionary("en")} locale="en" />
    </>
  );
}
