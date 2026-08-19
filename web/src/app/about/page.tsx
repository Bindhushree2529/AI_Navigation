import type { Metadata } from "next";
import { Navbar } from "@/components/navigation/Navbar";
import { Footer } from "@/components/navigation/Footer";
import { Eye, Shield, Zap, Heart } from "lucide-react";

export const metadata: Metadata = { title: "About — NaviAssist" };

const values = [
  { icon: Eye, title: "Accessibility First", desc: "Every design decision prioritizes the needs of visually impaired users." },
  { icon: Shield, title: "Safety Focused", desc: "Real-time hazard detection and SOS alerts keep users and caregivers connected." },
  { icon: Zap, title: "AI Powered", desc: "YOLOv8 object detection, depth estimation, and Gemini vision for scene understanding." },
  { icon: Heart, title: "Open & Free", desc: "Built as a college project to make assistive technology accessible to everyone." },
];

const stack = [
  ["Web", "Next.js 14 + TypeScript"],
  ["Mobile", "React Native + Expo"],
  ["Backend", "Node.js + Fastify"],
  ["AI Engine", "Python + FastAPI"],
  ["Object Detection", "YOLOv8 (Ultralytics)"],
  ["Scene Understanding", "Gemini 1.5 Flash"],
  ["OCR", "PaddleOCR + Tesseract"],
  ["Speech", "Whisper STT + Edge TTS"],
  ["Database", "SQLite (local) / PostgreSQL (prod)"],
  ["Maps", "OpenStreetMap + OpenRouteService"],
];

export default function AboutPage() {
  return (
    <>
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 py-16 space-y-16">
        {/* Hero */}
        <section className="text-center space-y-4">
          <div className="inline-flex items-center gap-3 text-brand-600 font-bold text-3xl">
            <Eye className="h-10 w-10" />
            NaviAssist
          </div>
          <h1 className="text-4xl font-bold">AI-Powered Navigation for the Visually Impaired</h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            NaviAssist is a production-ready, accessibility-first navigation platform that uses computer vision,
            large language models, and real-time AI inference to help visually impaired people navigate safely and independently.
          </p>
          <p className="text-sm text-muted-foreground">Built as a college final year project.</p>
        </section>

        {/* Values */}
        <section>
          <h2 className="text-2xl font-bold mb-6">Our Values</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {values.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="card flex gap-4">
                <Icon className="h-6 w-6 text-brand-500 shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold">{title}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Tech Stack */}
        <section>
          <h2 className="text-2xl font-bold mb-6">Technology Stack</h2>
          <div className="card overflow-hidden p-0">
            <table className="w-full text-sm">
              <thead className="bg-surface">
                <tr>
                  <th className="text-left px-6 py-3 font-semibold">Layer</th>
                  <th className="text-left px-6 py-3 font-semibold">Technology</th>
                </tr>
              </thead>
              <tbody>
                {stack.map(([layer, tech], i) => (
                  <tr key={layer} className={i % 2 === 0 ? "bg-background" : "bg-surface/50"}>
                    <td className="px-6 py-3 font-medium">{layer}</td>
                    <td className="px-6 py-3 text-muted-foreground">{tech}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Safety Notice */}
        <section className="card border-yellow-300 bg-yellow-50 dark:bg-yellow-900/20">
          <h2 className="font-semibold text-yellow-800 dark:text-yellow-300 mb-2">⚠️ Safety Notice</h2>
          <p className="text-sm text-yellow-700 dark:text-yellow-200">
            NaviAssist is an assistive tool designed to complement — not replace — a white cane or guide dog.
            Always use appropriate mobility aids alongside this application.
          </p>
        </section>
      </main>
      <Footer />
    </>
  );
}
