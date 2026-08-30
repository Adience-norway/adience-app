"use client";

import { useState, useEffect, useCallback, useRef } from "react";
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
  type KursSporsmal,
  type Sendingslogg,
} from "@/lib/supabase";
import { ArenaProfilCard } from "@/components/ArenaProfilCard";
import { InfoTavleCard } from "@/components/InfoTavleCard";
import { HoldmusikkCard } from "@/components/HoldmusikkCard";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { geokodPoststed, useGeocoder } from "@/lib/geonorge";
import type { Dictionary, Locale } from "@/i18n/get-dictionary";

type MinSide = Dictionary["minSide"];

type MinArenaTilgang = { arena_id: string; rolle: "eier" | "operator"; arenanavn: string };
type ArenaTilgangRaw = { arena_id: string; rolle: "eier" | "operator"; arenaer: { arenanavn: string } | null };

// Ådience Demo skal stå helt fri -- samme unntak som HOLDMUSIKK_ARENAER i
// CastContent.tsx. Selve begrensningen håndheves i DB-triggeren
// enforce_arena_geofence_limits(), dette er kun for at UI-slideren for
// demoens (langt større) radius ikke skal se ødelagt/klippet ut.
const ADIENCE_DEMO_STREAM_ID = "ADCUGN1LDV4866127";

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

// Leser aktiv fane fra URL-hash ved første last, slik at en refresh (eller en
// delt lenke) beholder fanen du sto på i stedet for å alltid hoppe tilbake
// til Oversikt -- samme mønster som initialStreamIdFromUrl i CastContent.tsx.
function initialTabFromUrl(): Tab {
  if (typeof window === "undefined") return "oversikt";
  const hash = window.location.hash.replace("#", "");
  return (TAB_IDS as string[]).includes(hash) ? (hash as Tab) : "oversikt";
}

// ?start_checkout=event kommer fra emailRedirectTo i registrer/
// RegistrerPageContent.tsx sin enkeltarrangement-registrering -- signaliserer
// at Abonnement-seksjonen skal starte betaling for arrangementet automatisk
// ved første innlogging, uten et ekstra klikk.
function initialStartCheckoutPlanFromUrl(): "event" | null {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get("start_checkout") === "event" ? "event" : null;
}

type CheckoutResult = { status: "success" | "cancelled"; plan: "month" | "year" | "event" | null };

// Leser ?checkout=success|cancelled&plan=... som Stripe Checkout sender
// tilbake til (se success_url/cancel_url i /api/stripe/checkout). Vises som
// en feiringsmelding rett i Oversikt-fanen -- uten dette forsvinner en
// vellykket betaling sporløst inn i "bare en ny rad i en tabell", uten at
// eieren faktisk merker at noe nytt ble låst opp.
function initialCheckoutResultFromUrl(): CheckoutResult | null {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  const status = params.get("checkout");
  if (status !== "success" && status !== "cancelled") return null;
  const plan = params.get("plan");
  return { status, plan: plan === "month" || plan === "year" || plan === "event" ? plan : null };
}

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
  const [tab, setTab] = useState<Tab>(initialTabFromUrl);
  const [startCheckoutPlan] = useState<"event" | null>(initialStartCheckoutPlanFromUrl);
  const [checkoutResult, setCheckoutResult] = useState<CheckoutResult | null>(initialCheckoutResultFromUrl);
  useEffect(() => {
    if (!checkoutResult) return;
    // Fjerner checkout/plan fra URL-en med det samme, slik at en refresh ikke
    // viser feiringsmeldingen på nytt.
    const url = new URL(window.location.href);
    url.searchParams.delete("checkout");
    url.searchParams.delete("plan");
    window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
  }, [checkoutResult]);
  const [loading, setLoading] = useState(true);
  const [arena, setArena] = useState<Arena | null>(null);
  const [abonnement, setAbonnement] = useState<Abonnement | null>(null);
  const [pilot, setPilot] = useState<PilotPeriode | null>(null);
  const [arrangementer, setArrangementer] = useState<Arrangement[]>([]);
  const [speakerteam, setSpeakerteam] = useState<SpeakerTeam[]>([]);
  const [noArena, setNoArena] = useState(false);
  const [visningSomAdmin, setVisningSomAdmin] = useState(false);

  // En person kan ha tilgang til flere arenaer (arena_tilganger), med ulik
  // rolle per arena -- 'eier' er full tilgang, 'operator' er begrenset til
  // holdmusikk/infotavle/Media (håndhevet i databasen, se
  // enforce_operator_column_scope() og RLS-policyene på hver tabell). Denne
  // fanen speiler kun det -- ingen ny tilgang gis fra klienten.
  const [mineArenaer, setMineArenaer] = useState<MinArenaTilgang[]>([]);
  const [valgtArenaId, setValgtArenaId] = useState<string | null>(null);
  const [minRolle, setMinRolle] = useState<"eier" | "operator">("eier");
  // Speiler valgtArenaId slik at loadData() kan lese gjeldende valg uten å ha
  // det i dependency-arrayen -- ellers ville re-kall etter en lagring (uten
  // eksplisitt arena-id) hoppet tilbake til standardarenaen i stedet for å
  // bli værende på den man faktisk ser på.
  const valgtArenaIdRef = useRef<string | null>(null);

  // Admin-only override so Ådience staff can open any arena's Min side directly
  // from /admin (see ArenaDetailPanel's "Åpne Min side" link) without needing to
  // log in as that arena's owner. Read directly off window.location — this
  // component only ever mounts client-side (after the session check above), so
  // there's no SSR/hydration mismatch to worry about.
  const adminArenaId = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("admin_arena") : null;

  const loadData = useCallback(async (byttTilArenaId?: string) => {
    setLoading(true);

    let arenaId: string | null = null;
    let admin = false;

    const { data: tilgangerData } = await supabase
      .from("arena_tilganger")
      .select("arena_id, rolle, arenaer(arenanavn)")
      .eq("bruker_id", session.user.id);
    const mine = ((tilgangerData ?? []) as unknown as ArenaTilgangRaw[]).map(r => ({
      arena_id: r.arena_id, rolle: r.rolle, arenanavn: r.arenaer?.arenanavn ?? "—",
    }));
    setMineArenaer(mine);

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
    } else if (byttTilArenaId) {
      arenaId = byttTilArenaId;
    } else if (valgtArenaIdRef.current && mine.some(m => m.arena_id === valgtArenaIdRef.current)) {
      arenaId = valgtArenaIdRef.current;
    } else {
      arenaId = mine.find(m => m.rolle === "eier")?.arena_id ?? mine[0]?.arena_id ?? null;
    }

    if (!arenaId) {
      setNoArena(true);
      setLoading(false);
      return;
    }

    setVisningSomAdmin(admin);
    valgtArenaIdRef.current = arenaId;
    setValgtArenaId(arenaId);
    setMinRolle(admin ? "eier" : (mine.find(m => m.arena_id === arenaId)?.rolle ?? "eier"));

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

  // Operatør ser kun ArenaInfo (innhold i appen + holdmusikk) og Media --
  // Oversikt/Speakerteam/Statistikk er eier-only (abonnement, sertifisering,
  // sendingslogg). Hopper vekk fra en fane operatøren ikke skal se, f.eks.
  // fra en URL-hash arvet fra en tidligere eier-økt på samme nettleser.
  const synligeTabIds: Tab[] = visningSomAdmin || minRolle === "eier" ? TAB_IDS : (["arenainfo", "media"] as Tab[]);
  useEffect(() => {
    if (loading || synligeTabIds.includes(tab)) return;
    const fallback = synligeTabIds[0];
    setTab(fallback);
    window.history.replaceState(null, "", `#${fallback}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, minRolle]);

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
            {!visningSomAdmin && mineArenaer.length > 1 ? (
              <select
                value={valgtArenaId ?? ""}
                onChange={(e) => loadData(e.target.value)}
                style={{
                  backgroundColor: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "8px",
                  padding: "8px 12px", color: "#fff", fontSize: "13px", fontFamily: "var(--font-inter), system-ui, sans-serif", cursor: "pointer",
                }}
              >
                {mineArenaer.map((m) => (
                  <option key={m.arena_id} value={m.arena_id}>{m.arenanavn}</option>
                ))}
              </select>
            ) : (
              <span style={{ fontSize: "13px", color: "rgba(255,255,255,0.5)" }}>{arena?.arenanavn}</span>
            )}
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
          {synligeTabIds.map((id) => {
            const aktiv = tab === id;
            return (
              <button
                key={id}
                onClick={() => {
                  setTab(id);
                  // replaceState (ikke pushState) -- bytte fane skal ikke
                  // fylle opp historikken med ett tilbake-steg per klikk,
                  // bare sørge for at en refresh havner riktig sted.
                  window.history.replaceState(null, "", `#${id}`);
                }}
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
          <OversiktSection arena={arena} abonnement={abonnement} pilot={pilot} arrangementer={arrangementer} speakerteam={speakerteam} onChanged={loadData} dict={dict} locale={locale} startCheckoutPlan={startCheckoutPlan} checkoutResult={checkoutResult} onDismissCheckoutResult={() => setCheckoutResult(null)} />
        )}
        {tab === "arenainfo" && arena && (
          <ArenaInfoTab arena={arena} abonnement={abonnement} minRolle={minRolle} onChanged={loadData} dict={dict} locale={locale} />
        )}
        {tab === "speakerteam" && arena && (
          <SpeakerteamSection arenaId={arena.id} arena={arena} speakerteam={speakerteam} onChanged={loadData} dict={dict} locale={locale} />
        )}
        {tab === "statistikk" && arena && (
          <StatistikkSection arena={arena} dict={dict} locale={locale} />
        )}
        {tab === "media" && arena && <MediaSection arena={arena} dict={dict} locale={locale} />}
      </div>
    </div>
  );
}

