"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/services/api";
import { useAuthStore } from "@/store/authStore";
import { formatDistanceToNow, format } from "date-fns";
import {
  User, MapPin, AlertTriangle, CheckCircle, Plus, Trash2,
  Navigation, Eye, Phone, Loader2, RefreshCw, Activity
} from "lucide-react";

export default function CaregiverDashboardPage() {
  const { user: authUser, accessToken } = useAuthStore();
  const qc = useQueryClient();
  const [hydrated, setHydrated] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [linkError, setLinkError] = useState("");
  const [liveLocation, setLiveLocation] = useState<{ lat: number; lng: number; timestamp: number } | null>(null);
  const [liveAlerts, setLiveAlerts] = useState<any[]>([]);
  const wsRef = useRef<WebSocket | null>(null);

  // Wait for Zustand to hydrate from localStorage before firing queries
  useEffect(() => { setHydrated(true); }, []);

  // Fetch users I care for
  const { data: users = [], isLoading: loadingUsers, refetch: refetchUsers } = useQuery({
    queryKey: ["caregiver-users"],
    queryFn: () => api.get("/caregiver/users").then((r) => r.data),
    enabled: hydrated && !!accessToken,
    refetchInterval: 30000,
    staleTime: 0,
    gcTime: 0,
  });

  // Fetch selected user's SOS history
  const { data: sosHistory = [] } = useQuery({
    queryKey: ["caregiver-sos", selectedUserId],
    queryFn: () => api.get(`/caregiver/users/${selectedUserId}/sos`).then((r) => r.data),
    enabled: !!selectedUserId,
  });

  // Fetch selected user's navigation sessions
  const { data: navSessions = [] } = useQuery({
    queryKey: ["caregiver-sessions", selectedUserId],
    queryFn: () => api.get(`/caregiver/users/${selectedUserId}/sessions`).then((r) => r.data),
    enabled: !!selectedUserId,
  });

  // Fetch selected user's active session
  const { data: activeSession } = useQuery({
    queryKey: ["caregiver-active-session", selectedUserId],
    queryFn: () => api.get(`/caregiver/users/${selectedUserId}/session`).then((r) => r.data),
    enabled: !!selectedUserId,
    refetchInterval: 10000,
  });

  // Link user by email
  const linkMutation = useMutation({
    mutationFn: (email: string) => api.post("/caregiver/link-by-email", { email }),
    onSuccess: () => {
      setEmail("");
      setLinkError("");
      // Force refetch with a small delay to ensure DB write is committed
      setTimeout(() => refetchUsers(), 300);
    },
    onError: (e: any) => setLinkError(e.response?.data?.error ?? "Failed to link user"),
  });

  // Remove user
  const removeMutation = useMutation({
    mutationFn: (userId: string) => api.delete(`/caregiver/users/${userId}`),
    onSuccess: () => {
      setSelectedUserId(null);
      setTimeout(() => refetchUsers(), 300);
    },
  });

  // WebSocket for live location + SOS alerts
  useEffect(() => {
    if (!accessToken) return;
    const ws = new WebSocket(`${process.env.NEXT_PUBLIC_WS_URL}?token=${accessToken}`);
    wsRef.current = ws;

    ws.onopen = () => {
      if (selectedUserId) ws.send(JSON.stringify({ type: "WATCH_USER", userId: selectedUserId }));
    };
    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data);
      if (msg.type === "LOCATION_UPDATE") {
        setLiveLocation({ lat: msg.lat, lng: msg.lng, timestamp: msg.timestamp });
      }
      if (msg.type === "SOS_ALERT") {
        setLiveAlerts((p) => [{ ...msg.sos, userName: msg.user?.name, createdAt: new Date().toISOString(), status: "ACTIVE" }, ...p]);
        if (Notification.permission === "granted") {
          new Notification(`🚨 SOS from ${msg.user?.name}`, { body: "Tap to view location" });
        }
      }
    };
    return () => ws.close();
  }, [accessToken]);

  // Re-subscribe when selected user changes
  useEffect(() => {
    setLiveLocation(null);
    if (wsRef.current?.readyState === WebSocket.OPEN && selectedUserId) {
      wsRef.current.send(JSON.stringify({ type: "WATCH_USER", userId: selectedUserId }));
    }
    if (Notification.permission === "default") Notification.requestPermission();
  }, [selectedUserId]);

  // Auto-select first user
  useEffect(() => {
    if (users.length > 0 && !selectedUserId) {
      setSelectedUserId(users[0].id);
    }
  }, [users]);

  const selectedUser = users.find((u: any) => u.id === selectedUserId);
  const allSos = [...liveAlerts.filter((a) => a.userId === selectedUserId || !selectedUserId), ...sosHistory].slice(0, 10);

  const fc = "w-full rounded-xl border px-4 py-3 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-brand-500";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Caregiver Dashboard</h1>
        <p className="text-muted-foreground mt-1">Monitor and support the people in your care</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── Left: User list + Add user ─────────────────────────────────── */}
        <div className="space-y-4">
          {/* Add user by email */}
          <div className="card space-y-3">
            <h2 className="font-semibold flex items-center gap-2">
              <Plus className="h-4 w-4 text-brand-600" /> Add User to Care For
            </h2>
            <p className="text-xs text-muted-foreground">Enter the email address of the visually impaired user you are caring for.</p>
            <input
              value={email}
              onChange={(e) => { setEmail(e.target.value); setLinkError(""); }}
              placeholder="user@gmail.com"
              type="email"
              className={fc}
              onKeyDown={(e) => e.key === "Enter" && email && linkMutation.mutate(email)}
            />
            {linkError && <p className="text-xs text-red-500">{linkError}</p>}
            <button
              onClick={() => email && linkMutation.mutate(email)}
              disabled={!email || linkMutation.isPending}
              className="btn-primary w-full"
            >
              {linkMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              {linkMutation.isPending ? "Linking..." : "Add User"}
            </button>
            {linkMutation.isSuccess && (
              <p className="text-xs text-green-600 flex items-center gap-1">
                <CheckCircle className="h-3 w-3" /> User linked successfully
              </p>
            )}
          </div>

          {/* User list */}
          <div className="card space-y-3">
            <h2 className="font-semibold flex items-center gap-2">
              <User className="h-4 w-4" /> People in Your Care
              {loadingUsers
                ? <Loader2 className="h-3 w-3 animate-spin ml-auto" />
                : <button onClick={() => refetchUsers()} className="ml-auto p-1 hover:text-brand-600" aria-label="Refresh list"><RefreshCw className="h-3 w-3" /></button>
              }
            </h2>
            {users.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                No users linked yet. Add a user by their email above.
              </p>
            ) : (
              <ul className="space-y-2">
                {users.map((u: any) => (
                  <li key={u.id}>
                    <button
                      onClick={() => setSelectedUserId(u.id === selectedUserId ? null : u.id)}
                      className={`w-full text-left rounded-xl border p-3 transition-colors hover:bg-surface flex items-center gap-3 ${selectedUserId === u.id ? "border-brand-500 bg-brand-50 dark:bg-brand-950/30" : ""}`}
                    >
                      <div className="h-9 w-9 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 font-bold text-sm shrink-0">
                        {u.name[0].toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{u.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                        <p className="text-xs text-muted-foreground">
                          {u.lastSeenAt ? `Last seen ${formatDistanceToNow(new Date(u.lastSeenAt), { addSuffix: true })}` : "Never seen"}
                        </p>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); if (confirm(`Remove ${u.name}?`)) removeMutation.mutate(u.id); }}
                        className="p-1 text-red-400 hover:text-red-600 shrink-0"
                        aria-label="Remove user"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* ── Right: Monitoring panels ───────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-5">
          {!selectedUserId ? (
            <div className="card flex items-center justify-center h-48 text-muted-foreground text-sm">
              Select a user from the left to monitor them
            </div>
          ) : (
            <>
              {/* User info bar */}
              <div className="card flex items-center gap-4 py-3">
                <div className="h-10 w-10 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 font-bold shrink-0">
                  {selectedUser?.name[0].toUpperCase()}
                </div>
                <div className="flex-1">
                  <p className="font-semibold">{selectedUser?.name}</p>
                  <p className="text-xs text-muted-foreground">{selectedUser?.email} {selectedUser?.phone && `· ${selectedUser.phone}`}</p>
                </div>
                {selectedUser?.phone && (
                  <a href={`tel:${selectedUser.phone}`} className="btn-primary px-4 py-2 text-sm flex items-center gap-2">
                    <Phone className="h-4 w-4" /> Call
                  </a>
                )}
                <div className={`text-xs px-2 py-1 rounded-full font-medium ${activeSession ? "bg-green-100 text-green-700 animate-pulse" : "bg-gray-100 text-gray-500"}`}>
                  {activeSession ? "● Navigating" : "Idle"}
                </div>
              </div>

              {/* Live location */}
              <div className="card space-y-3">
                <h2 className="font-semibold flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-brand-500" /> Live Location
                  {liveLocation && (
                    <span className="ml-auto text-xs text-muted-foreground">
                      Updated {formatDistanceToNow(new Date(liveLocation.timestamp), { addSuffix: true })}
                    </span>
                  )}
                </h2>
                {liveLocation ? (
                  <div className="space-y-2">
                    <div className="rounded-xl overflow-hidden border h-56">
                      <iframe
                        key={`${liveLocation.lat.toFixed(4)}-${liveLocation.lng.toFixed(4)}`}
                        title="Live location"
                        width="100%" height="100%"
                        src={`https://www.openstreetmap.org/export/embed.html?bbox=${liveLocation.lng - 0.003},${liveLocation.lat - 0.003},${liveLocation.lng + 0.003},${liveLocation.lat + 0.003}&layer=mapnik&marker=${liveLocation.lat},${liveLocation.lng}`}
                        loading="lazy"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 text-xs text-green-600 font-medium">
                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse inline-block" />
                        Live
                      </span>
                      <p className="text-xs text-muted-foreground flex-1">
                        {liveLocation.lat.toFixed(5)}, {liveLocation.lng.toFixed(5)}
                        {" · "}{new Date(liveLocation.timestamp).toLocaleTimeString()}
                      </p>
                      <a
                        href={`https://maps.google.com/?q=${liveLocation.lat},${liveLocation.lng}`}
                        target="_blank" rel="noopener noreferrer"
                        className="text-xs bg-brand-600 text-white px-3 py-1 rounded-lg hover:bg-brand-700"
                      >
                        Google Maps
                      </a>
                    </div>
                  </div>
                ) : (
                  <div className="h-40 flex flex-col items-center justify-center text-muted-foreground text-sm gap-2 bg-surface rounded-xl">
                    <MapPin className="h-8 w-8 opacity-30" />
                    <p>Waiting for location update...</p>
                    <p className="text-xs">Location updates when user is navigating</p>
                  </div>
                )}
              </div>

              {/* Active navigation */}
              {activeSession && (
                <div className="card border-green-300 bg-green-50 dark:bg-green-950/20 space-y-2">
                  <h2 className="font-semibold flex items-center gap-2 text-green-700">
                    <Navigation className="h-4 w-4" /> Currently Navigating
                  </h2>
                  <p className="text-sm">Destination: <strong>{activeSession.destination ?? "Unknown"}</strong></p>
                  <p className="text-xs text-muted-foreground">
                    Started {formatDistanceToNow(new Date(activeSession.startedAt), { addSuffix: true })}
                  </p>
                </div>
              )}

              {/* SOS Alerts */}
              <div className="card space-y-3">
                <h2 className="font-semibold flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-500" /> SOS Alerts
                  {liveAlerts.length > 0 && (
                    <span className="ml-auto rounded-full bg-red-500 text-white text-xs font-bold px-2 py-0.5 animate-pulse">
                      {liveAlerts.length} NEW
                    </span>
                  )}
                </h2>
                {allSos.length === 0 ? (
                  <div className="flex items-center gap-2 text-sm text-green-600 py-2">
                    <CheckCircle className="h-4 w-4" /> No SOS alerts. All clear.
                  </div>
                ) : (
                  <ul className="space-y-2">
                    {allSos.map((alert: any, i: number) => {
                      let loc: any = null;
                      try { loc = typeof alert.location === "string" ? JSON.parse(alert.location) : alert.location; } catch {}
                      return (
                        <li key={alert.id ?? i} className={`flex items-center justify-between rounded-xl border p-3 ${alert.status === "ACTIVE" ? "border-red-300 bg-red-50 dark:bg-red-950/30" : ""}`}>
                          <div>
                            <p className="font-medium text-sm">{alert.userName ?? selectedUser?.name}</p>
                            <p className="text-xs text-muted-foreground">{format(new Date(alert.createdAt), "MMM d, HH:mm:ss")}</p>
                            {alert.message && <p className="text-xs mt-0.5">{alert.message}</p>}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`text-xs rounded-full px-2 py-0.5 ${alert.status === "ACTIVE" ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}>
                              {alert.status}
                            </span>
                            {loc?.lat && (
                              <a href={`https://maps.google.com/?q=${loc.lat},${loc.lng}`} target="_blank" rel="noopener noreferrer"
                                className="text-xs text-brand-600 hover:underline">Map</a>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              {/* Navigation history */}
              <div className="card space-y-3">
                <h2 className="font-semibold flex items-center gap-2">
                  <Activity className="h-4 w-4 text-brand-500" /> Navigation History
                </h2>
                {navSessions.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-2">No navigation sessions yet.</p>
                ) : (
                  <ul className="divide-y divide-border">
                    {navSessions.slice(0, 10).map((s: any) => (
                      <li key={s.id} className="py-2 flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{s.destination ?? "Unknown destination"}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(s.startedAt), "MMM d, HH:mm")}
                            {s.distanceM && ` · ${(s.distanceM / 1000).toFixed(1)} km`}
                          </p>
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${s.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                          {s.isActive ? "Active" : "Done"}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
