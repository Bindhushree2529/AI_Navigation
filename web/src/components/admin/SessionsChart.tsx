"use client";

import { useQuery } from "@tanstack/react-query";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { api } from "@/services/api";
import { format } from "date-fns";

export function SessionsChart() {
  const { data = [], isLoading } = useQuery({
    queryKey: ["admin-sessions-chart"],
    queryFn: () => api.get("/admin/analytics/sessions").then((r) => r.data),
  });

  return (
    <section className="card" aria-labelledby="sessions-chart-heading">
      <h2 id="sessions-chart-heading" className="font-semibold mb-4">Navigation Sessions (30 days)</h2>
      {isLoading ? (
        <div className="h-48 animate-pulse bg-surface rounded-lg" aria-label="Loading chart" />
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
            <defs>
              <linearGradient id="sessionsGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(v) => format(new Date(v), "MMM d")} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip
              labelFormatter={(v) => format(new Date(v), "MMM d, yyyy")}
              contentStyle={{ borderRadius: "8px", fontSize: "12px" }}
            />
            <Area type="monotone" dataKey="count" stroke="#0ea5e9" fill="url(#sessionsGrad)" strokeWidth={2} name="Sessions" />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </section>
  );
}
