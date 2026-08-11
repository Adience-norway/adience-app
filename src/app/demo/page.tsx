import { Metadata } from "next";
import { DemoContent } from "./DemoContent";
import { getDictionary } from "@/i18n/get-dictionary";

export const metadata: Metadata = {
  title: "Prøv Ådience selv — live demo",
  description: "Skann QR-koden og hør den ekte Ådience-lydopplevelsen, uansett hvor du er.",
  alternates: {
    canonical: "/demo",
    languages: { no: "/demo", en: "/en/demo" },
  },
  openGraph: {
    title: "Prøv Ådience selv — live demo",
    description: "Skann QR-koden og hør den ekte Ådience-lydopplevelsen, uansett hvor du er.",
    url: "https://app.adience.no/demo",
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
    { "@type": "ListItem", position: 2, name: "Demo", item: "https://app.adience.no/demo" },
  ],
};

export default function DemoPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <DemoContent dict={getDictionary("no")} locale="no" />
    </>
  );
}
