"use client";

import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import QRCode from "qrcode";
import type { Session } from "@supabase/supabase-js";
import {
  supabase,
  ARENA_SELECT_COLUMNS,
  type Arena,
  type Arrangement,
  type SpeakerTeam,
  type Abonnement,
  type PilotPeriode,
  type KursInnhold,
  type KursModulCover,
  type KursModul,
} from "@/lib/supabase";
import { ArenaProfilCard } from "@/components/ArenaProfilCard";
import { InfoTavleCard } from "@/components/InfoTavleCard";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { geokodPoststed, useGeocoder } from "@/lib/geonorge";
import type { Dictionary, Locale } from "@/i18n/get-dictionary";

type MinSide = Dictionary["minSide"];

function generateStreamId(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const random = Array.from({ length: 8 }, () =>
    chars[Math.floor(Math.random() * chars.length)]
  ).join("");
  return `ADC${random}${Date.now().toString().slice(-6)}`;
}

function beskrivInnloggingsfeil(message: string, t: MinSide["login"]): string {
  if (message.toLowerCase().includes("email not confirmed")) {
    return t.errorEmailNotConfirmed;
  }
  return t.errorGeneric;
}

const ArenaMap = dynamic(() => import("@/components/ArenaMap"), { ssr: false });
const GeofenceMap = dynamic(() => import("./_components/GeofenceMap"), { ssr: false });

// Read-only visning av admin-tegnet polygon -- ingen lagre-knapp finnes her,
// så onChange trenger ikke gjøre noe; et tilfeldig klikk forsvinner ved neste
// innlasting siden ingenting lagres.
function PolygonGeofenceMap({ lat, lng, initialPoints }: { lat: number; lng: number; initialPoints: { lat: number; lng: number }[] }) {
  return <GeofenceMap lat={lat} lng={lng} initialPoints={initialPoints} onChange={() => {}} />;
}

type Tab = "oversikt" | "arenainfo" | "speakerteam" | "statistikk" | "media";

const TAB_IDS: Tab[] = ["oversikt", "arenainfo", "speakerteam", "statistikk", "media"];

// Samme lister som registrer/RegistrerPageContent.tsx sitt registreringsskjema
// bruker — må holdes i sync manuelt (ingen delt konstant-fil i denne
// kodebasen), slik at et lagret KATEGORI/LAND/KAPASITET-valg her alltid
// matcher et gyldig alternativ i nedtrekkslisten.
const KATEGORIER = [
  "Indoor Sports Venue",
  "Outdoor Sports Venue",
  "Indoor Cultural Venue",
  "Outdoor Cultural Venue",
  "Cultural Center",
  "Theatre",
  "Opera House",
  "Festival",
  "Podcast",
  "Live",
  "Other",
];
const LAND = ["Norge", "Sverige", "Danmark", "Finland", "Spania", "Tyskland", "UK", "Annet"];
const KAPASITETER = ["Under 500", "500–2000", "2000–5000", "5000–15000", "15000+"];

/* ─── ROOT ─── */

export function MinSideContent({ dict, locale }: { dict: Dictionary; locale: Locale }) {
  const [session, setSession] = useState<Session | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setChecking(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => listener.subscription.unsubscribe();
  }, []);

  if (checking) return <div style={pageStyle} />;
  if (!session) return <LoginScreen dict={dict} locale={locale} />;
  return <Dashboard session={session} dict={dict} locale={locale} />;
}

/* ─── LOGIN ─── */

function LoginScreen({ dict, locale }: { dict: Dictionary; locale: Locale }) {
  const t = dict.minSide.login;
  const homeHref = locale === "en" ? "/en" : "/";
  const registrerHref = locale === "en" ? "/en/registrer" : "/registrer";
  const [mode, setMode] = useState<"login" | "reset">("login");
  const [epost, setEpost] = useState("");
  const [passord, setPassord] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [emailUbekreftet, setEmailUbekreftet] = useState(false);
  const [bekreftelseSendt, setBekreftelseSendt] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setEmailUbekreftet(false);
    setBekreftelseSendt(false);
    const { error } = await supabase.auth.signInWithPassword({ email: epost, password: passord });
    setLoading(false);
    if (error) {
      setError(beskrivInnloggingsfeil(error.message, t));
      setEmailUbekreftet(error.message.toLowerCase().includes("email not confirmed"));
    }
  }

  async function handleResendConfirmation() {
    setLoading(true);
    const { error } = await supabase.auth.resend({ type: "signup", email: epost });
    setLoading(false);
    if (!error) setBekreftelseSendt(true);
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const { error } = await supabase.auth.resetPasswordForEmail(epost, {
      redirectTo: `${window.location.origin}/tilbakestill-passord`,
    });
    setLoading(false);
    if (error) setError(error.message);
    else setResetSent(true);
  }

  return (
    <div style={pageStyle}>
      <div style={{ position: "absolute", top: "20px", right: "24px" }}>
        <LanguageSwitcher locale={locale} noHref="/min-side" enHref="/en/min-side" />
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
        <div style={{ width: "100%", maxWidth: "380px", padding: "24px" }}>
          <div style={{ textAlign: "center", marginBottom: "40px" }}>
            <a href={homeHref} style={{ display: "inline-block" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.png" alt="ÅDIENCE" style={{ height: "80px", width: "auto", margin: "0 auto 24px" }} />
            </a>
            <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "14px" }}>{t.pageLabel}</p>
          </div>

          {mode === "login" ? (
            <form onSubmit={handleLogin} style={cardStyle}>
              <label style={fieldLabelStyle}>{t.emailLabel}</label>
              <input
                type="email" required autoFocus value={epost} onChange={(e) => setEpost(e.target.value)}
                style={inputStyle} placeholder={t.emailPlaceholder}
              />
              <div style={{ height: "16px" }} />
              <label style={fieldLabelStyle}>{t.passwordLabel}</label>
              <input
                type="password" required value={passord} onChange={(e) => setPassord(e.target.value)}
                style={inputStyle} placeholder={t.passwordPlaceholder}
              />
              {error && <p style={{ color: "#D94F4F", fontSize: "13px", marginTop: "12px" }}>{error}</p>}
              {emailUbekreftet && (
                bekreftelseSendt ? (
                  <p style={{ color: "#33D3C4", fontSize: "13px", marginTop: "8px" }}>{t.confirmationResent}</p>
                ) : (
                  <button type="button" onClick={handleResendConfirmation} disabled={loading}
                    style={{ background: "none", border: "none", color: "#33D3C4", fontSize: "13px", marginTop: "8px", cursor: "pointer", padding: 0 }}>
                    {t.resendConfirmation}
                  </button>
                )
              )}
              <button type="submit" disabled={loading} style={{ ...tealBtnStyle, width: "100%", marginTop: "24px" }}>
                {loading ? t.loggingIn : t.loginButton}
              </button>
              <button
                type="button"
                onClick={() => { setMode("reset"); setError(""); }}
                style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", fontSize: "13px", marginTop: "16px", cursor: "pointer", width: "100%" }}
              >
                {t.forgotPassword}
              </button>
            </form>
          ) : (
            <form onSubmit={handleReset} style={cardStyle}>
              {resetSent ? (
                <p style={{ color: "#33D3C4", fontSize: "14px", lineHeight: 1.6 }}>
                  {t.resetSentMessage}
                </p>
              ) : (
                <>
                  <label style={fieldLabelStyle}>{t.emailLabel}</label>
                  <input
                    type="email" required autoFocus value={epost} onChange={(e) => setEpost(e.target.value)}
                    style={inputStyle} placeholder={t.emailPlaceholder}
                  />
                  {error && <p style={{ color: "#D94F4F", fontSize: "13px", marginTop: "12px" }}>{error}</p>}
                  <button type="submit" disabled={loading} style={{ ...tealBtnStyle, width: "100%", marginTop: "24px" }}>
                    {loading ? t.sendingReset : t.resetButton}
                  </button>
                </>
              )}
              <button
                type="button"
                onClick={() => { setMode("login"); setError(""); setResetSent(false); }}
                style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", fontSize: "13px", marginTop: "16px", cursor: "pointer", width: "100%" }}
              >
                {t.backToLogin}
              </button>
            </form>
          )}

          <p style={{ textAlign: "center", color: "rgba(255,255,255,0.3)", fontSize: "13px", marginTop: "24px" }}>
            {t.newArenaPrefix} <a href={registrerHref} style={{ color: "#33D3C4" }}>{t.registerHere}</a>
          </p>
        </div>
      </div>
    </div>
  );
}

/* ─── DASHBOARD ─── */

