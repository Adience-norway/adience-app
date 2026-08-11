"use client";

import { useRef, useState } from "react";
import { supabase, type Arena } from "@/lib/supabase";
import type { Dictionary } from "@/i18n/get-dictionary";

// Delt mellom /admin og (senere) /min-side — pausemusikk arenaen kan laste opp
// selv, som skal loope automatisk på Ant Media Server frem til speakerteamet
// aktiverer mikrofonen på /cast. Selve opplastingen (denne komponenten) er
// uavhengig av om server-side looping er koblet til ennå.

const MAKS_STORRELSE_MB = 30;
const GODTATTE_TYPER = ["audio/mpeg", "audio/mp3", "audio/wav", "audio/x-wav", "audio/mp4", "audio/aac"];

export function HoldmusikkCard({ arena, onSaved, embedded, dict }: { arena: Arena; onSaved: () => void; embedded?: boolean; dict: Dictionary }) {
  const t = dict.cards.holdmusikk;
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [lasterOpp, setLasterOpp] = useState(false);
  const [feil, setFeil] = useState("");
  const [fjerner, setFjerner] = useState(false);
  // Egen lokal state (samme mønster som ArenaProfilCard) — admin-panelet sender
  // ofte en no-op onSaved, så vi kan ikke stole på at parent gir oss ferske
  // arena-props tilbake. Kortet oppdaterer derfor visningen selv.
  const [gjeldendeUrl, setGjeldendeUrl] = useState(arena.holdmusikk_url);
  const [gjeldendeNavn, setGjeldendeNavn] = useState(arena.holdmusikk_navn);

  async function handleFile(file: File | null) {
    setFeil("");
    if (!file) return;
    if (!GODTATTE_TYPER.includes(file.type) && !/\.(mp3|wav|m4a|aac)$/i.test(file.name)) {
      setFeil(t.errorType);
      return;
    }
    if (file.size > MAKS_STORRELSE_MB * 1024 * 1024) {
      setFeil(`${t.errorSizePrefix} ${MAKS_STORRELSE_MB} ${t.errorSizeSuffix}`);
      return;
    }

    setLasterOpp(true);
    try {
      const ext = file.name.split(".").pop() ?? "mp3";
      const path = `${arena.id}/holdmusikk-${Date.now()}.${ext}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("arena-holdmusikk")
        .upload(path, file, { contentType: file.type || undefined });
      if (uploadError || !uploadData) throw new Error(uploadError?.message ?? t.errorUploadFailed);
      const publicUrl = supabase.storage.from("arena-holdmusikk").getPublicUrl(uploadData.path).data.publicUrl;
      const { error: updateError } = await supabase
        .from("arenaer")
        .update({ holdmusikk_url: publicUrl, holdmusikk_navn: file.name })
        .eq("id", arena.id);
      if (updateError) throw new Error(updateError.message);
      setGjeldendeUrl(publicUrl);
      setGjeldendeNavn(file.name);
      onSaved();
    } catch (err) {
      setFeil(err instanceof Error ? err.message : t.errorGeneric);
    } finally {
      setLasterOpp(false);
    }
  }

  async function handleFjern() {
    setFjerner(true);
    setFeil("");
    const { error } = await supabase
      .from("arenaer")
      .update({ holdmusikk_url: null, holdmusikk_navn: null })
      .eq("id", arena.id);
    setFjerner(false);
    if (error) { setFeil(error.message); return; }
    setGjeldendeUrl(null);
    setGjeldendeNavn(null);
    onSaved();
  }

  function handleDragOver(e: React.DragEvent) { e.preventDefault(); e.stopPropagation(); setDragging(true); }
  function handleDragLeave(e: React.DragEvent) { e.preventDefault(); setDragging(false); }
  function handleDrop(e: React.DragEvent) {
    e.preventDefault(); e.stopPropagation(); setDragging(false);
    handleFile(e.dataTransfer.files?.[0] ?? null);
  }

  const borderColor = dragging ? "#33D3C4" : feil ? "rgba(217,79,79,0.6)" : "rgba(255,255,255,0.14)";
  const bgColor = dragging ? "rgba(51,211,196,0.07)" : "rgba(255,255,255,0.03)";

  return (
    <div style={embedded ? {} : { ...cardStyle, marginTop: "24px" }}>
      {!embedded && <h3 style={{ ...sectionHeadingStyle, marginBottom: "4px" }}>{t.heading}</h3>}
      {!embedded && (
        <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "13px", marginBottom: "20px" }}>
          {t.subtitle}
        </p>
      )}

      {gjeldendeUrl ? (
        <div style={{ ...cardStyle, padding: "16px", backgroundColor: "rgba(255,255,255,0.03)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px", gap: "12px" }}>
            <span style={{ fontSize: "13px", color: "#fff", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              🎵 {gjeldendeNavn ?? t.currentLabel}
            </span>
            <button
              type="button"
              onClick={handleFjern}
              disabled={fjerner}
              style={{ background: "none", border: "1px solid rgba(217,79,79,0.3)", borderRadius: "6px", color: "#D94F4F", fontSize: "12px", padding: "5px 10px", cursor: "pointer", flexShrink: 0 }}
            >
              {fjerner ? t.removing : t.remove}
            </button>
          </div>
          {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
          <audio controls src={gjeldendeUrl} style={{ width: "100%", height: "36px" }} />
        </div>
      ) : (
        <div
          onClick={() => inputRef.current?.click()}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          style={{
            width: "100%", minHeight: "100px", borderRadius: "10px",
            border: `2px dashed ${borderColor}`,
            backgroundColor: bgColor,
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            gap: "8px", cursor: "pointer", padding: "20px",
            transition: "border-color 0.15s, background-color 0.15s",
          }}
          onMouseEnter={e => { if (!dragging) (e.currentTarget as HTMLElement).style.borderColor = "#33D3C4"; }}
          onMouseLeave={e => { if (!dragging) (e.currentTarget as HTMLElement).style.borderColor = borderColor; }}
        >
          <span style={{ fontSize: "22px", opacity: 0.35 }}>🎵</span>
          <span style={{ fontSize: "13px", color: "rgba(255,255,255,0.5)", textAlign: "center" }}>
            {lasterOpp ? t.uploading : t.dropPrompt}
          </span>
          <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.25)" }}>{t.formatHint} {MAKS_STORRELSE_MB} MB</span>
          <input
            ref={inputRef}
            type="file"
            accept="audio/*,.mp3,.wav,.m4a,.aac"
            onChange={e => handleFile(e.target.files?.[0] ?? null)}
            disabled={lasterOpp}
            style={{ display: "none" }}
          />
        </div>
      )}
      {feil && <p style={{ color: "#D94F4F", fontSize: "13px", marginTop: "8px" }}>{feil}</p>}
    </div>
  );
}

const cardStyle: React.CSSProperties = { backgroundColor: "#1E293B", border: "1px solid rgba(51,211,196,0.12)", borderRadius: "16px", padding: "28px" };
const sectionHeadingStyle: React.CSSProperties = { fontFamily: "var(--font-montserrat), system-ui, sans-serif", fontWeight: 700, fontSize: "18px" };
