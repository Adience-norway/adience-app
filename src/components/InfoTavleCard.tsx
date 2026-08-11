"use client";

import { useEffect, useRef, useState } from "react";
import { supabase, type InfoSlide } from "@/lib/supabase";
import type { Dictionary, Locale } from "@/i18n/get-dictionary";

// Delt mellom /admin og /min-side — informasjonskarusellen. Enkel liste med
// lysbilder som roterer kontinuerlig i venteskjermen. 16:9-format med vilje:
// samme bilde kan lastes rett inn i arenaens egen storskjerm-programvare,
// ikke bare vises i appen.

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

export function InfoTavleCard({ arenaId, embedded, dict, locale }: { arenaId: string; embedded?: boolean; dict: Dictionary; locale: Locale }) {
  const t = dict.cards.infoTavle;
  const inputRef = useRef<HTMLInputElement>(null);
  const [slides, setSlides] = useState<InfoSlide[] | null>(null);
  const [dragging, setDragging] = useState(false);
  const [lasterOpp, setLasterOpp] = useState(false);
  const [feil, setFeil] = useState("");
  const [type, setType] = useState<"standard" | "dagens">("standard");
  const [fjernerId, setFjernerId] = useState<string | null>(null);

  useEffect(() => {
    let aktiv = true;
    supabase
      .from("infotavle")
      .select("*")
      .eq("arena_id", arenaId)
      .order("opprettet", { ascending: true })
      .then(({ data, error }) => {
        if (aktiv && !error) setSlides((data as InfoSlide[]) ?? []);
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
      const path = `${arenaId}/lysbilde-${Date.now()}.jpg`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("arena-infotavle")
        .upload(path, cropped, { contentType: "image/jpeg" });
      if (uploadError || !uploadData) throw new Error(uploadError?.message ?? t.errorUploadFailed);
      const publicUrl = supabase.storage.from("arena-infotavle").getPublicUrl(uploadData.path).data.publicUrl;
      const { data: inserted, error: insertError } = await supabase
        .from("infotavle")
        .insert({ arena_id: arenaId, bilde_url: publicUrl, type })
        .select()
        .single();
      if (insertError || !inserted) throw new Error(insertError?.message ?? t.errorSaveFailed);
      setSlides(prev => [...(prev ?? []), inserted as InfoSlide]);
      if (inputRef.current) inputRef.current.value = "";
    } catch (err) {
      setFeil(err instanceof Error ? err.message : t.errorUploadFailed);
    } finally {
      setLasterOpp(false);
    }
  }

  async function handleToggleAktiv(slide: InfoSlide) {
    const nyAktiv = !slide.aktiv;
    setSlides(prev => (prev ?? []).map(s => s.id === slide.id ? { ...s, aktiv: nyAktiv } : s));
    const { error } = await supabase.from("infotavle").update({ aktiv: nyAktiv }).eq("id", slide.id);
    if (error) {
      setSlides(prev => (prev ?? []).map(s => s.id === slide.id ? { ...s, aktiv: !nyAktiv } : s));
      setFeil(error.message);
    }
  }

  async function handleFjern(slide: InfoSlide) {
    setFjernerId(slide.id);
    setFeil("");
    const { error } = await supabase.from("infotavle").delete().eq("id", slide.id);
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
    <div style={embedded ? {} : { ...cardStyle, marginTop: "24px" }}>
      {!embedded && <h3 style={{ ...sectionHeadingStyle, marginBottom: "4px" }}>{t.heading}</h3>}
      {!embedded && (
        <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "13px", marginBottom: "20px" }}>
          {t.subtitle}
        </p>
      )}

      {(slides ?? []).length > 0 && (
        <>
          <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.35)", marginBottom: "8px" }}>
            {t.libraryNote}
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "12px", marginBottom: "16px" }}>
            {(slides ?? []).map(s => (
              <div key={s.id} style={{ position: "relative" as const, width: "100%", aspectRatio: "16 / 9", borderRadius: "10px", overflow: "hidden", border: s.aktiv ? "1px solid rgba(51,211,196,0.12)" : "1px solid rgba(255,255,255,0.08)" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={s.bilde_url} alt="Info" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", opacity: s.aktiv ? 1 : 0.35, transition: "opacity 0.15s" }} />
                <div style={{ position: "absolute", top: "6px", left: "6px", display: "flex", gap: "4px" }}>
                  {s.type === "dagens" && (
                    <span style={{ background: "rgba(255,107,74,0.85)", color: "#073E46", fontSize: "11px", fontWeight: 700, padding: "2px 8px", borderRadius: "6px" }}>
                      {t.todayBadge} {new Date(s.opprettet).toLocaleDateString(locale === "en" ? "en-GB" : "nb-NO", { day: "2-digit", month: "2-digit" })}
                    </span>
                  )}
                </div>
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
                  {s.aktiv ? t.visibleNow : t.hidden}
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      <div style={{ display: "flex", gap: "8px", marginBottom: "10px" }}>
        {([
          { id: "standard" as const, label: t.typeStandard },
          { id: "dagens" as const, label: t.typeDagens },
        ]).map(opt => (
          <button
            key={opt.id}
            type="button"
            onClick={() => setType(opt.id)}
            style={{
              flex: 1, padding: "9px", borderRadius: "8px", fontSize: "12.5px", fontWeight: type === opt.id ? 700 : 400,
              border: type === opt.id ? "1.5px solid #33D3C4" : "1px solid rgba(255,255,255,0.12)",
              backgroundColor: type === opt.id ? "rgba(51,211,196,0.1)" : "rgba(255,255,255,0.04)",
              color: type === opt.id ? "#33D3C4" : "rgba(255,255,255,0.5)",
              cursor: "pointer", fontFamily: "var(--font-inter), system-ui, sans-serif",
            }}
          >
            {opt.label}
          </button>
        ))}
      </div>
      {type === "dagens" && (
        <p style={{ fontSize: "11px", color: "rgba(255,107,74,0.8)", marginBottom: "10px" }}>
          {t.dagensWarning}
        </p>
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
const inputFieldStyle: React.CSSProperties = { width: "100%", backgroundColor: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "8px", padding: "10px 14px", color: "#ffffff", fontSize: "14px", outline: "none", fontFamily: "var(--font-inter), system-ui, sans-serif", appearance: "none" as const };
