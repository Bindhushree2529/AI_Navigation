"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/services/api";
import { useState } from "react";
import { format } from "date-fns";

export function UserTable() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["admin-users", page, search],
    queryFn: () => api.get(`/admin/users?page=${page}&limit=20&search=${search}`).then((r) => r.data),
  });

  const toggle = useMutation({
    mutationFn: (id: string) => api.patch(`/admin/users/${id}/toggle`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-users"] }),
  });

  return (
    <section className="card" aria-labelledby="users-table-heading">
      <div className="flex items-center justify-between mb-4 gap-4 flex-wrap">
        <h2 id="users-table-heading" className="font-semibold">Users</h2>
        <input
          type="search"
          placeholder="Search users..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="rounded-lg border px-3 py-2 text-sm bg-background w-48"
          aria-label="Search users"
        />
      </div>

      <div className="overflow-x-auto" role="region" aria-label="Users table" tabIndex={0}>
        <table className="w-full text-sm" aria-busy={isLoading}>
          <thead>
            <tr className="border-b text-left text-muted-foreground">
              <th className="pb-3 font-medium" scope="col">Name</th>
              <th className="pb-3 font-medium" scope="col">Email/Phone</th>
              <th className="pb-3 font-medium" scope="col">Role</th>
              <th className="pb-3 font-medium" scope="col">Joined</th>
              <th className="pb-3 font-medium" scope="col">Status</th>
              <th className="pb-3 font-medium" scope="col">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 6 }).map((_, j) => (
                      <td key={j} className="py-3 pr-4"><div className="h-4 animate-pulse bg-surface rounded" /></td>
                    ))}
                  </tr>
                ))
              : data?.users.map((user: any) => (
                  <tr key={user.id} className="border-b last:border-0 hover:bg-surface/50">
                    <td className="py-3 pr-4 font-medium">{user.name}</td>
                    <td className="py-3 pr-4 text-muted-foreground">{user.email || user.phone}</td>
                    <td className="py-3 pr-4">
                      <span className="rounded-full bg-brand-100 text-brand-700 text-xs px-2 py-0.5">{user.role}</span>
                    </td>
                    <td className="py-3 pr-4 text-muted-foreground">{format(new Date(user.createdAt), "MMM d, yyyy")}</td>
                    <td className="py-3 pr-4">
                      <span className={`rounded-full text-xs px-2 py-0.5 ${user.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                        {user.isActive ? "Active" : "Suspended"}
                      </span>
                    </td>
                    <td className="py-3">
                      <button
                        onClick={() => toggle.mutate(user.id)}
                        className="text-xs text-brand-600 hover:underline"
                        aria-label={`${user.isActive ? "Suspend" : "Activate"} ${user.name}`}
                      >
                        {user.isActive ? "Suspend" : "Activate"}
                      </button>
                    </td>
                  </tr>
                ))}
          </tbody>
        </table>
      </div>

      {data && (
        <div className="flex items-center justify-between mt-4 text-sm text-muted-foreground">
          <span>{data.total} total users</span>
          <div className="flex gap-2">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="btn-ghost px-3 py-1 text-xs disabled:opacity-50" aria-label="Previous page">
              Previous
            </button>
            <span className="px-3 py-1">Page {page}</span>
            <button onClick={() => setPage((p) => p + 1)} disabled={page * 20 >= data.total} className="btn-ghost px-3 py-1 text-xs disabled:opacity-50" aria-label="Next page">
              Next
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
