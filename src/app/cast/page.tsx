import type { Metadata } from "next";
import { CastContent } from "./CastContent";
import { getDictionary } from "@/i18n/get-dictionary";

// Internal broadcast tool for speaker teams, not public marketing/informational
// content — must never be indexed.
export const metadata: Metadata = {
  title: "Ådience Cast",
  robots: { index: false, follow: false },
};

export default function CastPage() {
  return <CastContent dict={getDictionary("no")} locale="no" />;
}
