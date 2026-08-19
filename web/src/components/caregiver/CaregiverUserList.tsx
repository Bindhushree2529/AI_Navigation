"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/services/api";
import { useCaregiverStore } from "@/store/caregiverStore";
import { User, MapPin } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/utils/cn";

export function CaregiverUserList() {
  const { selectedUserId, setSelectedUser } = useCaregiverStore();

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["caregiver-users"],
    queryFn: () => api.get("/caregiver/users").then((r) => r.data),
    refetchInterval: 30000,
  });

  return (
    <section className="card" aria-labelledby="users-list-heading">
      <h2 id="users-list-heading" className="font-semibold mb-4 flex items-center gap-2">
        <User className="h-5 w-5" aria-hidden="true" />
        People in Your Care
      </h2>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-16 animate-pulse bg-surface rounded-xl" />)}
        </div>
      ) : users.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">
          No users linked yet. Share your caregiver code with users to connect.
        </p>
      ) : (
        <ul className="space-y-2" role="list">
          {users.map((user: any) => (
            <li key={user.id}>
              <button
                onClick={() => setSelectedUser(user.id)}
                className={cn(
                  "w-full text-left rounded-xl border p-3 transition-colors hover:bg-surface",
                  selectedUserId === user.id && "border-brand-500 bg-brand-50 dark:bg-brand-950/30"
                )}
                aria-pressed={selectedUserId === user.id}
                aria-label={`Select ${user.name}`}
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 font-bold text-sm" aria-hidden="true">
                    {user.name[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{user.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {user.lastSeenAt
                        ? `Last seen ${formatDistanceToNow(new Date(user.lastSeenAt), { addSuffix: true })}`
                        : "Never seen"}
                    </p>
                  </div>
                  <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" aria-hidden="true" />
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
