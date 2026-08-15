"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import QRCode from "qrcode";
import { supabase } from "@/lib/supabase";
import { sokAdresser, geokodAdresse, type AdresseForslag } from "@/lib/geonorge";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import type { Dictionary, Locale } from "@/i18n/get-dictionary";

/* ─── CONSTANTS ─── */
// Kategori-, land- og kapasitetslistene er datalagerverdier (lagres rått i
// Supabase og gjenbrukes i admin-panelet), ikke visningstekst — derfor
// oversettes de IKKE per språk. Kategoriene er allerede engelske slugs.

const KATEGORIER = [
  "Indoor Sports Venue",
  "Outdoor Sports Venue",
  "Indoor Cultural Venue",
  "Outdoor Cultural Venue",
  "Cultural Center",
  "Theatre",
  "Opera House",
  "Festival",
  "Podcast",
  "Live",
  "Other",
];

const LAND = ["Norge", "Sverige", "Danmark", "Finland", "Spania", "Tyskland", "UK", "Annet"];
const KAPASITETER = ["Under 500", "500–2000", "2000–5000", "5000–15000", "15000+"];

// Daily rate for one-off events — adjust when pricing engine is built
const ENGANGS_PRIS_PER_DAG = 500; // kr/dag

/* ─── HELPERS ─── */

function generateStreamId(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const random = Array.from({ length: 8 }, () =>
    chars[Math.floor(Math.random() * chars.length)]
  ).join("");
  return `ADC${random}${Date.now().toString().slice(-6)}`;
}

// Geonorge gir ferdig gateadresse (adressetekst) + postnummer/poststed, så
// formatterne er trivielle nå — beholdt som funksjoner så visnings-koden under
// slipper å endres.
function formatGateAdresse(r: AdresseForslag): string {
  return r.adressetekst;
}

function formatSuggestionSecondary(r: AdresseForslag): string {
  return [r.postnummer, r.poststed].filter(Boolean).join(" ");
}

type Status = "idle" | "loading" | "success" | "error";
type FlowType = "arena" | "engangsarrangement";
type Registrer = Dictionary["registrer"];

/* ─── ROOT ─── */

export function RegistrerPageContent({ dict, locale }: { dict: Dictionary; locale: Locale }) {
  const t = dict.registrer;
  const [flowType, setFlowType] = useState<FlowType | null>(null);

  if (!flowType) return <TypeSelector onSelect={setFlowType} t={t} locale={locale} />;
  if (flowType === "engangsarrangement") return <EngangsForm onBack={() => setFlowType(null)} t={t} locale={locale} />;
  return <ArenaForm onBack={() => setFlowType(null)} t={t} locale={locale} />;
}

/* ─── TYPE SELECTOR ─── */

