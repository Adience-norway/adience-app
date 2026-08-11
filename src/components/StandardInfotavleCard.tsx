"use client";

import { useEffect, useRef, useState } from "react";
import { supabase, type StandardInfoSlide } from "@/lib/supabase";
import type { Dictionary } from "@/i18n/get-dictionary";

// KUN admin — Ådience-styrt standard informasjonskarusell per land. Fallback-
// innhold for arenaer i det landet som ikke har lastet opp sitt eget ennå —
// så snart arenaen har egne aktive lysbilder, overstyrer disse denne
// standarden i sin helhet (se merge-logikk i Flutter, stream_model.dart).
// Samme 16:9-format som arena-nivå InfoTavleCard, men lagret i
// `standard_infotavle` (land-scoped, ikke arena_id-scoped) og gjenbruker
// `arena-infotavle`-bucketen under en egen `standard/{land}/`-mappesti.

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

export function StandardInfotavleCard({ land, dict }: { land: string; dict: Dictionary }) {
  const t = dict.cards.standardInfoTavle;
  const inputRef = useRef<HTMLInputElement>(null);
  const [slides, setSlides] = useState<StandardInfoSlide[] | null>(null);
  const [dragging, setDragging] = useState(false);
  const [lasterOpp, setLasterOpp] = useState(false);
  const [feil, setFeil] = useState("");
  const [fjernerId, setFjernerId] = useState<string | null>(null);

  useEffect(() => {
    let aktiv = true;
    setSlides(null);
    supabase
      .from("standard_infotavle")
      .select("*")
      .eq("land", land)
      .order("opprettet", { ascending: true })
      .then(({ data, error }) => {
        if (aktiv && !error) setSlides((data as StandardInfoSlide[]) ?? []);
      });
    return () => { aktiv = false; };
  }, [land]);

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
      const path = `standard/${land}/lysbilde-${Date.now()}.jpg`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("arena-infotavle")
        .upload(path, cropped, { contentType: "image/jpeg" });
      if (uploadError || !uploadData) throw new Error(uploadError?.message ?? t.errorUploadFailed);
      const publicUrl = supabase.storage.from("arena-infotavle").getPublicUrl(uploadData.path).data.publicUrl;
      const { data: inserted, error: insertError } = await supabase
        .from("standard_infotavle")
        .insert({ land, bilde_url: publicUrl })
        .select()
        .single();
      if (insertError || !inserted) throw new Error(insertError?.message ?? t.errorSaveFailed);
      setSlides(prev => [...(prev ?? []), inserted as StandardInfoSlide]);
      if (inputRef.current) inputRef.current.value = "";
    } catch (err) {
      setFeil(err instanceof Error ? err.message : t.errorUploadFailed);
    } finally {
      setLasterOpp(false);
    }
  }

  async function handleToggleAktiv(slide: StandardInfoSlide) {
    const nyAktiv = !slide.aktiv;
    setSlides(prev => (prev ?? []).map(s => s.id === slide.id ? { ...s, aktiv: nyAktiv } : s));
    const { error } = await supabase.from("standard_infotavle").update({ aktiv: nyAktiv }).eq("id", slide.id);
    if (error) {
      setSlides(prev => (prev ?? []).map(s => s.id === slide.id ? { ...s, aktiv: !nyAktiv } : s));
      setFeil(error.message);
    }
  }

  async function handleFjern(slide: StandardInfoSlide) {
    setFjernerId(slide.id);
    setFeil("");
    const { error } = await supabase.from("standard_infotavle").delete().eq("id", slide.id);
    if (!error) {
      const path = slide.bilde_url.split("/arena-infotavle/")[1];
      if (path) await supabase.storage.from("arena-infotavle").remove([path]);
    }
    setFjernerId(null);
    if (error) { setFeil(error.message); return; }
    setSlides(prev => (prev ?? []).filter(s => s.id !== slide.id));
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
    <div>
      {slides === null ? (
        <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.35)" }}>{t.loading}</p>
      ) : (
        <>
          {slides.length > 0 && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "12px", marginBottom: "16px" }}>
              {slides.map(s => (
                <div key={s.id} style={{ position: "relative" as const, width: "100%", aspectRatio: "16 / 9", borderRadius: "10px", overflow: "hidden", border: s.aktiv ? "1px solid rgba(51,211,196,0.12)" : "1px solid rgba(255,255,255,0.08)" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={s.bilde_url} alt="Info" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", opacity: s.aktiv ? 1 : 0.35, transition: "opacity 0.15s" }} />
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
                      borderRadius: "6px", fontSize: "11px", fontWeight: 700, padding: "3px 8px", cursor: "pointer",
                    }}
                  >
                    {s.aktiv ? t.active : t.hidden}
                  </button>
                </div>
              ))}
            </div>
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
              {lasterOpp ? t.uploading : `${t.dropPromptPrefix} ${land} ${t.dropPromptSuffix}`}
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
        </>
      )}
      {feil && <p style={{ color: "#D94F4F", fontSize: "13px", marginTop: "8px" }}>{feil}</p>}
    </div>
  );
}

const inputFieldStyle: React.CSSProperties = { width: "100%", backgroundColor: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "8px", padding: "10px 14px", color: "#ffffff", fontSize: "14px", outline: "none", fontFamily: "var(--font-inter), system-ui, sans-serif", appearance: "none" as const };
