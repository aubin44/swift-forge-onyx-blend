import { useEffect, useRef, useState } from "react";
import type { Map as LeafletMap, Marker } from "leaflet";
import "leaflet/dist/leaflet.css";

interface FieldMapProps {
  lat: number | null;
  lng: number | null;
  onPick: (lat: number, lng: number) => void;
}

const FRIBOURG = { lat: 46.8, lng: 7.16 };

export function FieldMap({ lat, lng, onPick }: FieldMapProps) {
  const host = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markerRef = useRef<Marker | null>(null);
  const onPickRef = useRef(onPick);
  const initial = useRef({ lat, lng });
  onPickRef.current = onPick;
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const node = host.current;
    if (!node) return;
    let cancelled = false;
    let map: LeafletMap | null = null;

    (async () => {
      const leaflet = await import("leaflet");
      if (cancelled || !host.current) return;
      const L = leaflet.default ?? leaflet;
      const start = initial.current;
      const hasPoint = start.lat != null && start.lng != null;
      map = L.map(host.current, { zoomControl: false, attributionControl: true });
      L.control.zoom({ position: "topright" }).addTo(map);
      L.tileLayer(
        "https://wmts.geo.admin.ch/1.0.0/ch.swisstopo.pixelkarte-farbe/default/current/3857/{z}/{x}/{y}.jpeg",
        { attribution: "© swisstopo", maxZoom: 19, minZoom: 8 },
      ).addTo(map);
      map.setView(hasPoint ? [start.lat as number, start.lng as number] : [FRIBOURG.lat, FRIBOURG.lng], hasPoint ? 15 : 9);
      map.on("click", (event) => {
        onPickRef.current(event.latlng.lat, event.latlng.lng);
      });
      mapRef.current = map;
      window.setTimeout(() => map?.invalidateSize(), 200);
      if (!cancelled) setReady(true);
    })();

    return () => {
      cancelled = true;
      map?.remove();
      mapRef.current = null;
      markerRef.current = null;
      setReady(false);
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map || lat == null || lng == null) return;
    let cancelled = false;
    (async () => {
      const leaflet = await import("leaflet");
      if (cancelled || !mapRef.current) return;
      const L = leaflet.default ?? leaflet;
      const icon = L.divIcon({
        className: "alea-pin",
        html: "<span></span>",
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });
      if (!markerRef.current) {
        markerRef.current = L.marker([lat, lng], { icon, draggable: true }).addTo(map);
        markerRef.current.on("dragend", () => {
          const point = markerRef.current?.getLatLng();
          if (point) onPickRef.current(point.lat, point.lng);
        });
      } else {
        markerRef.current.setLatLng([lat, lng]);
      }
      const zoom = map.getZoom() < 14 ? 15 : map.getZoom();
      map.setView([lat, lng], zoom, { animate: false });
    })();
    return () => {
      cancelled = true;
    };
  }, [ready, lat, lng]);

  return <div ref={host} className="h-72 w-full overflow-hidden rounded-xl border border-line" />;
}
