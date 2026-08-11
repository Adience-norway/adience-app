"use client";

import { useEffect, useRef, useState } from "react";
import { supabase, type Sponsor } from "@/lib/supabase";
import type { Dictionary } from "@/i18n/get-dictionary";

// Delt mellom /admin og /min-side — sponsor-/partnerbannere arenaen
// laster opp selv, i samme 16:9-format som infokarusellen (se
// InfoTavleCard.tsx) — droppet 21:9 fordi det var upraktisk å produsere og
// gjenbruke på/fra en vanlig storskjerm. Vises i venteskjermen i mobilappen
// (nedre ~1/3, der det tidligere kun var en mørk overlay-boks med tekst) mens
// publikum venter på at sendingen skal starte. Ikke noe eget navnefelt —
// sponsorens navn ligger allerede i selve bildet, akkurat som på et ekte
// sponsorbord.

const MAKS_STORRELSE_MB = 2;
const GODTATTE_TYPER = ["image/png", "image/jpeg", "image/jpg", "image/svg+xml", "image/webp"];

function cropTo16x9(file: File, errors: { process: string; load: string }): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const targetRatio = 16 / 9;
      const srcRatio = img.width / img.height;
      let sx = 0, sy = 0, sw = img.width, sh = img.height;
      if (srcRatio > targetRatio) {
        sw = img.height * targetRatio;
        sx = (img.width - sw) / 2;
      } else {
        sh = img.width / targetRatio;
        sy = (img.height - sh) / 2;
      }
      // 640x360 holder god margin for skarphet siden lysbildet i praksis kun
      // vises 80px høyt i appens karusell (SponsorCarousel/detail_screen.dart)
      // — 1280x720 var unødvendig tungt å laste for publikum på arenaen.
      const canvas = document.createElement("canvas");
      canvas.width = 640;
      canvas.height = 360;
      const ctx = canvas.getContext("2d");
      if (!ctx) { reject(new Error(errors.process)); return; }
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => {
        if (blob) resolve(blob); else reject(new Error(errors.process));
      }, "image/jpeg", 0.9);
    };
    img.onerror = () => reject(new Error(errors.load));
    img.src = objectUrl;
  });
}

