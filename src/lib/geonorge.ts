// Adresseoppslag mot Kartverket/Geonorge — Norges offisielle adresseregister.
// Erstatter Nominatim (OpenStreetMap), som har ufullstendig husnummerdekning i
// Norge og misforstår poststednavn (f.eks. "Furnes" → feil sted i Nordland, og
// "Krokstadvegen 22b" → null treff selv om vegen finnes). Geonorge er gratis,
// krever ingen API-nøkkel, og kjenner alle offisielle norske adresser.
//
// API: https://ws.geonorge.no/adresser/v1/sok
// Representasjonspunktet er i EPSG:4258 (ETRS89) ≈ WGS84 — direkte brukbart i
// Leaflet uten transformasjon.

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
