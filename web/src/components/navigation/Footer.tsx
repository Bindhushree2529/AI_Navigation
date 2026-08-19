import Link from "next/link";
import { Eye } from "lucide-react";

const LINKS = {
  Product: [
    { href: "/#features", label: "Features" },
    { href: "/docs", label: "Documentation" },
    { href: "/about", label: "About" },
  ],
  Legal: [
    { href: "/privacy", label: "Privacy Policy" },
    { href: "/terms", label: "Terms of Service" },
    { href: "/accessibility", label: "Accessibility" },
  ],
  Support: [
    { href: "/contact", label: "Contact" },
    { href: "/docs/faq", label: "FAQ" },
    { href: "https://github.com/naviassist", label: "GitHub" },
  ],
};

export function Footer() {
  return (
    <footer className="border-t bg-surface" role="contentinfo">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="flex items-center gap-2 font-bold text-lg text-brand-600" aria-label="NaviAssist home">
              <Eye className="h-6 w-6" aria-hidden="true" />
              NaviAssist
            </Link>
            <p className="mt-3 text-sm text-muted-foreground">
              AI-powered navigation for visually impaired people. Navigate safely and independently.
            </p>
          </div>
          {Object.entries(LINKS).map(([category, links]) => (
            <nav key={category} aria-label={`${category} links`}>
              <h3 className="font-semibold text-sm mb-3">{category}</h3>
              <ul className="space-y-2" role="list">
                {links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
        <div className="mt-8 border-t pt-8 text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} NaviAssist. Built with accessibility as the highest priority.</p>
        </div>
      </div>
    </footer>
  );
}
