import { AdminStats } from "@/components/admin/AdminStats";
import { DetectionBreakdown } from "@/components/admin/DetectionBreakdown";
import { SessionsChart } from "@/components/admin/SessionsChart";
import { RecentSos } from "@/components/admin/RecentSos";
import { UserTable } from "@/components/admin/UserTable";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Admin Dashboard" };

export default function AdminDashboardPage() {
  return (
    <div className="space-y-8" role="main" aria-label="Admin dashboard">
      <div>
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground mt-1">Platform overview and analytics</p>
      </div>
      <AdminStats />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <SessionsChart />
        <DetectionBreakdown />
      </div>
      <RecentSos />
      <UserTable />
    </div>
  );
}
