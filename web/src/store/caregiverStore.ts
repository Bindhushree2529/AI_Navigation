import { create } from "zustand";

interface CaregiverStore {
  selectedUserId: string | null;
  setSelectedUser: (id: string | null) => void;
  liveLocations: Record<string, { lat: number; lng: number; timestamp: number }>;
  updateLocation: (userId: string, location: { lat: number; lng: number; timestamp: number }) => void;
}

export const useCaregiverStore = create<CaregiverStore>((set) => ({
  selectedUserId: null,
  setSelectedUser: (id) => set({ selectedUserId: id }),
  liveLocations: {},
  updateLocation: (userId, location) =>
    set((s) => ({ liveLocations: { ...s.liveLocations, [userId]: location } })),
}));