export function SponsorerCard({ arenaId, embedded, dict }: { arenaId: string; embedded?: boolean; dict: Dictionary }) {
  const t = dict.cards.sponsorer;
  const inputRef = useRef<HTMLInputElement>(null);
  const [sponsorer, setSponsorer] = useState<Sponsor[] | null>(null);
  const [dragging, setDragging] = useState(false);
  const [lasterOpp, setLasterOpp] = useState(false);
  const [feil, setFeil] = useState("");
  const [fjernerId, setFjernerId] = useState<string | null>(null);

  useEffect(() => {
    let aktiv = true;
    supabase
      .from("sponsorer")
      .select("*")
      .eq("arena_id", arenaId)
      .order("opprettet", { ascending: true })
      .then(({ data, error }) => {
        if (aktiv && !error) setSponsorer((data as Sponsor[]) ?? []);
      });
    return () => { aktiv = false; };
  }, [arenaId]);

  async function handleFile(file: File | null) {
    setFeil("");
    if (!file) return;
    if (!GODTATTE_TYPER.includes(file.type)) {
      setFeil(t.errorType);
      return;
    }
    if (file.size > MAKS_STORRELSE_MB * 1024 * 1024) {
      setFeil(`${t.errorSizePrefix} ${MAKS_STORRELSE_MB} ${t.errorSizeSuffix}`);
      return;
    }

    setLasterOpp(true);
    try {
      const cropped = await cropTo16x9(file, { process: t.errorProcessImage, load: t.errorLoadImage });
      const path = `${arenaId}/tavle-${Date.now()}.jpg`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("arena-sponsorer")
        .upload(path, cropped, { contentType: "image/jpeg" });
      if (uploadError || !uploadData) throw new Error(uploadError?.message ?? t.errorUploadFailed);
      const publicUrl = supabase.storage.from("arena-sponsorer").getPublicUrl(uploadData.path).data.publicUrl;
      const { data: inserted, error: insertError } = await supabase
        .from("sponsorer")
        .insert({ arena_id: arenaId, logo_url: publicUrl })
        .select()
        .single();
      if (insertError || !inserted) throw new Error(insertError?.message ?? t.errorSaveFailed);
      setSponsorer(prev => [...(prev ?? []), inserted as Sponsor]);
      if (inputRef.current) inputRef.current.value = "";
    } catch (err) {
      setFeil(err instanceof Error ? err.message : t.errorUploadFailed);
    } finally {
      setLasterOpp(false);
    }
  }

  async function handleToggleAktiv(sponsor: Sponsor) {
    const nyAktiv = !sponsor.aktiv;
    setSponsorer(prev => (prev ?? []).map(s => s.id === sponsor.id ? { ...s, aktiv: nyAktiv } : s));
    const { error } = await supabase.from("sponsorer").update({ aktiv: nyAktiv }).eq("id", sponsor.id);
    if (error) {
      setSponsorer(prev => (prev ?? []).map(s => s.id === sponsor.id ? { ...s, aktiv: !nyAktiv } : s));
      setFeil(error.message);
    }
  }

  async function handleFjern(sponsor: Sponsor) {
    setFjernerId(sponsor.id);
    setFeil("");
    const { error } = await supabase.from("sponsorer").delete().eq("id", sponsor.id);
    if (!error) {
      // Selve bildefila i lagring slettes ikke automatisk når databaseraden
      // fjernes — uten dette hoper foreldreløse filer seg opp i bucketen.
      const path = sponsor.logo_url.split("/arena-sponsorer/")[1];
      if (path) await supabase.storage.from("arena-sponsorer").remove([path]);
    }
    setFjernerId(null);
    if (error) { setFeil(error.message); return; }
    setSponsorer(prev => (prev ?? []).filter(s => s.id !== sponsor.id));
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

      {(sponsorer ?? []).length > 0 && (
        <>
          <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.35)", marginBottom: "8px" }}>
            {t.libraryNote}
          </p>
          <div style={{ display: "flex", flexDirection: "column" as const, gap: "10px", marginBottom: "16px" }}>
            {(sponsorer ?? []).map(s => (
              <div key={s.id} style={{ position: "relative" as const, width: "100%", aspectRatio: "16 / 9", borderRadius: "10px", overflow: "hidden", border: s.aktiv ? "1px solid rgba(51,211,196,0.12)" : "1px solid rgba(255,255,255,0.08)" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={s.logo_url} alt="Sponsor" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", opacity: s.aktiv ? 1 : 0.35, transition: "opacity 0.15s" }} />
                <button
                  type="button"
                  onClick={() => handleFjern(s)}
                  disabled={fjernerId === s.id}
                  style={{ position: "absolute", top: "6px", right: "6px", background: "rgba(7,62,70,0.75)", border: "none", borderRadius: "6px", color: "#D94F4F", fontSize: "12px", padding: "3px 8px", cursor: "pointer" }}
                >
                  {fjernerId === s.id ? "…" : "✕"}
                </button>
                <button
                  type="button"
                  onClick={() => handleToggleAktiv(s)}
                  style={{
                    position: "absolute", bottom: "6px", left: "6px",
                    background: s.aktiv ? "rgba(51,211,196,0.9)" : "rgba(7,62,70,0.85)",
                    color: s.aktiv ? "#073E46" : "rgba(255,255,255,0.7)",
                    border: s.aktiv ? "none" : "1px solid rgba(255,255,255,0.25)",
                    borderRadius: "6px", fontSize: "12px", fontWeight: 700, padding: "4px 10px", cursor: "pointer",
                  }}
                >
                  {s.aktiv ? t.visibleNow : t.hidden}
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        style={{
          width: "100%", minHeight: "90px", borderRadius: "10px",
          border: `2px dashed ${borderColor}`,
          backgroundColor: bgColor,
          display: "flex", flexDirection: "column" as const, alignItems: "center", justifyContent: "center",
          gap: "6px", cursor: "pointer", padding: "16px",
          transition: "border-color 0.15s, background-color 0.15s",
        }}
        onMouseEnter={e => { if (!dragging) (e.currentTarget as HTMLElement).style.borderColor = "#33D3C4"; }}
        onMouseLeave={e => { if (!dragging) (e.currentTarget as HTMLElement).style.borderColor = borderColor; }}
      >
        <span style={{ fontSize: "20px", opacity: 0.35 }}>🖼</span>
        <span style={{ fontSize: "13px", color: "rgba(255,255,255,0.5)", textAlign: "center" as const }}>
          {lasterOpp ? t.uploading : t.dropPrompt}
        </span>
        <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.25)" }}>{t.cropHintPrefix} {MAKS_STORRELSE_MB} {t.cropHintSuffix}</span>
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/svg+xml,image/webp"
          onChange={e => handleFile(e.target.files?.[0] ?? null)}
          disabled={lasterOpp}
          style={{ display: "none" }}
        />
      </div>
      {feil && <p style={{ color: "#D94F4F", fontSize: "13px", marginTop: "8px" }}>{feil}</p>}
    </div>
  );
}

const cardStyle: React.CSSProperties = { backgroundColor: "#1E293B", border: "1px solid rgba(51,211,196,0.12)", borderRadius: "16px", padding: "28px" };
const sectionHeadingStyle: React.CSSProperties = { fontFamily: "var(--font-montserrat), system-ui, sans-serif", fontWeight: 700, fontSize: "18px" };
