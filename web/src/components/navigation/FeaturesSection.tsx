"use client";

import { motion } from "framer-motion";
import { Eye, Mic, MapPin, AlertTriangle, FileText, DollarSign, MessageSquare, Wifi } from "lucide-react";

const FEATURES = [
  {
    icon: Eye,
    title: "Real-Time Object Detection",
    description: "YOLOv8-powered detection of people, vehicles, obstacles, stairs, and 80+ object types with distance estimation.",
    color: "text-blue-500",
    bg: "bg-blue-50 dark:bg-blue-950",
  },
  {
    icon: Mic,
    title: "Voice-First Interface",
    description: "Hands-free operation with natural voice commands. Say 'What's ahead?' or 'Navigate home' — no screen needed.",
    color: "text-green-500",
    bg: "bg-green-50 dark:bg-green-950",
  },
  {
    icon: MapPin,
    title: "GPS Navigation",
    description: "Turn-by-turn voice guidance for outdoor navigation with live route recalculation and favorite locations.",
    color: "text-purple-500",
    bg: "bg-purple-50 dark:bg-purple-950",
  },
  {
    icon: AlertTriangle,
    title: "Emergency SOS",
    description: "One-tap or voice-triggered SOS with live GPS sharing to caregivers and emergency contacts via SMS and push notifications.",
    color: "text-red-500",
    bg: "bg-red-50 dark:bg-red-950",
  },
  {
    icon: FileText,
    title: "OCR Text Reading",
    description: "Read signboards, medicine labels, menus, and documents aloud using PaddleOCR with multilingual support.",
    color: "text-orange-500",
    bg: "bg-orange-50 dark:bg-orange-950",
  },
  {
    icon: DollarSign,
    title: "Currency Recognition",
    description: "Identify currency notes and coins instantly. Supports multiple currencies with high accuracy.",
    color: "text-yellow-500",
    bg: "bg-yellow-50 dark:bg-yellow-950",
  },
  {
    icon: MessageSquare,
    title: "AI Visual Assistant",
    description: "Ask questions about your surroundings: 'Is the road clear?', 'What am I holding?', 'Describe this room.'",
    color: "text-teal-500",
    bg: "bg-teal-50 dark:bg-teal-950",
  },
  {
    icon: Wifi,
    title: "Offline Mode",
    description: "Core navigation and object detection continue working without internet using on-device AI models.",
    color: "text-indigo-500",
    bg: "bg-indigo-50 dark:bg-indigo-950",
  },
];

export function FeaturesSection() {
  return (
    <section id="features" className="py-24 bg-background" aria-labelledby="features-heading">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="text-center mb-16">
          <h2 id="features-heading" className="text-3xl font-bold tracking-tight sm:text-4xl">
            Everything You Need to Navigate Safely
          </h2>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
            A complete AI-powered accessibility platform built with the latest computer vision and language models.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((feature, i) => (
            <motion.article
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
              className="card hover:shadow-md transition-shadow"
              aria-labelledby={`feature-${i}`}
            >
              <div className={`inline-flex rounded-xl p-3 ${feature.bg} mb-4`} aria-hidden="true">
                <feature.icon className={`h-6 w-6 ${feature.color}`} />
              </div>
              <h3 id={`feature-${i}`} className="font-semibold text-base mb-2">{feature.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}
