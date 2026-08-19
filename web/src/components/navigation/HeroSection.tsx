"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Mic, Eye, Shield } from "lucide-react";

const BADGES = [
  { icon: Mic, label: "Voice-First" },
  { icon: Eye, label: "Real-Time AI" },
  { icon: Shield, label: "Safety-Focused" },
];

export function HeroSection() {
  return (
    <section
      className="relative overflow-hidden bg-gradient-to-br from-brand-900 via-brand-700 to-brand-500 text-white"
      aria-labelledby="hero-heading"
    >
      {/* Animated background blobs */}
      <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-white/5 blur-3xl animate-pulse-slow" />
        <div className="absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-white/5 blur-3xl animate-pulse-slow [animation-delay:1.5s]" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 py-24 sm:px-6 sm:py-32 lg:py-40">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center"
        >
          {/* Badges */}
          <div className="mb-8 flex flex-wrap justify-center gap-3" role="list" aria-label="Key features">
            {BADGES.map(({ icon: Icon, label }) => (
              <div
                key={label}
                className="flex items-center gap-2 rounded-full glass px-4 py-2 text-sm font-medium"
                role="listitem"
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                {label}
              </div>
            ))}
          </div>

          <h1 id="hero-heading" className="text-4xl font-extrabold tracking-tight sm:text-6xl lg:text-7xl">
            Navigate the World
            <br />
            <span className="text-brand-100">With Confidence</span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg text-brand-100 sm:text-xl">
            AI-powered real-time object detection, voice guidance, and safe route planning — designed for visually impaired and blind users.
          </p>

          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link
              href="/auth/register"
              className="btn-primary bg-white text-brand-700 hover:bg-brand-50 text-base px-8 py-4 touch-target"
              aria-label="Get started with NaviAssist for free"
            >
              Get Started Free
              <ArrowRight className="h-5 w-5" aria-hidden="true" />
            </Link>
            <Link
              href="/#features"
              className="btn-ghost text-white hover:bg-white/10 text-base px-8 py-4 touch-target"
            >
              See Features
            </Link>
          </div>

          <p className="mt-6 text-sm text-brand-200">
            Free to use · No credit card required · Works offline
          </p>
        </motion.div>
      </div>
    </section>
  );
}
