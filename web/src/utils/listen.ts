import { getLanguage } from "@/utils/speak";

export function listenOnce(
  onResult: (text: string) => void,
  onError?: (err: string) => void
) {
  if (typeof window === "undefined") return;
  const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  if (!SR) { onError?.("not-supported"); return; }

  const r = new SR();
  r.lang = getLanguage(); // uses current app language
  r.continuous = false;
  r.interimResults = false;
  r.maxAlternatives = 1;

  r.onresult = (e: any) => onResult(e.results[0][0].transcript.trim());
  r.onerror  = (e: any) => onError?.(e.error);
  r.start();
  return r;
}
