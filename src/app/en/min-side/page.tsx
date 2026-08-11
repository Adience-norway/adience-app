import type { Metadata } from "next";
import { MinSideContent } from "../../min-side/MinSideContent";
import { getDictionary } from "@/i18n/get-dictionary";

// Login-gated venue account area — must never be indexed.
export const metadata: Metadata = {
  title: "My page — Ådience",
  robots: { index: false, follow: false },
};

export default function MinSidePageEn() {
  return <MinSideContent dict={getDictionary("en")} locale="en" />;
}
