"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import type { Session } from "@supabase/supabase-js";
import QRCode from "qrcode";
import { supabase, ARENA_SELECT_COLUMNS, type Arena, type PilotPeriode, type Abonnement } from "@/lib/supabase";
import { ArenaProfilCard } from "@/components/ArenaProfilCard";
import { HoldmusikkCard } from "@/components/HoldmusikkCard";
import { InfoTavleCard } from "@/components/InfoTavleCard";
import { StandardInfotavleCard } from "@/components/StandardInfotavleCard";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { sokAdresser, geokodPoststed, naermesteAdresse, useGeocoder } from "@/lib/geonorge";
import type { Dictionary, Locale } from "@/i18n/get-dictionary";

const ArenaMap = dynamic(() => import("@/components/ArenaMap"), { ssr: false });
const GeofenceMap = dynamic(() => import("@/app/min-side/_components/GeofenceMap"), { ssr: false });
type LatLng = { lat: number; lng: number };

/* ─── CONSTANTS ─── */

const KATEGORIER = [
  "Indoor Sports Venue", "Outdoor Sports Venue", "Indoor Cultural Venue",
  "Outdoor Cultural Venue", "Cultural Center", "Theatre", "Opera House",
  "Festival", "Podcast", "Live", "Other",
];
const LAND = ["Norge", "Sverige", "Danmark", "Finland", "Spania", "Tyskland", "UK", "Annet"];

function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6_371_000;
  const toRad = (d: number) => d * Math.PI / 180;
  const dLat = toRad(lat2 - lat1), dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function generateStreamId(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const random = Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  return `ADC${random}${Date.now().toString().slice(-6)}`;
}

function toDateInputValue(d: Date): string {
  return d.toISOString().slice(0, 10);
}

type ArenaWithPilot = Arena & { pilot: PilotPeriode | null; abonnement: Abonnement | null };

/* ─── ROOT ─── */

export function AdminContent({ dict, locale }: { dict: Dictionary; locale: Locale }) {
  const [session, setSession] = useState<Session | null>(null);
  const [checking, setChecking] = useState(true);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setChecking(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) { setIsAdmin(null); return; }
    supabase.from("brukere").select("er_adience_admin").eq("id", session.user.id).single()
      .then(({ data }) => setIsAdmin(data?.er_adience_admin === true));
  }, [session]);

  if (checking || (session && isAdmin === null)) return <div style={pageStyle} />;
  if (!session) return <LoginScreen dict={dict} locale={locale} />;
  if (!isAdmin) return <IngenTilgangScreen dict={dict} locale={locale} />;
  return <Dashboard dict={dict} locale={locale} />;
}

/* ─── LOGIN ─── */

function LoginScreen({ dict, locale }: { dict: Dictionary; locale: Locale }) {
  const t = dict.admin.login;
  const homeHref = locale === "en" ? "/en" : "/";
  const [mode, setMode] = useState<"login" | "reset">("login");
  const [epost, setEpost] = useState("");
  const [passord, setPassord] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const { error } = await supabase.auth.signInWithPassword({ email: epost, password: passord });
    setLoading(false);
    if (error) {
      setError(error.message.toLowerCase().includes("email not confirmed")
        ? t.errorEmailNotConfirmed
        : t.errorGeneric);
    }
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
        <LanguageSwitcher locale={locale} noHref="/admin" enHref="/en/admin" />
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
        <div style={{ width: "100%", maxWidth: "380px", padding: "24px" }}>
          <div style={{ textAlign: "center", marginBottom: "40px" }}>
            <a href={homeHref} style={{ display: "inline-block" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.png" alt="ÅDIENCE" style={{ height: "72px", width: "auto", margin: "0 auto 24px" }} />
            </a>
            <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "14px" }}>{t.panelLabel}</p>
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
              <button type="submit" disabled={loading} style={{ ...coralBtnStyle, marginTop: "24px" }}>
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
                  <button type="submit" disabled={loading} style={{ ...coralBtnStyle, marginTop: "24px" }}>
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
        </div>
      </div>
    </div>
  );
}