function Dashboard({ session, dict, locale }: { session: Session; dict: Dictionary; locale: Locale }) {
  const t = dict.minSide;
  const homeHref = locale === "en" ? "/en" : "/";
  const [tab, setTab] = useState<Tab>("oversikt");
  const [loading, setLoading] = useState(true);
  const [arena, setArena] = useState<Arena | null>(null);
  const [abonnement, setAbonnement] = useState<Abonnement | null>(null);
  const [pilot, setPilot] = useState<PilotPeriode | null>(null);
  const [arrangementer, setArrangementer] = useState<Arrangement[]>([]);
  const [speakerteam, setSpeakerteam] = useState<SpeakerTeam[]>([]);
  const [noArena, setNoArena] = useState(false);
  const [visningSomAdmin, setVisningSomAdmin] = useState(false);

  // Admin-only override so Ådience staff can open any arena's Min side directly
  // from /admin (see ArenaDetailPanel's "Åpne Min side" link) without needing to
  // log in as that arena's owner. Read directly off window.location — this
  // component only ever mounts client-side (after the session check above), so
  // there's no SSR/hydration mismatch to worry about.
  const adminArenaId = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("admin_arena") : null;

  const loadData = useCallback(async () => {
    setLoading(true);

    let arenaId: string | null = null;
    let admin = false;

    if (adminArenaId) {
      const { data: bruker } = await supabase
        .from("brukere")
        .select("arena_id, er_adience_admin")
        .eq("id", session.user.id)
        .single();
      if (bruker?.er_adience_admin) {
        arenaId = adminArenaId;
        admin = true;
      } else {
        arenaId = bruker?.arena_id ?? null;
      }
    } else {
      const { data: bruker } = await supabase
        .from("brukere")
        .select("arena_id")
        .eq("id", session.user.id)
        .single();
      arenaId = bruker?.arena_id ?? null;
    }

    if (!arenaId) {
      setNoArena(true);
      setLoading(false);
      return;
    }

    setVisningSomAdmin(admin);

    const [{ data: arenaData }, { data: abonnementData }, { data: pilotData }, { data: arrangementerData }, { data: speakerteamData }] =
      await Promise.all([
        supabase.from("arenaer").select(ARENA_SELECT_COLUMNS).eq("id", arenaId).single(),
        supabase.from("abonnementer").select("*").eq("arena_id", arenaId).order("opprettet", { ascending: false }).limit(1).maybeSingle(),
        supabase.from("pilot_perioder").select("*").eq("arena_id", arenaId).order("start_dato", { ascending: false }).limit(1).maybeSingle(),
        supabase.from("arrangementer").select("*").eq("arena_id", arenaId).order("start_tid", { ascending: false }),
        supabase.from("speakerteam").select("*").eq("arena_id", arenaId).order("opprettet", { ascending: true }),
      ]);

    setArena(arenaData ?? null);
    setAbonnement(abonnementData ?? null);
    setPilot(pilotData ?? null);
    setArrangementer(arrangementerData ?? []);
    setSpeakerteam(speakerteamData ?? []);
    setLoading(false);
  }, [session.user.id, adminArenaId]);

  useEffect(() => { loadData(); }, [loadData]);

  async function handleLogout() {
    await supabase.auth.signOut();
  }

  if (loading) return <div style={pageStyle} />;

  if (noArena) {
    // Kontoen er fortsatt gyldig innlogget hos Supabase — bare uten en
    // tilknyttet arena. Kan hende det er en admin-konto uten egen arena, så
    // gi en vei videre til Admin i stedet for at eneste utvei er å logge ut.
    const adminHref = locale === "en" ? "/en/admin" : "/admin";
    return (
      <div style={pageStyle}>
        <div style={{ maxWidth: "480px", margin: "0 auto", padding: "80px 24px", textAlign: "center" }}>
          <p style={{ color: "rgba(255,255,255,0.6)", lineHeight: 1.6 }}>
            {t.noArena.message}
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "24px" }}>
            <a href={adminHref} style={{ ...coralBtnStyleAuto, textDecoration: "none" }}>{t.noArena.goToAdmin}</a>
            <button onClick={handleLogout} style={ghostBtnStyle}>{t.noArena.logout}</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      {visningSomAdmin && (
        <div style={{ backgroundColor: "#FF6B4A", color: "#073E46", textAlign: "center", padding: "8px 16px", fontSize: "13px", fontWeight: 700, fontFamily: "var(--font-montserrat), system-ui, sans-serif" }}>
          {t.header.adminBannerPrefix}{arena?.arenanavn}{t.header.adminBannerSuffix}
        </div>
      )}
      <header style={headerStyle}>
        <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "20px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <a href={homeHref} style={{ display: "flex", alignItems: "center" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="ÅDIENCE" style={{ height: "80px", width: "auto" }} />
          </a>
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <a href="https://www.adience.no/blog" style={{ fontSize: "13px", color: "rgba(255,255,255,0.5)", textDecoration: "none" }}>{t.header.blog}</a>
            <span style={{ fontSize: "13px", color: "rgba(255,255,255,0.5)" }}>{arena?.arenanavn}</span>
            <LanguageSwitcher locale={locale} noHref="/min-side" enHref="/en/min-side" />
            {visningSomAdmin ? (
              <a href="/admin" style={{ ...ghostBtnStyle, textDecoration: "none", display: "inline-block" }}>{t.header.backToAdmin}</a>
            ) : (
              <button onClick={handleLogout} style={ghostBtnStyle}>{t.header.logout}</button>
            )}
          </div>
        </div>
      </header>

      <div style={bodyStyle}>
        <div style={{ display: "flex", alignItems: "center", gap: "20px", marginBottom: "32px" }}>
          {arena?.logo_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={arena.logo_url}
              alt={arena.arenanavn}
              style={{ height: "72px", width: "72px", borderRadius: "16px", objectFit: "cover", border: "1px solid rgba(51,211,196,0.2)", flexShrink: 0, backgroundColor: "rgba(255,255,255,0.04)" }}
            />
          )}
          <div style={{ minWidth: 0 }}>
            <p style={{ fontSize: "12px", fontWeight: 600, letterSpacing: "0.14em", color: "rgba(255,255,255,0.4)", textTransform: "uppercase", marginBottom: "4px" }}>{t.myPageLabel}</p>
            <h1 style={{ ...pageHeadingStyle, fontSize: "36px", lineHeight: 1.1 }}>{arena?.arenanavn}</h1>
            {arena?.by && <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "14px", marginTop: "6px" }}>{arena.by}</p>}
          </div>
        </div>

        <nav style={{ display: "flex", gap: "4px", marginBottom: "32px", flexWrap: "wrap" as const, borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          {TAB_IDS.map((id) => {
            const aktiv = tab === id;
            return (
              <button
                key={id}
                onClick={() => setTab(id)}
                onMouseEnter={(e) => { if (!aktiv) e.currentTarget.style.color = "#ffffff"; }}
                onMouseLeave={(e) => { if (!aktiv) e.currentTarget.style.color = "rgba(255,255,255,0.6)"; }}
                style={{
                  background: "none", border: "none", cursor: "pointer",
                  padding: "12px 18px", fontSize: "14px", fontWeight: 600,
                  color: aktiv ? "#33D3C4" : "rgba(255,255,255,0.6)",
                  borderBottom: aktiv ? "2px solid #33D3C4" : "2px solid transparent",
                  fontFamily: "var(--font-inter), system-ui, sans-serif",
                  transition: "color 0.15s",
                }}
              >
                {t.tabs[id]}
              </button>
            );
          })}
        </nav>

        {tab === "oversikt" && arena && (
          <OversiktSection arena={arena} abonnement={abonnement} pilot={pilot} arrangementer={arrangementer} speakerteam={speakerteam} onChanged={loadData} dict={dict} locale={locale} />
        )}
        {tab === "arenainfo" && arena && (
          <ArenaInfoTab arena={arena} onChanged={loadData} dict={dict} />
        )}
        {tab === "speakerteam" && arena && (
          <SpeakerteamSection arenaId={arena.id} arena={arena} speakerteam={speakerteam} onChanged={loadData} dict={dict} locale={locale} />
        )}
        {tab === "statistikk" && arena && (
          <StatistikkSection arenaId={arena.id} arrangementer={arrangementer} onChanged={loadData} dict={dict} locale={locale} />
        )}
        {tab === "media" && arena && <MediaSection arena={arena} dict={dict} locale={locale} />}
      </div>
    </div>
  );
}

/* ─── 1. OVERSIKT ─── */

function OversiktSection({
  arena, abonnement, pilot, arrangementer, speakerteam, onChanged, dict, locale,
}: {
  arena: Arena; abonnement: Abonnement | null; pilot: PilotPeriode | null;
  arrangementer: Arrangement[]; speakerteam: SpeakerTeam[]; onChanged: () => void;
  dict: Dictionary; locale: Locale;
}) {
  const t = dict.minSide.oversikt;
  const dagerIgjen = pilot ? Math.max(0, Math.ceil((new Date(pilot.slutt_dato).getTime() - Date.now()) / 86_400_000)) : null;
  const kommendeArrangementer = arrangementer.filter((a) => a.start_tid && new Date(a.start_tid) > new Date());
  const sertifiserte = speakerteam.filter((s) => s.sertifisert).length;

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px", marginBottom: "32px" }}>
        <StatCard label={t.statStreaming} value={arena.streaming_aktiv ? t.statActive : t.statInactive} accent={arena.streaming_aktiv} />
        <StatCard label={t.statUpcomingEvents} value={String(kommendeArrangementer.length)} />
        <StatCard label={t.statCertified} value={`${sertifiserte} / ${speakerteam.length}`} />
        <StatCard label={pilot?.status === "aktiv" ? t.statPilotDaysLeft : t.statSubscription} value={pilot?.status === "aktiv" ? `${dagerIgjen}` : (abonnement?.status ?? "—")} />
      </div>

      <div style={cardStyle}>
        <h3 style={{ ...sectionHeadingStyle, marginBottom: "16px" }}>{t.nextStepsTitle}</h3>
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "10px" }}>
          {!arena.geofence_polygon && (
            <NextStepItem text={t.stepGeofence} />
          )}
          {speakerteam.length === 0 && <NextStepItem text={t.stepSpeakerteam} />}
          {pilot?.status === "aktiv" && dagerIgjen !== null && dagerIgjen <= 5 && (
            <NextStepItem text={`${t.stepPilotExpiringPrefix} ${dagerIgjen} ${t.stepPilotExpiringSuffix}`} urgent />
          )}
          {arrangementer.length === 0 && <NextStepItem text={t.stepStatsComing} />}
        </ul>
      </div>

      <div style={{ marginTop: "24px", ...cardStyle }}>
        <h3 style={{ ...sectionHeadingStyle, marginBottom: "8px" }}>{t.listenersTitle}</h3>
        <p style={{ color: "rgba(255,255,255,0.35)", fontSize: "13px" }}>
          {t.listenersComing}
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "24px", marginTop: "24px" }}>
        <div style={cardStyle}>
          <h3 style={{ ...sectionHeadingStyle, marginBottom: "4px" }}>{dict.cards.arenaProfil.heading}</h3>
          <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "13px", marginBottom: "20px" }}>
            {dict.cards.arenaProfil.subtitle}
          </p>
          <ArenaProfilCard arena={arena} onSaved={onChanged} embedded dict={dict} locale={locale} />
        </div>

        <div style={cardStyle}>
          <h3 style={{ ...sectionHeadingStyle, marginBottom: "4px" }}>{dict.cards.infoTavle.heading}</h3>
          <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "13px", marginBottom: "20px" }}>
            {dict.cards.infoTavle.subtitle}
          </p>
          <InfoTavleCard arenaId={arena.id} embedded dict={dict} locale={locale} />
        </div>
      </div>

      <div style={{ marginTop: "24px" }}>
        <AbonnementSection abonnement={abonnement} pilot={pilot} dict={dict} />
      </div>
    </div>
  );
}


