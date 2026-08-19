"use client";

import { useEffect, useRef } from "react";
import { useCaregiverStore } from "@/store/caregiverStore";
import { useAuthStore } from "@/store/authStore";
import { MapPin } from "lucide-react";

export function LiveLocationMap() {
  const { selectedUserId, liveLocations, updateLocation } = useCaregiverStore();
  const { accessToken } = useAuthStore();
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!accessToken) return;

    const ws = new WebSocket(`${process.env.NEXT_PUBLIC_WS_URL}?token=${accessToken}`);
    wsRef.current = ws;

    ws.onopen = () => {
      if (selectedUserId) {
        ws.send(JSON.stringify({ type: "WATCH_USER", userId: selectedUserId }));
      }
    };

    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data);
      if (msg.type === "LOCATION_UPDATE" && selectedUserId) {
        updateLocation(selectedUserId, { lat: msg.lat, lng: msg.lng, timestamp: msg.timestamp });
      }
    };

    return () => ws.close();
  }, [accessToken, selectedUserId]);

  // Re-subscribe when selected user changes
  useEffect(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN && selectedUserId) {
      wsRef.current.send(JSON.stringify({ type: "WATCH_USER", userId: selectedUserId }));
    }
  }, [selectedUserId]);

  const location = selectedUserId ? liveLocations[selectedUserId] : null;

  return (
    <section className="card" aria-labelledby="map-heading">
      <h2 id="map-heading" className="font-semibold mb-4 flex items-center gap-2">
        <MapPin className="h-5 w-5 text-brand-500" aria-hidden="true" />
        Live Location
      </h2>

      {!selectedUserId ? (
        <div className="h-64 flex items-center justify-center text-muted-foreground text-sm rounded-xl bg-surface">
          Select a user to view their live location
        </div>
      ) : !location ? (
        <div className="h-64 flex items-center justify-center text-muted-foreground text-sm rounded-xl bg-surface" aria-live="polite">
          Waiting for location update...
        </div>
      ) : (
        <div className="space-y-3">
          <div className="h-64 rounded-xl overflow-hidden bg-surface border" aria-label={`Map showing location at ${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`}>
            <iframe
              title="User live location map"
              width="100%"
              height="100%"
              src={`https://www.openstreetmap.org/export/embed.html?bbox=${location.lng - 0.005},${location.lat - 0.005},${location.lng + 0.005},${location.lat + 0.005}&layer=mapnik&marker=${location.lat},${location.lng}`}
              loading="lazy"
            />
          </div>
          <p className="text-xs text-muted-foreground" aria-live="polite">
            Last updated: {new Date(location.timestamp).toLocaleTimeString()} ·
            Coordinates: {location.lat.toFixed(5)}, {location.lng.toFixed(5)}
          </p>
        </div>
      )}
    </section>
  );
}
