import { LoginForm } from "@/components/auth/LoginForm";
import type { Metadata } from "next";
import Link from "next/link";
import { Eye } from "lucide-react";

export const metadata: Metadata = { title: "Sign In" };

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-900 to-brand-600 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 text-white font-bold text-2xl" aria-label="NaviAssist home">
            <Eye className="h-8 w-8" aria-hidden="true" />
            NaviAssist
          </Link>
          <p className="text-brand-100 mt-2">Sign in to your account</p>
        </div>
        <div className="card shadow-2xl">
          <LoginForm />
        </div>
        <p className="text-center text-brand-100 text-sm mt-6">
          Don&apos;t have an account?{" "}
          <Link href="/auth/register" className="text-white font-semibold hover:underline">
            Create one free
          </Link>
        </p>
      </div>
    </div>
  );
}
