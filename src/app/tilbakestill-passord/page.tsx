import type { Metadata } from "next";
import { TilbakestillPassordContent } from "./TilbakestillPassordContent";

// Password-reset utility page, not public marketing/informational content —
// must never be indexed.
export const metadata: Metadata = {
  title: "Tilbakestill passord — Ådience",
  robots: { index: false, follow: false },
};

export default function TilbakestillPassordPage() {
  return <TilbakestillPassordContent />;
}
