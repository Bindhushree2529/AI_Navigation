// Single global voice flow — only one listener active at a time

const BACKEND = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

let isFlowActive = false;

export function isFlowRunning() { return isFlowActive; }
export function stopFlow() {
  isFlowActive = false;
  if (typeof window !== "undefined") window.speechSynthesis.cancel();
}

function getToken(): string {
  if (typeof window === "undefined") return "";
  return document.cookie.match(/token=([^;]+)/)?.[1] ?? localStorage.getItem("token") ?? "";
}

async function recordAndTranscribe(): Promise<string> {
  return new Promise((resolve, reject) => {
    navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
      const chunks: Blob[] = [];
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus" : "audio/webm";
      const recorder = new MediaRecorder(stream, { mimeType });

      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        if (chunks.length === 0) { reject("no-speech"); return; }

        const blob = new Blob(chunks, { type: mimeType });
        const form = new FormData();
        form.append("file", blob, "recording.webm");

        try {
          const token = getToken();
          const res = await fetch(`${BACKEND}/api/v1/voice/transcribe`, {
            method: "POST",
            headers: token ? { Authorization: `Bearer ${token}` } : {},
            body: form,
          });
          if (!res.ok) { reject(`http-${res.status}`); return; }
          const json = await res.json();
          const text = json.text?.trim();
          if (!text) { reject("no-speech"); return; }
          resolve(text);
        } catch { reject("network"); }
      };

      recorder.start();
      setTimeout(() => { if (recorder.state === "recording") recorder.stop(); }, 8000);
    }).catch((err) => {
      const name = (err as DOMException).name;
      reject(name === "NotAllowedError" ? "not-allowed" : "not-supported");
    });
  });
}

function sayAndWait(text: string): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === "undefined" || !window.speechSynthesis) { resolve(); return; }
    window.speechSynthesis.cancel();
    setTimeout(() => {
      const utt = new SpeechSynthesisUtterance(text);
      utt.lang = "en-US";
      utt.rate = 1.0;
      let resolved = false;
      const done = () => { if (!resolved) { resolved = true; resolve(); } };
      const fallbackMs = Math.max(text.length * 55 + 600, 1500);
      const fallback = setTimeout(done, fallbackMs);
      utt.onend = () => { clearTimeout(fallback); done(); };
      utt.onerror = done;
      window.speechSynthesis.speak(utt);
    }, 80);
  });
}

export type FlowStep = {
  ask: string;
  validate?: (answer: string) => string | null;
  onAnswer: (answer: string) => void | Promise<void>;
};

export async function runFlow(
  steps: FlowStep[],
  onMessage: (role: "a" | "u", text: string) => void
) {
  isFlowActive = true;

  for (const step of steps) {
    if (!isFlowActive) break;

    let answered = false;
    while (!answered && isFlowActive) {
      await sayAndWait(step.ask);
      if (!isFlowActive) break;
      onMessage("a", step.ask);

      let answer = "";
      try {
        answer = await recordAndTranscribe();
      } catch (err) {
        if (!isFlowActive) break;
        if (err === "no-speech") { await sayAndWait("I didn't hear you. Let me ask again."); continue; }
        if (err === "not-allowed") { await sayAndWait("Microphone permission denied."); isFlowActive = false; break; }
        if (err === "network") { await sayAndWait("Internet connection is required for voice processing."); isFlowActive = false; break; }
        await sayAndWait("I had trouble hearing you. Please try again.");
        continue;
      }

      if (!isFlowActive) break;

      if (/^(cancel|stop|quit|exit)$/i.test(answer)) {
        onMessage("u", answer);
        await sayAndWait("Cancelled.");
        onMessage("a", "Cancelled.");
        isFlowActive = false;
        return;
      }

      onMessage("u", answer);

      if (step.validate) {
        const err = step.validate(answer);
        if (err) { await sayAndWait(err); onMessage("a", err); continue; }
      }

      await step.onAnswer(answer);
      answered = true;
    }
  }

  isFlowActive = false;
}
