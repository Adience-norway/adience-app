import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Eksplisitt kolonneliste for arenaer — MÅ brukes i stedet for select("*").
// cast_passord er bevisst utelatt: kolonnen er sperret for anon/authenticated
// i databasen (se migrasjonen lock_down_cast_passord_column_v2), og PostgREST
// avviser select("*") med en 42501-feil for HELE spørringen når rollen mangler
// tabell-nivå SELECT — det degraderer ikke stille til de tillatte kolonnene.
export const ARENA_SELECT_COLUMNS =
  "id, arenanavn, kategori, adresse, adresse_gate, postnummer, by, land, lat, lng, geofence_radius, geofence_type, geofence_polygon, org_nummer, kapasitet, stream_id, logo_url, beskrivelse, cover_image_url, holdmusikk_url, holdmusikk_navn, synlig_i_app, vis_infotavle, streaming_aktiv, eier_id, fornavn, etternavn, epost, telefon, opprettet" as const;

export type Arena = {
  id: string;
  arenanavn: string;
  kategori: string | null;
  adresse: string | null;
  adresse_gate: string | null;
  postnummer: string | null;
  by: string | null;
  land: string | null;
  lat: number | null;
  lng: number | null;
  geofence_radius: number;
  geofence_type: "sirkel" | "polygon" | null;
  geofence_polygon: unknown | null;
  org_nummer: string | null;
  kapasitet: string | null;
  stream_id: string | null;
  logo_url: string | null;
  beskrivelse: string | null;
  cover_image_url: string | null;
  holdmusikk_url: string | null;
  holdmusikk_navn: string | null;
  synlig_i_app: boolean;
  vis_infotavle: boolean;
  streaming_aktiv: boolean;
  eier_id: string | null;
  fornavn: string | null;
  etternavn: string | null;
  epost: string | null;
  telefon: string | null;
  opprettet: string;
};

export type Sponsor = {
  id: string;
  arena_id: string;
  navn: string | null;
  logo_url: string;
  aktiv: boolean;
  opprettet: string;
};

export type InfoSlide = {
  id: string;
  arena_id: string;
  bilde_url: string;
  aktiv: boolean;
  type: "standard" | "dagens";
  opprettet: string;
};

export type StandardInfoSlide = {
  id: string;
  land: string;
  bilde_url: string;
  aktiv: boolean;
  opprettet: string;
};

export type Arrangement = {
  id: string;
  arena_id: string;
  tittel: string;
  start_tid: string | null;
  slutt_tid: string | null;
  stream_id: string | null;
  qr_kode_url: string | null;
  krever_betaling: boolean;
  lytter_grense: number;
  pris: number;
  betalingsstatus: "ubetalt" | "betalt" | "kansellert";
  stripe_payment_intent_id: string | null;
  synlig_i_app: boolean;
  opprettet: string;
};

export type SpeakerTeam = {
  id: string;
  arena_id: string;
  fornavn: string | null;
  etternavn: string | null;
  epost: string | null;
  rolle: string | null;
  kurs_progresjon: number;
  sertifisert: boolean;
  sertifikat_dato: string | null;
  opprettet: string;
};

export type KursInnholdType = "tekst" | "bilde" | "lyd" | "video";

export type KursInnhold = {
  id: string;
  modul_index: number;
  sprak: "no" | "en";
  rekkefolge: number;
  type: KursInnholdType;
  innhold: string;
  opprettet: string;
};

export type KursModulCover = {
  modul_index: number;
  bilde_url: string;
  kilde: "ai" | "opplastet";
  oppdatert: string;
};

export type AbonnementStatus = "lead" | "demo_forespurt" | "pilot_aktiv" | "aktiv" | "avsluttet";

export type Abonnement = {
  id: string;
  arena_id: string;
  type: string;
  status: AbonnementStatus | null;
  pris_per_dag: number | null;
  total_pris: number | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  belop_per_periode: number | null;
  betalingsintervall: "maned" | "ar" | null;
  periode_start: string | null;
  periode_slutt: string | null;
  opprettet: string;
};

export type PilotPeriode = {
  id: string;
  arena_id: string;
  start_dato: string;
  slutt_dato: string;
  status: string;
  konvertert: boolean;
};

export type NyhetsbrevAbonnent = {
  id: string;
  epost: string;
  fornavn: string | null;
  kilde: string;
  sprak: string;
  aktiv: boolean;
  opprettet: string;
};