/* ─── 1. OVERSIKT ─── */

function OversiktSection({
  arena, abonnement, pilot, arrangementer, speakerteam, onChanged, dict, locale, startCheckoutPlan, checkoutResult, onDismissCheckoutResult,
}: {
  arena: Arena; abonnement: Abonnement | null; pilot: PilotPeriode | null;
  arrangementer: Arrangement[]; speakerteam: SpeakerTeam[]; onChanged: () => void;
  dict: Dictionary; locale: Locale; startCheckoutPlan?: "event" | null;
  checkoutResult?: CheckoutResult | null; onDismissCheckoutResult?: () => void;
}) {
  const t = dict.minSide.oversikt;
  const dagerIgjen = pilot ? Math.max(0, Math.ceil((new Date(pilot.slutt_dato).getTime() - Date.now()) / 86_400_000)) : null;
  const kommendeArrangementer = arrangementer.filter((a) => a.start_tid && new Date(a.start_tid) > new Date());
  const sertifiserte = speakerteam.filter((s) => s.sertifisert).length;

  return (
    <div>
      {checkoutResult?.status === "success" && (
        <div style={{
          ...cardStyle, marginBottom: "24px",
          border: "1.5px solid #33D3C4", backgroundColor: "rgba(51,211,196,0.08)",
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px", flexWrap: "wrap" as const,
        }}>
          <p style={{ color: "#fff", fontSize: "15px", lineHeight: 1.6, margin: 0 }}>
            {checkoutResult.plan === "month" && `🎉 ${t.checkoutSuccessMonth}`}
            {checkoutResult.plan === "year" && `🎉 ${t.checkoutSuccessYear}`}
            {checkoutResult.plan === "event" && `✅ ${t.checkoutSuccessEvent}`}
            {!checkoutResult.plan && `✅ ${t.checkoutSuccessGeneric}`}
          </p>
          <button onClick={onDismissCheckoutResult} style={{ ...ghostBtnStyle, flexShrink: 0 }}>{t.checkoutSuccessClose}</button>
        </div>
      )}
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

      <div style={{ ...cardStyle, marginTop: "24px" }}>
        <h3 style={{ ...sectionHeadingStyle, marginBottom: "4px" }}>{dict.cards.arenaProfil.heading}</h3>
        <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "13px", marginBottom: "20px" }}>
          {dict.cards.arenaProfil.subtitle}
        </p>
        <ArenaProfilCard arena={arena} onSaved={onChanged} embedded dict={dict} locale={locale} />
      </div>

      <div style={{ marginTop: "24px" }}>
        <AbonnementSection arenaId={arena.id} abonnement={abonnement} pilot={pilot} dict={dict} locale={locale} autoStartPlan={startCheckoutPlan} />
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

