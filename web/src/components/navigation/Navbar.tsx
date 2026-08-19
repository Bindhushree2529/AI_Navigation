"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Eye, Menu, X } from "lucide-react";
import { useState } from "react";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { cn } from "@/utils/cn";

const NAV_LINKS = [
  { href: "/#features", label: "Features" },
  { href: "/#how-it-works", label: "How It Works" },
  { href: "/demo", label: "Live Demo" },
  { href: "/docs", label: "Docs" },
  { href: "/about", label: "About" },
];

export function Navbar() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-md" role="banner">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6" aria-label="Main navigation">
        <Link href="/" className="flex items-center gap-2 font-bold text-xl text-brand-600" aria-label="NaviAssist home">
          <Eye className="h-7 w-7" aria-hidden="true" />
          <span>NaviAssist</span>
        </Link>

        {/* Desktop nav */}
        <ul className="hidden md:flex items-center gap-6" role="list">
          {NAV_LINKS.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className={cn(
                  "text-sm font-medium transition-colors hover:text-brand-600",
                  pathname === link.href ? "text-brand-600" : "text-muted-foreground"
                )}
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Link href="/auth/login" className="hidden md:inline-flex btn-ghost text-sm">
            Sign In
          </Link>
          <Link href="/auth/register" className="btn-primary text-sm py-2 px-4">
            Get Started
          </Link>
          <button
            className="md:hidden btn-ghost p-2 touch-target"
            onClick={() => setOpen(!open)}
            aria-expanded={open}
            aria-label={open ? "Close menu" : "Open menu"}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </nav>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden border-t bg-background px-4 py-4 animate-fade-in" role="navigation" aria-label="Mobile navigation">
          <ul className="flex flex-col gap-4" role="list">
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="block py-2 text-sm font-medium hover:text-brand-600" onClick={() => setOpen(false)}>
                  {link.label}
                </Link>
              </li>
            ))}
            <li>
              <Link href="/auth/login" className="block py-2 text-sm font-medium" onClick={() => setOpen(false)}>
                Sign In
              </Link>
            </li>
          </ul>
        </div>
      )}
    </header>
  );
}
