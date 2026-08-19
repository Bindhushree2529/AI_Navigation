// Real microphone recording → backend Groq STT
// No local Whisper, no browser SpeechRecognition API

const BACKEND = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

let _mediaRecorder: MediaRecorder | null = null;
let _stream: MediaStream | null = null;

export function abortListen() {
  if (_mediaRecorder && _mediaRecorder.state !== "inactive") {
    try { _mediaRecorder.stop(); } catch {}
  }
  if (_stream) {
    _stream.getTracks().forEach((t) => t.stop());
    _stream = null;
  }
  _mediaRecorder = null;
}

export function listenOnce(
  onResult: (text: string) => void,
  onError?: (err: string) => void
) {
  if (typeof window === "undefined") return;

  abortListen();

  navigator.mediaDevices
    .getUserMedia({ audio: true })
    .then((stream) => {
      _stream = stream;
      const chunks: Blob[] = [];

      // Prefer webm/opus; fall back to whatever the browser supports
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : "";

      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      _mediaRecorder = recorder;

      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };

      recorder.onstop = async () => {
        _stream?.getTracks().forEach((t) => t.stop());
        _stream = null;
        _mediaRecorder = null;

        if (chunks.length === 0) { onError?.("no-speech"); return; }

        const blob = new Blob(chunks, { type: mimeType || "audio/webm" });
        const form = new FormData();
        form.append("file", blob, "recording.webm");

        try {
          const token = typeof window !== "undefined"
            ? (document.cookie.match(/token=([^;]+)/)?.[1] ?? localStorage.getItem("token") ?? "")
            : "";

          const res = await fetch(`${BACKEND}/api/v1/voice/transcribe`, {
            method: "POST",
            headers: token ? { Authorization: `Bearer ${token}` } : {},
            body: form,
          });

          if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            onError?.(err.error ?? `http-${res.status}`);
            return;
          }

          const json = await res.json();
          const text = json.text?.trim();
          if (!text) { onError?.("no-speech"); return; }
          onResult(text);
        } catch {
          onError?.("network");
        }
      };

      // Record for up to 8 seconds, then auto-stop
      recorder.start();
      setTimeout(() => {
        if (recorder.state === "recording") recorder.stop();
      }, 8000);
    })
    .catch((err) => {
      const name = (err as DOMException).name;
      if (name === "NotAllowedError" || name === "PermissionDeniedError") onError?.("not-allowed");
      else if (name === "NotFoundError") onError?.("not-found");
      else onError?.("not-supported");
    });
}
