"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { api } from "@/services/api";
import { useAuthStore } from "@/store/authStore";
import { toast } from "@/store/toastStore";
import { Loader2 } from "lucide-react";
import { speak } from "@/utils/speak";
import { voiceCommandBus } from "@/utils/voiceCommandBus";

const schema = z.object({
  name: z.string().min(2, "Name too short"),
  email: z.string().email("Invalid email"),
  password: z.string().min(8, "Min 8 characters"),
  role: z.enum(["USER", "CAREGIVER"]),
});

type FormData = z.infer<typeof schema>;

export function RegisterForm() {
  const router = useRouter();
  const { setTokens } = useAuthStore();
  const { register, handleSubmit, setValue, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { role: "USER" },
  });

  useEffect(() => {
    console.debug("RegisterForm: registering voiceCommandBus handler");
    const unregister = voiceCommandBus.register((command, args) => {
      console.debug(`RegisterForm.handler invoked: command=${command} args=${args}`);
      switch (command) {
        case "fill_name":
          setValue("name", args);
          speak(`Name set to ${args}. Now say: email is, then your email address.`);
          return true;
        case "fill_email":
          setValue("email", args);
          speak(`Email set to ${args}. Now say: password is, then your password.`);
          return true;
        case "fill_password":
          setValue("password", args);
          speak("Password set. Say submit to create your account.");
          return true;
        case "fill_role":
          setValue("role", args as "USER" | "CAREGIVER");
          speak(`Role set to ${args === "CAREGIVER" ? "caregiver" : "visually impaired user"}.`);
          return true;
        case "register":
        case "submit":
          const vals = { name: (document.getElementById("reg-name") as HTMLInputElement)?.value, email: (document.getElementById("reg-email") as HTMLInputElement)?.value };
          speak("Creating your account. Please wait.");
          handleSubmit(onSubmit)();
          return true;
        default:
          return false;
      }
    });
    return unregister;
  }, []);

  async function onSubmit(data: FormData) {
    try {
      const res = await api.post("/auth/register", data);
      setTokens(res.data.accessToken, res.data.refreshToken);
      useAuthStore.setState({ user: res.data.user });
      speak("Account created successfully. Welcome to NaviAssist. What would you like to do? Say: go to demo to try AI features, or say: send SOS to test emergency alerts.");
      toast({ title: "Account created!", variant: "success" });
      router.push("/dashboard");
    } catch (err: any) {
      const msg = err.response?.data?.error || "Registration failed";
      speak(msg);
      toast({ title: msg, variant: "error" });
    }
  }

  const fieldClass = "w-full rounded-xl border px-4 py-3 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-brand-500";

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" aria-label="Registration form" noValidate>
      <div>
        <label htmlFor="reg-name" className="block text-sm font-medium mb-1">Full Name</label>
        <input id="reg-name" type="text" autoComplete="name" className={fieldClass} {...register("name")} />
        {errors.name && <p className="text-xs text-red-500 mt-1" role="alert">{errors.name.message}</p>}
      </div>

      <div>
        <label htmlFor="reg-email" className="block text-sm font-medium mb-1">Email</label>
        <input id="reg-email" type="email" autoComplete="email" className={fieldClass} {...register("email")} />
        {errors.email && <p className="text-xs text-red-500 mt-1" role="alert">{errors.email.message}</p>}
      </div>

      <div>
        <label htmlFor="reg-password" className="block text-sm font-medium mb-1">Password</label>
        <input id="reg-password" type="password" autoComplete="new-password" className={fieldClass} {...register("password")} />
        {errors.password && <p className="text-xs text-red-500 mt-1" role="alert">{errors.password.message}</p>}
      </div>

      <div>
        <fieldset>
          <legend className="block text-sm font-medium mb-2">I am a...</legend>
          <div className="grid grid-cols-2 gap-3">
            {(["USER", "CAREGIVER"] as const).map((r) => (
              <label key={r} className="flex items-center gap-2 rounded-xl border p-3 cursor-pointer hover:bg-surface has-[:checked]:border-brand-500 has-[:checked]:bg-brand-50 dark:has-[:checked]:bg-brand-950/30">
                <input type="radio" value={r} className="accent-brand-600" {...register("role")} />
                <span className="text-sm font-medium">{r === "USER" ? "Visually Impaired User" : "Caregiver / Family"}</span>
              </label>
            ))}
          </div>
        </fieldset>
      </div>

      <button type="submit" disabled={isSubmitting} className="btn-primary w-full touch-target">
        {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
        {isSubmitting ? "Creating account..." : "Create Account"}
      </button>
    </form>
  );
}
