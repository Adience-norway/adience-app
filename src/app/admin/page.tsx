"use client";

import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import { supabase, type Arena, type PilotPeriode } from "@/lib/supabase";

const ArenaMap = dynamic(() => import("./_components/ArenaMap"), { ssr: false });

/* ─── CONSTANTS ─── */

const ADMIN_PASSWORD = "Hamar2019";

const KATEGORIER = [
  "Indoor Sports Venue", "Outdoor Sports Venue", "Indoor Cultural Venue",
  "Outdoor Cultural Venue", "Cultural Center", "Theatre", "Opera House",
  "Festival", "Podcast", "Live", "Other",
];
const LAND = ["Norge", "Sverige", "Danmark", "Finland", "Spania", "Tyskland", "UK", "Annet"];

function generateStreamId(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const random = Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  return `ADC${random}${Date.now().toString().slice(-6)}`;
}

type ArenaWithPilot = Arena & { pilot: PilotPeriode | null };

/* ─── ROOT ─── */

export default function AdminPage() {
  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState("");
  const [pwError, setPwError] = useState(false);

  function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) setAuthed(true);
    else { setPwError(true); setPassword(""); }
  }

  if (!authed) return <LoginScreen password={password} setPassword={setPassword} onSubmit={handleLogin} error={pwError} />;
  return <Dashboard />;
}

/* ─── LOGIN ─── */

function LoginScreen({ password, setPassword, onSubmit, error }: {
  password: string;
  setPassword: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  error: boolean;
}) {
  return (
    <div style={pageStyle}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
        <div style={{ width: "100%", maxWidth: "380px", padding: "24px" }}>
          <div style={{ textAlign: "center", marginBottom: "40px" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="ÅDIENCE" style={{ height: "36px", width: "auto", margin: "0 auto 24px" }} />
            <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "14px" }}>Admin-panel</p>
          </div>
          <form onSubmit={onSubmit} style={cardStyle}>
            <label style={fieldLabelStyle}>Passord</label>
            <input
              type="password"
              autoFocus
              value={password}
              onChange={e => setPassword(e.target.value)}
              style={{ ...inputStyle, borderColor: error ? "rgba(255,107,74,0.6)" : "rgba(255,255,255,0.12)" }}
              placeholder="••••••••••"
              onFocus={e => { e.target.style.borderColor = "#21D4BD"; e.target.style.boxShadow = "0 0 0 3px rgba(33,212,189,0.15)"; }}
              onBlur={e => { e.target.style.borderColor = error ? "rgba(255,107,74,0.6)" : "rgba(255,255,255,0.12)"; e.target.style.boxShadow = "none"; }}
            />
            {error && <p style={{ color: "#FF6B4A", fontSize: "13px", marginTop: "8px" }}>Feil passord. Prøv igjen.</p>}
            <button type="submit" style={{ ...coralBtnStyle, marginTop: "20px" }}>Logg inn</button>
          </form>
        </div>
      </div>
    </div>
  );
}

/* ─── DASHBOARD ─── */

