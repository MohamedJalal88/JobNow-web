import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Loader2, Mail, ShieldCheck, Eye, EyeOff, Check } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthSplit } from "@/components/auth-split";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";

const searchSchema = z.object({
  role: z.enum(["worker", "contractor"]).catch("worker"),
});

export const Route = createFileRoute("/forgot-password")({
  head: () => ({ meta: [{ title: "Reset password — JobNow" }] }),
  validateSearch: searchSchema,
  component: ForgotPassword,
});

function ForgotPassword() {
  const navigate = useNavigate();
  const { role } = Route.useSearch();
  const [step, setStep] = useState<"email" | "otp" | "password" | "success">("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [showPassword, setShowPassword] = useState(false);

  // Errors
  const [emailError, setEmailError] = useState("");
  const [otpError, setOtpError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [confirmPasswordError, setConfirmPasswordError] = useState("");

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cooldown > 0) return;
    setEmailError("");

    const cleanEmail = email.trim();
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setEmailError("Please enter a valid email address.");
      return;
    }

    setIsSubmitting(true);
    try {
      // Call Supabase to send recovery OTP silently
      const { error: resetErr } = await supabase.auth.resetPasswordForEmail(cleanEmail);

      if (resetErr) {
        console.warn("Supabase resetPasswordForEmail error:", resetErr.message);
      }

      toast.success("If this email is registered, a reset link/OTP has been sent.");
      setStep("otp");
      setCooldown(60);
      const timer = setInterval(() => {
        setCooldown((c) => {
          if (c <= 1) {
            clearInterval(timer);
            return 0;
          }
          return c - 1;
        });
      }, 1000);
    } catch (err) {
      console.error(err);
      toast.error("Failed to request password reset. Try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setOtpError("");

    if (!otp || otp.length !== 6) {
      setOtpError("Please enter a valid 6-digit OTP code.");
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: otp.trim(),
        type: "recovery",
      });

      if (error) throw error;

      toast.success("OTP Verified! Set your new password.");
      setStep("password");
    } catch (err) {
      console.error("Verification error:", err);
      toast.error("Invalid verification code. Please try again.");
      setOtpError("Invalid verification code.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError("");
    setConfirmPasswordError("");

    if (password.length < 8 || !/(?=.*[0-9!@#$%^&*])/.test(password)) {
      setPasswordError("Password must be at least 8 characters and contain a number or special character.");
      return;
    }

    if (password !== confirmPassword) {
      setConfirmPasswordError("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) throw error;

      toast.success("Password updated successfully!");
      setStep("success");
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Failed to update password. Try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthSplit
      backTo="/login"
      eyebrow="Account recovery"
      heading="Locked out? We'll get you back in."
      subheading="Follow the simple steps to securely reset your credentials and access your dashboard."
    >
      <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">Forgot password?</h1>
      <p className="mt-1.5 text-sm text-muted-foreground">
        {step === "email" && "Enter the email associated with your account and we'll send you an OTP."}
        {step === "otp" && "Check your inbox for the 6-digit recovery code and enter it below."}
        {step === "password" && "Enter a new secure password for your account."}
        {step === "success" && "Your password has been successfully updated."}
      </p>

      {step === "email" && (
        <form onSubmit={handleEmailSubmit} className="mt-8 space-y-4" noValidate>
          <div>
            <Label className="text-xs">Email Address</Label>
            <div className="relative mt-1.5">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="forgot-email"
                type="email"
                className={`h-12 rounded-xl bg-card pl-10 ${emailError ? "border-destructive" : ""}`}
                placeholder="you@example.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setEmailError("");
                }}
                disabled={isSubmitting}
              />
            </div>
            {emailError && <p className="mt-1 text-xs text-destructive">{emailError}</p>}
          </div>

          <Button
            id="forgot-email-submit"
            type="submit"
            disabled={isSubmitting || cooldown > 0}
            className="w-full h-12 rounded-full bg-gradient-primary text-primary-foreground font-semibold shadow-glow"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Processing…
              </>
            ) : cooldown > 0 ? (
              `Wait ${cooldown}s`
            ) : (
              "Send reset OTP"
            )}
          </Button>
        </form>
      )}

      {step === "otp" && (
        <form onSubmit={handleOtpSubmit} className="mt-8 space-y-4" noValidate>
          <div className="rounded-2xl border border-border bg-card p-6 shadow-soft space-y-4">
            <div className="text-center space-y-1">
              <p className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">Verify identity</p>
              <p className="text-sm text-muted-foreground">
                We've sent a 6-digit OTP code to <strong className="text-foreground">{email}</strong>.
              </p>
            </div>

            <div>
              <Label className="text-xs">Verification OTP</Label>
              <Input
                id="forgot-otp"
                type="text"
                maxLength={6}
                className={`mt-1.5 h-12 rounded-xl bg-card text-center font-mono text-lg tracking-[0.2em] ${otpError ? "border-destructive" : ""}`}
                placeholder="••••••"
                value={otp}
                onChange={(e) => {
                  setOtp(e.target.value.replace(/\D/g, "").slice(0, 6));
                  setOtpError("");
                }}
                disabled={isSubmitting}
              />
              {otpError && <p className="mt-1 text-xs text-destructive text-center">{otpError}</p>}
            </div>

            <Button
              id="forgot-otp-submit"
              type="submit"
              disabled={isSubmitting}
              className="w-full h-12 rounded-full bg-gradient-primary text-primary-foreground font-semibold shadow-glow"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Verifying…
                </>
              ) : (
                "Verify & Continue"
              )}
            </Button>

            <button
              type="button"
              onClick={() => {
                setStep("email");
                setOtp("");
                setOtpError("");
              }}
              className="w-full text-center text-xs text-muted-foreground hover:text-foreground font-medium transition-colors"
            >
              Change email address
            </button>
          </div>
        </form>
      )}

      {step === "password" && (
        <form onSubmit={handlePasswordSubmit} className="mt-8 space-y-4" noValidate>
          <div className="rounded-2xl border border-border bg-card p-6 shadow-soft space-y-4">
            <div className="text-center space-y-1">
              <p className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">New Credentials</p>
              <p className="text-sm text-muted-foreground">Create a secure new password for your account.</p>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-xs">New Password</Label>
                <div className="relative mt-1.5">
                  <Input
                    id="new-password"
                    type={showPassword ? "text" : "password"}
                    className={`h-12 rounded-xl bg-card pr-11 ${passwordError ? "border-destructive" : ""}`}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setPasswordError("");
                    }}
                    disabled={isSubmitting}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {passwordError && <p className="mt-1 text-xs text-destructive">{passwordError}</p>}
              </div>

              <div>
                <Label className="text-xs">Confirm Password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  className={`mt-1.5 h-12 rounded-xl bg-card ${confirmPasswordError ? "border-destructive" : ""}`}
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    setConfirmPasswordError("");
                  }}
                  disabled={isSubmitting}
                />
                {confirmPasswordError && <p className="mt-1 text-xs text-destructive">{confirmPasswordError}</p>}
              </div>
            </div>

            <Button
              id="forgot-password-submit"
              type="submit"
              disabled={isSubmitting}
              className="w-full h-12 rounded-full bg-gradient-primary text-primary-foreground font-semibold shadow-glow mt-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Updating…
                </>
              ) : (
                "Reset Password"
              )}
            </Button>
          </div>
        </form>
      )}

      {step === "success" && (
        <div className="mt-8 rounded-2xl bg-success/10 border border-success/20 p-6 text-center space-y-4 shadow-soft">
          <div className="h-12 w-12 rounded-full bg-success/20 text-success grid place-items-center mx-auto">
            <Check className="h-6 w-6" />
          </div>
          <div>
            <p className="font-extrabold text-lg text-foreground">Password reset successfully!</p>
            <p className="text-sm text-muted-foreground mt-1">
              Your password has been updated. You can now log in to your account with your new credentials.
            </p>
          </div>
          <Link
            to="/login"
            search={{ role }}
            className="w-full h-12 rounded-full bg-gradient-primary text-primary-foreground font-semibold shadow-glow flex items-center justify-center transition-opacity hover:opacity-95"
          >
            Back to log in
          </Link>
        </div>
      )}

      {step !== "success" && (
        <>
          <div className="mt-6 flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-xl p-3">
            <ShieldCheck className="h-4 w-4 text-success shrink-0" />
            For your security, verification codes expire in 15 minutes.
          </div>

          <p className="mt-8 text-center text-sm text-muted-foreground">
            Remembered it?{" "}
            <Link to="/login" search={{ role }} className="text-primary font-semibold">
              Back to log in
            </Link>
          </p>
        </>
      )}
    </AuthSplit>
  );
}
