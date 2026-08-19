"use client";

import { useQuery } from "@tanstack/react-query";
import { Users, Activity, AlertTriangle, Eye, TrendingUp } from "lucide-react";
import { api } from "@/services/api";

interface Stats {
  totalUsers: number;
  activeUsers: number;
  totalSessions: number;
  activeSessions: number;
  totalDetections: number;
  totalSos: number;
  avgConfidence: number;
}

const STAT_CARDS = (s: Stats) => [
  { label: "Total Users", value: s.totalUsers.toLocaleString(), icon: Users, color: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-950" },
  { label: "Active Today", value: s.activeUsers.toLocaleString(), icon: Activity, color: "text-green-500", bg: "bg-green-50 dark:bg-green-950" },
  { label: "Total Sessions", value: s.totalSessions.toLocaleString(), icon: TrendingUp, color: "text-purple-500", bg: "bg-purple-50 dark:bg-purple-950" },
  { label: "Live Sessions", value: s.activeSessions.toLocaleString(), icon: Eye, color: "text-brand-500", bg: "bg-brand-50 dark:bg-brand-950" },
  { label: "AI Detections", value: s.totalDetections.toLocaleString(), icon: Eye, color: "text-teal-500", bg: "bg-teal-50 dark:bg-teal-950" },
  { label: "SOS Events", value: s.totalSos.toLocaleString(), icon: AlertTriangle, color: "text-red-500", bg: "bg-red-50 dark:bg-red-950" },
];

export function AdminStats() {
  const { data, isLoading } = useQuery<Stats>({
    queryKey: ["admin-stats"],
    queryFn: () => api.get("/admin/stats").then((r) => r.data),
    refetchInterval: 30000,
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6" aria-busy="true" aria-label="Loading statistics">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="card animate-pulse h-24 bg-surface" />
        ))}
      </div>
    );
  }

  if (!data) return null;

  return (
    <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
      {STAT_CARDS(data).map((card) => (
        <div key={card.label} className="card">
          <div className={`inline-flex rounded-lg p-2 ${card.bg} mb-3`} aria-hidden="true">
            <card.icon className={`h-5 w-5 ${card.color}`} />
          </div>
          <dt className="text-xs text-muted-foreground">{card.label}</dt>
          <dd className="text-2xl font-bold mt-1">{card.value}</dd>
        </div>
      ))}
    </dl>
  );
}
