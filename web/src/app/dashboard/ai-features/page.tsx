"use client";

import { useState, useRef, useEffect } from "react";
import { api } from "@/services/api";
import { speak } from "@/utils/speak";
import { setLanguage, type AppLanguage } from "@/utils/speak";
import { Upload, Loader2, Mic, ArrowLeft, Wifi, WifiOff } from "lucide-react";
import Link from "next/link";

type Tab = "traffic" | "indoor" | "weather" | "battery" | "language";

const TABS: { id: Tab; label: string }[] = [
  { id: "traffic",  label: "🚦 Traffic & Road Safety" },
  { id: "indoor",   label: "🏢 Indoor Navigation" },
  { id: "weather",  label: "🌤 Weather" },
  { id: "battery",  label: "🔋 Battery & Connectivity" },
  { id: "language", label: "🌐 Language" },
];

export default function AIFeaturesPage() {
  const [tab, setTab] = useState<Tab>("traffic");

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/user" className="btn-ghost p-2" aria-label="Back">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold">AI Features</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Traffic · Indoor Navigation · Weather · Battery · Language</p>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {TABS.map(({ id, label }) => (
          <button key={id} onClick={() => setTab(id)}
            className={`rounded-xl border px-4 py-2 text-sm font-medium transition-colors ${tab === id ? "border-brand-500 bg-brand-50 dark:bg-brand-950/30 text-brand-600" : "hover:bg-surface"}`}>
            {label}
          </button>
        ))}
      </div>

      {tab === "traffic"  && <TrafficTab />}
      {tab === "indoor"   && <IndoorTab />}
      {tab === "weather"  && <WeatherTab />}
      {tab === "battery"  && <BatteryTab />}
      {tab === "language" && <LanguageTab />}
    </div>
  );
}

// ── Traffic & Road Safety ─────────────────────────────────────────────────────
function TrafficTab() {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function analyze() {
    if (!file) { speak("Please upload an image first."); return; }
    setLoading(true); setResult(null);
    speak("Analyzing road safety. Please wait.");
    try {
      const form = new FormData();
      form.append("file", file, "frame.jpg");
      const res = await api.post("/detections/traffic", form, { headers: { "Content-Type": "multipart/form-data" } });
      setResult(res.data);
      speak(res.data.roadSafety?.primaryAlert ?? "Analysis complete.");
    } catch (e: any) {
      const msg = e.response?.data?.error ?? "AI engine not running. Start it on port 8001.";
      setResult({ error: msg }); speak(msg);
    } finally { setLoading(false); }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Upload a road/street image to detect traffic lights (red/green/yellow via HSV color analysis),
        zebra crossings (HoughLines), vehicles, pedestrians, and stop signs.
      </p>

      <div onClick={() => fileRef.current?.click()}
        className="border-2 border-dashed border-border rounded-2xl p-6 text-center cursor-pointer hover:border-brand-500 transition-colors">
        {preview
          ? <img src={preview} alt="Preview" className="max-h-48 mx-auto rounded-xl object-contain" />
          : <><Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" /><p className="text-sm text-muted-foreground">Upload road/street image</p></>}
        <input ref={fileRef} type="file" accept="image/*" className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) { setFile(f); setPreview(URL.createObjectURL(f)); setResult(null); } }} />
      </div>

      <button onClick={analyze} disabled={loading || !file} className="btn-primary w-full">
        {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Analyzing...</> : "🚦 Analyze Road Safety"}
      </button>

      {result && !result.error && (
        <div className="space-y-3">
          <div className="card bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800">
            <p className="text-xs font-semibold text-yellow-700 dark:text-yellow-400 uppercase mb-1">Primary Alert</p>
            <p className="font-semibold">{result.roadSafety?.primaryAlert}</p>
            {result.roadSafety?.crossingGuidance && (
              <p className="text-sm text-muted-foreground mt-1">{result.roadSafety.crossingGuidance}</p>
            )}
          </div>

          {result.roadSafety?.trafficLightColor && (
            <div className="card flex items-center gap-3">
              <div className={`w-8 h-8 rounded-full ${
                result.roadSafety.trafficLightColor === "red" ? "bg-red-500" :
                result.roadSafety.trafficLightColor === "green" ? "bg-green-500" :
                result.roadSafety.trafficLightColor === "yellow" ? "bg-yellow-400" : "bg-gray-400"
              }`} />
              <p className="text-sm font-semibold capitalize">Traffic Light: {result.roadSafety.trafficLightColor}</p>
            </div>
          )}

          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "Vehicles",       value: result.roadSafety?.vehicleCount ?? 0 },
              { label: "Pedestrians",    value: result.roadSafety?.pedestrianCount ?? 0 },
              { label: "Zebra Crossing", value: result.roadSafety?.zebraCrossing ? "✓" : "✗" },
            ].map(s => (
              <div key={s.label} className="card text-center py-3">
                <p className="text-xl font-bold text-brand-600">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>

          {result.roadSafety?.warnings?.length > 0 && (
            <div className="card space-y-2">
              <p className="text-sm font-semibold">Warnings (priority order)</p>
              {result.roadSafety.warnings.map((w: any, i: number) => (
                <div key={i} className="flex items-start gap-2 text-sm">
                  <span className={`shrink-0 w-2 h-2 rounded-full mt-1.5 ${
                    w.priority === 0 ? "bg-red-500" : w.priority === 1 ? "bg-orange-500" :
                    w.priority === 2 ? "bg-yellow-500" : "bg-blue-400"}`} />
                  <span>{w.message}</span>
                </div>
              ))}
            </div>
          )}

          {result.detections?.length > 0 && (
            <div className="card space-y-1">
              <p className="text-sm font-semibold">Detected Objects</p>
              {result.detections.map((d: any, i: number) => (
                <p key={i} className="text-xs text-muted-foreground">• {d.label} ({Math.round(d.confidence * 100)}%) — {d.spokenText}</p>
              ))}
            </div>
          )}
        </div>
      )}
      {result?.error && <div className="card bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 text-sm">{result.error}</div>}
    </div>
  );
}

