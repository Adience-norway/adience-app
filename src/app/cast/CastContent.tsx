"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import type { Dictionary, Locale } from "@/i18n/get-dictionary";

const ANT_MEDIA_HOST = "cast.adience.no";
const ANT_MEDIA_APP = "LiveApp";

// Arenaer med en Liquidsoap-tjeneste på serveren som looper pausemusikk og
// automatisk faster over til mikrofonen (1,5 sek ned / 1,5 sek opp) når noen
// sender. Liquidsoap eier selve det offentlige stream_id-et og lytter på en
// intern "-src"-variant for mikrofonen — derfor må /cast publisere DIT i
// stedet for direkte til det offentlige, for akkurat disse arenaene. Andre
// arenaer mangler foreløpig denne server-tjenesten og publiserer som før,
// direkte til sitt eget stream_id.
const HOLDMUSIKK_ARENAER = new Set(["ADCUGN1LDV4866127"]); // Ådience Demo

function publiserStreamId(streamId: string): string {
  return HOLDMUSIKK_ARENAER.has(streamId) ? `${streamId}-src` : streamId;
}

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
type Cast = Dictionary["cast"];

/* ─── MAIN PAGE ─── */

// Lets a demo/QR link like /cast?id=ADC... prefill the field instead of
// requiring the sender to type the stream ID by hand before a demo.
function initialStreamIdFromUrl(): string {
  if (typeof window === "undefined") return "";
  return (new URLSearchParams(window.location.search).get("id") ?? "").toUpperCase();
}

