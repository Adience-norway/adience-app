"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase, type Arena, type PilotPeriode } from "@/lib/supabase";

const ADMIN_PASSWORD = "Hamar2019";

type ArenaWithPilot = Arena & {
  pilot: PilotPeriode | null;
};

export default function AdminPage() {
  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState("");
  const [pwError, setPwError] = useState(false);

  function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      setAuthed(true);
    } else {
      setPwError(true);
      setPassword("");
    }
  }

  if (!authed) {
    return <LoginScreen password={password} setPassword={setPassword} onSubmit={handleLogin} error={pwError} />;
  }

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

          <form onSubmit={onSubmit} style={loginCardStyle}>
            <label style={fieldLabelStyle}>Passord</label>
            <input
              type="password"
              autoFocus
              value={password}
              onChange={e => { setPassword(e.target.value); }}
              style={{
                ...inputStyle,
                borderColor: error ? "rgba(255,107,74,0.6)" : "rgba(255,255,255,0.12)",
              }}
              placeholder="••••••••••"
              onFocus={e => { e.target.style.borderColor = "#21D4BD"; e.target.style.boxShadow = "0 0 0 3px rgba(33,212,189,0.15)"; }}
              onBlur={e => { e.target.style.borderColor = error ? "rgba(255,107,74,0.6)" : "rgba(255,255,255,0.12)"; e.target.style.boxShadow = "none"; }}
            />
            {error && <p style={{ color: "#FF6B4A", fontSize: "13px", marginTop: "8px" }}>Feil passord. Prøv igjen.</p>}
            <button type="submit" style={{ ...submitBtnStyle, marginTop: "20px" }}>
              Logg inn
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

/* ─── DASHBOARD ─── */

