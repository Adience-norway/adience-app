import type { Metadata } from "next";
import { CastContent } from "../../cast/CastContent";
import { getDictionary } from "@/i18n/get-dictionary";

// Internal broadcast tool, not public marketing/informational content — must
// never be indexed.
export const metadata: Metadata = {
  title: "Ådience Cast",
  robots: { index: false, follow: false },
};

export default function CastPageEn() {
  return <CastContent dict={getDictionary("en")} locale="en" />;
}
