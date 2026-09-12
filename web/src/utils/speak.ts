export type AppLanguage =
  | "en-IN"
  | "kn-IN"
  | "hi-IN"
  | "te-IN"
  | "ta-IN"
  | "ml-IN"
  | "bn-IN"
  | "en-US";

let currentLang: AppLanguage = "en-IN";

export function setLanguage(lang: AppLanguage) {
  currentLang = lang;
}

export function getLanguage(): AppLanguage {
  return currentLang;
}

// Supports:
// speak(text)
// speak(text, lang)
// speak(text, onEnd)
// speak(text, lang, onEnd)
export function speak(
  text: string,
  langOrOnEnd?: string | AppLanguage | (() => void),
  onEnd?: () => void
) {
  let lang: string | AppLanguage = currentLang;
  let callback: (() => void) | undefined = onEnd;

  // If second argument is a callback, use it as onEnd
  if (typeof langOrOnEnd === "function") {
    callback = langOrOnEnd;
  } else if (langOrOnEnd) {
    lang = langOrOnEnd;
  }

  if (
    typeof window === "undefined" ||
    !window.speechSynthesis
  ) {
    callback?.();
    return;
  }

  window.speechSynthesis.cancel();

  const utt = new SpeechSynthesisUtterance(text);

  utt.lang = lang as string;
  utt.rate = 0.95;
  utt.pitch = 1;

  if (callback) {
    let fired = false;

    const done = () => {
      if (!fired) {
        fired = true;
        callback?.();
      }
    };

    utt.onend = done;

    // Fallback in case the browser does not fire onend
    setTimeout(done, Math.max(text.length * 70, 1500));
  }

  window.speechSynthesis.speak(utt);
}

export function stopSpeaking() {
  if (typeof window !== "undefined") {
    window.speechSynthesis.cancel();
  }
}
