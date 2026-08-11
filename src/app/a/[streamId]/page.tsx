import type { Metadata } from "next";
import { AapneAppContent } from "./AapneAppContent";

type Props = {
  params: Promise<{ streamId: string }>;
};

// Smart-link utility page (see AapneAppContent.tsx for why it exists): it only
// ever shows "opening the app…" plus download buttons, with no unique content
// per stream ID, and stream IDs aren't enumerable for a sitemap. Marked
// noindex so it isn't treated as a thin/duplicate content page by search
// engines, while staying crawlable (follow: true) since real QR codes and
// shared links point here.
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { streamId } = await params;
  return {
    title: "Åpne Ådience-appen",
    description: "Åpner Ådience-appen direkte på denne arenaens sending. Har du ikke appen ennå, blir du sendt videre til App Store eller Google Play.",
    alternates: {
      canonical: `/a/${streamId}`,
    },
    robots: { index: false, follow: true },
  };
}

export default function AapneAppPage() {
  return <AapneAppContent />;
}
