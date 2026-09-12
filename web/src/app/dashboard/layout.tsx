"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { SystemStatusBar } from "@/components/ui/SystemStatusBar";
import { Eye, LogOut, Settings } from "lucide-react";
import Link from "next/link";
import { Loader2 } from "lucide-react";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, accessToken, logout } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!accessToken || !user) router.replace("/auth/login");
  }, [accessToken, user, router]);

  async function handleLogout() {
    await logout();
    router.replace("/");
  }

  if (!user) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-surface px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <Link href="/dashboard" className="flex items-center gap-2 font-bold text-xl text-brand-600">
          <Eye className="h-6 w-6" />
          NaviAssist
        </Link>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground hidden sm:block">{user.name}</span>
          <span className="text-xs bg-brand-100 text-brand-700 px-2 py-1 rounded-full font-medium">{user.role}</span>
          <button onClick={handleLogout} className="btn-ghost p-2 text-red-500" aria-label="Logout">
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </header>
      <SystemStatusBar />
      <main className="max-w-7xl mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  );
}
