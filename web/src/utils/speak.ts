// Device TTS — window.speechSynthesis (no local models, no paid API)

let _keepAliveTimer: ReturnType<typeof setInterval> | null = null;
function _ensureKeepAlive() {
  if (_keepAliveTimer) return;
  _keepAliveTimer = setInterval(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.pause();
      window.speechSynthesis.resume();
    }
  }, 10000);
}

// Map Groq language codes → BCP-47 for speechSynthesis
const LANG_MAP: Record<string, string> = {
  en: "en-US", hi: "hi-IN", kn: "kn-IN", te: "te-IN",
  ta: "ta-IN", mr: "mr-IN", bn: "bn-IN", gu: "gu-IN",
  pa: "pa-IN", ur: "ur-PK", ar: "ar-SA", fr: "fr-FR",
  de: "de-DE", es: "es-ES", zh: "zh-CN", ja: "ja-JP",
  ko: "ko-KR", pt: "pt-BR", ru: "ru-RU",
  // Kannada aliases Groq may return
  "kn-in": "kn-IN", "kan": "kn-IN", "kannada": "kn-IN",
};

export function speak(text: string, lang?: string, onEnd?: () => void) {
  if (typeof window === "undefined" || !window.speechSynthesis) { onEnd?.(); return; }
  _ensureKeepAlive();
  window.speechSynthesis.cancel();
  const utt = new SpeechSynthesisUtterance(text);
  // Only use non-English lang if the text actually contains non-latin script
  const hasNonLatin = lang && lang !== "en" && /[^\u0000-\u007F]/.test(text);
  utt.lang = hasNonLatin ? (LANG_MAP[lang!] ?? "en-US") : "en-US";
  utt.rate = 1.0;
  if (onEnd) utt.onend = onEnd;
  setTimeout(() => window.speechSynthesis.speak(utt), 50);
}

export function stopSpeaking() {
  if (typeof window !== "undefined") window.speechSynthesis.cancel();
}