function StatCard({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div style={{ ...cardStyle, padding: "20px" }}>
      <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.4)", textTransform: "uppercase" as const, letterSpacing: "0.05em", marginBottom: "8px" }}>{label}</div>
      <div style={{ fontSize: "24px", fontWeight: 800, fontFamily: "var(--font-montserrat), system-ui, sans-serif", color: accent ? "#33D3C4" : "#ffffff" }}>{value}</div>
    </div>
  );
}

function NextStepItem({ text, urgent }: { text: string; urgent?: boolean }) {
  return (
    <li style={{ display: "flex", alignItems: "flex-start", gap: "10px", fontSize: "14px", color: urgent ? "#FF6B4A" : "rgba(255,255,255,0.7)" }}>
      <span style={{ color: urgent ? "#FF6B4A" : "#33D3C4", flexShrink: 0 }}>→</span>
      {text}
    </li>
  );
}

/* ─── 2. STATISTIKK ─── */

function StatistikkSection({
  arenaId, arrangementer, onChanged, dict, locale,
}: { arenaId: string; arrangementer: Arrangement[]; onChanged: () => void; dict: Dictionary; locale: Locale }) {
  const t = dict.minSide.statistikk;
  const dateLocale = locale === "en" ? "en-GB" : "no-NO";
  const [showForm, setShowForm] = useState(false);
  const [qrModal, setQrModal] = useState<{ tittel: string; streamId: string; dataUrl: string } | null>(null);
  const [tittel, setTittel] = useState("");
  const [startTid, setStartTid] = useState("");
  const [sluttTid, setSluttTid] = useState("");
  const [kreverBetaling, setKreverBetaling] = useState(false);
  const [pris, setPris] = useState("0");
  const [lytterGrense, setLytterGrense] = useState("100");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function generateQr(streamId: string) {
    const url = `https://app.adience.no/a/${streamId}`;
    return QRCode.toDataURL(url, { width: 220, margin: 2, color: { dark: "#073E46", light: "#33D3C4" } });
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");

    const streamId = generateStreamId();
    const qrKodeUrl = `https://app.adience.no/a/${streamId}`;

    const { error } = await supabase.from("arrangementer").insert({
      arena_id: arenaId,
      tittel,
      start_tid: startTid ? new Date(startTid).toISOString() : null,
      slutt_tid: sluttTid ? new Date(sluttTid).toISOString() : null,
      stream_id: streamId,
      qr_kode_url: qrKodeUrl,
      krever_betaling: kreverBetaling,
      pris: kreverBetaling ? Number(pris) : 0,
      lytter_grense: Number(lytterGrense),
    });

    setSaving(false);
    if (error) { setError(error.message); return; }

    const dataUrl = await generateQr(streamId);
    setQrModal({ tittel, streamId, dataUrl });
    setTittel(""); setStartTid(""); setSluttTid(""); setKreverBetaling(false); setPris("0"); setLytterGrense("100");
    setShowForm(false);
    onChanged();
  }

  async function visQr(a: Arrangement) {
    if (!a.stream_id) return;
    const dataUrl = await generateQr(a.stream_id);
    setQrModal({ tittel: a.tittel, streamId: a.stream_id, dataUrl });
  }

  return (
    <div>
      <div style={toolbarStyle}>
        <span style={{ color: "rgba(255,255,255,0.5)", fontSize: "14px" }}>{arrangementer.length} {t.countSuffix}</span>
        <button onClick={() => setShowForm((v) => !v)} style={tealBtnStyle}>
          {showForm ? t.cancel : t.newEvent}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} style={{ ...cardStyle, marginBottom: "24px", display: "flex", flexDirection: "column", gap: "16px" }}>
          <div>
            <label style={fieldLabelStyle}>{t.fieldTitle}</label>
            <input required value={tittel} onChange={(e) => setTittel(e.target.value)} style={inputStyle} placeholder={t.fieldTitlePlaceholder} />
          </div>
          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" as const }}>
            <div style={{ flex: 1, minWidth: "200px" }}>
              <label style={fieldLabelStyle}>{t.fieldStart}</label>
              <input type="datetime-local" required value={startTid} onChange={(e) => setStartTid(e.target.value)} style={inputStyle} />
            </div>
            <div style={{ flex: 1, minWidth: "200px" }}>
              <label style={fieldLabelStyle}>{t.fieldSlutt}</label>
              <input type="datetime-local" required value={sluttTid} onChange={(e) => setSluttTid(e.target.value)} style={inputStyle} />
            </div>
          </div>
          <div style={{ display: "flex", gap: "12px", alignItems: "flex-end", flexWrap: "wrap" as const }}>
            <div>
              <label style={fieldLabelStyle}>{t.fieldListenerLimit}</label>
              <input type="number" min={1} value={lytterGrense} onChange={(e) => setLytterGrense(e.target.value)} style={{ ...inputStyle, width: "120px" }} />
            </div>
            <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "14px", color: "rgba(255,255,255,0.7)", marginBottom: "12px" }}>
              <input type="checkbox" checked={kreverBetaling} onChange={(e) => setKreverBetaling(e.target.checked)} />
              {t.requiresPayment}
            </label>
            {kreverBetaling && (
              <div>
                <label style={fieldLabelStyle}>{t.fieldPrice}</label>
                <input type="number" min={0} value={pris} onChange={(e) => setPris(e.target.value)} style={{ ...inputStyle, width: "120px" }} />
              </div>
            )}
          </div>
          {error && <p style={{ color: "#D94F4F", fontSize: "13px" }}>{error}</p>}
          <button type="submit" disabled={saving} style={{ ...tealBtnStyle, alignSelf: "flex-start" }}>
            {saving ? t.creating : t.createButton}
          </button>
        </form>
      )}

      {arrangementer.length === 0 ? (
        <div style={{ ...cardStyle, ...emptyStyle }}>{t.emptyState}</div>
      ) : (
        <table style={tableStyle}>
          <thead><tr style={theadRowStyle}>
            <th style={thStyle}>{t.thTitle}</th>
            <th style={thStyle}>{t.thStart}</th>
            <th style={thStyle}>{t.thSlutt}</th>
            <th style={thStyle}>{t.thListenerLimit}</th>
            <th style={thStyle}>{t.thPayment}</th>
            <th style={thStyle}></th>
          </tr></thead>
          <tbody>
            {arrangementer.map((a) => {
              return (
                <tr key={a.id}>
                  <td style={tdStyle}>{a.tittel}</td>
                  <td style={tdStyle}>{a.start_tid ? new Date(a.start_tid).toLocaleString(dateLocale) : "—"}</td>
                  <td style={tdStyle}>{a.slutt_tid ? new Date(a.slutt_tid).toLocaleString(dateLocale) : "—"}</td>
                  <td style={tdStyle}>{a.lytter_grense}</td>
                  <td style={tdStyle}>{a.krever_betaling ? `${a.pris} kr` : t.free}</td>
                  <td style={tdStyle}>
                    {a.stream_id && <button onClick={() => visQr(a)} style={ghostBtnStyle}>{t.showQr}</button>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {qrModal && (
        <div style={modalOverlayStyle} onClick={() => setQrModal(null)}>
          <div style={{ ...modalBoxStyle, textAlign: "center" as const }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ ...sectionHeadingStyle, marginBottom: "4px" }}>{qrModal.tittel}</h3>
            <p style={{ fontFamily: "var(--font-ibm-plex-mono), monospace", fontSize: "13px", color: "#33D3C4", marginBottom: "20px" }}>
              {qrModal.streamId}
            </p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrModal.dataUrl} alt="QR" style={{ width: "220px", height: "220px", margin: "0 auto", borderRadius: "8px" }} />
            <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "12px", marginTop: "16px" }}>
              {t.qrModalHint}
            </p>
            <button onClick={() => setQrModal(null)} style={{ ...ghostBtnStyle, marginTop: "20px" }}>{t.close}</button>
          </div>
        </div>
      )}

      <div style={{ ...cardStyle, marginTop: "24px" }}>
        <h3 style={{ ...sectionHeadingStyle, marginBottom: "8px" }}>{t.aiInsightTitle}</h3>
        <p style={{ color: "rgba(255,255,255,0.35)", fontSize: "13px" }}>
          {t.aiInsightComing}
        </p>
      </div>
    </div>
  );
}

/* ─── 3. GEOFENCE ─── */

// Alle feltene fra registreringsskjemaet (registrer/RegistrerPageContent.tsx)
// som ikke allerede dekkes av ArenaProfilCard (beskrivelse/forsidebilde) eller
// AdresseSection (gateadresse/postnummer/by) — arenaeier kunne tidligere KUN
// rette disse gjennom Admin. Ett samlet lagre-kall for hele skjemaet, samme
// mønster som AddArenaModal i admin/AdminContent.tsx.
/* ─── ARENAINFO (egen fane) ─── */

// Alt fra registreringsskjemaet (registrer/RegistrerPageContent.tsx) samlet
// på ett sted — het tidligere to separate kort (arena-detaljer og adresse)
// som så ut som overlappende/duplikate seksjoner. Nå ett skjema, én
// lagre-knapp, samme feltrekkefølge som registreringen selv, pluss
// dekningsområdet (kart) rett under.
function ArenaInfoTab({ arena, onChanged, dict }: { arena: Arena; onChanged: () => void; dict: Dictionary }) {
  return (
    <div>
      <ArenaInfoSection arena={arena} onSaved={onChanged} dict={dict} />
      <div style={{ marginTop: "24px" }}>
        <GeofenceKartSection arena={arena} onSaved={onChanged} dict={dict} />
      </div>
    </div>
  );
}

function ArenaInfoSection({ arena, onSaved, dict }: { arena: Arena; onSaved: () => void; dict: Dictionary }) {
  const t = dict.minSide.kontaktinfo;
  const ta = dict.minSide.geofence; // adressefeltenes tekster ligger her fra før
  const [form, setForm] = useState({
    arenanavn: arena.arenanavn ?? "",
    kategori: arena.kategori ?? "",
    land: arena.land ?? "Norge",
    kapasitet: arena.kapasitet ?? "",
    org_nummer: arena.org_nummer ?? "",
    adresse_gate: arena.adresse_gate ?? arena.adresse ?? "",
    postnummer: arena.postnummer ?? "",
    by: arena.by ?? "",
    fornavn: arena.fornavn ?? "",
    etternavn: arena.etternavn ?? "",
    epost: arena.epost ?? "",
    telefon: arena.telefon ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const geo = useGeocoder();

  const opprinnelig = {
    arenanavn: arena.arenanavn ?? "", kategori: arena.kategori ?? "", land: arena.land ?? "Norge",
    kapasitet: arena.kapasitet ?? "", org_nummer: arena.org_nummer ?? "",
    adresse_gate: arena.adresse_gate ?? arena.adresse ?? "", postnummer: arena.postnummer ?? "", by: arena.by ?? "",
    fornavn: arena.fornavn ?? "", etternavn: arena.etternavn ?? "", epost: arena.epost ?? "", telefon: arena.telefon ?? "",
  };
  const harEndring = Object.keys(form).some((k) => form[k as keyof typeof form] !== opprinnelig[k as keyof typeof opprinnelig]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value } = e.target;
    setForm((prev) => {
      const next = { ...prev, [name]: value };
      // Geokoder i bakgrunnen som en hjelp/bekreftelse mens man skriver —
      // men rører ALDRI lat/lng automatisk. Å flytte selve kartnålen skjer
      // kun i kart-seksjonen under, slik at en unøyaktig geokoding aldri kan
      // flytte en allerede riktig plassert nål ved et uhell.
      if (["adresse_gate", "postnummer", "by"].includes(name)) {
        geo.schedule(
          name === "adresse_gate" ? value : next.adresse_gate,
          name === "postnummer" ? value : next.postnummer,
          name === "by" ? value : next.by,
        );
      }
      return next;
    });
  }

  async function handleSave() {
    setSaving(true);
    setError("");
    const { error } = await supabase
      .from("arenaer")
      .update({
        arenanavn: form.arenanavn,
        kategori: form.kategori || null,
        land: form.land || null,
        kapasitet: form.kapasitet || null,
        org_nummer: form.org_nummer || null,
        adresse_gate: form.adresse_gate || null,
        postnummer: form.postnummer || null,
        by: form.by || null,
        fornavn: form.fornavn || null,
        etternavn: form.etternavn || null,
        epost: form.epost || null,
        telefon: form.telefon || null,
      })
      .eq("id", arena.id);
    setSaving(false);
    if (error) { setError(error.message); return; }
    setSaved(true);
    onSaved();
    setTimeout(() => setSaved(false), 3000);
  }

  return (
    <div style={cardStyle}>
      <h3 style={{ ...sectionHeadingStyle, marginBottom: "4px" }}>{t.title}</h3>
      <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "13px", marginBottom: "20px" }}>
        {t.subtitle}
      </p>

      <label style={fieldLabelStyle}>{t.fieldArenanavn}</label>
      <input type="text" name="arenanavn" value={form.arenanavn} onChange={handleChange} style={{ ...inputStyle, marginBottom: "16px" }} />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "16px" }}>
        <div>
          <label style={fieldLabelStyle}>{t.fieldKategori}</label>
          <select name="kategori" value={form.kategori} onChange={handleChange} style={inputStyle}>
            <option value="">{t.kategoriPlaceholder}</option>
            {KATEGORIER.map((k) => <option key={k} value={k}>{k}</option>)}
          </select>
        </div>
        <div>
          <label style={fieldLabelStyle}>{t.fieldLand}</label>
          <select name="land" value={form.land} onChange={handleChange} style={inputStyle}>
            {LAND.map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "24px" }}>
        <div>
          <label style={fieldLabelStyle}>{t.fieldKapasitet}</label>
          <select name="kapasitet" value={form.kapasitet} onChange={handleChange} style={inputStyle}>
            <option value="">{t.kapasitetPlaceholder}</option>
            {KAPASITETER.map((k) => <option key={k} value={k}>{k}</option>)}
          </select>
        </div>
        <div>
          <label style={fieldLabelStyle}>{t.fieldOrgNummer}</label>
          <input type="text" name="org_nummer" value={form.org_nummer} onChange={handleChange} style={inputStyle} />
        </div>
      </div>

      <h4 style={{ ...sectionHeadingStyle, fontSize: "15px", marginBottom: "16px", color: "rgba(255,255,255,0.7)" }}>{ta.addressTitle}</h4>
      <label style={fieldLabelStyle}>{ta.fieldGateadresse}</label>
      <input
        type="text"
        name="adresse_gate"
        value={form.adresse_gate}
        onChange={handleChange}
        placeholder={ta.gateadressePlaceholder}
        style={{ ...inputStyle, marginBottom: "16px" }}
      />
      <div style={{ display: "flex", gap: "12px", marginBottom: "8px" }}>
        <div style={{ flex: "0 0 140px" }}>
          <label style={fieldLabelStyle}>{ta.fieldPostnummer}</label>
          <input type="text" name="postnummer" value={form.postnummer} onChange={handleChange} placeholder={ta.postnummerPlaceholder} style={inputStyle} />
        </div>
        <div style={{ flex: 1 }}>
          <label style={fieldLabelStyle}>{ta.fieldBy}</label>
          <input type="text" name="by" value={form.by} onChange={handleChange} placeholder={ta.byPlaceholder} style={inputStyle} />
        </div>
      </div>
      {geo.status === "loading" && <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "13px", marginTop: "8px" }}>{ta.geoLoading}</p>}
      {geo.status === "found" && <p style={{ color: "#33D3C4", fontSize: "13px", marginTop: "8px" }}>✓ {ta.geoFound}{geo.displayName ? `: ${geo.displayName}` : ""}</p>}
      {geo.status === "not_found" && <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "13px", marginTop: "8px" }}>{ta.geoNotFound}</p>}
      {geo.status === "error" && <p style={{ color: "#D94F4F", fontSize: "13px", marginTop: "8px" }}>{ta.geoError}</p>}

      <h4 style={{ ...sectionHeadingStyle, fontSize: "15px", marginTop: "24px", marginBottom: "16px", color: "rgba(255,255,255,0.7)" }}>{t.contactHeading}</h4>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "16px" }}>
        <div>
          <label style={fieldLabelStyle}>{t.fieldFornavn}</label>
          <input type="text" name="fornavn" value={form.fornavn} onChange={handleChange} style={inputStyle} />
        </div>
        <div>
          <label style={fieldLabelStyle}>{t.fieldEtternavn}</label>
          <input type="text" name="etternavn" value={form.etternavn} onChange={handleChange} style={inputStyle} />
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
        <div>
          <label style={fieldLabelStyle}>{t.fieldEpost}</label>
          <input type="email" name="epost" value={form.epost} onChange={handleChange} style={inputStyle} />
        </div>
        <div>
          <label style={fieldLabelStyle}>{t.fieldTelefon}</label>
          <input type="tel" name="telefon" value={form.telefon} onChange={handleChange} style={inputStyle} />
        </div>
      </div>

      {error && <p style={{ color: "#D94F4F", fontSize: "13px", marginTop: "12px" }}>{error}</p>}
      {saved && <p style={{ color: "#33D3C4", fontSize: "13px", marginTop: "12px" }}>{t.saved}</p>}
      <button onClick={handleSave} disabled={saving || !harEndring} style={{ ...tealBtnStyle, marginTop: "16px", opacity: (saving || !harEndring) ? 0.5 : 1 }}>
        {saving ? t.saving : t.saveButton}
      </button>
    </div>
  );
}

