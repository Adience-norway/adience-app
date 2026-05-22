"use client";

import { useState, useEffect, useRef, useCallback } from "react";

/* ─── EQ PRESETS ─── */

type FilterDef = { type: BiquadFilterType; frequency: number; gain: number; Q?: number };

const EQ_PRESETS: Record<string, FilterDef[]> = {
  Plain: [],
  Voice: [
    { type: "highpass",  frequency: 100,  gain: 0,  Q: 0.7 },
    { type: "peaking",   frequency: 3000, gain: 4,  Q: 1.2 },
    { type: "highshelf", frequency: 8000, gain: 2,  Q: 0.7 },
  ],
  Music: [
    { type: "lowshelf",  frequency: 200,  gain: 3,  Q: 0.7 },
    { type: "peaking",   frequency: 1000, gain: -1, Q: 1.0 },
    { type: "highshelf", frequency: 6000, gain: 2,  Q: 0.7 },
  ],
};

type ConnectionStatus = "idle" | "connecting" | "live" | "error";

/* ─── MAIN PAGE ─── */

export default function CastPage() {
  const [streamId, setStreamId]         = useState("");
  const [devices, setDevices]           = useState<MediaDeviceInfo[]>([]);
  const [selectedDevice, setSelectedDevice] = useState("");
  const [eqPreset, setEqPreset]         = useState<"Plain" | "Voice" | "Music">("Plain");
  const [status, setStatus]             = useState<ConnectionStatus>("idle");
  const [listenerCount, setListenerCount] = useState(0);
  const [audioLevel, setAudioLevel]     = useState(0);
  const [errorMsg, setErrorMsg]         = useState("");

  const audioCtxRef   = useRef<AudioContext | null>(null);
  const streamRef     = useRef<MediaStream | null>(null);
  const analyserRef   = useRef<AnalyserNode | null>(null);
  const animFrameRef  = useRef<number>(0);
  const listenerTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load microphone devices
  useEffect(() => {
    navigator.mediaDevices?.enumerateDevices().then(devs => {
      const mics = devs.filter(d => d.kind === "audioinput");
      setDevices(mics);
      if (mics.length > 0) setSelectedDevice(mics[0].deviceId);
    }).catch(() => {});
  }, []);

  // VU meter animation loop
  const startVuMeter = useCallback((analyser: AnalyserNode) => {
    const buf = new Uint8Array(analyser.frequencyBinCount);
    const tick = () => {
      analyser.getByteTimeDomainData(buf);
      let sum = 0;
      for (let i = 0; i < buf.length; i++) {
        const v = (buf[i] - 128) / 128;
        sum += v * v;
      }
      const rms = Math.sqrt(sum / buf.length);
      setAudioLevel(Math.min(100, Math.round(rms * 400)));
      animFrameRef.current = requestAnimationFrame(tick);
    };
    animFrameRef.current = requestAnimationFrame(tick);
  }, []);

  async function startStreaming() {
    if (!streamId.trim()) { setErrorMsg("Fyll inn Stream ID før du starter."); return; }
    setErrorMsg("");
    setStatus("connecting");

    try {
      const constraints: MediaStreamConstraints = {
        audio: selectedDevice ? { deviceId: { exact: selectedDevice } } : true,
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      const ctx = new AudioContext();
      audioCtxRef.current = ctx;

      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 1024;
      analyserRef.current = analyser;

      // Build EQ filter chain
      const filters = EQ_PRESETS[eqPreset].map(def => {
        const f = ctx.createBiquadFilter();
        f.type = def.type;
        f.frequency.value = def.frequency;
        f.gain.value = def.gain;
        if (def.Q) f.Q.value = def.Q;
        return f;
      });

      // Connect chain: source → [filters] → analyser → destination
      const nodes: AudioNode[] = [source, ...filters, analyser];
      for (let i = 0; i < nodes.length - 1; i++) {
        (nodes[i] as AudioNode).connect(nodes[i + 1] as AudioNode);
      }
      analyser.connect(ctx.destination);

      startVuMeter(analyser);

      // Simulate listener count (replace with real Supabase Realtime later)
      setListenerCount(0);
      listenerTimer.current = setInterval(() => {
        setListenerCount(prev => prev + Math.floor(Math.random() * 2));
      }, 8000);

      setTimeout(() => setStatus("live"), 1200);
    } catch (err) {
      setStatus("error");
      setErrorMsg(err instanceof Error ? err.message : "Klarte ikke koble til mikrofon.");
    }
  }

  function stopStreaming() {
    cancelAnimationFrame(animFrameRef.current);
    if (listenerTimer.current) clearInterval(listenerTimer.current);
    audioCtxRef.current?.close();
    streamRef.current?.getTracks().forEach(t => t.stop());
    audioCtxRef.current = null;
    streamRef.current   = null;
    analyserRef.current = null;
    setStatus("idle");
    setAudioLevel(0);
    setListenerCount(0);
  }

  useEffect(() => () => stopStreaming(), []); // cleanup on unmount

  const isLive = status === "live";

  return (
    <div style={pageStyle}>
      {/* ─── HEADER ─── */}
      <header style={headerStyle}>
        <div style={headerInner}>
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="ÅDIENCE" style={{ height: "28px", width: "auto" }} />
            <div style={dividerStyle} />
            <span style={monoChipStyle}>CAST</span>
          </div>
          <a href="/" style={backLinkStyle}>← Forsiden</a>
        </div>
      </header>

      {/* ─── BODY ─── */}
      <div style={bodyStyle}>
        <div style={cardStyle}>

          {/* Title + status pill */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "36px" }}>
            <div>
              <h1 style={headingStyle}>Ådience Cast</h1>
              <p style={subStyle}>Browser-sender for live arenastreaming</p>
            </div>
            <StatusPill status={status} />
          </div>

          {/* ─── Stream ID ─── */}
          <Section label="STREAM ID">
            <div style={{ position: "relative" }}>
              <input
                value={streamId}
                onChange={e => setStreamId(e.target.value.toUpperCase())}
                placeholder="ADCf8K2XmN829401"
                style={{ ...inputStyle, fontFamily: "var(--font-roboto-mono), monospace", letterSpacing: "0.06em", paddingRight: "44px" }}
                disabled={isLive || status === "connecting"}
                onFocus={e => { e.target.style.borderColor = "#21D4BD"; e.target.style.boxShadow = "0 0 0 3px rgba(33,212,189,0.15)"; }}
                onBlur={e => { e.target.style.borderColor = "rgba(255,255,255,0.12)"; e.target.style.boxShadow = "none"; }}
              />
              {streamId && (
                <span style={{ position: "absolute", right: "14px", top: "50%", transform: "translateY(-50%)", color: "#21D4BD", fontSize: "14px" }}>✓</span>
              )}
            </div>
          </Section>

          {/* ─── Microphone ─── */}
          <Section label="MIKROFON">
            <select
              value={selectedDevice}
              onChange={e => setSelectedDevice(e.target.value)}
              disabled={isLive || status === "connecting"}
              style={{ ...inputStyle, appearance: "none", cursor: "pointer" }}
              onFocus={e => { e.currentTarget.style.borderColor = "#21D4BD"; }}
              onBlur={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)"; }}
            >
              {devices.length === 0
                ? <option value="">Ingen mikrofoner funnet</option>
                : devices.map(d => (
                    <option key={d.deviceId} value={d.deviceId}>
                      {d.label || `Mikrofon ${d.deviceId.slice(0, 8)}`}
                    </option>
                  ))
              }
            </select>
          </Section>

          {/* ─── EQ Preset ─── */}
          <Section label="EQ PRESET">
            <div style={{ display: "flex", gap: "10px" }}>
              {(["Plain", "Voice", "Music"] as const).map(p => (
                <button
                  key={p}
                  onClick={() => !isLive && setEqPreset(p)}
                  disabled={isLive || status === "connecting"}
                  style={{
                    flex: 1,
                    padding: "10px",
                    borderRadius: "8px",
                    border: eqPreset === p ? "1.5px solid #21D4BD" : "1px solid rgba(255,255,255,0.12)",
                    backgroundColor: eqPreset === p ? "rgba(33,212,189,0.1)" : "rgba(255,255,255,0.04)",
                    color: eqPreset === p ? "#21D4BD" : "rgba(255,255,255,0.5)",
                    fontSize: "14px",
                    fontWeight: eqPreset === p ? 700 : 400,
                    fontFamily: "var(--font-montserrat), system-ui, sans-serif",
                    cursor: isLive ? "not-allowed" : "pointer",
                    letterSpacing: "0.04em",
                    transition: "all 0.15s",
                  }}
                >
                  {p}
                </button>
              ))}
            </div>
          </Section>

          {/* ─── VU Meter ─── */}
          <Section label="LYDNIVÅ">
            <div style={{ height: "12px", backgroundColor: "rgba(255,255,255,0.06)", borderRadius: "6px", overflow: "hidden", position: "relative" }}>
              <div style={{
                height: "100%",
                width: `${audioLevel}%`,
                background: audioLevel > 80
                  ? "linear-gradient(90deg, #21D4BD, #FF6B4A)"
                  : "linear-gradient(90deg, #21D4BD, #1bbda8)",
                borderRadius: "6px",
                transition: "width 0.05s linear",
              }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: "6px" }}>
              <span style={vuLabelStyle}>0</span>
              <span style={vuLabelStyle}>-18dB</span>
              <span style={vuLabelStyle}>-12dB</span>
              <span style={vuLabelStyle}>-6dB</span>
              <span style={{ ...vuLabelStyle, color: "#FF6B4A" }}>0dB</span>
            </div>
          </Section>

          {/* ─── Error ─── */}
          {errorMsg && (
            <div style={errorBoxStyle}>{errorMsg}</div>
          )}

          {/* ─── Main button ─── */}
          <button
            onClick={isLive ? stopStreaming : startStreaming}
            disabled={status === "connecting"}
            style={{
              width: "100%",
              padding: "18px",
              borderRadius: "10px",
              fontSize: "17px",
              fontWeight: 700,
              fontFamily: "var(--font-montserrat), system-ui, sans-serif",
              letterSpacing: "0.04em",
              cursor: status === "connecting" ? "not-allowed" : "pointer",
              transition: "all 0.2s",
              marginBottom: "20px",
              ...(isLive
                ? { backgroundColor: "rgba(255,107,74,0.15)", color: "#FF6B4A", border: "1.5px solid #FF6B4A" }
                : status === "connecting"
                  ? { backgroundColor: "rgba(33,212,189,0.2)", color: "#21D4BD", border: "none", opacity: 0.7 }
                  : { backgroundColor: "#FF6B4A", color: "#ffffff", border: "none", boxShadow: "0 0 32px rgba(255,107,74,0.35)" }
              ),
            }}
          >
            {status === "connecting" ? "Kobler til…" : isLive ? "■  Stopp sending" : "▶  Start sending"}
          </button>

          {/* ─── Live stats ─── */}
          {isLive && (
            <div style={statsRowStyle}>
              <div style={statBoxStyle}>
                <div style={{ fontFamily: "var(--font-roboto-mono), monospace", fontSize: "28px", color: "#21D4BD", fontWeight: 500 }}>
                  {listenerCount}
                </div>
                <div style={statLabelStyle}>Lyttere nå</div>
              </div>
              <div style={statBoxStyle}>
                <div style={{ fontFamily: "var(--font-roboto-mono), monospace", fontSize: "28px", color: "#21D4BD", fontWeight: 500 }}>
                  {eqPreset}
                </div>
                <div style={statLabelStyle}>EQ preset</div>
              </div>
              <div style={statBoxStyle}>
                <div style={{ fontFamily: "var(--font-roboto-mono), monospace", fontSize: "28px", color: "#21D4BD", fontWeight: 500 }}>
                  &lt;0.5ms
                </div>
                <div style={statLabelStyle}>Forsinkelse</div>
              </div>
            </div>
          )}

          {/* Server config note */}
          {!isLive && status === "idle" && (
            <p style={{ color: "rgba(255,255,255,0.2)", fontSize: "12px", textAlign: "center", fontFamily: "var(--font-roboto-mono), monospace", marginTop: "4px" }}>
              Krever Ant Media Server-konfigurasjon for faktisk streaming
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── STATUS PILL ─── */

function StatusPill({ status }: { status: ConnectionStatus }) {
  const cfg = {
    idle:       { label: "Inaktiv",    color: "rgba(255,255,255,0.25)", dot: "rgba(255,255,255,0.3)" },
    connecting: { label: "Kobler til…", color: "#21D4BD",               dot: "#21D4BD" },
    live:       { label: "● LIVE",     color: "#FF6B4A",                dot: "#FF6B4A" },
    error:      { label: "Feil",       color: "#FF6B4A",                dot: "#FF6B4A" },
  }[status];

  return (
    <div style={{
      display: "inline-flex",
      alignItems: "center",
      gap: "7px",
      backgroundColor: `${cfg.color}18`,
      border: `1px solid ${cfg.color}50`,
      borderRadius: "100px",
      padding: "6px 14px",
    }}>
      {status === "live" && (
        <span style={{ width: "7px", height: "7px", backgroundColor: "#FF6B4A", borderRadius: "50%", display: "inline-block", animation: "none" }} />
      )}
      <span style={{ color: cfg.color, fontSize: "12px", fontWeight: 700, fontFamily: "var(--font-roboto-mono), monospace", letterSpacing: "0.08em" }}>
        {cfg.label}
      </span>
    </div>
  );
}

/* ─── SECTION WRAPPER ─── */

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: "24px" }}>
      <div style={{ fontFamily: "var(--font-roboto-mono), monospace", fontSize: "11px", letterSpacing: "0.12em", color: "rgba(255,255,255,0.3)", marginBottom: "10px" }}>
        {label}
      </div>
      {children}
    </div>
  );
}

