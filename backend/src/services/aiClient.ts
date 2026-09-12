import axios from "axios";
import FormData from "form-data";
import { env } from "../config/env";

const http = axios.create({ baseURL: env.AI_ENGINE_URL, timeout: 30000 });

export const aiClient = {
  // ── Existing ──────────────────────────────────────────────────────────────
  async analyze(imageBuffer: Buffer, mimeType: string) {
    const form = new FormData();
    form.append("file", imageBuffer, { filename: "frame.jpg", contentType: mimeType });
    const { data } = await http.post("/api/detect", form, { headers: form.getHeaders() });
    return data;
  },

  async describeScene(imageBuffer: Buffer) {
    const form = new FormData();
    form.append("file", imageBuffer, { filename: "frame.jpg", contentType: "image/jpeg" });
    const { data } = await http.post("/api/describe", form, { headers: form.getHeaders() });
    return data.description as string;
  },

  async extractText(imageBuffer: Buffer) {
    const form = new FormData();
    form.append("file", imageBuffer, { filename: "frame.jpg", contentType: "image/jpeg" });
    const { data } = await http.post("/api/ocr", form, { headers: form.getHeaders() });
    return data.text as string;
  },

  async detectCurrency(imageBuffer: Buffer) {
    const form = new FormData();
    form.append("file", imageBuffer, { filename: "frame.jpg", contentType: "image/jpeg" });
    const { data } = await http.post("/api/currency", form, { headers: form.getHeaders() });
    return data;
  },

  async visualQA(imageBuffer: Buffer, question: string) {
    const form = new FormData();
    form.append("file", imageBuffer, { filename: "frame.jpg", contentType: "image/jpeg" });
    form.append("question", question);
    const { data } = await http.post("/api/visual-qa", form, { headers: form.getHeaders() });
    return data.answer as string;
  },

  // ── Traffic & Road Safety ─────────────────────────────────────────────────
  async analyzeTraffic(imageBuffer: Buffer) {
    const form = new FormData();
    form.append("file", imageBuffer, { filename: "frame.jpg", contentType: "image/jpeg" });
    const { data } = await http.post("/api/traffic", form, { headers: form.getHeaders() });
    return data;
  },

  async analyzeRoadSafety(imageBuffer: Buffer) {
    const form = new FormData();
    form.append("file", imageBuffer, { filename: "frame.jpg", contentType: "image/jpeg" });
    const { data } = await http.post("/api/road-safety", form, { headers: form.getHeaders() });
    return data;
  },

  // ── Indoor Navigation ─────────────────────────────────────────────────────
  async getIndoorBuildings() {
    const { data } = await http.get("/api/indoor/buildings");
    return data;
  },

  async getIndoorMap(buildingId: string) {
    const { data } = await http.get(`/api/indoor/map/${buildingId}`);
    return data;
  },

  async getIndoorRoute(params: {
    buildingId?: string;
    startId?: string;
    startLabel?: string;
    destination: string;
    preferAccessible?: boolean;
  }) {
    const { data } = await http.post("/api/indoor/route", params);
    return data;
  },

  async getIndoorLocations(buildingId: string) {
    const { data } = await http.get(`/api/indoor/locations/${buildingId}`);
    return data;
  },

  // ── Weather ───────────────────────────────────────────────────────────────
  async getWeather(lat: number, lng: number) {
    const { data } = await http.get("/api/weather/current", { params: { lat, lng } });
    return data;
  },

  async getWeatherAdvice(lat: number, lng: number) {
    const { data } = await http.get("/api/weather/route-advice", { params: { lat, lng } });
    return data;
  },
};
