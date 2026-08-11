// Android Digital Asset Links — lar Android knytte https://app.adience.no/a/*
// til Ådience-appen (App Links), slik at en QR-skann åpner appen direkte uten
// "Åpne med"-valg.
//
// sha256_cert_fingerprints må inneholde SHA-256-avtrykket til NØKKELEN appen
// signeres med i produksjon. Den finnes ikke ennå: appen signeres i dag med
// debug-nøkkel, og pakkenavnet er fortsatt com.caddiesoft.adience. Når release-
// signering settes opp (egen keystore eller Play App Signing), legg avtrykket i
// Vercel-miljøvariabelen ANDROID_CERT_SHA256 (komma-separert hvis flere, f.eks.
// upload-nøkkel + Play App Signing) — da begynner verifiseringen å virke uten
// ny kodeendring. Bytt package_name hvis pakkenavnet endres ved uavhengighet.
const PACKAGE_NAME = "com.caddiesoft.adience";

export function GET() {
  const fingerprints = (process.env.ANDROID_CERT_SHA256 ?? "")
    .split(",")
    .map((f) => f.trim())
    .filter(Boolean);

  const assetlinks = [
    {
      relation: ["delegate_permission/common.handle_all_urls"],
      target: {
        namespace: "android_app",
        package_name: PACKAGE_NAME,
        sha256_cert_fingerprints: fingerprints,
      },
    },
  ];

  return new Response(JSON.stringify(assetlinks), {
    headers: {
      "content-type": "application/json",
      "cache-control": "public, max-age=3600",
    },
  });
}
