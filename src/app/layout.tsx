import type { Metadata } from "next";
import { Montserrat, Inter, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  weight: ["400", "600", "700", "800", "900"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-ibm-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://app.adience.no"),
  title: "ÅDIENCE — Eksklusiv arenastreaming",
  description: "Den eksklusive lydkanalen for publikum som er fysisk til stede",
  icons: {
    icon: "/icon.png",
    apple: "/icon.png",
  },
};

// Organization JSON-LD (schema.org) — sitewide, describes the legal entity behind
// Ådience. Facts sourced from the live privacy policy at
// https://www.adience.no/personvern (StoryPhone AS, org.nr. 823773692, Hamar,
// Norge) and from src/app/HomeContent.tsx footer contact details. No ratings,
// review counts, or pricing are included — none are verifiable.
const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "StoryPhone AS",
  alternateName: "Ådience",
  url: "https://app.adience.no",
  logo: "https://app.adience.no/logo.png",
  email: "post@adience.no",
  telephone: "+47 90182288",
  taxID: "823773692",
  address: {
    "@type": "PostalAddress",
    addressLocality: "Hamar",
    addressCountry: "NO",
  },
  sameAs: ["https://www.adience.no"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="no"
      className={`${montserrat.variable} ${inter.variable} ${ibmPlexMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
        />
        {children}
      </body>
    </html>
  );
}
