import type { Locale } from "@/i18n/locales";

// Small NO/EN toggle for the pages that currently exist in both languages
// (landing page, demo, registrer). Norwegian stays unprefixed (/, /demo,
// /registrer); English lives under /en/... — see src/i18n/locales.ts.
export function LanguageSwitcher({ locale, noHref, enHref }: { locale: Locale; noHref: string; enHref: string }) {
  const linkStyle = (active: boolean): React.CSSProperties => ({
    color: active ? "#33D3C4" : "rgba(255,255,255,0.4)",
    fontWeight: active ? 700 : 500,
    textDecoration: "none",
    fontSize: "13px",
    letterSpacing: "0.04em",
    fontFamily: "var(--font-ibm-plex-mono), monospace",
  });
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
      <a href={noHref} style={linkStyle(locale === "no")}>NO</a>
      <span style={{ color: "rgba(255,255,255,0.2)", fontSize: "13px" }}>/</span>
      <a href={enHref} style={linkStyle(locale === "en")}>EN</a>
    </div>
  );
}
