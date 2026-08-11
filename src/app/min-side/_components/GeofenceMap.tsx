"use client";

import { useEffect, useRef, useState } from "react";

export type LatLng = { lat: number; lng: number };

export default function GeofenceMap({
  lat,
  lng,
  initialPoints,
  onChange,
}: {
  lat: number;
  lng: number;
  initialPoints: LatLng[];
  onChange: (points: LatLng[]) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<unknown>(null);
  const polygonRef = useRef<unknown>(null);
  const markersLayerRef = useRef<unknown>(null);
  const [points, setPoints] = useState<LatLng[]>(initialPoints);
  const pointsRef = useRef<LatLng[]>(initialPoints);
  const LRef = useRef<typeof import("leaflet") | null>(null);

  useEffect(() => {
    pointsRef.current = points;
    onChange(points);
  }, [points, onChange]);

  function redraw() {
    const L = LRef.current;
    const map = mapRef.current as import("leaflet").Map | null;
    if (!L || !map) return;

    if (polygonRef.current) (polygonRef.current as import("leaflet").Polygon).remove();
    if (markersLayerRef.current) (markersLayerRef.current as import("leaflet").LayerGroup).remove();

    const latlngs = pointsRef.current.map((p) => [p.lat, p.lng]) as [number, number][];
    if (latlngs.length >= 3) {
      const polygon = L.polygon(latlngs, {
        color: "#33D3C4",
        fillColor: "#33D3C4",
        fillOpacity: 0.15,
        weight: 2,
      }).addTo(map);
      polygonRef.current = polygon;
    }

    const layerGroup = L.layerGroup().addTo(map);
    pointsRef.current.forEach((p, i) => {
      const icon = L.divIcon({
        html: `<div style="width:12px;height:12px;background:#073E46;border:2px solid #33D3C4;border-radius:50%;"></div>`,
        className: "",
        iconSize: [12, 12],
        iconAnchor: [6, 6],
      });
      const marker = L.marker([p.lat, p.lng], { icon, draggable: true }).addTo(layerGroup);
      marker.on("drag", (e) => {
        const pos = (e.target as import("leaflet").Marker).getLatLng();
        const next = [...pointsRef.current];
        next[i] = { lat: pos.lat, lng: pos.lng };
        pointsRef.current = next;
        redrawPolygonOnly();
      });
      marker.on("dragend", () => {
        setPoints([...pointsRef.current]);
      });
    });
    markersLayerRef.current = layerGroup;
  }

  function redrawPolygonOnly() {
    const L = LRef.current;
    const map = mapRef.current as import("leaflet").Map | null;
    if (!L || !map) return;
    if (polygonRef.current) (polygonRef.current as import("leaflet").Polygon).remove();
    const latlngs = pointsRef.current.map((p) => [p.lat, p.lng]) as [number, number][];
    if (latlngs.length >= 3) {
      polygonRef.current = L.polygon(latlngs, {
        color: "#33D3C4",
        fillColor: "#33D3C4",
        fillOpacity: 0.15,
        weight: 2,
      }).addTo(map);
    }
  }

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    import("leaflet").then((L) => {
      if (!containerRef.current || mapRef.current) return;
      LRef.current = L;

      const map = L.map(containerRef.current).setView([lat, lng], 16);
      mapRef.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors",
        maxZoom: 19,
      }).addTo(map);

      map.on("click", (e: import("leaflet").LeafletMouseEvent) => {
        const next = [...pointsRef.current, { lat: e.latlng.lat, lng: e.latlng.lng }];
        pointsRef.current = next;
        setPoints(next);
      });

      redraw();
    });

    return () => {
      if (mapRef.current) {
        (mapRef.current as import("leaflet").Map).remove();
        mapRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lat, lng]);

  useEffect(() => {
    redraw();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [points]);

  function removeLastPoint() {
    setPoints((prev) => prev.slice(0, -1));
  }

  function clearAll() {
    setPoints([]);
  }

  return (
    <div>
      {/* eslint-disable-next-line @next/next/no-css-tags */}
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <div ref={containerRef} style={{ width: "100%", height: "360px", borderRadius: "10px", zIndex: 0 }} />
      <div style={{ display: "flex", gap: "8px", marginTop: "12px", flexWrap: "wrap" as const }}>
        <button
          type="button"
          onClick={removeLastPoint}
          style={{ backgroundColor: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "8px", padding: "8px 14px", color: "rgba(255,255,255,0.6)", fontSize: "13px", cursor: "pointer" }}
        >
          Fjern siste punkt
        </button>
        <button
          type="button"
          onClick={clearAll}
          style={{ backgroundColor: "rgba(255,107,74,0.1)", border: "1px solid rgba(255,107,74,0.3)", borderRadius: "8px", padding: "8px 14px", color: "#D94F4F", fontSize: "13px", cursor: "pointer" }}
        >
          Nullstill
        </button>
        <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.35)", alignSelf: "center", fontFamily: "var(--font-ibm-plex-mono), monospace" }}>
          {points.length} punkt{points.length !== 1 ? "er" : ""} — klikk i kartet for å legge til
        </span>
      </div>
    </div>
  );
}
