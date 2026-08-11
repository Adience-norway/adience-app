"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export function TilbakestillPassordContent() {
  const [ready, setReady] = useState<boolean | null>(null);
  const [passord, setPassord] = useState("");
  const [passord2, setPassord2] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setReady(!!data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || session) setReady(true);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (passord.length < 6) { setError("Passordet må være minst 6 tegn."); return; }
    if (passord !== passord2) { setError("Passordene er ikke like."); return; }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: passord });
    setLoading(false);
    if (error) setError(error.message);
    else setDone(true);
  }

  return (
    <div style={pageStyle}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
        <div style={{ width: "100%", maxWidth: "380px", padding: "24px" }}>
          <div style={{ textAlign: "center", marginBottom: "40px" }}>
            <a href="/" style={{ display: "inline-block" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.png" alt="ÅDIENCE" style={{ height: "72px", width: "auto", margin: "0 auto 24px" }} />
            </a>
            <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "14px" }}>Nytt passord</p>
          </div>

          <div style={cardStyle}>
            {ready === null ? (
              <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "14px" }}>Sjekker lenken…</p>
            ) : !ready ? (
              <>
                <p style={{ fontSize: "15px", lineHeight: 1.6, marginBottom: "20px" }}>
                  Denne lenken er ugyldig eller har utløpt. Be om en ny tilbakestillingslenke fra innloggingssiden.
                </p>
                <div style={{ display: "flex", gap: "12px" }}>
                  <a href="/min-side" style={{ ...ghostBtnStyle, textAlign: "center", flex: 1, textDecoration: "none" }}>Min side</a>
                  <a href="/admin" style={{ ...ghostBtnStyle, textAlign: "center", flex: 1, textDecoration: "none" }}>Admin</a>
                </div>
              </>
            ) : done ? (
              <>
                <p style={{ color: "#33D3C4", fontSize: "15px", lineHeight: 1.6, marginBottom: "20px" }}>
                  Passordet er endret. Du kan nå logge inn med det nye passordet.
                </p>
                <div style={{ display: "flex", gap: "12px" }}>
                  <a href="/min-side" style={{ ...tealBtnStyle, textAlign: "center", flex: 1, textDecoration: "none" }}>Min side</a>
                  <a href="/admin" style={{ ...tealBtnStyle, textAlign: "center", flex: 1, textDecoration: "none" }}>Admin</a>
                </div>
              </>
            ) : (
              <form onSubmit={handleSubmit}>
                <label style={fieldLabelStyle}>Nytt passord</label>
                <input
                  type="password" required autoFocus value={passord} onChange={(e) => setPassord(e.target.value)}
                  style={inputStyle} placeholder="••••••••••" minLength={6}
                />
                <div style={{ height: "16px" }} />
                <label style={fieldLabelStyle}>Gjenta nytt passord</label>
                <input
                  type="password" required value={passord2} onChange={(e) => setPassord2(e.target.value)}
                  style={inputStyle} placeholder="••••••••••" minLength={6}
                />
                {error && <p style={{ color: "#D94F4F", fontSize: "13px", marginTop: "12px" }}>{error}</p>}
                <button type="submit" disabled={loading} style={{ ...tealBtnStyle, width: "100%", marginTop: "24px" }}>
                  {loading ? "Lagrer…" : "Lagre nytt passord"}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const pageStyle: React.CSSProperties = { backgroundColor: "#073E46", minHeight: "100vh", color: "#ffffff", fontFamily: "var(--font-inter), system-ui, sans-serif" };
const cardStyle: React.CSSProperties = { backgroundColor: "#1E293B", border: "1px solid rgba(51,211,196,0.12)", borderRadius: "16px", padding: "28px" };
const inputStyle: React.CSSProperties = { width: "100%", backgroundColor: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "8px", padding: "12px 16px", color: "#ffffff", fontSize: "15px", outline: "none", fontFamily: "var(--font-inter), system-ui, sans-serif" };
const fieldLabelStyle: React.CSSProperties = { display: "block", fontSize: "13px", fontWeight: 500, color: "rgba(255,255,255,0.6)", marginBottom: "8px", letterSpacing: "0.03em" };
const ghostBtnStyle: React.CSSProperties = { backgroundColor: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "8px", padding: "10px 16px", color: "rgba(255,255,255,0.6)", fontSize: "13px", cursor: "pointer", fontFamily: "var(--font-inter), system-ui, sans-serif" };
const tealBtnStyle: React.CSSProperties = { backgroundColor: "#33D3C4", border: "none", borderRadius: "8px", padding: "12px 20px", color: "#073E46", fontSize: "14px", fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-montserrat), system-ui, sans-serif", letterSpacing: "0.03em" };
