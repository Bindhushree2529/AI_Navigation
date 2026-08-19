import { create } from "zustand";
import { api } from "@/services/api";
import * as Location from "expo-location";

interface NavigationStore {
  isNavigating: boolean;
  sessionId: string | null;
  startSession: () => Promise<void>;
  endSession: () => Promise<void>;
}

export const useNavigationStore = create<NavigationStore>((set, get) => ({
  isNavigating: false,
  sessionId: null,

  startSession: async () => {
    try {
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const { data } = await api.post("/navigation/sessions", {
        mode: "OUTDOOR",
        startLocation: { lat: loc.coords.latitude, lng: loc.coords.longitude },
      });
      set({ isNavigating: true, sessionId: data.id });
    } catch {
      set({ isNavigating: true, sessionId: null });
    }
  },

  endSession: async () => {
    const { sessionId } = get();
    if (sessionId) {
      await api.patch(`/navigation/sessions/${sessionId}/end`).catch(() => {});
    }
    set({ isNavigating: false, sessionId: null });
  },
}));