export function CastContent({ dict, locale }: { dict: Dictionary; locale: Locale }) {
  const t = dict.cast;
  const homeHref = locale === "en" ? "/en" : "/";

  const [streamId, setStreamId]         = useState(initialStreamIdFromUrl);
  const [passord, setPassord]           = useState("");
  const [passordVerifisert, setPassordVerifisert] = useState(false);
  const [arenaNavn, setArenaNavn]       = useState("");
  const [verifiserer, setVerifiserer]   = useState(false);
  const [passordFeil, setPassordFeil]   = useState("");
  const [devices, setDevices]           = useState<MediaDeviceInfo[]>([]);
  const [selectedDevice, setSelectedDevice] = useState("");
  const [eqPreset, setEqPreset]         = useState<"Plain" | "Voice" | "Music">("Plain");
  const [status, setStatus]             = useState<ConnectionStatus>("idle");
  const [castMode, setCastMode]         = useState<"live" | "hold">("live");
  const [modeChanging, setModeChanging] = useState(false);
  const [listenerCount, setListenerCount] = useState(0);
  const [audioLevel, setAudioLevel]     = useState(0);
  const [errorMsg, setErrorMsg]         = useState("");

  const audioCtxRef   = useRef<AudioContext | null>(null);
  const streamRef     = useRef<MediaStream | null>(null);
  const analyserRef   = useRef<AnalyserNode | null>(null);
  const monitorGainRef = useRef<GainNode | null>(null);
  const animFrameRef  = useRef<number>(0);
  const listenerTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const adaptorRef    = useRef<any>(null);

  // Load microphone/audio-input devices. Browsers hide real device names
  // ("VB-Cable", "Audient iD4" osv.) until mic-tilgang er innvilget minst én
  // gang for siden — derfor ber vi om et kort, midlertidig tilgangs-grep bare
  // for å låse opp navnene, uten å beholde eller bruke selve strømmen. Vi
  // lytter også på devicechange, slik at en enhet som kobles til/fra (f.eks.
  // et lydkort) dukker opp uten at siden må lastes på nytt.
  const refreshDevices = useCallback(async () => {
    try {
      const devs = await navigator.mediaDevices.enumerateDevices();
      const inputs = devs.filter(d => d.kind === "audioinput");
      setDevices(inputs);
      setSelectedDevice(prev => (prev && inputs.some(d => d.deviceId === prev)) ? prev : (inputs[0]?.deviceId ?? ""));
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const tempStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        tempStream.getTracks().forEach(t => t.stop());
      } catch { /* bruker avslo tilgang — vi fortsetter uten fine navn */ }
      await refreshDevices();
    })();

    navigator.mediaDevices.addEventListener("devicechange", refreshDevices);
    return () => navigator.mediaDevices.removeEventListener("devicechange", refreshDevices);
  }, [refreshDevices]);

  // Passordet gjelder for én bestemt stream-ID — endres feltet, må det
  // verifiseres på nytt før sending kan startes igjen.
  useEffect(() => {
    setPassordVerifisert(false);
    setPassordFeil("");
    setArenaNavn("");
  }, [streamId]);

  async function handleVerifiserPassord() {
    if (!streamId.trim() || !passord.trim()) return;
    setVerifiserer(true);
    setPassordFeil("");
    try {
      const res = await fetch("/api/cast-auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ streamId: streamId.trim(), passord: passord.trim(), locale }),
      });
      const data = await res.json();
      if (data.ok) {
        setPassordVerifisert(true);
        setArenaNavn(data.arenaNavn ?? "");
      } else {
        setPassordVerifisert(false);
        setArenaNavn("");
        setPassordFeil(data.error ?? t.passordFeil);
      }
    } catch {
      setPassordVerifisert(false);
      setArenaNavn("");
      setPassordFeil(t.passordFeil);
    } finally {
      setVerifiserer(false);
    }
  }

  // Logger start/slutt for faktiske sendinger på arenaens faste stream-ID
  // (se /api/cast-log) -- fire-and-forget, skal aldri kunne blokkere eller
  // avbryte selve sendingen om loggingen skulle feile.
  function logSending(action: "start" | "stop") {
    fetch("/api/cast-log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ streamId: streamId.trim(), passord: passord.trim(), action }),
    }).catch(() => { /* logging skal aldri stoppe en sending */ });
  }

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
    if (!streamId.trim()) { setErrorMsg(t.errorFillStreamId); return; }
    // Sikkerhetssperre i to lag: UI-en under skjuler/deaktiverer knappen før
    // verifisering, men denne sjekken er den som faktisk teller — den kan
    // ikke omgås ved å bare manipulere UI-tilstanden i nettleseren.
    if (!passordVerifisert) { setErrorMsg(t.passordPaakrevd); return; }
    setErrorMsg("");
    setStatus("connecting");
    setCastMode("live");

    try {
      const ctx = new AudioContext();
      audioCtxRef.current = ctx;

      // Explicitly disable the browser's default voice-call processing
      // (echo cancellation, noise suppression, auto gain control) -- these
      // are tuned for Zoom/Meet-style calls and aggressively mangle a clean
      // signal from a real broadcast mic + audio interface (e.g. Shure SM7B
      // through an Audient), which is likely the actual cause of the
      // "elendig" quality reported 2026-07-25, independent of bitrate.
      // channelCount: 1 -- a stereo audio interface with only one physical
      // input wired up (e.g. a mic on channel 1, channel 2 unconnected)
      // otherwise gets captured as 2-channel with one silent channel, which
      // plays back audible only in one ear instead of centered mono.
      const constraints: MediaStreamConstraints = {
        audio: {
          ...(selectedDevice ? { deviceId: { exact: selectedDevice } } : {}),
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
          channelCount: 1,
        },
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      const sourceNode = ctx.createMediaStreamSource(stream);

      // The channelCount:1 constraint above is only a hint -- audio
      // interface drivers (e.g. Audient) can silently ignore it and still
      // deliver 2 channels with only one actually carrying signal (mic on
      // input 1, input 2 unconnected), which plays back in one ear only.
      // MediaStreamAudioSourceNode has no real "input" of its own (it's a
      // source), so setting channelCount* directly on it is unreliable --
      // insert a real node with an actual incoming connection instead,
      // where the browser's downmix (0.5*(L+R) -> mono) is well-defined.
      const monoDownmix = ctx.createGain();
      monoDownmix.channelCount = 1;
      monoDownmix.channelCountMode = "explicit";
      monoDownmix.channelInterpretation = "speakers";
      sourceNode.connect(monoDownmix);

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

      // Tap point for the outgoing WebRTC track — separate from the local
      // monitor path (ctx.destination) so publishing never depends on the
      // browser's own speaker output. The mic keeps publishing continuously
      // regardless of Showtime/Waiting (only the server-side mix changes) --
      // but the LOCAL monitor is muted in Waiting, since without that,
      // switching to Waiting doesn't stop the speaker from picking its own
      // mic signal back up (acoustic feedback), which reads as "the mute
      // didn't do anything" even though the public stream is correct.
      const outgoing = ctx.createMediaStreamDestination();
      const monitorGain = ctx.createGain();
      monitorGain.gain.value = castMode === "live" ? 1 : 0;
      monitorGainRef.current = monitorGain;

      // Connect chain: source → mono downmix → [filters] → analyser → destination (+ outgoing tap)
      const nodes: AudioNode[] = [monoDownmix, ...filters, analyser];
      for (let i = 0; i < nodes.length - 1; i++) {
        (nodes[i] as AudioNode).connect(nodes[i + 1] as AudioNode);
      }
      analyser.connect(monitorGain);
      monitorGain.connect(ctx.destination);
      analyser.connect(outgoing);

      startVuMeter(analyser);

      // Loaded dynamically — the package touches `window` at module load time,
      // which breaks Next.js's server-side prerendering if imported statically.
      const { WebRTCAdaptor } = await import("@antmedia/webrtc_adaptor");
      const adaptor = new WebRTCAdaptor({
        websocket_url: `wss://${ANT_MEDIA_HOST}:5443/${ANT_MEDIA_APP}/websocket`,
        mediaConstraints: { audio: false, video: false },
        peerconnection_config: { iceServers: [{ urls: "stun:stun1.l.google.com:19302" }] },
        sdp_constraints: { OfferToReceiveAudio: false, OfferToReceiveVideo: false },
        // AMS's own default is 900 kbps (meant for video+audio combined). This
        // was previously capped at 48 kbps -- far below what's needed for
        // clean voice, and the likely cause of the "grusomt" audio quality
        // reported 2026-07-25. 128 kbps matches the AAC bitrate the Liquidsoap
        // holdmusikk pipeline re-encodes to downstream, so there's no point
        // sending more than that for this audio-only publish.
        bandwidth: 128,
        callback: (info: string) => {
          if (info === "initialized") {
            adaptor.mediaManager.gotStream(outgoing.stream);
            adaptor.publish(publiserStreamId(streamId.trim()));
          } else if (info === "publish_started") {
            setStatus("live");
            listenerTimer.current = setInterval(pollViewerCount, 5000);
            logSending("start");
          } else if (info === "publish_finished") {
            setStatus("idle");
          }
        },
        callbackError: (error: string) => {
          setStatus("error");
          setErrorMsg(`${t.errorAntMedia} ${error}`);
        },
      });
      adaptorRef.current = adaptor;
    } catch (err) {
      setStatus("error");
      setErrorMsg(err instanceof Error ? err.message : t.errorMicConnect);
    }
  }

  // Ant Media Server's own REST API only accepts calls from 127.0.0.1 (remoteAllowedCIDR),
  // so browsers can't reach /rest/v2/broadcasts/.../webrtc-viewer-count directly — every such
  // call gets a 403 "Not allowed IP", which is why this always showed 0 before. A narrow nginx
  // proxy on the same host (cast.adience.no:443, see /etc/nginx/sites-available/adience-viewer-proxy)
  // forwards ONLY this one read-only path to AMS over localhost, so the IP check passes there
  // while the rest of the REST API (which can stop/delete broadcasts) stays locked down.
  async function pollViewerCount() {
    try {
      const res = await fetch(
        `https://${ANT_MEDIA_HOST}/public/viewer-count/${streamId.trim()}`
      );
      const data = await res.json();
      if (typeof data?.number === "number") setListenerCount(data.number);
    } catch { /* keep last known count */ }
  }

  // Lets the speaker team switch Showtime/Waiting mid-session without
  // stopping the WebRTC connection -- only meaningful for arenas with a
  // holdmusikk service running (currently just the demo arena). The mic
  // connection stays open either way; this only tells the arena's
  // Liquidsoap instance which source to mix into the public stream.
  async function handleToggleMode(mode: "live" | "hold") {
    if (mode === castMode || modeChanging) return;
    setModeChanging(true);
    try {
      const res = await fetch("/api/cast-mode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ streamId: streamId.trim(), passord: passord.trim(), mode }),
      });
      const data = await res.json();
      if (data.ok) {
        setCastMode(mode);
        // Mute the LOCAL monitor in Waiting too, not just the public mix --
        // otherwise the speaker's own speakers keep picking up their mic
        // (acoustic feedback/echo), which reads as "Waiting didn't mute
        // anything" even though the public stream switched correctly. The
        // outgoing WebRTC track is untouched, so publishing keeps running.
        const gainNode = monitorGainRef.current;
        const ctx = audioCtxRef.current;
        if (gainNode && ctx) {
          gainNode.gain.setTargetAtTime(mode === "live" ? 1 : 0, ctx.currentTime, 0.05);
        }
      }
    } catch { /* keep previous mode on failure */ }
    finally { setModeChanging(false); }
  }

  function stopStreaming() {
    if (status === "live") logSending("stop");
    cancelAnimationFrame(animFrameRef.current);
    if (listenerTimer.current) clearInterval(listenerTimer.current);
    try { adaptorRef.current?.stop(publiserStreamId(streamId.trim())); } catch { /* already stopped */ }
    adaptorRef.current = null;
    audioCtxRef.current?.close();
    streamRef.current?.getTracks().forEach(t => t.stop());
    audioCtxRef.current = null;
    streamRef.current   = null;
    analyserRef.current = null;
    monitorGainRef.current = null;
    setStatus("idle");
    setAudioLevel(0);
    setListenerCount(0);
    setCastMode("live");
  }

  useEffect(() => () => stopStreaming(), []); // cleanup on unmount

  const isLive = status === "live";

  return (
    <div style={pageStyle}>
      {/* ─── HEADER ─── */}
      <header style={headerStyle}>
        <div style={headerInner}>
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <a href={homeHref} style={{ display: "flex", alignItems: "center", textDecoration: "none" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.png" alt="ÅDIENCE" style={{ height: "56px", width: "auto" }} />
            </a>
            <div style={dividerStyle} />
            <span style={monoChipStyle}>CAST</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
            <a href="https://www.adience.no/blog" style={backLinkStyle}>{t.nav.blog}</a>
            <a href={homeHref} style={backLinkStyle}>{t.nav.backToHome}</a>
            <LanguageSwitcher locale={locale} noHref="/cast" enHref="/en/cast" />
          </div>
        </div>
      </header>

      {/* ─── BODY ─── */}
      <div style={bodyStyle}>
        <div style={cardStyle}>

          {/* Title + status pill */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "36px" }}>
            <div>
              {passordVerifisert && arenaNavn ? (
                <>
                  <h1 style={headingStyle}>{arenaNavn}</h1>
                  <p style={subStyle}>{t.subtitleVerified}</p>
                </>
              ) : (
                <>
                  <h1 style={headingStyle}>{t.title}</h1>
                  <p style={subStyle}>{t.subtitle}</p>
                </>
              )}
            </div>
            <StatusPill status={status} t={t} />
          </div>

          {/* ─── Stream ID ─── */}
          <Section label="STREAM ID">
            <div style={{ position: "relative" }}>
              <input
                value={streamId}
                onChange={e => setStreamId(e.target.value.toUpperCase())}
                placeholder="ADCf8K2XmN829401"
                style={{ ...inputStyle, fontFamily: "var(--font-ibm-plex-mono), monospace", letterSpacing: "0.06em", paddingRight: "44px" }}
                disabled={isLive || status === "connecting"}
                onFocus={e => { e.target.style.borderColor = "#33D3C4"; e.target.style.boxShadow = "0 0 0 3px rgba(51,211,196,0.15)"; }}
                onBlur={e => { e.target.style.borderColor = "rgba(255,255,255,0.12)"; e.target.style.boxShadow = "none"; }}
              />
              {streamId && (
                <span style={{ position: "absolute", right: "14px", top: "50%", transform: "translateY(-50%)", color: "#33D3C4", fontSize: "14px" }}>✓</span>
              )}
            </div>
          </Section>

          {/* ─── Passord — låser opp castingen for denne stream-ID-en. Adskilt
               fra selve ID-en (som er offentlig og ligger i QR-koder), slik at
               noen som kun har skannet QR-koden ikke kan starte en sending.
               Finnes på Min side/i admin for arenaens eier. ─── */}
          <Section label={t.passordLabel}>
            {passordVerifisert ? (
              <div style={{ ...inputStyle, display: "flex", alignItems: "center", justifyContent: "space-between", color: "#33D3C4" }}>
                <span>{t.passordOk}</span>
                <span>✓</span>
              </div>
            ) : (
              <>
                <div style={{ display: "flex", gap: "8px" }}>
                  <input
                    type="password"
                    value={passord}
                    onChange={e => setPassord(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") handleVerifiserPassord(); }}
                    placeholder={t.passordPlaceholder}
                    style={{ ...inputStyle, fontFamily: "var(--font-ibm-plex-mono), monospace", letterSpacing: "0.06em" }}
                    disabled={verifiserer}
                    onFocus={e => { e.target.style.borderColor = "#33D3C4"; e.target.style.boxShadow = "0 0 0 3px rgba(51,211,196,0.15)"; }}
                    onBlur={e => { e.target.style.borderColor = "rgba(255,255,255,0.12)"; e.target.style.boxShadow = "none"; }}
                  />
                  <button
                    onClick={handleVerifiserPassord}
                    disabled={verifiserer || !passord.trim() || !streamId.trim()}
                    style={{
                      ...inputStyle, width: "auto", flexShrink: 0, cursor: verifiserer ? "not-allowed" : "pointer",
                      backgroundColor: "rgba(51,211,196,0.12)", color: "#33D3C4", fontWeight: 600,
                    }}
                  >
                    {verifiserer ? t.verifiserer : t.laasOpp}
                  </button>
                </div>
                {passordFeil && <p style={{ color: "#FF6B4A", fontSize: "13px", marginTop: "8px" }}>{passordFeil}</p>}
              </>
            )}
          </Section>

          {/* ─── Showtime / Waiting — manuell bryter for speakerteamet, satt via
               kontroll-sokkelen til arenaens Liquidsoap-instans. Mikrofon-
               tilkoblingen forblir åpen uansett valg; dette styrer kun hvilken
               kilde som mikses inn i den offentlige sendingen. Kun aktiv (og
               trykkbar) mens man faktisk sender — før/etter det reflekterer
               boksene bare isLive som før. ─── */}
          <Section label="STATUS">
            <div style={{ display: "flex", gap: "10px" }}>
              <button
                type="button"
                onClick={() => handleToggleMode("live")}
                disabled={!isLive || modeChanging}
                style={{
                  flex: 1,
                  padding: "14px",
                  borderRadius: "8px",
                  textAlign: "center" as const,
                  cursor: isLive && !modeChanging ? "pointer" : "default",
                  border: isLive && castMode === "live" ? "1.5px solid #33D3C4" : "1px solid rgba(255,255,255,0.12)",
                  backgroundColor: isLive && castMode === "live" ? "rgba(51,211,196,0.1)" : "rgba(255,255,255,0.04)",
                  color: isLive && castMode === "live" ? "#33D3C4" : "rgba(255,255,255,0.5)",
                  fontWeight: 700,
                  fontSize: "14px",
                  letterSpacing: "0.06em",
                  fontFamily: "var(--font-montserrat), system-ui, sans-serif",
                  transition: "background-color 1.5s ease, border-color 1.5s ease, color 1.5s ease",
                }}
              >
                SHOWTIME
              </button>
              <button
                type="button"
                onClick={() => handleToggleMode("hold")}
                disabled={!isLive || modeChanging}
                style={{
                  width: "110px",
                  flexShrink: 0,
                  padding: "14px 8px",
                  borderRadius: "8px",
                  textAlign: "center" as const,
                  cursor: isLive && !modeChanging ? "pointer" : "default",
                  border: isLive && castMode === "hold" ? "1.5px solid #33D3C4" : "1px solid rgba(255,255,255,0.12)",
                  backgroundColor: isLive && castMode === "hold" ? "rgba(51,211,196,0.1)" : "rgba(255,255,255,0.04)",
                  color: isLive && castMode === "hold" ? "#33D3C4" : "rgba(255,255,255,0.5)",
                  fontWeight: 700,
                  fontSize: "12px",
                  letterSpacing: "0.06em",
                  fontFamily: "var(--font-montserrat), system-ui, sans-serif",
                  transition: "background-color 1.5s ease, border-color 1.5s ease, color 1.5s ease",
                }}
              >
                WAITING
              </button>
            </div>
          </Section>

          {/* ─── Kilde (fysisk lydenhet) ─── */}
          <Section label={t.sectionKilde}>
            <select
              value={selectedDevice}
              onChange={e => setSelectedDevice(e.target.value)}
              disabled={isLive || status === "connecting"}
              style={{ ...inputStyle, appearance: "none", cursor: "pointer" }}
              onFocus={e => { e.currentTarget.style.borderColor = "#33D3C4"; }}
              onBlur={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)"; }}
            >
              {devices.length === 0
                ? <option value="">{t.noMicFound}</option>
                : devices.map(d => (
                    <option key={d.deviceId} value={d.deviceId}>
                      {d.label || `${t.micFallback} ${d.deviceId.slice(0, 8)}`}
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
                    border: eqPreset === p ? "1.5px solid #33D3C4" : "1px solid rgba(255,255,255,0.12)",
                    backgroundColor: eqPreset === p ? "rgba(51,211,196,0.1)" : "rgba(255,255,255,0.04)",
                    color: eqPreset === p ? "#33D3C4" : "rgba(255,255,255,0.5)",
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
          <Section label={t.sectionLydniva}>
            <div style={{ height: "12px", backgroundColor: "rgba(255,255,255,0.06)", borderRadius: "6px", overflow: "hidden", position: "relative" }}>
              <div style={{
                height: "100%",
                width: `${audioLevel}%`,
                background: audioLevel > 80
                  ? "linear-gradient(90deg, #33D3C4, #FF6B4A)"
                  : "linear-gradient(90deg, #33D3C4, #1bbda8)",
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
            disabled={status === "connecting" || (!isLive && !passordVerifisert)}
            style={{
              width: "100%",
              padding: "18px",
              borderRadius: "10px",
              fontSize: "17px",
              fontWeight: 700,
              fontFamily: "var(--font-montserrat), system-ui, sans-serif",
              letterSpacing: "0.04em",
              cursor: (status === "connecting" || (!isLive && !passordVerifisert)) ? "not-allowed" : "pointer",
              transition: "all 0.2s",
              marginBottom: "20px",
              ...(isLive
                ? { backgroundColor: "#D94F4F", color: "#ffffff", border: "none", boxShadow: "0 0 32px rgba(217,79,79,0.4)" }
                : status === "connecting"
                  ? { backgroundColor: "rgba(51,211,196,0.2)", color: "#33D3C4", border: "none", opacity: 0.7 }
                  : !passordVerifisert
                    ? { backgroundColor: "#FF6B4A", color: "#ffffff", border: "none", opacity: 0.4 }
                    : { backgroundColor: "#FF6B4A", color: "#ffffff", border: "none", boxShadow: "0 0 32px rgba(255,107,74,0.35)" }
              ),
            }}
          >
            {status === "connecting" ? t.connecting : isLive ? t.stopSending : t.startSending}
          </button>

          {/* ─── Live stats ─── */}
          {isLive && (
            <div style={statsRowStyle}>
              <div style={statBoxStyle}>
                <div style={{ fontFamily: "var(--font-ibm-plex-mono), monospace", fontSize: "28px", color: "#33D3C4", fontWeight: 500 }}>
                  {listenerCount}
                </div>
                <div style={statLabelStyle}>{t.listenersNow}</div>
              </div>
              <div style={statBoxStyle}>
                <div style={{ fontFamily: "var(--font-ibm-plex-mono), monospace", fontSize: "28px", color: "#33D3C4", fontWeight: 500 }}>
                  {eqPreset}
                </div>
                <div style={statLabelStyle}>EQ preset</div>
              </div>
              <div style={statBoxStyle}>
                <div style={{ fontFamily: "var(--font-ibm-plex-mono), monospace", fontSize: "28px", color: "#33D3C4", fontWeight: 500 }}>
                  {t.delayValue}
                </div>
                <div style={statLabelStyle}>{t.delayLabel}</div>
              </div>
            </div>
          )}

          {/* Server config note */}
          {!isLive && status === "idle" && (
            <p style={{ color: "rgba(255,255,255,0.2)", fontSize: "12px", textAlign: "center", fontFamily: "var(--font-ibm-plex-mono), monospace", marginTop: "4px" }}>
              {t.serverNote} ({ANT_MEDIA_HOST})
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── STATUS PILL ─── */

function StatusPill({ status, t }: { status: ConnectionStatus; t: Cast }) {
  const cfg = {
    idle:       { label: t.statusIdle,       color: "rgba(255,255,255,0.25)", dot: "rgba(255,255,255,0.3)" },
    connecting: { label: t.statusConnecting, color: "#33D3C4",               dot: "#33D3C4" },
    live:       { label: t.statusLive,       color: "#FF6B4A",                dot: "#FF6B4A" },
    error:      { label: t.statusError,      color: "#D94F4F",                dot: "#D94F4F" },
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
      <span style={{ color: cfg.color, fontSize: "12px", fontWeight: 700, fontFamily: "var(--font-ibm-plex-mono), monospace", letterSpacing: "0.08em" }}>
        {cfg.label}
      </span>
    </div>
  );
}

/* ─── SECTION WRAPPER ─── */

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: "24px" }}>
      <div style={{ fontFamily: "var(--font-ibm-plex-mono), monospace", fontSize: "11px", letterSpacing: "0.12em", color: "rgba(255,255,255,0.3)", marginBottom: "10px" }}>
        {label}
      </div>
      {children}
    </div>
  );
}

/* ─── STYLES ─── */

const pageStyle: React.CSSProperties = {
  backgroundColor: "#073E46",
  minHeight: "100vh",
  color: "#ffffff",
  fontFamily: "var(--font-inter), system-ui, sans-serif",
};

const headerStyle: React.CSSProperties = {
  borderBottom: "1px solid rgba(51,211,196,0.1)",
  backgroundColor: "rgba(7,62,70,0.95)",
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
  fontFamily: "var(--font-ibm-plex-mono), monospace",
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
  border: "1px solid rgba(51,211,196,0.12)",
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
  fontFamily: "var(--font-ibm-plex-mono), monospace",
  fontSize: "10px",
  color: "rgba(255,255,255,0.2)",
};

const statsRowStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(3, 1fr)",
  gap: "12px",
};

const statBoxStyle: React.CSSProperties = {
  backgroundColor: "rgba(51,211,196,0.05)",
  border: "1px solid rgba(51,211,196,0.12)",
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
  fontFamily: "var(--font-ibm-plex-mono), monospace",
};
