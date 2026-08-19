import type { Metadata } from "next";
import { Navbar } from "@/components/navigation/Navbar";
import { Footer } from "@/components/navigation/Footer";

export const metadata: Metadata = { title: "API Docs — NaviAssist" };

const endpoints = [
  {
    group: "Auth",
    routes: [
      { method: "POST", path: "/api/v1/auth/register", desc: "Register a new user", body: "name, email, password, role" },
      { method: "POST", path: "/api/v1/auth/login", desc: "Login with email & password", body: "email, password" },
      { method: "POST", path: "/api/v1/auth/otp/send", desc: "Send OTP to phone", body: "phone" },
      { method: "POST", path: "/api/v1/auth/otp/verify", desc: "Verify OTP and login", body: "phone, otp" },
      { method: "POST", path: "/api/v1/auth/refresh", desc: "Refresh access token", body: "refreshToken" },
      { method: "POST", path: "/api/v1/auth/logout", desc: "Logout", body: "refreshToken" },
      { method: "GET",  path: "/api/v1/auth/me", desc: "Get current user", body: "— (Bearer token)" },
    ],
  },
  {
    group: "AI Detection",
    routes: [
      { method: "POST", path: "/api/v1/detections/analyze", desc: "Detect objects in image", body: "image file (multipart)" },
      { method: "POST", path: "/api/v1/detections/describe", desc: "Scene description via Gemini", body: "image file (multipart)" },
      { method: "POST", path: "/api/v1/detections/ocr", desc: "Extract text from image", body: "image file (multipart)" },
      { method: "POST", path: "/api/v1/detections/currency", desc: "Detect currency in image", body: "image file (multipart)" },
      { method: "POST", path: "/api/v1/detections/ask", desc: "Visual Q&A", body: "image file + x-question header" },
      { method: "GET",  path: "/api/v1/detections/history", desc: "Detection history", body: "?page&limit&category" },
    ],
  },
  {
    group: "Navigation",
    routes: [
      { method: "POST",  path: "/api/v1/navigation/sessions", desc: "Start navigation session", body: "mode, startLocation, destination" },
      { method: "PATCH", path: "/api/v1/navigation/sessions/:id/end", desc: "End session", body: "endLocation, distanceM" },
      { method: "GET",   path: "/api/v1/navigation/sessions", desc: "Get session history", body: "?page&limit" },
      { method: "POST",  path: "/api/v1/navigation/location", desc: "Publish live location", body: "lat, lng" },
      { method: "GET",   path: "/api/v1/navigation/favorites", desc: "Get favorite locations", body: "—" },
      { method: "POST",  path: "/api/v1/navigation/favorites", desc: "Add favorite location", body: "label, address, lat, lng" },
      { method: "DELETE",path: "/api/v1/navigation/favorites/:id", desc: "Remove favorite", body: "—" },
    ],
  },
  {
    group: "SOS",
    routes: [
      { method: "POST",  path: "/api/v1/sos", desc: "Trigger SOS alert", body: "location, message, sessionId" },
      { method: "PATCH", path: "/api/v1/sos/:id/resolve", desc: "Resolve SOS", body: "—" },
      { method: "GET",   path: "/api/v1/sos/history", desc: "SOS history", body: "—" },
      { method: "GET",   path: "/api/v1/sos/contacts", desc: "Emergency contacts", body: "—" },
      { method: "POST",  path: "/api/v1/sos/contacts", desc: "Add emergency contact", body: "name, phone, relation" },
      { method: "DELETE",path: "/api/v1/sos/contacts/:id", desc: "Remove contact", body: "—" },
    ],
  },
  {
    group: "Caregiver",
    routes: [
      { method: "GET",   path: "/api/v1/caregiver/users", desc: "Get users I care for", body: "—" },
      { method: "POST",  path: "/api/v1/caregiver/invite", desc: "Invite user", body: "userId" },
      { method: "PATCH", path: "/api/v1/caregiver/invite/:id/accept", desc: "Accept invite", body: "—" },
      { method: "GET",   path: "/api/v1/caregiver/users/:userId/session", desc: "User active session", body: "—" },
      { method: "GET",   path: "/api/v1/caregiver/users/:userId/sos", desc: "User SOS history", body: "—" },
    ],
  },
  {
    group: "WebSocket",
    routes: [
      { method: "WS", path: "/ws?token=<jwt>", desc: "Real-time location & SOS updates", body: "WATCH_USER, PING messages" },
    ],
  },
];

const methodColor: Record<string, string> = {
  GET: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  POST: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  PATCH: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300",
  DELETE: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  WS: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
};

export default function DocsPage() {
  return (
    <>
      <Navbar />
      <main className="max-w-5xl mx-auto px-4 py-16 space-y-12">
        <div>
          <h1 className="text-4xl font-bold">API Documentation</h1>
          <p className="text-muted-foreground mt-2">Base URL: <code className="bg-surface px-2 py-1 rounded text-sm">http://localhost:3001</code></p>
          <p className="text-muted-foreground text-sm mt-1">All protected routes require <code className="bg-surface px-1 rounded">Authorization: Bearer &lt;token&gt;</code> header.</p>
          <a href="http://localhost:3001/docs" target="_blank" rel="noreferrer" className="inline-block mt-3 text-sm text-brand-600 hover:underline">
            → Open interactive Swagger UI ↗
          </a>
        </div>

        {endpoints.map(({ group, routes }) => (
          <section key={group}>
            <h2 className="text-xl font-bold mb-4">{group}</h2>
            <div className="card p-0 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-surface">
                  <tr>
                    <th className="text-left px-4 py-3 font-semibold w-20">Method</th>
                    <th className="text-left px-4 py-3 font-semibold">Endpoint</th>
                    <th className="text-left px-4 py-3 font-semibold hidden md:table-cell">Description</th>
                    <th className="text-left px-4 py-3 font-semibold hidden lg:table-cell">Body / Params</th>
                  </tr>
                </thead>
                <tbody>
                  {routes.map(({ method, path, desc, body }, i) => (
                    <tr key={path} className={i % 2 === 0 ? "bg-background" : "bg-surface/50"}>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-bold px-2 py-1 rounded ${methodColor[method] ?? ""}`}>{method}</span>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">{path}</td>
                      <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{desc}</td>
                      <td className="px-4 py-3 text-muted-foreground text-xs hidden lg:table-cell">{body}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ))}
      </main>
      <Footer />
    </>
  );
}