function StatistikkSection({ arena, dict, locale }: { arena: Arena; dict: Dictionary; locale: Locale }) {
  const t = dict.minSide.statistikk;
  const dateLocale = locale === "en" ? "en-GB" : "no-NO";
  const [logg, setLogg] = useState<Sendingslogg[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLogg = useCallback(async () => {
    if (!arena.stream_id) { setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase
      .from("sendingslogg")
      .select("*")
      .eq("stream_id", arena.stream_id)
      .order("startet_at", { ascending: false })
      .limit(50);
    setLogg(data ?? []);
    setLoading(false);
  }, [arena.stream_id]);

  useEffect(() => { fetchLogg(); }, [fetchLogg]);

  function varighet(startetAt: string, avsluttetAt: string | null): string {
    const start = new Date(startetAt).getTime();
    const slutt = avsluttetAt ? new Date(avsluttetAt).getTime() : Date.now();
    const minutter = Math.max(0, Math.round((slutt - start) / 60000));
    if (minutter < 60) return `${minutter} min`;
    return `${Math.floor(minutter / 60)}t ${minutter % 60}min`;
  }

  return (
    <div>
      <div style={{ ...cardStyle, marginBottom: "24px" }}>
        <h3 style={{ ...sectionHeadingStyle, marginBottom: "4px" }}>{t.introTitle}</h3>
        <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "13px", lineHeight: 1.6 }}>{t.introText}</p>
      </div>

      {!loading && (
        logg.length === 0 ? (
          <div style={{ ...cardStyle, ...emptyStyle }}>{t.emptyState}</div>
        ) : (
          <table style={tableStyle}>
            <thead><tr style={theadRowStyle}>
              <th style={thStyle}>{t.thStart}</th>
              <th style={thStyle}>{t.thSlutt}</th>
              <th style={thStyle}>{t.thVarighet}</th>
            </tr></thead>
            <tbody>
              {logg.map((s) => (
                <tr key={s.id}>
                  <td style={tdStyle}>{new Date(s.startet_at).toLocaleString(dateLocale)}</td>
                  <td style={tdStyle}>
                    {s.avsluttet_at ? new Date(s.avsluttet_at).toLocaleString(dateLocale) : (
                      <span style={{ color: "#33D3C4", fontWeight: 600 }}>{t.pagaende}</span>
                    )}
                  </td>
                  <td style={tdStyle}>{varighet(s.startet_at, s.avsluttet_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )
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
function ArenaInfoTab({
  arena, abonnement, minRolle, onChanged, dict, locale,
}: { arena: Arena; abonnement: Abonnement | null; minRolle: "eier" | "operator"; onChanged: () => void; dict: Dictionary; locale: Locale }) {
  const t = dict.minSide.arenaInfo;
  return (
    <div>
      <div style={cardStyle}>
        <h3 style={{ ...sectionHeadingStyle, marginBottom: "4px" }}>{t.contentTitle}</h3>
        <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "13px", marginBottom: "20px" }}>{t.contentSubtitle}</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "24px" }}>
          <div>
            <h4 style={{ fontFamily: "var(--font-inter), system-ui, sans-serif", fontWeight: 600, fontSize: "14px", color: "#fff", marginBottom: "4px" }}>
              {dict.cards.infoTavle.heading}
            </h4>
            <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "12px", marginBottom: "16px" }}>{dict.cards.infoTavle.subtitle}</p>
            <InfoTavleCard arenaId={arena.id} embedded dict={dict} locale={locale} />
          </div>
          <div>
            <h4 style={{ fontFamily: "var(--font-inter), system-ui, sans-serif", fontWeight: 600, fontSize: "14px", color: "#fff", marginBottom: "4px" }}>
              {dict.cards.holdmusikk.heading}
            </h4>
            <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "12px", marginBottom: "16px" }}>{dict.cards.holdmusikk.subtitle}</p>
            <HoldmusikkCard arena={arena} onSaved={onChanged} embedded dict={dict} />
          </div>
        </div>
      </div>

      {minRolle === "eier" ? (
        <>
          <div style={{ marginTop: "24px" }}>
            <ArenaInfoSection arena={arena} onSaved={onChanged} dict={dict} />
          </div>
          {abonnement?.type === "engangsarrangement" && abonnement.status === "aktiv" && (
            <div style={{ marginTop: "24px" }}>
              <EnkeltarrangementSeksjon abonnement={abonnement} onChanged={onChanged} dict={dict} />
            </div>
          )}
          <div style={{ marginTop: "24px" }}>
            <GeofenceKartSection arena={arena} abonnement={abonnement} onSaved={onChanged} dict={dict} />
          </div>
        </>
      ) : (
        <p style={{ color: "rgba(255,255,255,0.3)", fontSize: "12px", marginTop: "16px" }}>{t.operatorHint}</p>
      )}
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

type LatLng = { lat: number; lng: number };

// Vises kun mens arenaen har en aktiv engangsarrangement-rad (betalt via
// /api/stripe/checkout). Eieren velger arrangementsdato her, og setter selv
// opp dekningsområdet i geofence-seksjonen rett under -- taket der løftes
// automatisk fra 500 til 1000 m mens denne raden er aktiv (se
// enforce_arena_geofence_limits i databasen). Ingen automatisk
// tilbakestilling: eieren endrer selv geofencen tilbake når arrangementet er
// over.
function EnkeltarrangementSeksjon({ abonnement, onChanged, dict }: { abonnement: Abonnement; onChanged: () => void; dict: Dictionary }) {
  const t = dict.minSide.arenaInfo;
  const [dato, setDato] = useState(abonnement.event_dato ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  async function handleSave() {
    setSaving(true);
    setError("");
    const { error } = await supabase.from("abonnementer").update({ event_dato: dato || null }).eq("id", abonnement.id);
    setSaving(false);
    if (error) { setError(error.message); return; }
    setSaved(true);
    onChanged();
    setTimeout(() => setSaved(false), 3000);
  }

  return (
    <div style={{ ...cardStyle, border: "1.5px solid #33D3C4" }}>
      <h3 style={{ ...sectionHeadingStyle, marginBottom: "4px" }}>{t.eventTitle}</h3>
      <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "13px", lineHeight: 1.6, marginBottom: "20px" }}>
        {t.eventSubtitle}
      </p>
      <label style={fieldLabelStyle}>{t.eventDateLabel}</label>
      <input
        type="date"
        value={dato}
        onChange={(e) => setDato(e.target.value)}
        style={{ ...inputStyle, maxWidth: "220px" }}
      />
      {error && <p style={{ color: "#D94F4F", fontSize: "13px", marginTop: "12px" }}>{error}</p>}
      {saved && <p style={{ color: "#33D3C4", fontSize: "13px", marginTop: "12px" }}>{t.eventDateSaved}</p>}
      <button
        onClick={handleSave}
        disabled={saving || dato === (abonnement.event_dato ?? "")}
        style={{ ...tealBtnStyle, marginTop: "16px", opacity: (saving || dato === (abonnement.event_dato ?? "")) ? 0.5 : 1 }}
      >
        {saving ? t.saving : t.eventDateSave}
      </button>
      <p style={{ color: "rgba(255,255,255,0.35)", fontSize: "12px", marginTop: "16px", lineHeight: 1.5 }}>
        {t.eventTonoNote}
      </p>
    </div>
  );
}

function GeofenceKartSection({ arena, abonnement, onSaved, dict }: { arena: Arena; abonnement: Abonnement | null; onSaved: () => void; dict: Dictionary }) {
  const t = dict.minSide.geofence;
  const erDemo = arena.stream_id === ADIENCE_DEMO_STREAM_ID;
  // Aktivt enkeltarrangement løfter selvbetjent-taket fra 500 til 1000 m --
  // håndhevet i databasen (enforce_arena_geofence_limits), speilet her kun
  // for at UI-sliderens grense stemmer med det som faktisk er lov å lagre.
  const harAktivtArrangement = abonnement?.type === "engangsarrangement" && abonnement.status === "aktiv";
  const radiusMax = erDemo ? 2000 : harAktivtArrangement ? 1000 : 500;
  // Selvbetjent polygon-tegning er en abonnementsfordel -- kunden kan da selv
  // spore opp den nøyaktige konturen på egen arena (f.eks. Wimbledon, Old
  // Trafford) og verifisere at dekningen ikke lekker utenfor. Uten aktivt
  // abonnement vises en ev. admin-tegnet polygon fortsatt kun skrivebeskyttet.
  const erAbonnent = abonnement?.status === "aktiv";

  const [localRadius, setLocalRadius] = useState(arena.geofence_radius ?? 300);
  const [pendingLat, setPendingLat] = useState<number | null>(null);
  const [pendingLng, setPendingLng] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const [geofenceMode, setGeofenceMode] = useState<"sirkel" | "polygon">(
    erAbonnent && arena.geofence_type === "polygon" ? "polygon" : "sirkel"
  );
  const [polygonPoints, setPolygonPoints] = useState<LatLng[]>(
    Array.isArray(arena.geofence_polygon) ? (arena.geofence_polygon as LatLng[]) : []
  );
  const [polygonSaving, setPolygonSaving] = useState(false);
  const [polygonSaved, setPolygonSaved] = useState(false);
  const [polygonError, setPolygonError] = useState("");

  const harEndring = pendingLat !== null || localRadius !== (arena.geofence_radius ?? 300);

  async function handleSave() {
    setSaving(true);
    setError("");
    const patch: { geofence_radius: number; lat?: number; lng?: number; geofence_type: "sirkel" } = { geofence_radius: localRadius, geofence_type: "sirkel" };
    if (pendingLat !== null && pendingLng !== null) { patch.lat = pendingLat; patch.lng = pendingLng; }
    const { error } = await supabase.from("arenaer").update(patch).eq("id", arena.id);
    setSaving(false);
    if (error) { setError(error.message); return; }
    setPendingLat(null); setPendingLng(null);
    setSaved(true); onSaved(); setTimeout(() => setSaved(false), 3000);
  }

  async function handleSavePolygon() {
    if (polygonPoints.length < 3) { setPolygonError(t.polygonMinPointsError); return; }
    setPolygonSaving(true);
    setPolygonError("");
    const { error } = await supabase
      .from("arenaer")
      .update({ geofence_type: "polygon", geofence_polygon: polygonPoints })
      .eq("id", arena.id);
    setPolygonSaving(false);
    if (error) { setPolygonError(error.message); return; }
    setPolygonSaved(true); onSaved(); setTimeout(() => setPolygonSaved(false), 3000);
  }

  if (!arena.lat || !arena.lng) {
    return <ManuellPosisjon arena={arena} onSaved={onSaved} dict={dict} />;
  }

  // Uten aktivt abonnement: en ev. admin-tegnet polygon vises kun
  // skrivebeskyttet her, som før. Ingen lagre-knapp, så et tilfeldig klikk i
  // kartet har ingen effekt -- forsvinner ved neste innlasting.
  if (!erAbonnent && arena.geofence_type === "polygon" && Array.isArray(arena.geofence_polygon)) {
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
        {erAbonnent ? t.subscriberSubtitle : t.subtitle}
      </p>

      {erAbonnent && (
        <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
          <button
            type="button"
            onClick={() => setGeofenceMode("sirkel")}
            style={{
              border: geofenceMode === "sirkel" ? "1.5px solid #33D3C4" : "1px solid rgba(255,255,255,0.12)",
              backgroundColor: geofenceMode === "sirkel" ? "rgba(51,211,196,0.1)" : "rgba(255,255,255,0.04)",
              color: geofenceMode === "sirkel" ? "#33D3C4" : "rgba(255,255,255,0.5)",
              borderRadius: "8px", padding: "8px 14px", fontSize: "13px", cursor: "pointer",
              fontFamily: "var(--font-inter), system-ui, sans-serif",
            }}
          >
            {t.modeSirkel}
          </button>
          <button
            type="button"
            onClick={() => setGeofenceMode("polygon")}
            style={{
              border: geofenceMode === "polygon" ? "1.5px solid #33D3C4" : "1px solid rgba(255,255,255,0.12)",
              backgroundColor: geofenceMode === "polygon" ? "rgba(51,211,196,0.1)" : "rgba(255,255,255,0.04)",
              color: geofenceMode === "polygon" ? "#33D3C4" : "rgba(255,255,255,0.5)",
              borderRadius: "8px", padding: "8px 14px", fontSize: "13px", cursor: "pointer",
              fontFamily: "var(--font-inter), system-ui, sans-serif",
            }}
          >
            {t.modePolygon}
          </button>
        </div>
      )}

      {geofenceMode === "polygon" ? (
        <>
          <div style={{ height: "360px", borderRadius: "10px", overflow: "hidden", marginBottom: "16px" }}>
            <GeofenceMap
              lat={arena.lat}
              lng={arena.lng}
              initialPoints={polygonPoints}
              onChange={setPolygonPoints}
            />
          </div>
          <p style={{ color: "rgba(255,255,255,0.35)", fontSize: "12px", marginBottom: "16px" }}>
            {t.polygonMaxHint}
          </p>
          {polygonError && <p style={{ color: "#D94F4F", fontSize: "13px", marginBottom: "12px" }}>{polygonError}</p>}
          {polygonSaved && <p style={{ color: "#33D3C4", fontSize: "13px", marginBottom: "12px" }}>{t.saved}</p>}
          <button onClick={handleSavePolygon} disabled={polygonSaving} style={{ ...tealBtnStyle, opacity: polygonSaving ? 0.5 : 1 }}>
            {polygonSaving ? t.saving : t.polygonSaveButton}
          </button>
        </>
      ) : (
        <>
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
            type="range" min={50} max={radiusMax} step={10}
            value={localRadius}
            onChange={(e) => setLocalRadius(Number(e.target.value))}
            style={{ width: "100%", accentColor: "#33D3C4", cursor: "pointer" }}
          />
          {!erDemo && (
            <p style={{ color: "rgba(255,255,255,0.35)", fontSize: "12px", marginTop: "8px" }}>
              {harAktivtArrangement ? t.radiusMaxHintArrangement : t.radiusMaxHint}
            </p>
          )}
          {error && <p style={{ color: "#D94F4F", fontSize: "13px", marginTop: "12px" }}>{error}</p>}
          {saved && <p style={{ color: "#33D3C4", fontSize: "13px", marginTop: "12px" }}>{t.saved}</p>}
          <button onClick={handleSave} disabled={saving || !harEndring} style={{ ...tealBtnStyle, marginTop: "16px", opacity: (saving || !harEndring) ? 0.5 : 1 }}>
            {saving ? t.saving : t.saveButton}
          </button>
        </>
      )}
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

  const [tilgangEposter, setTilgangEposter] = useState<Set<string>>(new Set());
  const [girTilgangId, setGirTilgangId] = useState<string | null>(null);
  const [tilgangFeil, setTilgangFeil] = useState("");

  useEffect(() => {
    supabase.from("kurs_moduler").select("*").order("rekkefolge", { ascending: true })
      .then(({ data }) => setModuler(data ?? []));
  }, []);

  const fetchTilganger = useCallback(async () => {
    const { data } = await supabase
      .from("arena_tilganger")
      .select("brukere(epost)")
      .eq("arena_id", arenaId);
    const rader = (data ?? []) as unknown as { brukere: { epost: string } | null }[];
    setTilgangEposter(new Set(rader.map(r => r.brukere?.epost?.toLowerCase()).filter((e): e is string => !!e)));
  }, [arenaId]);

  useEffect(() => { fetchTilganger(); }, [fetchTilganger]);

  // Sertifisering (fullført Speakerteam-kurs) er forutsetningen -- eieren
  // trykker selv "Gi tilgang" for å faktisk aktivere den, se
  // /api/inviter-operator. Oppretter kontoen (invitasjon) hvis personen ikke
  // har logget inn før, ellers gis tilgangen direkte.
  async function handleGiTilgang(s: SpeakerTeam) {
    setGirTilgangId(s.id);
    setTilgangFeil("");
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData.session?.access_token;
    if (!accessToken) {
      setGirTilgangId(null);
      setTilgangFeil(t.tilgangMissingSession);
      return;
    }
    const res = await fetch("/api/inviter-operator", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ epost: s.epost, fornavn: s.fornavn, etternavn: s.etternavn, arenaId, locale }),
    });
    const data = await res.json();
    setGirTilgangId(null);
    if (!res.ok) { setTilgangFeil(data.error ?? t.tilgangGenericError); return; }
    fetchTilganger();
  }

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
      <div style={cardStyle}>
        <h3 style={{ ...sectionHeadingStyle, marginBottom: "4px" }}>{t.introTitle}</h3>
        <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.4)", marginBottom: "16px", lineHeight: 1.6 }}>
          {t.introText}
        </p>
        <div style={toolbarStyle}>
          <span style={{ color: "rgba(255,255,255,0.5)", fontSize: "14px" }}>{speakerteam.length} {t.countSuffix}</span>
          <button onClick={() => setShowForm((v) => !v)} style={tealBtnStyle}>
            {showForm ? t.cancel : t.addSpeaker}
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleAdd} style={{ backgroundColor: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "10px", padding: "16px", marginBottom: "24px", display: "flex", gap: "12px", flexWrap: "wrap" as const, alignItems: "flex-end" }}>
            <div><label style={fieldLabelStyle}>{t.fieldFornavn}</label><input required value={fornavn} onChange={(e) => setFornavn(e.target.value)} style={inputStyle} /></div>
            <div><label style={fieldLabelStyle}>{t.fieldEtternavn}</label><input required value={etternavn} onChange={(e) => setEtternavn(e.target.value)} style={inputStyle} /></div>
            <div><label style={fieldLabelStyle}>{t.fieldEpost}</label><input type="email" required value={epost} onChange={(e) => setEpost(e.target.value)} style={inputStyle} /></div>
            <div><label style={fieldLabelStyle}>{t.fieldRolle}</label><input value={rolle} onChange={(e) => setRolle(e.target.value)} style={inputStyle} /></div>
            <button type="submit" disabled={saving} style={tealBtnStyle}>{saving ? t.saving : t.addButton}</button>
          </form>
        )}

        {speakerteam.length === 0 ? (
          <div style={emptyStyle}>{t.emptyState}</div>
        ) : (
          <table style={tableStyle}>
            <thead><tr style={theadRowStyle}>
              <th style={thStyle}>{t.thName}</th><th style={thStyle}>{t.thEmail}</th><th style={thStyle}>{t.thRolle}</th><th style={thStyle}>{t.thProgress}</th><th style={thStyle}>{t.thCertified}</th><th style={thStyle}>{t.thTilgang}</th><th style={thStyle} />
            </tr></thead>
            <tbody>
              {speakerteam.map((s) => {
                const harTilgang = !!s.epost && tilgangEposter.has(s.epost.toLowerCase());
                return (
                  <tr key={s.id}>
                    <td style={tdStyle}>{s.fornavn} {s.etternavn}</td>
                    <td style={tdStyle}>{s.epost}</td>
                    <td style={tdStyle}>{s.rolle ?? "—"}</td>
                    <td style={tdStyle}>{s.fullforte_moduler.length} / {moduler.length}</td>
                    <td style={tdStyle}>{s.sertifisert ? <span style={{ color: "#33D3C4" }}>{t.certifiedLabel}</span> : "—"}</td>
                    <td style={tdStyle}>
                      {harTilgang ? (
                        <span style={{ color: "#33D3C4", fontSize: "13px" }}>{t.tilgangGitt}</span>
                      ) : s.sertifisert && s.epost ? (
                        <button onClick={() => handleGiTilgang(s)} disabled={girTilgangId === s.id} style={{ ...ghostBtnStyle, padding: "6px 10px" }}>
                          {girTilgangId === s.id ? t.girTilgang : t.giTilgangButton}
                        </button>
                      ) : "—"}
                    </td>
                    <td style={tdStyle}>
                      <button onClick={() => handleDelete(s.id)} disabled={sletter === s.id} style={{ ...ghostBtnStyle, padding: "6px 10px", color: "#D94F4F" }}>
                        {t.deleteButton}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
        {tilgangFeil && <p style={{ color: "#D94F4F", fontSize: "13px", marginTop: "12px" }}>{tilgangFeil}</p>}
      </div>

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

// Enkel, merkevaretro illustrasjon (samme petrol/korall-språk som
// sertifikat-seglet) for det tomme "0 speakere"-øyeblikket i Kursmoduler --
// en arenabue med tre teammedlemmer og en lydbølge, i stedet for en tom
// grå boks, slik at det inviterer til å legge til det første teammedlemmet.
function KursHeroIllustrasjon() {
  return (
    <svg viewBox="0 0 280 110" width="220" height="86" style={{ margin: "0 auto", display: "block" }} xmlns="http://www.w3.org/2000/svg">
      <path d="M20 95 Q140 35 260 95" stroke="#33D3C4" strokeWidth="2" fill="none" opacity="0.35" />
      <path d="M40 95 Q140 50 240 95" stroke="#33D3C4" strokeWidth="1.5" fill="none" opacity="0.2" />
      <circle cx="90" cy="55" r="10" fill="#FF6B4A" opacity="0.85" />
      <circle cx="140" cy="40" r="12" fill="#33D3C4" opacity="0.9" />
      <circle cx="190" cy="55" r="10" fill="#FF6B4A" opacity="0.85" />
      <rect x="136.5" y="12" width="3" height="16" rx="1.5" fill="#33D3C4" />
      <rect x="128" y="17" width="3" height="11" rx="1.5" fill="#33D3C4" opacity="0.6" />
      <rect x="145" y="17" width="3" height="11" rx="1.5" fill="#33D3C4" opacity="0.6" />
    </svg>
  );
}

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

function SporsmalKomponent({ sporsmal, riktig, onRiktig, t }: {
  sporsmal: KursSporsmal; riktig: boolean; onRiktig: () => void; t: Dictionary["minSide"]["kurs"];
}) {
  const [valgtFeil, setValgtFeil] = useState<number | null>(null);

  function velg(i: number) {
    if (riktig) return;
    if (i === sporsmal.riktig_svar) {
      setValgtFeil(null);
      onRiktig();
    } else {
      setValgtFeil(i);
    }
  }

  return (
    <div style={{ backgroundColor: "rgba(255,255,255,0.03)", border: `1px solid ${riktig ? "rgba(51,211,196,0.3)" : "rgba(255,255,255,0.08)"}`, borderRadius: "10px", padding: "16px 18px" }}>
      <p style={{ fontSize: "14px", fontWeight: 600, marginBottom: "10px" }}>{sporsmal.sporsmal}</p>
      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
        {sporsmal.alternativer.map((alt, i) => {
          const erRiktigValgt = riktig && i === sporsmal.riktig_svar;
          const erFeilValgt = !riktig && valgtFeil === i;
          return (
            <button
              key={i}
              onClick={() => velg(i)}
              disabled={riktig}
              style={{
                textAlign: "left" as const, padding: "10px 12px", borderRadius: "8px",
                border: erRiktigValgt ? "1px solid #33D3C4" : erFeilValgt ? "1px solid #D94F4F" : "1px solid rgba(255,255,255,0.1)",
                backgroundColor: erRiktigValgt ? "rgba(51,211,196,0.1)" : erFeilValgt ? "rgba(217,79,79,0.1)" : "rgba(255,255,255,0.03)",
                color: erRiktigValgt ? "#33D3C4" : erFeilValgt ? "#D94F4F" : "rgba(255,255,255,0.8)",
                fontSize: "13px", cursor: riktig ? "default" : "pointer",
              }}
            >
              {alt}
            </button>
          );
        })}
      </div>
      {riktig && sporsmal.forklaring && (
        <p style={{ color: "#33D3C4", fontSize: "13px", marginTop: "10px", marginBottom: 0 }}>✓ {sporsmal.forklaring}</p>
      )}
      {!riktig && valgtFeil !== null && (
        <p style={{ color: "#FF6B4A", fontSize: "13px", marginTop: "10px", marginBottom: 0 }}>
          {t.sporsmalFeilPrefix} {sporsmal.forklaring}
        </p>
      )}
    </div>
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
  const [sporsmal, setSporsmal] = useState<KursSporsmal[]>([]);
  const [bekreftet, setBekreftet] = useState(false);
  // Riktig-status per spørsmål-id -- true kun når det er svart RIKTIG. Feil
  // svar nullstiller ikke de andre spørsmålene, og et spørsmål kan besvares
  // på nytt til det blir riktig (ikke låst etter første forsøk).
  const [riktigSvart, setRiktigSvart] = useState<Record<string, boolean>>({});

  // Nullstill avkrysning/svar når speaker eller modul endres, slik at det
  // faktisk må gjøres på nytt for HVER modul — ikke bare klikkes/svares én
  // gang totalt.
  useEffect(() => { setBekreftet(false); setRiktigSvart({}); }, [selected?.id, gjeldendeModul?.id]);

  useEffect(() => {
    if (!gjeldendeModul) { setSporsmal([]); return; }
    let avbrutt = false;
    supabase
      .from("kurs_sporsmal")
      .select("*")
      .eq("modul_id", gjeldendeModul.id)
      .eq("sprak", locale)
      .order("rekkefolge", { ascending: true })
      .then(({ data }) => { if (!avbrutt) setSporsmal(data ?? []); });
    return () => { avbrutt = true; };
  }, [gjeldendeModul?.id, locale]);

  const kanGaVidere = sporsmal.length > 0
    ? sporsmal.every(s => riktigSvart[s.id])
    : bekreftet;

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
    return (
      <div style={{ ...cardStyle, textAlign: "center" as const, padding: "48px 24px" }}>
        <KursHeroIllustrasjon />
        <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "14px", marginTop: "20px" }}>{t.emptyState}</p>
      </div>
    );
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
              {sporsmal.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginBottom: "16px" }}>
                  {sporsmal.map(s => (
                    <SporsmalKomponent
                      key={s.id}
                      sporsmal={s}
                      riktig={!!riktigSvart[s.id]}
                      onRiktig={() => setRiktigSvart(prev => ({ ...prev, [s.id]: true }))}
                      t={t}
                    />
                  ))}
                </div>
              ) : (
                <label style={{ display: "flex", alignItems: "flex-start", gap: "10px", marginBottom: "16px", fontSize: "14px", color: "rgba(255,255,255,0.7)", cursor: "pointer" }}>
                  <input type="checkbox" checked={bekreftet} onChange={(e) => setBekreftet(e.target.checked)} style={{ marginTop: "3px" }} />
                  {t.confirmCheckbox}
                </label>
              )}
              <button onClick={advance} disabled={!kanGaVidere} style={{ ...tealBtnStyle, opacity: kanGaVidere ? 1 : 0.4, cursor: kanGaVidere ? "pointer" : "not-allowed" }}>{t.nextModuleButton}</button>
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
  const [sender, setSender] = useState<"speakerteam" | "meg-selv" | null>(null);
  const [sendtMal, setSendtMal] = useState<"speakerteam" | "meg-selv" | null>(null);
  const [sendFeil, setSendFeil] = useState("");

  async function handleSendStreamInfo(mal: "speakerteam" | "meg-selv") {
    setSender(mal);
    setSendFeil("");
    setSendtMal(null);
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData.session?.access_token;
    try {
      const res = await fetch("/api/send-stream-info", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ arenaId: arena.id, mal, locale }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? t.sendError);
      setSendtMal(mal);
      setTimeout(() => setSendtMal(null), 4000);
    } catch (err) {
      setSendFeil(err instanceof Error ? err.message : t.sendError);
    } finally {
      setSender(null);
    }
  }
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
  // Alle fire finnes nå i en engelsk variant også (samme filnavn + "-en"
  // suffiks) -- engelsk visning laster automatisk ned den engelske PDF-en.
  const pdfSuffix = locale === "en" ? "-en.pdf" : ".pdf";
  const pdfKort = [
    { fil: `slik-bruker-du-adience${pdfSuffix}`, tittel: t.pdfCard1.title, beskrivelse: t.pdfCard1.desc },
    { fil: `inspirasjon-ansatte-sikkerhet${pdfSuffix}`, tittel: t.pdfCard2.title, beskrivelse: t.pdfCard2.desc },
    { fil: `speakerteam-guide${pdfSuffix}`, tittel: t.pdfCardSpeakerteam.title, beskrivelse: t.pdfCardSpeakerteam.desc },
    { fil: `castingvinduet-guide${pdfSuffix}`, tittel: t.pdfCardCasting.title, beskrivelse: t.pdfCardCasting.desc },
    { fil: `sponsor-partner-speakerteam${pdfSuffix}`, tittel: t.pdfCardSponsor.title, beskrivelse: t.pdfCardSponsor.desc },
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
      {!arena.stream_id ? (
        <div style={cardStyle}>
          <h3 style={{ ...sectionHeadingStyle, marginBottom: "4px" }}>{t.qrTitlePrefix} {arena.arenanavn}</h3>
          <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.5)" }}>
            {t.noStreamId}
          </p>
        </div>
      ) : (
        <>
          {/* Stream-ID + direkte lenke til castingverktøyet — dette er det
              arenaens EGET personale (den som skal sende) trenger, ikke
              publikum (publikum bruker QR-kodene under). Egen ramme,
              adskilt fra QR-seksjonen under, siden det er to helt
              forskjellige funksjoner — samme kort-mønster som
              Informasjonsmateriell. ID-en er permanent — den slutter aldri å
              eksistere, uavhengig av abonnement/pilotperiode; kun selve
              muligheten til å faktisk starte en sending kan bli stengt da.
              Cast-lenken forhåndsfyller ID-en på castingsiden (se
              initialStreamIdFromUrl i CastContent.tsx), så personalet
              slipper å skrive den inn selv. Åpne-knappen er korall/rød —
              den åpner et ekte, live sendingsverktøy, så den fortjener mer
              visuell tyngde enn en nøytral ghost-knapp. */}
          <div style={cardStyle}>
            <h3 style={{ ...sectionHeadingStyle, marginBottom: "4px" }}>{t.castToolTitle}</h3>
            <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.4)", marginBottom: "16px" }}>
              {t.castToolHelp}
            </p>
            <div style={{ backgroundColor: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "10px", padding: "16px 20px", display: "flex", flexDirection: "column" as const, gap: "14px" }}>
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
                style={{ ...coralBtnStyleAuto, textDecoration: "none", textAlign: "center" as const, display: "block" }}
              >
                {t.openCastTool}
              </a>
            </div>
          </div>

          {/* Send stream-ID + passord + QR (samme innhold som kortet over)
              rett til speakerteamets registrerte e-poster, eller til deg
              selv -- så man slipper å kopiere/lime inn manuelt. */}
          <div style={cardStyle}>
            <h3 style={{ ...sectionHeadingStyle, marginBottom: "4px" }}>{t.sendInfoTitle}</h3>
            <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.4)", marginBottom: "16px" }}>
              {t.sendInfoHelp}
            </p>
            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" as const, alignItems: "center" }}>
              <button
                onClick={() => handleSendStreamInfo("speakerteam")}
                disabled={sender !== null}
                style={{ ...coralBtnStyleAuto, opacity: sender !== null ? 0.6 : 1 }}
              >
                {sender === "speakerteam" ? t.sending : sendtMal === "speakerteam" ? t.sentOk : t.sendToSpeakerteam}
              </button>
              <button
                onClick={() => handleSendStreamInfo("meg-selv")}
                disabled={sender !== null}
                style={{ ...ghostBtnStyle, opacity: sender !== null ? 0.6 : 1 }}
              >
                {sender === "meg-selv" ? t.sending : sendtMal === "meg-selv" ? t.sentOk : t.sendToSelf}
              </button>
            </div>
            {sendFeil && <p style={{ fontSize: "13px", color: "#D94F4F", marginTop: "12px" }}>{sendFeil}</p>}
          </div>

          {/* QR-forklaringen sitter nå rett over selve QR-kortene den
              faktisk beskriver, i egen ramme, i stedet for over Stream-ID/
              passord-boksen (som er en helt annen funksjon). Plakaten er nå
              et fjerde kort i samme grid som QR-kodene, samme størrelse og
              stil, i stedet for en bred stripe som brøt rytmen. */}
          <div style={cardStyle}>
            <h3 style={{ ...sectionHeadingStyle, marginBottom: "4px" }}>{t.qrTitlePrefix} {arena.arenanavn}</h3>
            <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.4)", marginBottom: "16px" }}>
              {t.qrHelpText}
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "16px" }}>
              {qrKort.map((k) => (
                <div key={k.fil} style={{ backgroundColor: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "10px", padding: "20px", textAlign: "center" }}>
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
                  <div style={{ fontFamily: "var(--font-montserrat), system-ui, sans-serif", fontWeight: 600, fontSize: "14px", marginBottom: "4px" }}>{k.tittel}</div>
                  <p style={{ fontSize: "12.5px", color: "rgba(255,255,255,0.4)", lineHeight: 1.5, marginBottom: "14px" }}>{k.beskrivelse}</p>
                  {k.data && (
                    <a href={k.data} download={k.fil} style={{ ...tealBtnStyle, display: "block", textDecoration: "none", textAlign: "center" }}>
                      {t.downloadPng}
                    </a>
                  )}
                </div>
              ))}
              <div style={{ backgroundColor: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "10px", padding: "20px", textAlign: "center" }}>
                <div style={{ backgroundColor: "#ffffff", borderRadius: "10px", padding: "12px", marginBottom: "14px", display: "inline-block", minWidth: "140px", minHeight: "140px" }}>
                  {qrAdience ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={qrAdience} alt={t.posterCardTitle} style={{ width: "140px", height: "140px", display: "block" }} />
                  ) : (
                    <div style={{ width: "140px", height: "140px", display: "flex", alignItems: "center", justifyContent: "center", color: "#073E46", fontSize: "12px" }}>
                      {genererer ? t.generating : "—"}
                    </div>
                  )}
                </div>
                <div style={{ fontFamily: "var(--font-montserrat), system-ui, sans-serif", fontWeight: 600, fontSize: "14px", marginBottom: "4px" }}>{t.posterCardTitle}</div>
                <p style={{ fontSize: "12.5px", color: "rgba(255,255,255,0.4)", lineHeight: 1.5, marginBottom: "14px" }}>{t.posterCardDesc}</p>
                <button onClick={printPoster} disabled={!qrAdience} style={{ ...tealBtnStyle, width: "100%", opacity: qrAdience ? 1 : 0.5 }}>
                  {t.printPoster}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      <div style={cardStyle}>
        <h3 style={{ ...sectionHeadingStyle, marginBottom: "4px" }}>{t.materialTitle}</h3>
        <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.4)", marginBottom: "16px" }}>
          {t.materialSubtitle}
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "16px" }}>
          {pdfKort.map((k) => (
            <div key={k.fil} style={{ backgroundColor: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "10px", padding: "20px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontFamily: "var(--font-montserrat), system-ui, sans-serif", fontWeight: 600, fontSize: "14px", marginBottom: "6px" }}>{k.tittel}</div>
                <p style={{ fontSize: "12.5px", color: "rgba(255,255,255,0.4)", lineHeight: 1.5, marginBottom: "16px" }}>{k.beskrivelse}</p>
              </div>
              <a href={`/media/${k.fil}`} download style={{ ...tealBtnStyle, display: "block", textDecoration: "none", textAlign: "center" }}>
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

function AbonnementSection({
  arenaId, abonnement, pilot, dict, locale, autoStartPlan,
}: { arenaId: string; abonnement: Abonnement | null; pilot: PilotPeriode | null; dict: Dictionary; locale: Locale; autoStartPlan?: "event" | null }) {
  const t = dict.minSide.abonnement;
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [checkoutPlan, setCheckoutPlan] = useState<"month" | "year" | "event" | null>(null);
  const [checkoutError, setCheckoutError] = useState("");
  const dagerIgjen = pilot ? Math.max(0, Math.ceil((new Date(pilot.slutt_dato).getTime() - Date.now()) / 86_400_000)) : null;
  // Ingen abonnementer-rad ennå = arenaen har aldri startet et abonnement før
  // -- da får de 14 dagers gratis prøveperiode (kort registreres, ingen
  // belastning før fristen). Gjelder kun første gang, ikke ved gjenoppstart
  // etter en avsluttet periode (abonnement er da ikke lenger null).
  const kvalifisererForProve = !abonnement;

  const [portalLoading, setPortalLoading] = useState(false);
  const erAvsluttet = abonnement?.status === "avsluttet";
  const harBetalingsproblem = abonnement?.status === "betalingsproblem";

  async function handleCheckout(plan: "month" | "year" | "event") {
    setCheckoutPlan(plan);
    setCheckoutError("");
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData.session?.access_token;
    if (!accessToken) { setCheckoutPlan(null); setCheckoutError(t.checkoutError); return; }
    const res = await fetch("/api/stripe/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ arenaId, plan, locale, trial: kvalifisererForProve && plan !== "event" }),
    });
    const data = await res.json();
    if (!res.ok || !data.url) {
      setCheckoutPlan(null);
      setCheckoutError(data.error ?? t.checkoutError);
      return;
    }
    window.location.href = data.url;
  }

  // Stripe sin hostede Customer Portal -- selvbetjent kortoppdatering,
  // kvitteringer og oppsigelse, uten at vi bygger noe av det selv.
  async function handlePortal() {
    setPortalLoading(true);
    setCheckoutError("");
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData.session?.access_token;
    if (!accessToken) { setPortalLoading(false); setCheckoutError(t.checkoutError); return; }
    const res = await fetch("/api/stripe/portal", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ arenaId, locale }),
    });
    const data = await res.json();
    if (!res.ok || !data.url) {
      setPortalLoading(false);
      setCheckoutError(data.error ?? t.checkoutError);
      return;
    }
    window.location.href = data.url;
  }

  // Enkeltarrangement-registreringen (registrer/RegistrerPageContent.tsx)
  // sender ?start_checkout=event i emailRedirectTo -- første gang arenaen
  // logger inn (ingen abonnement ennå), sendes de rett til betaling uten et
  // ekstra klikk, per eksplisitt ønske fra brukeren ("må du betale og
  // deretter sette opp").
  useEffect(() => {
    if (autoStartPlan === "event" && !abonnement && checkoutPlan === null) {
      handleCheckout("event");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStartPlan, abonnement]);

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

        {harBetalingsproblem && (
          <div style={{ backgroundColor: "rgba(217,79,79,0.1)", border: "1px solid rgba(217,79,79,0.35)", borderRadius: "10px", padding: "14px 18px", marginTop: "20px" }}>
            <p style={{ color: "#fff", fontSize: "14px", lineHeight: 1.5, margin: 0 }}>⚠️ {t.paymentProblemNote}</p>
            <button onClick={handlePortal} disabled={portalLoading} style={{ ...tealBtnStyle, marginTop: "12px", opacity: portalLoading ? 0.6 : 1 }}>
              {portalLoading ? t.checkingOut : t.updatePaymentButton}
            </button>
          </div>
        )}

        {/* Fremhevede snarveier -- reelt "to klikk"-kjøp: kortet ligger allerede
            lagret hos Stripe for en returnerende kunde, så disse hopper rett
            til Stripe Checkout uten å måtte åpne den generelle modalen under. */}
        {abonnement?.type === "engangsarrangement" && (
          <button
            onClick={() => handleCheckout("event")}
            disabled={checkoutPlan !== null}
            style={{ ...tealBtnStyle, marginTop: "24px", width: "100%", fontSize: "15px", padding: "14px", opacity: checkoutPlan !== null ? 0.6 : 1 }}
          >
            {checkoutPlan === "event" ? t.checkingOut : `🎪 ${t.buyAnotherDayButton}`}
          </button>
        )}
        {abonnement?.type === "manedlig" && abonnement.status === "aktiv" && (
          <button
            onClick={() => handleCheckout("year")}
            disabled={checkoutPlan !== null}
            style={{ ...coralBtnStyleAuto, marginTop: "24px", width: "100%", fontSize: "15px", padding: "14px", opacity: checkoutPlan !== null ? 0.6 : 1 }}
          >
            {checkoutPlan === "year" ? t.checkingOut : `⭐ ${t.upgradeToYearButton}`}
          </button>
        )}
        {checkoutError && <p style={{ color: "#D94F4F", fontSize: "13px", marginTop: "12px" }}>{checkoutError}</p>}

        {(() => {
          // En av snarveiene over er allerede den fremhevede handlingen --
          // da blir "se alle planer" en sekundær lenke i stedet for å
          // konkurrere visuelt med den. Uten en snarvei (f.eks. første gangs
          // prøveperiode, eller allerede på årsabonnement) er dette fortsatt
          // hovedknappen.
          const harSnarvei = abonnement?.type === "engangsarrangement" || (abonnement?.type === "manedlig" && abonnement.status === "aktiv");
          const knappTekst = kvalifisererForProve ? t.startTrialButton : erAvsluttet ? t.reactivateButton : t.upgradeButton;
          return (
            <button
              onClick={() => setShowUpgrade(true)}
              style={harSnarvei ? { ...ghostBtnStyle, marginTop: "12px" } : { ...coralBtnStyleAuto, marginTop: "24px" }}
            >
              {knappTekst}
            </button>
          );
        })()}

        {!!abonnement?.stripe_customer_id && (
          <button onClick={handlePortal} disabled={portalLoading} style={{ ...ghostBtnStyle, marginTop: "12px", opacity: portalLoading ? 0.6 : 1 }}>
            {portalLoading ? t.checkingOut : t.managePaymentButton}
          </button>
        )}
      </div>

      {showUpgrade && (
        <div style={modalOverlayStyle} onClick={() => setShowUpgrade(false)}>
          <div style={modalBoxStyle} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ ...sectionHeadingStyle, marginBottom: "12px" }}>{t.modalTitle}</h3>
            <p style={{ color: "rgba(255,255,255,0.6)", fontSize: "14px", lineHeight: 1.6, marginBottom: "20px" }}>
              {kvalifisererForProve ? t.modalTextTrial : t.modalText}
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {([
                { plan: "month" as const, title: t.planMonthTitle, price: t.planMonthPrice, note: kvalifisererForProve ? t.trialNote : t.subscriptionCapNote },
                { plan: "year" as const, title: t.planYearTitle, price: t.planYearPrice, note: kvalifisererForProve ? t.trialNote : t.subscriptionCapNote },
                { plan: "event" as const, title: t.planEventTitle, price: t.planEventPrice, note: t.eventTonoNote },
              ]).map(({ plan, title, price, note }) => (
                <div key={plan} style={{ ...cardStyle, padding: "16px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px" }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: "14px", color: "#fff" }}>{title}</div>
                    <div style={{ fontSize: "13px", color: "rgba(255,255,255,0.5)" }}>{price}</div>
                    <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.35)", marginTop: "4px", maxWidth: "260px" }}>{note}</div>
                  </div>
                  <button
                    onClick={() => handleCheckout(plan)}
                    disabled={checkoutPlan !== null}
                    style={{ ...tealBtnStyle, flexShrink: 0, opacity: checkoutPlan !== null ? 0.6 : 1 }}
                  >
                    {checkoutPlan === plan ? t.checkingOut : t.checkoutButton}
                  </button>
                </div>
              ))}
            </div>

            {checkoutError && <p style={{ color: "#D94F4F", fontSize: "13px", marginTop: "16px" }}>{checkoutError}</p>}

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
