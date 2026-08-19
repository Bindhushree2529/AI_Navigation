import { create } from "zustand";
import { randomUUID } from "crypto";

interface Toast {
  id: string;
  title?: string;
  description?: string;
  variant?: "default" | "success" | "error";
  open: boolean;
}

interface ToastStore {
  toasts: Toast[];
  toast: (opts: Omit<Toast, "id" | "open">) => void;
  dismiss: (id: string) => void;
}

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  toast: (opts) => {
    const id = Math.random().toString(36).slice(2);
    set((s) => ({ toasts: [...s.toasts, { ...opts, id, open: true }] }));
    setTimeout(() => set((s) => ({ toasts: s.toasts.map((t) => (t.id === id ? { ...t, open: false } : t)) })), 4000);
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

export const toast = (opts: Omit<Toast, "id" | "open">) => useToastStore.getState().toast(opts);
