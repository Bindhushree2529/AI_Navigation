"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Mic, MicOff, Volume2, X, MessageCircle } from "lucide-react";
import { speak, stopSpeaking, setLanguage, getLanguage, type AppLanguage } from "@/utils/speak";
import { stopFlow } from "@/utils/voiceFlow";
import { voiceCommandBus, setVoiceCommandDebug } from "@/utils/voiceCommandBus";

const BACKEND = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

const PAGE_GREET: Record<string, string> = {
  "/": "Welcome to NaviAssist. Say login or register to get started.",
  "/auth/login": "Login page. Press mic and speak to log in.",
  "/auth/register": "Register page. Press mic to create your account.",
  "/dashboard/user": "Dashboard. Say navigation, SOS, settings, or logout.",
  "/dashboard/navigation": "Navigation. Say navigate to, followed by your destination.",
  "/dashboard/caregiver": "Caregiver dashboard.",
  "/dashboard/admin": "Admin dashboard.",
  "/dashboard/settings": "Settings page.",
  "/demo": "AI demo page.",
  "/about": "About NaviAssist.",
  "/docs": "Documentation.",
  "/contact": "Contact page.",
};

// ── Token helpers ─────────────────────────────────────────────────────────────
function getToken(): string {
  if (typeof window === "undefined") return "";
  try {
    const s = localStorage.getItem("naviassist-auth");
    if (s) { const { state } = JSON.parse(s); if (state?.accessToken) return state.accessToken; }
  } catch {}
  return "";
}

function saveTokenToStore(accessToken: string, refreshToken: string, user: any) {
  if (typeof window === "undefined") return;
  try {
    const s = localStorage.getItem("naviassist-auth");
    const p = s ? JSON.parse(s) : {};
    p.state = { ...p.state, accessToken, refreshToken, user };
    localStorage.setItem("naviassist-auth", JSON.stringify(p));
  } catch {}
}

// ── Build email from spoken username ─────────────────────────────────────────
// "bindu"                    -> bindu@gmail.com
// "bindu at yahoo dot com"   -> bindu@yahoo.com
// "Say Bindu. Bindu. Bindu." -> bindu@gmail.com  (skips filler word "say")
function buildEmail(raw: string): string {
  const s = raw.toLowerCase().trim();

  // Full email with "at" keyword
  if (s.includes(" at ") || s.includes("@")) {
    return s
      .replace(/\s+at\s+/g, "@")
      .replace(/\s+dot\s+/g, ".")
      .replace(/\s+underscore\s+/g, "_")
      .replace(/\s+dash\s+/g, "-")
      .replace(/\s/g, "");
  }

  // Username only — take first non-filler word
  const FILLERS = new Set(["say", "my", "is", "the", "a", "an", "i", "its", "it", "name", "email"]);
  const words = s.split(/[\s.,!?]+/).filter(Boolean);
  const username = (words.find((w) => !FILLERS.has(w)) ?? words[0] ?? "user")
    .replace(/[^a-z0-9_-]/g, "");
  return `${username}@gmail.com`;
}

// ── Audio recording ───────────────────────────────────────────────────────────
let _recorder: MediaRecorder | null = null;
let _stream: MediaStream | null = null;

function stopRecorder() {
  if (_recorder && _recorder.state !== "inactive") { try { _recorder.stop(); } catch {} }
  if (_stream) { _stream.getTracks().forEach((t) => t.stop()); _stream = null; }
  _recorder = null;
}

function recordOnce(maxSeconds = 8): Promise<Blob> {
  return new Promise((resolve, reject) => {
    stopRecorder();
    navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
      _stream = stream;
      const chunks: Blob[] = [];
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus" : "audio/webm";
      const rec = new MediaRecorder(stream, { mimeType });
      _recorder = rec;
      rec.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
      rec.onstop = () => {
        _stream?.getTracks().forEach((t) => t.stop());
        _stream = null; _recorder = null;
        if (chunks.length === 0) { reject(new Error("no-speech")); return; }
        resolve(new Blob(chunks, { type: mimeType }));
      };
      rec.start();
      setTimeout(() => { if (rec.state === "recording") rec.stop(); }, maxSeconds * 1000);
    }).catch((err) => {
      reject(new Error((err as DOMException).name === "NotAllowedError" ? "not-allowed" : "not-found"));
    });
  });
}

