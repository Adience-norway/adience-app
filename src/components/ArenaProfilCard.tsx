"use client";

import { useState } from "react";
import { supabase, type Arena } from "@/lib/supabase";
import type { Dictionary, Locale } from "@/i18n/get-dictionary";

// Shared between /min-side (arena owner editing their own arena) and /admin
// (Ådience staff editing any arena) — keep both call sites reusing this one
// implementation rather than maintaining two copies of the AI-generate +
// crop-to-16:9 upload logic.

const STANDARD_FORSIDEBILDE = "/media/adience-placeholder-forsidebilde.jpg";

function cropTo16x9(file: Blob, errors: { process: string; load: string }): Promise<Blob> {
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
      const canvas = document.createElement("canvas");
      canvas.width = 1280;
      canvas.height = 720;
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

export function ArenaProfilCard({ arena, onSaved, embedded, dict, locale }: { arena: Arena; onSaved: () => void; embedded?: boolean; dict: Dictionary; locale: Locale }) {
  const t = dict.cards.arenaProfil;
  const [beskrivelse, setBeskrivelse] = useState(arena.beskrivelse ?? "");
  const [stikkord, setStikkord] = useState("");
  const [genererer, setGenererer] = useState(false);
  const [genFeil, setGenFeil] = useState("");
  const [lagrerTekst, setLagrerTekst] = useState(false);
  const [tekstLagret, setTekstLagret] = useState(false);

  const [coverPreviewUrl, setCoverPreviewUrl] = useState<string | null>(arena.cover_image_url);
  const [coverError, setCoverError] = useState("");
  const [lasterOppBilde, setLasterOppBilde] = useState(false);

  const [visInfotavle, setVisInfotavle] = useState(arena.vis_infotavle);
  const [lagrerTavleValg, setLagrerTavleValg] = useState(false);

  async function handleTavleToggle(nyVerdi: boolean) {
    setVisInfotavle(nyVerdi);
    setLagrerTavleValg(true);
    const { error } = await supabase.from("arenaer").update({ vis_infotavle: nyVerdi }).eq("id", arena.id);
    setLagrerTavleValg(false);
    if (error) { setVisInfotavle(!nyVerdi); return; }
    onSaved();
  }

  async function handleForeslaTekst() {
    setGenererer(true);
    setGenFeil("");
    try {
      const res = await fetch("/api/generate-description", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ arenanavn: arena.arenanavn, kategori: arena.kategori, by: arena.by, stikkord, locale }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? t.errorGeneric);
      setBeskrivelse(data.tekst);
    } catch (err) {
      setGenFeil(err instanceof Error ? err.message : t.errorGeneric);
    } finally {
      setGenererer(false);
    }
  }

  async function handleLagreTekst() {
    setLagrerTekst(true);
    const { error } = await supabase.from("arenaer").update({ beskrivelse }).eq("id", arena.id);
    setLagrerTekst(false);
    if (!error) {
      setTekstLagret(true);
      onSaved();
      setTimeout(() => setTekstLagret(false), 3000);
    }
  }

  async function handleCoverChange(e: React.ChangeEvent<HTMLInputElement>) {
    setCoverError("");
    const file = e.target.files?.[0];
    if (!file) return;

    const erHeic = /image\/hei[cf]/i.test(file.type) || /\.(heic|heif)$/i.test(file.name);
    if (!file.type.startsWith("image/") && !erHeic) { setCoverError(t.errorSelectImage); return; }
    // Vi re-koder alltid til en ren 1280×720 JPEG under, så inn-størrelsen kan
    // være romslig — grensen er bare for å unngå å laste et enormt bilde i minnet.
    if (file.size > 40 * 1024 * 1024) { setCoverError(t.errorTooBig); return; }

    setLasterOppBilde(true);
    try {
      let kilde: Blob = file;
      if (erHeic) {
        // iPhone lagrer bilder som HEIC. Nettlesere utenom Safari kan ikke tegne
        // HEIC på canvas, så vi konverterer til JPEG først. Biblioteket lastes
        // kun her, ved behov, så det ikke tynger resten av appen.
        const heic2any = (await import("heic2any")).default;
        const konvertert = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.92 });
        kilde = Array.isArray(konvertert) ? konvertert[0] : konvertert;
      }
      const cropped = await cropTo16x9(kilde, { process: t.errorProcessImage, load: t.errorLoadImage });
      const path = `${arena.id}/forside-${Date.now()}.jpg`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("arena-cover-bilder")
        .upload(path, cropped, { contentType: "image/jpeg" });
      if (uploadError || !uploadData) throw new Error(uploadError?.message ?? t.errorUploadFailed);
      const publicUrl = supabase.storage.from("arena-cover-bilder").getPublicUrl(uploadData.path).data.publicUrl;
      const { error: updateError } = await supabase.from("arenaer").update({ cover_image_url: publicUrl }).eq("id", arena.id);
      if (updateError) throw new Error(updateError.message);
      setCoverPreviewUrl(publicUrl);
      onSaved();
    } catch (err) {
      setCoverError(err instanceof Error ? err.message : t.errorBadImage);
    } finally {
      setLasterOppBilde(false);
    }
  }

  return (
    <div style={embedded ? {} : { ...cardStyle, marginTop: "24px" }}>
      {!embedded && <h3 style={{ ...sectionHeadingStyle, marginBottom: "4px" }}>{t.heading}</h3>}
      {!embedded && (
        <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "13px", marginBottom: "20px" }}>
          {t.subtitle}
        </p>
      )}

      <label style={fieldLabelStyle}>{t.keywordsLabel}</label>
      <input
        type="text"
        value={stikkord}
        onChange={(e) => setStikkord(e.target.value)}
        style={{ ...inputStyle, marginBottom: "16px" }}
        placeholder={t.keywordsPlaceholder}
      />

      <label style={fieldLabelStyle}>{t.descLabel}</label>
      {/* Beskrivelsen vises kun i mobil-appen, så vi redigerer den i en ramme med
          samme bredde og tekststil som en telefon (WYSIWYG) — da ser eieren
          nøyaktig hvordan teksten brytes, i stedet for å skrive i full skjermbredde. */}
      <div style={{ maxWidth: "380px", backgroundColor: "#073E46", border: "8px solid #0c2b31", borderRadius: "30px", padding: "22px 18px", boxShadow: "0 12px 34px rgba(0,0,0,0.28)" }}>
        <textarea
          value={beskrivelse}
          onChange={(e) => setBeskrivelse(e.target.value)}
          rows={9}
          style={{ width: "100%", background: "transparent", border: "none", outline: "none", color: "rgba(255,255,255,0.88)", fontSize: "15px", lineHeight: 1.6, fontFamily: "var(--font-inter), system-ui, sans-serif", resize: "vertical" as const }}
          placeholder={t.descPlaceholder}
        />
      </div>
      <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.35)", marginTop: "6px" }}>
        {t.charCountPrefix} {beskrivelse.length} {t.charCountSuffix}
      </p>
      <div style={{ display: "flex", gap: "10px", marginTop: "10px", flexWrap: "wrap" as const, alignItems: "center" }}>
        <button type="button" onClick={handleForeslaTekst} disabled={genererer} style={ghostBtnStyle}>
          {genererer ? t.generating : t.suggestText}
        </button>
        <button type="button" onClick={handleLagreTekst} disabled={lagrerTekst} style={tealBtnStyle}>
          {lagrerTekst ? t.saving : t.saveText}
        </button>
        {tekstLagret && <span style={{ color: "#33D3C4", fontSize: "13px" }}>{t.saved}</span>}
      </div>
      {genFeil && <p style={{ color: "#D94F4F", fontSize: "13px", marginTop: "8px" }}>{genFeil}</p>}

      <div style={{ marginTop: "24px" }}>
        <label style={fieldLabelStyle}>{t.coverLabel}</label>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={coverPreviewUrl ?? STANDARD_FORSIDEBILDE}
          alt={t.coverAlt}
          style={{ width: "100%", maxWidth: "420px", aspectRatio: "16 / 9", objectFit: "cover", borderRadius: "10px", marginBottom: "8px", display: "block" }}
        />
        {!coverPreviewUrl && (
          <p style={{ color: "rgba(255,255,255,0.35)", fontSize: "12px", marginBottom: "12px" }}>
            {t.coverDefaultNote}
          </p>
        )}
        <label>
          <input type="file" accept="image/*,.heic,.heif" onChange={handleCoverChange} style={{ display: "none" }} disabled={lasterOppBilde} />
          <span style={{ ...fileInputBtnStyle }}>
            {lasterOppBilde ? t.coverUploading : t.coverChooseText}
          </span>
        </label>
        {coverError && <p style={{ color: "#D94F4F", fontSize: "13px", marginTop: "8px" }}>{coverError}</p>}
      </div>

      <div style={{ marginTop: "24px", display: "flex", alignItems: "flex-start", gap: "12px" }}>
        <label style={{ position: "relative", display: "inline-block", width: "40px", height: "22px", flexShrink: 0, marginTop: "2px", cursor: lagrerTavleValg ? "wait" : "pointer" }}>
          <input
            type="checkbox"
            checked={visInfotavle}
            disabled={lagrerTavleValg}
            onChange={(e) => handleTavleToggle(e.target.checked)}
            style={{ position: "absolute", opacity: 0, width: "100%", height: "100%", margin: 0, cursor: "inherit" }}
          />
          <span style={{ position: "absolute", inset: 0, backgroundColor: visInfotavle ? "#33D3C4" : "rgba(255,255,255,0.15)", borderRadius: "999px", transition: "background-color 0.2s" }} />
          <span style={{ position: "absolute", top: "3px", left: visInfotavle ? "21px" : "3px", width: "16px", height: "16px", backgroundColor: "#ffffff", borderRadius: "50%", transition: "left 0.2s" }} />
        </label>
        <div>
          <p style={{ fontSize: "14px", fontWeight: 500, color: "#ffffff", margin: 0 }}>{t.tavleToggleLabel}</p>
          <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.4)", marginTop: "4px", lineHeight: 1.5 }}>{t.tavleToggleHint}</p>
        </div>
      </div>
    </div>
  );
}

