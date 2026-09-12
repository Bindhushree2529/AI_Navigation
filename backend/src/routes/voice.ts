import type { FastifyInstance } from "fastify";
import { env } from "../config/env";
import axios from "axios";
import FormData from "form-data";

const GROQ_STT_URL = "https://api.groq.com/openai/v1/audio/transcriptions";
const GROQ_CHAT_URL = "https://api.groq.com/openai/v1/chat/completions";

const SYSTEM_PROMPT = `You are NaviAssist, a voice assistant for visually impaired people.
The user speaks in English, Kannada, Hindi, Telugu, Tamil, Malayalam, or Bengali. Detect the language automatically.

Based on the user's message and conversation history, respond with a JSON object:
{
  "tool": "<tool_name>",
  "response": "<spoken response in same language as user>",
  "repeat": false
}

Available tools:
- login: user wants to login
- register: user wants to register/create account
- navigateTo: user wants directions (include destination in response)
- detectObjects: user wants to detect objects/obstacles
- describeScene: user wants scene description
- readText: user wants to read text/signs
- recognizeCurrency: user wants to identify currency
- triggerSOS: user needs emergency help
- stopNavigation: user wants to stop navigation
- getNavigationStatus: user asks about current navigation
- goToSettings: user wants settings
- goToDashboard: user wants dashboard
- goToDemo: user wants AI demo
- logout: user wants to logout
- whereAmI: user asks for location
- help: user needs help
- repeat: user wants last message repeated
- detectTrafficLight: user asks about traffic lights
- detectZebraCrossing: user asks about zebra crossing or crosswalk
- detectVehicles: user asks about vehicles or traffic
- detectPedestrians: user asks about people nearby
- detectStopSign: user asks about stop signs
- analyzeRoadSafety: user asks about road safety or crossing safety
- findIndoorRoute: user wants to navigate inside a building (extract destination from message)
- getIndoorLocation: user asks where they are inside a building
- getBatteryStatus: user asks about battery level
- enableBatterySaver: user wants to save battery
- getConnectivityStatus: user asks about internet connection
- enableBasicMode: user wants offline/basic mode
- getWeather: user asks about weather conditions
- getWeatherAdvice: user asks for weather-aware navigation advice
- setLanguage: user wants to change language (extract language from message)
- unknown: cannot determine intent

Kannada examples:
- "ನನ್ನ ಮುಂದೆ ಏನಿದೆ?" → detectObjects
- "ಟ್ರಾಫಿಕ್ ಲೈಟ್ ಏನು ಬಣ್ಣ?" → detectTrafficLight
- "ಜೀಬ್ರಾ ಕ್ರಾಸಿಂಗ್ ಇದೆಯೇ?" → detectZebraCrossing
- "ಹವಾಮಾನ ಹೇಗಿದೆ?" → getWeather
- "Room 204 ಗೆ ಹೋಗಬೇಕು" → findIndoorRoute
- "SOS ಕಳುಹಿಸು" → triggerSOS
- "ಕನ್ನಡದಲ್ಲಿ ಮಾತನಾಡು" → setLanguage

Keep responses SHORT (1-2 sentences). Be direct. For visually impaired users.
If user speaks Kannada, respond in Kannada.
If user speaks Hindi, respond in Hindi.
ONLY return valid JSON, nothing else.`;

export async function voiceRoutes(app: FastifyInstance) {

  // STT — transcribe audio using Groq Whisper
  app.post("/transcribe", async (req, reply) => {
    if (!env.GROQ_API_KEY) {
      return reply.status(503).send({ error: "GROQ_API_KEY not configured. Get a free key at console.groq.com" });
    }

    const data = await req.file();
    if (!data) return reply.status(400).send({ error: "Audio file required" });

    const buffer = await data.toBuffer();

    const form = new FormData();
    form.append("file", buffer, { filename: "audio.webm", contentType: data.mimetype });
    form.append("model", "whisper-large-v3-turbo");
    form.append("response_format", "verbose_json");
    // Auto-detect language (supports English + Kannada)

    try {
      const res = await axios.post(GROQ_STT_URL, form, {
        headers: {
          ...form.getHeaders(),
          Authorization: `Bearer ${env.GROQ_API_KEY}`,
        },
        timeout: 30000,
      });
      return { text: res.data.text?.trim() ?? "", language: res.data.language ?? "en" };
    } catch (err: any) {
      const msg = err.response?.data?.error?.message ?? err.message;
      return reply.status(500).send({ error: `STT failed: ${msg}` });
    }
  });

  // Command — transcribe + understand intent via Groq LLM
  app.post("/command", async (req, reply) => {
    if (!env.GROQ_API_KEY) {
      return reply.status(503).send({ error: "GROQ_API_KEY not configured. Get a free key at console.groq.com" });
    }

    const data = await req.file();
    if (!data) return reply.status(400).send({ error: "Audio file required" });

    const buffer = await data.toBuffer();
    const historyRaw = (req.body as any)?.history;
    const history = historyRaw ? JSON.parse(historyRaw) : [];

    // Step 1: transcribe
    const form = new FormData();
    form.append("file", buffer, { filename: "audio.webm", contentType: data.mimetype });
    form.append("model", "whisper-large-v3-turbo");
    form.append("response_format", "verbose_json");

    let transcript = "";
    let language = "en";
    try {
      const sttRes = await axios.post(GROQ_STT_URL, form, {
        headers: { ...form.getHeaders(), Authorization: `Bearer ${env.GROQ_API_KEY}` },
        timeout: 30000,
      });
      transcript = sttRes.data.text?.trim() ?? "";
      language = sttRes.data.language ?? "en";
    } catch (err: any) {
      return reply.status(500).send({ error: "Transcription failed" });
    }

    if (!transcript) return { transcript: "", language, tool: "unknown", response: null, repeat: false };

    // Step 2: understand intent
    const messages = [
      { role: "system", content: SYSTEM_PROMPT },
      ...history.slice(-6),
      { role: "user", content: transcript },
    ];

    try {
      const llmRes = await axios.post(GROQ_CHAT_URL, {
        model: "llama-3.1-8b-instant",
        messages,
        temperature: 0.1,
        max_tokens: 200,
        response_format: { type: "json_object" },
      }, {
        headers: { Authorization: `Bearer ${env.GROQ_API_KEY}`, "Content-Type": "application/json" },
        timeout: 15000,
      });

      const content = llmRes.data.choices[0].message.content;
      const parsed = JSON.parse(content);

      // Extract tool args from transcript for tools that need them
      let toolArgs: Record<string, any> = {};
      if (parsed.tool === "findIndoorRoute") {
        // Extract destination from transcript
        toolArgs.destination = transcript;
      }
      if (parsed.tool === "setLanguage") {
        const langMap: Record<string, string> = {
          kannada: "kn-IN", hindi: "hi-IN", telugu: "te-IN",
          tamil: "ta-IN", malayalam: "ml-IN", bengali: "bn-IN", english: "en-IN",
          "ಕನ್ನಡ": "kn-IN", "हिंदी": "hi-IN",
        };
        const lower = transcript.toLowerCase();
        for (const [key, code] of Object.entries(langMap)) {
          if (lower.includes(key)) { toolArgs.language = code; break; }
        }
      }

      return {
        transcript,
        language,
        tool: parsed.tool ?? "unknown",
        response: parsed.response ?? null,
        repeat: parsed.repeat ?? false,
        toolArgs,
      };
    } catch {
      return { transcript, language, tool: "unknown", response: transcript, repeat: false };
    }
  });
}