function TypeSelector({ onSelect, t, locale }: { onSelect: (ft: FlowType) => void; t: Registrer; locale: Locale }) {
  return (
    <div style={pageStyle}>
      <NavBar t={t} locale={locale} />
      <div style={{ maxWidth: "640px", margin: "0 auto", padding: "64px 24px 100px" }}>
        <div style={{ marginBottom: "48px" }}>
          <span style={labelStyle}>{t.typeSelector.label}</span>
          <h1 style={headingStyle}>{t.typeSelector.title}</h1>
          <p style={subheadStyle}>{t.typeSelector.subtitle}</p>
          <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "14px", lineHeight: 1.6, marginTop: "12px" }}>{t.typeSelector.aiIntro}</p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <button
            onClick={() => onSelect("arena")}
            style={typeCardStyle}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "#33D3C4"; (e.currentTarget as HTMLElement).style.backgroundColor = "rgba(51,211,196,0.05)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(51,211,196,0.18)"; (e.currentTarget as HTMLElement).style.backgroundColor = "#1E293B"; }}
          >
            <div style={{ display: "flex", alignItems: "flex-start", gap: "18px", textAlign: "left" }}>
              <div style={{ fontSize: "28px", flexShrink: 0, marginTop: "2px" }}>🏟</div>
              <div>
                <div style={{ fontFamily: "var(--font-montserrat), system-ui, sans-serif", fontWeight: 700, fontSize: "17px", marginBottom: "6px", color: "#fff" }}>
                  {t.typeSelector.arena.title}
                </div>
                <div style={{ fontSize: "14px", color: "rgba(255,255,255,0.5)", lineHeight: 1.5 }}>
                  {t.typeSelector.arena.description}
                </div>
                <div style={{ marginTop: "10px", display: "flex", gap: "8px", flexWrap: "wrap" as const }}>
                  {t.typeSelector.arena.chips.map(b => (
                    <span key={b} style={chipStyle}><span style={{ color: "#33D3C4" }}>✓</span> {b}</span>
                  ))}
                </div>
              </div>
            </div>
          </button>

          <button
            onClick={() => onSelect("engangsarrangement")}
            style={typeCardStyle}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "#78BE20"; (e.currentTarget as HTMLElement).style.backgroundColor = "rgba(120,190,32,0.05)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(51,211,196,0.18)"; (e.currentTarget as HTMLElement).style.backgroundColor = "#1E293B"; }}
          >
            <div style={{ display: "flex", alignItems: "flex-start", gap: "18px", textAlign: "left" }}>
              <div style={{ fontSize: "28px", flexShrink: 0, marginTop: "2px" }}>🎪</div>
              <div>
                <div style={{ fontFamily: "var(--font-montserrat), system-ui, sans-serif", fontWeight: 700, fontSize: "17px", marginBottom: "6px", color: "#fff" }}>
                  {t.typeSelector.engangs.title}
                </div>
                <div style={{ fontSize: "14px", color: "rgba(255,255,255,0.5)", lineHeight: 1.5 }}>
                  {t.typeSelector.engangs.description}
                </div>
                <div style={{ marginTop: "10px", display: "flex", gap: "8px", flexWrap: "wrap" as const }}>
                  {[`${ENGANGS_PRIS_PER_DAG} ${t.typeSelector.engangs.chips[0]}`, ...t.typeSelector.engangs.chips.slice(1)].map(b => (
                    <span key={b} style={{ ...chipStyle, borderColor: "rgba(120,190,32,0.25)", backgroundColor: "rgba(120,190,32,0.08)" }}>
                      <span style={{ color: "#78BE20" }}>✓</span> {b}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </button>
        </div>

        <p style={{ textAlign: "center", color: "rgba(255,255,255,0.25)", fontSize: "13px", marginTop: "32px" }}>
          {t.typeSelector.footerNote}
        </p>
      </div>
    </div>
  );
}

/* ─── ARENA FORM (existing pilot flow) ─── */

type ArenaFormData = {
  arenanavn: string;
  kategori: string;
  adresse_gate: string;
  postnummer: string;
  by: string;
  land: string;
  kapasitet: string;
  org_nummer: string;
  fornavn: string;
  etternavn: string;
  epost: string;
  telefon: string;
  passord: string;
  gdpr: boolean;
};

function ArenaForm({ onBack, t, locale }: { onBack: () => void; t: Registrer; locale: Locale }) {
  const [form, setForm] = useState<ArenaFormData>({
    arenanavn: "", kategori: "", adresse_gate: "", postnummer: "", by: "",
    land: "Norge", kapasitet: "", org_nummer: "", fornavn: "", etternavn: "",
    epost: "", telefon: "", passord: "", gdpr: false,
  });

  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [suggestions, setSuggestions] = useState<AdresseForslag[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoError, setLogoError] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [streamId, setStreamId] = useState("");
  const [qrDataUrl, setQrDataUrl] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const q = form.adresse_gate;
    if (q.length < 4) { setSuggestions([]); return; }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const data = await sokAdresser(q);
        setSuggestions(data);
        setShowSuggestions(data.length > 0);
      } catch { setSuggestions([]); }
    }, 650);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [form.adresse_gate]);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node))
        setShowSuggestions(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value, type } = e.target;
    const val = type === "checkbox" ? (e.target as HTMLInputElement).checked : value;
    setForm(prev => ({ ...prev, [name]: val }));
    if (name === "adresse_gate") { setLat(null); setLng(null); }
  }

  function handleAddressSelect(r: AdresseForslag) {
    setForm(prev => ({
      ...prev,
      adresse_gate: r.adressetekst,
      postnummer: r.postnummer || prev.postnummer,
      by: r.poststed || prev.by,
    }));
    setLat(r.lat);
    setLng(r.lng);
    setSuggestions([]);
    setShowSuggestions(false);
  }

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    setLogoError("");
    const file = e.target.files?.[0];
    if (!file) return;
    if (!["image/png", "image/jpeg"].includes(file.type)) { setLogoError(t.common.fileErrorType); return; }
    if (file.size > 5 * 1024 * 1024) { setLogoError(t.common.fileErrorSize); return; }
    setLogoFile(file);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setErrorMsg("");

    const stream_id = generateStreamId();

    let finalLat = lat, finalLng = lng;
    // Require the street AND (postnummer or by) — the street name alone is too ambiguous
    // and can match an unrelated exact house number elsewhere in the country.
    if ((!finalLat || !finalLng) && form.adresse_gate && (form.postnummer || form.by)) {
      try {
        const q = [form.adresse_gate, form.postnummer, form.by].filter(Boolean).join(" ");
        const hit = await geokodAdresse(q);
        if (hit) { finalLat = hit.lat; finalLng = hit.lng; }
      } catch { /* proceed without coords */ }
    }

    let logo_url: string | null = null;
    if (logoFile) {
      const ext = logoFile.type === "image/png" ? "png" : "jpg";
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("arena-logoer").upload(`${stream_id}/logo.${ext}`, logoFile, { contentType: logoFile.type });
      if (!uploadError && uploadData)
        logo_url = supabase.storage.from("arena-logoer").getPublicUrl(uploadData.path).data.publicUrl;
    }

    const { data: arena, error: arenaError } = await supabase.from("arenaer").insert({
      arenanavn: form.arenanavn,
      kategori: form.kategori || null,
      adresse: form.adresse_gate || null,
      adresse_gate: form.adresse_gate || null,
      postnummer: form.postnummer || null,
      by: form.by || null,
      land: form.land || null,
      lat: finalLat, lng: finalLng,
      kapasitet: form.kapasitet || null,
      org_nummer: form.org_nummer || null,
      fornavn: form.fornavn || null,
      etternavn: form.etternavn || null,
      epost: form.epost || null,
      telefon: form.telefon || null,
      logo_url, stream_id,
    }).select("id").single();

    if (arenaError) {
      setStatus("error");
      setErrorMsg(arenaError.code === "23505" ? t.arenaForm.duplicateError : arenaError.message);
      return;
    }

    const { error: pilotError } = await supabase.from("pilot_perioder").insert({ arena_id: arena.id });
    if (pilotError) { setStatus("error"); setErrorMsg(pilotError.message); return; }

    // Creates a real Supabase Auth account so the owner can later log in on /min-side.
    // A database trigger auto-creates the matching `brukere` row on signup, links it to the
    // arena just created above (matched by e-post), and fills in the name — all server-side,
    // so it works even before the user confirms their e-mail (no client session needed).
    const { error: authError } = await supabase.auth.signUp({
      email: form.epost,
      password: form.passord,
      options: { data: { fornavn: form.fornavn, etternavn: form.etternavn, sprak: locale } },
    });
    if (authError) { setStatus("error"); setErrorMsg(authError.message); return; }

    fetch("/api/send-welcome", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ epost: form.epost, fornavn: form.fornavn, streamId: stream_id, locale }),
    }).catch(() => {});

    try {
      const qr = await QRCode.toDataURL(`https://app.adience.no/a/${stream_id}`, {
        width: 220, margin: 2, color: { dark: "#073E46", light: "#33D3C4" },
      });
      setQrDataUrl(qr);
    } catch { /* non-critical */ }

    setStreamId(stream_id);
    setStatus("success");
  }

  const homeHref = locale === "en" ? "/en" : "/";

  if (status === "success") {
    return (
      <div style={pageStyle}>
        <NavBar t={t} locale={locale} />
        <div style={{ maxWidth: "560px", margin: "64px auto", padding: "0 24px 80px" }}>
          <div style={successCardStyle}>
            <div style={successIconStyle}><CheckIcon /></div>
            <h2 style={successHeadingStyle}>{t.arenaForm.success.title}</h2>
            <p style={successSubStyle}>
              {t.arenaForm.success.subtitlePrefix} <strong>{form.epost}</strong> {t.arenaForm.success.subtitleSuffix}
            </p>
            <div style={streamIdBoxStyle}>
              <div style={monoLabelStyle}>{t.common.streamIdLabel}</div>
              <div style={{ fontFamily: "var(--font-ibm-plex-mono), monospace", fontSize: "18px", color: "#33D3C4", letterSpacing: "0.06em", fontWeight: 500 }}>
                {streamId}
              </div>
            </div>
            {qrDataUrl && (
              <div style={{ marginBottom: "32px" }}>
                <div style={monoLabelStyle}>{t.common.qrLabel}</div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={qrDataUrl} alt={t.common.qrResultAlt} style={{ width: "160px", height: "160px", borderRadius: "12px" }} />
                <p style={{ color: "rgba(255,255,255,0.3)", fontSize: "12px", marginTop: "8px" }}>{t.common.qrHint}</p>
              </div>
            )}
            <a href={homeHref} style={backLinkStyle}>{t.common.backToFrontpage}</a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <NavBar t={t} locale={locale} />
      <div style={{ maxWidth: "640px", margin: "0 auto", padding: "64px 24px 100px" }}>
        <div style={{ marginBottom: "48px" }}>
          <button onClick={onBack} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.3)", fontSize: "13px", cursor: "pointer", padding: 0, marginBottom: "16px", display: "block" }}>
            {t.common.backToTypeSelect}
          </button>
          <span style={labelStyle}>{t.arenaForm.label}</span>
          <h1 style={headingStyle}>{t.arenaForm.title}</h1>
          <p style={subheadStyle}>{t.arenaForm.subtitle}</p>
        </div>

        <div style={benefitsRowStyle}>
          {t.arenaForm.benefits.map(b => (
            <div key={b} style={benefitChipStyle}>
              <span style={{ color: "#33D3C4", marginRight: "6px" }}>✓</span>
              <span style={{ fontSize: "13px", color: "rgba(255,255,255,0.7)" }}>{b}</span>
            </div>
          ))}
        </div>

        <form onSubmit={handleSubmit} style={formStyle}>
          <SectionLabel>{t.common.sectionAboutArena}</SectionLabel>
          <FormField label={t.common.fieldArenanavn}>
            <Input name="arenanavn" value={form.arenanavn} onChange={handleChange} required placeholder={t.common.placeholderArenanavn} />
          </FormField>
          <FormField label={t.common.fieldKategori}>
            <SelectInput name="kategori" value={form.kategori} onChange={handleChange}>
              <option value="">{t.common.placeholderKategori}</option>
              {KATEGORIER.map(k => <option key={k} value={k}>{k}</option>)}
            </SelectInput>
          </FormField>
          <FormField label={t.common.fieldAdresse}>
            <div style={{ position: "relative" }} ref={suggestionsRef}>
              <Input name="adresse_gate" value={form.adresse_gate} onChange={handleChange} required placeholder={t.common.placeholderAdresse} autoComplete="off" />
              {lat && lng && (
                <div style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", color: "#33D3C4", fontSize: "12px", fontFamily: "var(--font-ibm-plex-mono), monospace" }}>{t.common.geocoded}</div>
              )}
              {showSuggestions && suggestions.length > 0 && (
                <div style={suggestionsDropStyle}>
                  {suggestions.map(s => (
                    <button key={`${s.adressetekst}-${s.lat}`} type="button" onClick={() => handleAddressSelect(s)} style={suggestionItemStyle}
                      onMouseEnter={e => { e.currentTarget.style.backgroundColor = "rgba(51,211,196,0.1)"; }}
                      onMouseLeave={e => { e.currentTarget.style.backgroundColor = "transparent"; }}>
                      <span style={{ color: "#ffffff", fontSize: "13px" }}>{formatGateAdresse(s)}</span>
                      <span style={{ color: "rgba(255,255,255,0.35)", fontSize: "12px", marginLeft: "6px" }}>{formatSuggestionSecondary(s)}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </FormField>
          <div style={gridTwo}>
            <FormField label={t.common.fieldPostnummer}><Input name="postnummer" value={form.postnummer} onChange={handleChange} placeholder={t.common.placeholderPostnummer} /></FormField>
            <FormField label={t.common.fieldBy}><Input name="by" value={form.by} onChange={handleChange} placeholder={t.common.placeholderBy} /></FormField>
          </div>
          <FormField label={t.common.fieldLand}>
            <SelectInput name="land" value={form.land} onChange={handleChange}>{LAND.map(l => <option key={l} value={l}>{l}</option>)}</SelectInput>
          </FormField>
          <FormField label={t.common.fieldKapasitet}>
            <SelectInput name="kapasitet" value={form.kapasitet} onChange={handleChange}>
              <option value="">{t.common.placeholderKapasitet}</option>
              {KAPASITETER.map(k => <option key={k} value={k}>{k}</option>)}
            </SelectInput>
          </FormField>
          <FormField label={t.common.fieldOrgNummerRequired}>
            <Input name="org_nummer" value={form.org_nummer} onChange={handleChange} required placeholder={t.common.placeholderOrgNummer} />
          </FormField>

          <Divider />
          <SectionLabel>{t.common.sectionContact}</SectionLabel>
          <div style={gridTwo}>
            <FormField label={t.common.fieldFornavn}><Input name="fornavn" value={form.fornavn} onChange={handleChange} required placeholder={t.common.placeholderFornavn} /></FormField>
            <FormField label={t.common.fieldEtternavn}><Input name="etternavn" value={form.etternavn} onChange={handleChange} required placeholder={t.common.placeholderEtternavn} /></FormField>
          </div>
          <FormField label={t.common.fieldEpostArena}><Input type="email" name="epost" value={form.epost} onChange={handleChange} required placeholder={t.common.placeholderEpostArena} /></FormField>
          <FormField label={t.common.fieldTelefon}><Input type="tel" name="telefon" value={form.telefon} onChange={handleChange} placeholder={t.common.placeholderTelefon} /></FormField>
          <FormField label={t.common.fieldPassord}>
            <Input type="password" name="passord" value={form.passord} onChange={handleChange} required minLength={6} placeholder={t.common.placeholderPassord} />
          </FormField>

          <Divider />
          <SectionLabel>{t.common.sectionLogo}</SectionLabel>
          <div style={{ marginBottom: "24px" }}>
            <label style={fileInputLabelStyle}>
              <input type="file" accept="image/png,image/jpeg" onChange={handleLogoChange} style={{ display: "none" }} />
              <span style={fileInputBtnStyle}>{logoFile ? `✓ ${logoFile.name}` : t.common.fileChoose}</span>
            </label>
            {logoError && <p style={{ color: "#D94F4F", fontSize: "13px", marginTop: "8px" }}>{logoError}</p>}
          </div>

          <Divider />
          <GdprCheckbox checked={form.gdpr} onChange={handleChange} t={t} />

          {status === "error" && <div style={errorBoxStyle}><span style={{ color: "#D94F4F", fontWeight: 600 }}>{t.common.errorPrefix}</span>{errorMsg}</div>}

          <button type="submit" disabled={status === "loading"} style={{ ...submitBtnStyle, opacity: status === "loading" ? 0.7 : 1, cursor: status === "loading" ? "not-allowed" : "pointer" }}>
            {status === "loading" ? t.common.registering : t.arenaForm.submit}
          </button>
          <p style={{ textAlign: "center", color: "rgba(255,255,255,0.3)", fontSize: "13px", marginTop: "16px" }}>{t.arenaForm.footerNote}</p>
        </form>
      </div>
    </div>
  );
}

/* ─── ENGANGSARRANGEMENT FORM ─── */

type EngangsFormData = {
  arrangementsnavn: string;
  kategori: string;
  adresse_gate: string;
  postnummer: string;
  by: string;
  land: string;
  org_nummer: string;
  fornavn: string;
  etternavn: string;
  epost: string;
  telefon: string;
  passord: string;
  periode_start: string;
  periode_slutt: string;
  geofence_radius: number;
  gdpr: boolean;
};

function EngangsForm({ onBack, t, locale }: { onBack: () => void; t: Registrer; locale: Locale }) {
  const today = new Date().toISOString().split("T")[0];

  const [form, setForm] = useState<EngangsFormData>({
    arrangementsnavn: "", kategori: "", adresse_gate: "", postnummer: "", by: "",
    land: "Norge", org_nummer: "", fornavn: "", etternavn: "", epost: "", telefon: "", passord: "",
    periode_start: today, periode_slutt: today,
    geofence_radius: 250, gdpr: false,
  });

  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [suggestions, setSuggestions] = useState<AdresseForslag[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoError, setLogoError] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [streamId, setStreamId] = useState("");
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [savedTotalPris, setSavedTotalPris] = useState(0);
  const [savedDays, setSavedDays] = useState(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  const days = useMemo(() => {
    if (!form.periode_start || !form.periode_slutt) return 1;
    const diff = Math.ceil(
      (new Date(form.periode_slutt).getTime() - new Date(form.periode_start).getTime()) / 86400000
    ) + 1;
    return Math.max(1, diff);
  }, [form.periode_start, form.periode_slutt]);

  const totalPris = days * ENGANGS_PRIS_PER_DAG;

  const dateError = form.periode_slutt < form.periode_start ? t.engangsForm.dateError : null;

  useEffect(() => {
    const q = form.adresse_gate;
    if (q.length < 4) { setSuggestions([]); return; }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const data = await sokAdresser(q);
        setSuggestions(data);
        setShowSuggestions(data.length > 0);
      } catch { setSuggestions([]); }
    }, 650);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [form.adresse_gate]);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node))
        setShowSuggestions(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value, type } = e.target;
    const val = type === "checkbox"
      ? (e.target as HTMLInputElement).checked
      : type === "range" || type === "number"
        ? Number(value)
        : value;
    setForm(prev => ({ ...prev, [name]: val }));
    if (name === "adresse_gate") { setLat(null); setLng(null); }
  }

  function handleAddressSelect(r: AdresseForslag) {
    setForm(prev => ({
      ...prev,
      adresse_gate: r.adressetekst,
      postnummer: r.postnummer || prev.postnummer,
      by: r.poststed || prev.by,
    }));
    setLat(r.lat);
    setLng(r.lng);
    setSuggestions([]);
    setShowSuggestions(false);
  }

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    setLogoError("");
    const file = e.target.files?.[0];
    if (!file) return;
    if (!["image/png", "image/jpeg"].includes(file.type)) { setLogoError(t.common.fileErrorType); return; }
    if (file.size > 5 * 1024 * 1024) { setLogoError(t.common.fileErrorSize); return; }
    setLogoFile(file);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (dateError) return;
    setStatus("loading");
    setErrorMsg("");

    const stream_id = generateStreamId();

    let finalLat = lat, finalLng = lng;
    // Require the street AND (postnummer or by) — the street name alone is too ambiguous
    // and can match an unrelated exact house number elsewhere in the country.
    if ((!finalLat || !finalLng) && form.adresse_gate && (form.postnummer || form.by)) {
      try {
        const q = [form.adresse_gate, form.postnummer, form.by].filter(Boolean).join(" ");
        const hit = await geokodAdresse(q);
        if (hit) { finalLat = hit.lat; finalLng = hit.lng; }
      } catch { /* proceed without coords */ }
    }

    let logo_url: string | null = null;
    if (logoFile) {
      const ext = logoFile.type === "image/png" ? "png" : "jpg";
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("arena-logoer").upload(`${stream_id}/logo.${ext}`, logoFile, { contentType: logoFile.type });
      if (!uploadError && uploadData)
        logo_url = supabase.storage.from("arena-logoer").getPublicUrl(uploadData.path).data.publicUrl;
    }

    const { data: arena, error: arenaError } = await supabase.from("arenaer").insert({
      arenanavn: form.arrangementsnavn,
      kategori: form.kategori || null,
      adresse: form.adresse_gate || null,
      adresse_gate: form.adresse_gate || null,
      postnummer: form.postnummer || null,
      by: form.by || null,
      land: form.land || null,
      lat: finalLat, lng: finalLng,
      geofence_radius: form.geofence_radius,
      org_nummer: form.org_nummer || null,
      fornavn: form.fornavn || null,
      etternavn: form.etternavn || null,
      epost: form.epost || null,
      telefon: form.telefon || null,
      logo_url, stream_id,
    }).select("id").single();

    if (arenaError) {
      setStatus("error");
      setErrorMsg(arenaError.code === "23505" ? t.engangsForm.duplicateError : arenaError.message);
      return;
    }

    const { error: abonnementError } = await supabase.from("abonnementer").insert({
      arena_id: arena.id,
      type: "engangsarrangement",
      pris_per_dag: ENGANGS_PRIS_PER_DAG,
      total_pris: totalPris,
      periode_start: new Date(form.periode_start).toISOString(),
      periode_slutt: new Date(form.periode_slutt + "T23:59:59").toISOString(),
    });

    if (abonnementError) {
      setStatus("error");
      setErrorMsg(abonnementError.message);
      return;
    }

    // Creates a real Supabase Auth account so the owner can later log in on /min-side.
    // A database trigger auto-creates the matching `brukere` row on signup, links it to the
    // arena just created above (matched by e-post), and fills in the name — all server-side,
    // so it works even before the user confirms their e-mail (no client session needed).
    const { error: authError } = await supabase.auth.signUp({
      email: form.epost,
      password: form.passord,
      options: { data: { fornavn: form.fornavn, etternavn: form.etternavn, sprak: locale } },
    });
    if (authError) { setStatus("error"); setErrorMsg(authError.message); return; }

    try {
      const qr = await QRCode.toDataURL(`https://app.adience.no/a/${stream_id}`, {
        width: 220, margin: 2, color: { dark: "#073E46", light: "#33D3C4" },
      });
      setQrDataUrl(qr);
    } catch { /* non-critical */ }

    setSavedTotalPris(totalPris);
    setSavedDays(days);
    setStreamId(stream_id);
    setStatus("success");
  }

  const homeHref = locale === "en" ? "/en" : "/";
  const dateLocale = locale === "en" ? "en-GB" : "nb-NO";
  const numberLocale = locale === "en" ? "en-GB" : "nb-NO";

  if (status === "success") {
    return (
      <div style={pageStyle}>
        <NavBar t={t} locale={locale} />
        <div style={{ maxWidth: "560px", margin: "64px auto", padding: "0 24px 80px" }}>
          <div style={successCardStyle}>
            <div style={{ ...successIconStyle, backgroundColor: "#78BE20" }}><CheckIcon /></div>
            <h2 style={successHeadingStyle}>{t.engangsForm.success.title}</h2>
            <p style={successSubStyle}>
              {t.engangsForm.success.subtitlePrefix} <strong>{form.epost}</strong> {t.engangsForm.success.subtitleSuffix}
            </p>

            <div style={{ ...streamIdBoxStyle, borderColor: "rgba(120,190,32,0.2)", backgroundColor: "rgba(120,190,32,0.04)", marginBottom: "16px" }}>
              <div style={monoLabelStyle}>{t.engangsForm.success.periodLabel}</div>
              <div style={{ fontFamily: "var(--font-ibm-plex-mono), monospace", fontSize: "15px", color: "#78BE20", letterSpacing: "0.04em" }}>
                {new Date(form.periode_start).toLocaleDateString(dateLocale)} → {new Date(form.periode_slutt).toLocaleDateString(dateLocale)}
              </div>
            </div>

            <div style={{ ...streamIdBoxStyle, borderColor: "rgba(120,190,32,0.2)", backgroundColor: "rgba(120,190,32,0.04)", marginBottom: "24px" }}>
              <div style={monoLabelStyle}>{t.engangsForm.success.invoiceLabel}</div>
              <div style={{ fontFamily: "var(--font-ibm-plex-mono), monospace", fontSize: "13px", color: "rgba(255,255,255,0.5)", marginBottom: "4px" }}>
                {savedDays} {savedDays !== 1 ? t.engangsForm.dayUnitPlural : t.engangsForm.dayUnit} × {ENGANGS_PRIS_PER_DAG.toLocaleString(numberLocale)} kr/dag
              </div>
              <div style={{ fontFamily: "var(--font-ibm-plex-mono), monospace", fontSize: "22px", color: "#78BE20", fontWeight: 700 }}>
                {savedTotalPris.toLocaleString(numberLocale)} kr
              </div>
            </div>

            <div style={streamIdBoxStyle}>
              <div style={monoLabelStyle}>{t.common.streamIdLabel}</div>
              <div style={{ fontFamily: "var(--font-ibm-plex-mono), monospace", fontSize: "18px", color: "#33D3C4", letterSpacing: "0.06em", fontWeight: 500 }}>
                {streamId}
              </div>
            </div>

            {qrDataUrl && (
              <div style={{ marginBottom: "32px" }}>
                <div style={monoLabelStyle}>{t.common.qrLabel}</div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={qrDataUrl} alt={t.common.qrResultAlt} style={{ width: "160px", height: "160px", borderRadius: "12px" }} />
                <p style={{ color: "rgba(255,255,255,0.3)", fontSize: "12px", marginTop: "8px" }}>{t.common.qrHint}</p>
              </div>
            )}
            <a href={homeHref} style={backLinkStyle}>{t.common.backToFrontpage}</a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <NavBar t={t} locale={locale} />
      <div style={{ maxWidth: "640px", margin: "0 auto", padding: "64px 24px 100px" }}>
        <div style={{ marginBottom: "48px" }}>
          <button onClick={onBack} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.3)", fontSize: "13px", cursor: "pointer", padding: 0, marginBottom: "16px", display: "block" }}>
            {t.common.backToTypeSelect}
          </button>
          <span style={{ ...labelStyle, color: "#78BE20" }}>{t.engangsForm.label}</span>
          <h1 style={headingStyle}>{t.engangsForm.title}</h1>
          <p style={subheadStyle}>
            {t.engangsForm.subtitlePrefix} {ENGANGS_PRIS_PER_DAG} {t.engangsForm.subtitleSuffix}
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ ...formStyle, borderColor: "rgba(120,190,32,0.18)" }}>

          {/* ── Om arrangementet ── */}
          <SectionLabel>{t.common.sectionAboutEvent}</SectionLabel>
          <FormField label={t.common.fieldArrangementsnavn}>
            <Input name="arrangementsnavn" value={form.arrangementsnavn} onChange={handleChange} required placeholder={t.common.placeholderArrangementsnavn} />
          </FormField>
          <FormField label={t.common.fieldKategori}>
            <SelectInput name="kategori" value={form.kategori} onChange={handleChange}>
              <option value="">{t.common.placeholderKategori}</option>
              {KATEGORIER.map(k => <option key={k} value={k}>{k}</option>)}
            </SelectInput>
          </FormField>
          <FormField label={t.common.fieldOrgNummer}>
            <Input name="org_nummer" value={form.org_nummer} onChange={handleChange} placeholder={t.common.placeholderOrgNummer} />
          </FormField>

          <Divider />

          {/* ── Periode og pris ── */}
          <SectionLabel>{t.common.sectionPeriod}</SectionLabel>
          <div style={gridTwo}>
            <FormField label={t.engangsForm.fieldStartdato}>
              <Input type="date" name="periode_start" value={form.periode_start} onChange={handleChange} required />
            </FormField>
            <FormField label={t.engangsForm.fieldSluttdato}>
              <Input type="date" name="periode_slutt" value={form.periode_slutt} onChange={handleChange} required />
            </FormField>
          </div>
          {dateError && <p style={{ color: "#D94F4F", fontSize: "13px", marginTop: "-10px", marginBottom: "12px" }}>{dateError}</p>}

          {/* Price summary */}
          <div style={{
            backgroundColor: "rgba(120,190,32,0.07)",
            border: "1px solid rgba(120,190,32,0.22)",
            borderRadius: "10px",
            padding: "16px 20px",
            marginBottom: "20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}>
            <div>
              <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.4)", fontFamily: "var(--font-ibm-plex-mono), monospace", letterSpacing: "0.08em", marginBottom: "4px" }}>{t.engangsForm.estimatedCostLabel}</div>
              <div style={{ fontSize: "13px", color: "rgba(255,255,255,0.5)" }}>
                {days} {days !== 1 ? t.engangsForm.dayUnitPlural : t.engangsForm.dayUnit} × {ENGANGS_PRIS_PER_DAG.toLocaleString(numberLocale)} kr/dag
              </div>
            </div>
            <div style={{ fontFamily: "var(--font-ibm-plex-mono), monospace", fontSize: "24px", fontWeight: 700, color: "#78BE20" }}>
              {totalPris.toLocaleString(numberLocale)} kr
            </div>
          </div>

          <Divider />

          {/* ── Lokasjon ── */}
          <SectionLabel>{t.common.sectionLocation}</SectionLabel>
          <FormField label={t.common.fieldAdresse}>
            <div style={{ position: "relative" }} ref={suggestionsRef}>
              <Input name="adresse_gate" value={form.adresse_gate} onChange={handleChange} required placeholder={t.common.placeholderAdresse} autoComplete="off" />
              {lat && lng && (
                <div style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", color: "#33D3C4", fontSize: "12px", fontFamily: "var(--font-ibm-plex-mono), monospace" }}>{t.common.geocoded}</div>
              )}
              {showSuggestions && suggestions.length > 0 && (
                <div style={suggestionsDropStyle}>
                  {suggestions.map(s => (
                    <button key={`${s.adressetekst}-${s.lat}`} type="button" onClick={() => handleAddressSelect(s)} style={suggestionItemStyle}
                      onMouseEnter={e => { e.currentTarget.style.backgroundColor = "rgba(51,211,196,0.1)"; }}
                      onMouseLeave={e => { e.currentTarget.style.backgroundColor = "transparent"; }}>
                      <span style={{ color: "#ffffff", fontSize: "13px" }}>{formatGateAdresse(s)}</span>
                      <span style={{ color: "rgba(255,255,255,0.35)", fontSize: "12px", marginLeft: "6px" }}>{formatSuggestionSecondary(s)}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </FormField>
          <div style={gridTwo}>
            <FormField label={t.common.fieldPostnummer}><Input name="postnummer" value={form.postnummer} onChange={handleChange} placeholder={t.common.placeholderPostnummer} /></FormField>
            <FormField label={t.common.fieldBy}><Input name="by" value={form.by} onChange={handleChange} placeholder={t.common.placeholderBy} /></FormField>
          </div>
          <FormField label={t.common.fieldLand}>
            <SelectInput name="land" value={form.land} onChange={handleChange}>{LAND.map(l => <option key={l} value={l}>{l}</option>)}</SelectInput>
          </FormField>

          <FormField label={`${t.engangsForm.geofenceLabel} ${form.geofence_radius} m`}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <input
                type="range" name="geofence_radius" min={50} max={1000} step={10}
                value={form.geofence_radius} onChange={handleChange}
                style={{ flex: 1, accentColor: "#33D3C4", cursor: "pointer" }}
              />
              <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.35)", fontFamily: "var(--font-ibm-plex-mono), monospace", flexShrink: 0, width: "60px", textAlign: "right" }}>
                {form.geofence_radius} m
              </span>
            </div>
          </FormField>

          <Divider />

          {/* ── Kontaktperson ── */}
          <SectionLabel>{t.common.sectionContact}</SectionLabel>
          <div style={gridTwo}>
            <FormField label={t.common.fieldFornavn}><Input name="fornavn" value={form.fornavn} onChange={handleChange} required placeholder={t.common.placeholderFornavn} /></FormField>
            <FormField label={t.common.fieldEtternavn}><Input name="etternavn" value={form.etternavn} onChange={handleChange} required placeholder={t.common.placeholderEtternavn} /></FormField>
          </div>
          <FormField label={t.common.fieldEpostArena}><Input type="email" name="epost" value={form.epost} onChange={handleChange} required placeholder={t.common.placeholderEpostArrangement} /></FormField>
          <FormField label={t.common.fieldTelefon}><Input type="tel" name="telefon" value={form.telefon} onChange={handleChange} placeholder={t.common.placeholderTelefon} /></FormField>
          <FormField label={t.common.fieldPassord}>
            <Input type="password" name="passord" value={form.passord} onChange={handleChange} required minLength={6} placeholder={t.common.placeholderPassord} />
          </FormField>

          <Divider />
          <SectionLabel>{t.common.sectionLogo}</SectionLabel>
          <div style={{ marginBottom: "24px" }}>
            <label style={fileInputLabelStyle}>
              <input type="file" accept="image/png,image/jpeg" onChange={handleLogoChange} style={{ display: "none" }} />
              <span style={fileInputBtnStyle}>{logoFile ? `✓ ${logoFile.name}` : t.common.fileChoose}</span>
            </label>
            {logoError && <p style={{ color: "#D94F4F", fontSize: "13px", marginTop: "8px" }}>{logoError}</p>}
          </div>

          <Divider />
          <GdprCheckbox checked={form.gdpr} onChange={handleChange} t={t} />

          {status === "error" && <div style={errorBoxStyle}><span style={{ color: "#D94F4F", fontWeight: 600 }}>{t.common.errorPrefix}</span>{errorMsg}</div>}

          <button
            type="submit"
            disabled={status === "loading" || !!dateError}
            style={{ ...submitBtnStyle, backgroundColor: "#78BE20", color: "#073E46", opacity: status === "loading" ? 0.7 : 1, cursor: status === "loading" ? "not-allowed" : "pointer" }}
          >
            {status === "loading" ? t.common.registering : `${t.engangsForm.submitPrefix} ${totalPris.toLocaleString(numberLocale)} kr`}
          </button>
          <p style={{ textAlign: "center", color: "rgba(255,255,255,0.3)", fontSize: "13px", marginTop: "16px" }}>{t.engangsForm.footerNote}</p>
        </form>
      </div>
    </div>
  );
}

/* ─── SHARED SUB-COMPONENTS ─── */

function focusStyle(el: HTMLElement) { el.style.borderColor = "#33D3C4"; el.style.boxShadow = "0 0 0 3px rgba(51,211,196,0.15)"; }
function blurStyle(el: HTMLElement) { el.style.borderColor = "rgba(255,255,255,0.12)"; el.style.boxShadow = "none"; }

function Input({ type = "text", name, value, onChange, required, placeholder, autoComplete, minLength }: {
  type?: string; name: string; value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  required?: boolean; placeholder?: string; autoComplete?: string; minLength?: number;
}) {
  return (
    <input type={type} name={name} value={value} onChange={onChange} required={required}
      placeholder={placeholder} autoComplete={autoComplete} minLength={minLength}
      style={inputStyle} onFocus={e => focusStyle(e.target)} onBlur={e => blurStyle(e.target)} />
  );
}

function SelectInput({ name, value, onChange, children }: {
  name: string; value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  children: React.ReactNode;
}) {
  return (
    <select name={name} value={value} onChange={onChange}
      style={{ ...inputStyle, appearance: "none", cursor: "pointer" }}
      onFocus={e => focusStyle(e.currentTarget)} onBlur={e => blurStyle(e.currentTarget)}>
      {children}
    </select>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontFamily: "var(--font-ibm-plex-mono), monospace", fontSize: "11px", letterSpacing: "0.12em", color: "rgba(255,255,255,0.35)", textTransform: "uppercase", marginBottom: "20px" }}>
      {children}
    </div>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: "18px" }}>
      <label style={{ display: "block", fontSize: "13px", fontWeight: 500, color: "rgba(255,255,255,0.6)", marginBottom: "7px", letterSpacing: "0.03em" }}>
        {label}
      </label>
      {children}
    </div>
  );
}

