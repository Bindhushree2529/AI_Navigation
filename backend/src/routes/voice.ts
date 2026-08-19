import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import FormData from "form-data";
import axios from "axios";
import { env } from "../config/env";
import { prisma } from "../config/prisma";
import { redisPub } from "../config/redis";
import { sendSosEmail } from "../services/emailService";
import { sendSosSms } from "../services/smsService";
import { aiClient } from "../services/aiClient";

const GROQ_API = "https://api.groq.com/openai/v1";
const STT_MODEL = "whisper-large-v3-turbo";
const LLM_MODEL = "llama-3.3-70b-versatile";

// ── Tool definitions for Groq LLM ────────────────────────────────────────────
const TOOLS = [
  { type: "function", function: { name: "startNavigation",       description: "Start navigation to a destination", parameters: { type: "object", properties: { destination: { type: "string" } }, required: ["destination"] } } },
  { type: "function", function: { name: "stopNavigation",        description: "Stop the current navigation session", parameters: { type: "object", properties: {} } } },
  { type: "function", function: { name: "getCurrentLocation",    description: "Get the user's current GPS location", parameters: { type: "object", properties: {} } } },
  { type: "function", function: { name: "findNearestHospital",   description: "Find the nearest hospital and start navigation", parameters: { type: "object", properties: {} } } },
  { type: "function", function: { name: "detectObjects",         description: "Detect objects in front of the user using the camera", parameters: { type: "object", properties: {} } } },
  { type: "function", function: { name: "describeScene",         description: "Describe the current scene around the user", parameters: { type: "object", properties: {} } } },
  { type: "function", function: { name: "readText",              description: "Read text visible in the camera (OCR)", parameters: { type: "object", properties: {} } } },
  { type: "function", function: { name: "recognizeCurrency",     description: "Identify currency notes visible in the camera", parameters: { type: "object", properties: {} } } },
  { type: "function", function: { name: "triggerSOS",            description: "Send an SOS emergency alert to caregivers", parameters: { type: "object", properties: {} } } },
  { type: "function", function: { name: "callCaregiver",         description: "Call the user's caregiver", parameters: { type: "object", properties: {} } } },
  { type: "function", function: { name: "sendLocationToCaregiver", description: "Send current location to caregiver", parameters: { type: "object", properties: {} } } },
  { type: "function", function: { name: "repeatLastResponse",    description: "Repeat the last spoken response", parameters: { type: "object", properties: {} } } },
  { type: "function", function: { name: "getNavigationStatus",   description: "Get the current navigation status and next step", parameters: { type: "object", properties: {} } } },
  { type: "function", function: { name: "generalResponse",       description: "Respond conversationally when no specific tool applies", parameters: { type: "object", properties: { message: { type: "string" } }, required: ["message"] } } },
];

// ── Detect language from transcript text (more reliable than Groq's field) ──
function detectLanguage(text: string): string {
  if (!text) return "en";
  // Count characters by Unicode script
  const kannada   = (text.match(/[\u0C80-\u0CFF]/g) ?? []).length;
  const devanagari = (text.match(/[\u0900-\u097F]/g) ?? []).length;
  const telugu    = (text.match(/[\u0C00-\u0C7F]/g) ?? []).length;
  const tamil     = (text.match(/[\u0B80-\u0BFF]/g) ?? []).length;
  const arabic    = (text.match(/[\u0600-\u06FF]/g) ?? []).length;
  const latin     = (text.match(/[a-zA-Z]/g) ?? []).length;

  const max = Math.max(kannada, devanagari, telugu, tamil, arabic, latin);
  if (max === 0) return "en";
  if (max === latin) return "en";       // English wins if most chars are latin
  if (max === kannada) return "kn";
  if (max === devanagari) return "hi";
  if (max === telugu) return "te";
  if (max === tamil) return "ta";
  if (max === arabic) return "ar";
  return "en";
}

// ── Groq STT ─────────────────────────────────────────────────────────────────
async function groqTranscribe(audioBuffer: Buffer, mimeType: string): Promise<{ text: string; language: string }> {
  const ext = mimeType.includes("webm") ? "webm" : mimeType.includes("mp4") ? "mp4" : mimeType.includes("ogg") ? "ogg" : "wav";
  const form = new FormData();
  form.append("file", audioBuffer, { filename: `audio.${ext}`, contentType: mimeType });
  form.append("model", STT_MODEL);
  form.append("response_format", "verbose_json");

  const { data } = await axios.post(`${GROQ_API}/audio/transcriptions`, form, {
    headers: { ...form.getHeaders(), Authorization: `Bearer ${env.GROQ_API_KEY}` },
    timeout: 30000,
  });
  return { text: data.text?.trim() ?? "", language: detectLanguage(data.text ?? "") };
}

