// Apple App Site Association (AASA) — lar iOS knytte https://app.adience.no/a/*
// til Ådience-appen, slik at en QR-skann åpner appen DIREKTE (Universal Links)
// uten "Åpne i app?"-dialogen som et rått adience://-scheme alltid utløser.
//
// appID = <Apple Team ID>.<bundle id>. Team ID 3U224K89DY er per i dag knyttet
// til Caddiesofts Apple-konto — når appen flyttes til Ådiences egen konto
// (jf. uavhengighetsplanen) MÅ team-ID-en her oppdateres, ellers slutter
// Universal Links å verifisere.
// Belt-and-suspenders: vi oppgir BÅDE det gamle formatet (appID + paths, som
// eldre iOS-parsere og noen finicky tilfeller krever) OG det moderne (appIDs +
// components). `apps: []` er påkrevd i det gamle formatet. Dette maksimerer at
// iOS faktisk godtar knyttingen.
const APP_ID = "3U224K89DY.no.adience.mobil";
const AASA = {
  applinks: {
    apps: [],
    details: [
      {
        appID: APP_ID,
        paths: ["/a/*"],
      },
      {
        appIDs: [APP_ID],
        components: [{ "/": "/a/*", comment: "Åpner riktig arena i Ådience-appen" }],
      },
    ],
  },
};

export function GET() {
  return new Response(JSON.stringify(AASA), {
    headers: {
      "content-type": "application/json",
      // Apple henter denne via sitt CDN; la den caches, men ikke evig.
      "cache-control": "public, max-age=3600",
    },
  });
}
