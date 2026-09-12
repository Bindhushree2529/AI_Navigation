export type AppLanguage = "en-IN" | "kn-IN" | "hi-IN" | "te-IN" | "ta-IN" | "ml-IN" | "bn-IN" | "en-US";

let currentLang: AppLanguage = "en-IN";

export function setLanguage(lang: AppLanguage) { currentLang = lang; }
export function getLanguage(): AppLanguage { return currentLang; }

// lang is optional second param — if a string is passed as second arg it's the language
export function speak(text: string, lang?: string | AppLanguage, onEnd?: () => void) {
  if (typeof window === "undefined" || !window.speechSynthesis) { onEnd?.(); return; }
  window.speechSynthesis.cancel();
  const utt = new SpeechSynthesisUtterance(text);
  utt.lang = (lang as string) ?? currentLang;
  utt.rate = 0.95;
  utt.pitch = 1;
  if (onEnd) {
    let fired = false;
    const done = () => { if (!fired) { fired = true; onEnd(); } };
    utt.onend = done;
    setTimeout(done, Math.max(text.length * 70, 1500));
  }
  window.speechSynthesis.speak(utt);
}

export function stopSpeaking() {
  if (typeof window !== "undefined") window.speechSynthesis.cancel();
}
