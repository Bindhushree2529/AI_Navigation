import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function CTASection() {
  return (
    <section className="py-24 bg-gradient-to-r from-brand-600 to-brand-800 text-white" aria-labelledby="cta-heading">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 text-center">
        <h2 id="cta-heading" className="text-3xl font-bold sm:text-4xl mb-4">
          Start Navigating with Confidence Today
        </h2>
        <p className="text-brand-100 text-lg mb-8 max-w-xl mx-auto">
          Join thousands of users navigating safely with AI-powered assistance. Free to use, no credit card required.
        </p>
        <Link href="/auth/register" className="btn-primary bg-white text-brand-700 hover:bg-brand-50 text-base px-8 py-4 touch-target">
          Create Free Account
          <ArrowRight className="h-5 w-5" aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}
