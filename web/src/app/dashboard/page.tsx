"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { Loader2 } from "lucide-react";

export default function DashboardPage() {
  const { user, accessToken } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!accessToken || !user) {
      router.replace("/auth/login");
      return;
    }
    if (user.role === "ADMIN") router.replace("/dashboard/admin");
    else if (user.role === "CAREGIVER") router.replace("/dashboard/caregiver");
    else router.replace("/dashboard/user");
  }, [user, accessToken, router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
    </div>
  );
}
