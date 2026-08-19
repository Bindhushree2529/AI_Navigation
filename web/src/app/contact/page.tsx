import type { Metadata } from "next";
import { Navbar } from "@/components/navigation/Navbar";
import { Footer } from "@/components/navigation/Footer";
import { Mail, Github, MessageSquare } from "lucide-react";

export const metadata: Metadata = { title: "Contact — NaviAssist" };

export default function ContactPage() {
  return (
    <>
      <Navbar />
      <main className="max-w-2xl mx-auto px-4 py-16 space-y-10">
        <div>
          <h1 className="text-4xl font-bold">Contact Us</h1>
          <p className="text-muted-foreground mt-2">Have questions, feedback, or want to contribute? Reach out.</p>
        </div>
        <div className="space-y-4">
          {[
            { icon: Mail, label: "Email", value: "hello@naviassist.app", href: "mailto:hello@naviassist.app" },
            { icon: Github, label: "GitHub", value: "github.com/naviassist", href: "https://github.com/naviassist" },
            { icon: MessageSquare, label: "Discussions", value: "GitHub Discussions", href: "https://github.com/naviassist/discussions" },
          ].map(({ icon: Icon, label, value, href }) => (
            <a key={label} href={href} target="_blank" rel="noreferrer" className="card flex items-center gap-4 hover:shadow-md transition-shadow">
              <Icon className="h-6 w-6 text-brand-500 shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="font-medium">{value}</p>
              </div>
            </a>
          ))}
        </div>
        <div className="card bg-brand-50 dark:bg-brand-950/30 border-brand-200 dark:border-brand-800">
          <p className="text-sm text-brand-700 dark:text-brand-300">
            This is a college project. Response times may vary. For urgent accessibility issues, please open a GitHub issue.
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}
