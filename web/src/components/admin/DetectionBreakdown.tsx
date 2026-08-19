"use client";

import { useQuery } from "@tanstack/react-query";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { api } from "@/services/api";

const COLORS = ["#0ea5e9", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#f97316", "#84cc16"];

export function DetectionBreakdown() {
  const { data = [], isLoading } = useQuery({
    queryKey: ["admin-detection-breakdown"],
    queryFn: () => api.get("/admin/detections/breakdown").then((r) => r.data),
  });

  const chartData = data.map((d: any) => ({ name: d.category, value: d._count.id }));

  return (
    <section className="card" aria-labelledby="detection-chart-heading">
      <h2 id="detection-chart-heading" className="font-semibold mb-4">Detection Categories</h2>
      {isLoading ? (
        <div className="h-48 animate-pulse bg-surface rounded-lg" aria-label="Loading chart" />
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie data={chartData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={2}>
              {chartData.map((_: any, i: number) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip contentStyle={{ borderRadius: "8px", fontSize: "12px" }} />
            <Legend iconSize={10} wrapperStyle={{ fontSize: "11px" }} />
          </PieChart>
        </ResponsiveContainer>
      )}
    </section>
  );
}
