"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { AppStoreButton } from "@/components/AppStoreButton";

// Smart-lenke: QR-koder og delte lenker peker hit (en vanlig https-adresse, ikke
// direkte adience://) nettopp fordi et rått custom-scheme feiler helt stille uten
// noen fallback hvis appen ikke er installert. Denne siden prøver å åpne appen med
// det samme, og viser nedlastingsknapper hvis det ikke lykkes i løpet av kort tid.
//
// Én enkelt QR-kode/URL dekker alle land og språk (genereres én gang per
// arena, ikke per besøkende) — det finnes derfor ingen /en-variant av denne
// ruten slik resten av siten har. Språket avgjøres i stedet av nettleserens
// egen språkinnstilling, med en synlig bryter for å overstyre.
const TEKST = {
  no: {
    opening: "Åpner Ådience-appen …",
    noAppTitle: "Har du ikke Ådience-appen ennå?",
    noAppSubtitle: "Last den ned gratis, så tar du deg rett inn hit igjen.",
    retryLink: "Har du appen? Prøv å åpne den igjen →",
  },
  en: {
    opening: "Opening the Ådience app …",
    noAppTitle: "Don't have the Ådience app yet?",
    noAppSubtitle: "Download it for free, then come straight back here.",
    retryLink: "Already have the app? Try opening it again →",
  },
};

function gjettSprak(): "no" | "en" {
  if (typeof navigator === "undefined") return "no";
  return navigator.language.toLowerCase().startsWith("en") ? "en" : "no";
}

export function AapneAppContent() {
  const params = useParams();
  const streamId = typeof params.streamId === "string" ? params.streamId : "";
  const [visFallback, setVisFallback] = useState(false);
  const [sprak, setSprak] = useState<"no" | "en">("no");
  const t = TEKST[sprak];

  useEffect(() => {
    setSprak(gjettSprak());
  }, []);

  useEffect(() => {
    if (!streamId) return;

    window.location.href = `adience://${streamId}`;

    // Ingen synlighetssjekk her med vilje: hvis appen faktisk åpnet seg, har
    // brukeren allerede forlatt denne fanen og ser aldri fallback-en uansett.
    // Sjekker vi visibilityState i stedet, er den upålitelig på tvers av
    // nettlesere/enheter og kan gi falske negativer.
    const timer = setTimeout(() => setVisFallback(true), 1500);

    return () => clearTimeout(timer);
  }, [streamId]);

  return (
    <div style={{ backgroundColor: "#073E46", color: "#ffffff", minHeight: "100vh", fontFamily: "var(--font-inter), system-ui, sans-serif", position: "relative" }}>
      <div style={{ position: "absolute", top: "20px", right: "24px", display: "flex", gap: "8px" }}>
        {(["no", "en"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setSprak(s)}
            style={{
              background: "none", border: "none", cursor: "pointer", padding: "4px 6px",
              fontSize: "13px", fontWeight: sprak === s ? 700 : 400,
              color: sprak === s ? "#33D3C4" : "rgba(255,255,255,0.4)",
            }}
          >
            {s.toUpperCase()}
          </button>
        ))}
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", padding: "24px" }}>
        <div style={{ maxWidth: "400px", textAlign: "center" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="ÅDIENCE" style={{ height: "72px", width: "auto", margin: "0 auto 32px" }} />

          {!visFallback ? (
            <p style={{ color: "rgba(255,255,255,0.6)", fontSize: "16px" }}>{t.opening}</p>
          ) : (
            <>
              <p style={{ fontSize: "17px", lineHeight: 1.6, marginBottom: "8px" }}>
                {t.noAppTitle}
              </p>
              <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "14px", marginBottom: "28px" }}>
                {t.noAppSubtitle}
              </p>
              <div style={{ display: "flex", flexDirection: "column" as const, gap: "12px", alignItems: "center" }}>
                <AppStoreButton platform="apple" />
                <AppStoreButton platform="google" />
              </div>
              <a
                href={`adience://${streamId}`}
                style={{ display: "inline-block", marginTop: "28px", color: "#33D3C4", fontSize: "14px", textDecoration: "none" }}
              >
                {t.retryLink}
              </a>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