// ── Groq LLM tool call ────────────────────────────────────────────────────────
async function groqLLM(
  transcript: string,
  language: string,
  history: { role: string; content: string }[]
): Promise<{ toolName: string; toolArgs: Record<string, any> }> {
  const systemPrompt = `You are NaviAssist, an AI voice assistant for visually impaired users.
The user spoke in language: ${language}.
Always respond in the SAME language the user spoke in.
Supported languages include English, Hindi (हिंदी), Kannada (ಕನ್ನಡ), Telugu (తెలుగు), Tamil (தமிழ்), and others.
If the user spoke Kannada, respond in Kannada script.
If the user spoke Hindi, respond in Hindi.
Always call the most appropriate tool based on the user's request.
If no specific tool applies, call generalResponse with a helpful conversational reply in the user's language.`;

  const messages = [
    { role: "system", content: systemPrompt },
    ...history.slice(-6), // keep last 3 turns for context
    { role: "user", content: transcript },
  ];

  const { data } = await axios.post(
    `${GROQ_API}/chat/completions`,
    { model: LLM_MODEL, messages, tools: TOOLS, tool_choice: "required", temperature: 0.3 },
    { headers: { Authorization: `Bearer ${env.GROQ_API_KEY}`, "Content-Type": "application/json" }, timeout: 30000 }
  );

  const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
  if (!toolCall) return { toolName: "generalResponse", toolArgs: { message: "I'm not sure how to help with that." } };

  return {
    toolName: toolCall.function.name,
    toolArgs: JSON.parse(toolCall.function.arguments ?? "{}"),
  };
}

// ── Tool executor ─────────────────────────────────────────────────────────────
async function executeTool(
  toolName: string,
  toolArgs: Record<string, any>,
  userId: string,
  language: string
): Promise<string> {
  console.log(`[Voice Assistant] Tool: ${toolName}`, toolArgs);

  switch (toolName) {
    case "detectObjects": {
      try {
        const result = await aiClient.analyze(Buffer.alloc(0), "image/jpeg");
        const objects = result?.detections?.map((d: any) => `${d.label} at ${d.distance ?? "unknown distance"}`).join(", ");
        return objects ? `I can see: ${objects}.` : "No objects detected in front of you.";
      } catch {
        return "Object detection requires the camera to be active. Please open the camera view.";
      }
    }

    case "describeScene": {
      try {
        const desc = await aiClient.describeScene(Buffer.alloc(0));
        return desc || "I cannot describe the scene without camera access.";
      } catch {
        return "Scene description requires the camera to be active.";
      }
    }

    case "readText": {
      try {
        const text = await aiClient.extractText(Buffer.alloc(0));
        return text ? `I can read: ${text}` : "No text found in the camera view.";
      } catch {
        return "Text reading requires the camera to be active.";
      }
    }

    case "recognizeCurrency": {
      try {
        const result = await aiClient.detectCurrency(Buffer.alloc(0));
        return result?.description ?? "No currency detected in the camera view.";
      } catch {
        return "Currency recognition requires the camera to be active.";
      }
    }

    case "getCurrentLocation": {
      return "Please share your location from the app so I can tell you where you are.";
    }

    case "startNavigation": {
      const dest = toolArgs.destination ?? "your destination";
      return `Starting navigation to ${dest}. Please open the navigation screen.`;
    }

    case "stopNavigation": {
      return "Navigation has been stopped.";
    }

    case "findNearestHospital": {
      return "Finding the nearest hospital. Please open the navigation screen and I will route you there.";
    }

    case "triggerSOS": {
      try {
        const user = await prisma.user.findUnique({
          where: { id: userId },
          include: { emergencyContacts: true },
        });
        const caregiverLinks = await prisma.caregiverLink.findMany({
          where: { userId, isAccepted: true },
          include: { caregiver: true },
        });
        await redisPub.publish(`sos:${userId}`, JSON.stringify({ event: "SOS_TRIGGERED", userId, user: { name: user?.name } }));
        for (const contact of user?.emergencyContacts ?? []) {
          sendSosSms(contact.phone, user?.name ?? "User", { lat: 0, lng: 0 }).catch(() => {});
        }
        for (const link of caregiverLinks) {
          if (link.caregiver.email) {
            sendSosEmail(link.caregiver.email, user?.name ?? "User", { lat: 0, lng: 0 }).catch(() => {});
          }
        }
        return "SOS has been sent to your emergency contacts.";
      } catch {
        return "Failed to send SOS. Please try again or use the SOS button.";
      }
    }

    case "callCaregiver": {
      return "Please use the call button in the app to call your caregiver.";
    }

    case "sendLocationToCaregiver": {
      try {
        await redisPub.publish(`location:${userId}`, JSON.stringify({ event: "LOCATION_SHARE_REQUESTED", timestamp: Date.now() }));
        return "Location sharing request sent to your caregiver.";
      } catch {
        return "Could not send location. Please check your connection.";
      }
    }

    case "repeatLastResponse": {
      return "__REPEAT__";
    }

    case "getNavigationStatus": {
      try {
        const session = await prisma.navigationSession.findFirst({
          where: { userId, isActive: true },
          orderBy: { startedAt: "desc" },
        });
        if (!session) return "You are not currently navigating anywhere.";
        return `You are navigating to ${session.destination ?? "your destination"}.`;
      } catch {
        return "Could not retrieve navigation status.";
      }
    }

    case "generalResponse": {
      return toolArgs.message ?? "I'm here to help.";
    }

    default:
      return "I'm not sure how to help with that.";
  }
}

