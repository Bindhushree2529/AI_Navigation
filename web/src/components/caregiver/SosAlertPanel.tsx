"use client";

import { useEffect, useRef, useState } from "react";
import { useAuthStore } from "@/store/authStore";
import { useCaregiverStore } from "@/store/caregiverStore";
import { AlertTriangle, CheckCircle } from "lucide-react";
import { format } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/services/api";

interface SosAlert {
  id: string;
  userId: string;
  userName: string;
  location: { lat: number; lng: number };
  createdAt: string;
  status: string;
}

export function SosAlertPanel() {
  const { selectedUserId } = useCaregiverStore();
  const { accessToken } = useAuthStore();
  const [liveAlerts, setLiveAlerts] = useState<SosAlert[]>([]);

  const { data: history = [] } = useQuery({
    queryKey: ["caregiver-sos", selectedUserId],
    queryFn: () =>
      selectedUserId
        ? api.get(`/caregiver/users/${selectedUserId}/sos`).then((r) => r.data)
        : [],
    enabled: !!selectedUserId,
  });

  useEffect(() => {
    if (!accessToken) return;
    const ws = new WebSocket(`${process.env.NEXT_PUBLIC_WS_URL}?token=${accessToken}`);

    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data);
      if (msg.type === "SOS_ALERT") {
        setLiveAlerts((prev) => [{ ...msg.sos, userName: msg.user?.name }, ...prev]);
        if (Notification.permission === "granted") {
          new Notification(`🚨 SOS from ${msg.user?.name}`, { body: "Tap to view location" });
        }
      }
    };

    return () => ws.close();
  }, [accessToken]);

  const allAlerts = [...liveAlerts, ...history].slice(0, 10);

  return (
    <section className="card" aria-labelledby="sos-panel-heading" aria-live="polite">
      <h2 id="sos-panel-heading" className="font-semibold mb-4 flex items-center gap-2">
        <AlertTriangle className="h-5 w-5 text-red-500" aria-hidden="true" />
        SOS Alerts
        {liveAlerts.length > 0 && (
          <span
            className="ml-auto rounded-full bg-red-500 text-white text-xs font-bold px-2 py-0.5 animate-pulse"
            aria-label={`${liveAlerts.length} new SOS alerts`}
          >
            {liveAlerts.length} NEW
          </span>
        )}
      </h2>

      {allAlerts.length === 0 ? (
        <div className="flex items-center gap-2 text-sm text-green-600 py-4">
          <CheckCircle className="h-5 w-5" aria-hidden="true" />
          No SOS alerts. All clear.
        </div>
      ) : (
        <ul className="space-y-2" role="list">
          {allAlerts.map((alert: any) => (
            <li
              key={alert.id}
              className={`flex items-center justify-between rounded-xl border p-3 ${
                alert.status === "ACTIVE"
                  ? "border-red-300 bg-red-50 dark:bg-red-950/30"
                  : "border-border"
              }`}
            >
              <div>
                <p className="font-medium text-sm">{alert.userName || "User"}</p>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(alert.createdAt), "MMM d, HH:mm:ss")}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`text-xs rounded-full px-2 py-0.5 ${
                    alert.status === "ACTIVE"
                      ? "bg-red-100 text-red-700"
                      : "bg-green-100 text-green-700"
                  }`}
                >
                  {alert.status}
                </span>
                {alert.location && (
                  <a
                    href={`https://maps.google.com/?q=${alert.location.lat},${alert.location.lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-brand-600 hover:underline"
                    aria-label="View location on map"
                  >
                    Map
                  </a>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
