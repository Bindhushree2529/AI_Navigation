"use client";

import { useEffect, useState } from "react";
import { Wifi, WifiOff, Battery, BatteryLow, Globe, MapPin, Cloud, CloudOff } from "lucide-react";

interface StatusState {
  online: boolean;
  gps: boolean;
  language: string;
  weatherAvailable: boolean;
  aiEngine: boolean;
}

export function SystemStatusBar() {
  const [status, setStatus] = useState<StatusState>({
    online: true,
    gps: false,
    language: "EN",
    weatherAvailable: false,
    aiEngine: false,
  });

  useEffect(() => {
    // Connectivity
    const updateOnline = () => setStatus((s) => ({ ...s, online: navigator.onLine }));
    window.addEventListener("online", updateOnline);
    window.addEventListener("offline", updateOnline);
    updateOnline();

    // GPS
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        () => setStatus((s) => ({ ...s, gps: true, weatherAvailable: true })),
        () => setStatus((s) => ({ ...s, gps: false }))
      );
    }

    // AI engine health
    const AI_URL = process.env.NEXT_PUBLIC_AI_ENGINE_URL ?? "http://localhost:8001";
    fetch(`${AI_URL}/health`, { signal: AbortSignal.timeout(3000) })
      .then((r) => r.ok && setStatus((s) => ({ ...s, aiEngine: true })))
      .catch(() => {});

    // Language from localStorage settings
    try {
      const raw = localStorage.getItem("naviassist-settings");
      if (raw) {
        const { state } = JSON.parse(raw);
        const lang = state?.voiceLanguage ?? "en-US";
        setStatus((s) => ({ ...s, language: lang.split("-")[0].toUpperCase() }));
      }
    } catch {}

    return () => {
      window.removeEventListener("online", updateOnline);
      window.removeEventListener("offline", updateOnline);
    };
  }, []);

  const items = [
    {
      icon: status.online ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />,
      label: status.online ? "ONLINE" : "OFFLINE",
      ok: status.online,
    },
    {
      icon: <MapPin className="h-3 w-3" />,
      label: status.gps ? "GPS" : "NO GPS",
      ok: status.gps,
    },
    {
      icon: status.weatherAvailable ? <Cloud className="h-3 w-3" /> : <CloudOff className="h-3 w-3" />,
      label: status.weatherAvailable ? "WEATHER" : "NO WEATHER",
      ok: status.weatherAvailable,
    },
    {
      icon: <Globe className="h-3 w-3" />,
      label: status.language,
      ok: true,
    },
    {
      icon: <Battery className="h-3 w-3" />,
      label: status.aiEngine ? "AI: ON" : "AI: OFF",
      ok: status.aiEngine,
    },
  ];

  return (
    <div
      className="flex items-center gap-2 px-3 py-1.5 bg-surface border-b text-xs flex-wrap"
      role="status"
      aria-label="System status"
    >
      {items.map((item, i) => (
        <span
          key={i}
          className={`flex items-center gap-1 font-medium ${
            item.ok ? "text-green-600 dark:text-green-400" : "text-red-500 dark:text-red-400"
          }`}
        >
          {item.icon}
          {item.label}
        </span>
      ))}
    </div>
  );
}
