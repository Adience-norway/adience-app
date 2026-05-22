import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

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
  org_nummer: string | null;
  kapasitet: string | null;
  stream_id: string | null;
  logo_url: string | null;
  synlig_i_app: boolean;
  streaming_aktiv: boolean;
  eier_id: string | null;
  fornavn: string | null;
  etternavn: string | null;
  epost: string | null;
  telefon: string | null;
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

export type PilotPeriode = {
  id: string;
  arena_id: string;
  start_dato: string;
  slutt_dato: string;
  status: string;
  konvertert: boolean;
};
