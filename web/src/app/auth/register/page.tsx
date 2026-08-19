import { RegisterForm } from "@/components/auth/RegisterForm";
import type { Metadata } from "next";
import Link from "next/link";
import { Eye } from "lucide-react";

export const metadata: Metadata = { title: "Create Account" };

export default function RegisterPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-900 to-brand-600 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 text-white font-bold text-2xl" aria-label="NaviAssist home">
            <Eye className="h-8 w-8" aria-hidden="true" />
            NaviAssist
          </Link>
          <p className="text-brand-100 mt-2">Create your free account</p>
        </div>
        <div className="card shadow-2xl">
          <RegisterForm />
        </div>
        <p className="text-center text-brand-100 text-sm mt-6">
          Already have an account?{" "}
          <Link href="/auth/login" className="text-white font-semibold hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
