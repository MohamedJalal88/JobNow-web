import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Briefcase, Check, HardHat, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/logo";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/signup")({
  head: () => ({ meta: [{ title: "Choose your role — JobNow" }] }),
  component: RoleSelect,
});

function RoleSelect() {
  const nav = useNavigate();
  const [role, setRole] = useState<"worker" | "contractor" | null>(null);

  return (
    <main className="min-h-dvh w-full bg-background relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-mesh opacity-40 pointer-events-none" />

      <header className="relative max-w-7xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
        <Link to="/welcome" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
        <Logo />
        <Link to="/login-choice" className="text-sm font-medium text-muted-foreground hover:text-foreground">Log in</Link>
      </header>

      <section className="relative max-w-7xl mx-auto px-4 md:px-8 pt-8 md:pt-16 pb-16">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="max-w-3xl mx-auto text-center">
          <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-semibold">
            <Sparkles className="h-3.5 w-3.5" /> Step 1 of 2
          </span>
          <h1 className="mt-5 text-4xl md:text-6xl font-extrabold tracking-tight">How will you use <span className="text-gradient">JobNow</span>?</h1>
          <p className="mt-4 text-muted-foreground text-lg">Choose your role to personalize your experience. You can always switch later.</p>
        </motion.div>

        <div className="mt-12 grid lg:grid-cols-2 gap-5 max-w-5xl mx-auto">
          <RoleCard
            selected={role === "worker"}
            onClick={() => setRole("worker")}
            title="I'm a Worker"
            tagline="Find daily wage jobs near you"
            icon={<HardHat className="h-7 w-7" />}
            gradient="from-blue-600 to-sky-700"
            bullets={[
              "Browse jobs within 10km",
              "Apply with one tap",
              "Get paid same day",
              "Build your reputation",
            ]}
          />
          <RoleCard
            selected={role === "contractor"}
            onClick={() => setRole("contractor")}
            title="I'm a Contractor"
            tagline="Hire skilled workers in minutes"
            icon={<Briefcase className="h-7 w-7" />}
            gradient="from-blue-800 to-slate-900"
            bullets={[
              "Post jobs in seconds",
              "Verified worker profiles",
              "Bulk hiring tools",
              "Manage payments easily",
            ]}
          />
        </div>

        <div className="mt-10 max-w-md mx-auto">
          <Button
            disabled={!role}
            onClick={() => {
              if (role) {
                localStorage.setItem("signup_role", role);
              }
              nav({ to: "/register", search: { role: role! } });
            }}
            className="w-full h-13 py-3.5 rounded-full bg-gradient-primary text-primary-foreground font-semibold shadow-glow disabled:opacity-50 inline-flex items-center justify-center gap-2"
          >
            Continue <ArrowRight className="h-4 w-4" />
          </Button>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Already a member? <Link to="/login-choice" className="text-primary font-semibold">Log in</Link>
          </p>
        </div>
      </section>
    </main>
  );
}

function RoleCard({
  selected, onClick, title, tagline, icon, gradient, bullets,
}: {
  selected: boolean; onClick: () => void; title: string; tagline: string;
  icon: React.ReactNode; gradient: string; bullets: string[];
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group relative text-left p-7 md:p-8 rounded-3xl border-2 bg-card transition-all overflow-hidden",
        selected ? "border-primary shadow-elegant scale-[1.01]" : "border-border hover:border-primary/40 hover:shadow-soft"
      )}
    >
      <div className={cn(
        "absolute top-5 right-5 h-7 w-7 rounded-full border-2 grid place-items-center transition-colors",
        selected ? "bg-primary border-primary text-primary-foreground" : "border-border"
      )}>
        {selected && <Check className="h-4 w-4" />}
      </div>
      <div className={`h-16 w-16 rounded-2xl bg-gradient-to-br ${gradient} text-white grid place-items-center shadow-soft`}>
        {icon}
      </div>
      <p className="mt-5 text-2xl font-extrabold">{title}</p>
      <p className="mt-1 text-sm text-muted-foreground">{tagline}</p>
      <ul className="mt-5 space-y-2 text-sm">
        {bullets.map((b) => (
          <li key={b} className="flex items-center gap-2 text-muted-foreground">
            <Check className="h-4 w-4 text-success shrink-0" /> {b}
          </li>
        ))}
      </ul>
    </button>
  );
}
