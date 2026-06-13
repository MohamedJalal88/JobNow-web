import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, LogIn, ShieldCheck, Sparkles, UserPlus, Zap } from "lucide-react";
import { Logo } from "@/components/logo";
import { z } from "zod";

const searchSchema = z.object({
  role: z.enum(["worker", "contractor"]).catch("worker"),
});

export const Route = createFileRoute("/auth-choice")({
  head: () => ({ meta: [{ title: "Continue — JobNow" }] }),
  validateSearch: searchSchema,
  component: AuthChoice,
});

function AuthChoice() {
  const { role } = Route.useSearch();
  const isWorker = role === "worker";

  return (
    <main className="min-h-dvh w-full bg-background grid lg:grid-cols-2">
      {/* Brand panel */}
      <aside className="relative hidden lg:flex overflow-hidden bg-gradient-hero text-primary-foreground p-12 xl:p-16 flex-col justify-between">
        <div className="absolute inset-0 bg-gradient-mesh opacity-60 pointer-events-none" />
        <div className="relative">
          <Logo />
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mt-20 max-w-lg">
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/15 text-xs font-semibold capitalize">
              <Sparkles className="h-3.5 w-3.5" /> Joining as {role}
            </span>
            <h2 className="mt-5 text-4xl xl:text-5xl font-extrabold leading-[1.05]">
              Welcome to {isWorker ? "more work, near you." : "faster hiring."}
            </h2>
            <p className="mt-4 text-lg opacity-90">
              {isWorker
                ? "Verified daily wage jobs in your neighborhood, with secure same-day payouts."
                : "Hire skilled, verified workers in your neighborhood — in minutes, not days."}
            </p>
          </motion.div>
        </div>
        <div className="relative space-y-3 max-w-lg">
          {[
            { icon: Zap, t: "Instant matching", b: "Get matched in seconds." },
            { icon: ShieldCheck, t: "Verified & secure", b: "ID-verified profiles, secure payments." },
          ].map((b) => (
            <div key={b.t} className="glass border border-white/15 rounded-2xl p-4 flex items-start gap-3">
              <div className="h-10 w-10 rounded-xl bg-white/20 grid place-items-center shrink-0"><b.icon className="h-5 w-5" /></div>
              <div>
                <p className="font-semibold text-sm">{b.t}</p>
                <p className="text-xs opacity-85">{b.b}</p>
              </div>
            </div>
          ))}
        </div>
      </aside>

      {/* Choice panel */}
      <section className="relative flex flex-col min-h-dvh">
        <header className="flex items-center justify-between px-6 md:px-10 py-5">
          <Link to="/signup" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>
          <div className="lg:hidden"><Logo /></div>
        </header>

        <div className="flex-1 flex items-center justify-center px-6 md:px-10 py-6">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-xl">
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">Welcome to JobNow</h1>
            <p className="mt-3 text-muted-foreground">Choose how you want to continue.</p>

            <div className="mt-8 space-y-4">
              <Link
                to="/login"
                search={{ role }}
                className="group flex items-center gap-5 p-6 rounded-3xl border-2 border-border bg-card hover:border-primary hover:shadow-elegant transition-all"
              >
                <div className="h-14 w-14 rounded-2xl bg-gradient-primary text-primary-foreground grid place-items-center shadow-soft">
                  <LogIn className="h-6 w-6" />
                </div>
                <div className="flex-1">
                  <p className="text-lg font-bold">Log in</p>
                  <p className="text-sm text-muted-foreground">Already have an account? Continue securely.</p>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
              </Link>

              <Link
                to="/register"
                search={{ role }}
                onClick={() => {
                  localStorage.setItem("signup_role", role);
                }}
                className="group flex items-center gap-5 p-6 rounded-3xl border-2 border-border bg-card hover:border-primary hover:shadow-elegant transition-all"
              >
                <div className={`h-14 w-14 rounded-2xl bg-gradient-to-br ${isWorker ? "from-blue-600 to-sky-700" : "from-blue-800 to-slate-900"} text-white grid place-items-center shadow-soft`}>
                  <UserPlus className="h-6 w-6" />
                </div>
                <div className="flex-1">
                  <p className="text-lg font-bold">Create account</p>
                  <p className="text-sm text-muted-foreground">New to JobNow? Set up your {role} profile.</p>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
              </Link>
            </div>

            <p className="mt-10 text-xs text-center text-muted-foreground">
              By continuing you agree to our <a href="#" className="text-primary font-medium">Terms</a> and <a href="#" className="text-primary font-medium">Privacy Policy</a>.
            </p>
          </motion.div>
        </div>
      </section>
    </main>
  );
}
