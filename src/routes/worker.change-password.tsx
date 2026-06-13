import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Eye, EyeOff, KeyRound, Loader2, ShieldCheck } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/worker/change-password")({
  head: () => ({ meta: [{ title: "Change password — JobNow" }] }),
  component: ChangePassword,
});

// ─── Schema ───────────────────────────────────────────────────────────────────
const schema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[0-9]/, "Must contain at least one number")
      .regex(/[^a-zA-Z0-9]/, "Must contain at least one special character"),
    confirmPassword: z.string().min(1, "Please confirm your new password"),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type FormData = z.infer<typeof schema>;

function ChangePassword() {
  const [show, setShow] = useState({ a: false, b: false, c: false });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    mode: "onBlur",
  });

  async function onSubmit(data: FormData) {
    setIsSubmitting(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: data.newPassword });
      if (error) throw error;
      toast.success("Password updated successfully");
      reset();
    } catch (err) {
      console.error("Error updating password:", err);
      toast.error(err instanceof Error ? err.message : "Failed to update password");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 md:px-6 lg:px-8 pt-6 md:pt-8">
      <Link to="/worker/settings" className="inline-flex items-center gap-1 text-sm text-muted-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to settings
      </Link>

      <div className="mt-5 rounded-3xl bg-card border border-border shadow-soft overflow-hidden">
        <div className="p-6 md:p-8 bg-gradient-to-br from-blue-50 to-slate-50 dark:from-blue-950/30 dark:to-slate-950/30 border-b border-border flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-gradient-primary text-primary-foreground grid place-items-center shadow-soft">
            <KeyRound className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-extrabold">Change password</h1>
            <p className="text-sm text-muted-foreground">Use a strong password you don't reuse anywhere else.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 md:p-8 space-y-5" noValidate>
          {/* Current password */}
          <div>
            <Label className="text-xs">Current password</Label>
            <div className="relative mt-1.5">
              <Input
                id="cp-current"
                type={show.a ? "text" : "password"}
                className={`h-12 rounded-xl bg-muted/40 border-transparent pr-12 ${errors.currentPassword ? "border-destructive" : ""}`}
                {...register("currentPassword")}
              />
              <button type="button" onClick={() => setShow((s) => ({ ...s, a: !s.a }))} className="absolute right-3 top-1/2 -translate-y-1/2 h-9 w-9 grid place-items-center text-muted-foreground hover:text-foreground">
                {show.a ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.currentPassword && <p className="mt-1 text-xs text-destructive">{errors.currentPassword.message}</p>}
          </div>

          {/* New password */}
          <div>
            <Label className="text-xs">New password</Label>
            <div className="relative mt-1.5">
              <Input
                id="cp-new"
                type={show.b ? "text" : "password"}
                className={`h-12 rounded-xl bg-muted/40 border-transparent pr-12 ${errors.newPassword ? "border-destructive" : ""}`}
                {...register("newPassword")}
              />
              <button type="button" onClick={() => setShow((s) => ({ ...s, b: !s.b }))} className="absolute right-3 top-1/2 -translate-y-1/2 h-9 w-9 grid place-items-center text-muted-foreground hover:text-foreground">
                {show.b ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.newPassword && <p className="mt-1 text-xs text-destructive">{errors.newPassword.message}</p>}
          </div>

          {/* Confirm new password */}
          <div>
            <Label className="text-xs">Confirm new password</Label>
            <div className="relative mt-1.5">
              <Input
                id="cp-confirm"
                type={show.c ? "text" : "password"}
                className={`h-12 rounded-xl bg-muted/40 border-transparent pr-12 ${errors.confirmPassword ? "border-destructive" : ""}`}
                {...register("confirmPassword")}
              />
              <button type="button" onClick={() => setShow((s) => ({ ...s, c: !s.c }))} className="absolute right-3 top-1/2 -translate-y-1/2 h-9 w-9 grid place-items-center text-muted-foreground hover:text-foreground">
                {show.c ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.confirmPassword && <p className="mt-1 text-xs text-destructive">{errors.confirmPassword.message}</p>}
          </div>

          <div className="rounded-2xl bg-muted/50 p-4 text-xs text-muted-foreground inline-flex items-start gap-2">
            <ShieldCheck className="h-4 w-4 text-success mt-0.5 shrink-0" />
            Use at least 8 characters with one number and one symbol for best security.
          </div>

          <Button
            id="worker-change-password-submit"
            type="submit"
            disabled={isSubmitting}
            className="w-full h-12 rounded-full bg-gradient-primary text-primary-foreground font-semibold shadow-glow"
          >
            {isSubmitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Updating…</> : "Update password"}
          </Button>
        </form>
      </div>
    </div>
  );
}