// ── Groq STT ──────────────────────────────────────────────────────────────────
async function transcribe(blob: Blob): Promise<{ text: string; language: string }> {
  const form = new FormData();
  form.append("file", blob, "recording.webm");
  const token = getToken();
  const res = await fetch(`${BACKEND}/api/v1/voice/transcribe`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  });
  if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error ?? `STT error ${res.status}`); }
  return res.json();
}

// ── Groq LLM command ──────────────────────────────────────────────────────────
async function sendCommand(blob: Blob, history: { role: string; content: string }[]) {
  const form = new FormData();
  form.append("file", blob, "recording.webm");
  if (history.length > 0) form.append("history", JSON.stringify(history.slice(-6)));
  const token = getToken();
  const res = await fetch(`${BACKEND}/api/v1/voice/command`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  });
  if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error ?? `Command error ${res.status}`); }
  return res.json() as Promise<{ transcript: string; language: string; tool: string; response: string | null; repeat: boolean }>;
}

// ── Speak prompt, wait for it to finish, then record ─────────────────────────
async function askAndListen(
  prompt: string,
  addMsg: (r: "a" | "u", t: string) => void,
  maxSeconds = 8
): Promise<string> {
  addMsg("a", prompt);
  speak(prompt);
  // Wait: ~55ms per char + 1s buffer so mic never opens while TTS is still playing
  const waitMs = Math.max(prompt.length * 60 + 1000, 2000);
  await new Promise((r) => setTimeout(r, waitMs));
  const blob = await recordOnce(maxSeconds);
  const { text } = await transcribe(blob);
  if (!text) throw new Error("no-speech");
  addMsg("u", text);
  return text;
}

