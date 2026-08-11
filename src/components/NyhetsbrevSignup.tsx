"use client";

import { useState } from "react";

type Props = {
  kilde?: string;
  variant?: "hero" | "compact";
};

export default function NyhetsbrevSignup({ kilde = "hjemmeside", variant = "hero" }: Props) {
  const [epost, setEpost] = useState("");
  const [status, setStatus] = useState<"idle" | "sender" | "ok" | "feil">("idle");
  const [feilmelding, setFeilmelding] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sender");
    setFeilmelding("");

    try {
      const res = await fetch("/api/nyhetsbrev", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ epost, kilde }),
      });
      const data = await res.json();

      if (!res.ok) {
        setFeilmelding(data.error || "Noe gikk galt. Prøv igjen.");
        setStatus("feil");
        return;
      }

      setStatus("ok");
    } catch {
      setFeilmelding("Noe gikk galt. Prøv igjen.");
      setStatus("feil");
    }
  }

  if (status === "ok") {
    return (
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: "10px",
        color: "#33D3C4",
        fontSize: "15px",
        fontWeight: 600,
        padding: variant === "hero" ? "16px 0" : "0",
      }}>
        <span>✓</span>
        <span>Takk! Sjekk innboksen din.</span>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
        <input
          type="email"
          required
          value={epost}
          onChange={(e) => setEpost(e.target.value)}
          placeholder="din@epost.no"
          style={{
            flex: "1 1 240px",
            backgroundColor: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.2)",
            borderRadius: "8px",
            padding: "16px 18px",
            fontSize: "15px",
            color: "#ffffff",
            outline: "none",
          }}
        />
        <button
          type="submit"
          disabled={status === "sender"}
          style={{
            backgroundColor: "#FF6B4A",
            color: "#ffffff",
            border: "none",
            borderRadius: "8px",
            padding: "16px 32px",
            fontSize: "16px",
            fontWeight: 700,
            fontFamily: "var(--font-montserrat), system-ui, sans-serif",
            letterSpacing: "0.04em",
            cursor: status === "sender" ? "default" : "pointer",
            opacity: status === "sender" ? 0.7 : 1,
            boxShadow: "0 0 40px rgba(255,107,74,0.35)",
            whiteSpace: "nowrap",
          }}
        >
          {status === "sender" ? "Sender…" : "Meld deg på"}
        </button>
      </div>
      {status === "feil" && (
        <span style={{ color: "#D94F4F", fontSize: "13px" }}>{feilmelding}</span>
      )}
    </form>
  );
}
