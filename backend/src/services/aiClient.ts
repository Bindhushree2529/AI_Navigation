import axios from "axios";
import FormData from "form-data";
import { env } from "../config/env";

const http = axios.create({ baseURL: env.AI_ENGINE_URL, timeout: 30000 });

export const aiClient = {
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
};
