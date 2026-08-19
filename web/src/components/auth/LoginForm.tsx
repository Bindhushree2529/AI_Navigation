"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { api } from "@/services/api";
import { toast } from "@/store/toastStore";
import { Loader2 } from "lucide-react";
import { speak } from "@/utils/speak";
import { voiceCommandBus } from "@/utils/voiceCommandBus";

const emailSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(8, "Min 8 characters"),
});
const otpSchema = z.object({
  phone: z.string().min(10, "Invalid phone"),
  otp: z.string().length(6, "OTP must be 6 digits").optional(),
});

type EmailForm = z.infer<typeof emailSchema>;
type OtpForm = z.infer<typeof otpSchema>;

export function LoginForm() {
  const [tab, setTab] = useState<"email" | "otp">("email");
  const [otpSent, setOtpSent] = useState(false);
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const { login, loginWithOtp, isLoading } = useAuthStore();
  const router = useRouter();
  const emailForm = useForm<EmailForm>({ resolver: zodResolver(emailSchema) });
  const otpForm = useForm<OtpForm>({ resolver: zodResolver(otpSchema) });

  async function doLogin(data: EmailForm) {
    try {
      await login(data.email, data.password);
      speak("Login successful. Welcome back. What would you like to do? You can say: go to demo, go to settings, or send SOS.");
      router.push("/dashboard");
    } catch {
      speak("Login failed. Please check your email and password. Say: email is, then your email to try again.");
      toast({ title: "Login failed", variant: "error" });
    }
  }

  async function doSendOtp(data: OtpForm) {
    try {
      const res = await api.post("/auth/otp/send", { phone: data.phone });
      setOtpSent(true);
      if (res.data.devOtp) {
        setDevOtp(res.data.devOtp);
        speak(`OTP sent. Your code is ${res.data.devOtp.split("").join(", ")}. Now say: OTP is, then the 6 digit code.`);
      } else {
        speak(`OTP sent to ${data.phone}. Now say: OTP is, then the 6 digit code.`);
      }
    } catch {
      speak("Failed to send OTP. Please try again. Say: phone is, then your phone number.");
      toast({ title: "Failed to send OTP", variant: "error" });
    }
  }

  async function doVerifyOtp(data: OtpForm) {
    if (!data.otp) { speak("Please say: OTP is, then the 6 digit code."); return; }
    try {
      await loginWithOtp(data.phone, data.otp);
      speak("OTP verified. Welcome to NaviAssist. What would you like to do?");
      router.push("/dashboard");
    } catch {
      speak("Invalid OTP. Please try again. Say: OTP is, then the correct code.");
      toast({ title: "Invalid OTP", variant: "error" });
    }
  }

  useEffect(() => {
    console.debug("LoginForm: registering voiceCommandBus handler");
    const unregister = voiceCommandBus.register((command, args) => {
      console.debug(`LoginForm.handler invoked: command=${command} args=${args}`);
      switch (command) {
        case "fill_email":
          emailForm.setValue("email", args);
          speak(`Email set to ${args}. Now say: password is, then your password.`);
          return true;

        case "fill_password":
          emailForm.setValue("password", args);
          speak("Password set. Say submit to login, or say email is to change your email.");
          return true;

        case "fill_phone":
          otpForm.setValue("phone", args);
          setTab("otp");
          speak(`Phone set to ${args}. Say submit to send the OTP.`);
          return true;

        case "fill_otp":
          otpForm.setValue("otp", args);
          speak(`OTP set to ${args}. Say submit to verify.`);
          return true;

        case "submit":
        case "login":
          if (tab === "email") {
            const vals = emailForm.getValues();
            if (!vals.email) { speak("Please say: email is, then your email address."); return true; }
            if (!vals.password) { speak("Please say: password is, then your password."); return true; }
            speak("Logging you in. Please wait.");
            emailForm.handleSubmit(doLogin)();
          } else if (otpSent) {
            speak("Verifying OTP. Please wait.");
            otpForm.handleSubmit(doVerifyOtp)();
          } else {
            speak("Sending OTP. Please wait.");
            otpForm.handleSubmit(doSendOtp)();
          }
          return true;

        default:
          return false;
      }
    });
    return unregister;
  }, [tab, otpSent]);

  const fc = "w-full rounded-xl border px-4 py-3 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-brand-500";

  return (
    <div>
      <div className="flex rounded-xl bg-surface p-1 mb-6" role="tablist">
        {(["email", "otp"] as const).map((t) => (
          <button key={t} role="tab" aria-selected={tab === t}
            onClick={() => { setTab(t); speak(t === "email" ? "Email login. Say: email is, then your email." : "Phone OTP login. Say: phone is, then your number."); }}
            className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${tab === t ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
            {t === "email" ? "Email & Password" : "Phone OTP"}
          </button>
        ))}
      </div>

      {tab === "email" ? (
        <form onSubmit={emailForm.handleSubmit(doLogin)} className="space-y-4" noValidate>
          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-1">Email</label>
            <input id="email" type="email" autoComplete="email" className={fc} {...emailForm.register("email")} />
            {emailForm.formState.errors.email && <p className="text-xs text-red-500 mt-1" role="alert">{emailForm.formState.errors.email.message}</p>}
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium mb-1">Password</label>
            <input id="password" type="password" autoComplete="current-password" className={fc} {...emailForm.register("password")} />
            {emailForm.formState.errors.password && <p className="text-xs text-red-500 mt-1" role="alert">{emailForm.formState.errors.password.message}</p>}
          </div>
          <button type="submit" disabled={isLoading} className="btn-primary w-full touch-target">
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
            {isLoading ? "Signing in..." : "Sign In"}
          </button>
        </form>
      ) : (
        <form onSubmit={otpForm.handleSubmit(otpSent ? doVerifyOtp : doSendOtp)} className="space-y-4" noValidate>
          <div>
            <label htmlFor="phone" className="block text-sm font-medium mb-1">Phone Number</label>
            <input id="phone" type="tel" autoComplete="tel" placeholder="+1234567890" className={fc} {...otpForm.register("phone")} />
          </div>
          {otpSent && devOtp && (
            <div className="rounded-xl bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-300 px-4 py-3" role="alert">
              <p className="font-semibold text-yellow-800 dark:text-yellow-300 text-sm">🔑 Dev OTP</p>
              <p className="text-2xl font-mono tracking-widest text-yellow-900 dark:text-yellow-100 mt-1">{devOtp}</p>
            </div>
          )}
          {otpSent && (
            <div>
              <label htmlFor="otp" className="block text-sm font-medium mb-1">Enter OTP</label>
              <input id="otp" type="text" inputMode="numeric" maxLength={6} placeholder="123456"
                className={`${fc} tracking-widest text-center text-lg`} {...otpForm.register("otp")} />
            </div>
          )}
          <button type="submit" disabled={isLoading} className="btn-primary w-full touch-target">
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
            {otpSent ? "Verify OTP" : "Send OTP"}
          </button>
          {otpSent && (
            <button type="button" onClick={() => { setOtpSent(false); setDevOtp(null); speak("Phone number cleared. Say: phone is, then your number."); }}
              className="w-full text-sm text-muted-foreground hover:text-foreground">
              Change phone number
            </button>
          )}
        </form>
      )}
    </div>
  );
}
