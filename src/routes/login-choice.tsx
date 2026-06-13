import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Briefcase, Users2 } from "lucide-react";
import { Logo } from "@/components/logo";

export const Route = createFileRoute("/login-choice")({
  head: () => ({ meta: [{ title: "Choose login type — JobNow" }] }),
  component: LoginChoice,
});

function LoginChoice() {
  return (
    <main className="min-h-dvh w-full bg-background">
      <header className="max-w-7xl mx-auto px-6 md:px-10 py-5 flex items-center justify-between">
        <Link to="/welcome" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
        <Logo />
        <div className="w-16" />
      </header>

      <section className="max-w-5xl mx-auto px-6 md:px-10 py-12 md:py-20">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="text-center max-w-2xl mx-auto">
          <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-semibold">
            Choose login type
          </span>
          <h1 className="mt-4 text-4xl md:text-5xl font-extrabold tracking-tight">How would you like to log in?</h1>
          <p className="mt-3 text-muted-foreground">Select your role to continue securely.</p>
        </motion.div>

        <div className="mt-10 grid md:grid-cols-2 gap-5">
          {[
            { role: "worker", title: "Worker Login", desc: "Login as a worker to find and accept nearby jobs.", icon: Briefcase, gradient: "from-blue-600 to-sky-700" },
            { role: "contractor", title: "Contractor Login", desc: "Login as a contractor to post jobs and hire workers.", icon: Users2, gradient: "from-blue-800 to-slate-900" },
          ].map((opt) => (
            <Link key={opt.role} to="/login" search={{ role: opt.role as "worker" | "contractor" }}
              className="group rounded-3xl border-2 border-border bg-card p-7 hover:border-primary hover:shadow-elegant transition-all">
              <div className={`h-14 w-14 rounded-2xl bg-gradient-to-br ${opt.gradient} text-white grid place-items-center shadow-soft`}>
                <opt.icon className="h-6 w-6" />
              </div>
              <h3 className="mt-5 text-xl font-extrabold">{opt.title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{opt.desc}</p>
              <div className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-primary group-hover:translate-x-1 transition-transform">
                Continue <ArrowRight className="h-4 w-4" />
              </div>
            </Link>
          ))}
        </div>

        <p className="mt-10 text-center text-sm text-muted-foreground">
          New to JobNow?{" "}
          <Link to="/signup" className="text-primary font-semibold">Create an account</Link>
        </p>
      </section>
    </main>
  );
}