function Dashboard() {
  const [arenaer, setArenaer] = useState<ArenaWithPilot[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data: arenaData } = await supabase
      .from("arenaer")
      .select("*")
      .order("opprettet", { ascending: false });

    const { data: pilotData } = await supabase
      .from("pilot_perioder")
      .select("*");

    if (arenaData) {
      const merged: ArenaWithPilot[] = arenaData.map((a: Arena) => ({
        ...a,
        pilot: pilotData?.find((p: PilotPeriode) => p.arena_id === a.id) ?? null,
      }));
      setArenaer(merged);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function toggleStreaming(id: string, current: boolean) {
    await supabase.from("arenaer").update({ streaming_aktiv: !current }).eq("id", id);
    setArenaer(prev => prev.map(a => a.id === id ? { ...a, streaming_aktiv: !current } : a));
  }

  const filtered = arenaer.filter(a =>
    a.arenanavn.toLowerCase().includes(search.toLowerCase()) ||
    (a.kategori ?? "").toLowerCase().includes(search.toLowerCase()) ||
    (a.land ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const aktive = arenaer.filter(a => a.streaming_aktiv).length;
  const piloter = arenaer.filter(a => a.pilot?.status === "aktiv").length;

  return (
    <div style={pageStyle}>
      {/* Header */}
      <header style={headerStyle}>
        <div style={containerStyle}>
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="ÅDIENCE" style={{ height: "28px", width: "auto" }} />
            <div style={{ width: "1px", height: "20px", backgroundColor: "rgba(255,255,255,0.15)" }} />
            <span style={{ fontFamily: "var(--font-roboto-mono), monospace", fontSize: "12px", color: "rgba(255,255,255,0.4)", letterSpacing: "0.1em" }}>
              ADMIN
            </span>
          </div>
          <a href="/" style={{ color: "rgba(255,255,255,0.4)", fontSize: "13px", textDecoration: "none" }}>← Forsiden</a>
        </div>
      </header>

      <div style={containerStyle}>
        {/* Page title + stats */}
        <div style={{ padding: "40px 0 32px" }}>
          <h1 style={pageHeadingStyle}>Oversikt</h1>

          <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", marginTop: "24px" }}>
            <StatCard label="Totalt arenaer" value={arenaer.length.toString()} color="#21D4BD" />
            <StatCard label="Aktiv streaming" value={aktive.toString()} color="#21D4BD" />
            <StatCard label="Aktive piloter" value={piloter.toString()} color="#FF6B4A" />
          </div>
        </div>

        {/* Search + refresh */}
        <div style={{ display: "flex", gap: "12px", marginBottom: "20px", alignItems: "center" }}>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Søk etter arena, kategori, land…"
            style={{ ...inputStyle, flex: 1, maxWidth: "360px" }}
            onFocus={e => { e.target.style.borderColor = "#21D4BD"; }}
            onBlur={e => { e.target.style.borderColor = "rgba(255,255,255,0.12)"; }}
          />
          <button onClick={fetchData} style={refreshBtnStyle}>
            ↻ Oppdater
          </button>
          <a href="/registrer" style={newArenaBtnStyle}>
            + Ny arena
          </a>
        </div>

        {/* Table */}
        {loading ? (
          <div style={{ textAlign: "center", padding: "80px 0", color: "rgba(255,255,255,0.3)", fontFamily: "var(--font-roboto-mono), monospace", fontSize: "14px" }}>
            Laster data…
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "80px 0", color: "rgba(255,255,255,0.3)" }}>
            {arenaer.length === 0 ? "Ingen arenaer registrert ennå." : "Ingen treff på søket."}
          </div>
        ) : (
          <div style={{ overflowX: "auto", marginBottom: "60px" }}>
            <table style={tableStyle}>
              <thead>
                <tr style={theadRowStyle}>
                  <th style={thStyle}>Arena</th>
                  <th style={thStyle}>Kategori</th>
                  <th style={thStyle}>Land</th>
                  <th style={thStyle}>Stream ID</th>
                  <th style={thStyle}>Pilot</th>
                  <th style={{ ...thStyle, textAlign: "center" as const }}>Streaming</th>
                  <th style={thStyle}>Registrert</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((arena, i) => (
                  <ArenaRow
                    key={arena.id}
                    arena={arena}
                    onToggle={toggleStreaming}
                    odd={i % 2 === 1}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function ArenaRow({ arena, onToggle, odd }: { arena: ArenaWithPilot; onToggle: (id: string, current: boolean) => void; odd: boolean }) {
  const daysLeft = arena.pilot
    ? Math.max(0, Math.ceil((new Date(arena.pilot.slutt_dato).getTime() - Date.now()) / 86400000))
    : null;

  const pilotStatus = arena.pilot
    ? daysLeft! > 0
      ? { label: `${daysLeft}d igjen`, color: daysLeft! <= 3 ? "#FF6B4A" : "#21D4BD" }
      : { label: "Utløpt", color: "rgba(255,255,255,0.3)" }
    : null;

  return (
    <tr style={{ backgroundColor: odd ? "rgba(255,255,255,0.02)" : "transparent" }}>
      <td style={tdStyle}>
        <span style={{ fontWeight: 600, color: "#ffffff" }}>{arena.arenanavn}</span>
      </td>
      <td style={tdStyle}>
        <span style={{ color: "rgba(255,255,255,0.55)", fontSize: "13px" }}>
          {arena.kategori ?? "—"}
        </span>
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
        {pilotStatus ? (
          <span style={{
            display: "inline-block",
            backgroundColor: `${pilotStatus.color}18`,
            border: `1px solid ${pilotStatus.color}40`,
            color: pilotStatus.color,
            borderRadius: "100px",
            padding: "3px 10px",
            fontSize: "12px",
            fontFamily: "var(--font-roboto-mono), monospace",
            fontWeight: 500,
          }}>
            {pilotStatus.label}
          </span>
        ) : (
          <span style={{ color: "rgba(255,255,255,0.2)", fontSize: "13px" }}>—</span>
        )}
      </td>
      <td style={{ ...tdStyle, textAlign: "center" as const }}>
        <button
          onClick={() => onToggle(arena.id, arena.streaming_aktiv)}
          style={{
            width: "44px", height: "24px",
            backgroundColor: arena.streaming_aktiv ? "#21D4BD" : "rgba(255,255,255,0.1)",
            border: "none",
            borderRadius: "100px",
            cursor: "pointer",
            position: "relative",
            transition: "background 0.2s",
          }}
          title={arena.streaming_aktiv ? "Deaktiver streaming" : "Aktiver streaming"}
        >
          <span style={{
            position: "absolute",
            top: "3px",
            left: arena.streaming_aktiv ? "22px" : "3px",
            width: "18px", height: "18px",
            backgroundColor: arena.streaming_aktiv ? "#052630" : "rgba(255,255,255,0.4)",
            borderRadius: "50%",
            transition: "left 0.2s",
            display: "block",
          }} />
        </button>
      </td>
      <td style={tdStyle}>
        <span style={{ color: "rgba(255,255,255,0.35)", fontSize: "12px", fontFamily: "var(--font-roboto-mono), monospace" }}>
          {new Date(arena.opprettet).toLocaleDateString("nb-NO")}
        </span>
      </td>
    </tr>
  );
}

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{
      backgroundColor: "#1E293B",
      border: "1px solid rgba(255,255,255,0.08)",
      borderRadius: "12px",
      padding: "20px 28px",
      minWidth: "160px",
    }}>
      <div style={{ fontFamily: "var(--font-roboto-mono), monospace", fontSize: "28px", fontWeight: 500, color, marginBottom: "4px" }}>
        {value}
      </div>
      <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "12px", letterSpacing: "0.06em", textTransform: "uppercase" as const }}>
        {label}
      </div>
    </div>
  );
}

/* ─── STYLES ─── */

const pageStyle: React.CSSProperties = {
  backgroundColor: "#052630",
  minHeight: "100vh",
  color: "#ffffff",
  fontFamily: "var(--font-inter), system-ui, sans-serif",
};

const headerStyle: React.CSSProperties = {
  borderBottom: "1px solid rgba(33,212,189,0.1)",
  backgroundColor: "rgba(5,38,48,0.95)",
  position: "sticky",
  top: 0,
  zIndex: 50,
};

const containerStyle: React.CSSProperties = {
  maxWidth: "1280px",
  margin: "0 auto",
  padding: "0 24px",
  display: "flex" as const,
  alignItems: "center",
  justifyContent: "space-between",
  height: "60px",
};

const pageHeadingStyle: React.CSSProperties = {
  fontFamily: "var(--font-montserrat), system-ui, sans-serif",
  fontWeight: 800,
  fontSize: "28px",
  letterSpacing: "-0.02em",
};

const loginCardStyle: React.CSSProperties = {
  backgroundColor: "#1E293B",
  border: "1px solid rgba(33,212,189,0.12)",
  borderRadius: "16px",
  padding: "36px",
};

const fieldLabelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "13px",
  fontWeight: 500,
  color: "rgba(255,255,255,0.6)",
  marginBottom: "8px",
  letterSpacing: "0.03em",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  backgroundColor: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: "8px",
  padding: "12px 16px",
  color: "#ffffff",
  fontSize: "15px",
  outline: "none",
  fontFamily: "var(--font-inter), system-ui, sans-serif",
  transition: "border-color 0.2s",
};

const submitBtnStyle: React.CSSProperties = {
  width: "100%",
  backgroundColor: "#FF6B4A",
  color: "#ffffff",
  border: "none",
  borderRadius: "8px",
  padding: "14px",
  fontSize: "15px",
  fontWeight: 700,
  fontFamily: "var(--font-montserrat), system-ui, sans-serif",
  cursor: "pointer",
  letterSpacing: "0.03em",
};

const refreshBtnStyle: React.CSSProperties = {
  backgroundColor: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: "8px",
  padding: "10px 16px",
  color: "rgba(255,255,255,0.6)",
  fontSize: "13px",
  cursor: "pointer",
  fontFamily: "var(--font-inter), system-ui, sans-serif",
};

const newArenaBtnStyle: React.CSSProperties = {
  backgroundColor: "rgba(255,107,74,0.1)",
  border: "1px solid rgba(255,107,74,0.3)",
  borderRadius: "8px",
  padding: "10px 16px",
  color: "#FF6B4A",
  fontSize: "13px",
  textDecoration: "none",
  fontWeight: 600,
};

const tableStyle: React.CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  backgroundColor: "#1E293B",
  borderRadius: "12px",
  overflow: "hidden",
  border: "1px solid rgba(255,255,255,0.06)",
};

const theadRowStyle: React.CSSProperties = {
  borderBottom: "1px solid rgba(255,255,255,0.08)",
  backgroundColor: "rgba(255,255,255,0.03)",
};

const thStyle: React.CSSProperties = {
  padding: "14px 20px",
  textAlign: "left",
  fontSize: "11px",
  fontWeight: 600,
  color: "rgba(255,255,255,0.4)",
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  whiteSpace: "nowrap",
};

const tdStyle: React.CSSProperties = {
  padding: "16px 20px",
  borderBottom: "1px solid rgba(255,255,255,0.04)",
  verticalAlign: "middle",
};
