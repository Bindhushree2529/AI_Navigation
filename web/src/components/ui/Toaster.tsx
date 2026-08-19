"use client";

import * as Toast from "@radix-ui/react-toast";
import { useToastStore } from "@/store/toastStore";
import { X } from "lucide-react";
import { cn } from "@/utils/cn";

export function Toaster() {
  const { toasts, dismiss } = useToastStore();

  return (
    <Toast.Provider swipeDirection="right">
      {toasts.map((toast) => (
        <Toast.Root
          key={toast.id}
          open={toast.open}
          onOpenChange={(open) => !open && dismiss(toast.id)}
          className={cn(
            "flex items-start gap-3 rounded-xl border p-4 shadow-lg bg-background animate-slide-up",
            "data-[state=closed]:animate-fade-in",
            toast.variant === "error" && "border-red-200 bg-red-50 dark:bg-red-950",
            toast.variant === "success" && "border-green-200 bg-green-50 dark:bg-green-950"
          )}
          aria-live="polite"
        >
          <div className="flex-1">
            {toast.title && <Toast.Title className="font-semibold text-sm">{toast.title}</Toast.Title>}
            {toast.description && <Toast.Description className="text-sm text-muted-foreground mt-1">{toast.description}</Toast.Description>}
          </div>
          <Toast.Close asChild>
            <button className="btn-ghost p-1" aria-label="Dismiss notification">
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </Toast.Close>
        </Toast.Root>
      ))}
      <Toast.Viewport className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 w-full max-w-sm" />
    </Toast.Provider>
  );
}
