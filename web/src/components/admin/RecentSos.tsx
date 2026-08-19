"use client";

import { useQuery } from "@tanstack/react-query";
import { AlertTriangle } from "lucide-react";
import { api } from "@/services/api";
import { format } from "date-fns";

export function RecentSos() {
  const { data = [], isLoading } = useQuery({
    queryKey: ["admin-sos"],
    queryFn: () => api.get("/admin/sos?status=ACTIVE").then((r) => r.data),
    refetchInterval: 15000,
  });

  return (
    <section className="card" aria-labelledby="sos-heading" aria-live="polite">
      <div className="flex items-center gap-2 mb-4">
        <AlertTriangle className="h-5 w-5 text-red-500" aria-hidden="true" />
        <h2 id="sos-heading" className="font-semibold">Active SOS Events</h2>
        {data.length > 0 && (
          <span className="ml-auto rounded-full bg-red-100 text-red-700 text-xs font-bold px-2 py-0.5" aria-label={`${data.length} active SOS events`}>
            {data.length}
          </span>
        )}
      </div>
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => <div key={i} className="h-12 animate-pulse bg-surface rounded-lg" />)}
        </div>
      ) : data.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">No active SOS events</p>
      ) : (
        <ul className="space-y-2" role="list">
          {data.map((sos: any) => (
            <li key={sos.id} className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/30 p-3">
              <div>
                <p className="font-medium text-sm">{sos.user?.name}</p>
                <p className="text-xs text-muted-foreground">{format(new Date(sos.createdAt), "MMM d, HH:mm")}</p>
              </div>
              <a
                href={`https://maps.google.com/?q=${sos.location.lat},${sos.location.lng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-brand-600 hover:underline"
                aria-label={`View ${sos.user?.name}'s location on map`}
              >
                View Map
              </a>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
