import { Audio } from "expo-av";
import * as FileSystem from "expo-file-system";
import * as Speech from "expo-speech";

const BACKEND_URL =
  process.env.EXPO_PUBLIC_API_URL ?? "http://10.0.2.2:3001";

// ── Microphone permission ─────────────────────────────────────────────────────
export async function ensureMicrophonePermission(): Promise<boolean> {
  try {
    const { status } = await Audio.requestPermissionsAsync();
    return status === "granted";
  } catch {
    return false;
  }
}

// ── Recording ─────────────────────────────────────────────────────────────────
let _recording: Audio.Recording | null = null;

export async function startRecording(): Promise<void> {
  await Audio.setAudioModeAsync({
    allowsRecordingIOS: true,
    playsInSilentModeIOS: true,
  });
  _recording = new Audio.Recording();
  await _recording.prepareToRecordAsync(
    Audio.RecordingOptionsPresets.HIGH_QUALITY
  );
  await _recording.startAsync();
  console.log("[Voice Assistant] Recording: STARTED");
}

export async function stopRecording(): Promise<string | null> {
  if (!_recording) return null;
  try { await _recording.stopAndUnloadAsync(); } catch {}
  const uri = _recording.getURI();
  _recording = null;
  return uri ?? null;
}

// ── Auth token helper ─────────────────────────────────────────────────────────
let _authToken = "";
export function setAuthToken(token: string) { _authToken = token; }

// ── Send audio to backend → Groq STT only ────────────────────────────────────
export async function transcribeAudio(uri: string): Promise<{ text: string; language: string }> {
  console.log("[Voice Assistant] Groq STT: PROCESSING");
  const name = uri.split("/").pop() ?? "recording.m4a";
  const mimeType = name.endsWith(".wav") ? "audio/wav" : "audio/mp4";

  const form = new FormData();
  // @ts-ignore — React Native FormData file object
  form.append("file", { uri, name, type: mimeType });

  const res = await fetch(`${BACKEND_URL}/api/v1/voice/transcribe`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      ...(_authToken ? { Authorization: `Bearer ${_authToken}` } : {}),
    },
    body: form,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? `STT failed: ${res.status}`);
  }

  const json = await res.json();
  console.log(`[Voice Assistant] Transcription: "${json.text}"`);
  return { text: json.text ?? "", language: json.language ?? "en" };
}

// ── Send audio to backend → Groq STT + LLM + tool execution ─────────────────
export async function sendVoiceCommand(
  uri: string,
  history: { role: string; content: string }[] = []
): Promise<{
  transcript: string;
  language: string;
  tool: string;
  response: string | null;
  repeat: boolean;
}> {
  const name = uri.split("/").pop() ?? "recording.m4a";
  const mimeType = name.endsWith(".wav") ? "audio/wav" : "audio/mp4";

  const form = new FormData();
  // @ts-ignore
  form.append("file", { uri, name, type: mimeType });
  if (history.length > 0) {
    form.append("history", JSON.stringify(history.slice(-6)));
  }

  const res = await fetch(`${BACKEND_URL}/api/v1/voice/command`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      ...(_authToken ? { Authorization: `Bearer ${_authToken}` } : {}),
    },
    body: form,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? `Command failed: ${res.status}`);
  }

  const data = await res.json();
  console.log(`[Voice Assistant] Tool: ${data.tool}()`);
  console.log(`[Voice Assistant] Response: "${data.response}"`);
  return data;
}

// ── Device TTS (expo-speech — native Android/iOS) ────────────────────────────
export function speak(text: string, language = "en-US"): void {
  console.log("[Voice Assistant] TTS: PLAYING");
  Speech.speak(text, {
    language,
    rate: 0.95,
    onDone: () => console.log("[Voice Assistant] TTS: DONE"),
    onError: (e) => console.warn("[Voice Assistant] TTS error:", e),
  });
}

export function stopSpeaking(): void {
  Speech.stop();
}

// ── New tool execution helpers ────────────────────────────────────────────────

export async function getWeather(lat: number, lng: number): Promise<string> {
  const res = await fetch(`${BACKEND_URL}/api/v1/weather/current?lat=${lat}&lng=${lng}`, {
    headers: _authToken ? { Authorization: `Bearer ${_authToken}` } : {},
  });
  if (!res.ok) return "Weather information is currently unavailable.";
  const d = await res.json();
  const alerts = d.alerts?.join(" ") ?? "";
  return `${d.condition}. Temperature ${d.temperatureC}°C. Wind ${d.windSpeedKmh} km/h. ${alerts} ${d.navigationAdvice}`.trim();
}

export async function getWeatherAdvice(lat: number, lng: number): Promise<string> {
  const res = await fetch(`${BACKEND_URL}/api/v1/weather/route-advice?lat=${lat}&lng=${lng}`, {
    headers: _authToken ? { Authorization: `Bearer ${_authToken}` } : {},
  });
  if (!res.ok) return "Weather advice is currently unavailable.";
  const d = await res.json();
  return d.advice ?? "No weather advice available.";
}

export async function getIndoorRoute(destination: string, buildingId = "demo-building"): Promise<string> {
  const res = await fetch(`${BACKEND_URL}/api/v1/indoor/route`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(_authToken ? { Authorization: `Bearer ${_authToken}` } : {}),
    },
    body: JSON.stringify({ buildingId, destination, preferAccessible: true }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    return err.error ?? "Indoor route not found.";
  }
  const d = await res.json();
  const steps = (d.steps as any[]).map((s: any, i: number) => `Step ${i + 1}: ${s.instruction}`).join(". ");
  return `${d.summary} ${steps}`;
}

export function getBatteryStatus(batteryLevel: number | null, batteryMode: string, isCharging: boolean): string {
  if (batteryLevel === null) return "Battery information is unavailable.";
  const chargeStr = isCharging ? "Charging." : "";
  return `Battery is at ${batteryLevel}%. Mode: ${batteryMode}. ${chargeStr}`.trim();
}

export function getConnectivityStatus(isOnline: boolean): string {
  return isOnline
    ? "Internet connection is active."
    : "No internet connection. Basic navigation assistance is active.";
}