function IngenTilgangScreen({ dict, locale }: { dict: Dictionary; locale: Locale }) {
  const t = dict.admin.ingenTilgang;
  const minSideHref = locale === "en" ? "/en/min-side" : "/min-side";
  return (
    <div style={pageStyle}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
        <div style={{ width: "100%", maxWidth: "380px", padding: "24px", textAlign: "center" }}>
          <a href="/" style={{ display: "inline-block" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="ÅDIENCE" style={{ height: "72px", width: "auto", margin: "0 auto 24px" }} />
          </a>
          <div style={cardStyle}>
            <p style={{ fontSize: "15px", lineHeight: 1.6, marginBottom: "20px" }}>
              {t.message}
            </p>
            {/* Kontoen er fortsatt gyldig innlogget hos Supabase — bare uten
                admin-rettigheter. Uten denne lenken var eneste vei videre å
                logge ut, selv om kontoen kanskje er en helt vanlig
                arena-eier-konto som skal bruke Min side. */}
            <a href={minSideHref} style={{ ...coralBtnStyle, display: "block", width: "100%", textAlign: "center", textDecoration: "none", boxSizing: "border-box", marginBottom: "12px" }}>
              {t.goToMinSide}
            </a>
            <button onClick={() => supabase.auth.signOut()} style={{ ...ghostBtnStyle, width: "100%" }}>
              {t.logout}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── DASHBOARD ─── */

function Dashboard({ dict, locale }: { dict: Dictionary; locale: Locale }) {
  const t = dict.admin.dashboard;
  const homeHref = locale === "en" ? "/en" : "/";
  const dateLocale = locale === "en" ? "en-GB" : "nb-NO";
  const [arenaer, setArenaer]       = useState<ArenaWithPilot[]>([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [selected, setSelected]     = useState<ArenaWithPilot | null>(null);
  const [editArena, setEditArena]   = useState<ArenaWithPilot | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [{ data: arenaData }, { data: pilotData }, { data: abonnementData }] = await Promise.all([
      supabase.from("arenaer").select(ARENA_SELECT_COLUMNS).order("opprettet", { ascending: false }),
      supabase.from("pilot_perioder").select("*"),
      supabase.from("abonnementer").select("*"),
    ]);
    if (arenaData) {
      setArenaer(arenaData.map((a: Arena) => ({
        ...a,
        pilot: pilotData?.find((p: PilotPeriode) => p.arena_id === a.id) ?? null,
        abonnement: abonnementData?.find((ab: Abonnement) => ab.arena_id === a.id) ?? null,
      })));
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function toggleStreaming(id: string, current: boolean) {
    await supabase.from("arenaer").update({ streaming_aktiv: !current }).eq("id", id);
    setArenaer(prev => prev.map(a => a.id === id ? { ...a, streaming_aktiv: !current } : a));
    if (selected?.id === id) setSelected(prev => prev ? { ...prev, streaming_aktiv: !current } : null);
  }

  const filtered = arenaer.filter(a =>
    a.arenanavn.toLowerCase().includes(search.toLowerCase()) ||
    (a.kategori ?? "").toLowerCase().includes(search.toLowerCase()) ||
    (a.land ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const aktive  = arenaer.filter(a => a.streaming_aktiv).length;
  const piloter = arenaer.filter(a => {
    if (!a.pilot) return false;
    return Math.ceil((new Date(a.pilot.slutt_dato).getTime() - Date.now()) / 86400000) > 0;
  }).length;

  return (
    <div style={pageStyle}>

      {/* ── HEADER ── */}
      <header style={headerStyle}>
        <div style={headerInner}>
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <a href={homeHref} style={{ display: "flex", alignItems: "center" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.png" alt="ÅDIENCE" style={{ height: "56px", width: "auto" }} />
            </a>
            <div style={{ width: "1px", height: "20px", backgroundColor: "rgba(255,255,255,0.15)" }} />
            <span style={{ fontFamily: "var(--font-ibm-plex-mono), monospace", fontSize: "12px", color: "rgba(255,255,255,0.4)", letterSpacing: "0.1em" }}>{t.adminLabel}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
            <LanguageSwitcher locale={locale} noHref="/admin" enHref="/en/admin" />
            <a href={homeHref} style={{ color: "rgba(255,255,255,0.4)", fontSize: "13px", textDecoration: "none" }}>{t.backToHome}</a>
            <button onClick={() => supabase.auth.signOut()} style={ghostBtnStyle}>{t.logout}</button>
          </div>
        </div>
      </header>

      {/* ── BODY ── */}
      <div style={bodyStyle}>

        {/* Page title */}
        <div style={{ marginBottom: "28px" }}>
          <h1 style={pageHeadingStyle}>{t.title}</h1>
          <p style={{ color: "rgba(255,255,255,0.35)", fontSize: "14px", marginTop: "4px" }}>
            {new Date().toLocaleDateString(dateLocale, { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </p>
        </div>

        {/* ── STATS GRID ── */}
        <div style={statsGrid}>
          <StatCard label={t.statTotal}  value={arenaer.length.toString()} color="#33D3C4" />
          <StatCard label={t.statActivePilots}  value={piloter.toString()}         color="#FF6B4A" />
          <StatCard label={t.statActiveStreaming} value={aktive.toString()}           color="#33D3C4" />
        </div>

        {/* ── TOOLBAR ── */}
        <div style={toolbarStyle}>
          <div style={{ display: "flex", gap: "8px", flex: 1 }}>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={t.searchPlaceholder}
              style={{ ...inputStyle, flex: 1, maxWidth: "360px" }}
              onFocus={e => { e.target.style.borderColor = "#33D3C4"; }}
              onBlur={e => { e.target.style.borderColor = "rgba(255,255,255,0.12)"; }}
              onKeyDown={e => e.key === "Escape" && setSearch("")}
            />
            <button style={ghostBtnStyle}>{t.searchButton}</button>
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              onClick={() => document.getElementById("standard-infokarusell")?.scrollIntoView({ behavior: "smooth", block: "start" })}
              style={ghostBtnStyle}
            >
              {t.standardCarouselLink}
            </button>
            <button
              onClick={() => document.getElementById("administratorer")?.scrollIntoView({ behavior: "smooth", block: "start" })}
              style={ghostBtnStyle}
            >
              {t.adminManagerLink}
            </button>
            <button onClick={fetchData} style={ghostBtnStyle}>{t.refreshButton}</button>
            <button onClick={() => setShowAddModal(true)} style={outlineCoralBtnStyle}>{t.newArenaButton}</button>
          </div>
        </div>

        {/* ── TABLE ── */}
        {loading ? (
          <div style={emptyStyle}>{t.loadingData}</div>
        ) : filtered.length === 0 ? (
          <div style={emptyStyle}>{arenaer.length === 0 ? t.noArenasYet : t.noSearchResults}</div>
        ) : (
          <div style={{ overflowX: "auto", marginBottom: "60px" }}>
            <table style={tableStyle}>
              <thead>
                <tr style={theadRowStyle}>
                  <th style={thStyle}>{t.thName}</th>
                  <th style={thStyle}>{t.thCategory}</th>
                  <th style={thStyle}>{t.thCountry}</th>
                  <th style={thStyle}>{t.thStreamId}</th>
                  <th style={thStyle}>{t.thPilotStatus}</th>
                  <th style={{ ...thStyle, textAlign: "center" }}>{t.thStreaming}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((arena, i) => (
                  <ArenaRow
                    key={arena.id}
                    arena={arena}
                    odd={i % 2 === 1}
                    onToggle={toggleStreaming}
                    onClick={() => setSelected(arena)}
                    dict={dict}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div id="standard-infokarusell" style={{ scrollMarginTop: "20px" }}>
          <StandardInfokarusellSeksjon dict={dict} />
        </div>

        <div id="administratorer" style={{ scrollMarginTop: "20px" }}>
          <AdminManagerSeksjon dict={dict} locale={locale} />
        </div>
      </div>

      {/* ── ARENA DETAIL PANEL ── */}
      {selected && (
        <ArenaDetailPanel
          arena={selected}
          onClose={() => setSelected(null)}
          onToggle={toggleStreaming}
          onLogoChanged={(id, url) => {
            setArenaer(prev => prev.map(a => a.id === id ? { ...a, logo_url: url } : a));
            setSelected(prev => prev ? { ...prev, logo_url: url } : null);
          }}
          onDeleted={(id) => {
            setArenaer(prev => prev.filter(a => a.id !== id));
            setSelected(null);
          }}
          onPositionChanged={(id, lat, lng) => {
            setArenaer(prev => prev.map(a => a.id === id ? { ...a, lat, lng } : a));
            setSelected(prev => prev ? { ...prev, lat, lng } : null);
          }}
          onArenaUpdated={(id, patch) => {
            setArenaer(prev => prev.map(a => a.id === id ? { ...a, ...patch } : a));
            setSelected(prev => prev && prev.id === id ? { ...prev, ...patch } : prev);
          }}
          onPilotChanged={(id, pilot) => {
            setArenaer(prev => prev.map(a => a.id === id ? { ...a, pilot } : a));
            setSelected(prev => prev && prev.id === id ? { ...prev, pilot } : prev);
          }}
          onEdit={() => setEditArena(selected)}
          dict={dict}
          locale={locale}
        />
      )}

      {/* ── ADD ARENA MODAL ── */}
      {showAddModal && (
        <AddArenaModal
          onClose={() => setShowAddModal(false)}
          onSaved={() => { setShowAddModal(false); fetchData(); }}
          dict={dict}
        />
      )}

      {/* ── EDIT ARENA MODAL ── */}
      {editArena && (
        <AddArenaModal
          arena={editArena}
          onClose={() => setEditArena(null)}
          onSaved={(updated) => {
            setEditArena(null);
            if (updated) {
              setArenaer(prev => prev.map(a => a.id === updated.id ? { ...a, ...updated } : a));
              setSelected(prev => prev?.id === updated.id ? { ...prev, ...updated } : prev);
            }
          }}
          dict={dict}
        />
      )}
    </div>
  );
}

/* ─── ADMINISTRATORER ─── */

type Kandidat = {
  kilde: "bruker" | "speakerteam";
  id: string;
  epost: string;
  fornavn: string | null;
  etternavn: string | null;
  arena_id: string | null;
  arenanavn: string | null;
  er_adience_admin: boolean;
  harKonto: boolean;
};

// Samme landliste som brukes i registreringsflyten (registrer/page.tsx) —
// arenaens eget `land`-felt avgjør hvilken standard informasjonskarusell
// (fallback-innhold, se StandardInfotavleCard) den mangler-eget-innhold-
// arenaen skal se i appen.
const STANDARD_INFOKARUSELL_LAND = ["Norge", "Sverige", "Danmark", "Finland", "Spania", "Tyskland", "UK", "Annet"];

function StandardInfokarusellSeksjon({ dict }: { dict: Dictionary }) {
  const t = dict.admin.standardCarousel;
  const [land, setLand] = useState(STANDARD_INFOKARUSELL_LAND[0]);

  return (
    <div style={{ marginTop: "16px" }}>
      <h2 style={{ ...pageHeadingStyle, fontSize: "20px", marginBottom: "16px" }}>{t.title}</h2>
      <div style={cardStyle}>
        <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "14px", marginBottom: "20px", lineHeight: 1.6 }}>
          {t.helpText}
        </p>
        <select
          value={land}
          onChange={e => setLand(e.target.value)}
          style={{ ...inputStyle, marginBottom: "20px", maxWidth: "260px", cursor: "pointer" }}
        >
          {STANDARD_INFOKARUSELL_LAND.map(l => <option key={l} value={l}>{l}</option>)}
        </select>
        <StandardInfotavleCard key={land} land={land} dict={dict} />
      </div>
    </div>
  );
}

function AdminManagerSeksjon({ dict, locale }: { dict: Dictionary; locale: Locale }) {
  const t = dict.admin.adminManager;
  const [query, setQuery] = useState("");
  const [treff, setTreff] = useState<Kandidat[]>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [feilmelding, setFeilmelding] = useState("");
  const [oppdaterer, setOppdaterer] = useState<string | null>(null);

  const [visInviter, setVisInviter] = useState(false);
  const [inviteEpost, setInviteEpost] = useState("");
  const [inviteFornavn, setInviteFornavn] = useState("");
  const [inviteEtternavn, setInviteEtternavn] = useState("");
  const [inviterer, setInviterer] = useState(false);
  const [inviteFeilmelding, setInviteFeilmelding] = useState("");
  const [inviteSuksess, setInviteSuksess] = useState(false);

  async function handleInviter(e: React.FormEvent) {
    e.preventDefault();
    setInviterer(true);
    setInviteFeilmelding("");
    setInviteSuksess(false);

    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData.session?.access_token;
    if (!accessToken) {
      setInviteFeilmelding(t.inviteMissingSession);
      setInviterer(false);
      return;
    }

    const res = await fetch("/api/admin/inviter-administrator", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ epost: inviteEpost, fornavn: inviteFornavn, etternavn: inviteEtternavn, locale }),
    });
    const data = await res.json();
    setInviterer(false);
    if (!res.ok) { setInviteFeilmelding(data.error ?? t.inviteGenericError); return; }
    setInviteSuksess(true);
    setInviteEpost(""); setInviteFornavn(""); setInviteEtternavn("");
  }

  async function handleSok(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    setSearching(true);
    setSearched(true);
    setFeilmelding("");

    const [{ data: brukereData, error: brukereError }, { data: arenaTreff }, { data: speakerData }] = await Promise.all([
      supabase
        .from("brukere")
        .select("id, epost, fornavn, etternavn, er_adience_admin, arena_id")
        .or(`epost.ilike.%${q}%,fornavn.ilike.%${q}%,etternavn.ilike.%${q}%`)
        .order("epost"),
      supabase.from("arenaer").select("id, arenanavn").ilike("arenanavn", `%${q}%`),
      supabase
        .from("speakerteam")
        .select("id, epost, fornavn, etternavn, arena_id")
        .or(`epost.ilike.%${q}%,fornavn.ilike.%${q}%,etternavn.ilike.%${q}%`),
    ]);

    if (brukereError) { setFeilmelding(brukereError.message); setSearching(false); return; }

    const brukereFunnet = [...(brukereData ?? [])];
    const matchendeArenaIder = (arenaTreff ?? []).map(a => a.id);

    // Fyll på med brukere knyttet til arenaer/organisasjoner som matcher søket på navn.
    if (matchendeArenaIder.length > 0) {
      const { data: brukereViaArena } = await supabase
        .from("brukere")
        .select("id, epost, fornavn, etternavn, er_adience_admin, arena_id")
        .in("arena_id", matchendeArenaIder);
      const kjenteIder = new Set(brukereFunnet.map(b => b.id));
      for (const b of brukereViaArena ?? []) {
        if (!kjenteIder.has(b.id)) { brukereFunnet.push(b); kjenteIder.add(b.id); }
      }
    }

    // Speakerteam-medlemmer knyttet til en matchende arena, i tillegg til navnetreff.
    const speakerFunnet = [...(speakerData ?? [])];
    if (matchendeArenaIder.length > 0) {
      const { data: speakerViaArena } = await supabase
        .from("speakerteam")
        .select("id, epost, fornavn, etternavn, arena_id")
        .in("arena_id", matchendeArenaIder);
      const kjenteIder = new Set(speakerFunnet.map(s => s.id));
      for (const s of speakerViaArena ?? []) {
        if (!kjenteIder.has(s.id)) { speakerFunnet.push(s); kjenteIder.add(s.id); }
      }
    }

    // Hent organisasjonsnavn å vise ved siden av hvert treff.
    const alleArenaIder = [...new Set([...brukereFunnet, ...speakerFunnet].map(b => b.arena_id).filter((id): id is string => !!id))];
    let navnPerId = new Map<string, string>();
    if (alleArenaIder.length > 0) {
      const { data: arenaNavn } = await supabase.from("arenaer").select("id, arenanavn").in("id", alleArenaIder);
      navnPerId = new Map((arenaNavn ?? []).map(a => [a.id, a.arenanavn]));
    }

    const kandidater: Kandidat[] = brukereFunnet.map(b => ({
      kilde: "bruker",
      id: b.id,
      epost: b.epost,
      fornavn: b.fornavn,
      etternavn: b.etternavn,
      arena_id: b.arena_id,
      arenanavn: b.arena_id ? navnPerId.get(b.arena_id) ?? null : null,
      er_adience_admin: b.er_adience_admin,
      harKonto: true,
    }));

    // Speakerteam-medlemmer uten egen brukere-konto (samme e-post finnes ikke fra før) —
    // disse kan inviteres, men vises ikke som duplikat om de allerede har konto.
    const kjenteEposter = new Set(kandidater.map(k => k.epost.toLowerCase()));
    for (const s of speakerFunnet) {
      if (s.epost && kjenteEposter.has(s.epost.toLowerCase())) continue;
      kandidater.push({
        kilde: "speakerteam",
        id: s.id,
        epost: s.epost,
        fornavn: s.fornavn,
        etternavn: s.etternavn,
        arena_id: s.arena_id,
        arenanavn: s.arena_id ? navnPerId.get(s.arena_id) ?? null : null,
        er_adience_admin: false,
        harKonto: false,
      });
      if (s.epost) kjenteEposter.add(s.epost.toLowerCase());
    }

    setSearching(false);
    setTreff(kandidater);
  }

  async function toggleAdmin(kandidat: Kandidat) {
    setOppdaterer(kandidat.id);
    const { error } = await supabase
      .from("brukere")
      .update({ er_adience_admin: !kandidat.er_adience_admin })
      .eq("id", kandidat.id);
    setOppdaterer(null);
    if (error) { setFeilmelding(error.message); return; }
    setTreff(prev => prev.map(k => k.id === kandidat.id ? { ...k, er_adience_admin: !k.er_adience_admin } : k));
  }

  function prefillInviter(kandidat: Kandidat) {
    setInviteEpost(kandidat.epost);
    setInviteFornavn(kandidat.fornavn ?? "");
    setInviteEtternavn(kandidat.etternavn ?? "");
    setVisInviter(true);
    setInviteSuksess(false);
    setInviteFeilmelding("");
  }

  return (
    <div style={{ marginTop: "16px" }}>
      <h2 style={{ ...pageHeadingStyle, fontSize: "20px", marginBottom: "16px" }}>{t.title}</h2>
      <div style={cardStyle}>
        <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "14px", marginBottom: "20px", lineHeight: 1.6 }}>
          {t.helpText}
        </p>

        <div style={{ marginBottom: "24px", paddingBottom: "24px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          {!visInviter ? (
            <button onClick={() => setVisInviter(true)} style={outlineCoralBtnStyle}>{t.inviteButton}</button>
          ) : (
            <form onSubmit={handleInviter}>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" as const, marginBottom: "12px" }}>
                <input
                  type="email" required value={inviteEpost} onChange={e => setInviteEpost(e.target.value)}
                  placeholder={t.inviteEmailPlaceholder} style={{ ...inputStyle, flex: "1 1 200px" }}
                />
                <input
                  value={inviteFornavn} onChange={e => setInviteFornavn(e.target.value)}
                  placeholder={t.inviteFirstNamePlaceholder} style={{ ...inputStyle, flex: "1 1 140px" }}
                />
                <input
                  value={inviteEtternavn} onChange={e => setInviteEtternavn(e.target.value)}
                  placeholder={t.inviteLastNamePlaceholder} style={{ ...inputStyle, flex: "1 1 140px" }}
                />
              </div>
              {inviteFeilmelding && <p style={{ color: "#D94F4F", fontSize: "13px", marginBottom: "12px" }}>{inviteFeilmelding}</p>}
              {inviteSuksess && <p style={{ color: "#33D3C4", fontSize: "13px", marginBottom: "12px" }}>{t.inviteSuccess}</p>}
              <div style={{ display: "flex", gap: "8px" }}>
                <button type="submit" disabled={inviterer} style={outlineCoralBtnStyle}>
                  {inviterer ? t.inviting : t.sendInvite}
                </button>
                <button type="button" onClick={() => setVisInviter(false)} style={ghostBtnStyle}>{t.cancel}</button>
              </div>
            </form>
          )}
        </div>

        <form onSubmit={handleSok} style={{ display: "flex", gap: "8px", marginBottom: "20px" }}>
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={t.searchPlaceholder}
            style={{ ...inputStyle, flex: 1, maxWidth: "360px" }}
          />
          <button type="submit" disabled={searching} style={ghostBtnStyle}>
            {searching ? t.searching : t.searchButton}
          </button>
        </form>

        {feilmelding && <p style={{ color: "#D94F4F", fontSize: "13px", marginBottom: "16px" }}>{feilmelding}</p>}

        {searched && !searching && treff.length === 0 && !feilmelding && (
          <p style={{ color: "rgba(255,255,255,0.35)", fontSize: "14px" }}>{t.noResults}</p>
        )}

        {treff.length > 0 && (
          <div style={{ overflowX: "auto" }}>
            <table style={tableStyle}>
              <thead>
                <tr style={theadRowStyle}>
                  <th style={thStyle}>{t.thName}</th>
                  <th style={thStyle}>{t.thOrg}</th>
                  <th style={thStyle}>{t.thEmail}</th>
                  <th style={thStyle}>{t.thStatus}</th>
                  <th style={{ ...thStyle, textAlign: "center" }}>{t.thAction}</th>
                </tr>
              </thead>
              <tbody>
                {treff.map((kandidat, i) => (
                  <tr key={`${kandidat.kilde}-${kandidat.id}`} style={{ backgroundColor: i % 2 === 1 ? "rgba(255,255,255,0.02)" : "transparent" }}>
                    <td style={{ padding: "14px 20px", fontSize: "14px" }}>
                      {[kandidat.fornavn, kandidat.etternavn].filter(Boolean).join(" ") || "—"}
                    </td>
                    <td style={{ padding: "14px 20px", fontSize: "14px", color: "rgba(255,255,255,0.6)" }}>
                      {kandidat.arenanavn ?? "—"}
                    </td>
                    <td style={{ padding: "14px 20px", fontSize: "14px", color: "rgba(255,255,255,0.6)" }}>{kandidat.epost}</td>
                    <td style={{ padding: "14px 20px", fontSize: "13px", color: "rgba(255,255,255,0.4)" }}>
                      {kandidat.harKonto
                        ? (kandidat.er_adience_admin ? t.statusAdmin : t.statusHasAccount)
                        : t.statusNoAccount}
                    </td>
                    <td style={{ padding: "14px 20px", textAlign: "center" }}>
                      {kandidat.harKonto ? (
                        <button
                          onClick={() => toggleAdmin(kandidat)}
                          disabled={oppdaterer === kandidat.id}
                          style={kandidat.er_adience_admin
                            ? { ...outlineCoralBtnStyle, padding: "8px 14px" }
                            : { ...ghostBtnStyle, padding: "8px 14px" }}
                        >
                          {oppdaterer === kandidat.id ? "…" : kandidat.er_adience_admin ? t.removeAdmin : t.makeAdmin}
                        </button>
                      ) : (
                        <button onClick={() => prefillInviter(kandidat)} style={{ ...ghostBtnStyle, padding: "8px 14px" }}>
                          {t.inviteAsAdmin}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── COPY CHIP ─── */
// Klikkbar ID-tekst med kopier-ikon. stopPropagation er kritisk her — uten
// den åpner et klikk på ID-en den omsluttende radens onClick (som åpner
// detaljpanelet over hele tabellen) før man rekker å markere/kopiere teksten.
function CopyChip({ text, style }: { text: string; style?: React.CSSProperties }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={e => {
        e.stopPropagation();
        navigator.clipboard.writeText(text).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        });
      }}
      title="Kopier"
      style={{
        background: "none", border: "none", cursor: "pointer", padding: 0,
        display: "inline-flex", alignItems: "center", gap: "6px",
        fontFamily: "var(--font-ibm-plex-mono), monospace", fontSize: "12px",
        color: copied ? "#78BE20" : "rgba(51,211,196,0.7)", letterSpacing: "0.02em",
        ...style,
      }}
    >
      {text}
      <span style={{ fontSize: "11px" }}>{copied ? "✓" : "⧉"}</span>
    </button>
  );
}

/* ─── ARENA ROW ─── */

function ArenaRow({ arena, odd, onToggle, onClick, dict }: {
  arena: ArenaWithPilot;
  odd: boolean;
  onToggle: (id: string, current: boolean) => void;
  onClick: () => void;
  dict: Dictionary;
}) {
  const t = dict.admin.arenaRow;
  const daysLeft = arena.pilot
    ? Math.max(0, Math.ceil((new Date(arena.pilot.slutt_dato).getTime() - Date.now()) / 86400000))
    : null;

  const isEngangs = arena.abonnement?.type === "engangsarrangement";
  const engangsDaysLeft = isEngangs && arena.abonnement?.periode_slutt
    ? Math.max(0, Math.ceil((new Date(arena.abonnement.periode_slutt).getTime() - Date.now()) / 86400000))
    : null;

  const pilotStatus = isEngangs
    ? engangsDaysLeft! > 0
      ? { label: `${t.engangsPrefix} ${engangsDaysLeft}${t.daysLeftSuffix}`, color: "#78BE20" }
      : { label: t.engangsExpired, color: "rgba(255,255,255,0.3)" }
    : arena.pilot
      ? daysLeft! > 0
        ? { label: `${daysLeft}${t.daysLeftSuffix}`, color: daysLeft! <= 3 ? "#FF6B4A" : "#33D3C4" }
        : { label: t.expired, color: "rgba(255,255,255,0.3)" }
      : { label: t.inactiveNoSubscription, color: "rgba(255,255,255,0.2)" };

  return (
    <tr
      onClick={onClick}
      style={{
        backgroundColor: odd ? "rgba(255,255,255,0.02)" : "transparent",
        cursor: "pointer",
        transition: "background 0.15s",
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = "rgba(51,211,196,0.05)"; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = odd ? "rgba(255,255,255,0.02)" : "transparent"; }}
    >
      <td style={tdStyle}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {arena.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={arena.logo_url} alt="" style={{ width: "32px", height: "32px", objectFit: "contain", borderRadius: "6px", backgroundColor: "rgba(255,255,255,0.06)", flexShrink: 0 }} />
          ) : (
            <div style={{ width: "32px", height: "32px", borderRadius: "6px", backgroundColor: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <span style={{ fontSize: "14px", opacity: 0.3 }}>🏟</span>
            </div>
          )}
          <div>
            <span style={{ fontWeight: 600, color: "#ffffff" }}>{arena.arenanavn}</span>
            {arena.by && <span style={{ display: "block", fontSize: "12px", color: "rgba(255,255,255,0.35)", marginTop: "2px" }}>{arena.by}</span>}
          </div>
        </div>
      </td>
      <td style={tdStyle}>
        <span style={{ color: "rgba(255,255,255,0.55)", fontSize: "13px" }}>{arena.kategori ?? "—"}</span>
      </td>
      <td style={tdStyle}>
        <span style={{ color: "rgba(255,255,255,0.55)", fontSize: "13px" }}>{arena.land ?? "—"}</span>
      </td>
      <td style={tdStyle} onClick={e => e.stopPropagation()}>
        {arena.stream_id ? <CopyChip text={arena.stream_id} /> : <span style={{ color: "rgba(255,255,255,0.3)", fontSize: "12px" }}>—</span>}
      </td>
      <td style={tdStyle}>
        <span style={{
          display: "inline-block",
          backgroundColor: `${pilotStatus.color}18`,
          border: `1px solid ${pilotStatus.color}40`,
          color: pilotStatus.color,
          borderRadius: "100px",
          padding: "3px 10px",
          fontSize: "12px",
          fontFamily: "var(--font-ibm-plex-mono), monospace",
          whiteSpace: "nowrap",
        }}>
          {pilotStatus.label}
        </span>
      </td>
      <td style={{ ...tdStyle, textAlign: "center" }} onClick={e => e.stopPropagation()}>
        <button
          onClick={() => onToggle(arena.id, arena.streaming_aktiv)}
          style={{
            width: "44px", height: "24px",
            backgroundColor: arena.streaming_aktiv ? "#33D3C4" : "rgba(255,255,255,0.1)",
            border: "none", borderRadius: "100px",
            cursor: "pointer", position: "relative", transition: "background 0.2s",
          }}
          title={arena.streaming_aktiv ? t.deactivateTooltip : t.activateTooltip}
        >
          <span style={{
            position: "absolute", top: "3px",
            left: arena.streaming_aktiv ? "22px" : "3px",
            width: "18px", height: "18px",
            backgroundColor: arena.streaming_aktiv ? "#073E46" : "rgba(255,255,255,0.4)",
            borderRadius: "50%", transition: "left 0.2s", display: "block",
          }} />
        </button>
      </td>
    </tr>
  );
}

/* ─── ARENA DETAIL PANEL (slide-in from right) ─── */

function ArenaDetailPanel({ arena, onClose, onToggle, onLogoChanged, onDeleted, onEdit, onPositionChanged, onArenaUpdated, onPilotChanged, dict, locale }: {
  arena: ArenaWithPilot;
  onClose: () => void;
  onToggle: (id: string, current: boolean) => void;
  onLogoChanged: (id: string, url: string | null) => void;
  onDeleted: (id: string) => void;
  onEdit: () => void;
  onPositionChanged: (id: string, lat: number, lng: number) => void;
  onArenaUpdated: (id: string, patch: Partial<Arena>) => void;
  onPilotChanged: (id: string, pilot: PilotPeriode | null) => void;
  dict: Dictionary;
  locale: Locale;
}) {
  const t = dict.admin.detailPanel;
  const dateLocale = locale === "en" ? "en-GB" : "nb-NO";
  const daysLeft = arena.pilot
    ? Math.max(0, Math.ceil((new Date(arena.pilot.slutt_dato).getTime() - Date.now()) / 86400000))
    : null;

  const hasCoords = arena.lat != null && arena.lng != null;
  const logo = useLogoUpload(dict);
  const [replacingLogo, setReplacingLogo] = useState(false);
  const [logoSaving, setLogoSaving] = useState(false);
  const [deleteState, setDeleteState] = useState<"idle" | "confirm" | "deleting">("idle");

  const [idGenSaving, setIdGenSaving] = useState(false);
  const [idGenError, setIdGenError] = useState<string | null>(null);

  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [qrGenerating, setQrGenerating] = useState(false);

  const [castPassord, setCastPassord] = useState<string | null>(null);
  useEffect(() => {
    supabase.rpc("get_cast_passord", { p_arena_id: arena.id }).then(({ data }) => {
      if (typeof data === "string") setCastPassord(data);
    });
  }, [arena.id]);

  async function handleVisQr() {
    if (!arena.stream_id) return;
    setQrGenerating(true);
    const dataUrl = await QRCode.toDataURL(`https://app.adience.no/a/${arena.stream_id}`, {
      width: 280, margin: 2, color: { dark: "#073E46", light: "#33D3C4" },
    });
    setQrGenerating(false);
    setQrDataUrl(dataUrl);
  }

  const [pilotStart, setPilotStart] = useState(() => arena.pilot?.start_dato?.slice(0, 10) ?? toDateInputValue(new Date()));
  const [pilotEnd, setPilotEnd] = useState(() => arena.pilot?.slutt_dato?.slice(0, 10) ?? toDateInputValue(new Date(Date.now() + 14 * 86400000)));
  const [pilotSaving, setPilotSaving] = useState(false);
  const [pilotError, setPilotError] = useState<string | null>(null);
  const [pilotSaved, setPilotSaved] = useState(false);

  async function handleGenerateIds() {
    setIdGenSaving(true);
    setIdGenError(null);
    const stream_id = generateStreamId();
    const { error } = await supabase.from("arenaer").update({ stream_id }).eq("id", arena.id);
    setIdGenSaving(false);
    if (error) { setIdGenError(error.message); return; }
    onArenaUpdated(arena.id, { stream_id });
  }

  async function handleSavePilot() {
    setPilotSaving(true);
    setPilotError(null);
    const start_dato = new Date(pilotStart).toISOString();
    const slutt_dato = new Date(pilotEnd).toISOString();

    if (arena.pilot) {
      const { error } = await supabase.from("pilot_perioder")
        .update({ start_dato, slutt_dato, status: "aktiv" })
        .eq("id", arena.pilot.id);
      setPilotSaving(false);
      if (error) { setPilotError(error.message); return; }
      onPilotChanged(arena.id, { ...arena.pilot, start_dato, slutt_dato, status: "aktiv" });
    } else {
      const { data, error } = await supabase.from("pilot_perioder")
        .insert({ arena_id: arena.id, start_dato, slutt_dato, status: "aktiv", konvertert: false })
        .select()
        .single();
      setPilotSaving(false);
      if (error) { setPilotError(error.message); return; }
      onPilotChanged(arena.id, data as PilotPeriode);
    }
    setPilotSaved(true);
    setTimeout(() => setPilotSaved(false), 2500);
  }
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [savedRadius, setSavedRadius] = useState(arena.geofence_radius ?? 300);
  const [localRadius, setLocalRadius] = useState(arena.geofence_radius ?? 300);
  const [radiusSaving, setRadiusSaving] = useState(false);
  const [radiusJustSaved, setRadiusJustSaved] = useState(false);
  const [radiusError, setRadiusError] = useState<string | null>(null);
  const [overlapWarnings, setOverlapWarnings] = useState<string[]>([]);

  const hasPendingRadius = localRadius !== savedRadius;

  // Polygon-geofence: premium-funksjon (årsabonnement), kun admin tegner den
  // inn i dag -- se GeofenceMap.tsx, som fantes ferdigbygd men aldri var
  // koblet inn noe sted før 2026-07-25. Min side viser polygonen (les kun)
  // når den er satt, ellers sirkel+radius som før.
  const [geofenceMode, setGeofenceMode] = useState<"sirkel" | "polygon">(arena.geofence_type === "polygon" ? "polygon" : "sirkel");
  const [polygonPoints, setPolygonPoints] = useState<LatLng[]>(
    Array.isArray(arena.geofence_polygon) ? (arena.geofence_polygon as LatLng[]) : []
  );
  const [polygonSaving, setPolygonSaving] = useState(false);
  const [polygonJustSaved, setPolygonJustSaved] = useState(false);
  const [polygonError, setPolygonError] = useState<string | null>(null);

  const [pendingLat, setPendingLat] = useState<number | null>(null);
  const [pendingLng, setPendingLng] = useState<number | null>(null);
  const [posSaving, setPosSaving] = useState(false);
  const [posSaved, setPosSaved] = useState(false);
  const [resetTrigger, setResetTrigger] = useState(0);

  const hasPendingPos = pendingLat !== null && pendingLng !== null;

  // Manuell plassering når geokoding ikke fant adressen (f.eks. husnummer som
  // Nominatim ikke kjenner). Vi sentrerer kartet på poststedet — postnummer +
  // by treffer alltid selv når gateadressen ikke gjør det — og lar admin zoome
  // inn og klikke der arenaen faktisk ligger. Faller tilbake til Norge om selv
  // poststedet ikke lar seg slå opp.
  const NORGE_SENTER = { lat: 61.5, lng: 8.5, zoom: 5 };
  const [manueltKart, setManueltKart] = useState(false);
  const [senterLaster, setSenterLaster] = useState(false);
  const [manueltSenter, setManueltSenter] = useState<{ lat: number; lng: number; zoom: number } | null>(null);

  async function startManuellPlassering() {
    setManueltKart(true);
    setSenterLaster(true);
    try {
      const senter = await geokodPoststed(arena.postnummer, arena.by);
      setManueltSenter(senter ? { ...senter, zoom: 14 } : NORGE_SENTER);
    } catch {
      setManueltSenter(NORGE_SENTER);
    } finally {
      setSenterLaster(false);
    }
  }

  async function checkOverlaps(radius: number): Promise<string[]> {
    if (!arena.lat || !arena.lng || !arena.kategori) return [];
    const { data } = await supabase
      .from("arenaer")
      .select("id, arenanavn, kategori, lat, lng, geofence_radius")
      .eq("kategori", arena.kategori)
      .neq("id", arena.id);
    if (!data) return [];
    return data
      .filter((o) => o.lat != null && o.lng != null)
      .filter((o) => haversineDistance(arena.lat!, arena.lng!, o.lat, o.lng) < radius + (o.geofence_radius ?? 300))
      .map((o) => `«${o.arenanavn}» (${o.kategori})`);
  }

  async function handleSaveRadius() {
    setRadiusSaving(true);
    setRadiusError(null);
    const warnings = await checkOverlaps(localRadius);
    setOverlapWarnings(warnings);
    const { error } = await supabase.from("arenaer").update({ geofence_radius: localRadius }).eq("id", arena.id);
    setRadiusSaving(false);
    if (error) {
      setRadiusError(`${t.radiusErrorPrefix} ${error.message}`);
    } else {
      setSavedRadius(localRadius);
      setRadiusJustSaved(true);
      setTimeout(() => setRadiusJustSaved(false), 2500);
    }
  }

  async function handleSavePolygon() {
    if (polygonPoints.length < 3) {
      setPolygonError(t.polygonMinPointsError);
      return;
    }
    setPolygonSaving(true);
    setPolygonError(null);
    const { error } = await supabase
      .from("arenaer")
      .update({ geofence_type: "polygon", geofence_polygon: polygonPoints })
      .eq("id", arena.id);
    setPolygonSaving(false);
    if (error) {
      setPolygonError(`${t.radiusErrorPrefix} ${error.message}`);
    } else {
      onArenaUpdated(arena.id, { geofence_type: "polygon", geofence_polygon: polygonPoints });
      setPolygonJustSaved(true);
      setTimeout(() => setPolygonJustSaved(false), 2500);
    }
  }

  async function handleSwitchToSirkel() {
    setGeofenceMode("sirkel");
    if (arena.geofence_type === "polygon") {
      await supabase.from("arenaer").update({ geofence_type: "sirkel" }).eq("id", arena.id);
      onArenaUpdated(arena.id, { geofence_type: "sirkel" });
    }
  }

  async function handleSavePosition() {
    if (pendingLat == null || pendingLng == null) return;
    setPosSaving(true);
    await supabase.from("arenaer").update({ lat: pendingLat, lng: pendingLng }).eq("id", arena.id);
    onPositionChanged(arena.id, pendingLat, pendingLng);
    setPendingLat(null);
    setPendingLng(null);
    setPosSaving(false);
    setPosSaved(true);
    setTimeout(() => setPosSaved(false), 2500);
  }

  function handleCancelPosition() {
    setPendingLat(null);
    setPendingLng(null);
    setResetTrigger(t => t + 1);
  }

  async function handleDelete() {
    setDeleteState("deleting");
    setDeleteError(null);

    const { error: e1 } = await supabase.from("pilot_perioder").delete().eq("arena_id", arena.id);
    if (e1) { setDeleteError(e1.message); setDeleteState("confirm"); return; }

    const { error: e2 } = await supabase.from("abonnementer").delete().eq("arena_id", arena.id);
    if (e2) { setDeleteError(e2.message); setDeleteState("confirm"); return; }

    const { error: e3 } = await supabase.from("brukere").delete().eq("arena_id", arena.id);
    if (e3) { setDeleteError(e3.message); setDeleteState("confirm"); return; }

    if (arena.logo_url) {
      const path = arena.logo_url.split("/arena-logoer/").at(-1);
      if (path) await supabase.storage.from("arena-logoer").remove([path]);
    }

    const { error: e4 } = await supabase.from("arenaer").delete().eq("id", arena.id);
    if (e4) { setDeleteError(e4.message); setDeleteState("confirm"); return; }

    onDeleted(arena.id);
  }

  async function handleLogoSave() {
    if (!logo.file) return;
    setLogoSaving(true);
    const url = await logo.upload(arena.id);
    if (url) {
      await supabase.from("arenaer").update({ logo_url: url }).eq("id", arena.id);
      onLogoChanged(arena.id, url);
      logo.reset();
      setReplacingLogo(false);
    }
    setLogoSaving(false);
  }

  async function handleLogoRemove() {
    await supabase.from("arenaer").update({ logo_url: null }).eq("id", arena.id);
    onLogoChanged(arena.id, null);
    logo.reset();
    setReplacingLogo(false);
  }

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.5)", zIndex: 100, backdropFilter: "blur(2px)" }}
      />

      {/* Panel */}
      <div style={{
        position: "fixed", top: 0, right: 0, bottom: 0,
        width: "min(520px, 95vw)",
        backgroundColor: "#0d3544",
        borderLeft: "1px solid rgba(51,211,196,0.15)",
        zIndex: 101,
        overflowY: "auto",
        boxShadow: "-8px 0 40px rgba(0,0,0,0.4)",
      }}>
        {/* Panel header */}
        <div style={{ padding: "24px 28px", borderBottom: "1px solid rgba(255,255,255,0.07)", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <h2 style={{ fontFamily: "var(--font-montserrat), system-ui, sans-serif", fontWeight: 800, fontSize: "20px", marginBottom: "4px" }}>
              {arena.arenanavn}
            </h2>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" as const }}>
              {arena.stream_id ? (
                <CopyChip text={arena.stream_id} style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)", letterSpacing: "0.08em" }} />
              ) : (
                <span style={{ fontFamily: "var(--font-ibm-plex-mono), monospace", fontSize: "11px", color: "rgba(255,255,255,0.3)", letterSpacing: "0.08em" }}>
                  {t.noStreamId}
                </span>
              )}
              {castPassord && (
                <>
                  <span style={{ color: "rgba(255,255,255,0.2)", fontSize: "11px" }}>·</span>
                  <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.3)" }}>{t.castPassordLabel}</span>
                  <CopyChip text={castPassord} style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)", letterSpacing: "0.08em" }} />
                </>
              )}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <a
              href={`/min-side?admin_arena=${arena.id}`}
              target="_blank"
              rel="noopener noreferrer"
              title={t.openMinSideTitle}
              style={{ background: "none", border: "1px solid rgba(120,190,32,0.3)", borderRadius: "6px", color: "#78BE20", fontSize: "12px", fontWeight: 600, cursor: "pointer", padding: "5px 10px", lineHeight: 1, fontFamily: "var(--font-montserrat), system-ui, sans-serif", letterSpacing: "0.03em", textDecoration: "none", display: "inline-block" }}
            >
              {t.openMinSide}
            </a>
            <button
              onClick={onEdit}
              title={t.editTitle}
              style={{ background: "none", border: "1px solid rgba(51,211,196,0.25)", borderRadius: "6px", color: "rgba(51,211,196,0.7)", fontSize: "12px", fontWeight: 600, cursor: "pointer", padding: "5px 10px", lineHeight: 1, fontFamily: "var(--font-montserrat), system-ui, sans-serif", letterSpacing: "0.03em" }}
            >
              {t.edit}
            </button>
            <button
              onClick={() => setDeleteState("confirm")}
              title={t.deleteTitle}
              style={{ background: "none", border: "1px solid rgba(255,107,74,0.25)", borderRadius: "6px", color: "rgba(255,107,74,0.6)", fontSize: "15px", cursor: "pointer", padding: "4px 9px", lineHeight: 1 }}
            >
              🗑
            </button>
            <button onClick={onClose} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", fontSize: "20px", cursor: "pointer", padding: "4px 8px" }}>✕</button>
          </div>
        </div>

        <div style={{ padding: "28px" }}>

          {/* ── MAP + GEOFENCE EDITOR ── */}
          <div style={{ marginBottom: "28px" }}>
            <PanelLabel>{t.mapGeofenceLabel}</PanelLabel>

            {/* Polygon er en premium-funksjon (årsabonnement) -- kun admin
                tegner den her i dag. Min side viser resultatet, men kan
                ikke selv bytte mellom sirkel/polygon. */}
            {hasCoords && (
              <div style={{ display: "flex", gap: "6px", marginBottom: "12px" }}>
                <button
                  onClick={handleSwitchToSirkel}
                  style={{
                    flex: 1, padding: "8px", borderRadius: "8px", fontSize: "12px", fontWeight: 600, cursor: "pointer",
                    border: geofenceMode === "sirkel" ? "1.5px solid #33D3C4" : "1px solid rgba(255,255,255,0.12)",
                    backgroundColor: geofenceMode === "sirkel" ? "rgba(51,211,196,0.1)" : "rgba(255,255,255,0.04)",
                    color: geofenceMode === "sirkel" ? "#33D3C4" : "rgba(255,255,255,0.5)",
                  }}
                >
                  {t.geofenceModeSirkel}
                </button>
                <button
                  onClick={() => setGeofenceMode("polygon")}
                  style={{
                    flex: 1, padding: "8px", borderRadius: "8px", fontSize: "12px", fontWeight: 600, cursor: "pointer",
                    border: geofenceMode === "polygon" ? "1.5px solid #33D3C4" : "1px solid rgba(255,255,255,0.12)",
                    backgroundColor: geofenceMode === "polygon" ? "rgba(51,211,196,0.1)" : "rgba(255,255,255,0.04)",
                    color: geofenceMode === "polygon" ? "#33D3C4" : "rgba(255,255,255,0.5)",
                  }}
                >
                  {t.geofenceModePolygon}
                </button>
              </div>
            )}

            {hasCoords && geofenceMode === "polygon" ? (
              <>
                <GeofenceMap
                  lat={arena.lat!}
                  lng={arena.lng!}
                  initialPoints={polygonPoints}
                  onChange={setPolygonPoints}
                />
                {polygonError && <p style={{ fontSize: "12px", color: "#D94F4F", marginTop: "10px" }}>✗ {polygonError}</p>}
                {polygonJustSaved && <p style={{ fontSize: "12px", color: "#33D3C4", marginTop: "10px" }}>{t.radiusSaved}</p>}
                <button
                  onClick={handleSavePolygon}
                  disabled={polygonSaving}
                  style={{ ...tealBtnStyle, width: "100%", marginTop: "10px", padding: "9px", fontSize: "13px", opacity: polygonSaving ? 0.6 : 1 }}
                >
                  {polygonSaving ? t.saving : t.saveGeofence}
                </button>
              </>
            ) : hasCoords ? (
              <>
                <div style={{ height: "240px", borderRadius: "10px", overflow: "hidden", border: "1px solid rgba(51,211,196,0.15)", marginBottom: "8px" }}>
                  <ArenaMap
                    lat={arena.lat!}
                    lng={arena.lng!}
                    name={arena.arenanavn}
                    radius={localRadius}
                    onMarkerMove={(lat, lng) => { setPendingLat(lat); setPendingLng(lng); setPosSaved(false); }}
                    resetTrigger={resetTrigger}
                  />
                </div>

                {/* Position save/cancel */}
                {hasPendingPos && (
                  <div style={{ display: "flex", gap: "8px", marginBottom: "10px" }}>
                    <button
                      onClick={handleSavePosition}
                      disabled={posSaving}
                      style={{ flex: 1, ...tealBtnStyle, padding: "8px", fontSize: "12px", opacity: posSaving ? 0.6 : 1 }}
                    >
                      {posSaving ? t.saving : t.savePositionShort}
                    </button>
                    <button
                      onClick={handleCancelPosition}
                      style={{ padding: "8px 14px", background: "none", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "8px", color: "rgba(255,255,255,0.5)", fontSize: "12px", cursor: "pointer", fontFamily: "var(--font-montserrat), system-ui, sans-serif", fontWeight: 600 }}
                    >
                      {t.undo}
                    </button>
                  </div>
                )}
                {posSaved && !hasPendingPos && (
                  <p style={{ fontSize: "12px", color: "#33D3C4", marginBottom: "10px" }}>{t.positionSaved}</p>
                )}

                {/* Radius editor */}
                <div style={{ backgroundColor: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "10px", padding: "14px 16px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
                    <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.45)" }}>{t.radiusLabel}</span>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <input
                        type="number" min={50} max={2000} step={10}
                        value={localRadius}
                        onChange={e => { setLocalRadius(Math.min(2000, Math.max(50, Number(e.target.value)))); setRadiusError(null); setOverlapWarnings([]); }}
                        style={{ width: "72px", backgroundColor: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "6px", padding: "4px 8px", color: "#fff", fontSize: "13px", fontFamily: "var(--font-ibm-plex-mono), monospace", outline: "none", textAlign: "right" }}
                      />
                      <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.4)", fontFamily: "var(--font-ibm-plex-mono), monospace" }}>m</span>
                    </div>
                  </div>
                  <input
                    type="range" min={50} max={2000} step={10}
                    value={localRadius}
                    onChange={e => { setLocalRadius(Number(e.target.value)); setRadiusError(null); setOverlapWarnings([]); }}
                    style={{ width: "100%", accentColor: "#33D3C4", cursor: "pointer", marginBottom: "12px" }}
                  />
                  <div style={{ display: "flex", gap: "0", justifyContent: "space-between", fontSize: "10px", color: "rgba(255,255,255,0.2)", fontFamily: "var(--font-ibm-plex-mono), monospace", marginTop: "-6px", marginBottom: "12px" }}>
                    <span>50m</span><span>500m</span><span>1000m</span><span>1500m</span><span>2000m</span>
                  </div>

                  {overlapWarnings.length > 0 && (
                    <div style={{ backgroundColor: "rgba(255,107,74,0.08)", border: "1px solid rgba(255,107,74,0.22)", borderRadius: "7px", padding: "9px 12px", marginBottom: "10px" }}>
                      {overlapWarnings.map((w, i) => (
                        <p key={i} style={{ fontSize: "12px", color: "rgba(255,255,255,0.65)", margin: i === 0 ? 0 : "4px 0 0", lineHeight: 1.4 }}>
                          {t.overlapWarningPrefix} {w}. {t.overlapWarningSuffix}
                        </p>
                      ))}
                    </div>
                  )}

                  {radiusError && (
                    <p style={{ fontSize: "12px", color: "#D94F4F", marginBottom: "10px" }}>✗ {radiusError}</p>
                  )}

                  {radiusJustSaved && !hasPendingRadius && (
                    <p style={{ fontSize: "12px", color: "#33D3C4", marginBottom: "10px" }}>{t.radiusSaved}</p>
                  )}

                  {hasPendingRadius && (
                    <button
                      onClick={handleSaveRadius}
                      disabled={radiusSaving}
                      style={{ ...tealBtnStyle, width: "100%", padding: "9px", fontSize: "13px", opacity: radiusSaving ? 0.6 : 1 }}
                    >
                      {radiusSaving ? t.saving : t.saveGeofence}
                    </button>
                  )}
                </div>
              </>
            ) : manueltKart ? (
              senterLaster || !manueltSenter ? (
                <div style={{ height: "240px", borderRadius: "10px", border: "1px dashed rgba(255,255,255,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ color: "rgba(255,255,255,0.35)", fontSize: "13px" }}>{t.findingLocation}</span>
                </div>
              ) : (
                <>
                  <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.5)", marginBottom: "8px" }}>
                    {t.addressNotFoundPrefix}{arena.adresse_gate ?? arena.adresse}{t.addressNotFoundSuffix}
                  </p>
                  <div style={{ height: "240px", borderRadius: "10px", overflow: "hidden", border: "1px solid rgba(51,211,196,0.15)", marginBottom: "8px" }}>
                    <ArenaMap
                      lat={pendingLat ?? manueltSenter.lat}
                      lng={pendingLng ?? manueltSenter.lng}
                      zoom={manueltSenter.zoom}
                      name={arena.arenanavn}
                      radius={localRadius}
                      onMarkerMove={(lat, lng) => { setPendingLat(lat); setPendingLng(lng); setPosSaved(false); }}
                      resetTrigger={resetTrigger}
                    />
                  </div>
                  {hasPendingPos ? (
                    <div style={{ display: "flex", gap: "8px", marginBottom: "10px" }}>
                      <button
                        onClick={handleSavePosition}
                        disabled={posSaving}
                        style={{ flex: 1, ...tealBtnStyle, padding: "8px", fontSize: "12px", opacity: posSaving ? 0.6 : 1 }}
                      >
                        {posSaving ? t.saving : t.savePositionBtn}
                      </button>
                      <button
                        onClick={() => { setPendingLat(null); setPendingLng(null); setManueltKart(false); setManueltSenter(null); }}
                        style={{ padding: "8px 14px", background: "none", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "8px", color: "rgba(255,255,255,0.5)", fontSize: "12px", cursor: "pointer", fontFamily: "var(--font-montserrat), system-ui, sans-serif", fontWeight: 600 }}
                      >
                        {t.cancel}
                      </button>
                    </div>
                  ) : (
                    <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.35)", marginBottom: "10px" }}>
                      {t.clickToPlace}
                    </p>
                  )}
                </>
              )
            ) : (
              <div style={{ borderRadius: "10px", border: "1px dashed rgba(255,255,255,0.12)", padding: "20px", textAlign: "center" }}>
                <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "13px", marginBottom: "12px" }}>
                  {t.noCoordinates}
                </p>
                <button
                  onClick={startManuellPlassering}
                  style={{ ...tealBtnStyle, padding: "9px 18px", fontSize: "13px" }}
                >
                  {t.placeManually}
                </button>
              </div>
            )}
          </div>

          {/* ── LOGO ── */}
          <div style={{ marginBottom: "24px" }}>
            <PanelLabel>{t.logoLabel}</PanelLabel>
            {replacingLogo ? (
              <div>
                <LogoUploadField
                  currentUrl={arena.logo_url}
                  preview={logo.preview}
                  uploadError={logo.uploadError}
                  onFile={logo.handleFile}
                  dict={dict}
                />
                <div style={{ display: "flex", gap: "8px", marginTop: "10px" }}>
                  <button
                    onClick={() => { setReplacingLogo(false); logo.reset(); }}
                    style={{ ...ghostBtnStyle, flex: 1, padding: "8px" }}
                  >
                    {t.cancel}
                  </button>
                  <button
                    onClick={handleLogoSave}
                    disabled={!logo.file || logoSaving || !!logo.uploadError}
                    style={{ ...tealBtnStyle, flex: 2, padding: "8px", opacity: (!logo.file || logoSaving) ? 0.5 : 1 }}
                  >
                    {logoSaving ? t.uploadingLogo : t.saveLogo}
                  </button>
                </div>
              </div>
            ) : arena.logo_url ? (
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={arena.logo_url} alt="Arena logo" style={{ height: "56px", maxWidth: "120px", objectFit: "contain", borderRadius: "8px", backgroundColor: "rgba(255,255,255,0.05)", padding: "6px" }} />
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <button onClick={() => setReplacingLogo(true)} style={{ ...ghostBtnStyle, fontSize: "12px", padding: "6px 12px" }}>{t.changeLogo}</button>
                  <button onClick={handleLogoRemove} style={{ background: "none", border: "none", color: "rgba(255,107,74,0.7)", fontSize: "12px", cursor: "pointer", padding: "0", textAlign: "left" }}>{t.removeLogo}</button>
                </div>
              </div>
            ) : (
              <button onClick={() => setReplacingLogo(true)} style={{ ...ghostBtnStyle, width: "100%", padding: "12px", color: "rgba(255,255,255,0.4)" }}>
                {t.uploadLogo}
              </button>
            )}
          </div>

          {/* ── ABONNEMENT / PILOT STATUS ── */}
          <div style={{ marginBottom: "24px" }}>
            <PanelLabel>{t.subscriptionLabel}</PanelLabel>
            <div style={infoCardStyle}>
              {arena.abonnement?.type === "engangsarrangement" ? (
                <>
                  <InfoRow label={t.typeLabel} value={t.typeSingleEvent} valueColor="#78BE20" />
                  {arena.abonnement.periode_start && (
                    <InfoRow label={t.typeStart} value={new Date(arena.abonnement.periode_start).toLocaleDateString(dateLocale)} />
                  )}
                  {arena.abonnement.periode_slutt && (
                    <InfoRow label={t.typeEnd} value={new Date(arena.abonnement.periode_slutt).toLocaleDateString(dateLocale)} />
                  )}
                  {arena.abonnement.pris_per_dag != null && (
                    <InfoRow label={t.pricePerDay} value={`${arena.abonnement.pris_per_dag.toLocaleString(dateLocale)} kr`} mono />
                  )}
                  {arena.abonnement.total_pris != null && (
                    <InfoRow label={t.totalInvoiced} value={`${arena.abonnement.total_pris.toLocaleString(dateLocale)} kr`} valueColor="#78BE20" mono />
                  )}
                </>
              ) : arena.pilot ? (
                <>
                  <InfoRow label={t.typeLabel} value={t.typePilot} valueColor="#33D3C4" />
                  <InfoRow label={t.statusLabel} value={daysLeft! > 0 ? `${daysLeft} ${t.daysLeftSuffix}` : t.expiredLabel} valueColor={daysLeft! > 0 ? "#33D3C4" : "rgba(255,255,255,0.3)"} />
                  <InfoRow label={t.endLabel} value={new Date(arena.pilot.slutt_dato).toLocaleDateString(dateLocale)} />
                </>
              ) : (
                <InfoRow label={t.statusLabel} value={t.inactiveStatus} valueColor="rgba(255,255,255,0.3)" />
              )}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderTop: "1px solid rgba(255,255,255,0.05)", marginTop: "4px" }}>
                <span style={infoLabelStyle}>{t.streamingActiveLabel}</span>
                <button
                  onClick={() => onToggle(arena.id, arena.streaming_aktiv)}
                  style={{
                    width: "44px", height: "24px",
                    backgroundColor: arena.streaming_aktiv ? "#33D3C4" : "rgba(255,255,255,0.1)",
                    border: "none", borderRadius: "100px",
                    cursor: "pointer", position: "relative", transition: "background 0.2s",
                  }}
                >
                  <span style={{
                    position: "absolute", top: "3px",
                    left: arena.streaming_aktiv ? "22px" : "3px",
                    width: "18px", height: "18px",
                    backgroundColor: arena.streaming_aktiv ? "#073E46" : "rgba(255,255,255,0.4)",
                    borderRadius: "50%", transition: "left 0.2s", display: "block",
                  }} />
                </button>
              </div>
            </div>
          </div>

          {/* ── ÅDIENCE OVERSTYRING: test-streaming på eksisterende registrering ── */}
          <div style={{ marginBottom: "24px" }}>
            <PanelLabel>{t.overrideLabel}</PanelLabel>
            <div style={infoCardStyle}>
              <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.4)", lineHeight: 1.5, marginBottom: "14px" }}>
                {t.overrideHelp}
              </p>

              {!arena.stream_id && (
                <div style={{ marginBottom: "14px" }}>
                  <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.45)", marginBottom: "8px" }}>
                    {t.missingIdsHelp}
                  </p>
                  <button onClick={handleGenerateIds} disabled={idGenSaving} style={{ ...ghostBtnStyle, fontSize: "12px", padding: "8px 14px" }}>
                    {idGenSaving ? t.generatingIds : t.generateIds}
                  </button>
                  {idGenError && <p style={{ fontSize: "12px", color: "#D94F4F", marginTop: "6px" }}>{idGenError}</p>}
                </div>
              )}

              <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" as const, alignItems: "flex-end", marginBottom: "10px" }}>
                <div>
                  <label style={{ ...infoLabelStyle, display: "block", marginBottom: "4px" }}>{t.pilotFrom}</label>
                  <input type="date" value={pilotStart} onChange={e => setPilotStart(e.target.value)}
                    style={{ backgroundColor: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "6px", padding: "7px 10px", color: "#fff", fontSize: "13px", fontFamily: "var(--font-ibm-plex-mono), monospace" }} />
                </div>
                <div>
                  <label style={{ ...infoLabelStyle, display: "block", marginBottom: "4px" }}>{t.pilotTo}</label>
                  <input type="date" value={pilotEnd} onChange={e => setPilotEnd(e.target.value)}
                    style={{ backgroundColor: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "6px", padding: "7px 10px", color: "#fff", fontSize: "13px", fontFamily: "var(--font-ibm-plex-mono), monospace" }} />
                </div>
                <button onClick={handleSavePilot} disabled={pilotSaving} style={{ ...tealBtnStyle, padding: "8px 16px", fontSize: "13px" }}>
                  {pilotSaving ? t.saving : arena.pilot ? t.extendPilot : t.openPilot}
                </button>
              </div>
              {pilotError && <p style={{ fontSize: "12px", color: "#D94F4F" }}>{pilotError}</p>}
              {pilotSaved && <p style={{ fontSize: "12px", color: "#33D3C4" }}>{t.pilotSaved}</p>}
              <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.3)", marginTop: "8px" }}>
                {t.activateReminder}
              </p>
            </div>
          </div>

          {/* ── QR-KODE ── */}
          {arena.stream_id && (
            <div style={{ marginBottom: "24px" }}>
              <PanelLabel>{t.qrLabel}</PanelLabel>
              <div style={infoCardStyle}>
                <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.4)", lineHeight: 1.5, marginBottom: "14px" }}>
                  {t.qrHelp}
                </p>
                <button onClick={handleVisQr} disabled={qrGenerating} style={{ ...ghostBtnStyle, fontSize: "12px", padding: "8px 14px" }}>
                  {qrGenerating ? t.generatingQr : t.showGenerateQr}
                </button>
                {qrDataUrl && (
                  <div style={{ marginTop: "16px", textAlign: "center" }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={qrDataUrl} alt="QR" style={{ width: "200px", height: "200px", borderRadius: "8px" }} />
                    <div style={{ marginTop: "10px" }}>
                      <a
                        href={qrDataUrl}
                        download={`adience-qr-${arena.arenanavn.toLowerCase().replace(/\s+/g, "-")}.png`}
                        style={{ color: "#33D3C4", fontSize: "12px", textDecoration: "none" }}
                      >
                        {t.downloadImage}
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── ARENA DETAILS ── */}
          <div style={{ marginBottom: "24px" }}>
            <PanelLabel>{t.detailsLabel}</PanelLabel>
            <div style={infoCardStyle}>
              <InfoRow label={t.category}  value={arena.kategori  ?? "—"} />
              <InfoRow label={t.address}   value={[arena.adresse_gate, arena.postnummer, arena.by].filter(Boolean).join(", ") || "—"} />
              <InfoRow label={t.country}      value={arena.land      ?? "—"} />
              <InfoRow label={t.capacity} value={arena.kapasitet ?? "—"} />
              <InfoRow label={t.orgNumber}    value={arena.org_nummer ?? "—"} mono />
              {hasCoords && <InfoRow label={t.coordinates} value={`${arena.lat?.toFixed(5)}, ${arena.lng?.toFixed(5)}`} mono />}
              <InfoRow label={t.geofence}  value={`${arena.geofence_radius ?? 300}${t.radiusSuffix}`} />
              <InfoRow label={t.registered} value={new Date(arena.opprettet).toLocaleDateString(dateLocale)} />
            </div>
          </div>

          {/* ── ARENA-PROFIL (tekst + forsidebilde, delt med Min side) ── */}
          <div style={{ marginBottom: "24px" }}>
            <PanelLabel>{t.arenaProfileLabel}</PanelLabel>
            <div style={infoCardStyle}>
              <ArenaProfilCard arena={arena} onSaved={() => {}} embedded dict={dict} locale={locale} />
            </div>
          </div>

          {/* ── PAUSE-/VENTEMUSIKK ── */}
          <div style={{ marginBottom: "24px" }}>
            <PanelLabel>{dict.cards.holdmusikk.heading}</PanelLabel>
            <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.4)", marginBottom: "12px" }}>
              {dict.cards.holdmusikk.subtitle}
            </p>
            <div style={infoCardStyle}>
              <HoldmusikkCard
                arena={arena}
                onSaved={() => onArenaUpdated(arena.id, {})}
                embedded
                dict={dict}
              />
            </div>
          </div>

          {/* ── INFO ── */}
          <div style={{ marginBottom: "24px" }}>
            <PanelLabel>{dict.cards.infoTavle.heading}</PanelLabel>
            <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.4)", marginBottom: "12px" }}>
              {dict.cards.infoTavle.subtitle}
            </p>
            <div style={infoCardStyle}>
              <InfoTavleCard arenaId={arena.id} embedded dict={dict} locale={locale} />
            </div>
          </div>

          {/* ── CONTACT ── */}
          {(arena.fornavn || arena.epost) && (
            <div>
              <PanelLabel>{t.contactLabel}</PanelLabel>
              <div style={infoCardStyle}>
                {(arena.fornavn || arena.etternavn) && (
                  <InfoRow label={t.nameLabel} value={[arena.fornavn, arena.etternavn].filter(Boolean).join(" ")} />
                )}
                {arena.epost   && <InfoRow label={t.emailLabel}  value={arena.epost} />}
                {arena.telefon && <InfoRow label={t.phoneLabel} value={arena.telefon} mono />}
              </div>
            </div>
          )}

        </div>
      </div>

      {/* ── DELETE CONFIRM MODAL ── */}
      {deleteState !== "idle" && (
        <div style={{ position: "fixed", inset: 0, zIndex: 102, display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
          <div style={{ backgroundColor: "#1E293B", border: "1px solid rgba(255,107,74,0.35)", borderRadius: "16px", padding: "32px", width: "100%", maxWidth: "400px", boxShadow: "0 24px 64px rgba(0,0,0,0.6)" }}>
            <h3 style={{ fontFamily: "var(--font-montserrat), system-ui, sans-serif", fontWeight: 700, fontSize: "17px", marginBottom: "12px", color: "#fff" }}>
              {t.deleteTitle}
            </h3>
            <p style={{ fontSize: "14px", color: "rgba(255,255,255,0.75)", lineHeight: 1.5, marginBottom: "6px" }}>
              {t.deleteConfirmPrefix} <strong>{arena.arenanavn}</strong>{t.deleteConfirmSuffix}
            </p>
            {arena.pilot && (
              <p style={{ fontSize: "12px", color: "#D94F4F", marginBottom: "6px" }}>
                {t.deleteActivePilotWarning}
              </p>
            )}
            <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.35)", marginBottom: "20px" }}>
              {t.deleteIrreversible}
              {arena.logo_url && ` ${t.deleteLogoNote}`}
            </p>
            {deleteError && (
              <p style={{ fontSize: "12px", color: "#D94F4F", marginBottom: "12px" }}>{deleteError}</p>
            )}
            <div style={{ display: "flex", gap: "10px" }}>
              <button
                onClick={() => { setDeleteState("idle"); setDeleteError(null); }}
                style={{ ...ghostBtnStyle, flex: 1 }}
              >
                {t.cancel}
              </button>
              <button
                onClick={handleDelete}
                disabled={deleteState === "deleting"}
                style={{ flex: 2, backgroundColor: "#FF6B4A", border: "none", borderRadius: "8px", padding: "10px 16px", color: "#fff", fontSize: "14px", fontWeight: 700, cursor: "pointer", opacity: deleteState === "deleting" ? 0.6 : 1, fontFamily: "var(--font-montserrat), system-ui, sans-serif" }}
              >
                {deleteState === "deleting" ? t.deleting : t.deleteConfirm}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ─── LOGO UPLOAD HOOK ─── */

const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/svg+xml", "image/webp"];
const MAX_BYTES = 2 * 1024 * 1024; // 2 MB

function useLogoUpload(dict: Dictionary) {
  const t = dict.admin.logoUploadField;
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  function handleFile(f: File | null) {
    setUploadError(null);
    if (!f) { setFile(null); setPreview(null); return; }
    if (!ACCEPTED_TYPES.includes(f.type)) {
      setUploadError(t.errorType);
      return;
    }
    if (f.size > MAX_BYTES) {
      setUploadError(t.errorSize);
      return;
    }
    setFile(f);
    const reader = new FileReader();
    reader.onload = e => setPreview(e.target?.result as string);
    reader.readAsDataURL(f);
  }

  async function upload(arenaId: string): Promise<string | null> {
    if (!file) return null;
    const ext = file.name.split(".").pop();
    const path = `${arenaId}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("arena-logoer").upload(path, file, { upsert: true });
    if (error) { setUploadError(error.message); return null; }
    const { data } = supabase.storage.from("arena-logoer").getPublicUrl(path);
    return data.publicUrl;
  }

  function reset() { setFile(null); setPreview(null); setUploadError(null); }

  return { file, preview, uploadError, handleFile, upload, reset };
}

/* ─── LOGO UPLOAD FIELD ─── */

function LogoUploadField({
  currentUrl,
  preview,
  uploadError,
  onFile,
  dict,
}: {
  currentUrl?: string | null;
  preview: string | null;
  uploadError: string | null;
  onFile: (f: File | null) => void;
  dict: Dictionary;
}) {
  const t = dict.admin.logoUploadField;
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const display = preview ?? currentUrl ?? null;

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDragging(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
    const f = e.dataTransfer.files?.[0] ?? null;
    onFile(f);
  }

  const borderColor = dragging ? "#33D3C4" : uploadError ? "rgba(255,107,74,0.6)" : "rgba(255,255,255,0.14)";
  const bgColor = dragging ? "rgba(51,211,196,0.07)" : "rgba(255,255,255,0.03)";

  return (
    <div>
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        style={{
          width: "100%", height: "100px", borderRadius: "10px",
          border: `2px dashed ${borderColor}`,
          backgroundColor: bgColor,
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          gap: "8px", cursor: "pointer", position: "relative", overflow: "hidden",
          transition: "border-color 0.15s, background-color 0.15s",
        }}
        onMouseEnter={e => { if (!dragging) (e.currentTarget as HTMLElement).style.borderColor = "#33D3C4"; }}
        onMouseLeave={e => { if (!dragging) (e.currentTarget as HTMLElement).style.borderColor = borderColor; }}
      >
        {display ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={display} alt="Logo preview" style={{ maxHeight: "86px", maxWidth: "100%", objectFit: "contain", borderRadius: "6px" }} />
        ) : (
          <>
            <span style={{ fontSize: "22px", opacity: 0.35 }}>🖼</span>
            <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.35)" }}>{t.clickToUpload}</span>
            <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.2)" }}>{t.formatHint}</span>
          </>
        )}
        {display && (
          <div style={{
            position: "absolute", inset: 0,
            backgroundColor: "rgba(7,62,70,0.6)", opacity: 0,
            display: "flex", alignItems: "center", justifyContent: "center",
            transition: "opacity 0.15s", borderRadius: "8px",
          }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = "1"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = "0"; }}
          >
            <span style={{ color: "#33D3C4", fontSize: "13px", fontWeight: 600 }}>{t.changeLogo}</span>
          </div>
        )}
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_TYPES.join(",")}
          style={{ display: "none" }}
          onChange={e => onFile(e.target.files?.[0] ?? null)}
        />
      </div>
      {uploadError && (
        <p style={{ color: "#D94F4F", fontSize: "12px", marginTop: "6px" }}>{uploadError}</p>
      )}
      {preview && (
        <button
          type="button"
          onClick={e => { e.stopPropagation(); onFile(null); }}
          style={{ background: "none", border: "none", color: "rgba(255,255,255,0.3)", fontSize: "12px", cursor: "pointer", padding: "4px 0", marginTop: "2px" }}
        >
          {t.removeSelected}
        </button>
      )}
    </div>
  );
}

/* ─── ADD ARENA MODAL ─── */

function AddArenaModal({ onClose, onSaved, arena: editingArena, dict }: {
  onClose: () => void;
  onSaved: (updated?: Arena) => void;
  arena?: ArenaWithPilot;
  dict: Dictionary;
}) {
  const t = dict.admin.addArenaModal;
  const isEdit = !!editingArena;

  const [form, setForm] = useState({
    arenanavn:    editingArena?.arenanavn    ?? "",
    kategori:     editingArena?.kategori     ?? "",
    land:         editingArena?.land         ?? "Norge",
    org_nummer:   editingArena?.org_nummer   ?? "",
    kapasitet:    editingArena?.kapasitet    ?? "",
    adresse_gate: editingArena?.adresse_gate ?? "",
    postnummer:   editingArena?.postnummer   ?? "",
    by:           editingArena?.by           ?? "",
    fornavn:      editingArena?.fornavn      ?? "",
    etternavn:    editingArena?.etternavn    ?? "",
    telefon:      editingArena?.telefon      ?? "",
    epost:        editingArena?.epost        ?? "",
    geofence_radius: editingArena?.geofence_radius ?? 300,
  });
  const [manualLat, setManualLat] = useState(editingArena?.lat?.toFixed(6) ?? "");
  const [manualLng, setManualLng] = useState(editingArena?.lng?.toFixed(6) ?? "");
  const [showManual, setShowManual] = useState(isEdit && editingArena?.lat != null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const logo = useLogoUpload(dict);
  const geo = useGeocoder();

  // When editing, prime the geocoder with existing coords so it starts in "found" state
  useEffect(() => {
    if (isEdit && editingArena?.lat != null && editingArena?.lng != null) {
      geo.setManual(editingArena.lat, editingArena.lng);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value } = e.target;
    setForm(prev => {
      const next = { ...prev, [name]: value };
      if (["adresse_gate", "postnummer", "by", "land"].includes(name)) {
        geo.schedule(
          name === "adresse_gate" ? value : next.adresse_gate,
          name === "postnummer"   ? value : next.postnummer,
          name === "by"           ? value : next.by,
        );
      }
      return next;
    });
  }

  // Sync manual fields when geocoder finds coords
  useEffect(() => {
    if (geo.status === "found" && geo.lat != null && geo.lng != null) {
      setManualLat(geo.lat.toFixed(6));
      setManualLng(geo.lng.toFixed(6));
    }
  }, [geo.status, geo.lat, geo.lng]);

  function handleManualCoord(field: "lat" | "lng", value: string) {
    if (field === "lat") setManualLat(value);
    else setManualLng(value);
    const lat = field === "lat" ? parseFloat(value) : parseFloat(manualLat);
    const lng = field === "lng" ? parseFloat(value) : parseFloat(manualLng);
    geo.setManual(isNaN(lat) ? null : lat, isNaN(lng) ? null : lng);
  }

  // Motsatt vei av adressesøket: når admin drar/klikker en nål i kartet (f.eks.
  // for et sted uten formell gateadresse, som "Bjerke Travbane"), slå opp
  // nærmeste adresse og fyll ut tekstfeltene fra punktet. setForm her (ikke
  // via handleChange) treffer ikke onChange-lytteren, så dette re-trigger
  // ikke et nytt fritekstsøk som kunne dratt nålen vekk fra der brukeren
  // faktisk klikket.
  function handleMapPinMove(lat: number, lng: number) {
    geo.setManual(lat, lng);
    setManualLat(lat.toFixed(6));
    setManualLng(lng.toFixed(6));
    naermesteAdresse(lat, lng).then(treff => {
      if (!treff) return;
      setForm(prev => ({
        ...prev,
        adresse_gate: treff.adressetekst,
        postnummer: treff.postnummer,
        by: treff.poststed,
      }));
    });
  }

  const [modalOverlapWarnings, setModalOverlapWarnings] = useState<string[]>([]);

  // Validation warnings (non-blocking)
  const epostWarn = form.epost.length > 0 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.epost)
    ? t.epostWarn
    : null;
  const postnrWarn = form.land === "Norge" && form.postnummer.length > 0 && !/^\d{4}$/.test(form.postnummer)
    ? t.postnrWarn
    : null;
  const gateWarn = form.adresse_gate.length > 0 && /^\d+$/.test(form.adresse_gate.trim())
    ? t.gateWarn
    : null;
  const noCoordWarn = (geo.status === "not_found" || geo.status === "error") && !geo.lat
    ? t.noCoordWarn
    : null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (logo.uploadError || postnrWarn) return;
    setSaving(true);
    setError("");

    const adresse = [form.adresse_gate, form.postnummer, form.by].filter(Boolean).join(", ") || null;

    // Overlap check — non-blocking, just surfaces warnings before save
    if (geo.lat && geo.lng && form.kategori) {
      const query = supabase
        .from("arenaer")
        .select("arenanavn, kategori, lat, lng, geofence_radius")
        .eq("kategori", form.kategori);
      if (isEdit) query.neq("id", editingArena!.id);
      const { data: peers } = await query;
      const overlaps = (peers ?? [])
        .filter((o) => o.lat != null && o.lng != null)
        .filter((o) => haversineDistance(geo.lat!, geo.lng!, o.lat, o.lng) < form.geofence_radius + (o.geofence_radius ?? 300))
        .map((o) => `«${o.arenanavn}» (${o.kategori})`);
      setModalOverlapWarnings(overlaps);
    }

    const payload = {
      arenanavn:       form.arenanavn,
      kategori:        form.kategori   || null,
      land:            form.land       || null,
      org_nummer:      form.org_nummer || null,
      kapasitet:       form.kapasitet  || null,
      adresse_gate:    form.adresse_gate || null,
      postnummer:      form.postnummer   || null,
      by:              form.by           || null,
      adresse,
      lat:             geo.lat,
      lng:             geo.lng,
      geofence_radius: form.geofence_radius,
      fornavn:         form.fornavn   || null,
      etternavn:       form.etternavn || null,
      telefon:         form.telefon   || null,
      epost:           form.epost     || null,
    };

    if (isEdit) {
      // ── UPDATE ──
      let logo_url = editingArena!.logo_url;
      if (logo.file) {
        const uploaded = await logo.upload(editingArena!.id);
        if (uploaded) {
          logo_url = uploaded;
        } else {
          setError(logo.uploadError ?? t.logoUploadFailedGeneric);
          setSaving(false);
          return;
        }
      }

      const { data: updated, error: updateErr } = await supabase
        .from("arenaer")
        .update({ ...payload, logo_url })
        .eq("id", editingArena!.id)
        // ARENA_SELECT_COLUMNS, ikke select("*") — cast_passord er sperret
        // for SELECT for authenticated/anon, og en select("*") etter update
        // gjør at PostgREST avviser HELE spørringen med "permission denied
        // for table arenaer" i stedet for å bare utelate den ene kolonnen.
        .select(ARENA_SELECT_COLUMNS)
        .single();

      if (updateErr) {
        setError(updateErr.message);
        setSaving(false);
        return;
      }
      onSaved(updated ?? undefined);
    } else {
      // ── INSERT ──
      const { data: inserted, error: insertErr } = await supabase.from("arenaer").insert({
        ...payload,
        stream_id:       generateStreamId(),
        streaming_aktiv: false,
      }).select("id").single();

      if (insertErr) {
        setError(insertErr.code === "23505" ? t.duplicateOrgError : insertErr.message);
        setSaving(false);
        return;
      }

      if (logo.file && inserted) {
        const publicUrl = await logo.upload(inserted.id);
        if (publicUrl) {
          await supabase.from("arenaer").update({ logo_url: publicUrl }).eq("id", inserted.id);
        } else {
          setError(logo.uploadError ?? t.logoUploadFailedButSaved);
          setSaving(false);
          return;
        }
      }

      onSaved();
    }
  }

  const inputFocus = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => { e.target.style.borderColor = "#33D3C4"; };
  const inputBlur  = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => { e.target.style.borderColor = "rgba(255,255,255,0.12)"; };

  return (
    <div style={modalOverlayStyle} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ ...modalBoxStyle, maxWidth: "520px", maxHeight: "92vh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
          <h2 style={{ fontFamily: "var(--font-montserrat), system-ui, sans-serif", fontWeight: 700, fontSize: "18px" }}>
            {isEdit ? `${t.editTitlePrefix} ${editingArena!.arenanavn}` : t.addTitle}
          </h2>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", fontSize: "18px", cursor: "pointer", padding: "4px 8px" }}>✕</button>
        </div>

        {!isEdit && (
          <div style={{ backgroundColor: "rgba(217,79,79,0.08)", border: "1px solid rgba(217,79,79,0.2)", borderRadius: "8px", padding: "12px 16px", marginBottom: "20px" }}>
            <p style={{ color: "rgba(255,255,255,0.6)", fontSize: "13px", lineHeight: 1.5, margin: 0 }}>
              <span style={{ color: "#D94F4F", fontWeight: 600 }}>{t.noPilotWarningStrong}</span>{" "}
              {t.noPilotWarningRestPrefix}{" "}
              <a href="/registrer" style={{ color: "#33D3C4" }}>/registrer</a>.
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* ─ Arenainformasjon ─ */}
          <ModalField label={t.fieldArenanavn}>
            <input name="arenanavn" value={form.arenanavn} onChange={handleChange} required placeholder={t.arenanavnPlaceholder} style={inputStyle} onFocus={inputFocus} onBlur={inputBlur} />
          </ModalField>
          <ModalField label={t.fieldKategori}>
            <select name="kategori" value={form.kategori} onChange={handleChange} style={{ ...inputStyle, appearance: "none", cursor: "pointer" }} onFocus={inputFocus} onBlur={inputBlur}>
              <option value="">{t.placeholderKategori}</option>
              {KATEGORIER.map(k => <option key={k} value={k}>{k}</option>)}
            </select>
          </ModalField>
          <ModalField label={t.fieldLand}>
            <select name="land" value={form.land} onChange={handleChange} style={{ ...inputStyle, appearance: "none", cursor: "pointer" }} onFocus={inputFocus} onBlur={inputBlur}>
              {LAND.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </ModalField>
          <ModalField label={t.fieldOrgNummer}>
            <input name="org_nummer" value={form.org_nummer} onChange={handleChange} placeholder={t.orgNummerPlaceholder} style={inputStyle} onFocus={inputFocus} onBlur={inputBlur} />
          </ModalField>
          <ModalField label={t.fieldKapasitet}>
            <select name="kapasitet" value={form.kapasitet} onChange={handleChange} style={{ ...inputStyle, appearance: "none", cursor: "pointer" }} onFocus={inputFocus} onBlur={inputBlur}>
              <option value="">{t.placeholderKapasitet}</option>
              {["Under 500", "500–2000", "2000–5000", "5000–15000", "15000+"].map(k => <option key={k} value={k}>{k}</option>)}
            </select>
          </ModalField>

          {/* ─ Kontaktperson ─ */}
          <div style={{ margin: "20px 0 8px", borderTop: "1px solid rgba(255,255,255,0.07)", paddingTop: "20px" }}>
            <span style={{ fontSize: "11px", letterSpacing: "0.1em", color: "rgba(255,255,255,0.3)", textTransform: "uppercase" as const, fontFamily: "var(--font-ibm-plex-mono), monospace" }}>
              {t.sectionContact}
            </span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            <ModalField label={t.fieldFornavn}>
              <input name="fornavn" value={form.fornavn} onChange={handleChange} placeholder={t.fornavnPlaceholder} style={inputStyle} onFocus={inputFocus} onBlur={inputBlur} />
            </ModalField>
            <ModalField label={t.fieldEtternavn}>
              <input name="etternavn" value={form.etternavn} onChange={handleChange} placeholder={t.etternavnPlaceholder} style={inputStyle} onFocus={inputFocus} onBlur={inputBlur} />
            </ModalField>
          </div>
          <ModalField label={t.fieldTelefon}>
            <input name="telefon" value={form.telefon} onChange={handleChange} placeholder={t.telefonPlaceholder} type="tel" style={inputStyle} onFocus={inputFocus} onBlur={inputBlur} />
          </ModalField>
          <ModalField label={t.fieldEpost}>
            <input
              name="epost" value={form.epost} onChange={handleChange}
              placeholder={t.epostPlaceholder} type="email"
              style={{ ...inputStyle, borderColor: epostWarn ? "rgba(255,107,74,0.5)" : "rgba(255,255,255,0.12)" }}
              onFocus={inputFocus} onBlur={inputBlur}
            />
            {epostWarn && <p style={{ color: "#D94F4F", fontSize: "12px", marginTop: "4px" }}>{epostWarn}</p>}
          </ModalField>

          {/* ─ Adresse ─ */}
          <div style={{ margin: "20px 0 8px", borderTop: "1px solid rgba(255,255,255,0.07)", paddingTop: "20px" }}>
            <span style={{ fontSize: "11px", letterSpacing: "0.1em", color: "rgba(255,255,255,0.3)", textTransform: "uppercase" as const, fontFamily: "var(--font-ibm-plex-mono), monospace" }}>
              {t.sectionAddress}
            </span>
          </div>

          <ModalField label={t.fieldGateadresse}>
            <input
              name="adresse_gate" value={form.adresse_gate} onChange={handleChange}
              placeholder={t.gateadressePlaceholder}
              style={{ ...inputStyle, borderColor: gateWarn ? "rgba(255,107,74,0.5)" : "rgba(255,255,255,0.12)" }}
              onFocus={inputFocus} onBlur={inputBlur}
            />
            {gateWarn && <p style={{ color: "#D94F4F", fontSize: "12px", marginTop: "4px" }}>{gateWarn}</p>}
          </ModalField>

          <div style={{ display: "grid", gridTemplateColumns: "140px 1fr", gap: "10px" }}>
            <ModalField label={t.fieldPostnummer}>
              <input
                name="postnummer" value={form.postnummer} onChange={handleChange}
                placeholder={t.postnummerPlaceholder} maxLength={6}
                style={{ ...inputStyle, borderColor: postnrWarn ? "rgba(255,107,74,0.5)" : "rgba(255,255,255,0.12)" }}
                onFocus={inputFocus} onBlur={inputBlur}
              />
              {postnrWarn && <p style={{ color: "#D94F4F", fontSize: "12px", marginTop: "4px" }}>{postnrWarn}</p>}
            </ModalField>
            <ModalField label={t.fieldBy}>
              <input name="by" value={form.by} onChange={handleChange} placeholder={t.byPlaceholder} style={inputStyle} onFocus={inputFocus} onBlur={inputBlur} />
            </ModalField>
          </div>

          {/* ─ Geocoding status ─ */}
          {geo.status !== "idle" && (
            <div style={{
              borderRadius: "8px", padding: "10px 14px", marginBottom: "12px", fontSize: "13px",
              backgroundColor: geo.status === "found"     ? "rgba(51,211,196,0.08)"
                             : geo.status === "loading"   ? "rgba(255,255,255,0.04)"
                             : "rgba(255,107,74,0.08)",
              border: `1px solid ${geo.status === "found" ? "rgba(51,211,196,0.25)" : geo.status === "loading" ? "rgba(255,255,255,0.1)" : "rgba(255,107,74,0.25)"}`,
              display: "flex", alignItems: "flex-start", gap: "10px",
            }}>
              <span style={{ fontSize: "15px", flexShrink: 0, marginTop: "1px" }}>
                {geo.status === "found" ? "✓" : geo.status === "loading" ? "…" : "⚠"}
              </span>
              <div>
                {geo.status === "loading" && <span style={{ color: "rgba(255,255,255,0.5)" }}>{t.geoLoading}</span>}
                {geo.status === "found" && (
                  <>
                    <span style={{ color: "#33D3C4", fontWeight: 600 }}>{t.geoFound}</span>
                    <span style={{ color: "rgba(255,255,255,0.45)", display: "block", fontSize: "12px", marginTop: "2px", lineHeight: 1.4 }}>
                      {geo.displayName}
                    </span>
                    <span style={{ color: "rgba(51,211,196,0.7)", fontSize: "11px", fontFamily: "var(--font-ibm-plex-mono), monospace", marginTop: "4px", display: "block" }}>
                      {geo.lat?.toFixed(5)}, {geo.lng?.toFixed(5)}
                    </span>
                  </>
                )}
                {(geo.status === "not_found" || geo.status === "error") && (
                  <span style={{ color: "rgba(255,255,255,0.6)" }}>
                    {geo.status === "not_found" ? t.geoNotFound : t.geoError}{" "}
                    {t.geoRequiresCoords}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* ─ Manual coord fallback ─ */}
          {(geo.status === "not_found" || geo.status === "error" || showManual) && (
            <div>
              {!showManual && (
                <button type="button" onClick={() => setShowManual(true)}
                  style={{ background: "none", border: "none", color: "#33D3C4", fontSize: "13px", cursor: "pointer", padding: "0 0 12px", textDecoration: "underline" }}>
                  {t.manualCoordsToggle}
                </button>
              )}
              {showManual && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "12px" }}>
                  <ModalField label={t.fieldLat}>
                    <input
                      value={manualLat} onChange={e => handleManualCoord("lat", e.target.value)}
                      placeholder="59.91273" style={inputStyle} onFocus={inputFocus} onBlur={inputBlur}
                    />
                  </ModalField>
                  <ModalField label={t.fieldLng}>
                    <input
                      value={manualLng} onChange={e => handleManualCoord("lng", e.target.value)}
                      placeholder="10.74609" style={inputStyle} onFocus={inputFocus} onBlur={inputBlur}
                    />
                  </ModalField>
                </div>
              )}
            </div>
          )}
          {!showManual && geo.status === "found" && (
            <button type="button" onClick={() => setShowManual(true)}
              style={{ background: "none", border: "none", color: "rgba(255,255,255,0.25)", fontSize: "12px", cursor: "pointer", padding: "0 0 12px", display: "block" }}>
              {t.overrideCoordsToggle}
            </button>
          )}

          {noCoordWarn && (
            <div style={{ backgroundColor: "rgba(255,107,74,0.08)", border: "1px solid rgba(255,107,74,0.2)", borderRadius: "8px", padding: "10px 14px", fontSize: "12px", color: "rgba(255,255,255,0.6)", marginBottom: "12px" }}>
              ⚠ {noCoordWarn}
            </div>
          )}

          {/* ─ Kart — vises alltid, også før noen adresse er slått opp, slik at
              steder uten formell gateadresse (f.eks. "Bjerke Travbane") kan
              plasseres direkte i kartet i stedet for via tekstsøk. Toveis:
              skriv adresse → kartet flytter seg (handleChange → geo.schedule);
              dra/klikk nålen → nærmeste adresse fylles inn i feltene
              (handleMapPinMove, omvendt oppslag). Kartet sentreres automatisk
              på nytt punkt hver gang lat/lng endres. */}
          <div style={{ height: "220px", borderRadius: "10px", overflow: "hidden", border: "1px solid rgba(51,211,196,0.15)", marginBottom: "8px" }}>
            <ArenaMap
              lat={geo.lat ?? 59.9139}
              lng={geo.lng ?? 10.7522}
              name={form.arenanavn || t.mapUnnamedArena}
              radius={form.geofence_radius}
              onMarkerMove={handleMapPinMove}
            />
          </div>
          {geo.lat == null && (
            <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.35)", marginBottom: "12px" }}>
              {t.mapPlacePinHint}
            </p>
          )}

          {/* Geofence radius */}
          <ModalField label={t.fieldGeofenceRadius}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <input
                type="range" min={50} max={2000} step={10}
                value={form.geofence_radius}
                onChange={e => setForm(prev => ({ ...prev, geofence_radius: Number(e.target.value) }))}
                style={{ flex: 1, accentColor: "#33D3C4", cursor: "pointer" }}
              />
              <div style={{ display: "flex", alignItems: "center", gap: "4px", flexShrink: 0 }}>
                <input
                  type="number" min={50} max={2000} step={10}
                  value={form.geofence_radius}
                  onChange={e => setForm(prev => ({ ...prev, geofence_radius: Math.min(2000, Math.max(50, Number(e.target.value))) }))}
                  style={{ width: "64px", backgroundColor: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "6px", padding: "8px", color: "#fff", fontSize: "13px", fontFamily: "var(--font-ibm-plex-mono), monospace", outline: "none", textAlign: "right" }}
                />
                <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.4)", fontFamily: "var(--font-ibm-plex-mono), monospace" }}>m</span>
              </div>
            </div>
          </ModalField>

          {modalOverlapWarnings.length > 0 && (
            <div style={{ backgroundColor: "rgba(255,107,74,0.08)", border: "1px solid rgba(255,107,74,0.22)", borderRadius: "8px", padding: "10px 14px", marginBottom: "12px" }}>
              {modalOverlapWarnings.map((w, i) => (
                <p key={i} style={{ fontSize: "12px", color: "rgba(255,255,255,0.65)", margin: i === 0 ? 0 : "4px 0 0", lineHeight: 1.4 }}>
                  {t.overlapWarningPrefix} {w}. {t.overlapWarningSuffix}
                </p>
              ))}
            </div>
          )}

          {/* ─ Logo ─ */}
          <div style={{ margin: "4px 0 8px", borderTop: "1px solid rgba(255,255,255,0.07)", paddingTop: "20px" }}>
            <span style={{ fontSize: "11px", letterSpacing: "0.1em", color: "rgba(255,255,255,0.3)", textTransform: "uppercase" as const, fontFamily: "var(--font-ibm-plex-mono), monospace" }}>
              {t.sectionLogo}
            </span>
          </div>
          <ModalField label="">
            <LogoUploadField
              currentUrl={isEdit ? (logo.preview ? undefined : editingArena!.logo_url) : undefined}
              preview={logo.preview}
              uploadError={logo.uploadError}
              onFile={logo.handleFile}
              dict={dict}
            />
            {isEdit && editingArena!.logo_url && !logo.file && (
              <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.3)", marginTop: "6px" }}>
                {t.existingLogoKept}
              </p>
            )}
          </ModalField>

          {error && (
            <div style={{ backgroundColor: "rgba(255,107,74,0.1)", border: "1px solid rgba(255,107,74,0.3)", borderRadius: "8px", padding: "10px 14px", fontSize: "13px", color: "rgba(255,255,255,0.8)", marginBottom: "16px" }}>
              {error}
            </div>
          )}

          <div style={{ display: "flex", gap: "12px", marginTop: "8px" }}>
            <button type="button" onClick={onClose} style={{ ...ghostBtnStyle, flex: 1, padding: "12px" }}>{t.cancel}</button>
            <button type="submit" disabled={saving || !!logo.uploadError || !!postnrWarn} style={{ ...tealBtnStyle, flex: 2, opacity: saving ? 0.7 : 1 }}>
              {saving ? t.saving : isEdit ? t.saveChanges : t.addArena}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─── SMALL COMPONENTS ─── */

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ backgroundColor: "#1E293B", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "12px", padding: "24px 28px" }}>
      <div style={{ fontFamily: "var(--font-ibm-plex-mono), monospace", fontSize: "36px", fontWeight: 500, color, marginBottom: "4px", letterSpacing: "-0.02em" }}>
        {value}
      </div>
      <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "12px", letterSpacing: "0.06em", textTransform: "uppercase" as const }}>
        {label}
      </div>
    </div>
  );
}

function PanelLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontFamily: "var(--font-ibm-plex-mono), monospace", fontSize: "11px", letterSpacing: "0.12em", color: "rgba(255,255,255,0.3)", textTransform: "uppercase" as const, marginBottom: "10px" }}>
      {children}
    </div>
  );
}

function InfoRow({ label, value, valueColor, mono }: { label: string; value: string; valueColor?: string; mono?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
      <span style={infoLabelStyle}>{label}</span>
      <span style={{ fontSize: "13px", color: valueColor ?? "rgba(255,255,255,0.7)", fontFamily: mono ? "var(--font-ibm-plex-mono), monospace" : "inherit", textAlign: "right", maxWidth: "60%" }}>
        {value}
      </span>
    </div>
  );
}

function ModalField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: "16px" }}>
      <label style={{ display: "block", fontSize: "13px", fontWeight: 500, color: "rgba(255,255,255,0.6)", marginBottom: "7px" }}>{label}</label>
      {children}
    </div>
  );
}

/* ─── STYLES ─── */

const pageStyle: React.CSSProperties = { backgroundColor: "#073E46", minHeight: "100vh", color: "#ffffff", fontFamily: "var(--font-inter), system-ui, sans-serif", position: "relative" };
const headerStyle: React.CSSProperties = { borderBottom: "1px solid rgba(51,211,196,0.1)", backgroundColor: "rgba(7,62,70,0.95)", position: "sticky", top: 0, zIndex: 50 };
const headerInner: React.CSSProperties = { maxWidth: "1280px", margin: "0 auto", padding: "0 24px", height: "60px", display: "flex", alignItems: "center", justifyContent: "space-between" };
const bodyStyle: React.CSSProperties = { maxWidth: "1280px", margin: "0 auto", padding: "40px 24px 80px" };
const statsGrid: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px", marginBottom: "28px" };
const toolbarStyle: React.CSSProperties = { display: "flex", gap: "12px", alignItems: "center", justifyContent: "space-between", marginBottom: "16px", flexWrap: "wrap" as const };
const tableStyle: React.CSSProperties = { width: "100%", borderCollapse: "collapse", backgroundColor: "#1E293B", borderRadius: "12px", overflow: "hidden", border: "1px solid rgba(255,255,255,0.06)" };
const theadRowStyle: React.CSSProperties = { borderBottom: "1px solid rgba(255,255,255,0.08)", backgroundColor: "rgba(255,255,255,0.03)" };
const thStyle: React.CSSProperties = { padding: "14px 20px", textAlign: "left", fontSize: "11px", fontWeight: 600, color: "rgba(255,255,255,0.4)", letterSpacing: "0.08em", textTransform: "uppercase" as const, whiteSpace: "nowrap" as const };
const tdStyle: React.CSSProperties = { padding: "14px 20px", borderBottom: "1px solid rgba(255,255,255,0.04)", verticalAlign: "middle" };
const infoCardStyle: React.CSSProperties = { backgroundColor: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "10px", padding: "4px 16px" };
const infoLabelStyle: React.CSSProperties = { fontSize: "12px", color: "rgba(255,255,255,0.35)", letterSpacing: "0.03em" };
const cardStyle: React.CSSProperties = { backgroundColor: "#1E293B", border: "1px solid rgba(51,211,196,0.12)", borderRadius: "16px", padding: "36px" };
const modalOverlayStyle: React.CSSProperties = { position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: "24px" };
const modalBoxStyle: React.CSSProperties = { backgroundColor: "#1E293B", border: "1px solid rgba(51,211,196,0.2)", borderRadius: "16px", padding: "36px", width: "100%", maxWidth: "480px", color: "#ffffff" };
const inputStyle: React.CSSProperties = { width: "100%", backgroundColor: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "8px", padding: "12px 16px", color: "#ffffff", fontSize: "15px", outline: "none", fontFamily: "var(--font-inter), system-ui, sans-serif", transition: "border-color 0.2s" };
const pageHeadingStyle: React.CSSProperties = { fontFamily: "var(--font-montserrat), system-ui, sans-serif", fontWeight: 800, fontSize: "28px", letterSpacing: "-0.02em" };
const fieldLabelStyle: React.CSSProperties = { display: "block", fontSize: "13px", fontWeight: 500, color: "rgba(255,255,255,0.6)", marginBottom: "8px", letterSpacing: "0.03em" };
const emptyStyle: React.CSSProperties = { textAlign: "center", padding: "80px 0", color: "rgba(255,255,255,0.3)", fontFamily: "var(--font-ibm-plex-mono), monospace", fontSize: "14px" };
const ghostBtnStyle: React.CSSProperties = { backgroundColor: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "8px", padding: "10px 16px", color: "rgba(255,255,255,0.6)", fontSize: "13px", cursor: "pointer", fontFamily: "var(--font-inter), system-ui, sans-serif" };
const outlineCoralBtnStyle: React.CSSProperties = { backgroundColor: "rgba(255,107,74,0.1)", border: "1px solid rgba(255,107,74,0.3)", borderRadius: "8px", padding: "10px 16px", color: "#D94F4F", fontSize: "13px", fontWeight: 600, cursor: "pointer", fontFamily: "var(--font-inter), system-ui, sans-serif" };
const coralBtnStyle: React.CSSProperties = { width: "100%", backgroundColor: "#FF6B4A", color: "#ffffff", border: "none", borderRadius: "8px", padding: "14px", fontSize: "15px", fontWeight: 700, fontFamily: "var(--font-montserrat), system-ui, sans-serif", cursor: "pointer", letterSpacing: "0.03em" };
const tealBtnStyle: React.CSSProperties = { backgroundColor: "#33D3C4", border: "none", borderRadius: "8px", padding: "12px 20px", color: "#073E46", fontSize: "14px", fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-montserrat), system-ui, sans-serif", letterSpacing: "0.03em" };