/* ─── STYLES ─── */

const pageStyle: React.CSSProperties = {
  backgroundColor: "#052630",
  minHeight: "100vh",
  color: "#ffffff",
  fontFamily: "var(--font-inter), system-ui, sans-serif",
};

const headerStyle: React.CSSProperties = {
  borderBottom: "1px solid rgba(33,212,189,0.1)",
  backgroundColor: "rgba(5,38,48,0.95)",
  position: "sticky",
  top: 0,
  zIndex: 50,
};

const headerInner: React.CSSProperties = {
  maxWidth: "1200px",
  margin: "0 auto",
  padding: "0 24px",
  height: "64px",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
};

const dividerStyle: React.CSSProperties = {
  width: "1px",
  height: "20px",
  backgroundColor: "rgba(255,255,255,0.15)",
};

const monoChipStyle: React.CSSProperties = {
  fontFamily: "var(--font-roboto-mono), monospace",
  fontSize: "12px",
  color: "rgba(255,255,255,0.4)",
  letterSpacing: "0.1em",
};

const backLinkStyle: React.CSSProperties = {
  color: "rgba(255,255,255,0.4)",
  fontSize: "13px",
  textDecoration: "none",
};

const bodyStyle: React.CSSProperties = {
  maxWidth: "560px",
  margin: "0 auto",
  padding: "60px 24px 100px",
};