const cardStyle: React.CSSProperties = { backgroundColor: "#1E293B", border: "1px solid rgba(51,211,196,0.12)", borderRadius: "16px", padding: "28px" };
const sectionHeadingStyle: React.CSSProperties = { fontFamily: "var(--font-montserrat), system-ui, sans-serif", fontWeight: 700, fontSize: "18px" };
const fieldLabelStyle: React.CSSProperties = { display: "block", fontSize: "13px", fontWeight: 500, color: "rgba(255,255,255,0.6)", marginBottom: "8px", letterSpacing: "0.03em" };
const inputStyle: React.CSSProperties = { width: "100%", backgroundColor: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "8px", padding: "12px 16px", color: "#ffffff", fontSize: "15px", outline: "none", fontFamily: "var(--font-inter), system-ui, sans-serif" };
const ghostBtnStyle: React.CSSProperties = { backgroundColor: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "8px", padding: "10px 16px", color: "rgba(255,255,255,0.6)", fontSize: "13px", cursor: "pointer", fontFamily: "var(--font-inter), system-ui, sans-serif" };
const tealBtnStyle: React.CSSProperties = { backgroundColor: "#33D3C4", border: "none", borderRadius: "8px", padding: "12px 20px", color: "#073E46", fontSize: "14px", fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-montserrat), system-ui, sans-serif", letterSpacing: "0.03em" };
const fileInputBtnStyle: React.CSSProperties = { display: "inline-flex", alignItems: "center", backgroundColor: "rgba(255,255,255,0.05)", border: "1px dashed rgba(255,255,255,0.2)", borderRadius: "8px", padding: "12px 20px", color: "rgba(255,255,255,0.5)", fontSize: "14px", cursor: "pointer", transition: "border-color 0.2s" };
