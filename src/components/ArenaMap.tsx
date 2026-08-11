"use client";

import { useEffect, useRef } from "react";

export default function ArenaMap({
  lat,
  lng,
  name,
  radius = 300,
  zoom = 16,
  onMarkerMove,
  resetTrigger,
}: {
  lat: number;
  lng: number;
  name: string;
  radius?: number;
  zoom?: number;
  onMarkerMove?: (lat: number, lng: number) => void;
  resetTrigger?: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef    = useRef<unknown>(null);
  const circleRef = useRef<unknown>(null);
  const markerRef = useRef<unknown>(null);
  const radiusRef = useRef(radius);
  useEffect(() => { radiusRef.current = radius; }, [radius]);

  // Initialize map once — does NOT re-run when radius changes
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    import("leaflet").then((L) => {
      if (!containerRef.current || mapRef.current) return;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      const map = L.map(containerRef.current!).setView([lat, lng], zoom);
      mapRef.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors",
        maxZoom: 19,
      }).addTo(map);

      const icon = L.divIcon({
        html: `<div style="width:14px;height:14px;background:#33D3C4;border:2.5px solid #073E46;border-radius:50%;box-shadow:0 0 10px rgba(51,211,196,0.7);cursor:grab;"></div>`,
        className: "",
        iconSize: [14, 14],
        iconAnchor: [7, 7],
        popupAnchor: [0, -10],
      });

      const marker = L.marker([lat, lng], { icon, draggable: true })
        .addTo(map)
        .bindPopup(
          `<div style="font-family:var(--font-inter),system-ui,sans-serif;font-weight:600;color:#073E46;font-size:13px;white-space:nowrap;">${name}</div>` +
          `<div style="font-family:var(--font-inter),system-ui,sans-serif;color:#2C2C2C;font-size:11px;margin-top:2px;">Klikk i kartet eller dra markøren for å flytte midtpunktet</div>`
        )
        .openPopup();
      markerRef.current = marker;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      marker.on("drag", () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const pos = (marker as any).getLatLng();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if (circleRef.current) (circleRef.current as any).setLatLng(pos);
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      marker.on("dragend", () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const pos = (marker as any).getLatLng();
        onMarkerMove?.(pos.lat, pos.lng);
      });

      // Clicking anywhere on the map moves the marker there — easier than
      // dragging the small marker handle precisely.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      map.on("click", (e: any) => {
        const { lat: clickLat, lng: clickLng } = e.latlng;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (marker as any).setLatLng([clickLat, clickLng]);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if (circleRef.current) (circleRef.current as any).setLatLng([clickLat, clickLng]);
        onMarkerMove?.(clickLat, clickLng);
      });

      const circle = L.circle([lat, lng], {
        radius: radiusRef.current,
        color: "#33D3C4",
        fillColor: "#33D3C4",
        fillOpacity: 0.1,
        weight: 2,
        dashArray: "6 4",
      }).addTo(map);
      circleRef.current = circle;
    });

    return () => {
      if (mapRef.current) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (mapRef.current as any).remove();
        mapRef.current = null;
        circleRef.current = null;
        markerRef.current = null;
      }
    };
  }, [lat, lng, name, zoom]); // radius intentionally omitted — handled below

  // Update only the circle when radius changes, without remounting the map
  useEffect(() => {
    if (circleRef.current) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (circleRef.current as any).setRadius(radius);
    }
  }, [radius]);

  // Snap marker and circle back to saved lat/lng when resetTrigger bumps
  useEffect(() => {
    if (!resetTrigger) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (markerRef.current) (markerRef.current as any).setLatLng([lat, lng]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (circleRef.current) (circleRef.current as any).setLatLng([lat, lng]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetTrigger]);

  return (
    <>
      {/* eslint-disable-next-line @next/next/no-css-tags */}
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <div ref={containerRef} style={{ width: "100%", height: "100%", borderRadius: "10px", zIndex: 0 }} />
    </>
  );
}