// ── Indoor Navigation ─────────────────────────────────────────────────────────
function IndoorTab() {
  const [destination, setDestination] = useState("Room 204");
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [locations, setLocations] = useState<any[]>([]);

  useEffect(() => {
    api.get("/indoor/locations/demo-building").then(r => setLocations(r.data.locations ?? [])).catch(() => {});
  }, []);

  async function findRoute() {
    if (!destination.trim()) return;
    setLoading(true); setResult(null);
    speak(`Finding indoor route to ${destination}.`);
    try {
      const res = await api.post("/indoor/route", { buildingId: "demo-building", destination, preferAccessible: true });
      setResult(res.data);
      speak(`${res.data.summary} First step: ${res.data.steps?.[0]?.instruction}`);
    } catch (e: any) {
      const msg = e.response?.data?.error ?? "Indoor navigation unavailable.";
      setResult({ error: msg }); speak(msg);
    } finally { setLoading(false); }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        A* path planning on a demo building floor map. Accessible routes prefer elevators over stairs.
      </p>
      <div className="card bg-blue-50 dark:bg-blue-900/20 border-blue-200 text-sm text-blue-700 dark:text-blue-300">
        📍 Demo: Main Entrance → Lobby → Elevator → Floor 2 → Room 204
      </div>

      {locations.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {locations.map((l: any) => (
            <button key={l.id} onClick={() => setDestination(l.label)}
              className={`rounded-xl border px-3 py-1.5 text-xs font-medium transition-colors ${destination === l.label ? "border-brand-500 bg-brand-50 text-brand-600" : "hover:bg-surface"}`}>
              {l.label} <span className="text-muted-foreground">(F{l.floor})</span>
            </button>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <input value={destination} onChange={e => setDestination(e.target.value)}
          placeholder="e.g. Room 204, Washroom, Reception"
          className="flex-1 rounded-xl border px-4 py-3 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-brand-500" />
        <button onClick={findRoute} disabled={loading || !destination.trim()} className="btn-primary px-5">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Find"}
        </button>
      </div>

      {result && !result.error && (
        <div className="space-y-3">
          <div className="card">
            <p className="text-sm font-semibold">{result.summary}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Total: {result.totalDistanceM}m</p>
          </div>
          <div className="card divide-y divide-border">
            {result.steps?.map((step: any, i: number) => (
              <div key={i} className="flex items-start gap-3 py-3">
                <span className="shrink-0 w-6 h-6 rounded-full bg-brand-600 text-white text-xs flex items-center justify-center font-bold">{i + 1}</span>
                <div>
                  <p className="text-sm">{step.instruction}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{step.label} · Floor {step.floor} · {step.edgeType}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {result?.error && <div className="card bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 text-sm">{result.error}</div>}
    </div>
  );
}

// ── Weather ───────────────────────────────────────────────────────────────────
function WeatherTab() {
  const [weather, setWeather] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function fetchWeather() {
    setLoading(true); setError(null);
    speak("Getting weather for your location.");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const res = await api.get("/weather/current", { params: { lat: pos.coords.latitude, lng: pos.coords.longitude } });
          setWeather(res.data);
          speak(`${res.data.condition}. Temperature ${res.data.temperatureC} degrees. ${res.data.navigationAdvice}`);
        } catch {
          setError("Weather service unavailable."); speak("Weather service unavailable.");
        } finally { setLoading(false); }
      },
      () => { setError("Location permission denied."); speak("Location permission denied."); setLoading(false); }
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Real weather from Open-Meteo (free, no API key). Uses your GPS location.</p>
      <button onClick={fetchWeather} disabled={loading} className="btn-primary w-full">
        {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Getting weather...</> : "🌤 Get Current Weather"}
      </button>
      {error && <div className="card bg-red-50 dark:bg-red-900/20 text-red-700 text-sm">{error}</div>}
      {weather && (
        <div className="space-y-3">
          <div className="card text-center py-6">
            <p className="text-4xl font-bold">{weather.temperatureC}°C</p>
            <p className="text-lg font-semibold mt-1">{weather.condition}</p>
            <p className="text-sm text-muted-foreground mt-1">Wind: {weather.windSpeedKmh} km/h · Humidity: {weather.humidityPct}%</p>
          </div>
          {weather.alerts?.length > 0 && (
            <div className="card bg-orange-50 dark:bg-orange-900/20 border-orange-200 space-y-1">
              <p className="text-sm font-semibold text-orange-700 dark:text-orange-400">⚠️ Alerts</p>
              {weather.alerts.map((a: string, i: number) => <p key={i} className="text-sm">{a}</p>)}
            </div>
          )}
          <div className="card">
            <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Navigation Advice</p>
            <p className="text-sm">{weather.navigationAdvice}</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Battery & Connectivity ────────────────────────────────────────────────────
function BatteryTab() {
  const [battery, setBattery] = useState<{ level: number; charging: boolean } | null>(null);
  const [online, setOnline] = useState(typeof navigator !== "undefined" ? navigator.onLine : true);

  useEffect(() => {
    const onOnline  = () => setOnline(true);
    const onOffline = () => setOnline(false);
    window.addEventListener("online",  onOnline);
    window.addEventListener("offline", onOffline);
    if ("getBattery" in navigator) {
      (navigator as any).getBattery().then((b: any) => {
        const update = () => setBattery({ level: Math.round(b.level * 100), charging: b.charging });
        update();
        b.addEventListener("levelchange",   update);
        b.addEventListener("chargingchange", update);
      });
    }
    return () => { window.removeEventListener("online", onOnline); window.removeEventListener("offline", onOffline); };
  }, []);

  const mode = battery ? (battery.level <= 10 ? "critical" : battery.level <= 25 ? "saver" : "normal") : "normal";
  const modeColor = mode === "critical" ? "text-red-600" : mode === "saver" ? "text-yellow-600" : "text-green-600";

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Battery mode auto-switches: Normal (above 25%), Saver (10–25%), Critical (below 10%).
        On mobile, voice announcements trigger at 25% and 10%.
      </p>
      <div className="grid grid-cols-2 gap-3">
        <div className="card text-center py-5">
          {battery
            ? <><p className="text-4xl font-bold text-brand-600">{battery.level}%</p>
                <p className="text-sm text-muted-foreground mt-1">{battery.charging ? "⚡ Charging" : "🔋 On battery"}</p></>
            : <p className="text-sm text-muted-foreground pt-2">Battery API not available in this browser</p>}
        </div>
        <div className="card text-center py-5">
          <p className={`text-2xl font-bold capitalize ${modeColor}`}>{mode}</p>
          <p className="text-sm text-muted-foreground mt-1">Battery Mode</p>
        </div>
      </div>
      <div className={`card flex items-center gap-3 ${online ? "border-green-300 bg-green-50 dark:bg-green-900/20" : "border-red-300 bg-red-50 dark:bg-red-900/20"}`}>
        {online ? <Wifi className="h-5 w-5 text-green-600" /> : <WifiOff className="h-5 w-5 text-red-600" />}
        <div>
          <p className={`font-semibold text-sm ${online ? "text-green-700 dark:text-green-400" : "text-red-700 dark:text-red-400"}`}>
            {online ? "Online — Full AI features active" : "Offline — Basic navigation mode active"}
          </p>
          <p className="text-xs text-muted-foreground">{online ? "All cloud AI services available" : "GPS, native TTS, and basic detection still work"}</p>
        </div>
      </div>
      <button onClick={() => {
        const msg = battery
          ? `Battery is at ${battery.level} percent. ${battery.charging ? "Charging." : ""} Mode: ${mode}.`
          : "Battery information not available on this browser.";
        speak(msg);
      }} className="btn-primary w-full">
        <Mic className="h-4 w-4" /> Announce Battery Status
      </button>
    </div>
  );
}

// ── Language ──────────────────────────────────────────────────────────────────
function LanguageTab() {
  const [selected, setSelected] = useState("en-IN");

  const LANGS = [
    { code: "en-IN", label: "English",   sample: "Hello! NaviAssist is ready." },
    { code: "kn-IN", label: "ಕನ್ನಡ",     sample: "ನಮಸ್ಕಾರ! ನ್ಯಾವಿಅಸಿಸ್ಟ್ ಸಿದ್ಧವಾಗಿದೆ." },
    { code: "hi-IN", label: "हिन्दी",    sample: "नमस्ते! NaviAssist तैयार है।" },
    { code: "te-IN", label: "తెలుగు",    sample: "నమస్కారం! NaviAssist సిద్ధంగా ఉంది." },
    { code: "ta-IN", label: "தமிழ்",     sample: "வணக்கம்! NaviAssist தயாராக உள்ளது." },
    { code: "ml-IN", label: "മലയാളം",   sample: "നമസ്കാരം! NaviAssist തയ്യാറാണ്." },
    { code: "bn-IN", label: "বাংলা",     sample: "নমস্কার! NaviAssist প্রস্তুত।" },
  ];

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Groq Whisper auto-detects spoken language. The LLM responds in the same language.
        Kannada TTS requires a Kannada voice installed on your device/browser.
      </p>
      <div className="card bg-blue-50 dark:bg-blue-900/20 border-blue-200 text-sm space-y-1 text-blue-700 dark:text-blue-300">
        <p className="font-semibold">Try saying in Kannada via the voice assistant:</p>
        <p>"ನನ್ನ ಮುಂದೆ ಏನಿದೆ?" — What is in front of me?</p>
        <p>"ಟ್ರಾಫಿಕ್ ಲೈಟ್ ಏನು ಬಣ್ಣ?" — What color is the traffic light?</p>
        <p>"ಹವಾಮಾನ ಹೇಗಿದೆ?" — What is the weather?</p>
        <p>"SOS ಕಳುಹಿಸು" — Send SOS</p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {LANGS.map(lang => (
          <button key={lang.code} onClick={() => { setSelected(lang.code); setLanguage(lang.code as AppLanguage); speak(lang.sample, lang.code); }}
            className={`card text-left p-4 transition-colors hover:border-brand-500 ${selected === lang.code ? "border-brand-500 bg-brand-50 dark:bg-brand-950/30" : ""}`}>
            <p className="font-semibold text-sm">{lang.label}</p>
            <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{lang.sample}</p>
            <p className="text-xs text-brand-600 mt-1">▶ Tap to hear</p>
          </button>
        ))}
      </div>
    </div>
  );
}
