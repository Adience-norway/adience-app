import type { Metadata } from "next";
import { RegistrerPageContent } from "./RegistrerPageContent";
import { getDictionary } from "@/i18n/get-dictionary";

export const metadata: Metadata = {
  title: "Registrer arena eller arrangement — Ådience",
  description: "Registrer din arena med 14 dagers gratis pilot, eller registrer et enkeltarrangement. Ådience tilbys av StoryPhone AS til arenaeiere og arrangører innen idrett og kultur.",
  alternates: {
    canonical: "/registrer",
    languages: { no: "/registrer", en: "/en/registrer" },
  },
  openGraph: {
    title: "Registrer arena eller arrangement — Ådience",
    description: "Registrer din arena med 14 dagers gratis pilot, eller registrer et enkeltarrangement.",
    url: "https://app.adience.no/registrer",
    siteName: "Ådience",
    locale: "nb_NO",
    type: "website",
  },
};

const breadcrumbJsonLd = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Hjem", item: "https://app.adience.no/" },
    { "@type": "ListItem", position: 2, name: "Registrer", item: "https://app.adience.no/registrer" },
  ],
};

export default function RegistrerPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <RegistrerPageContent dict={getDictionary("no")} locale="no" />
    </>
  );
}
