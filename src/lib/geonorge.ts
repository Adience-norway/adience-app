// Adresseoppslag mot Kartverket/Geonorge — Norges offisielle adresseregister.
// Erstatter Nominatim (OpenStreetMap), som har ufullstendig husnummerdekning i
// Norge og misforstår poststednavn (f.eks. "Furnes" → feil sted i Nordland, og
// "Krokstadvegen 22b" → null treff selv om vegen finnes). Geonorge er gratis,
// krever ingen API-nøkkel, og kjenner alle offisielle norske adresser.
//
// API: https://ws.geonorge.no/adresser/v1/sok
// Representasjonspunktet er i EPSG:4258 (ETRS89) ≈ WGS84 — direkte brukbart i
// Leaflet uten transformasjon.

import { useRef, useState } from "react";

const BASE = "https://ws.geonorge.no/adresser/v1/sok";

export type AdresseForslag = {
  adressetekst: string; // "Krokstadvegen 22B"
  postnummer: string;
  poststed: string; // pen kasus, f.eks. "Furnes"
  kommunenavn: string;
  lat: number;
  lng: number;
};

// Geonorge returnerer poststed i VERSALER ("FURNES"). Gjør det pent.
function penPoststed(s: string): string {
  return s
    .toLocaleLowerCase("no")
    .replace(/(^|[\s-])([a-zæøå])/g, (_, sep, c) => sep + c.toLocaleUpperCase("no"));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normaliser(a: any): AdresseForslag | null {
  const p = a?.representasjonspunkt;
  if (!p || typeof p.lat !== "number" || typeof p.lon !== "number") return null;
  return {
    adressetekst: a.adressetekst ?? [a.adressenavn, a.nummer, a.bokstav].filter(Boolean).join(" "),
    postnummer: a.postnummer ?? "",
    poststed: a.poststed ? penPoststed(a.poststed) : "",
    kommunenavn: a.kommunenavn ?? "",
    lat: p.lat,
    lng: p.lon,
  };
}

// Fritekst-søk for autofullføring mens brukeren skriver. `fuzzy` gjør at små
// skrivefeil fortsatt treffer.
export async function sokAdresser(query: string, limit = 5): Promise<AdresseForslag[]> {
  const q = query.trim();
  if (q.length < 3) return [];
  const url = `${BASE}?sok=${encodeURIComponent(q)}&fuzzy=true&treffPerSide=${limit}`;
  try {
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    return (data.adresser ?? []).map(normaliser).filter(Boolean) as AdresseForslag[];
  } catch {
    return [];
  }
}

// Enkeltoppslag som gir beste treff — brukes ved innsending når brukeren ikke
// valgte et forslag fra lista.
export async function geokodAdresse(query: string): Promise<{ lat: number; lng: number } | null> {
  const treff = await sokAdresser(query, 1);
  return treff[0] ? { lat: treff[0].lat, lng: treff[0].lng } : null;
}

// Sentrum av et poststed — brukes som startpunkt for manuell pin-plassering når
// den nøyaktige adressen ikke lot seg slå opp.
export async function geokodPoststed(
  postnummer: string | null,
  poststed: string | null,
): Promise<{ lat: number; lng: number } | null> {
  const q = [postnummer, poststed].filter(Boolean).join(" ");
  if (!q) return null;
  return geokodAdresse(q);
}

// Omvendt oppslag: gitt et punkt i kartet (f.eks. der en admin har dratt en
// nål for et sted uten formell gateadresse, som "Bjerke Travbane"), finn
// nærmeste offisielle adresse. Brukes til å fylle ut adressefeltene fra kartet,
// motsatt vei av sokAdresser().
export async function naermesteAdresse(lat: number, lng: number): Promise<AdresseForslag | null> {
  const url = `${BASE.replace("/sok", "/punktsok")}?lat=${lat}&lon=${lng}&radius=2000&treffPerSide=1`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    const treff = (data.adresser ?? []).map(normaliser).filter(Boolean) as AdresseForslag[];
    return treff[0] ?? null;
  } catch {
    return null;
  }
}

// Delt mellom /admin (AddArenaModal) og /min-side (arena-eiers egen
// adresseredigering) — samme debounce-/kappløps-håndtering trengs begge
// steder, så den ligger her i stedet for å duplisere den skjøre async-logikken.
export type GeoStatus = "idle" | "loading" | "found" | "not_found" | "error";

export function useGeocoder() {
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [status, setStatus] = useState<GeoStatus>("idle");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestIdRef = useRef(0);

  // `land` is intentionally not part of the signature: Geonorge only indexes
  // Norwegian addresses and its search breaks completely when a trailing
  // country name is appended to the query (verified directly against the API:
  // "Sangenveien 1 2317 Hamar" matches, but "...Hamar Norge" returns zero hits
  // even with fuzzy=true). It's still saved to the arena record elsewhere —
  // just never sent to the geocoder.
  function schedule(gate: string, postnr: string, by: string) {
    if (timerRef.current) clearTimeout(timerRef.current);
    requestIdRef.current += 1;
    const thisRequestId = requestIdRef.current;

    const g = gate.trim(), p = postnr.trim(), b = by.trim();
    // Require the street AND at least postnummer or by, or a real geocode
    // fires on half-typed input and can match an unrelated exact house number
    // elsewhere in the country.
    if (!g || (!p && !b)) { setStatus("idle"); return; }
    const parts = [g, p, b].filter(Boolean);

    setStatus("loading");
    timerRef.current = setTimeout(async () => {
      try {
        const treff = await sokAdresser(parts.join(" "), 1);
        if (thisRequestId !== requestIdRef.current) return; // a newer query superseded this one
        if (treff.length > 0) {
          const a = treff[0];
          setLat(a.lat);
          setLng(a.lng);
          setDisplayName([a.adressetekst, a.postnummer, a.poststed].filter(Boolean).join(" "));
          setStatus("found");
        } else {
          setLat(null); setLng(null); setDisplayName(null);
          setStatus("not_found");
        }
      } catch {
        if (thisRequestId !== requestIdRef.current) return;
        setStatus("error");
      }
    }, 800);
  }

  function setManual(newLat: number | null, newLng: number | null) {
    if (timerRef.current) clearTimeout(timerRef.current);
    setLat(newLat); setLng(newLng); setDisplayName(null);
    setStatus(newLat != null && newLng != null ? "found" : "idle");
  }

  function reset() {
    if (timerRef.current) clearTimeout(timerRef.current);
    setLat(null); setLng(null); setDisplayName(null); setStatus("idle");
  }

  return { lat, lng, displayName, status, schedule, setManual, reset };
}
