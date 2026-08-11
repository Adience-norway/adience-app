import type { Metadata } from "next";
import { MinSideContent } from "./MinSideContent";
import { getDictionary } from "@/i18n/get-dictionary";

// Login-gated venue account area — must never be indexed.
export const metadata: Metadata = {
  title: "Min side — Ådience",
  robots: { index: false, follow: false },
};

export default function MinSidePage() {
  return <MinSideContent dict={getDictionary("no")} locale="no" />;
}