function GeofenceKartSection({ arena, onSaved, dict }: { arena: Arena; onSaved: () => void; dict: Dictionary }) {
  const t = dict.minSide.geofence;
  const [localRadius, setLocalRadius] = useState(arena.geofence_radius ?? 300);
  const [pendingLat, setPendingLat] = useState<number | null>(null);
  const [pendingLng, setPendingLng] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const harEndring = pendingLat !== null || localRadius !== (arena.geofence_radius ?? 300);

  async function handleSave() {
    setSaving(true);
    setError("");
    const patch: { geofence_radius: number; lat?: number; lng?: number } = { geofence_radius: localRadius };
    if (pendingLat !== null && pendingLng !== null) { patch.lat = pendingLat; patch.lng = pendingLng; }
    const { error } = await supabase.from("arenaer").update(patch).eq("id", arena.id);
    setSaving(false);
    if (error) { setError(error.message); return; }
    setPendingLat(null); setPendingLng(null);
    setSaved(true); onSaved(); setTimeout(() => setSaved(false), 3000);
  }

  if (!arena.lat || !arena.lng) {
    return <ManuellPosisjon arena={arena} onSaved={onSaved} dict={dict} />;
  }

  // Polygon er en premium-funksjon (årsabonnement) -- Ådience-admin tegner
  // den inn for arenaen (se AdminContent.tsx), Min side viser den kun
  // skrivebeskyttet her. Ingen lagre-knapp, så et tilfeldig klikk i kartet
  // har ingen effekt -- forsvinner ved neste innlasting.
  if (arena.geofence_type === "polygon" && Array.isArray(arena.geofence_polygon)) {
    return (
      <div style={cardStyle}>
        <h3 style={{ ...sectionHeadingStyle, marginBottom: "4px" }}>{t.title}</h3>
        <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "13px", marginBottom: "16px" }}>
          {t.polygonManagedByAdience}
        </p>
        <div style={{ height: "360px", borderRadius: "10px", overflow: "hidden" }}>
          <PolygonGeofenceMap
            lat={arena.lat}
            lng={arena.lng}
            initialPoints={arena.geofence_polygon as { lat: number; lng: number }[]}
          />
        </div>
      </div>
    );
  }

  return (
    <div style={cardStyle}>
      <h3 style={{ ...sectionHeadingStyle, marginBottom: "4px" }}>{t.title}</h3>
      <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "13px", marginBottom: "16px" }}>
        {t.subtitle}
      </p>
      <div style={{ height: "360px", borderRadius: "10px", overflow: "hidden", marginBottom: "16px" }}>
        <ArenaMap
          lat={pendingLat ?? arena.lat}
          lng={pendingLng ?? arena.lng}
          name={arena.arenanavn}
          radius={localRadius}
          onMarkerMove={(lat, lng) => { setPendingLat(lat); setPendingLng(lng); }}
        />
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
        <span style={{ fontSize: "13px", color: "rgba(255,255,255,0.5)" }}>{t.radiusLabel}</span>
        <span style={{ fontSize: "13px", color: "#33D3C4", fontFamily: "var(--font-ibm-plex-mono), monospace" }}>{localRadius} m</span>
      </div>
      <input
        type="range" min={50} max={2000} step={10}
        value={localRadius}
        onChange={(e) => setLocalRadius(Number(e.target.value))}
        style={{ width: "100%", accentColor: "#33D3C4", cursor: "pointer" }}
      />
      {error && <p style={{ color: "#D94F4F", fontSize: "13px", marginTop: "12px" }}>{error}</p>}
      {saved && <p style={{ color: "#33D3C4", fontSize: "13px", marginTop: "12px" }}>{t.saved}</p>}
      <button onClick={handleSave} disabled={saving || !harEndring} style={{ ...tealBtnStyle, marginTop: "16px", opacity: (saving || !harEndring) ? 0.5 : 1 }}>
        {saving ? t.saving : t.saveButton}
      </button>
    </div>
  );
}

