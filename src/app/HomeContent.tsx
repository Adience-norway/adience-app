import NyhetsbrevSignup from "@/components/NyhetsbrevSignup";
import { AppStoreButton } from "@/components/AppStoreButton";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import type { Dictionary, Locale } from "@/i18n/get-dictionary";

export function HomeContent({ dict, locale }: { dict: Dictionary; locale: Locale }) {
  const t = dict.home;
  const prefix = locale === "en" ? "/en" : "";
  const homeHref = locale === "en" ? "/en" : "/";

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
            <a href="#features" style={{ color: "rgba(255,255,255,0.65)", fontSize: "14px", fontWeight: 500, textDecoration: "none", letterSpacing: "0.02em" }}>
              {t.nav.features}
            </a>
            <a href="#priser" style={{ color: "rgba(255,255,255,0.65)", fontSize: "14px", fontWeight: 500, textDecoration: "none", letterSpacing: "0.02em" }}>
              {t.nav.pricing}
            </a>
            <a href="#download" style={{ color: "rgba(255,255,255,0.65)", fontSize: "14px", fontWeight: 500, textDecoration: "none", letterSpacing: "0.02em" }}>
              {t.nav.download}
            </a>
            <a href={`${prefix}/demo`} style={{ color: "rgba(255,255,255,0.65)", fontSize: "14px", fontWeight: 500, textDecoration: "none", letterSpacing: "0.02em" }}>
              {t.nav.demo}
            </a>
            <a href={`${prefix}/cast`} style={{ color: "rgba(255,255,255,0.65)", fontSize: "14px", fontWeight: 500, textDecoration: "none", letterSpacing: "0.02em" }}>
              {t.nav.cast}
            </a>
            <a href="https://www.adience.no/blog" style={{ color: "rgba(255,255,255,0.65)", fontSize: "14px", fontWeight: 500, textDecoration: "none", letterSpacing: "0.02em" }}>
              {t.nav.blog}
            </a>
            <a href="/min-side" style={{
              border: "1.5px solid #33D3C4",
              color: "#33D3C4",
              fontSize: "14px",
              fontWeight: 600,
              textDecoration: "none",
              padding: "8px 20px",
              borderRadius: "6px",
              letterSpacing: "0.04em",
            }}>
              {t.nav.minSide}
            </a>
            <LanguageSwitcher locale={locale} noHref="/" enHref="/en" />
          </nav>
        </div>
      </header>

      {/* ─── HERO ─── */}
      <section style={{ position: "relative", overflow: "hidden", padding: "120px 24px 140px" }}>
        <HeroBackground />

        <div style={{ maxWidth: "1200px", margin: "0 auto", position: "relative", zIndex: 1 }}>
          <div style={{ maxWidth: "760px" }}>
            {/* Badge */}
            <div style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              backgroundColor: "rgba(51,211,196,0.1)",
              border: "1px solid rgba(51,211,196,0.3)",
              borderRadius: "100px",
              padding: "6px 16px",
              marginBottom: "36px",
            }}>
              <span style={{ width: "6px", height: "6px", backgroundColor: "#33D3C4", borderRadius: "50%", display: "inline-block" }} />
              <span style={{ color: "#33D3C4", fontSize: "13px", fontWeight: 600, letterSpacing: "0.06em", fontFamily: "var(--font-ibm-plex-mono), monospace" }}>
                {t.hero.badge}
              </span>
            </div>

            {/* Headline */}
            <h1 style={{
              fontFamily: "var(--font-montserrat), system-ui, sans-serif",
              fontWeight: 900,
              fontSize: "clamp(48px, 7vw, 88px)",
              lineHeight: 1.0,
              letterSpacing: "-0.02em",
              marginBottom: "28px",
              color: "#ffffff",
            }}>
              {t.hero.headlinePrefix}{" "}
              <span style={{
                background: "linear-gradient(135deg, #33D3C4 0%, #a8f0e8 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}>
                Ådience
              </span>
            </h1>

            {/* Subtext */}
            <p style={{
              fontSize: "clamp(17px, 2vw, 21px)",
              lineHeight: 1.65,
              color: "rgba(255,255,255,0.6)",
              marginBottom: "52px",
              maxWidth: "560px",
              fontWeight: 400,
            }}>
              {t.hero.subtext}
            </p>

            {/* CTA: start prøveperiode (primær) -- den faktiske inntektsveien,
                og friksjonen er allerede lav (ikke noe kredittkort krevd for
                prøveperioden), så den fortjener hovedplassen på siden. */}
            <div>
              <a href={`${prefix}/registrer`} style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "10px",
                backgroundColor: "#FF6B4A",
                color: "#ffffff",
                fontSize: "17px",
                fontWeight: 700,
                fontFamily: "var(--font-montserrat), system-ui, sans-serif",
                textDecoration: "none",
                padding: "18px 32px",
                borderRadius: "10px",
                letterSpacing: "0.02em",
              }}>
                {t.hero.ctaPilot}
                <span aria-hidden="true">→</span>
              </a>
              <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.45)", marginTop: "14px" }}>
                {t.hero.ctaPilotNote}
              </p>
            </div>

            {/* Nyhetsbrev (sekundær) -- fortsatt verdifullt for SEO/innhold
                over tid, men skal ikke konkurrere med selve inntektskilden
                om oppmerksomheten. */}
            <div style={{ maxWidth: "420px", marginTop: "40px" }}>
              <p style={{ fontSize: "13px", fontWeight: 500, color: "rgba(255,255,255,0.4)", marginBottom: "10px" }}>
                {t.hero.followLabel}
              </p>
              <NyhetsbrevSignup kilde="forside-hero" />
            </div>

            {/* Social proof */}
            <div style={{ marginTop: "56px", display: "flex", alignItems: "center", gap: "24px" }}>
              <div style={{ display: "flex" }}>
                {(["#33D3C4", "#1bbda8", "#17a693", "#149080"] as const).map((c, i) => (
                  <div key={i} style={{
                    width: "32px", height: "32px", borderRadius: "50%",
                    backgroundColor: c,
                    border: "2px solid #073E46",
                    marginLeft: i === 0 ? 0 : "-10px",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "11px", fontWeight: 700, color: "#073E46",
                  }}>
                    {["A", "B", "C", "D"][i]}
                  </div>
                ))}
              </div>
              <span style={{ color: "rgba(255,255,255,0.5)", fontSize: "14px" }}>
                <span style={{ color: "#ffffff", fontWeight: 600 }}>{t.hero.socialProofCount}</span> {t.hero.socialProofText}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ─── HVA ER ÅDIENCE (kort, faktabasert intro for lesere og AI-sammendrag) ─── */}
      <section aria-labelledby="hva-er-adience" style={{ padding: "0 24px 64px" }}>
        <div style={{ maxWidth: "900px", margin: "0 auto" }}>
          <h2 id="hva-er-adience" style={{
            fontFamily: "var(--font-montserrat), system-ui, sans-serif",
            fontWeight: 800,
            fontSize: "clamp(22px, 2.6vw, 30px)",
            letterSpacing: "-0.01em",
            marginBottom: "14px",
            color: "#ffffff",
          }}>
            {t.intro.heading}
          </h2>
          <p style={{ color: "rgba(255,255,255,0.62)", fontSize: "16px", lineHeight: 1.7, maxWidth: "760px" }}>
            {t.intro.body}
          </p>
        </div>
      </section>

      {/* ─── STATS BAR ─── */}
      <div style={{ backgroundColor: "#1E293B", borderTop: "1px solid rgba(51,211,196,0.1)", borderBottom: "1px solid rgba(51,211,196,0.1)" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "32px 24px", display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0" }}>
          {[t.stats.delay, t.stats.uptime, t.stats.encryption].map((stat, i) => (
            <div key={i} style={{
              textAlign: "center",
              padding: "0 16px",
              borderRight: i < 2 ? "1px solid rgba(255,255,255,0.08)" : "none",
            }}>
              <div style={{
                fontFamily: "var(--font-ibm-plex-mono), monospace",
                fontWeight: 500,
                fontSize: "clamp(24px, 3vw, 36px)",
                color: "#33D3C4",
                letterSpacing: "-0.01em",
                marginBottom: "4px",
              }}>
                {stat.value}
              </div>
              <div style={{ color: "rgba(255,255,255,0.45)", fontSize: "13px", letterSpacing: "0.06em", textTransform: "uppercase" as const, fontWeight: 500 }}>
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ─── FEATURES ─── */}
      <section id="features" style={{ padding: "120px 24px" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "64px" }}>
            <span style={{
              fontFamily: "var(--font-ibm-plex-mono), monospace",
              fontSize: "12px",
              letterSpacing: "0.14em",
              textTransform: "uppercase" as const,
              color: "#33D3C4",
              fontWeight: 500,
            }}>
              {t.features.eyebrow}
            </span>
            <h2 style={{
              fontFamily: "var(--font-montserrat), system-ui, sans-serif",
              fontWeight: 800,
              fontSize: "clamp(32px, 4vw, 52px)",
              letterSpacing: "-0.02em",
              marginTop: "12px",
              color: "#ffffff",
            }}>
              {t.features.title}
            </h2>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "24px" }}>
            <FeatureCard
              icon={<LockIcon />}
              title={t.features.card1.title}
              description={t.features.card1.description}
              accent="#33D3C4"
              index={0}
            />
            <FeatureCard
              icon={<BoltIcon />}
              title={t.features.card2.title}
              description={t.features.card2.description}
              accent="#FF6B4A"
              index={1}
            />
            <FeatureCard
              icon={<PinIcon />}
              title={t.features.card3.title}
              description={t.features.card3.description}
              accent="#33D3C4"
              index={2}
            />
          </div>
        </div>
      </section>

      {/* ─── PRISER ─── */}
      <section id="priser" style={{ padding: "0 24px 120px" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "56px" }}>
            <span style={{
              fontFamily: "var(--font-ibm-plex-mono), monospace",
              fontSize: "12px",
              letterSpacing: "0.14em",
              textTransform: "uppercase" as const,
              color: "#33D3C4",
              fontWeight: 500,
            }}>
              {t.pricing.eyebrow}
            </span>
            <h2 style={{
              fontFamily: "var(--font-montserrat), system-ui, sans-serif",
              fontWeight: 800,
              fontSize: "clamp(32px, 4vw, 52px)",
              letterSpacing: "-0.02em",
              marginTop: "12px",
              marginBottom: "12px",
              color: "#ffffff",
            }}>
              {t.pricing.title}
            </h2>
            <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "16px", maxWidth: "520px", margin: "0 auto" }}>
              {t.pricing.subtitle}
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "24px" }}>
            {([
              { plan: t.pricing.month, badge: null },
              { plan: t.pricing.year, badge: t.pricing.year.badge },
              { plan: t.pricing.event, badge: null },
            ]).map(({ plan, badge }, i) => (
              <div key={i} style={{
                backgroundColor: "#1E293B",
                border: badge ? "1.5px solid #33D3C4" : "1px solid rgba(51,211,196,0.12)",
                borderRadius: "20px",
                padding: "40px 32px",
                position: "relative",
                display: "flex",
                flexDirection: "column" as const,
              }}>
                {badge && (
                  <span style={{
                    position: "absolute", top: "-14px", left: "32px",
                    backgroundColor: "#33D3C4", color: "#073E46",
                    fontSize: "12px", fontWeight: 700, letterSpacing: "0.04em",
                    padding: "6px 14px", borderRadius: "999px",
                  }}>
                    {badge}
                  </span>
                )}
                <h3 style={{ fontFamily: "var(--font-montserrat), system-ui, sans-serif", fontWeight: 700, fontSize: "20px", color: "#ffffff", marginBottom: "16px" }}>
                  {plan.title}
                </h3>
                <div style={{ display: "flex", alignItems: "baseline", gap: "6px", marginBottom: "16px" }}>
                  <span style={{ fontFamily: "var(--font-montserrat), system-ui, sans-serif", fontWeight: 800, fontSize: "40px", color: "#33D3C4" }}>
                    {plan.price}
                  </span>
                  <span style={{ color: "rgba(255,255,255,0.4)", fontSize: "15px" }}>{plan.period}</span>
                </div>
                <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "14px", lineHeight: 1.6, marginBottom: "28px", flex: 1 }}>
                  {plan.note}
                </p>
                <a href={`${prefix}/registrer`} style={{
                  textAlign: "center" as const,
                  backgroundColor: badge ? "#33D3C4" : "rgba(255,255,255,0.06)",
                  color: badge ? "#073E46" : "#ffffff",
                  border: badge ? "none" : "1px solid rgba(255,255,255,0.15)",
                  fontWeight: 700,
                  fontSize: "14px",
                  padding: "12px 20px",
                  borderRadius: "8px",
                  textDecoration: "none",
                }}>
                  {plan.cta}
                </a>
              </div>
            ))}
          </div>

          <p style={{ textAlign: "center", color: "rgba(255,255,255,0.3)", fontSize: "13px", marginTop: "32px" }}>
            {t.pricing.trialNote}
          </p>
        </div>
      </section>

      {/* ─── HOW IT WORKS ─── */}
      <section style={{ padding: "0 24px 120px" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          <div style={{
            backgroundColor: "#1E293B",
            borderRadius: "20px",
            padding: "64px",
            border: "1px solid rgba(51,211,196,0.12)",
            position: "relative",
            overflow: "hidden",
          }}>
            <SlatePattern />
            <div style={{ position: "relative", zIndex: 1 }}>
              <div style={{ textAlign: "center", marginBottom: "56px" }}>
                <span style={{ fontFamily: "var(--font-ibm-plex-mono), monospace", fontSize: "12px", letterSpacing: "0.14em", textTransform: "uppercase" as const, color: "#33D3C4", fontWeight: 500 }}>
                  {t.howItWorks.eyebrow}
                </span>
                <h2 style={{ fontFamily: "var(--font-montserrat), system-ui, sans-serif", fontWeight: 800, fontSize: "clamp(28px, 3.5vw, 44px)", letterSpacing: "-0.02em", marginTop: "12px", color: "#ffffff" }}>
                  {t.howItWorks.title}
                </h2>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "40px" }}>
                {t.howItWorks.steps.map((item) => (
                  <div key={item.step}>
                    <div style={{
                      fontFamily: "var(--font-ibm-plex-mono), monospace",
                      fontSize: "56px",
                      fontWeight: 500,
                      color: "rgba(51,211,196,0.12)",
                      lineHeight: 1,
                      marginBottom: "16px",
                      letterSpacing: "-0.02em",
                    }}>
                      {item.step}
                    </div>
                    <h3 style={{ fontFamily: "var(--font-montserrat), system-ui, sans-serif", fontWeight: 700, fontSize: "18px", color: "#ffffff", marginBottom: "10px" }}>
                      {item.title}
                    </h3>
                    <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "15px", lineHeight: 1.6 }}>
                      {item.desc}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── DOWNLOAD ─── */}
      <section id="download" style={{ padding: "0 24px 120px" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          <div style={{
            background: "linear-gradient(135deg, rgba(51,211,196,0.12) 0%, rgba(255,107,74,0.08) 100%)",
            border: "1px solid rgba(51,211,196,0.2)",
            borderRadius: "20px",
            padding: "80px 64px",
            textAlign: "center",
            position: "relative",
            overflow: "hidden",
          }}>
            <div style={{ position: "absolute", top: "-60px", left: "10%", width: "300px", height: "300px", background: "radial-gradient(circle, #33D3C4 0%, transparent 70%)", borderRadius: "50%", opacity: 0.15, pointerEvents: "none" }} />
            <div style={{ position: "absolute", bottom: "-60px", right: "10%", width: "300px", height: "300px", background: "radial-gradient(circle, #FF6B4A 0%, transparent 70%)", borderRadius: "50%", opacity: 0.12, pointerEvents: "none" }} />

            <div style={{ position: "relative", zIndex: 1 }}>
              <span style={{ fontFamily: "var(--font-ibm-plex-mono), monospace", fontSize: "12px", letterSpacing: "0.14em", textTransform: "uppercase" as const, color: "#FF6B4A", fontWeight: 500 }}>
                {t.download.eyebrow}
              </span>
              <h2 style={{ fontFamily: "var(--font-montserrat), system-ui, sans-serif", fontWeight: 800, fontSize: "clamp(28px, 4vw, 48px)", letterSpacing: "-0.02em", marginTop: "12px", marginBottom: "16px", color: "#ffffff" }}>
                {t.download.title}
              </h2>
              <p style={{ color: "rgba(255,255,255,0.55)", fontSize: "17px", maxWidth: "480px", margin: "0 auto 48px" }}>
                {t.download.subtitle}
              </p>

              <div style={{ display: "flex", gap: "16px", justifyContent: "center", flexWrap: "wrap" }}>
                <AppStoreButton platform="apple" />
                <AppStoreButton platform="google" />
              </div>

              <p style={{ marginTop: "24px", color: "rgba(255,255,255,0.3)", fontSize: "13px", fontFamily: "var(--font-ibm-plex-mono), monospace" }}>
                {t.download.requirement}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer id="footer" style={{ borderTop: "1px solid rgba(255,255,255,0.08)", backgroundColor: "#031e27" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "56px 24px 40px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "40px", alignItems: "start", marginBottom: "48px" }}>
            <div>
              <a href={homeHref} style={{ display: "inline-block", marginBottom: "16px", textDecoration: "none" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/logo.png" alt="ÅDIENCE" style={{ height: "64px", width: "auto" }} />
              </a>
              <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "14px", lineHeight: 1.6, maxWidth: "320px" }}>
                {t.footer.tagline}
              </p>
            </div>

            <div style={{ textAlign: "right" }}>
              <div style={{ marginBottom: "12px" }}>
                <a href="mailto:post@adience.no" style={{
                  color: "#33D3C4",
                  textDecoration: "none",
                  fontSize: "15px",
                  fontWeight: 500,
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  justifyContent: "flex-end",
                }}>
                  <MailIcon />
                  post@adience.no
                </a>
              </div>
              <div>
                <a href="tel:+4790182288" style={{
                  color: "rgba(255,255,255,0.55)",
                  textDecoration: "none",
                  fontSize: "15px",
                  fontFamily: "var(--font-ibm-plex-mono), monospace",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  justifyContent: "flex-end",
                }}>
                  <PhoneIcon />
                  +47 901 82 288
                </a>
              </div>
            </div>
          </div>

          <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "24px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
            <span style={{ color: "rgba(255,255,255,0.25)", fontSize: "13px" }}>
              {t.footer.copyright}
            </span>
            <div style={{ display: "flex", gap: "24px" }}>
              {t.footer.links.map(link => (
                <a key={link.label} href={link.href} style={{ color: "rgba(255,255,255,0.25)", fontSize: "13px", textDecoration: "none" }}>
                  {link.label}
                </a>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ─── SVG COMPONENTS ─── */

function HeroBackground() {
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
      <div style={{
        position: "absolute", top: "-20%", right: "-10%",
        width: "600px", height: "600px",
        background: "radial-gradient(circle, rgba(51,211,196,0.12) 0%, transparent 70%)",
        borderRadius: "50%",
      }} />
      <div style={{
        position: "absolute", bottom: "-10%", left: "30%",
        width: "400px", height: "400px",
        background: "radial-gradient(circle, rgba(255,107,74,0.07) 0%, transparent 70%)",
        borderRadius: "50%",
      }} />
      <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.04 }} xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
            <path d="M 60 0 L 0 0 0 60" fill="none" stroke="#33D3C4" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
      </svg>
      <svg style={{ position: "absolute", right: "5%", top: "50%", transform: "translateY(-50%)", opacity: 0.15 }} width="320" height="200" viewBox="0 0 320 200">
        {([30, 70, 50, 90, 40, 80, 55, 35] as number[]).map((h, i) => (
          <g key={i}>
            <line x1={40 * i + 20} y1="100" x2={40 * i + 20} y2={100 - h} stroke="#33D3C4" strokeWidth="2" strokeLinecap="round" />
            <line x1={40 * i + 20} y1="100" x2={40 * i + 20} y2={100 + h} stroke="#33D3C4" strokeWidth="2" strokeLinecap="round" />
          </g>
        ))}
      </svg>
    </div>
  );
}

function SlatePattern() {
  return (
    <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.03 }} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <pattern id="dots" width="24" height="24" patternUnits="userSpaceOnUse">
          <circle cx="2" cy="2" r="1" fill="#33D3C4" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#dots)" />
    </svg>
  );
}

function FeatureCard({ icon, title, description, accent, index }: {
  icon: React.ReactNode;
  title: string;
  description: string;
  accent: string;
  index: number;
}) {
  const rgb = accent === "#33D3C4" ? "51,211,196" : "255,107,74";
  return (
    <div style={{
      backgroundColor: "#1E293B",
      border: `1px solid rgba(${rgb},0.15)`,
      borderRadius: "16px",
      padding: "40px 36px",
      position: "relative",
      overflow: "hidden",
    }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "2px", background: `linear-gradient(90deg, ${accent}, transparent)` }} />
      <div style={{
        width: "52px", height: "52px",
        backgroundColor: `rgba(${rgb},0.1)`,
        borderRadius: "12px",
        display: "flex", alignItems: "center", justifyContent: "center",
        marginBottom: "24px",
        color: accent,
      }}>
        {icon}
      </div>
      <h3 style={{
        fontFamily: "var(--font-montserrat), system-ui, sans-serif",
        fontWeight: 700,
        fontSize: "20px",
        color: "#ffffff",
        marginBottom: "12px",
        letterSpacing: "-0.01em",
      }}>
        {title}
      </h3>
      <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "15px", lineHeight: 1.7 }}>
        {description}
      </p>
      <div style={{
        position: "absolute", bottom: "20px", right: "24px",
        fontFamily: "var(--font-ibm-plex-mono), monospace",
        fontSize: "11px",
        color: `rgba(${rgb},0.25)`,
        letterSpacing: "0.08em",
      }}>
        0{index + 1}
      </div>
    </div>
  );
}

/* ─── ICONS ─── */

function LockIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function BoltIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
}

function PinIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
      <polyline points="22,6 12,13 2,6" />
    </svg>
  );
}

function PhoneIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1.18h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.73a16 16 0 0 0 6.29 6.29l.97-.97a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7a2 2 0 0 1 1.72 2.02z" />
    </svg>
  );
}
