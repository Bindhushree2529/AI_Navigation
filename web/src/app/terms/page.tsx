import type { Metadata } from "next";
import { Navbar } from "@/components/navigation/Navbar";
import { Footer } from "@/components/navigation/Footer";

export const metadata: Metadata = { title: "Terms of Service — NaviAssist" };

export default function TermsPage() {
  return (
    <>
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 py-16 space-y-6">
        <h1 className="text-4xl font-bold">Terms of Service</h1>
        <p className="text-muted-foreground">Last updated: {new Date().getFullYear()}</p>
        {[
          { title: "Acceptance", body: "By using NaviAssist, you agree to these terms. If you do not agree, please do not use the application." },
          { title: "Assistive Tool Disclaimer", body: "NaviAssist is an assistive navigation tool designed to complement — not replace — a white cane, guide dog, or other mobility aids. Always use appropriate mobility aids alongside this application." },
          { title: "No Liability", body: "NaviAssist is provided as-is. We are not liable for any accidents, injuries, or damages resulting from use of this application. AI detection is not 100% accurate." },
          { title: "User Responsibilities", body: "You are responsible for your own safety. Do not rely solely on NaviAssist for navigation. Always be aware of your surroundings." },
          { title: "Account", body: "You are responsible for maintaining the security of your account credentials." },
          { title: "Changes", body: "We may update these terms at any time. Continued use of the application constitutes acceptance of the updated terms." },
        ].map(({ title, body }) => (
          <div key={title} className="card space-y-2">
            <h2 className="font-semibold text-lg">{title}</h2>
            <p className="text-sm text-muted-foreground">{body}</p>
          </div>
        ))}
      </main>
      <Footer />
    </>
  );
}
