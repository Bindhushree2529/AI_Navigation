"use client";

import { useState } from "react";
import { useAuthStore } from "@/store/authStore";
import { api } from "@/services/api";
import { speak } from "@/utils/speak";
import { setLanguage, type AppLanguage } from "@/utils/speak";
import { Loader2, Save } from "lucide-react";

const LANGUAGES: { value: string; label: string }[] = [
  { value: "en-IN", label: "English (India)" },
  { value: "en-US", label: "English (US)" },
  { value: "kn-IN", label: "ಕನ್ನಡ — Kannada" },
  { value: "hi-IN", label: "हिन्दी — Hindi" },
  { value: "te-IN", label: "తెలుగు — Telugu" },
  { value: "ta-IN", label: "தமிழ் — Tamil" },
  { value: "ml-IN", label: "മലയാളം — Malayalam" },
  { value: "bn-IN", label: "বাংলা — Bengali" },
];

export default function SettingsPage() {
  const { user } = useAuthStore();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [settings, setSettings] = useState({
    voiceLanguage: "en-IN",
    voiceSpeed: 1.0,
    voiceType: "female",
    hapticIntensity: 2,
    highContrast: false,
    largeTouchTarget: true,
    offlineMode: false,
    darkMode: false,
    announceCadence: 3,
    batteryMode: "normal",
    preferAccessible: true,
  });

  function update(key: string, value: any) {
    setSettings(s => ({ ...s, [key]: value }));
    setSaved(false);
    if (key === "voiceLanguage") {
      setLanguage(value as AppLanguage);
      speak("Language changed.", value);
    }
  }

  async function save() {
    setSaving(true);
    try {
      await api.patch("/users/settings", settings);
      setSaved(true);
      speak("Settings saved.", settings.voiceLanguage);
    } catch {}
    finally { setSaving(false); }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground mt-1">Customize your NaviAssist experience</p>
      </div>

      {/* Voice */}
      <div className="card space-y-5">
        <h2 className="font-semibold">🎤 Voice & Language</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Language</label>
            <select value={settings.voiceLanguage} onChange={e => update("voiceLanguage", e.target.value)}
              className="w-full rounded-xl border px-4 py-3 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-brand-500">
              {LANGUAGES.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Speed: {settings.voiceSpeed}x</label>
            <input type="range" min="0.5" max="2" step="0.1" value={settings.voiceSpeed}
              onChange={e => update("voiceSpeed", parseFloat(e.target.value))} className="w-full accent-brand-600" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Voice Type</label>
            <div className="flex gap-3">
              {["female", "male"].map(t => (
                <label key={t} className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" value={t} checked={settings.voiceType === t} onChange={() => update("voiceType", t)} className="accent-brand-600" />
                  <span className="text-sm capitalize">{t}</span>
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Announce every {settings.announceCadence}s</label>
            <input type="range" min="1" max="10" step="1" value={settings.announceCadence}
              onChange={e => update("announceCadence", parseInt(e.target.value))} className="w-full accent-brand-600" />
          </div>
        </div>
      </div>

      {/* Battery */}
      <div className="card space-y-4">
        <h2 className="font-semibold">🔋 Battery Mode</h2>
        <div className="grid grid-cols-3 gap-2">
          {[
            { value: "normal", label: "Normal", desc: "Full AI features" },
            { value: "saver", label: "Saver", desc: "Reduced processing" },
            { value: "critical", label: "Critical", desc: "Emergency only" },
          ].map(m => (
            <button key={m.value} onClick={() => update("batteryMode", m.value)}
              className={`rounded-xl border p-3 text-left transition-colors ${settings.batteryMode === m.value ? "border-brand-600 bg-brand-50 dark:bg-brand-950/30" : "hover:bg-surface"}`}>
              <p className="text-sm font-semibold capitalize">{m.label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{m.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Accessibility */}
      <div className="card space-y-4">
        <h2 className="font-semibold">♿ Accessibility</h2>
        {[
          { key: "highContrast", label: "High Contrast Mode" },
          { key: "largeTouchTarget", label: "Large Touch Targets" },
          { key: "offlineMode", label: "Offline / Basic Mode" },
          { key: "darkMode", label: "Dark Mode" },
          { key: "preferAccessible", label: "Prefer Accessible Routes (elevator over stairs)" },
        ].map(({ key, label }) => (
          <div key={key} className="flex items-center justify-between">
            <span className="text-sm font-medium">{label}</span>
            <button onClick={() => update(key, !(settings as any)[key])}
              className={`relative w-12 h-6 rounded-full transition-colors ${(settings as any)[key] ? "bg-brand-600" : "bg-gray-300 dark:bg-gray-600"}`}
              role="switch" aria-checked={(settings as any)[key]}>
              <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${(settings as any)[key] ? "translate-x-7" : "translate-x-1"}`} />
            </button>
          </div>
        ))}
        <div>
          <label className="block text-sm font-medium mb-1">Haptic Intensity: {settings.hapticIntensity}</label>
          <input type="range" min="0" max="3" step="1" value={settings.hapticIntensity}
            onChange={e => update("hapticIntensity", parseInt(e.target.value))} className="w-full accent-brand-600" />
        </div>
      </div>

      <button onClick={save} disabled={saving} className="btn-primary w-full">
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        {saving ? "Saving..." : saved ? "Saved ✓" : "Save Settings"}
      </button>
    </div>
  );
}