// Vises når arenaen mangler koordinater fordi adressen ikke lot seg geokode
// automatisk (typisk norske husnummer med bokstav, f.eks. "22b"). Lar eieren
// selv sentrere kartet på poststedet, zoome inn og klikke der arenaen ligger —
// slik at de ikke trenger å kontakte oss for å få satt posisjonen.
function ManuellPosisjon({ arena, onSaved, dict }: { arena: Arena; onSaved: () => void; dict: Dictionary }) {
  const t = dict.minSide.geofence;
  const NORGE_SENTER = { lat: 61.5, lng: 8.5, zoom: 5 };
  const [aktiv, setAktiv] = useState(false);
  const [laster, setLaster] = useState(false);
  const [senter, setSenter] = useState<{ lat: number; lng: number; zoom: number } | null>(null);
  const [pending, setPending] = useState<{ lat: number; lng: number } | null>(null);
  const [lagrer, setLagrer] = useState(false);
  const [feil, setFeil] = useState("");

  async function start() {
    setAktiv(true);
    setLaster(true);
    setFeil("");
    try {
      const senter = await geokodPoststed(arena.postnummer, arena.by);
      setSenter(senter ? { ...senter, zoom: 14 } : NORGE_SENTER);
    } catch {
      setSenter(NORGE_SENTER);
    } finally {
      setLaster(false);
    }
  }

  async function lagre() {
    if (!pending) return;
    setLagrer(true);
    setFeil("");
    const { error } = await supabase.from("arenaer").update({ lat: pending.lat, lng: pending.lng }).eq("id", arena.id);
    setLagrer(false);
    if (error) { setFeil(error.message); return; }
    onSaved();
  }

  return (
    <div style={cardStyle}>
      <h3 style={{ ...sectionHeadingStyle, marginBottom: "4px" }}>{t.manualTitle}</h3>
      {!aktiv ? (
        <>
          <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "13px", marginBottom: "16px" }}>
            {t.manualSubtitlePrefix}{arena.adresse_gate ?? arena.adresse ?? "—"}{t.manualSubtitleSuffix}
          </p>
          <button onClick={start} style={tealBtnStyle}>{t.manualCta}</button>
        </>
      ) : laster || !senter ? (
        <div style={{ ...emptyStyle, padding: "40px 0" }}>{t.findingLocation}</div>
      ) : (
        <>
          <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "13px", marginBottom: "12px" }}>
            {t.clickHint}
          </p>
          <div style={{ height: "360px", borderRadius: "10px", overflow: "hidden", marginBottom: "12px" }}>
            <ArenaMap
              lat={pending?.lat ?? senter.lat}
              lng={pending?.lng ?? senter.lng}
              zoom={senter.zoom}
              name={arena.arenanavn}
              radius={arena.geofence_radius ?? 300}
              onMarkerMove={(lat, lng) => setPending({ lat, lng })}
            />
          </div>
          {feil && <p style={{ color: "#D94F4F", fontSize: "13px", marginBottom: "12px" }}>{feil}</p>}
          {pending ? (
            <button onClick={lagre} disabled={lagrer} style={tealBtnStyle}>
              {lagrer ? t.saving : t.savePosition}
            </button>
          ) : (
            <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.35)" }}>{t.placeInMapHint}</p>
          )}
        </>
      )}
    </div>
  );
}

/* ─── 4. SPEAKERTEAM ─── */

function SpeakerteamSection({
  arenaId, arena, speakerteam, onChanged, dict, locale,
}: { arenaId: string; arena: Arena; speakerteam: SpeakerTeam[]; onChanged: () => void; dict: Dictionary; locale: Locale }) {
  const t = dict.minSide.speakerteam;
  const [showForm, setShowForm] = useState(false);
  const [fornavn, setFornavn] = useState("");
  const [etternavn, setEtternavn] = useState("");
  const [epost, setEpost] = useState("");
  const [rolle, setRolle] = useState("");
  const [saving, setSaving] = useState(false);
  const [sletter, setSletter] = useState<string | null>(null);
  const [moduler, setModuler] = useState<KursModul[]>([]);

  useEffect(() => {
    supabase.from("kurs_moduler").select("*").order("rekkefolge", { ascending: true })
      .then(({ data }) => setModuler(data ?? []));
  }, []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await supabase.from("speakerteam").insert({ arena_id: arenaId, fornavn, etternavn, epost, rolle: rolle.trim() || null });
    setSaving(false);
    setFornavn(""); setEtternavn(""); setEpost(""); setRolle(""); setShowForm(false);
    onChanged();
  }

  async function handleDelete(id: string) {
    if (!confirm(t.confirmDelete)) return;
    setSletter(id);
    await supabase.from("speakerteam").delete().eq("id", id);
    setSletter(null);
    onChanged();
  }

  return (
    <div>
      <div style={toolbarStyle}>
        <span style={{ color: "rgba(255,255,255,0.5)", fontSize: "14px" }}>{speakerteam.length} {t.countSuffix}</span>
        <button onClick={() => setShowForm((v) => !v)} style={tealBtnStyle}>
          {showForm ? t.cancel : t.addSpeaker}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleAdd} style={{ ...cardStyle, marginBottom: "24px", display: "flex", gap: "12px", flexWrap: "wrap" as const, alignItems: "flex-end" }}>
          <div><label style={fieldLabelStyle}>{t.fieldFornavn}</label><input required value={fornavn} onChange={(e) => setFornavn(e.target.value)} style={inputStyle} /></div>
          <div><label style={fieldLabelStyle}>{t.fieldEtternavn}</label><input required value={etternavn} onChange={(e) => setEtternavn(e.target.value)} style={inputStyle} /></div>
          <div><label style={fieldLabelStyle}>{t.fieldEpost}</label><input type="email" required value={epost} onChange={(e) => setEpost(e.target.value)} style={inputStyle} /></div>
          <div><label style={fieldLabelStyle}>{t.fieldRolle}</label><input value={rolle} onChange={(e) => setRolle(e.target.value)} style={inputStyle} /></div>
          <button type="submit" disabled={saving} style={tealBtnStyle}>{saving ? t.saving : t.addButton}</button>
        </form>
      )}

      {speakerteam.length === 0 ? (
        <div style={{ ...cardStyle, ...emptyStyle }}>{t.emptyState}</div>
      ) : (
        <table style={tableStyle}>
          <thead><tr style={theadRowStyle}>
            <th style={thStyle}>{t.thName}</th><th style={thStyle}>{t.thEmail}</th><th style={thStyle}>{t.thRolle}</th><th style={thStyle}>{t.thProgress}</th><th style={thStyle}>{t.thCertified}</th><th style={thStyle} />
          </tr></thead>
          <tbody>
            {speakerteam.map((s) => (
              <tr key={s.id}>
                <td style={tdStyle}>{s.fornavn} {s.etternavn}</td>
                <td style={tdStyle}>{s.epost}</td>
                <td style={tdStyle}>{s.rolle ?? "—"}</td>
                <td style={tdStyle}>{s.fullforte_moduler.length} / {moduler.length}</td>
                <td style={tdStyle}>{s.sertifisert ? <span style={{ color: "#33D3C4" }}>{t.certifiedLabel}</span> : "—"}</td>
                <td style={tdStyle}>
                  <button onClick={() => handleDelete(s.id)} disabled={sletter === s.id} style={{ ...ghostBtnStyle, padding: "6px 10px", color: "#D94F4F" }}>
                    {t.deleteButton}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div style={{ marginTop: "24px" }}>
        <h3 style={{ ...sectionHeadingStyle, marginBottom: "16px" }}>{dict.minSide.tabs.kurs}</h3>
        <KursSection speakerteam={speakerteam} moduler={moduler} onChanged={onChanged} dict={dict} locale={locale} />
      </div>

      <div style={{ marginTop: "24px" }}>
        <h3 style={{ ...sectionHeadingStyle, marginBottom: "16px" }}>{dict.minSide.tabs.sertifikater}</h3>
        <SertifikaterSection arena={arena} speakerteam={speakerteam} moduler={moduler} dict={dict} locale={locale} />
      </div>
    </div>
  );
}

/* ─── 5. KURSMODULER ─── */

function youtubeEmbedUrl(url: string): string | null {
  const watch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/);
  return watch ? `https://www.youtube.com/embed/${watch[1]}` : null;
}

function KursInnholdBlokk({ blokk }: { blokk: KursInnhold }) {
  if (blokk.type === "tekst") {
    return <p style={{ fontSize: "15px", lineHeight: 1.7, color: "rgba(255,255,255,0.8)", whiteSpace: "pre-wrap" as const, margin: 0 }}>{blokk.innhold}</p>;
  }
  if (blokk.type === "bilde") {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={blokk.innhold} alt="" style={{ maxWidth: "100%", borderRadius: "8px", display: "block" }} />;
  }
  if (blokk.type === "lyd") {
    return <audio controls src={blokk.innhold} style={{ width: "100%" }} />;
  }
  const embed = youtubeEmbedUrl(blokk.innhold);
  return embed ? (
    <div style={{ position: "relative", paddingTop: "56.25%" }}>
      <iframe src={embed} allowFullScreen style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: "none", borderRadius: "8px" }} />
    </div>
  ) : (
    <video controls src={blokk.innhold} style={{ width: "100%", borderRadius: "8px" }} />
  );
}