function Dashboard() {
  const [arenaer, setArenaer]       = useState<ArenaWithPilot[]>([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [selected, setSelected]     = useState<ArenaWithPilot | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data: arenaData } = await supabase.from("arenaer").select("*").order("opprettet", { ascending: false });
    const { data: pilotData }  = await supabase.from("pilot_perioder").select("*");
    if (arenaData) {
      setArenaer(arenaData.map((a: Arena) => ({
        ...a,
        pilot: pilotData?.find((p: PilotPeriode) => p.arena_id === a.id) ?? null,
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
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="ÅDIENCE" style={{ height: "28px", width: "auto" }} />
            <div style={{ width: "1px", height: "20px", backgroundColor: "rgba(255,255,255,0.15)" }} />
            <span style={{ fontFamily: "var(--font-roboto-mono), monospace", fontSize: "12px", color: "rgba(255,255,255,0.4)", letterSpacing: "0.1em" }}>ADMIN</span>
          </div>
          <a href="/" style={{ color: "rgba(255,255,255,0.4)", fontSize: "13px", textDecoration: "none" }}>← Forsiden</a>
        </div>
      </header>

      {/* ── BODY ── */}
      <div style={bodyStyle}>

        {/* Page title */}
        <div style={{ marginBottom: "28px" }}>
          <h1 style={pageHeadingStyle}>Oversikt</h1>
          <p style={{ color: "rgba(255,255,255,0.35)", fontSize: "14px", marginTop: "4px" }}>
            {new Date().toLocaleDateString("nb-NO", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </p>
        </div>

        {/* ── STATS GRID ── */}
        <div style={statsGrid}>
          <StatCard label="Totalt arenaer"  value={arenaer.length.toString()} color="#21D4BD" />
          <StatCard label="Aktive piloter"  value={piloter.toString()}         color="#FF6B4A" />
          <StatCard label="Aktiv streaming" value={aktive.toString()}           color="#21D4BD" />
        </div>

        {/* ── TOOLBAR ── */}
        <div style={toolbarStyle}>
          <div style={{ display: "flex", gap: "8px", flex: 1 }}>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Søk på arena, kategori eller land…"
              style={{ ...inputStyle, flex: 1, maxWidth: "360px" }}
              onFocus={e => { e.target.style.borderColor = "#21D4BD"; }}
              onBlur={e => { e.target.style.borderColor = "rgba(255,255,255,0.12)"; }}
              onKeyDown={e => e.key === "Escape" && setSearch("")}
            />
            <button style={ghostBtnStyle}>Søk</button>
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <button onClick={fetchData} style={ghostBtnStyle}>↻ Oppdater</button>
            <button onClick={() => setShowAddModal(true)} style={outlineCoralBtnStyle}>+ Ny arena</button>
          </div>
        </div>

        {/* ── TABLE ── */}
        {loading ? (
          <div style={emptyStyle}>Laster data…</div>
        ) : filtered.length === 0 ? (
          <div style={emptyStyle}>{arenaer.length === 0 ? "Ingen arenaer registrert ennå." : "Ingen treff på søket."}</div>
        ) : (
          <div style={{ overflowX: "auto", marginBottom: "60px" }}>
            <table style={tableStyle}>
              <thead>
                <tr style={theadRowStyle}>
                  <th style={thStyle}>Arenanavn</th>
                  <th style={thStyle}>Kategori</th>
                  <th style={thStyle}>Land</th>
                  <th style={thStyle}>Stream ID</th>
                  <th style={thStyle}>Pilot-status</th>
                  <th style={{ ...thStyle, textAlign: "center" }}>Streaming</th>
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
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── ARENA DETAIL PANEL ── */}
      {selected && (
        <ArenaDetailPanel
          arena={selected}
          onClose={() => setSelected(null)}
          onToggle={toggleStreaming}
        />
      )}

      {/* ── ADD ARENA MODAL ── */}
      {showAddModal && (
        <AddArenaModal
          onClose={() => setShowAddModal(false)}
          onSaved={() => { setShowAddModal(false); fetchData(); }}
        />
      )}
    </div>
  );
}

/* ─── ARENA ROW ─── */

function ArenaRow({ arena, odd, onToggle, onClick }: {
  arena: ArenaWithPilot;
  odd: boolean;
  onToggle: (id: string, current: boolean) => void;
  onClick: () => void;
}) {
  const daysLeft = arena.pilot
    ? Math.max(0, Math.ceil((new Date(arena.pilot.slutt_dato).getTime() - Date.now()) / 86400000))
    : null;

  const pilotStatus = arena.pilot
    ? daysLeft! > 0
      ? { label: `${daysLeft}d igjen`, color: daysLeft! <= 3 ? "#FF6B4A" : "#21D4BD" }
      : { label: "Utløpt", color: "rgba(255,255,255,0.3)" }
    : { label: "Inaktiv — ingen abonnement", color: "rgba(255,255,255,0.2)" };

  return (
    <tr
      onClick={onClick}
      style={{
        backgroundColor: odd ? "rgba(255,255,255,0.02)" : "transparent",
        cursor: "pointer",
        transition: "background 0.15s",
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = "rgba(33,212,189,0.05)"; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = odd ? "rgba(255,255,255,0.02)" : "transparent"; }}
    >
      <td style={tdStyle}>
        <span style={{ fontWeight: 600, color: "#ffffff" }}>{arena.arenanavn}</span>
        {arena.by && <span style={{ display: "block", fontSize: "12px", color: "rgba(255,255,255,0.35)", marginTop: "2px" }}>{arena.by}</span>}
      </td>
      <td style={tdStyle}>
        <span style={{ color: "rgba(255,255,255,0.55)", fontSize: "13px" }}>{arena.kategori ?? "—"}</span>
      </td>
      <td style={tdStyle}>
        <span style={{ color: "rgba(255,255,255,0.55)", fontSize: "13px" }}>{arena.land ?? "—"}</span>
      </td>
      <td style={tdStyle}>
        <span style={{ fontFamily: "var(--font-roboto-mono), monospace", fontSize: "12px", color: "rgba(33,212,189,0.7)", letterSpacing: "0.02em" }}>
          {arena.stream_id ?? "—"}
        </span>
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
          fontFamily: "var(--font-roboto-mono), monospace",
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
            backgroundColor: arena.streaming_aktiv ? "#21D4BD" : "rgba(255,255,255,0.1)",
            border: "none", borderRadius: "100px",
            cursor: "pointer", position: "relative", transition: "background 0.2s",
          }}
          title={arena.streaming_aktiv ? "Deaktiver" : "Aktiver"}
        >
          <span style={{
            position: "absolute", top: "3px",
            left: arena.streaming_aktiv ? "22px" : "3px",
            width: "18px", height: "18px",
            backgroundColor: arena.streaming_aktiv ? "#052630" : "rgba(255,255,255,0.4)",
            borderRadius: "50%", transition: "left 0.2s", display: "block",
          }} />
        </button>
      </td>
    </tr>
  );
}

/* ─── ARENA DETAIL PANEL (slide-in from right) ─── */

function ArenaDetailPanel({ arena, onClose, onToggle }: {
  arena: ArenaWithPilot;
  onClose: () => void;
  onToggle: (id: string, current: boolean) => void;
}) {
  const daysLeft = arena.pilot
    ? Math.max(0, Math.ceil((new Date(arena.pilot.slutt_dato).getTime() - Date.now()) / 86400000))
    : null;

  const hasCoords = arena.lat != null && arena.lng != null;

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
        borderLeft: "1px solid rgba(33,212,189,0.15)",
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
            <span style={{ fontFamily: "var(--font-roboto-mono), monospace", fontSize: "11px", color: "rgba(255,255,255,0.3)", letterSpacing: "0.08em" }}>
              {arena.stream_id ?? "Ingen stream ID"}
            </span>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", fontSize: "20px", cursor: "pointer", padding: "4px 8px" }}>✕</button>
        </div>

        <div style={{ padding: "28px" }}>

          {/* ── MAP ── */}
          <div style={{ marginBottom: "28px" }}>
            <PanelLabel>Kart</PanelLabel>
            {hasCoords ? (
              <div style={{ height: "260px", borderRadius: "10px", overflow: "hidden", border: "1px solid rgba(33,212,189,0.15)" }}>
                <ArenaMap
                  lat={arena.lat!}
                  lng={arena.lng!}
                  name={arena.arenanavn}
                  radius={arena.geofence_radius ?? 300}
                />
              </div>
            ) : (
              <div style={{ height: "120px", borderRadius: "10px", border: "1px dashed rgba(255,255,255,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ color: "rgba(255,255,255,0.25)", fontSize: "13px", fontFamily: "var(--font-roboto-mono), monospace" }}>
                  Ingen koordinater registrert
                </span>
              </div>
            )}
          </div>

          {/* ── PILOT STATUS ── */}
          <div style={{ marginBottom: "24px" }}>
            <PanelLabel>Pilot</PanelLabel>
            <div style={infoCardStyle}>
              {arena.pilot ? (
                <>
                  <InfoRow label="Status" value={daysLeft! > 0 ? `${daysLeft} dager igjen` : "Utløpt"} valueColor={daysLeft! > 0 ? "#21D4BD" : "rgba(255,255,255,0.3)"} />
                  <InfoRow label="Slutt" value={new Date(arena.pilot.slutt_dato).toLocaleDateString("nb-NO")} />
                </>
              ) : (
                <InfoRow label="Status" value="Inaktiv — ingen abonnement" valueColor="rgba(255,255,255,0.3)" />
              )}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderTop: "1px solid rgba(255,255,255,0.05)", marginTop: "4px" }}>
                <span style={infoLabelStyle}>Streaming aktiv</span>
                <button
                  onClick={() => onToggle(arena.id, arena.streaming_aktiv)}
                  style={{
                    width: "44px", height: "24px",
                    backgroundColor: arena.streaming_aktiv ? "#21D4BD" : "rgba(255,255,255,0.1)",
                    border: "none", borderRadius: "100px",
                    cursor: "pointer", position: "relative", transition: "background 0.2s",
                  }}
                >
                  <span style={{
                    position: "absolute", top: "3px",
                    left: arena.streaming_aktiv ? "22px" : "3px",
                    width: "18px", height: "18px",
                    backgroundColor: arena.streaming_aktiv ? "#052630" : "rgba(255,255,255,0.4)",
                    borderRadius: "50%", transition: "left 0.2s", display: "block",
                  }} />
                </button>
              </div>
            </div>
          </div>

          {/* ── ARENA DETAILS ── */}
          <div style={{ marginBottom: "24px" }}>
            <PanelLabel>Arenadetaljer</PanelLabel>
            <div style={infoCardStyle}>
              <InfoRow label="Kategori"  value={arena.kategori  ?? "—"} />
              <InfoRow label="Adresse"   value={[arena.adresse_gate, arena.postnummer, arena.by].filter(Boolean).join(", ") || "—"} />
              <InfoRow label="Land"      value={arena.land      ?? "—"} />
              <InfoRow label="Kapasitet" value={arena.kapasitet ?? "—"} />
              <InfoRow label="Org.nr"    value={arena.org_nummer ?? "—"} mono />
              {hasCoords && <InfoRow label="Koordinater" value={`${arena.lat?.toFixed(5)}, ${arena.lng?.toFixed(5)}`} mono />}
              <InfoRow label="Geofence"  value={`${arena.geofence_radius ?? 300}m radius`} />
              <InfoRow label="Registrert" value={new Date(arena.opprettet).toLocaleDateString("nb-NO")} />
            </div>
          </div>

          {/* ── CONTACT ── */}
          {(arena.fornavn || arena.epost) && (
            <div>
              <PanelLabel>Kontakt</PanelLabel>
              <div style={infoCardStyle}>
                {(arena.fornavn || arena.etternavn) && (
                  <InfoRow label="Navn" value={[arena.fornavn, arena.etternavn].filter(Boolean).join(" ")} />
                )}
                {arena.epost   && <InfoRow label="E-post"  value={arena.epost} />}
                {arena.telefon && <InfoRow label="Telefon" value={arena.telefon} mono />}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

/* ─── ADD ARENA MODAL ─── */

function AddArenaModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({ arenanavn: "", kategori: "", land: "Norge", org_nummer: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");

    const { error: err } = await supabase.from("arenaer").insert({
      arenanavn: form.arenanavn,
      kategori: form.kategori || null,
      land: form.land || null,
      org_nummer: form.org_nummer || null,
      stream_id: generateStreamId(),
      streaming_aktiv: false,
    });

    if (err) {
      setError(err.code === "23505" ? "Org.nummer er allerede registrert." : err.message);
      setSaving(false);
      return;
    }
    onSaved();
  }

  return (
    <div style={modalOverlayStyle} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={modalBoxStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
          <h2 style={{ fontFamily: "var(--font-montserrat), system-ui, sans-serif", fontWeight: 700, fontSize: "18px" }}>
            Legg til arena manuelt
          </h2>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", fontSize: "18px", cursor: "pointer", padding: "4px 8px" }}>✕</button>
        </div>

        <div style={{ backgroundColor: "rgba(255,107,74,0.08)", border: "1px solid rgba(255,107,74,0.2)", borderRadius: "8px", padding: "12px 16px", marginBottom: "20px" }}>
          <p style={{ color: "rgba(255,255,255,0.6)", fontSize: "13px", lineHeight: 1.5, margin: 0 }}>
            <span style={{ color: "#FF6B4A", fontWeight: 600 }}>Ingen pilot opprettes.</span>{" "}
            Arenaen registreres som inaktiv. Pilot startes kun via{" "}
            <a href="/registrer" style={{ color: "#21D4BD" }}>/registrer</a>.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <ModalField label="Arenanavn *">
            <input name="arenanavn" value={form.arenanavn} onChange={handleChange} required placeholder="f.eks. Telenor Arena" style={inputStyle} onFocus={e => { e.target.style.borderColor = "#21D4BD"; }} onBlur={e => { e.target.style.borderColor = "rgba(255,255,255,0.12)"; }} />
          </ModalField>
          <ModalField label="Kategori">
            <select name="kategori" value={form.kategori} onChange={handleChange} style={{ ...inputStyle, appearance: "none", cursor: "pointer" }} onFocus={e => { e.currentTarget.style.borderColor = "#21D4BD"; }} onBlur={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)"; }}>
              <option value="">Velg kategori</option>
              {KATEGORIER.map(k => <option key={k} value={k}>{k}</option>)}
            </select>
          </ModalField>
          <ModalField label="Land">
            <select name="land" value={form.land} onChange={handleChange} style={{ ...inputStyle, appearance: "none", cursor: "pointer" }} onFocus={e => { e.currentTarget.style.borderColor = "#21D4BD"; }} onBlur={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)"; }}>
              {LAND.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </ModalField>
          <ModalField label="Organisasjonsnummer">
            <input name="org_nummer" value={form.org_nummer} onChange={handleChange} placeholder="123 456 789" style={inputStyle} onFocus={e => { e.target.style.borderColor = "#21D4BD"; }} onBlur={e => { e.target.style.borderColor = "rgba(255,255,255,0.12)"; }} />
          </ModalField>

          {error && (
            <div style={{ backgroundColor: "rgba(255,107,74,0.1)", border: "1px solid rgba(255,107,74,0.3)", borderRadius: "8px", padding: "10px 14px", fontSize: "13px", color: "rgba(255,255,255,0.8)", marginBottom: "16px" }}>
              {error}
            </div>
          )}

          <div style={{ display: "flex", gap: "12px", marginTop: "8px" }}>
            <button type="button" onClick={onClose} style={{ ...ghostBtnStyle, flex: 1, padding: "12px" }}>Avbryt</button>
            <button type="submit" disabled={saving} style={{ ...tealBtnStyle, flex: 2, opacity: saving ? 0.7 : 1 }}>
              {saving ? "Lagrer…" : "Legg til arena"}
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
      <div style={{ fontFamily: "var(--font-roboto-mono), monospace", fontSize: "36px", fontWeight: 500, color, marginBottom: "4px", letterSpacing: "-0.02em" }}>
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
    <div style={{ fontFamily: "var(--font-roboto-mono), monospace", fontSize: "11px", letterSpacing: "0.12em", color: "rgba(255,255,255,0.3)", textTransform: "uppercase" as const, marginBottom: "10px" }}>
      {children}
    </div>
  );
}

function InfoRow({ label, value, valueColor, mono }: { label: string; value: string; valueColor?: string; mono?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
      <span style={infoLabelStyle}>{label}</span>
      <span style={{ fontSize: "13px", color: valueColor ?? "rgba(255,255,255,0.7)", fontFamily: mono ? "var(--font-roboto-mono), monospace" : "inherit", textAlign: "right", maxWidth: "60%" }}>
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

const pageStyle: React.CSSProperties = { backgroundColor: "#052630", minHeight: "100vh", color: "#ffffff", fontFamily: "var(--font-inter), system-ui, sans-serif" };
const headerStyle: React.CSSProperties = { borderBottom: "1px solid rgba(33,212,189,0.1)", backgroundColor: "rgba(5,38,48,0.95)", position: "sticky", top: 0, zIndex: 50 };
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
const cardStyle: React.CSSProperties = { backgroundColor: "#1E293B", border: "1px solid rgba(33,212,189,0.12)", borderRadius: "16px", padding: "36px" };
const modalOverlayStyle: React.CSSProperties = { position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: "24px" };
const modalBoxStyle: React.CSSProperties = { backgroundColor: "#1E293B", border: "1px solid rgba(33,212,189,0.2)", borderRadius: "16px", padding: "36px", width: "100%", maxWidth: "480px", color: "#ffffff" };
const inputStyle: React.CSSProperties = { width: "100%", backgroundColor: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "8px", padding: "12px 16px", color: "#ffffff", fontSize: "15px", outline: "none", fontFamily: "var(--font-inter), system-ui, sans-serif", transition: "border-color 0.2s" };
const pageHeadingStyle: React.CSSProperties = { fontFamily: "var(--font-montserrat), system-ui, sans-serif", fontWeight: 800, fontSize: "28px", letterSpacing: "-0.02em" };
const fieldLabelStyle: React.CSSProperties = { display: "block", fontSize: "13px", fontWeight: 500, color: "rgba(255,255,255,0.6)", marginBottom: "8px", letterSpacing: "0.03em" };
const emptyStyle: React.CSSProperties = { textAlign: "center", padding: "80px 0", color: "rgba(255,255,255,0.3)", fontFamily: "var(--font-roboto-mono), monospace", fontSize: "14px" };
const ghostBtnStyle: React.CSSProperties = { backgroundColor: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "8px", padding: "10px 16px", color: "rgba(255,255,255,0.6)", fontSize: "13px", cursor: "pointer", fontFamily: "var(--font-inter), system-ui, sans-serif" };
const outlineCoralBtnStyle: React.CSSProperties = { backgroundColor: "rgba(255,107,74,0.1)", border: "1px solid rgba(255,107,74,0.3)", borderRadius: "8px", padding: "10px 16px", color: "#FF6B4A", fontSize: "13px", fontWeight: 600, cursor: "pointer", fontFamily: "var(--font-inter), system-ui, sans-serif" };
const coralBtnStyle: React.CSSProperties = { width: "100%", backgroundColor: "#FF6B4A", color: "#ffffff", border: "none", borderRadius: "8px", padding: "14px", fontSize: "15px", fontWeight: 700, fontFamily: "var(--font-montserrat), system-ui, sans-serif", cursor: "pointer", letterSpacing: "0.03em" };
const tealBtnStyle: React.CSSProperties = { backgroundColor: "#21D4BD", border: "none", borderRadius: "8px", padding: "12px", color: "#052630", fontSize: "14px", fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-montserrat), system-ui, sans-serif", letterSpacing: "0.03em" };
