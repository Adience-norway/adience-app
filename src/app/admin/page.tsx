import type { Metadata } from "next";
import { AdminContent } from "./AdminContent";
import { getDictionary } from "@/i18n/get-dictionary";

// Password-gated admin panel — must never be indexed.
export const metadata: Metadata = {
  title: "Ådience Admin",
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  return <AdminContent dict={getDictionary("no")} locale="no" />;
}
