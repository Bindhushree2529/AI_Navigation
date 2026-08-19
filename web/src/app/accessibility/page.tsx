import type { Metadata } from "next";
import { Navbar } from "@/components/navigation/Navbar";
import { Footer } from "@/components/navigation/Footer";

export const metadata: Metadata = { title: "Accessibility — NaviAssist" };

export default function AccessibilityPage() {
  return (
    <>
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 py-16 space-y-6">
        <h1 className="text-4xl font-bold">Accessibility Statement</h1>
        <p className="text-muted-foreground">NaviAssist is built accessibility-first. Here is what we support:</p>
        {[
          { title: "Screen Readers", body: "Full compatibility with Android TalkBack and iOS VoiceOver. Every interactive element has proper ARIA labels and roles." },
          { title: "Keyboard Navigation", body: "All features are accessible via keyboard. Focus indicators are clearly visible for keyboard users." },
          { title: "Voice Control", body: "The mobile app supports hands-free voice commands for all core features." },
          { title: "High Contrast Mode", body: "A high-contrast theme is available in Settings for users with low vision." },
          { title: "Large Touch Targets", body: "All interactive elements meet the minimum 48x48px touch target size recommended by WCAG." },
          { title: "Reduced Motion", body: "Animations are disabled when the user has enabled 'Reduce Motion' in their OS settings." },
          { title: "WCAG Compliance", body: "We aim for WCAG 2.1 AA compliance across all web pages." },
          { title: "Feedback", body: "Found an accessibility issue? Please contact us at accessibility@naviassist.app" },
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
