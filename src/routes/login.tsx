import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Eye, EyeOff, Loader2, Mail, Phone, ShieldCheck } from "lucide-react";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthSplit } from "@/components/auth-split";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import type { UserRole } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

// ─── Search schema ────────────────────────────────────────────────────────────
const searchSchema = z.object({
  role: z.enum(["worker", "contractor"]).catch("worker"),
});

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Log in — JobNow" }] }),
  validateSearch: searchSchema,
  component: Login,
});

// ─── Form schemas ─────────────────────────────────────────────────────────────
const phoneSchema = z.object({
  phone: z
    .string()
    .min(10, "Enter a valid 10-digit phone number")
    .max(13, "Phone number too long")
    .regex(/^[6-9]\d{9}$/, "Must be a valid Indian mobile number"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const emailSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type PhoneForm = z.infer<typeof phoneSchema>;
type EmailForm = z.infer<typeof emailSchema>;

// ─── Component ────────────────────────────────────────────────────────────────
function Login() {
  const nav = useNavigate();
  const { role } = Route.useSearch();
  const { login, user, isLoading } = useAuth();
  const [tab, setTab] = useState<"phone" | "email">("phone");
  const [showPwd, setShowPwd] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (role) {
      localStorage.setItem("signup_role", role);
    }
  }, [role]);

  useEffect(() => {
    if (!isLoading && user) {
      nav({ to: "/welcome", replace: true });
    }
  }, [user, isLoading, nav]);

  async function handleGoogleLogin() {
    setIsSubmitting(true);
    try {
      localStorage.setItem("oauth_role", role);
      localStorage.setItem("oauth_source", "login");
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: window.location.origin + "/welcome",
          queryParams: {
            prompt: "select_account",
          },
          data: {
            role: role,
          },
        },
      });
      if (error) throw error;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Google login failed. Try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const phoneForm = useForm<PhoneForm>({
    resolver: zodResolver(phoneSchema),
    mode: "onBlur",
  });
  const emailForm = useForm<EmailForm>({
    resolver: zodResolver(emailSchema),
    mode: "onBlur",
  });



  async function handlePhoneSubmit(data: PhoneForm) {
    setIsSubmitting(true);
    try {
      await login({ identifier: data.phone, password: data.password, role: role as UserRole });
      toast.success("Welcome back! 👋");
      nav({ to: "/welcome" });
    } catch (err) {
      if (err instanceof Error && err.message === "INCORRECT_PASSWORD") {
        phoneForm.setError("password", {
          type: "manual",
          message: "Incorrect password. Please verify and try again.",
        });
        phoneForm.setFocus("password");
      } else {
        toast.error(err instanceof Error ? err.message : "Login failed. Try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleEmailSubmit(data: EmailForm) {
    setIsSubmitting(true);
    try {
      await login({ identifier: data.email, password: data.password, role: role as UserRole });
      toast.success("Welcome back! 👋");
      nav({ to: "/welcome" });
    } catch (err) {
      if (err instanceof Error && err.message === "INCORRECT_PASSWORD") {
        emailForm.setError("password", {
          type: "manual",
          message: "Incorrect password. Please verify and try again.",
        });
        emailForm.setFocus("password");
      } else {
        toast.error(err instanceof Error ? err.message : "Login failed. Try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  const phoneErrors = phoneForm.formState.errors;
  const emailErrors = emailForm.formState.errors;

  return (
    <AuthSplit
      eyebrow={`Logging in as ${role}`}
      heading="Welcome back to JobNow."
      subheading="Pick up right where you left off — your jobs, your earnings, your network."
    >
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">Log in</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">Welcome back. Let's get you working.</p>
        </div>
        <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-semibold capitalize">
          {role}
        </span>
      </div>

      {/* Tab switcher */}
      <div className="mt-8 grid grid-cols-2 p-1 bg-muted rounded-full">
        {(["phone", "email"] as const).map((t) => (
          <button
            key={t}
            onClick={() => { setTab(t); }}
            className={`relative h-10 rounded-full text-xs md:text-sm font-medium capitalize transition-colors ${tab === t ? "text-primary-foreground" : "text-muted-foreground"}`}
          >
            {tab === t && (
              <motion.span layoutId="login-tab" className="absolute inset-0 rounded-full bg-gradient-primary" transition={{ type: "spring", stiffness: 400, damping: 30 }} />
            )}
            <span className="relative inline-flex items-center gap-1.5">
              {t === "phone" && <Phone className="h-3.5 w-3.5" />}
              {t === "email" && <Mail className="h-3.5 w-3.5" />}
              {t}
            </span>
          </button>
        ))}
      </div>

      {/* ── Phone form ── */}
      {tab === "phone" && (
        <form onSubmit={phoneForm.handleSubmit(handlePhoneSubmit)} className="mt-6 space-y-4" noValidate>
          <div>
            <Label className="text-xs">Phone number</Label>
            <div className="mt-1.5 flex gap-2">
              <div className="h-12 px-3 rounded-xl border border-input bg-card grid place-items-center text-sm font-medium">+91</div>
              <div className="flex-1">
                <Input
                  id="login-phone"
                  className={`h-12 rounded-xl bg-card ${phoneErrors.phone ? "border-destructive" : ""}`}
                  placeholder="98765 43210"
                  type="tel"
                  {...phoneForm.register("phone")}
                />
                {phoneErrors.phone && (
                  <p className="mt-1 text-xs text-destructive">{phoneErrors.phone.message}</p>
                )}
              </div>
            </div>
          </div>

          <div>
            <Label className="text-xs">Password</Label>
            <div className="relative mt-1.5">
              <Input
                id="login-phone-password"
                className={`h-12 rounded-xl bg-card pr-11 ${phoneErrors.password ? "border-destructive" : ""}`}
                type={showPwd ? "text" : "password"}
                placeholder="••••••••"
                {...phoneForm.register("password")}
              />
              <button type="button" onClick={() => setShowPwd((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {phoneErrors.password && (
              <p className="mt-1 text-xs text-destructive">{phoneErrors.password.message}</p>
            )}
          </div>

          <div className="flex items-center justify-between text-sm">
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input type="checkbox" className="h-4 w-4 rounded border-input accent-primary" defaultChecked />
              <span className="text-muted-foreground">Remember me</span>
            </label>
            <Link to="/forgot-password" search={{ role }} className="font-medium text-primary">Forgot password?</Link>
          </div>

          <Button
            id="login-phone-submit"
            type="submit"
            disabled={isSubmitting}
            className="w-full h-12 rounded-full bg-gradient-primary text-primary-foreground font-semibold shadow-glow hover:opacity-95"
          >
            {isSubmitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Logging in…</> : "Log in"}
          </Button>
        </form>
      )}

      {/* ── Email form ── */}
      {tab === "email" && (
        <form onSubmit={emailForm.handleSubmit(handleEmailSubmit)} className="mt-6 space-y-4" noValidate>
          <div>
            <Label className="text-xs">Email</Label>
            <Input
              id="login-email"
              className={`mt-1.5 h-12 rounded-xl bg-card ${emailErrors.email ? "border-destructive" : ""}`}
              type="email"
              placeholder="you@example.com"
              {...emailForm.register("email")}
            />
            {emailErrors.email && (
              <p className="mt-1 text-xs text-destructive">{emailErrors.email.message}</p>
            )}
          </div>

          <div>
            <Label className="text-xs">Password</Label>
            <div className="relative mt-1.5">
              <Input
                id="login-email-password"
                className={`h-12 rounded-xl bg-card pr-11 ${emailErrors.password ? "border-destructive" : ""}`}
                type={showPwd ? "text" : "password"}
                placeholder="••••••••"
                {...emailForm.register("password")}
              />
              <button type="button" onClick={() => setShowPwd((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {emailErrors.password && (
              <p className="mt-1 text-xs text-destructive">{emailErrors.password.message}</p>
            )}
          </div>

          <div className="flex items-center justify-between text-sm">
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input type="checkbox" className="h-4 w-4 rounded border-input accent-primary" defaultChecked />
              <span className="text-muted-foreground">Remember me</span>
            </label>
            <Link to="/forgot-password" search={{ role }} className="font-medium text-primary">Forgot password?</Link>
          </div>

          <Button
            id="login-email-submit"
            type="submit"
            disabled={isSubmitting}
            className="w-full h-12 rounded-full bg-gradient-primary text-primary-foreground font-semibold shadow-glow hover:opacity-95"
          >
            {isSubmitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Logging in…</> : "Log in"}
          </Button>
        </form>
      )}

      <div className="mt-6 flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-xl p-3">
        <ShieldCheck className="h-4 w-4 text-success shrink-0" />
        Your data is encrypted end-to-end. We never share your info.
      </div>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Don't have an account?{" "}
        <Link to="/register" search={{ role }} className="text-primary font-semibold">Create account</Link>
      </p>
    </AuthSplit>
  );
}
