import { create } from "zustand";
import * as SecureStore from "expo-secure-store";
import { api } from "@/services/api";

interface User {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  role: "USER" | "CAREGIVER" | "ADMIN";
}

interface AuthStore {
  user: User | null;
  accessToken: string | null;
  isLoading: boolean;
  initialize: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  loginWithOtp: (phone: string, otp: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: null,
  accessToken: null,
  isLoading: false,

  initialize: async () => {
    const token = await SecureStore.getItemAsync("accessToken");
    if (!token) return;
    try {
      const { data } = await api.get("/auth/me");
      set({ user: data, accessToken: token });
    } catch {
      await SecureStore.deleteItemAsync("accessToken");
      await SecureStore.deleteItemAsync("refreshToken");
    }
  },

  login: async (email, password) => {
    set({ isLoading: true });
    try {
      const { data } = await api.post("/auth/login", { email, password });
      await SecureStore.setItemAsync("accessToken", data.accessToken);
      await SecureStore.setItemAsync("refreshToken", data.refreshToken);
      set({ user: data.user, accessToken: data.accessToken });
    } finally {
      set({ isLoading: false });
    }
  },

  loginWithOtp: async (phone, otp) => {
    set({ isLoading: true });
    try {
      const { data } = await api.post("/auth/otp/verify", { phone, otp });
      await SecureStore.setItemAsync("accessToken", data.accessToken);
      await SecureStore.setItemAsync("refreshToken", data.refreshToken);
      set({ user: data.user, accessToken: data.accessToken });
    } finally {
      set({ isLoading: false });
    }
  },

  logout: async () => {
    const refreshToken = await SecureStore.getItemAsync("refreshToken");
    if (refreshToken) {
      await api.post("/auth/logout", { refreshToken }).catch(() => {});
    }
    await SecureStore.deleteItemAsync("accessToken");
    await SecureStore.deleteItemAsync("refreshToken");
    set({ user: null, accessToken: null });
  },
}));