function KursSection({ speakerteam, moduler, onChanged, dict, locale }: { speakerteam: SpeakerTeam[]; moduler: KursModul[]; onChanged: () => void; dict: Dictionary; locale: Locale }) {
  const t = dict.minSide.kurs;
  const dateLocale = locale === "en" ? "en-GB" : "no-NO";
  const [selectedId, setSelectedId] = useState<string>(speakerteam[0]?.id ?? "");
  const selected = speakerteam.find((s) => s.id === selectedId) ?? null;
  // Gjeldende modul = første modul (i rekkefølge) speakeren IKKE har fullført
  // ennå. Siden fullforte_moduler er en liste over modul-ID-er (ikke et
  // tall), spiller det ingen rolle om admin har omorganisert modulene siden
  // sist — dette forblir korrekt.
  const gjeldendeModul = selected ? moduler.find(m => !selected.fullforte_moduler.includes(m.id)) ?? null : null;
  const [innhold, setInnhold] = useState<KursInnhold[]>([]);
  const [cover, setCover] = useState<KursModulCover | null>(null);
  const [bekreftet, setBekreftet] = useState(false);

  // Nullstill avkrysningen når speaker eller modul endres, slik at den faktisk
  // må bekreftes på nytt for HVER modul — ikke bare klikkes én gang totalt.
  useEffect(() => { setBekreftet(false); }, [selected?.id, gjeldendeModul?.id]);

  // Innholdet for modulen speakeren står på nå -- vises før "Neste modul",
  // slik at bekreftelsen faktisk betyr at de har lest/sett noe, ikke bare
  // klikket blindt videre.
  useEffect(() => {
    if (!gjeldendeModul) { setInnhold([]); return; }
    let avbrutt = false;
    supabase
      .from("kurs_innhold")
      .select("*")
      .eq("modul_id", gjeldendeModul.id)
      .eq("sprak", locale)
      .order("rekkefolge", { ascending: true })
      .then(({ data }) => { if (!avbrutt) setInnhold(data ?? []); });
    return () => { avbrutt = true; };
  }, [gjeldendeModul?.id, locale]);

  // Modulillustrasjonen er felles for alle språk, uavhengig av `innhold` over.
  useEffect(() => {
    if (!gjeldendeModul) { setCover(null); return; }
    let avbrutt = false;
    supabase
      .from("kurs_modul_cover")
      .select("*")
      .eq("modul_id", gjeldendeModul.id)
      .maybeSingle()
      .then(({ data }) => { if (!avbrutt) setCover(data ?? null); });
    return () => { avbrutt = true; };
  }, [gjeldendeModul?.id]);

  async function advance() {
    if (!selected || !gjeldendeModul) return;
    const nyeFullforte = [...selected.fullforte_moduler, gjeldendeModul.id];
    const sertifisert = moduler.every(m => nyeFullforte.includes(m.id));
    await supabase.from("speakerteam").update({
      fullforte_moduler: nyeFullforte,
      sertifisert,
      sertifikat_dato: sertifisert ? new Date().toISOString() : null,
    }).eq("id", selected.id);
    onChanged();
  }

  if (speakerteam.length === 0) {
    return <div style={{ ...cardStyle, ...emptyStyle }}>{t.emptyState}</div>;
  }

  return (
    <div style={cardStyle}>
      <label style={fieldLabelStyle}>{t.selectSpeaker}</label>
      <select value={selectedId} onChange={(e) => setSelectedId(e.target.value)} style={{ ...inputStyle, marginBottom: "24px" }}>
        {speakerteam.map((s) => <option key={s.id} value={s.id}>{s.fornavn} {s.etternavn}</option>)}
      </select>

      {selected && (
        <div>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "20px" }}>
            {moduler.map((m, i) => {
              const fullfort = selected.fullforte_moduler.includes(m.id);
              return (
                <div key={m.id} style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <div style={{
                    width: "24px", height: "24px", borderRadius: "50%", flexShrink: 0,
                    display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: 700,
                    backgroundColor: fullfort ? "#33D3C4" : "rgba(255,255,255,0.08)",
                    color: fullfort ? "#073E46" : "rgba(255,255,255,0.35)",
                  }}>
                    {fullfort ? "✓" : i + 1}
                  </div>
                  <span style={{ fontSize: "14px", color: fullfort ? "#ffffff" : "rgba(255,255,255,0.4)" }}>{locale === "en" ? m.navn_en : m.navn_no}</span>
                </div>
              );
            })}
          </div>
          {selected.sertifisert || !gjeldendeModul ? (
            <p style={{ color: "#33D3C4", fontSize: "14px" }}>{t.certifiedPrefix} {selected.sertifikat_dato && new Date(selected.sertifikat_dato).toLocaleDateString(dateLocale)}</p>
          ) : (
            <>
              {cover && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={cover.bilde_url} alt="" style={{ width: "100%", aspectRatio: "3 / 2", objectFit: "cover", borderRadius: "10px", marginTop: "20px", display: "block" }} />
              )}
              {innhold.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: "16px", margin: "20px 0", padding: "20px", backgroundColor: "rgba(255,255,255,0.03)", borderRadius: "10px" }}>
                  {innhold.map((b) => <KursInnholdBlokk key={b.id} blokk={b} />)}
                </div>
              )}
              <label style={{ display: "flex", alignItems: "flex-start", gap: "10px", marginBottom: "16px", fontSize: "14px", color: "rgba(255,255,255,0.7)", cursor: "pointer" }}>
                <input type="checkbox" checked={bekreftet} onChange={(e) => setBekreftet(e.target.checked)} style={{ marginTop: "3px" }} />
                {t.confirmCheckbox}
              </label>
              <button onClick={advance} disabled={!bekreftet} style={{ ...tealBtnStyle, opacity: bekreftet ? 1 : 0.4, cursor: bekreftet ? "pointer" : "not-allowed" }}>{t.nextModuleButton}</button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── 6. SERTIFIKATER ─── */

