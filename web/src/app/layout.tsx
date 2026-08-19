import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { ThemeProvider } from "@/components/ui/ThemeProvider";
import { QueryProvider } from "@/components/ui/QueryProvider";
import { Toaster } from "@/components/ui/Toaster";
import { VoiceAssistant } from "@/components/ui/VoiceAssistant";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: { default: "NaviAssist — AI Navigation for Visually Impaired", template: "%s | NaviAssist" },
  description: "AI-powered smart navigation system for visually impaired people. Real-time object detection, voice guidance, and safe route planning.",
  keywords: ["accessibility", "navigation", "visually impaired", "AI", "blind assistance"],
  openGraph: {
    type: "website",
    siteName: "NaviAssist",
    title: "NaviAssist — AI Navigation for Visually Impaired",
    description: "Navigate safely and independently with AI-powered assistance.",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#0ea5e9" },
    { media: "(prefers-color-scheme: dark)", color: "#0369a1" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={inter.variable}>
      <body className="min-h-screen bg-background font-sans antialiased">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <QueryProvider>
            <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-brand-600 focus:text-white focus:rounded-lg">
              Skip to main content
            </a>
            <main id="main-content">{children}</main>
            <VoiceAssistant />
            <Toaster />
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
