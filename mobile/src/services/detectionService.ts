import axios from "axios";
import * as FileSystem from "expo-file-system";
import { useSettingsStore } from "@/store/settingsStore";

const API_URL = process.env.EXPO_PUBLIC_API_URL + "/api/v1";

export async function analyzeFrame(imagePath: string): Promise<any> {
  const { offlineMode } = useSettingsStore.getState();

  if (offlineMode) {
    return runOfflineDetection(imagePath);
  }

  try {
    const formData = new FormData();
    formData.append("file", {
      uri: imagePath,
      type: "image/jpeg",
      name: "frame.jpg",
    } as any);

    const token = getStoredToken();
    const response = await axios.post(`${API_URL}/detections/analyze`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      timeout: 10000,
    });

    return response.data;
  } catch {
    // Fallback to offline on network error
    return runOfflineDetection(imagePath);
  }
}

export async function describeScene(imagePath: string): Promise<string> {
  const formData = new FormData();
  formData.append("file", { uri: imagePath, type: "image/jpeg", name: "frame.jpg" } as any);
  const token = getStoredToken();
  const { data } = await axios.post(`${API_URL}/detections/describe`, formData, {
    headers: { "Content-Type": "multipart/form-data", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    timeout: 15000,
  });
  return data.description;
}

export async function extractText(imagePath: string): Promise<string> {
  const formData = new FormData();
  formData.append("file", { uri: imagePath, type: "image/jpeg", name: "frame.jpg" } as any);
  const token = getStoredToken();
  const { data } = await axios.post(`${API_URL}/detections/ocr`, formData, {
    headers: { "Content-Type": "multipart/form-data", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    timeout: 15000,
  });
  return data.text;
}

export async function askVisualQuestion(imagePath: string, question: string): Promise<string> {
  const formData = new FormData();
  formData.append("file", { uri: imagePath, type: "image/jpeg", name: "frame.jpg" } as any);
  const token = getStoredToken();
  const { data } = await axios.post(`${API_URL}/detections/ask`, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
      "x-question": question,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    timeout: 20000,
  });
  return data.answer;
}

// Offline: returns empty detections — real offline model would use ONNX Runtime
async function runOfflineDetection(_imagePath: string): Promise<any> {
  return {
    detections: [],
    modelName: "offline",
    modelVersion: "n/a",
    inferenceMs: 0,
  };
}

function getStoredToken(): string | null {
  try {
    const { useAuthStore } = require("@/store/authStore");
    return useAuthStore.getState().accessToken;
  } catch {
    return null;
  }
}