function SertifikaterSection({ arena, speakerteam, moduler, dict, locale }: { arena: Arena | null; speakerteam: SpeakerTeam[]; moduler: KursModul[]; dict: Dictionary; locale: Locale }) {
  const t = dict.minSide.sertifikater;
  const dateLocale = locale === "en" ? "en-GB" : "no-NO";
  const sertifiserte = speakerteam.filter((s) => s.sertifisert);

  function printCertificate(s: SpeakerTeam) {
    const win = window.open("", "_blank");
    if (!win) return;
    // Hentet direkte fra kurs_moduler (kort_no/kort_en), i stedet for en
    // separat, fast liste -- ellers ville "hva du har lært" fort blitt
    // feil/utdatert i det øyeblikket noen legger til, omdøper eller sletter
    // en modul i produksjonsverktøyet.
    const stikkordHtml = moduler
      .map((m) => locale === "en" ? (m.kort_en || m.navn_en) : (m.kort_no || m.navn_no))
      .map((punkt) => `<li style="margin-bottom:10px;padding-left:22px;position:relative;">
          <span style="position:absolute;left:0;color:#33D3C4;">✓</span>${punkt}
        </li>`)
      .join("");
    win.document.write(`
      <html><head><title>${t.certTitlePrefix} ${s.fornavn} ${s.etternavn}</title>
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500&family=Montserrat:wght@700;800&display=swap" rel="stylesheet">
      <style>@page { size: A4; margin: 0; }</style>
      </head>
      <body style="font-family:'Inter',system-ui,sans-serif;background:#073E46;color:#fff;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;">
        <div style="border:3px solid #33D3C4;border-radius:20px;padding:56px 60px;text-align:center;max-width:640px;background:linear-gradient(160deg, #0B4B54 0%, #073E46 60%);">
          <svg width="110" height="110" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" style="margin-bottom:8px;">
            <circle cx="60" cy="60" r="56" stroke="#33D3C4" stroke-width="2"/>
            <circle cx="60" cy="60" r="48" stroke="#FF6B4A" stroke-width="1" stroke-dasharray="2 3"/>
            <path d="M30 85 Q20 70 28 50 Q34 60 30 85" fill="#33D3C4" opacity="0.45"/>
            <path d="M25 78 Q16 66 22 48" stroke="#33D3C4" stroke-width="1.5" fill="none" opacity="0.7"/>
            <path d="M90 85 Q100 70 92 50 Q86 60 90 85" fill="#33D3C4" opacity="0.45"/>
            <path d="M95 78 Q104 66 98 48" stroke="#33D3C4" stroke-width="1.5" fill="none" opacity="0.7"/>
            <rect x="42" y="50" width="6" height="20" rx="3" fill="#FF6B4A"/>
            <rect x="52" y="40" width="6" height="40" rx="3" fill="#33D3C4"/>
            <rect x="62" y="46" width="6" height="28" rx="3" fill="#FF6B4A"/>
            <rect x="72" y="36" width="6" height="48" rx="3" fill="#33D3C4"/>
          </svg>
          <p style="letter-spacing:0.2em;color:#33D3C4;font-size:13px;margin:0;">${t.certHeader}</p>
          <h1 style="font-family:'Montserrat',system-ui,sans-serif;font-weight:800;font-size:32px;margin:20px 0 4px;">${s.fornavn} ${s.etternavn}</h1>
          ${s.rolle ? `<p style="color:#FF6B4A;font-size:13px;letter-spacing:0.06em;margin:0 0 16px;text-transform:uppercase;">${s.rolle}</p>` : ""}
          <p style="color:rgba(255,255,255,0.7);margin-bottom:4px;">${t.certCompletedFor}</p>
          <p style="font-size:20px;margin:4px 0 32px;font-weight:600;">${arena?.arenanavn ?? ""}</p>

          <div style="text-align:left;background:rgba(255,255,255,0.04);border:1px solid rgba(51,211,196,0.15);border-radius:12px;padding:24px 28px;margin-bottom:28px;">
            <p style="font-family:'Montserrat',system-ui,sans-serif;font-weight:700;font-size:13px;letter-spacing:0.1em;color:#33D3C4;margin:0 0 14px;">${t.laertTittel.toUpperCase()}</p>
            <ul style="list-style:none;margin:0;padding:0;font-size:14px;line-height:1.5;color:rgba(255,255,255,0.85);">
              ${stikkordHtml}
            </ul>
          </div>

          <p style="color:rgba(255,255,255,0.4);font-size:13px;margin:0;">
            ${s.sertifikat_dato ? new Date(s.sertifikat_dato).toLocaleDateString(dateLocale) : ""}
          </p>
        </div>
        <script>window.print();</script>
      </body></html>
    `);
    win.document.close();
  }

  if (sertifiserte.length === 0) {
    return <div style={{ ...cardStyle, ...emptyStyle }}>{t.emptyState}</div>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      {sertifiserte.map((s) => (
        <div key={s.id} style={{ ...cardStyle, padding: "20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontWeight: 600 }}>{s.fornavn} {s.etternavn}</div>
            <div style={{ fontSize: "13px", color: "rgba(255,255,255,0.4)" }}>
              {t.certifiedPrefix} {s.sertifikat_dato && new Date(s.sertifikat_dato).toLocaleDateString(dateLocale)}
            </div>
          </div>
          <button onClick={() => printCertificate(s)} style={ghostBtnStyle}>{t.downloadCert}</button>
        </div>
      ))}
    </div>
  );
}

/* ─── 7. MEDIA ─── */

function CopyLinkButton({ text, label, copiedLabel }: { text: string; label: string; copiedLabel: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard.writeText(text).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        });
      }}
      style={{ ...tealBtnStyle, whiteSpace: "nowrap" as const, flexShrink: 0 }}
    >
      {copied ? copiedLabel : label}
    </button>
  );
}

