"use client";

import { useEffect, useRef } from "react";

export default function ArenaMap({
  lat,
  lng,
  name,
  radius = 300,
}: {
  lat: number;
  lng: number;
  name: string;
  radius?: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<unknown>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    // Dynamic import so Leaflet never runs on the server
    import("leaflet").then((L) => {
      if (!containerRef.current || mapRef.current) return;

      // Fix broken default icon URLs in bundled environments
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      const map = L.map(containerRef.current!).setView([lat, lng], 16);
      mapRef.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors",
        maxZoom: 19,
      }).addTo(map);

      // Custom turquoise pin
      const icon = L.divIcon({
        html: `<div style="width:14px;height:14px;background:#21D4BD;border:2.5px solid #052630;border-radius:50%;box-shadow:0 0 10px rgba(33,212,189,0.7);"></div>`,
        className: "",
        iconSize: [14, 14],
        iconAnchor: [7, 7],
        popupAnchor: [0, -10],
      });

      L.marker([lat, lng], { icon })
        .addTo(map)
        .bindPopup(
          `<div style="font-family:Arial,sans-serif;font-weight:700;color:#052630;font-size:13px;white-space:nowrap;">${name}</div>` +
          `<div style="color:#666;font-size:11px;margin-top:2px;">Geofence: ${radius}m radius</div>`
        )
        .openPopup();

      L.circle([lat, lng], {
        radius,
        color: "#21D4BD",
        fillColor: "#21D4BD",
        fillOpacity: 0.1,
        weight: 2,
        dashArray: "6 4",
      }).addTo(map);
    });

    return () => {
      if (mapRef.current) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (mapRef.current as any).remove();
        mapRef.current = null;
      }
    };
  }, [lat, lng, name, radius]);

  return (
    <>
      {/* eslint-disable-next-line @next/next/no-css-tags */}
      <link
        rel="stylesheet"
        href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
      />
      <div ref={containerRef} style={{ width: "100%", height: "100%", borderRadius: "10px", zIndex: 0 }} />
    </>
  );
}