const cardStyle: React.CSSProperties = {
  backgroundColor: "#1E293B",
  border: "1px solid rgba(33,212,189,0.12)",
  borderRadius: "20px",
  padding: "40px",
};

const headingStyle: React.CSSProperties = {
  fontFamily: "var(--font-montserrat), system-ui, sans-serif",
  fontWeight: 800,
  fontSize: "24px",
  letterSpacing: "-0.02em",
  marginBottom: "4px",
};

const subStyle: React.CSSProperties = {
  color: "rgba(255,255,255,0.4)",
  fontSize: "14px",
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

const errorBoxStyle: React.CSSProperties = {
  backgroundColor: "rgba(255,107,74,0.1)",
  border: "1px solid rgba(255,107,74,0.3)",
  borderRadius: "8px",
  padding: "12px 16px",
  fontSize: "14px",
  color: "rgba(255,255,255,0.8)",
  marginBottom: "16px",
};

const vuLabelStyle: React.CSSProperties = {
  fontFamily: "var(--font-roboto-mono), monospace",
  fontSize: "10px",
  color: "rgba(255,255,255,0.2)",
};

const statsRowStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(3, 1fr)",
  gap: "12px",
};

const statBoxStyle: React.CSSProperties = {
  backgroundColor: "rgba(33,212,189,0.05)",
  border: "1px solid rgba(33,212,189,0.12)",
  borderRadius: "10px",
  padding: "16px",
  textAlign: "center",
};

const statLabelStyle: React.CSSProperties = {
  color: "rgba(255,255,255,0.35)",
  fontSize: "11px",
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  marginTop: "4px",
  fontFamily: "var(--font-roboto-mono), monospace",
};
