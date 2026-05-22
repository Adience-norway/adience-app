# Ådience Platform — Komplett Kravspesifikasjon

## Designsystem
- Background: #052630 (Deep Petrol)
- Accent: #21D4BD (Electric Turquoise)  
- CTA: #FF6B4A (Signal Coral)
- Dark panels: #1E293B (Shadow Slate)
- Fonts: Montserrat (headings), Roboto Mono (numbers/IDs), Inter (body)
- Logo: /public/logo.png (horizontal), /public/icon.png (square)

## Sider og flyter

### / (Forside)
- Header: logo + nav (Funksjoner, Last ned, Start pilot-knapp i coral)
- Hero: "Raise the Ådience" + subtext + to knapper: "Start gratis pilot" → /registrer, "Logg inn" → /admin
- Features: 3 kort (Eksklusiv tilgang, Under 0.5ms forsinkelse, Geofencing)
- How it works: 3 steg (Scan QR, Åpne app, Lytt eksklusivt)
- App download section: App Store + Google Play lenker
- Footer: logo, tagline, kontakt (post@adience.no, +47 90182288), personvern

### /registrer (Pilot-registrering for NYE kunder)
Felt i denne rekkefølgen:
1. Arenanavn (required)
2. Kategori dropdown: Indoor Sports Venue, Outdoor Sports Venue, Indoor Cultural Venue, Outdoor Cultural Venue, Cultural Center, Theatre, Opera House, Festival, Podcast, Live, Other
3. Adresse (required) — med autocomplete som henter lat/lng via Nominatim API
4. Postnummer + By (side by side)
5. Land dropdown (Norge, Sverige, Danmark, Finland, Spania, Tyskland, UK, Annet)
6. Arenakapasitet dropdown: Under 500, 500-2000, 2000-5000, 5000-15000, 15000+
7. Organisasjonsnummer (required, unique — blokkerer dobbel pilot)
8. Fornavn + Etternavn (side by side, required)
9. E-post (required, unique)
10. Telefon
11. Logo-opplasting (PNG/JPG, optional)
12. GDPR-samtykke checkbox (required)
13. Submit: "Start gratis 14-dagers pilot" (coral button)

Ved submit:
- Sjekk org_nummer ikke finnes fra før → vis feil hvis duplikat
- Auto-generer unik stream_id (ADC + random + timestamp)
- Geocode adresse → lagre lat/lng automatisk
- Insert til arenaer-tabellen
- Insert til pilot_perioder (14 dager)
- Insert til brukere
- Vis suksessside med stream_id og QR-kode
- Send velkomst-epost (via Brevo API)

### /admin (Ådience intern admin — passord: Hamar2019)
Seksjoner:
1. Topplinje: totalt arenaer, aktive piloter, streaming aktive, lyttere i dag
2. Arenatabell med kolonner: Arenanavn, Kategori, Land, Pilot-status (dager igjen), Streaming (toggle), Stream-ID, Org.nr, Opprettet
3. Søk og filtrer på navn/land/status
4. Klikk arena → detaljvisning med alle felt + rediger
5. Knapp: "Legg til arena manuelt"

### /min-side (Kundeportal — Supabase Auth)
Krever innlogging med e-post/passord.
Seksjoner:
1. Dashboard: lyttertall, toppengasjement, neste steg
2. Statistikk: per arrangement, AI-innsikt
3. Geofence-editor: tegn polygon på kart
4. Speakerteam: liste med sertifiseringsstatus
5. Kursmoduler: 5 moduler med progresjon
6. Sertifikater: last ned PDF per speaker
7. Abonnement: vis plan, oppgrader til betalt

### /cast (Ådience Cast — sender)
- Enkel browser-sender
- Stream ID felt (auto-fylt hvis innlogget)
- Mikrofon-velger
- EQ preset: Plain, Voice, Music
- Start/stopp sending-knapp
- Live lytterteller
- Tilkoblingsstatus

## Database (Supabase — eu-central-1 Frankfurt)

### arenaer
id, arenanavn, kategori, adresse_gate, postnummer, by, land, lat, lng,
geofence_radius (default 300), geofence_polygon (geometry),
org_nummer (unique), kapasitet, stream_id (unique),
logo_url, synlig_i_app (default true), streaming_aktiv (default false),
eier_id, fornavn, etternavn, epost, telefon, opprettet

### brukere
id, epost (unique), fornavn, etternavn, arena_id, rolle, opprettet

### abonnementer
id, arena_id, type (pilot/månedlig/årlig/enkelt), status,
stripe_customer_id, stripe_subscription_id,
periode_start, periode_slutt, opprettet

### pilot_perioder
id, arena_id, start_dato, slutt_dato (start + 14 days),
status (aktiv/utløpt/konvertert), konvertert (bool), opprettet

### arrangementer
id, arena_id, tittel, start_tid, slutt_tid,
stream_id (unique), qr_kode_url,
krever_betaling (bool), lytter_grense (default 100), opprettet

### speakerteam
id, arena_id, fornavn, etternavn, epost, rolle,
kurs_progresjon (0-5), sertifisert (bool),
sertifikat_dato, opprettet

## Regler og logikk

### Geofence overlapp
- Samme eier: ubegrenset overlapp tillatt
- Ulik eier, ulik kategori: tillatt med varsel (gult)
- Ulik eier, samme kategori: BLOKKERT (rødt)

### Pilot-begrensning
- Maks 1 pilot per org_nummer
- 14 dager fra registrering
- Etter utløp: streaming_aktiv settes false automatisk

### Stream-ID format
ADC + 8 random tegn uppercase + 6 siste siffer av timestamp
Eksempel: ADCf8K2XmN829401

## API-integrasjoner
- Nominatim (geocoding, gratis)
- Brevo (e-post, gratis tier)
- Stripe (betaling, 1.5% + 1.80kr norske kort)
- Claude API (AI-analyse, ~$3/1M tokens)
- Cloudinary (bilder, gratis tier)
- Ant Media Server (streaming, månedlig lisens)
- Replicate Flux.1 (AI-bakgrunnsbilder, $0.003/bilde)

## Kostnader månedlig (MVP)
- Supabase Pro: $25
- Vercel Pro: $20
- Brevo Starter: $9
- Claude API: ~$10
- Total: ~$64/mnd (ca kr 700)
