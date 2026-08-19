import type { Metadata } from "next";
import { Navbar } from "@/components/navigation/Navbar";
import { Footer } from "@/components/navigation/Footer";

export const metadata: Metadata = { title: "Privacy Policy — NaviAssist" };

export default function PrivacyPage() {
  return (
    <>
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 py-16 space-y-8 prose prose-sm dark:prose-invert max-w-none">
        <h1 className="text-4xl font-bold not-prose">Privacy Policy</h1>
        <p className="text-muted-foreground not-prose">Last updated: {new Date().getFullYear()}</p>
        {[
          { title: "Data We Collect", body: "We collect your name, email or phone number for authentication. Location data is used only during active navigation sessions and is shared with caregivers only with your explicit consent." },
          { title: "Camera & Microphone", body: "Camera access is used solely for real-time AI object detection and scene understanding. Images are processed locally or sent to our AI engine and are never stored permanently without your consent." },
          { title: "Location Data", body: "GPS location is used for navigation and emergency SOS alerts. Live location is only shared with caregivers you have explicitly linked to your account." },
          { title: "Data Storage", body: "Your data is stored securely in an encrypted local database. We do not sell your data to third parties." },
          { title: "Third-Party Services", body: "We use Google Gemini for AI scene understanding and OpenRouteService for navigation. Please review their respective privacy policies." },
          { title: "Your Rights", body: "You can delete your account and all associated data at any time from the Settings page." },
          { title: "Contact", body: "For privacy concerns, contact us at privacy@naviassist.app" },
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
