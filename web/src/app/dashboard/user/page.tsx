"use client";

import { useAuthStore } from "@/store/authStore";
import { useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Eye, MapPin, Settings, LogOut, Phone, Plus, Trash2, Loader2, CheckCircle, FileText, DollarSign, Radio } from "lucide-react";
import Link from "next/link";
import { speak } from "@/utils/speak";
import { api } from "@/services/api";
import { voiceCommandBus } from "@/utils/voiceCommandBus";

export default function UserDashboardPage() {
  const { user, accessToken, logout } = useAuthStore();
  const router = useRouter();
  const qc = useQueryClient();
  const [sosSending, setSosSending] = useState(false);
  const [sosSuccess, setSosSuccess] = useState(false);
  const [locationStatus, setLocationStatus] = useState<"off" | "on" | "denied">("off");
  const [currentCoords, setCurrentCoords] = useState<{ lat: number; lng: number } | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const locationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Continuous location tracking — sends to backend every 5s ─────────────
  function startLocationTracking() {
    if (!navigator.geolocation) return;
    // Watch position continuously
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setCurrentCoords(coords);
        setLocationStatus("on");
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) setLocationStatus("denied");
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
    );
    // Push to backend every 5 seconds so caregiver sees live updates
    locationIntervalRef.current = setInterval(async () => {
      if (!currentCoordsRef.current) return;
      try {
        await api.post("/navigation/location", currentCoordsRef.current);
      } catch {}
    }, 5000);
  }

  // Use a ref so the interval always has the latest coords
  const currentCoordsRef = useRef<{ lat: number; lng: number } | null>(null);
  useEffect(() => { currentCoordsRef.current = currentCoords; }, [currentCoords]);

  function stopLocationTracking() {
    if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
    if (locationIntervalRef.current) clearInterval(locationIntervalRef.current);
    watchIdRef.current = null;
    locationIntervalRef.current = null;
    setLocationStatus("off");
  }

  // Emergency contacts
  const { data: contacts = [], isLoading: loadingContacts } = useQuery({
    queryKey: ["my-contacts"],
    queryFn: () => api.get("/caregiver/my-contacts").then((r) => r.data),
    enabled: !!accessToken,
  });

  const [newContact, setNewContact] = useState({ name: "", phone: "", relation: "Caregiver" });
  const [contactError, setContactError] = useState("");

  const addContact = useMutation({
    mutationFn: () => api.post("/caregiver/add-my-caregiver", newContact),
    onSuccess: () => {
      setNewContact({ name: "", phone: "", relation: "Caregiver" });
      setContactError("");
      qc.invalidateQueries({ queryKey: ["my-contacts"] });
    },
    onError: (e: any) => setContactError(e.response?.data?.error ?? "Failed to add contact"),
  });

  const removeContact = useMutation({
    mutationFn: (id: string) => api.delete(`/caregiver/my-contacts/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["my-contacts"] }),
  });

  async function triggerSos() {
    if (!navigator.geolocation) { speak("Location not available."); return; }
    setSosSending(true);
    speak("Sending SOS. Help is on the way.");
    // Use already-tracked coords if available, else get fresh
    const sendSos = async (coords: { lat: number; lng: number }) => {
      try {
        await api.post("/sos", { location: coords });
        setSosSuccess(true);
        speak("SOS sent. Your caregivers have been notified.");
        setTimeout(() => setSosSuccess(false), 5000);
      } catch { speak("Failed to send SOS. Please call emergency services directly."); }
      finally { setSosSending(false); }
    };
    if (currentCoordsRef.current) {
      await sendSos(currentCoordsRef.current);
    } else {
      navigator.geolocation.getCurrentPosition(
        (pos) => sendSos({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => { speak("Location permission denied. Cannot send SOS."); setSosSending(false); }
      );
    }
  }

  useEffect(() => {
    if (!accessToken || !user) { router.replace("/auth/login"); return; }
    speak(`Welcome back, ${user.name}. You can say: navigation, object detection, read text, SOS, or settings.`);
    // Start location tracking automatically
    startLocationTracking();
    const unregister = voiceCommandBus.register((command) => {
      if (command === "sos") { triggerSos(); return true; }
      if (command === "logout") { handleLogout(); return true; }
      return false;
    });
    return () => {
      unregister();
      stopLocationTracking();
    };
  }, [accessToken, user]);

  async function handleLogout() { await logout(); router.replace("/"); }

  if (!user) return null;

  const fc = "w-full rounded-xl border px-4 py-3 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-brand-500";

  const features = [
    { icon: Eye, label: "Object Detection", desc: "Detect obstacles in real-time", href: "/demo", color: "text-blue-500" },
    { icon: MapPin, label: "Navigation", desc: "Walking directions to destination", href: "/dashboard/navigation", color: "text-green-500" },
    { icon: FileText, label: "Read Text (OCR)", desc: "Read text from camera", href: "/demo", color: "text-orange-500" },
    { icon: DollarSign, label: "Currency", desc: "Identify currency notes", href: "/demo", color: "text-yellow-500" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-surface px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2 font-bold text-xl text-brand-600">
          <Eye className="h-6 w-6" /> NaviAssist
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground hidden sm:block">Hello, {user.name}</span>
          <Link href="/dashboard/settings" className="btn-ghost p-2" aria-label="Settings">
            <Settings className="h-5 w-5" />
          </Link>
          <button onClick={handleLogout} className="btn-ghost p-2 text-red-500" aria-label="Logout">
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        <div>
          <h1 className="text-2xl font-bold">Welcome back, {user.name} 👋</h1>
          <p className="text-muted-foreground mt-1">What would you like to do today?</p>
        </div>

        {/* Location status bar */}
        <div className={`flex items-center justify-between rounded-xl border px-4 py-3 text-sm ${
          locationStatus === "on" ? "border-green-300 bg-green-50 dark:bg-green-950/20"
          : locationStatus === "denied" ? "border-red-300 bg-red-50 dark:bg-red-950/20"
          : "border-border bg-surface"
        }`}>
          <div className="flex items-center gap-2">
            <Radio className={`h-4 w-4 ${
              locationStatus === "on" ? "text-green-600 animate-pulse"
              : locationStatus === "denied" ? "text-red-500"
              : "text-muted-foreground"
            }`} />
            <span className={locationStatus === "on" ? "text-green-700 font-medium" : "text-muted-foreground"}>
              {locationStatus === "on"
                ? `Location sharing ON — Caregiver can see you`
                : locationStatus === "denied"
                ? "Location permission denied — Caregiver cannot see you"
                : "Starting location tracking..."}
            </span>
          </div>
          {currentCoords && (
            <span className="text-xs text-muted-foreground">
              {currentCoords.lat.toFixed(4)}, {currentCoords.lng.toFixed(4)}
            </span>
          )}
          {locationStatus === "denied" && (
            <button onClick={startLocationTracking} className="text-xs text-brand-600 hover:underline">Enable</button>
          )}
        </div>

        {/* Feature cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {features.map(({ icon: Icon, label, desc, href, color }) => (
            <Link key={label} href={href}
              className="card hover:shadow-md transition-shadow cursor-pointer flex flex-col items-center gap-2 py-5 text-center"
              aria-label={label}>
              <Icon className={`h-8 w-8 ${color}`} aria-hidden />
              <p className="font-semibold text-sm">{label}</p>
              <p className="text-xs text-muted-foreground">{desc}</p>
            </Link>
          ))}
        </div>

        {/* SOS Button */}
        <button onClick={triggerSos} disabled={sosSending}
          className={`w-full rounded-2xl font-bold py-6 text-xl transition-colors touch-target shadow-lg text-white ${sosSuccess ? "bg-green-500" : "bg-red-500 hover:bg-red-600"}`}
          aria-label="Send SOS emergency alert">
          {sosSending ? <><Loader2 className="h-6 w-6 animate-spin inline mr-2" />Sending SOS...</>
            : sosSuccess ? "✓ SOS Sent — Caregivers Notified"
            : "🆘 SOS — Emergency Alert"}
        </button>
        <p className="text-xs text-muted-foreground text-center -mt-6">
          Sends your GPS location to all emergency contacts via SMS
        </p>

        {/* Emergency Contacts / Caregivers */}
        <div className="card space-y-4">
          <h2 className="font-semibold flex items-center gap-2">
            <Phone className="h-5 w-5 text-brand-600" /> My Emergency Contacts & Caregivers
          </h2>
          <p className="text-xs text-muted-foreground">
            Add your caregiver's phone number. When you press SOS, they will receive an SMS with your location.
          </p>

          {/* Existing contacts */}
          {loadingContacts ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading contacts...
            </div>
          ) : contacts.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2">No emergency contacts added yet.</p>
          ) : (
            <ul className="divide-y divide-border">
              {contacts.map((c: any) => (
                <li key={c.id} className="flex items-center justify-between py-3 gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-9 w-9 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 font-bold text-sm shrink-0">
                      {c.name[0].toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{c.name}</p>
                      <p className="text-xs text-muted-foreground">{c.phone} · {c.relation}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <a href={`tel:${c.phone}`}
                      className="p-2 rounded-xl bg-green-100 text-green-700 hover:bg-green-200 transition-colors"
                      aria-label={`Call ${c.name}`}>
                      <Phone className="h-4 w-4" />
                    </a>
                    <button onClick={() => removeContact.mutate(c.id)}
                      className="p-2 rounded-xl text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                      aria-label={`Remove ${c.name}`}>
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {/* Add new contact */}
          <div className="border-t pt-4 space-y-3">
            <p className="text-sm font-medium">Add New Contact</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <input value={newContact.name} onChange={(e) => setNewContact((p) => ({ ...p, name: e.target.value }))}
                placeholder="Name" className={fc} />
              <input value={newContact.phone} onChange={(e) => setNewContact((p) => ({ ...p, phone: e.target.value }))}
                placeholder="Phone (+91...)" type="tel" className={fc} />
              <select value={newContact.relation} onChange={(e) => setNewContact((p) => ({ ...p, relation: e.target.value }))}
                className={fc}>
                {["Caregiver", "Parent", "Sibling", "Friend", "Doctor", "Other"].map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
            {contactError && <p className="text-xs text-red-500">{contactError}</p>}
            <button
              onClick={() => addContact.mutate()}
              disabled={!newContact.name || !newContact.phone || addContact.isPending}
              className="btn-primary w-full sm:w-auto px-6">
              {addContact.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              {addContact.isPending ? "Adding..." : "Add Contact"}
            </button>
            {addContact.isSuccess && (
              <p className="text-xs text-green-600 flex items-center gap-1">
                <CheckCircle className="h-3 w-3" /> Contact added successfully
              </p>
            )}
          </div>
        </div>

        {/* Account info */}
        <div className="card space-y-3">
          <h2 className="font-semibold">Account</h2>
          <div className="text-sm space-y-2 divide-y divide-border">
            <div className="flex justify-between py-1"><span className="text-muted-foreground">Name</span><span>{user.name}</span></div>
            {user.email && <div className="flex justify-between py-1"><span className="text-muted-foreground">Email</span><span>{user.email}</span></div>}
            {user.phone && <div className="flex justify-between py-1"><span className="text-muted-foreground">Phone</span><span>{user.phone}</span></div>}
            <div className="flex justify-between py-1"><span className="text-muted-foreground">Role</span><span className="capitalize">{user.role.toLowerCase()}</span></div>
          </div>
          <Link href="/dashboard/settings" className="btn-ghost text-sm flex items-center gap-2 w-fit">
            <Settings className="h-4 w-4" /> Voice & Accessibility Settings
          </Link>
        </div>
      </main>
    </div>
  );
}