// ── Auth API ──────────────────────────────────────────────────────────────────
async function apiLogin(email: string, password: string) {
  const res = await fetch(`${BACKEND}/api/v1/auth/login`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Login failed");
  return data as { user: any; accessToken: string; refreshToken: string };
}

async function apiRegister(name: string, email: string, password: string, role: string) {
  const res = await fetch(`${BACKEND}/api/v1/auth/register`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email, password, role }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Registration failed");
  return data as { user: any; accessToken: string; refreshToken: string };
}

// ── Fill form field via voiceCommandBus ───────────────────────────────────────
async function fillField(command: string, value: string) {
  voiceCommandBus.dispatch(command, value);
  await new Promise((r) => setTimeout(r, 300));
}

// ── Main component ────────────────────────────────────────────────────────────
export function VoiceAssistant() {
  const pathname = usePathname();
  const router = useRouter();
  const [recording, setRecording] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msgs, setMsgs] = useState<{ role: "a" | "u"; text: string }[]>([]);
  const [minimized, setMinimized] = useState(false);
  const lastRef = useRef("");
  const announced = useRef("");
  const endRef = useRef<HTMLDivElement>(null);
  const historyRef = useRef<{ role: string; content: string }[]>([]);
  const flowRef = useRef(false);
  const pendingFlowRef = useRef<"login" | "register" | null>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs]);
  useEffect(() => { try { setVoiceCommandDebug(true); } catch {} }, []);

  // Page greeting + trigger pending flow after page loads
  useEffect(() => {
    if (pathname === announced.current) return;
    announced.current = pathname;
    const msg = PAGE_GREET[pathname] ?? "Page loaded. Press mic and say help.";
    lastRef.current = msg;
    const pending = pendingFlowRef.current;
    pendingFlowRef.current = null;

    setTimeout(() => {
      addMsg("a", msg);
      speak(msg);
      const greetWait = Math.max(msg.length * 60 + 1000, 2000);
      if (pending === "login" && pathname === "/auth/login") {
        setTimeout(() => runLoginFlow(), greetWait);
      } else if (pending === "register" && pathname === "/auth/register") {
        setTimeout(() => runRegisterFlow(), greetWait);
      }
    }, 600);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  function addMsg(role: "a" | "u", text: string) {
    if (role === "a") lastRef.current = text;
    setMsgs((p) => [...p.slice(-30), { role, text }]);
    historyRef.current = [...historyRef.current.slice(-10), {
      role: role === "a" ? "assistant" : "user", content: text,
    }];
  }

  function say(text: string, lang?: string) { addMsg("a", text); speak(text, lang); }
  function endFlow() { flowRef.current = false; setBusy(false); setRecording(false); }

  // ── Login flow ────────────────────────────────────────────────────────────
  async function runLoginFlow() {
    if (flowRef.current) return;
    flowRef.current = true;
    setBusy(true);
    try {
      // Step 1: email username (short prompt so TTS finishes fast)
      const usernameRaw = await askAndListen("Say your email username.", addMsg, 6);
      const email = buildEmail(usernameRaw);
      say(`Email: ${email}`);
      await new Promise((r) => setTimeout(r, 1500));

      // Step 2: password
      const password = (await askAndListen("Say your password.", addMsg, 8)).replace(/\s/g, "");
      if (password.length < 6) { say("Password too short. Please try again."); endFlow(); return; }

      say("Logging you in.");
      await fillField("fill_email", email);
      await fillField("fill_password", password);

      const result = await apiLogin(email, password);
      saveTokenToStore(result.accessToken, result.refreshToken, result.user);
      try {
        const { useAuthStore } = await import("@/store/authStore");
        useAuthStore.getState().setTokens(result.accessToken, result.refreshToken);
        useAuthStore.setState({ user: result.user });
      } catch {}

      say(`Welcome back, ${result.user.name}. You can say: navigation, object detection, read text, SOS, or settings.`);
      await new Promise((r) => setTimeout(r, 3500));
      router.push("/dashboard/user");
    } catch (err: any) {
      const msg = err.message ?? "";
      if (msg.includes("Invalid credentials")) say("Wrong email or password. Please try again.");
      else if (msg.includes("no-speech")) say("I did not hear you. Press mic and try again.");
      else if (msg.includes("not-allowed")) say("Microphone permission denied.");
      else say(`Login failed: ${msg}`);
    }
    endFlow();
  }

  // ── Register flow ─────────────────────────────────────────────────────────
  async function runRegisterFlow() {
    if (flowRef.current) return;
    flowRef.current = true;
    setBusy(true);
    try {
      // Step 1: name
      const name = await askAndListen("Say your full name.", addMsg, 6);
      if (name.trim().length < 2) { say("Name too short."); endFlow(); return; }
      say(`Name: ${name}`);
      await new Promise((r) => setTimeout(r, 1000));

      // Step 2: email username only — SHORT prompt
      const usernameRaw = await askAndListen("Say your username for email.", addMsg, 6);
      const email = buildEmail(usernameRaw);
      say(`Email: ${email}`);
      await new Promise((r) => setTimeout(r, 1500));

      // Step 3: password
      const password = (await askAndListen("Say your password. At least 8 characters.", addMsg, 8)).replace(/\s/g, "");
      if (password.length < 8) { say("Password must be at least 8 characters."); endFlow(); return; }

      // Step 4: role
      const roleAnswer = await askAndListen("Say user or caregiver.", addMsg, 5);
      const role = /caregiver|care/i.test(roleAnswer) ? "CAREGIVER" : "USER";

      say("Creating your account, please wait.");

      // Fill form fields so user can see them
      await fillField("fill_name", name);
      await fillField("fill_email", email);
      await fillField("fill_password", password);
      await fillField("fill_role", role);

      const result = await apiRegister(name, email, password, role);
      saveTokenToStore(result.accessToken, result.refreshToken, result.user);
      try {
        const { useAuthStore } = await import("@/store/authStore");
        useAuthStore.getState().setTokens(result.accessToken, result.refreshToken);
        useAuthStore.setState({ user: result.user });
      } catch {}

      say(`Account created. Welcome, ${result.user.name}! You can say: navigation, object detection, read text, SOS, or settings.`);
      await new Promise((r) => setTimeout(r, 3500));
      router.push("/dashboard/user");
      // After redirect, auto-start listening for next command
      pendingFlowRef.current = null;
    } catch (err: any) {
      const msg = err.message ?? "";
      if (msg.includes("already exists")) say("That email already exists. Try saying login.");
      else if (msg.includes("no-speech")) say("I did not hear you. Press mic and try again.");
      else if (msg.includes("not-allowed")) say("Microphone permission denied.");
      else say(`Registration failed: ${msg}`);
    }
    endFlow();
  }

  // ── Mic press ─────────────────────────────────────────────────────────────
  const handleMicPress = useCallback(async () => {
    if (flowRef.current || busy) {
      stopRecorder(); stopFlow();
      flowRef.current = false; pendingFlowRef.current = null;
      setRecording(false); setBusy(false);
      return;
    }

    setRecording(true);
    let blob: Blob;
    try {
      blob = await recordOnce(8);
    } catch (err: any) {
      setRecording(false);
      if (err.message === "not-allowed") say("Microphone permission denied.");
      else if (err.message === "not-found") say("No microphone found.");
      else say("Could not start recording. Please try again.");
      return;
    }
    setRecording(false);
    setBusy(true);

    let transcript = "";
    let language = "en";
    try {
      const stt = await transcribe(blob);
      transcript = stt.text;
      language = stt.language;
      addMsg("u", transcript);
    } catch {
      say("I could not understand you. Please try again.");
      setBusy(false);
      return;
    }

    const lower = transcript.toLowerCase();

    if (/\blogin\b|\bsign in\b|\blog in\b/.test(lower)) {
      setBusy(false);
      if (pathname === "/auth/login") { runLoginFlow(); }
      else { say("Opening login page."); pendingFlowRef.current = "login"; router.push("/auth/login"); }
      return;
    }

    if (/\bregister\b|\bsign up\b|\bcreate account\b|\bnew account\b/.test(lower)) {
      setBusy(false);
      if (pathname === "/auth/register") { runRegisterFlow(); }
      else { say("Opening registration page."); pendingFlowRef.current = "register"; router.push("/auth/register"); }
      return;
    }

    if (/\blogout\b|\bsign out\b/.test(lower)) {
      say("Logging you out.");
      try { const { useAuthStore } = await import("@/store/authStore"); await useAuthStore.getState().logout(); } catch {}
      setBusy(false); router.push("/"); return;
    }
    if (/\brepeat\b|\bsay again\b/.test(lower)) { speak(lastRef.current || "Nothing to repeat."); setBusy(false); return; }
    if (/\bstop\b/.test(lower)) { stopFlow(); setBusy(false); return; }
    if (/\bhelp\b/.test(lower)) {
      say("Say: login, register, navigate to, where am I, what is in front of me, read this, SOS, logout, or repeat.");
      setBusy(false); return;
    }

    // ── Page navigation shortcuts ───────────────────────────────────────────
    if (/\bnavigat/i.test(lower) && !/navigate to .+/i.test(lower)) {
      say("Opening navigation."); setBusy(false); router.push("/dashboard/navigation"); return;
    }
    if (/object detect|what.*(front|ahead|around)|detect object|camera|obstacle/i.test(lower)) {
      say("Opening object detection."); setBusy(false); router.push("/demo"); return;
    }
    if (/describe.*scene|scene descri|what.*see|look around/i.test(lower)) {
      say("Opening scene description."); setBusy(false); router.push("/demo"); return;
    }
    if (/read.*text|read this|ocr|text.*camera/i.test(lower)) {
      say("Opening text reader."); setBusy(false); router.push("/demo"); return;
    }
    if (/\bcurrency|\bmoney|\bnote|\bcash/i.test(lower)) {
      say("Opening currency detection."); setBusy(false); router.push("/demo"); return;
    }
    if (/\bsettings\b/i.test(lower)) {
      say("Opening settings."); setBusy(false); router.push("/dashboard/settings"); return;
    }
    if (/\bdashboard\b/i.test(lower)) {
      say("Opening dashboard."); setBusy(false); router.push("/dashboard/user"); return;
    }
    if (/\bsos\b|\bemergency\b|\bhelp me\b/i.test(lower)) {
      voiceCommandBus.dispatch("sos", ""); setBusy(false); return;
    }
    // Navigate to specific destination
    const navMatch = lower.match(/navigate to (.+)|go to (.+)|take me to (.+)|directions? to (.+)/);
    if (navMatch) {
      const dest = (navMatch[1] ?? navMatch[2] ?? navMatch[3] ?? navMatch[4]).trim();
      say(`Navigating to ${dest}.`);
      router.push("/dashboard/navigation");
      setTimeout(() => voiceCommandBus.dispatch("navigate_to", dest), 2000);
      setBusy(false); return;
    }

    try {
      const data = await sendCommand(blob, historyRef.current);
      if (data.repeat) { speak(lastRef.current || "Nothing to repeat."); setBusy(false); return; }
      const response = data.response ?? "";
      if (!response) { setBusy(false); return; }
      // Actually navigate for these tools
      if (data.tool === "startNavigation" || data.tool === "findNearestHospital") {
        const dest = data.tool === "findNearestHospital" ? "nearest hospital" : undefined;
        router.push("/dashboard/navigation");
        if (dest) setTimeout(() => voiceCommandBus.dispatch("navigate_to", dest), 2000);
      }
      if (data.tool === "detectObjects" || data.tool === "describeScene" || data.tool === "readText" || data.tool === "recognizeCurrency") {
        router.push("/demo");
      }
      if (data.tool === "triggerSOS") voiceCommandBus.dispatch("sos", "");
      if (data.tool === "stopNavigation") voiceCommandBus.dispatch("stop_navigation", "");
      if (data.tool === "getNavigationStatus") router.push("/dashboard/navigation");
      // New tools
      if (data.tool === "detectTrafficLight" || data.tool === "detectZebraCrossing" ||
          data.tool === "detectVehicles" || data.tool === "detectPedestrians" ||
          data.tool === "detectStopSign" || data.tool === "analyzeRoadSafety") {
        router.push("/demo");
        voiceCommandBus.dispatch("road_safety", "");
      }
      if (data.tool === "findIndoorRoute") {
        const dest = (data as any).toolArgs?.destination ?? transcript;
        voiceCommandBus.dispatch("indoor_route", dest);
      }
      if (data.tool === "getWeather" || data.tool === "getWeatherAdvice") {
        voiceCommandBus.dispatch("get_weather", "");
      }
      if (data.tool === "setLanguage") {
        const lang = (data as any).toolArgs?.language ?? "en-IN";
        setLanguage(lang as AppLanguage);
      }
      if (data.tool === "getBatteryStatus" || data.tool === "enableBatterySaver" ||
          data.tool === "getConnectivityStatus" || data.tool === "enableBasicMode") {
        voiceCommandBus.dispatch("device_status", data.tool);
      }
      say(response, data.language);
    } catch (err: any) {
      say(err.message || "I could not process that. Please try again.");
    }
    setBusy(false);
  }, [recording, busy, pathname]);

  if (minimized) return (
    <button onClick={() => setMinimized(false)}
      className="fixed bottom-6 left-6 z-50 w-14 h-14 rounded-full bg-brand-600 text-white shadow-lg flex items-center justify-center"
      aria-label="Open voice assistant">
      <Mic className="h-6 w-6" />
    </button>
  );

  return (
    <div className="fixed bottom-6 left-6 z-50 w-72 rounded-2xl shadow-2xl border bg-background overflow-hidden flex flex-col"
      style={{ maxHeight: "440px" }} role="region" aria-label="Voice assistant">

      <div className="flex items-center justify-between px-4 py-3 bg-brand-600 text-white shrink-0">
        <span className="text-sm font-semibold flex items-center gap-2">
          <MessageCircle className="h-4 w-4" aria-hidden />
          NaviAssist Voice
        </span>
        <button onClick={() => setMinimized(true)} aria-label="Minimize"><X className="h-4 w-4" /></button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-surface min-h-[180px]" aria-live="polite">
        {msgs.length === 0 && (
          <p className="text-xs text-muted-foreground text-center pt-6">Press mic and speak a command</p>
        )}
        {msgs.map((m, i) => (
          <div key={i} className={`flex ${m.role === "u" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-xs leading-relaxed ${
              m.role === "u" ? "bg-brand-600 text-white rounded-br-sm" : "bg-background border text-foreground rounded-bl-sm"
            }`}>{m.text}</div>
          </div>
        ))}
        {recording && (
          <div className="flex justify-end">
            <div className="bg-brand-100 dark:bg-brand-900/40 text-brand-700 rounded-2xl rounded-br-sm px-3 py-2 text-xs animate-pulse">
              🎤 Recording...
            </div>
          </div>
        )}
        {busy && !recording && (
          <div className="flex justify-start">
            <div className="bg-background border text-foreground rounded-2xl rounded-bl-sm px-3 py-2 text-xs animate-pulse">
              ⏳ Processing...
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <div className="flex gap-2 p-3 border-t shrink-0">
        <button onClick={handleMicPress}
          className={`flex-1 flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition-all ${
            recording ? "bg-red-500 text-white animate-pulse"
            : busy ? "bg-yellow-500 text-white"
            : "bg-brand-600 text-white hover:bg-brand-700"
          }`}
          aria-label={recording ? "Stop recording" : busy ? "Processing..." : "Speak a command"}
          aria-pressed={recording}>
          {recording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          {recording ? "Stop" : busy ? "Wait..." : "Speak"}
        </button>
        <button onClick={() => speak(lastRef.current || "NaviAssist ready.")}
          className="flex items-center justify-center rounded-xl px-3 border hover:bg-surface transition-all"
          aria-label="Repeat last message">
          <Volume2 className="h-4 w-4 text-brand-600" />
        </button>
      </div>
    </div>
  );
}