function MediaSection({ arena, dict, locale }: { arena: Arena; dict: Dictionary; locale: Locale }) {
  const t = dict.minSide.media;
  const [qrAdience, setQrAdience] = useState<string | null>(null);
  const [qrHvit, setQrHvit] = useState<string | null>(null);
  const [qrTransparent, setQrTransparent] = useState<string | null>(null);
  const [genererer, setGenererer] = useState(false);
  const [castPassord, setCastPassord] = useState<string | null>(null);

  // cast_passord er sperret for vanlige select-spørringer i databasen (se
  // migrasjonen lock_down_cast_passord_column_v2) — må hentes via denne
  // egne RPC-en, som selv sjekker at innlogget bruker faktisk eier arenaen.
  useEffect(() => {
    supabase.rpc("get_cast_passord", { p_arena_id: arena.id }).then(({ data }) => {
      if (typeof data === "string") setCastPassord(data);
    });
  }, [arena.id]);

  useEffect(() => {
    if (!arena.stream_id) return;
    setGenererer(true);
    const url = `https://app.adience.no/a/${arena.stream_id}`;
    Promise.all([
      QRCode.toDataURL(url, { width: 400, margin: 2, color: { dark: "#073E46", light: "#33D3C4" } }),
      QRCode.toDataURL(url, { width: 400, margin: 2, color: { dark: "#073E46", light: "#FFFFFFFF" } }),
      QRCode.toDataURL(url, { width: 400, margin: 2, color: { dark: "#073E46", light: "#00000000" } }),
    ]).then(([adience, hvit, transparent]) => {
      setQrAdience(adience);
      setQrHvit(hvit);
      setQrTransparent(transparent);
      setGenererer(false);
    });
  }, [arena.stream_id]);

  const qrKort = [
    { data: qrAdience, fil: `adience-qr-farger-${arena.arenanavn}.png`, tittel: t.qrCardAdience.title, beskrivelse: t.qrCardAdience.desc },
    { data: qrHvit, fil: `adience-qr-hvit-${arena.arenanavn}.png`, tittel: t.qrCardWhite.title, beskrivelse: t.qrCardWhite.desc },
    { data: qrTransparent, fil: `adience-qr-transparent-${arena.arenanavn}.png`, tittel: t.qrCardTransparent.title, beskrivelse: t.qrCardTransparent.desc },
  ];
  const pdfKort = [
    { fil: "slik-bruker-du-adience.pdf", tittel: t.pdfCard1.title, beskrivelse: t.pdfCard1.desc },
    { fil: "inspirasjon-ansatte-sikkerhet.pdf", tittel: t.pdfCard2.title, beskrivelse: t.pdfCard2.desc },
    { fil: "speakerteam-guide.pdf", tittel: t.pdfCardSpeakerteam.title, beskrivelse: t.pdfCardSpeakerteam.desc },
    { fil: "sponsor-partner-speakerteam.pdf", tittel: t.pdfCardSponsor.title, beskrivelse: t.pdfCardSponsor.desc },
  ];

  // Plakaten er unik per arena (ekte QR-kode + arenanavn), så den kan ikke
  // være en statisk fil som de andre PDF-ene — genereres i et print-vindu,
  // samme mønster som sertifikat-utskrift i SpeakerteamSection.
  function printPoster() {
    if (!qrAdience) return;
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`
      <html><head><title>${t.posterTitlePrefix} ${arena.arenanavn}</title>
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Montserrat:wght@700;800&display=swap" rel="stylesheet"></head>
      <body style="font-family:'Inter',system-ui,sans-serif;background:#ffffff;color:#073E46;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;padding:40px;box-sizing:border-box;">
        <div style="border:3px solid #073E46;border-radius:24px;padding:64px 56px;text-align:center;max-width:560px;">
          <p style="letter-spacing:0.18em;color:#FF6B4A;font-size:13px;font-weight:700;margin:0 0 16px;">ÅDIENCE</p>
          <h1 style="font-family:'Montserrat',system-ui,sans-serif;font-weight:800;font-size:30px;margin:0 0 12px;line-height:1.2;">
            ${t.posterHeadlinePrefix} ${arena.arenanavn}
          </h1>
          <p style="font-size:16px;color:#20313A;line-height:1.6;margin:0 0 32px;">
            ${t.posterSubline}
          </p>
          <img src="${qrAdience}" alt="QR" style="width:260px;height:260px;margin:0 auto 32px;display:block;" />
          <p style="font-size:14px;color:#5B6B70;line-height:1.6;margin:0;">
            ${t.posterBody}
          </p>
        </div>
        <script>window.print();</script>
      </body></html>
    `);
    win.document.close();
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
      <div>
        <h3 style={{ fontSize: "15px", fontWeight: 600, marginBottom: "4px" }}>{t.qrTitlePrefix} {arena.arenanavn}</h3>
        <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.4)", marginBottom: "16px" }}>
          {t.qrHelpText}
        </p>
        {!arena.stream_id ? (
          <p style={{ ...cardStyle, padding: "20px", fontSize: "13px", color: "rgba(255,255,255,0.5)" }}>
            {t.noStreamId}
          </p>
        ) : (
          <>
            {/* Stream-ID + direkte lenke til castingverktøyet — dette er det
                arenaens EGET personale (den som skal sende) trenger, ikke
                publikum (publikum bruker QR-kodene under). ID-en er
                permanent — den slutter aldri å eksistere, uavhengig av
                abonnement/pilotperiode; kun selve muligheten til å faktisk
                starte en sending kan bli stengt da. Cast-lenken forhåndsfyller
                ID-en på castingsiden (se initialStreamIdFromUrl i
                CastContent.tsx), så personalet slipper å skrive den inn selv. */}
            <div style={{ ...cardStyle, padding: "16px 20px", marginBottom: "16px", display: "flex", flexDirection: "column" as const, gap: "14px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" as const }}>
                <div>
                  <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.4)", marginBottom: "4px" }}>{t.streamIdLabel}</div>
                  <span style={{ fontFamily: "var(--font-ibm-plex-mono), monospace", fontSize: "14px", color: "#33D3C4" }}>
                    {arena.stream_id}
                  </span>
                </div>
                <CopyLinkButton text={arena.stream_id} label={t.copyLink} copiedLabel={t.copied} />
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" as const, paddingTop: "10px", borderTop: "1px solid rgba(255,255,255,0.07)" }}>
                <div>
                  <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.4)", marginBottom: "4px" }}>{t.castPassordLabel}</div>
                  <span style={{ fontFamily: "var(--font-ibm-plex-mono), monospace", fontSize: "14px", color: "#33D3C4" }}>
                    {castPassord ?? "…"}
                  </span>
                </div>
                {castPassord && <CopyLinkButton text={castPassord} label={t.copyLink} copiedLabel={t.copied} />}
              </div>
              <a
                href={`${locale === "en" ? "/en" : ""}/cast?id=${arena.stream_id}`}
                target="_blank" rel="noopener noreferrer"
                style={{ ...ghostBtnStyle, textDecoration: "none", textAlign: "center" as const }}
              >
                {t.openCastTool}
              </a>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "16px" }}>
            {qrKort.map((k) => (
              <div key={k.fil} style={{ ...cardStyle, padding: "20px", textAlign: "center" }}>
                <div style={{ backgroundColor: "#ffffff", borderRadius: "10px", padding: "12px", marginBottom: "14px", display: "inline-block", minWidth: "140px", minHeight: "140px" }}>
                  {k.data ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={k.data} alt={k.tittel} style={{ width: "140px", height: "140px", display: "block" }} />
                  ) : (
                    <div style={{ width: "140px", height: "140px", display: "flex", alignItems: "center", justifyContent: "center", color: "#073E46", fontSize: "12px" }}>
                      {genererer ? t.generating : "—"}
                    </div>
                  )}
                </div>
                <div style={{ fontWeight: 600, fontSize: "14px", marginBottom: "4px" }}>{k.tittel}</div>
                <p style={{ fontSize: "12.5px", color: "rgba(255,255,255,0.4)", lineHeight: 1.5, marginBottom: "14px" }}>{k.beskrivelse}</p>
                {k.data && (
                  <a href={k.data} download={k.fil} style={{ ...tealBtnStyle, display: "block", textDecoration: "none", textAlign: "center" }}>
                    {t.downloadPng}
                  </a>
                )}
              </div>
            ))}
            </div>

            <div style={{ ...cardStyle, marginTop: "16px", padding: "20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px", flexWrap: "wrap" as const }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: "14px", marginBottom: "4px" }}>{t.posterCardTitle}</div>
                <p style={{ fontSize: "12.5px", color: "rgba(255,255,255,0.4)", lineHeight: 1.5, maxWidth: "420px" }}>{t.posterCardDesc}</p>
              </div>
              <button onClick={printPoster} disabled={!qrAdience} style={{ ...tealBtnStyle, opacity: qrAdience ? 1 : 0.5, flexShrink: 0 }}>
                {t.printPoster}
              </button>
            </div>
          </>
        )}
      </div>

      <div>
        <h3 style={{ fontSize: "15px", fontWeight: 600, marginBottom: "4px" }}>{t.materialTitle}</h3>
        <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.4)", marginBottom: "16px" }}>
          {t.materialSubtitle}
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "16px" }}>
          {pdfKort.map((k) => (
            <div key={k.fil} style={{ ...cardStyle, padding: "20px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: "14px", marginBottom: "6px" }}>{k.tittel}</div>
                <p style={{ fontSize: "12.5px", color: "rgba(255,255,255,0.4)", lineHeight: 1.5, marginBottom: "16px" }}>{k.beskrivelse}</p>
              </div>
              <a href={`/media/${k.fil}`} download style={{ ...ghostBtnStyle, display: "block", textDecoration: "none", textAlign: "center" }}>
                {t.downloadPdf}
              </a>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── 8. ABONNEMENT ─── */

function AbonnementSection({ abonnement, pilot, dict }: { abonnement: Abonnement | null; pilot: PilotPeriode | null; dict: Dictionary }) {
  const t = dict.minSide.abonnement;
  const [showUpgrade, setShowUpgrade] = useState(false);
  const dagerIgjen = pilot ? Math.max(0, Math.ceil((new Date(pilot.slutt_dato).getTime() - Date.now()) / 86_400_000)) : null;

  return (
    <div>
      <div style={cardStyle}>
        <h3 style={{ ...sectionHeadingStyle, marginBottom: "16px" }}>{t.title}</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "16px" }}>
          <InfoRow label={t.typeLabel} value={abonnement?.type ?? "—"} />
          <InfoRow label={t.statusLabel} value={abonnement?.status ?? "—"} />
          {pilot?.status === "aktiv" && <InfoRow label={t.pilotDaysLabel} value={String(dagerIgjen)} />}
          {abonnement?.total_pris != null && <InfoRow label={t.totalPriceLabel} value={`${abonnement.total_pris} kr`} />}
        </div>

        <button onClick={() => setShowUpgrade(true)} style={{ ...coralBtnStyleAuto, marginTop: "24px" }}>
          {t.upgradeButton}
        </button>
      </div>

      {showUpgrade && (
        <div style={modalOverlayStyle} onClick={() => setShowUpgrade(false)}>
          <div style={modalBoxStyle} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ ...sectionHeadingStyle, marginBottom: "12px" }}>{t.modalTitle}</h3>
            <p style={{ color: "rgba(255,255,255,0.6)", fontSize: "14px", lineHeight: 1.6 }}>
              {t.modalText}
            </p>
            <button onClick={() => setShowUpgrade(false)} style={{ ...ghostBtnStyle, marginTop: "20px" }}>{t.close}</button>
          </div>
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={infoCardStyle}>
      <div style={infoLabelStyle}>{label}</div>
      <div style={{ fontSize: "16px", fontWeight: 600 }}>{value}</div>
    </div>
  );
}

/* ─── STYLES ─── */

const pageStyle: React.CSSProperties = { backgroundColor: "#073E46", minHeight: "100vh", color: "#ffffff", fontFamily: "var(--font-inter), system-ui, sans-serif", position: "relative" };
const headerStyle: React.CSSProperties = { borderBottom: "1px solid rgba(51,211,196,0.1)", backgroundColor: "rgba(7,62,70,0.95)", position: "sticky", top: 0, zIndex: 50 };
const bodyStyle: React.CSSProperties = { maxWidth: "1280px", margin: "0 auto", padding: "40px 24px 80px" };
const toolbarStyle: React.CSSProperties = { display: "flex", gap: "12px", alignItems: "center", justifyContent: "space-between", marginBottom: "16px", flexWrap: "wrap" as const };
const tableStyle: React.CSSProperties = { width: "100%", borderCollapse: "collapse", backgroundColor: "#1E293B", borderRadius: "12px", overflow: "hidden", border: "1px solid rgba(255,255,255,0.06)" };
const theadRowStyle: React.CSSProperties = { borderBottom: "1px solid rgba(255,255,255,0.08)", backgroundColor: "rgba(255,255,255,0.03)" };
const thStyle: React.CSSProperties = { padding: "14px 20px", textAlign: "left", fontSize: "11px", fontWeight: 600, color: "rgba(255,255,255,0.4)", letterSpacing: "0.08em", textTransform: "uppercase" as const, whiteSpace: "nowrap" as const };
const tdStyle: React.CSSProperties = { padding: "14px 20px", borderBottom: "1px solid rgba(255,255,255,0.04)", verticalAlign: "middle" };
const infoCardStyle: React.CSSProperties = { backgroundColor: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "10px", padding: "12px 16px" };
const infoLabelStyle: React.CSSProperties = { fontSize: "12px", color: "rgba(255,255,255,0.35)", letterSpacing: "0.03em", marginBottom: "4px" };
const cardStyle: React.CSSProperties = { backgroundColor: "#1E293B", border: "1px solid rgba(51,211,196,0.12)", borderRadius: "16px", padding: "28px" };
const modalOverlayStyle: React.CSSProperties = { position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: "24px" };
const modalBoxStyle: React.CSSProperties = { backgroundColor: "#1E293B", border: "1px solid rgba(51,211,196,0.2)", borderRadius: "16px", padding: "36px", width: "100%", maxWidth: "480px", color: "#ffffff" };
const inputStyle: React.CSSProperties = { width: "100%", backgroundColor: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "8px", padding: "12px 16px", color: "#ffffff", fontSize: "15px", outline: "none", fontFamily: "var(--font-inter), system-ui, sans-serif" };
const pageHeadingStyle: React.CSSProperties = { fontFamily: "var(--font-montserrat), system-ui, sans-serif", fontWeight: 800, fontSize: "28px", letterSpacing: "-0.02em" };
const sectionHeadingStyle: React.CSSProperties = { fontFamily: "var(--font-montserrat), system-ui, sans-serif", fontWeight: 700, fontSize: "18px" };
const fieldLabelStyle: React.CSSProperties = { display: "block", fontSize: "13px", fontWeight: 500, color: "rgba(255,255,255,0.6)", marginBottom: "8px", letterSpacing: "0.03em" };
const emptyStyle: React.CSSProperties = { textAlign: "center", padding: "80px 0", color: "rgba(255,255,255,0.3)", fontFamily: "var(--font-ibm-plex-mono), monospace", fontSize: "14px" };
const ghostBtnStyle: React.CSSProperties = { backgroundColor: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "8px", padding: "10px 16px", color: "rgba(255,255,255,0.6)", fontSize: "13px", cursor: "pointer", fontFamily: "var(--font-inter), system-ui, sans-serif" };
const tealBtnStyle: React.CSSProperties = { backgroundColor: "#33D3C4", border: "none", borderRadius: "8px", padding: "12px 20px", color: "#073E46", fontSize: "14px", fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-montserrat), system-ui, sans-serif", letterSpacing: "0.03em" };
const coralBtnStyleAuto: React.CSSProperties = { backgroundColor: "#FF6B4A", color: "#ffffff", border: "none", borderRadius: "8px", padding: "12px 20px", fontSize: "14px", fontWeight: 700, fontFamily: "var(--font-montserrat), system-ui, sans-serif", cursor: "pointer", letterSpacing: "0.03em" };
