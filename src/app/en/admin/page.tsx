import type { Metadata } from "next";
import { AdminContent } from "../../admin/AdminContent";
import { getDictionary } from "@/i18n/get-dictionary";

// Password-gated admin panel — must never be indexed.
export const metadata: Metadata = {
  title: "Ådience Admin",
  robots: { index: false, follow: false },
};

export default function AdminPageEn() {
  return <AdminContent dict={getDictionary("en")} locale="en" />;
}
