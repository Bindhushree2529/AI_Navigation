"use client";

import { useState, useEffect, useRef } from "react";
import { MapPin, Navigation, Mic, StopCircle, ChevronRight, Loader2, ArrowLeft } from "lucide-react";
import { api } from "@/services/api";
import { speak } from "@/utils/speak";
import { voiceCommandBus } from "@/utils/voiceCommandBus";
import { runFlow } from "@/utils/voiceFlow";
import Link from "next/link";

interface RouteStep {
  instruction: string;
  distanceM: number;
  durationS: number;
  direction: string;
}

interface Route {
  distanceM: number;
  durationS: number;
  summary: string;
  steps: RouteStep[];
}

interface Coords { lat: number; lng: number; }

export default function NavigationPage() {
  const [destination, setDestination] = useState("");
  const [currentCoords, setCurrentCoords] = useState<Coords | null>(null);
  const [currentAddress, setCurrentAddress] = useState("");
  const [route, setRoute] = useState<Route | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [navigating, setNavigating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const watchRef = useRef<number | null>(null);
  const lastAnnouncedStep = useRef(-1);

  // Get GPS on mount + reverse geocode
  useEffect(() => {
    if (!navigator.geolocation) { speak("GPS is not available on this device."); return; }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setCurrentCoords(coords);
        try {
          const { data } = await api.get("/navigation/reverse", { params: coords });
          const addr = data.road
            ? `${data.road}${data.suburb ? ", " + data.suburb : ""}`
            : data.address?.split(",")[0] ?? "Current location";
          setCurrentAddress(addr);
          speak(`Navigation ready. You are on ${addr}. Say navigate to, followed by your destination.`);
        } catch {
          speak("Navigation ready. Say navigate to, followed by your destination.");
        }
      },
      () => speak("Location permission denied. Please allow location access.")
    );
  }, []);

  // Voice commands
  useEffect(() => {
    const unregister = voiceCommandBus.register((cmd, args) => {
      if (cmd === "navigate_to" && args) { setDestination(args); handleRoute(args); return true; }
      if (cmd === "stop_navigation") { stopNavigation(); return true; }
      if (cmd === "next_step") { announceStep(currentStep); return true; }
      if (cmd === "where_am_i") { speak(currentAddress ? `You are on ${currentAddress}.` : "Getting your location."); return true; }
      return false;
    });
    return unregister;
  }, [currentAddress, currentStep, route]);

  // Watch GPS while navigating + push location to backend every 4s
  useEffect(() => {
    if (!navigating) return;
    const interval = setInterval(async () => {
      if (currentCoords) {
        try { await api.post("/navigation/location", currentCoords); } catch {}
      }
    }, 4000);
    watchRef.current = navigator.geolocation.watchPosition(
      (pos) => setCurrentCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {},
      { enableHighAccuracy: true, maximumAge: 3000 }
    );
    return () => {
      clearInterval(interval);
      if (watchRef.current !== null) navigator.geolocation.clearWatch(watchRef.current);
    };
  }, [navigating]);

  function announceStep(index: number) {
    if (!route) return;
    const step = route.steps[index];
    if (!step) return;
    const dist = step.distanceM >= 1000
      ? `${(step.distanceM / 1000).toFixed(1)} kilometers`
      : `${step.distanceM} meters`;
    speak(step.distanceM > 0 ? `${step.instruction}, for ${dist}.` : step.instruction);
  }

  async function handleRoute(dest?: string) {
    const target = (dest ?? destination).trim();
    if (!target) { speak("Please enter a destination."); return; }
    if (!currentCoords) { speak("Waiting for GPS. Please try again."); return; }
    setLoading(true);
    setError(null);
    setRoute(null);
    speak(`Calculating route to ${target}. Please wait.`);
    try {
      const { data } = await api.post("/navigation/route", { from: currentCoords, destination: target });
      setRoute(data);
      setCurrentStep(0);
      lastAnnouncedStep.current = -1;
      speak(`Route found. ${data.summary}. First step: ${data.steps[0]?.instruction}.`);
    } catch (err: any) {
      const msg = err.response?.data?.error ?? "Could not find a route. Try a different destination.";
      setError(msg);
      speak(msg);
    } finally {
      setLoading(false);
    }
  }

  async function startNavigation() {
    if (!route || !currentCoords) return;
    setNavigating(true);
    setCurrentStep(0);
    lastAnnouncedStep.current = -1;
    try {
      const { data } = await api.post("/navigation/sessions", {
        mode: "OUTDOOR", startLocation: currentCoords, destination,
      });
      setSessionId(data.id);
    } catch {}
    speak(`Navigation started. ${route.summary}. First step: ${route.steps[0]?.instruction}.`);
  }

  async function stopNavigation() {
    setNavigating(false);
    if (watchRef.current !== null) navigator.geolocation.clearWatch(watchRef.current);
    if (sessionId && currentCoords) {
      try { await api.patch(`/navigation/sessions/${sessionId}/end`, { endLocation: currentCoords }); } catch {}
    }
    setSessionId(null);
    speak("Navigation stopped.");
  }

  function nextStep() {
    if (!route) return;
    const next = currentStep + 1;
    if (next >= route.steps.length) { speak("You have arrived at your destination."); stopNavigation(); return; }
    setCurrentStep(next);
    lastAnnouncedStep.current = next;
    announceStep(next);
  }

  function prevStep() {
    const prev = Math.max(0, currentStep - 1);
    setCurrentStep(prev);
    announceStep(prev);
  }

  function startVoiceDestination() {
    runFlow([{
      ask: "Where would you like to go? Say the destination name or address.",
      onAnswer: (answer) => { setDestination(answer); handleRoute(answer); },
    }], (role, text) => { if (role === "a") speak(text); });
  }

  const stepProgress = route ? Math.round((currentStep / route.steps.length) * 100) : 0;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-surface px-4 py-4 flex items-center gap-3">
        <Link href="/dashboard/user" className="btn-ghost p-2" aria-label="Back">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex items-center gap-2 font-bold text-lg text-brand-600">
          <Navigation className="h-5 w-5" />
          Navigation
        </div>
        {navigating && (
          <span className="ml-auto text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-2 py-1 rounded-full font-medium animate-pulse">
            ● Live
          </span>
        )}
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-5">

        {/* Current location */}
        <div className="card flex items-center gap-3 py-3">
          <MapPin className="h-5 w-5 text-brand-500 shrink-0" />
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">Your location</p>
            <p className="text-sm font-medium truncate">
              {currentAddress || (currentCoords
                ? `${currentCoords.lat.toFixed(4)}, ${currentCoords.lng.toFixed(4)}`
                : "Getting location...")}
            </p>
          </div>
        </div>

        {/* Destination input */}
        {!navigating && (
          <div className="space-y-3">
            <div className="flex gap-2">
              <input
                value={destination}
                onChange={e => setDestination(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleRoute()}
                placeholder="Enter destination (hospital, park, address…)"
                className="flex-1 rounded-xl border px-4 py-3 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-brand-500"
                aria-label="Destination"
              />
              <button onClick={startVoiceDestination}
                className="rounded-xl border px-3 hover:bg-surface transition-colors"
                aria-label="Speak destination">
                <Mic className="h-5 w-5 text-brand-600" />
              </button>
            </div>
            <button onClick={() => handleRoute()} disabled={loading || !destination.trim() || !currentCoords}
              className="btn-primary w-full touch-target" aria-label="Find route">
              {loading
                ? <><Loader2 className="h-4 w-4 animate-spin" /> Finding route...</>
                : <><Navigation className="h-4 w-4" /> Find Route</>}
            </button>
          </div>
        )}

        {error && (
          <div className="rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-400" role="alert">
            {error}
          </div>
        )}

        {/* Route summary + controls */}
        {route && (
          <div className="space-y-4">
            <div className="card space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-sm truncate">To: {destination}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{route.summary}</p>
                </div>
                {!navigating
                  ? <button onClick={startNavigation} className="btn-primary px-4 py-2 text-sm shrink-0">Start</button>
                  : <button onClick={stopNavigation}
                      className="flex items-center gap-1 rounded-xl bg-red-500 text-white px-4 py-2 text-sm font-semibold shrink-0">
                      <StopCircle className="h-4 w-4" /> Stop
                    </button>}
              </div>
              {navigating && (
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Step {currentStep + 1} of {route.steps.length}</span>
                    <span>{stepProgress}%</span>
                  </div>
                  <div className="h-2 bg-surface rounded-full overflow-hidden">
                    <div className="h-full bg-brand-500 rounded-full transition-all" style={{ width: `${stepProgress}%` }} />
                  </div>
                </div>
              )}
            </div>

            {/* Active step card */}
            {navigating && route.steps[currentStep] && (
              <div className="card bg-brand-50 dark:bg-brand-950/30 border-brand-200 dark:border-brand-800 space-y-3">
                <p className="text-xs font-medium text-brand-600 uppercase tracking-wide">Current step</p>
                <p className="text-lg font-semibold leading-snug">{route.steps[currentStep].instruction}</p>
                <p className="text-sm text-muted-foreground">
                  {route.steps[currentStep].distanceM >= 1000
                    ? `${(route.steps[currentStep].distanceM / 1000).toFixed(1)} km`
                    : `${route.steps[currentStep].distanceM} m`}
                  {" · "}{Math.round(route.steps[currentStep].durationS / 60)} min
                </p>
                <div className="flex gap-2">
                  <button onClick={prevStep} disabled={currentStep === 0}
                    className="flex-1 rounded-xl border py-3 text-sm font-medium disabled:opacity-40 hover:bg-surface transition-colors"
                    aria-label="Previous step">← Prev</button>
                  <button onClick={() => announceStep(currentStep)}
                    className="rounded-xl border px-4 py-3 hover:bg-surface transition-colors"
                    aria-label="Repeat step">
                    <Mic className="h-4 w-4 text-brand-600" />
                  </button>
                  <button onClick={nextStep}
                    className="flex-1 rounded-xl bg-brand-600 text-white py-3 text-sm font-medium hover:bg-brand-700 transition-colors"
                    aria-label="Next step">Next →</button>
                </div>
              </div>
            )}

            {/* Steps list */}
            <div className="card divide-y divide-border">
              <p className="text-sm font-semibold pb-3">All steps</p>
              {route.steps.map((step, i) => (
                <button key={i} onClick={() => { setCurrentStep(i); announceStep(i); }}
                  className={`w-full flex items-start gap-3 py-3 text-left hover:bg-surface transition-colors rounded-lg px-2 ${i === currentStep && navigating ? "bg-brand-50 dark:bg-brand-950/20" : ""}`}
                  aria-label={`Step ${i + 1}: ${step.instruction}`}>
                  <span className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold mt-0.5 ${
                    i < currentStep ? "bg-green-500 text-white" :
                    i === currentStep ? "bg-brand-600 text-white" :
                    "bg-surface border text-muted-foreground"}`}>
                    {i < currentStep ? "✓" : i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm leading-snug">{step.instruction}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {step.distanceM >= 1000 ? `${(step.distanceM / 1000).toFixed(1)} km` : `${step.distanceM} m`}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
                </button>
              ))}
            </div>
          </div>
        )}

        <p className="text-xs text-muted-foreground text-center pb-4">
          Say "navigate to [place]", "next step", "where am I", or "stop navigation"
        </p>
      </main>
    </div>
  );
}