function Divider() { return <div style={{ borderTop: "1px solid rgba(255,255,255,0.07)", margin: "28px 0" }} />; }

function GdprCheckbox({ checked, onChange, t }: { checked: boolean; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; t: Registrer }) {
  return (
    <label style={{ display: "flex", alignItems: "flex-start", gap: "12px", cursor: "pointer", marginBottom: "28px" }}>
      <div style={{ position: "relative", flexShrink: 0, marginTop: "2px" }}>
        <input type="checkbox" name="gdpr" checked={checked} onChange={onChange} required
          style={{ position: "absolute", opacity: 0, width: "20px", height: "20px", cursor: "pointer" }} />
        <div style={{ width: "20px", height: "20px", border: `2px solid ${checked ? "#33D3C4" : "rgba(255,255,255,0.25)"}`, borderRadius: "4px", backgroundColor: checked ? "#33D3C4" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s" }}>
          {checked && <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><polyline points="2,6 5,9 10,3" stroke="#073E46" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>}
        </div>
      </div>
      <span style={{ fontSize: "14px", color: "rgba(255,255,255,0.6)", lineHeight: 1.5 }}>
        {t.common.gdprText}{" "}
        <a href="#" style={{ color: "#33D3C4", textDecoration: "none" }}>{t.common.gdprLinkText}</a>. *
      </span>
    </label>
  );
}

function NavBar({ t, locale }: { t: Registrer; locale: Locale }) {
  const homeHref = locale === "en" ? "/en" : "/";
  return (
    <header style={{ borderBottom: "1px solid rgba(51,211,196,0.1)", padding: "0 24px" }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto", height: "64px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <a href={homeHref} style={{ textDecoration: "none" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="ÅDIENCE" style={{ height: "64px", width: "auto" }} />
        </a>
        <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
          <LanguageSwitcher locale={locale} noHref="/registrer" enHref="/en/registrer" />
          <a href={homeHref} style={{ color: "rgba(255,255,255,0.5)", fontSize: "14px", textDecoration: "none" }}>{t.common.backToHome}</a>
        </div>
      </div>
    </header>
  );
}

function CheckIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#073E46" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

/* ─── STYLES ─── */

const pageStyle: React.CSSProperties = { backgroundColor: "#073E46", minHeight: "100vh", color: "#ffffff", fontFamily: "var(--font-inter), system-ui, sans-serif" };
const labelStyle: React.CSSProperties = { fontFamily: "var(--font-ibm-plex-mono), monospace", fontSize: "12px", letterSpacing: "0.14em", color: "#FF6B4A", fontWeight: 500, display: "block", marginBottom: "12px" };
const headingStyle: React.CSSProperties = { fontFamily: "var(--font-montserrat), system-ui, sans-serif", fontWeight: 800, fontSize: "clamp(28px, 4vw, 42px)", letterSpacing: "-0.02em", marginBottom: "14px", color: "#ffffff" };
const subheadStyle: React.CSSProperties = { color: "rgba(255,255,255,0.55)", fontSize: "16px", lineHeight: 1.65 };
const benefitsRowStyle: React.CSSProperties = { display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "40px" };
const benefitChipStyle: React.CSSProperties = { display: "flex", alignItems: "center", backgroundColor: "rgba(51,211,196,0.08)", border: "1px solid rgba(51,211,196,0.2)", borderRadius: "100px", padding: "6px 14px" };
const chipStyle: React.CSSProperties = { display: "inline-flex", alignItems: "center", gap: "5px", backgroundColor: "rgba(51,211,196,0.08)", border: "1px solid rgba(51,211,196,0.2)", borderRadius: "100px", padding: "4px 10px", fontSize: "12px", color: "rgba(255,255,255,0.65)" };
const typeCardStyle: React.CSSProperties = { width: "100%", backgroundColor: "#1E293B", border: "1px solid rgba(51,211,196,0.18)", borderRadius: "14px", padding: "24px", cursor: "pointer", transition: "border-color 0.2s, background-color 0.2s", textAlign: "left" };
const formStyle: React.CSSProperties = { backgroundColor: "#1E293B", border: "1px solid rgba(51,211,196,0.12)", borderRadius: "16px", padding: "40px" };
const inputStyle: React.CSSProperties = { width: "100%", backgroundColor: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "8px", padding: "12px 16px", color: "#ffffff", fontSize: "15px", outline: "none", fontFamily: "var(--font-inter), system-ui, sans-serif", transition: "border-color 0.2s, box-shadow 0.2s" };
const gridTwo: React.CSSProperties = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" };
const suggestionsDropStyle: React.CSSProperties = { position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, backgroundColor: "#1E293B", border: "1px solid rgba(51,211,196,0.25)", borderRadius: "8px", zIndex: 100, overflow: "hidden", boxShadow: "0 8px 24px rgba(0,0,0,0.4)" };
const suggestionItemStyle: React.CSSProperties = { width: "100%", padding: "10px 14px", background: "transparent", border: "none", borderBottom: "1px solid rgba(255,255,255,0.05)", textAlign: "left", cursor: "pointer", display: "block", transition: "background 0.15s" };
const fileInputLabelStyle: React.CSSProperties = { display: "block", cursor: "pointer" };
const fileInputBtnStyle: React.CSSProperties = { display: "inline-flex", alignItems: "center", backgroundColor: "rgba(255,255,255,0.05)", border: "1px dashed rgba(255,255,255,0.2)", borderRadius: "8px", padding: "12px 20px", color: "rgba(255,255,255,0.5)", fontSize: "14px", width: "100%", transition: "border-color 0.2s" };
const submitBtnStyle: React.CSSProperties = { width: "100%", backgroundColor: "#FF6B4A", color: "#ffffff", border: "none", borderRadius: "8px", padding: "16px", fontSize: "16px", fontWeight: 700, fontFamily: "var(--font-montserrat), system-ui, sans-serif", letterSpacing: "0.03em", marginTop: "8px", boxShadow: "0 0 30px rgba(255,107,74,0.3)" };
const errorBoxStyle: React.CSSProperties = { backgroundColor: "rgba(255,107,74,0.1)", border: "1px solid rgba(255,107,74,0.3)", borderRadius: "8px", padding: "12px 16px", fontSize: "14px", marginBottom: "16px", color: "rgba(255,255,255,0.8)" };
const successCardStyle: React.CSSProperties = { backgroundColor: "#1E293B", border: "1px solid rgba(51,211,196,0.2)", borderRadius: "20px", padding: "56px 48px", textAlign: "center" };
const successIconStyle: React.CSSProperties = { width: "64px", height: "64px", backgroundColor: "#33D3C4", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px" };
const successHeadingStyle: React.CSSProperties = { fontFamily: "var(--font-montserrat), system-ui, sans-serif", fontWeight: 800, fontSize: "28px", marginBottom: "12px" };
const successSubStyle: React.CSSProperties = { color: "rgba(255,255,255,0.55)", fontSize: "16px", lineHeight: 1.6, marginBottom: "32px" };
const streamIdBoxStyle: React.CSSProperties = { backgroundColor: "rgba(51,211,196,0.06)", border: "1px solid rgba(51,211,196,0.2)", borderRadius: "10px", padding: "20px", marginBottom: "24px" };
const monoLabelStyle: React.CSSProperties = { color: "rgba(255,255,255,0.4)", fontSize: "11px", letterSpacing: "0.1em", fontFamily: "var(--font-ibm-plex-mono), monospace", marginBottom: "8px" };
const backLinkStyle: React.CSSProperties = { color: "rgba(255,255,255,0.4)", textDecoration: "none", fontSize: "14px", display: "inline-block", marginTop: "8px" };
