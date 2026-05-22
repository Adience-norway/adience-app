export default function Home() {
  return (
    <div style={{ backgroundColor: "#052630", color: "#ffffff", minHeight: "100vh", fontFamily: "var(--font-inter), system-ui, sans-serif" }}>

      {/* ─── HEADER ─── */}
      <header style={{ borderBottom: "1px solid rgba(33,212,189,0.15)", backdropFilter: "blur(12px)", backgroundColor: "rgba(5,38,48,0.85)", position: "sticky", top: 0, zIndex: 50 }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "0 24px", display: "flex", alignItems: "center", justifyContent: "space-between", height: "72px" }}>
          <div style={{ display: "flex", alignItems: "center" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="ÅDIENCE" style={{ height: "40px", width: "auto" }} />
          </div>

          <nav style={{ display: "flex", alignItems: "center", gap: "32px" }}>
            <a href="#features" style={{ color: "rgba(255,255,255,0.65)", fontSize: "14px", fontWeight: 500, textDecoration: "none", letterSpacing: "0.02em" }}>
              Funksjoner
            </a>
            <a href="#download" style={{ color: "rgba(255,255,255,0.65)", fontSize: "14px", fontWeight: 500, textDecoration: "none", letterSpacing: "0.02em" }}>
              Last ned
            </a>
            <a href="/admin" style={{
              border: "1.5px solid #21D4BD",
              color: "#21D4BD",
              fontSize: "14px",
              fontWeight: 600,
              textDecoration: "none",
              padding: "8px 20px",
              borderRadius: "6px",
              letterSpacing: "0.04em",
            }}>
              Logg inn
            </a>
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
              backgroundColor: "rgba(33,212,189,0.1)",
              border: "1px solid rgba(33,212,189,0.3)",
              borderRadius: "100px",
              padding: "6px 16px",
              marginBottom: "36px",
            }}>
              <span style={{ width: "6px", height: "6px", backgroundColor: "#21D4BD", borderRadius: "50%", display: "inline-block" }} />
              <span style={{ color: "#21D4BD", fontSize: "13px", fontWeight: 600, letterSpacing: "0.06em", fontFamily: "var(--font-roboto-mono), monospace" }}>
                LIVE STREAMING · &lt;0.5MS
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
              Raise the{" "}
              <span style={{
                background: "linear-gradient(135deg, #21D4BD 0%, #a8f0e8 100%)",
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
              Den eksklusive lydkanalen for publikum som er fysisk til stede. Kommentarer, statistikk og eksklusivt innhold — direkte i øret.
            </p>

            {/* CTA Buttons */}
            <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
              <button style={{
                backgroundColor: "#FF6B4A",
                color: "#ffffff",
                border: "none",
                borderRadius: "8px",
                padding: "16px 36px",
                fontSize: "16px",
                fontWeight: 700,
                fontFamily: "var(--font-montserrat), system-ui, sans-serif",
                letterSpacing: "0.04em",
                cursor: "pointer",
                boxShadow: "0 0 40px rgba(255,107,74,0.35)",
              }}>
                Start gratis pilot
              </button>
              <button style={{
                backgroundColor: "transparent",
                color: "#21D4BD",
                border: "1.5px solid #21D4BD",
                borderRadius: "8px",
                padding: "16px 36px",
                fontSize: "16px",
                fontWeight: 700,
                fontFamily: "var(--font-montserrat), system-ui, sans-serif",
                letterSpacing: "0.04em",
                cursor: "pointer",
              }}>
                Logg inn
              </button>
            </div>

            {/* Social proof */}
            <div style={{ marginTop: "56px", display: "flex", alignItems: "center", gap: "24px" }}>
              <div style={{ display: "flex" }}>
                {(["#21D4BD", "#1bbda8", "#17a693", "#149080"] as const).map((c, i) => (
                  <div key={i} style={{
                    width: "32px", height: "32px", borderRadius: "50%",
                    backgroundColor: c,
                    border: "2px solid #052630",
                    marginLeft: i === 0 ? 0 : "-10px",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "11px", fontWeight: 700, color: "#052630",
                  }}>
                    {["A", "B", "C", "D"][i]}
                  </div>
                ))}
              </div>
              <span style={{ color: "rgba(255,255,255,0.5)", fontSize: "14px" }}>
                <span style={{ color: "#ffffff", fontWeight: 600 }}>200+</span> arenaer har allerede vist interesse
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ─── STATS BAR ─── */}
      <div style={{ backgroundColor: "#1E293B", borderTop: "1px solid rgba(33,212,189,0.1)", borderBottom: "1px solid rgba(33,212,189,0.1)" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "32px 24px", display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0" }}>
          {[
            { value: "<0.5ms", label: "Forsinkelse" },
            { value: "99.99%", label: "Oppetid" },
            { value: "256-bit", label: "AES-kryptering" },
          ].map((stat, i) => (
            <div key={i} style={{
              textAlign: "center",
              padding: "0 16px",
              borderRight: i < 2 ? "1px solid rgba(255,255,255,0.08)" : "none",
            }}>
              <div style={{
                fontFamily: "var(--font-roboto-mono), monospace",
                fontWeight: 500,
                fontSize: "clamp(24px, 3vw, 36px)",
                color: "#21D4BD",
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
              fontFamily: "var(--font-roboto-mono), monospace",
              fontSize: "12px",
              letterSpacing: "0.14em",
              textTransform: "uppercase" as const,
              color: "#21D4BD",
              fontWeight: 500,
            }}>
              TEKNOLOGI
            </span>
            <h2 style={{
              fontFamily: "var(--font-montserrat), system-ui, sans-serif",
              fontWeight: 800,
              fontSize: "clamp(32px, 4vw, 52px)",
              letterSpacing: "-0.02em",
              marginTop: "12px",
              color: "#ffffff",
            }}>
              Bygget for arenaen
            </h2>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "24px" }}>
            <FeatureCard
              icon={<LockIcon />}
              title="Eksklusiv tilgang"
              description="Kun publikum inne på arenaen får tilgang via geofencing. Ingen kan lytte fra sofaen hjemme — innholdet forblir eksklusivt for de som er fysisk til stede."
              accent="#21D4BD"
              index={0}
            />
            <FeatureCard
              icon={<BoltIcon />}
              title="Under 0.5ms forsinkelse"
              description="Proprietær lav-latens protokoll sikrer at lyden er synkronisert med det som skjer på banen. Du hører det i takt med det du ser — alltid."
              accent="#FF6B4A"
              index={1}
            />
            <FeatureCard
              icon={<PinIcon />}
              title="Geofencing teknologi"
              description="GPS og WiFi-basert geofencing definerer arenaens perimeter nøyaktig. Tilgang aktiveres automatisk når du er inne, og deaktiveres når du forlater."
              accent="#21D4BD"
              index={2}
            />
          </div>
        </div>
      </section>

      {/* ─── HOW IT WORKS ─── */}
      <section style={{ padding: "0 24px 120px" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          <div style={{
            backgroundColor: "#1E293B",
            borderRadius: "20px",
            padding: "64px",
            border: "1px solid rgba(33,212,189,0.12)",
            position: "relative",
            overflow: "hidden",
          }}>
            <SlatePattern />
            <div style={{ position: "relative", zIndex: 1 }}>
              <div style={{ textAlign: "center", marginBottom: "56px" }}>
                <span style={{ fontFamily: "var(--font-roboto-mono), monospace", fontSize: "12px", letterSpacing: "0.14em", textTransform: "uppercase" as const, color: "#21D4BD", fontWeight: 500 }}>
                  HVORDAN DET FUNGERER
                </span>
                <h2 style={{ fontFamily: "var(--font-montserrat), system-ui, sans-serif", fontWeight: 800, fontSize: "clamp(28px, 3.5vw, 44px)", letterSpacing: "-0.02em", marginTop: "12px", color: "#ffffff" }}>
                  Tre steg til arenaopplevelsen
                </h2>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "40px" }}>
                {[
                  { step: "01", title: "Last ned appen", desc: "Tilgjengelig på App Store og Google Play. Gratis å laste ned." },
                  { step: "02", title: "Ankom arenaen", desc: "Appen registrerer automatisk at du er innenfor geofencen." },
                  { step: "03", title: "Lyt eksklusivt", desc: "Koble til med egne hodetelefoner og nyt ekspertkommentarer." },
                ].map((item) => (
                  <div key={item.step}>
                    <div style={{
                      fontFamily: "var(--font-roboto-mono), monospace",
                      fontSize: "56px",
                      fontWeight: 500,
                      color: "rgba(33,212,189,0.12)",
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
            background: "linear-gradient(135deg, rgba(33,212,189,0.12) 0%, rgba(255,107,74,0.08) 100%)",
            border: "1px solid rgba(33,212,189,0.2)",
            borderRadius: "20px",
            padding: "80px 64px",
            textAlign: "center",
            position: "relative",
            overflow: "hidden",
          }}>
            <div style={{ position: "absolute", top: "-60px", left: "10%", width: "300px", height: "300px", background: "radial-gradient(circle, #21D4BD 0%, transparent 70%)", borderRadius: "50%", opacity: 0.15, pointerEvents: "none" }} />
            <div style={{ position: "absolute", bottom: "-60px", right: "10%", width: "300px", height: "300px", background: "radial-gradient(circle, #FF6B4A 0%, transparent 70%)", borderRadius: "50%", opacity: 0.12, pointerEvents: "none" }} />

            <div style={{ position: "relative", zIndex: 1 }}>
              <span style={{ fontFamily: "var(--font-roboto-mono), monospace", fontSize: "12px", letterSpacing: "0.14em", textTransform: "uppercase" as const, color: "#FF6B4A", fontWeight: 500 }}>
                LAST NED
              </span>
              <h2 style={{ fontFamily: "var(--font-montserrat), system-ui, sans-serif", fontWeight: 800, fontSize: "clamp(28px, 4vw, 48px)", letterSpacing: "-0.02em", marginTop: "12px", marginBottom: "16px", color: "#ffffff" }}>
                Ta med Ådience til arenaen
              </h2>
              <p style={{ color: "rgba(255,255,255,0.55)", fontSize: "17px", maxWidth: "480px", margin: "0 auto 48px" }}>
                Gratis å laste ned. Tilgjengelig på iOS og Android.
              </p>

              <div style={{ display: "flex", gap: "16px", justifyContent: "center", flexWrap: "wrap" }}>
                <AppStoreButton platform="apple" />
                <AppStoreButton platform="google" />
              </div>

              <p style={{ marginTop: "24px", color: "rgba(255,255,255,0.3)", fontSize: "13px", fontFamily: "var(--font-roboto-mono), monospace" }}>
                Krever iOS 16+ eller Android 12+
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
              <div style={{ marginBottom: "16px" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/logo.png" alt="ÅDIENCE" style={{ height: "32px", width: "auto" }} />
              </div>
              <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "14px", lineHeight: 1.6, maxWidth: "320px" }}>
                Den eksklusive lydkanalen for publikum som er fysisk til stede i arenaen.
              </p>
            </div>

            <div style={{ textAlign: "right" }}>
              <div style={{ marginBottom: "12px" }}>
                <a href="mailto:post@adience.no" style={{
                  color: "#21D4BD",
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
                  fontFamily: "var(--font-roboto-mono), monospace",
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
              © 2025 Ådience AS. Alle rettigheter forbeholdt.
            </span>
            <div style={{ display: "flex", gap: "24px" }}>
              {["Personvern", "Vilkår", "Cookies"].map(link => (
                <a key={link} href="#" style={{ color: "rgba(255,255,255,0.25)", fontSize: "13px", textDecoration: "none" }}>
                  {link}
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

function LogoMark({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <circle cx="16" cy="16" r="15" stroke="#21D4BD" strokeWidth="1.5" opacity="0.4" />
      <circle cx="16" cy="16" r="10" stroke="#21D4BD" strokeWidth="1.5" opacity="0.6" />
      <circle cx="16" cy="16" r="5" fill="#21D4BD" />
      <path d="M16 1 L16 6M16 26 L16 31M1 16 L6 16M26 16 L31 16" stroke="#21D4BD" strokeWidth="1" opacity="0.3" />
    </svg>
  );
}

function HeroBackground() {
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
      <div style={{
        position: "absolute", top: "-20%", right: "-10%",
        width: "600px", height: "600px",
        background: "radial-gradient(circle, rgba(33,212,189,0.12) 0%, transparent 70%)",
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
            <path d="M 60 0 L 0 0 0 60" fill="none" stroke="#21D4BD" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
      </svg>
      <svg style={{ position: "absolute", right: "5%", top: "50%", transform: "translateY(-50%)", opacity: 0.15 }} width="320" height="200" viewBox="0 0 320 200">
        {([30, 70, 50, 90, 40, 80, 55, 35] as number[]).map((h, i) => (
          <g key={i}>
            <line x1={40 * i + 20} y1="100" x2={40 * i + 20} y2={100 - h} stroke="#21D4BD" strokeWidth="2" strokeLinecap="round" />
            <line x1={40 * i + 20} y1="100" x2={40 * i + 20} y2={100 + h} stroke="#21D4BD" strokeWidth="2" strokeLinecap="round" />
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
          <circle cx="2" cy="2" r="1" fill="#21D4BD" />
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
  const rgb = accent === "#21D4BD" ? "33,212,189" : "255,107,74";
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
        fontFamily: "var(--font-roboto-mono), monospace",
        fontSize: "11px",
        color: `rgba(${rgb},0.25)`,
        letterSpacing: "0.08em",
      }}>
        0{index + 1}
      </div>
    </div>
  );
}

function AppStoreButton({ platform }: { platform: "apple" | "google" }) {
  return (
    <button style={{
      backgroundColor: "rgba(255,255,255,0.06)",
      border: "1px solid rgba(255,255,255,0.15)",
      borderRadius: "12px",
      padding: "14px 28px",
      display: "flex",
      alignItems: "center",
      gap: "14px",
      cursor: "pointer",
      color: "#ffffff",
    }}>
      {platform === "apple" ? <AppleIcon /> : <PlayIcon />}
      <div style={{ textAlign: "left" }}>
        <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.5)", letterSpacing: "0.06em", fontFamily: "var(--font-roboto-mono), monospace", marginBottom: "2px" }}>
          {platform === "apple" ? "LAST NED PÅ" : "TILGJENGELIG PÅ"}
        </div>
        <div style={{ fontSize: "16px", fontWeight: 700, fontFamily: "var(--font-montserrat), system-ui, sans-serif", letterSpacing: "0.01em" }}>
          {platform === "apple" ? "App Store" : "Google Play"}
        </div>
      </div>
    </button>
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

function AppleIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
      <path d="M3.18 23.75a2 2 0 0 1-1-.28A2 2 0 0 1 1.18 22V2a2 2 0 0 1 3-1.73l18 10a2 2 0 0 1 0 3.46l-18 10a2 2 0 0 1-1 .02z" />
    </svg>
  );
}
