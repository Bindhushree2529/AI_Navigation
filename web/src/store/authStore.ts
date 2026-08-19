import { create } from "zustand";
import { persist } from "zustand/middleware";
import { api } from "@/services/api";

interface User {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  role: "USER" | "CAREGIVER" | "ADMIN";
  avatarUrl?: string;
}

interface AuthStore {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithOtp: (phone: string, otp: string) => Promise<void>;
  logout: () => Promise<void>;
  setTokens: (access: string, refresh: string) => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isLoading: false,

      login: async (email, password) => {
        set({ isLoading: true });
        try {
          const { data } = await api.post("/auth/login", { email, password });
          set({ user: data.user, accessToken: data.accessToken, refreshToken: data.refreshToken });
        } finally {
          set({ isLoading: false });
        }
      },

      loginWithOtp: async (phone, otp) => {
        set({ isLoading: true });
        try {
          const { data } = await api.post("/auth/otp/verify", { phone, otp });
          set({ user: data.user, accessToken: data.accessToken, refreshToken: data.refreshToken });
        } finally {
          set({ isLoading: false });
        }
      },

      logout: async () => {
        const { refreshToken } = get();
        if (refreshToken) {
          await api.post("/auth/logout", { refreshToken }).catch(() => {});
        }
        set({ user: null, accessToken: null, refreshToken: null });
      },

      setTokens: (access, refresh) => set({ accessToken: access, refreshToken: refresh }),
    }),
    {
      name: "naviassist-auth",
      partialize: (s) => ({ user: s.user, accessToken: s.accessToken, refreshToken: s.refreshToken }),
    }
  )
);
