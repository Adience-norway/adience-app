"use client";

import { useState, useEffect, useRef } from "react";
import QRCode from "qrcode";
import { supabase } from "@/lib/supabase";

/* ─── CONSTANTS ─── */

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

/* ─── HELPERS ─── */

function generateStreamId(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const random = Array.from({ length: 8 }, () =>
    chars[Math.floor(Math.random() * chars.length)]
  ).join("");
  const timestamp = Date.now().toString().slice(-6);
  return `ADC${random}${timestamp}`;
}

type NominatimResult = {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  address: {
    postcode?: string;
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
  };
};

type FormData = {
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
  gdpr: boolean;
};

type Status = "idle" | "loading" | "success" | "error";

/* ─── MAIN COMPONENT ─── */

export default function RegistrerPage() {
  const [form, setForm] = useState<FormData>({
    arenanavn: "",
    kategori: "",
    adresse_gate: "",
    postnummer: "",
    by: "",
    land: "Norge",
    kapasitet: "",
    org_nummer: "",
    fornavn: "",
    etternavn: "",
    epost: "",
    telefon: "",
    gdpr: false,
  });

  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [suggestions, setSuggestions] = useState<NominatimResult[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoError, setLogoError] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [streamId, setStreamId] = useState("");
  const [qrDataUrl, setQrDataUrl] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Nominatim autocomplete
  useEffect(() => {
    const q = form.adresse_gate;
    if (q.length < 4) { setSuggestions([]); return; }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&addressdetails=1&limit=5`,
          { headers: { "Accept-Language": "no,en" } }
        );
        const data: NominatimResult[] = await res.json();
        setSuggestions(data);
        setShowSuggestions(data.length > 0);
      } catch { setSuggestions([]); }
    }, 650);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [form.adresse_gate]);

  // Close suggestions on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
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

  function handleAddressSelect(r: NominatimResult) {
    const city = r.address.city || r.address.town || r.address.village || r.address.municipality || "";
    setForm(prev => ({
      ...prev,
      adresse_gate: r.display_name.split(",")[0],
      postnummer: r.address.postcode || prev.postnummer,
      by: city || prev.by,
    }));
    setLat(parseFloat(r.lat));
    setLng(parseFloat(r.lon));
    setSuggestions([]);
    setShowSuggestions(false);
  }

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    setLogoError("");
    const file = e.target.files?.[0];
    if (!file) return;
    if (!["image/png", "image/jpeg"].includes(file.type)) {
      setLogoError("Kun PNG og JPG er støttet.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setLogoError("Maks filstørrelse er 5MB.");
      return;
    }
    setLogoFile(file);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setErrorMsg("");

    const stream_id = generateStreamId();

    // Geocode if address typed manually without selecting suggestion
    let finalLat = lat;
    let finalLng = lng;
    if ((!finalLat || !finalLng) && form.adresse_gate) {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(form.adresse_gate)}&format=json&limit=1`,
          { headers: { "Accept-Language": "no,en" } }
        );
        const data: NominatimResult[] = await res.json();
        if (data[0]) { finalLat = parseFloat(data[0].lat); finalLng = parseFloat(data[0].lon); }
      } catch { /* proceed without coords */ }
    }

    // Upload logo if provided
    let logo_url: string | null = null;
    if (logoFile) {
      const ext = logoFile.type === "image/png" ? "png" : "jpg";
      const path = `${stream_id}/logo.${ext}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("logos")
        .upload(path, logoFile, { contentType: logoFile.type });
      if (!uploadError && uploadData) {
        logo_url = supabase.storage.from("logos").getPublicUrl(uploadData.path).data.publicUrl;
      }
    }

    // Insert arena
    const { data: arena, error: arenaError } = await supabase
      .from("arenaer")
      .insert({
        arenanavn: form.arenanavn,
        kategori: form.kategori || null,
        adresse: form.adresse_gate || null,
        adresse_gate: form.adresse_gate || null,
        postnummer: form.postnummer || null,
        by: form.by || null,
        land: form.land || null,
        lat: finalLat,
        lng: finalLng,
        kapasitet: form.kapasitet || null,
        org_nummer: form.org_nummer || null,
        fornavn: form.fornavn || null,
        etternavn: form.etternavn || null,
        epost: form.epost || null,
        telefon: form.telefon || null,
        logo_url,
        stream_id,
      })
      .select("id")
      .single();

    if (arenaError) {
      setStatus("error");
      setErrorMsg(
        arenaError.code === "23505"
          ? "Dette organisasjonsnummeret eller e-postadressen er allerede registrert."
          : arenaError.message
      );
      return;
    }

    // Insert pilot period
    const { error: pilotError } = await supabase
      .from("pilot_perioder")
      .insert({ arena_id: arena.id });

    if (pilotError) {
      setStatus("error");
      setErrorMsg(pilotError.message);
      return;
    }

    // Insert bruker
    await supabase.from("brukere").insert({
      epost: form.epost,
      fornavn: form.fornavn,
      etternavn: form.etternavn,
      arena_id: arena.id,
      rolle: "arena_admin",
    });

    // Send welcome email (non-blocking — failure doesn't block success)
    fetch("/api/send-welcome", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ epost: form.epost, fornavn: form.fornavn, streamId: stream_id }),
    }).catch(() => {});

    // Generate QR code
    try {
      const qr = await QRCode.toDataURL(`https://cast.adience.no/${stream_id}`, {
        width: 220,
        margin: 2,
        color: { dark: "#052630", light: "#21D4BD" },
      });
      setQrDataUrl(qr);
    } catch { /* non-critical */ }

    setStreamId(stream_id);
    setStatus("success");
  }

  /* ─── SUCCESS STATE ─── */
  if (status === "success") {
    return (
      <div style={pageStyle}>
        <NavBar />
        <div style={{ maxWidth: "560px", margin: "64px auto", padding: "0 24px 80px" }}>
          <div style={successCardStyle}>
            <div style={successIconStyle}><CheckIcon /></div>
            <h2 style={successHeadingStyle}>Piloten er i gang!</h2>
            <p style={successSubStyle}>
              Du har 14 dager gratis tilgang til Ådience-plattformen.
              Vi tar kontakt på <strong>{form.epost}</strong> innen kort tid.
            </p>

            <div style={streamIdBoxStyle}>
              <div style={monoLabelStyle}>DIN STREAM ID</div>
              <div style={{ fontFamily: "var(--font-roboto-mono), monospace", fontSize: "18px", color: "#21D4BD", letterSpacing: "0.06em", fontWeight: 500 }}>
                {streamId}
              </div>
            </div>

            {qrDataUrl && (
              <div style={{ marginBottom: "32px" }}>
                <div style={monoLabelStyle}>QR-KODE</div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={qrDataUrl} alt="QR-kode for stream" style={{ width: "160px", height: "160px", borderRadius: "12px" }} />
                <p style={{ color: "rgba(255,255,255,0.3)", fontSize: "12px", marginTop: "8px" }}>
                  Skann for å åpne streamen
                </p>
              </div>
            )}

            <a href="/" style={backLinkStyle}>← Tilbake til forsiden</a>
          </div>
        </div>
      </div>
    );
  }

  /* ─── FORM ─── */
  return (
    <div style={pageStyle}>
      <NavBar />

      <div style={{ maxWidth: "640px", margin: "0 auto", padding: "64px 24px 100px" }}>
        <div style={{ marginBottom: "48px" }}>
          <span style={labelStyle}>GRATIS PILOT</span>
          <h1 style={headingStyle}>Start din 14-dagers pilot</h1>
          <p style={subheadStyle}>
            Ingen binding, ingen kredittkort. Kom i gang med Ådience på din arena i dag.
          </p>
        </div>

        <div style={benefitsRowStyle}>
          {["14 dager gratis", "Full tilgang", "Ingen oppsett"].map(b => (
            <div key={b} style={benefitChipStyle}>
              <span style={{ color: "#21D4BD", marginRight: "6px" }}>✓</span>
              <span style={{ fontSize: "13px", color: "rgba(255,255,255,0.7)" }}>{b}</span>
            </div>
          ))}
        </div>

        <form onSubmit={handleSubmit} style={formStyle}>

          {/* ── Om arenaen ── */}
          <SectionLabel>Om arenaen</SectionLabel>

          <FormField label="Arenanavn *">
            <Input name="arenanavn" value={form.arenanavn} onChange={handleChange} required placeholder="f.eks. Ullevaal Stadion" />
          </FormField>

          <FormField label="Kategori">
            <SelectInput name="kategori" value={form.kategori} onChange={handleChange}>
              <option value="">Velg kategori</option>
              {KATEGORIER.map(k => <option key={k} value={k}>{k}</option>)}
            </SelectInput>
          </FormField>

          {/* Address with autocomplete */}
          <FormField label="Adresse *">
            <div style={{ position: "relative" }} ref={suggestionsRef}>
              <Input
                name="adresse_gate"
                value={form.adresse_gate}
                onChange={handleChange}
                required
                placeholder="Gatenavn og nummer"
                autoComplete="off"
              />
              {lat && lng && (
                <div style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", color: "#21D4BD", fontSize: "12px", fontFamily: "var(--font-roboto-mono), monospace" }}>
                  ✓ geocodet
                </div>
              )}
              {showSuggestions && suggestions.length > 0 && (
                <div style={suggestionsDropStyle}>
                  {suggestions.map(s => (
                    <button
                      key={s.place_id}
                      type="button"
                      onClick={() => handleAddressSelect(s)}
                      style={suggestionItemStyle}
                      onMouseEnter={e => { e.currentTarget.style.backgroundColor = "rgba(33,212,189,0.1)"; }}
                      onMouseLeave={e => { e.currentTarget.style.backgroundColor = "transparent"; }}
                    >
                      <span style={{ color: "#ffffff", fontSize: "13px" }}>{s.display_name.split(",")[0]}</span>
                      <span style={{ color: "rgba(255,255,255,0.35)", fontSize: "12px", marginLeft: "6px" }}>
                        {s.display_name.split(",").slice(1, 3).join(",")}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </FormField>

          <div style={gridTwo}>
            <FormField label="Postnummer">
              <Input name="postnummer" value={form.postnummer} onChange={handleChange} placeholder="0001" />
            </FormField>
            <FormField label="By">
              <Input name="by" value={form.by} onChange={handleChange} placeholder="Oslo" />
            </FormField>
          </div>

          <FormField label="Land">
            <SelectInput name="land" value={form.land} onChange={handleChange}>
              {LAND.map(l => <option key={l} value={l}>{l}</option>)}
            </SelectInput>
          </FormField>

          <FormField label="Arenakapasitet">
            <SelectInput name="kapasitet" value={form.kapasitet} onChange={handleChange}>
              <option value="">Velg kapasitet</option>
              {KAPASITETER.map(k => <option key={k} value={k}>{k}</option>)}
            </SelectInput>
          </FormField>

          <FormField label="Organisasjonsnummer *">
            <Input name="org_nummer" value={form.org_nummer} onChange={handleChange} required placeholder="123 456 789" />
          </FormField>

          <Divider />

          {/* ── Kontaktperson ── */}
          <SectionLabel>Kontaktperson</SectionLabel>

          <div style={gridTwo}>
            <FormField label="Fornavn *">
              <Input name="fornavn" value={form.fornavn} onChange={handleChange} required placeholder="Ola" />
            </FormField>
            <FormField label="Etternavn *">
              <Input name="etternavn" value={form.etternavn} onChange={handleChange} required placeholder="Nordmann" />
            </FormField>
          </div>

          <FormField label="E-post *">
            <Input type="email" name="epost" value={form.epost} onChange={handleChange} required placeholder="post@arena.no" />
          </FormField>

          <FormField label="Telefon">
            <Input type="tel" name="telefon" value={form.telefon} onChange={handleChange} placeholder="+47 000 00 000" />
          </FormField>

          <Divider />

          {/* ── Logo ── */}
          <SectionLabel>Logo (valgfritt)</SectionLabel>

          <div style={{ marginBottom: "24px" }}>
            <label style={fileInputLabelStyle}>
              <input
                type="file"
                accept="image/png,image/jpeg"
                onChange={handleLogoChange}
                style={{ display: "none" }}
              />
              <span style={fileInputBtnStyle}>
                {logoFile ? `✓ ${logoFile.name}` : "Velg fil (PNG eller JPG, maks 5MB)"}
              </span>
            </label>
            {logoError && <p style={{ color: "#FF6B4A", fontSize: "13px", marginTop: "8px" }}>{logoError}</p>}
          </div>

          <Divider />

          {/* ── GDPR ── */}
          <label style={{ display: "flex", alignItems: "flex-start", gap: "12px", cursor: "pointer", marginBottom: "28px" }}>
            <div style={{ position: "relative", flexShrink: 0, marginTop: "2px" }}>
              <input
                type="checkbox"
                name="gdpr"
                checked={form.gdpr}
                onChange={handleChange}
                required
                style={{ position: "absolute", opacity: 0, width: "20px", height: "20px", cursor: "pointer" }}
              />
              <div style={{
                width: "20px", height: "20px",
                border: `2px solid ${form.gdpr ? "#21D4BD" : "rgba(255,255,255,0.25)"}`,
                borderRadius: "4px",
                backgroundColor: form.gdpr ? "#21D4BD" : "transparent",
                display: "flex", alignItems: "center", justifyContent: "center",
                transition: "all 0.15s",
              }}>
                {form.gdpr && (
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <polyline points="2,6 5,9 10,3" stroke="#052630" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>
            </div>
            <span style={{ fontSize: "14px", color: "rgba(255,255,255,0.6)", lineHeight: 1.5 }}>
              Jeg samtykker til at Ådience lagrer og behandler informasjonen over i henhold til{" "}
              <a href="#" style={{ color: "#21D4BD", textDecoration: "none" }}>personvernreglene</a>. *
            </span>
          </label>

          {status === "error" && (
            <div style={errorBoxStyle}>
              <span style={{ color: "#FF6B4A", fontWeight: 600 }}>Feil: </span>{errorMsg}
            </div>
          )}

          <button
            type="submit"
            disabled={status === "loading"}
            style={{ ...submitBtnStyle, opacity: status === "loading" ? 0.7 : 1, cursor: status === "loading" ? "not-allowed" : "pointer" }}
          >
            {status === "loading" ? "Registrerer…" : "Start gratis 14-dagers pilot"}
          </button>

          <p style={{ textAlign: "center", color: "rgba(255,255,255,0.3)", fontSize: "13px", marginTop: "16px" }}>
            Ingen kredittkort nødvendig. Piloten varer i 14 dager.
          </p>
        </form>
      </div>
    </div>
  );
}

/* ─── SUB-COMPONENTS ─── */

function focusStyle(el: HTMLElement) {
  el.style.borderColor = "#21D4BD";
  el.style.boxShadow = "0 0 0 3px rgba(33,212,189,0.15)";
}
function blurStyle(el: HTMLElement) {
  el.style.borderColor = "rgba(255,255,255,0.12)";
  el.style.boxShadow = "none";
}

function Input({ type = "text", name, value, onChange, required, placeholder, autoComplete }: {
  type?: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  required?: boolean;
  placeholder?: string;
  autoComplete?: string;
}) {
  return (
    <input
      type={type}
      name={name}
      value={value}
      onChange={onChange}
      required={required}
      placeholder={placeholder}
      autoComplete={autoComplete}
      style={inputStyle}
      onFocus={e => focusStyle(e.target)}
      onBlur={e => blurStyle(e.target)}
    />
  );
}

function SelectInput({ name, value, onChange, children }: {
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  children: React.ReactNode;
}) {
  return (
    <select
      name={name}
      value={value}
      onChange={onChange}
      style={{ ...inputStyle, appearance: "none", cursor: "pointer" }}
      onFocus={e => focusStyle(e.currentTarget)}
      onBlur={e => blurStyle(e.currentTarget)}
    >
      {children}
    </select>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontFamily: "var(--font-roboto-mono), monospace", fontSize: "11px", letterSpacing: "0.12em", color: "rgba(255,255,255,0.35)", textTransform: "uppercase", marginBottom: "20px" }}>
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

function Divider() {
  return <div style={{ borderTop: "1px solid rgba(255,255,255,0.07)", margin: "28px 0" }} />;
}

function NavBar() {
  return (
    <header style={{ borderBottom: "1px solid rgba(33,212,189,0.1)", padding: "0 24px" }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto", height: "64px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <a href="/" style={{ textDecoration: "none" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="ÅDIENCE" style={{ height: "32px", width: "auto" }} />
        </a>
        <a href="/" style={{ color: "rgba(255,255,255,0.5)", fontSize: "14px", textDecoration: "none" }}>← Tilbake</a>
      </div>
    </header>
  );
}

function CheckIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#052630" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

/* ─── STYLES ─── */

const pageStyle: React.CSSProperties = {
  backgroundColor: "#052630",
  minHeight: "100vh",
  color: "#ffffff",
  fontFamily: "var(--font-inter), system-ui, sans-serif",
};

const labelStyle: React.CSSProperties = {
  fontFamily: "var(--font-roboto-mono), monospace",
  fontSize: "12px",
  letterSpacing: "0.14em",
  color: "#FF6B4A",
  fontWeight: 500,
  display: "block",
  marginBottom: "12px",
};

const headingStyle: React.CSSProperties = {
  fontFamily: "var(--font-montserrat), system-ui, sans-serif",
  fontWeight: 800,
  fontSize: "clamp(28px, 4vw, 42px)",
  letterSpacing: "-0.02em",
  marginBottom: "14px",
  color: "#ffffff",
};

const subheadStyle: React.CSSProperties = {
  color: "rgba(255,255,255,0.55)",
  fontSize: "16px",
  lineHeight: 1.65,
};

const benefitsRowStyle: React.CSSProperties = {
  display: "flex",
  gap: "10px",
  flexWrap: "wrap",
  marginBottom: "40px",
};

const benefitChipStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  backgroundColor: "rgba(33,212,189,0.08)",
  border: "1px solid rgba(33,212,189,0.2)",
  borderRadius: "100px",
  padding: "6px 14px",
};

const formStyle: React.CSSProperties = {
  backgroundColor: "#1E293B",
  border: "1px solid rgba(33,212,189,0.12)",
  borderRadius: "16px",
  padding: "40px",
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
  transition: "border-color 0.2s, box-shadow 0.2s",
};

const gridTwo: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "16px",
};

const suggestionsDropStyle: React.CSSProperties = {
  position: "absolute",
  top: "calc(100% + 4px)",
  left: 0,
  right: 0,
  backgroundColor: "#1E293B",
  border: "1px solid rgba(33,212,189,0.25)",
  borderRadius: "8px",
  zIndex: 100,
  overflow: "hidden",
  boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
};

const suggestionItemStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 14px",
  background: "transparent",
  border: "none",
  borderBottom: "1px solid rgba(255,255,255,0.05)",
  textAlign: "left",
  cursor: "pointer",
  display: "block",
  transition: "background 0.15s",
};

const fileInputLabelStyle: React.CSSProperties = {
  display: "block",
  cursor: "pointer",
};

const fileInputBtnStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  backgroundColor: "rgba(255,255,255,0.05)",
  border: "1px dashed rgba(255,255,255,0.2)",
  borderRadius: "8px",
  padding: "12px 20px",
  color: "rgba(255,255,255,0.5)",
  fontSize: "14px",
  width: "100%",
  transition: "border-color 0.2s",
};

const submitBtnStyle: React.CSSProperties = {
  width: "100%",
  backgroundColor: "#FF6B4A",
  color: "#ffffff",
  border: "none",
  borderRadius: "8px",
  padding: "16px",
  fontSize: "16px",
  fontWeight: 700,
  fontFamily: "var(--font-montserrat), system-ui, sans-serif",
  letterSpacing: "0.03em",
  marginTop: "8px",
  boxShadow: "0 0 30px rgba(255,107,74,0.3)",
};

const errorBoxStyle: React.CSSProperties = {
  backgroundColor: "rgba(255,107,74,0.1)",
  border: "1px solid rgba(255,107,74,0.3)",
  borderRadius: "8px",
  padding: "12px 16px",
  fontSize: "14px",
  marginBottom: "16px",
  color: "rgba(255,255,255,0.8)",
};

const successCardStyle: React.CSSProperties = {
  backgroundColor: "#1E293B",
  border: "1px solid rgba(33,212,189,0.2)",
  borderRadius: "20px",
  padding: "56px 48px",
  textAlign: "center",
};

const successIconStyle: React.CSSProperties = {
  width: "64px", height: "64px",
  backgroundColor: "#21D4BD",
  borderRadius: "50%",
  display: "flex", alignItems: "center", justifyContent: "center",
  margin: "0 auto 24px",
};

const successHeadingStyle: React.CSSProperties = {
  fontFamily: "var(--font-montserrat), system-ui, sans-serif",
  fontWeight: 800,
  fontSize: "28px",
  marginBottom: "12px",
};

const successSubStyle: React.CSSProperties = {
  color: "rgba(255,255,255,0.55)",
  fontSize: "16px",
  lineHeight: 1.6,
  marginBottom: "32px",
};

const streamIdBoxStyle: React.CSSProperties = {
  backgroundColor: "rgba(33,212,189,0.06)",
  border: "1px solid rgba(33,212,189,0.2)",
  borderRadius: "10px",
  padding: "20px",
  marginBottom: "24px",
};

const monoLabelStyle: React.CSSProperties = {
  color: "rgba(255,255,255,0.4)",
  fontSize: "11px",
  letterSpacing: "0.1em",
  fontFamily: "var(--font-roboto-mono), monospace",
  marginBottom: "8px",
};

const backLinkStyle: React.CSSProperties = {
  color: "rgba(255,255,255,0.4)",
  textDecoration: "none",
  fontSize: "14px",
  display: "inline-block",
  marginTop: "8px",
};
