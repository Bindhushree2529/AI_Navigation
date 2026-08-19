"use client";

import { speak } from "@/utils/speak";
import { listenOnce } from "@/utils/listen";

type ConversationStep = {
  say: string;
  then?: () => void;
  listenAfter?: boolean;
};

// Global conversation state
let currentRecognition: any = null;
let onTranscriptCallback: ((text: string) => void) | null = null;

export function setTranscriptCallback(cb: (text: string) => void) {
  onTranscriptCallback = cb;
}

export function startConversation(steps: ConversationStep[]) {
  let i = 0;
  function next() {
    if (i >= steps.length) return;
    const step = steps[i++];
    speak(step.say, () => {
      step.then?.();
      if (step.listenAfter) {
        // Small delay so the mic doesn't pick up the tail of TTS
        setTimeout(() => {
          currentRecognition = listenOnce(
            (text) => { onTranscriptCallback?.(text); },
            (err) => {
              if (err === "not-supported") speak("Speech recognition not supported. Please use Chrome.");
              else if (err !== "aborted") next();
            }
          );
        }, 200);
      } else {
        next();
      }
    });
  }
  next();
}

export function parseCommand(t: string): { command: string; args: string } {
  const s = t.toLowerCase().trim();

  // Navigation
  if (/go to login|open login/.test(s)) return { command: "navigate", args: "/auth/login" };
  if (/go to register|open register|sign up|create account/.test(s)) return { command: "navigate", args: "/auth/register" };
  if (/go to dashboard|open dashboard/.test(s)) return { command: "navigate", args: "/dashboard" };
  if (/go to settings|open settings/.test(s)) return { command: "navigate", args: "/dashboard/settings" };
  if (/go to demo|open demo/.test(s)) return { command: "navigate", args: "/demo" };
  if (/go to about/.test(s)) return { command: "navigate", args: "/about" };
  if (/go to docs|documentation/.test(s)) return { command: "navigate", args: "/docs" };
  if (/go to contact/.test(s)) return { command: "navigate", args: "/contact" };
  if (/go to home|home page/.test(s)) return { command: "navigate", args: "/" };

  // Form filling
  const emailM = s.match(/email\s+(?:is\s+)?([\w.+\-]+@[\w.\-]+)/);
  if (emailM) return { command: "fill_email", args: emailM[1] };

  const passM = s.match(/password\s+(?:is\s+)?(\S+)/);
  if (passM) return { command: "fill_password", args: passM[1] };

  const nameM = s.match(/(?:my\s+)?name\s+(?:is\s+)?(.+)/);
  if (nameM) return { command: "fill_name", args: nameM[1].trim() };

  const phoneM = s.match(/phone\s+(?:is\s+|number\s+)?([\d\+\s\-]+)/);
  if (phoneM) return { command: "fill_phone", args: phoneM[1].replace(/\s/g, "") };

  const otpM = s.match(/(?:otp|code)\s+(?:is\s+)?(\d{6})/);
  if (otpM) return { command: "fill_otp", args: otpM[1] };

  // Actions
  if (/\bsubmit\b|log\s*me\s*in|sign\s*me\s*in|login\s*now/.test(s)) return { command: "submit", args: "" };
  if (/\blogout\b|sign\s*out|log\s*out/.test(s)) return { command: "logout", args: "" };
  if (/\bsos\b|emergency|help\s*me|send\s*alert/.test(s)) return { command: "sos", args: "" };
  if (/where\s*am\s*i|my\s*location/.test(s)) return { command: "where_am_i", args: "" };
  if (/describe|what.*(?:ahead|around|front)|scan/.test(s)) return { command: "describe_scene", args: "" };
  if (/read\s*text|read\s*this|ocr/.test(s)) return { command: "ocr", args: "" };
  if (/run\s*analysis|analyze/.test(s)) return { command: "run_analysis", args: "" };
  if (/\brepeat\b|say\s*again/.test(s)) return { command: "repeat", args: "" };
  if (/stop\s*(?:talking|speaking)|be\s*quiet/.test(s)) return { command: "stop_speech", args: "" };
  if (/\bhelp\b|what\s*can\s*you\s*do|commands/.test(s)) return { command: "help", args: "" };
  if (/yes|yeah|correct|confirm|okay|ok/.test(s)) return { command: "yes", args: "" };
  if (/no|nope|cancel|nevermind/.test(s)) return { command: "no", args: "" };

  return { command: "unknown", args: s };
}
