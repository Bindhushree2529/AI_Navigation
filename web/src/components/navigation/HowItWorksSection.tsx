"use client";

import { motion } from "framer-motion";

const STEPS = [
  { step: "01", title: "Point Your Camera", description: "Hold your phone around your neck, chest harness, or in hand. The camera continuously analyzes your surroundings." },
  { step: "02", title: "AI Detects & Understands", description: "YOLOv8 detects objects in real time. Depth AI estimates distances. GPT-4o Vision describes the scene naturally." },
  { step: "03", title: "Voice Guides You", description: "Natural speech announces obstacles, distances, and directions. 'Person ahead, 2 meters. Door on your left.'" },
  { step: "04", title: "Stay Connected", description: "Caregivers monitor your location in real time. SOS alerts are sent instantly in emergencies." },
];

export function HowItWorksSection() {
  return (
    <section id="how-it-works" className="py-24 bg-surface" aria-labelledby="how-heading">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="text-center mb-16">
          <h2 id="how-heading" className="text-3xl font-bold tracking-tight sm:text-4xl">How It Works</h2>
          <p className="mt-4 text-lg text-muted-foreground">Simple, intuitive, and designed for independence.</p>
        </div>
        <ol className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4" role="list">
          {STEPS.map((s, i) => (
            <motion.li
              key={s.step}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="relative"
            >
              <div className="text-5xl font-black text-brand-100 dark:text-brand-900 mb-4" aria-hidden="true">{s.step}</div>
              <h3 className="font-semibold text-lg mb-2">{s.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{s.description}</p>
            </motion.li>
          ))}
        </ol>
      </div>
    </section>
  );
}
