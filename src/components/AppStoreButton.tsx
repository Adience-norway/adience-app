function AppleIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
      <path d="M3.18 23.75a2 2 0 0 1-1-.28A2 2 0 0 1 1.18 22V2a2 2 0 0 1 3-1.73l18 10a2 2 0 0 1 0 3.46l-18 10a2 2 0 0 1-1 .02z" />
    </svg>
  );
}

export function AppStoreButton({ platform }: { platform: "apple" | "google" }) {
  return (
    <button disabled aria-disabled="true" style={{
      backgroundColor: "rgba(255,255,255,0.06)",
      border: "1px solid rgba(255,255,255,0.15)",
      borderRadius: "12px",
      padding: "14px 28px",
      display: "flex",
      alignItems: "center",
      gap: "14px",
      cursor: "default",
      color: "#ffffff",
      opacity: 0.55,
    }}>
      {platform === "apple" ? <AppleIcon /> : <PlayIcon />}
      <div style={{ textAlign: "left" }}>
        <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.5)", letterSpacing: "0.06em", fontFamily: "var(--font-ibm-plex-mono), monospace", marginBottom: "2px" }}>
          KOMMER SNART
        </div>
        <div style={{ fontSize: "16px", fontWeight: 700, fontFamily: "var(--font-montserrat), system-ui, sans-serif", letterSpacing: "0.01em" }}>
          {platform === "apple" ? "App Store" : "Google Play"}
        </div>
      </div>
    </button>
  );
}
