import { AppStoreButton } from "@/components/AppStoreButton";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import type { Dictionary, Locale } from "@/i18n/get-dictionary";

export function DemoContent({ dict, locale }: { dict: Dictionary; locale: Locale }) {
  const t = dict.demo;
  const homeHref = locale === "en" ? "/en" : "/";
  const registrerHref = locale === "en" ? "/en/registrer" : "/registrer";

  return (
    <div style={{ backgroundColor: "#073E46", color: "#ffffff", minHeight: "100vh", fontFamily: "var(--font-inter), system-ui, sans-serif" }}>

      {/* ─── HEADER ─── */}
      <header style={{ borderBottom: "1px solid rgba(51,211,196,0.15)", backdropFilter: "blur(12px)", backgroundColor: "rgba(7,62,70,0.85)", position: "sticky", top: 0, zIndex: 50 }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "0 24px", display: "flex", alignItems: "center", justifyContent: "space-between", height: "72px" }}>
          <a href={homeHref} style={{ display: "flex", alignItems: "center", textDecoration: "none" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="ÅDIENCE" style={{ height: "80px", width: "auto" }} />
          </a>
          <nav style={{ display: "flex", alignItems: "center", gap: "32px" }}>
            <a href={homeHref} style={{ color: "rgba(255,255,255,0.65)", fontSize: "14px", fontWeight: 500, textDecoration: "none", letterSpacing: "0.02em" }}>
              {t.nav.home}
            </a>
            <a href="https://www.adience.no/blog" style={{ color: "rgba(255,255,255,0.65)", fontSize: "14px", fontWeight: 500, textDecoration: "none", letterSpacing: "0.02em" }}>
              {t.nav.blog}
            </a>
            <a href={registrerHref} style={{
              border: "1.5px solid #33D3C4",
              color: "#33D3C4",
              fontSize: "14px",
              fontWeight: 600,
              textDecoration: "none",
              padding: "8px 20px",
              borderRadius: "6px",
              letterSpacing: "0.04em",
            }}>
              {t.nav.ctaPilot}
            </a>
            <LanguageSwitcher locale={locale} noHref="/demo" enHref="/en/demo" />
          </nav>
        </div>
      </header>

      {/* ─── DEMO HERO ─── */}
      <section style={{ padding: "80px 24px 40px" }}>
        <div style={{ maxWidth: "720px", margin: "0 auto", textAlign: "center" }}>
          <span style={{ fontFamily: "var(--font-ibm-plex-mono), monospace", fontSize: "12px", letterSpacing: "0.14em", textTransform: "uppercase" as const, color: "#78BE20", fontWeight: 500 }}>
            {t.hero.eyebrow}
          </span>
          <h1 style={{
            fontFamily: "var(--font-montserrat), system-ui, sans-serif",
            fontWeight: 900,
            fontSize: "clamp(32px, 5vw, 52px)",
            letterSpacing: "-0.02em",
            margin: "16px 0 20px",
            color: "#ffffff",
          }}>
            {t.hero.title}
          </h1>
          <p style={{ fontSize: "18px", lineHeight: 1.7, color: "rgba(255,255,255,0.6)", maxWidth: "540px", margin: "0 auto" }}>
            {t.hero.subtitle}
          </p>
          <p style={{ fontSize: "14px", lineHeight: 1.7, color: "rgba(255,255,255,0.4)", maxWidth: "540px", margin: "16px auto 0" }}>
            {t.hero.aiIntro}
          </p>
        </div>
      </section>

      {/* ─── STEG ─── */}
      <section style={{ padding: "0 24px 80px" }}>
        <div style={{ maxWidth: "900px", margin: "0 auto" }}>
          <div style={{
            backgroundColor: "#1E293B",
            borderRadius: "20px",
            padding: "56px",
            border: "1px solid rgba(120,190,32,0.25)",
          }}>
            <div style={{ display: "flex", flexWrap: "wrap" as const, gap: "48px", alignItems: "center", justifyContent: "center" }}>

              <div style={{ textAlign: "center" }}>
                <span style={{ fontFamily: "var(--font-ibm-plex-mono), monospace", fontSize: "12px", letterSpacing: "0.1em", color: "#33D3C4", fontWeight: 600 }}>{t.steps.step2Label}</span>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/media/demo-qr.png"
                  alt={t.steps.qrAlt}
                  style={{ width: "200px", height: "200px", borderRadius: "12px", display: "block", marginTop: "12px" }}
                />
              </div>

              <div style={{ maxWidth: "420px" }}>
                <div style={{ marginBottom: "28px" }}>
                  <span style={{ fontFamily: "var(--font-ibm-plex-mono), monospace", fontSize: "12px", letterSpacing: "0.1em", color: "#FF6B4A", fontWeight: 600 }}>{t.steps.step1Label}</span>
                  <h2 style={{ fontFamily: "var(--font-montserrat), system-ui, sans-serif", fontWeight: 800, fontSize: "22px", margin: "8px 0 8px", color: "#ffffff" }}>
                    {t.steps.step1Title}
                  </h2>
                  <p style={{ color: "rgba(255,255,255,0.55)", fontSize: "15px", lineHeight: 1.6, margin: 0 }}>
                    {t.steps.step1Desc}
                  </p>
                </div>
                <div>
                  <h2 style={{ fontFamily: "var(--font-montserrat), system-ui, sans-serif", fontWeight: 800, fontSize: "22px", margin: "0 0 8px", color: "#ffffff" }}>
                    {t.steps.step2Title}
                  </h2>
                  <p style={{ color: "rgba(255,255,255,0.55)", fontSize: "15px", lineHeight: 1.7, margin: 0 }}>
                    {t.steps.step2Desc}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── LAST NED APPEN ─── */}
      <section style={{ padding: "0 24px 100px" }}>
        <div style={{ maxWidth: "900px", margin: "0 auto", textAlign: "center" }}>
          <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "14px", marginBottom: "20px" }}>
            {t.downloadPrompt}
          </p>
          <div style={{ display: "flex", gap: "16px", justifyContent: "center", flexWrap: "wrap" }}>
            <AppStoreButton platform="apple" />
            <AppStoreButton platform="google" />
          </div>
        </div>
      </section>

      {/* ─── FOOTER (enkel) ─── */}
      <footer style={{ borderTop: "1px solid rgba(255,255,255,0.08)", backgroundColor: "#031e27" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "32px 24px", textAlign: "center" }}>
          <p style={{ color: "rgba(255,255,255,0.3)", fontSize: "13px", margin: 0 }}>
            {t.footer} · <a href={homeHref} style={{ color: "#33D3C4", textDecoration: "none" }}>adience.no</a>
          </p>
        </div>
      </footer>

    </div>
  );
}