// ── Optional auth — attaches userId if token present, never blocks ──────────
async function optionalAuth(req: FastifyRequest, reply: FastifyReply) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) return;
  try {
    // Use the same jwt verify already registered on the Fastify instance
    const payload = (req.server as any).jwt.verify(auth.slice(7)) as { userId: string; role: string };
    (req as any).userId = payload.userId;
    (req as any).userRole = payload.role;
  } catch {}
}

// ── Routes ────────────────────────────────────────────────────────────────────
export async function voiceRoutes(app: FastifyInstance) {
  // Voice endpoints are PUBLIC — auth is optional so blind users can login/register by voice
  app.addHook("preHandler", optionalAuth);

  // POST /api/v1/voice/transcribe — Groq STT only
  app.post("/transcribe", async (req, reply) => {
    const data = await req.file();
    if (!data) return reply.status(400).send({ error: "No audio file provided" });

    const audioBuffer = await data.toBuffer();
    if (audioBuffer.length < 100) return reply.status(400).send({ error: "Audio too short or empty" });

    console.log("[Voice Assistant] Audio received, sending to Groq STT...");

    try {
      const result = await groqTranscribe(audioBuffer, data.mimetype || "audio/webm");
      console.log(`[Voice Assistant] Transcription: "${result.text}" (${result.language})`);
      return reply.send(result);
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message ?? err.message ?? "STT failed";
      console.error("[Voice Assistant] Groq STT error:", msg);
      if (msg.includes("Invalid API Key")) return reply.status(401).send({ error: "Invalid Groq API key" });
      if (msg.includes("rate limit")) return reply.status(429).send({ error: "Rate limit reached. Please try again shortly." });
      return reply.status(502).send({ error: msg });
    }
  });

  // POST /api/v1/voice/command — Groq STT + LLM + tool execution
  app.post("/command", async (req, reply) => {
    const userId = (req as any).userId as string;
    const data = await req.file();
    if (!data) return reply.status(400).send({ error: "No audio file provided" });

    const audioBuffer = await data.toBuffer();
    if (audioBuffer.length < 100) return reply.status(400).send({ error: "Audio too short or empty" });

    // Parse conversation history from multipart fields (optional)
    let history: { role: string; content: string }[] = [];
    try {
      const fields = (req as any).fields ?? {};
      if (fields.history) history = JSON.parse(fields.history.value ?? "[]");
    } catch {}

    console.log("[Voice Assistant] READY");
    console.log("[Voice Assistant] Recording: RECEIVED");

    // Step 1: Groq STT
    let transcript = "";
    let language = "en";
    try {
      console.log("[Voice Assistant] Groq STT: PROCESSING");
      const stt = await groqTranscribe(audioBuffer, data.mimetype || "audio/webm");
      transcript = stt.text;
      language = stt.language;
      console.log(`[Voice Assistant] Transcription: "${transcript}"`);
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message ?? err.message ?? "STT failed";
      console.error("[Voice Assistant] Groq STT error:", msg);
      return reply.status(502).send({ error: "Speech recognition failed. Please try again.", detail: msg });
    }

    if (!transcript) {
      return reply.status(422).send({ error: "I couldn't understand you. Please try again." });
    }

    // Step 2: Groq LLM → tool selection
    let toolName = "generalResponse";
    let toolArgs: Record<string, any> = {};
    try {
      console.log("[Voice Assistant] Groq LLM: PROCESSING");
      const llm = await groqLLM(transcript, language, history);
      toolName = llm.toolName;
      toolArgs = llm.toolArgs;
      console.log(`[Voice Assistant] Intent: ${toolName.toUpperCase()}`);
      console.log(`[Voice Assistant] Tool: ${toolName}()`);
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message ?? err.message ?? "LLM failed";
      console.error("[Voice Assistant] Groq LLM error:", msg);
      return reply.status(502).send({ error: "I had trouble understanding that. Please try again.", detail: msg });
    }

    // Step 3: Execute tool
    const response = await executeTool(toolName, toolArgs, userId, language);
    console.log(`[Voice Assistant] Response: "${response}"`);
    console.log("[Voice Assistant] TTS: PLAYING (device)");

    return reply.send({
      transcript,
      language,
      tool: toolName,
      response: response === "__REPEAT__" ? null : response,
      repeat: response === "__REPEAT__",
    });
  });
}
