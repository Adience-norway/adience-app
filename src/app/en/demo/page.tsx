import { Metadata } from "next";
import { DemoContent } from "../../demo/DemoContent";
import { getDictionary } from "@/i18n/get-dictionary";

export const metadata: Metadata = {
  title: "Try Ådience yourself — live demo",
  description: "Scan the QR code and hear the real Ådience audio experience, wherever you are.",
  alternates: {
    canonical: "/en/demo",
    languages: { no: "/demo", en: "/en/demo" },
  },
  openGraph: {
    title: "Try Ådience yourself — live demo",
    description: "Scan the QR code and hear the real Ådience audio experience, wherever you are.",
    url: "https://app.adience.no/en/demo",
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
    { "@type": "ListItem", position: 2, name: "Demo", item: "https://app.adience.no/en/demo" },
  ],
};

export default function DemoPageEn() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <DemoContent dict={getDictionary("en")} locale="en" />
    </>
  );
}
