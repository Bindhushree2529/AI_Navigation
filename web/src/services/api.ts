import axios from "axios";

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL + "/api/v1",
  timeout: 30000,
});

// Attach access token
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const stored = localStorage.getItem("naviassist-auth");
    if (stored) {
      const { state } = JSON.parse(stored);
      if (state?.accessToken) {
        config.headers.Authorization = `Bearer ${state.accessToken}`;
      }
    }
  }
  return config;
});

// Auto-refresh on 401
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        const stored = localStorage.getItem("naviassist-auth");
        if (!stored) throw new Error("No auth");
        const { state } = JSON.parse(stored);
        const { data } = await axios.post(
          `${process.env.NEXT_PUBLIC_API_URL}/api/v1/auth/refresh`,
          { refreshToken: state.refreshToken }
        );
        // Update store
        const { useAuthStore } = await import("@/store/authStore");
        useAuthStore.getState().setTokens(data.accessToken, data.refreshToken);
        original.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(original);
      } catch {
        const { useAuthStore } = await import("@/store/authStore");
        useAuthStore.getState().logout();
      }
    }
    return Promise.reject(error);
  }
);
