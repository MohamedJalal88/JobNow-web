import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  ArrowRight, Briefcase, CheckCircle2, MapPin, ShieldCheck, Sparkles,
  Star, Users2, Wallet, Zap,
} from "lucide-react";
import { Logo } from "@/components/logo";
import { useAuth, isProfileIncomplete } from "@/lib/auth";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

export const Route = createFileRoute("/welcome")({
  head: () => ({
    meta: [
      { title: "JobNow — Hyperlocal daily wage marketplace" },
      { name: "description", content: "Find daily wage work or hire skilled workers nearby. Painters, electricians, plumbers, carpenters & more." },
    ],
  }),
  component: Landing,
});

const stats = [
  { k: "50k+", v: "Verified workers" },
  { k: "12k+", v: "Active contractors" },
  { k: "1.2M", v: "Jobs completed" },
  { k: "4.8★", v: "Avg. rating" },
];

const features = [
  { icon: MapPin, title: "Hyperlocal matching", body: "Find or hire within a 10km radius — instantly." },
  { icon: Zap, title: "Real-time hiring", body: "Apply or hire in seconds, not days." },
  { icon: ShieldCheck, title: "Verified profiles", body: "Skills, ratings, ID checks & full job history." },
  { icon: Wallet, title: "Secure daily payouts", body: "Get paid the same day you finish the job." },
  { icon: Users2, title: "Trusted community", body: "Built for India's skilled workforce." },
  { icon: Sparkles, title: "Premium experience", body: "A modern app that actually feels good to use." },
];

const steps = [
  { n: "01", t: "Create your profile", b: "Sign up as a worker or contractor in under a minute." },
  { n: "02", t: "Match instantly", b: "We connect you with the closest, best-fit match in real time." },
  { n: "03", t: "Work & get paid", b: "Complete the job and receive secure same-day payment." },
];

const testimonials = [
  { name: "Ramesh K.", role: "Electrician, Pune", quote: "I used to wait days for work. Now I get 3-4 jobs a week from contractors nearby." },
  { name: "Sharma Constructions", role: "Contractor, Mumbai", quote: "Hiring 5 painters used to take a week. With JobNow, I had my crew in 30 minutes." },
  { name: "Anita P.", role: "Cleaner, Bengaluru", quote: "The daily payouts changed everything for my family." },
];

function Landing() {
  const { user, isLoading, updateUser, logout } = useAuth();
  const navigate = useNavigate();
  const [isMobileApp, setIsMobileApp] = useState(false);

  useEffect(() => {
    const checkIsMobileApp = () => {
      const isNative =
        typeof window !== "undefined" &&
        (!!(window as any).Capacitor ||
         navigator.userAgent.includes("JobNowMobileApp") ||
         (navigator.userAgent.includes("Android") && navigator.userAgent.includes("wv")) ||
         window.location.search.includes("platform=android") ||
         window.location.search.includes("platform=ios"));
      if (isNative) {
        setIsMobileApp(true);
      }
    };
    
    // Check immediately
    checkIsMobileApp();
    
    // Re-check after a series of delays to handle asynchronous Capacitor bridge injection
    const checks = [50, 100, 200, 500, 1000, 2000];
    const timers = checks.map((delay) => setTimeout(checkIsMobileApp, delay));
    
    return () => {
      timers.forEach(clearTimeout);
    };
  }, []);

  useEffect(() => {
    if (!isLoading && user) {
      // Prioritize oauth_role, then signup_role from localStorage, and finally current role parameter
      const savedRole = localStorage.getItem("oauth_role") || localStorage.getItem("signup_role");
      if (savedRole && (savedRole === "worker" || savedRole === "contractor")) {
        localStorage.removeItem("oauth_role");
        if (user.role !== savedRole) {
          updateUser({ role: savedRole as UserRole }).catch((err) => {
            console.error("Failed to update role:", err);
          });
          return;
        }
      }

      const activeRole = (localStorage.getItem("signup_role") || user.role) as UserRole;

      if (isProfileIncomplete(user)) {
        const oauthSource = localStorage.getItem("oauth_source");

        // Check if there is an existing complete profile with the same email (e.g. from phone signup)
        if (user.email && user.email.trim() !== "") {
          supabase
            .from("profiles")
            .select("id, phone")
            .eq("email", user.email)
            .neq("id", user.id)
            .maybeSingle()
            .then(async ({ data: existingProfile, error: profileErr }) => {
              if (!profileErr && existingProfile && existingProfile.phone && existingProfile.phone.trim() !== "") {
                console.log("Found existing phone profile with same email. Merging...", existingProfile.id);
                try {
                  const { error: mergeErr } = await supabase.rpc("merge_user_accounts", {
                    old_id: existingProfile.id,
                    new_id: user.id,
                  });
                  if (mergeErr) throw mergeErr;
                  
                  // Reload the page to refresh the session state with the merged details
                  localStorage.removeItem("oauth_source");
                  window.location.reload();
                } catch (mergeErr) {
                  console.error("Account merge failed:", mergeErr);
                  // Redirect to normal register complete flow if merge fails
                  localStorage.removeItem("oauth_source");
                  navigate({
                    to: "/register",
                    search: { role: activeRole, completeProfile: true },
                    replace: true,
                  });
                }
              } else {
                // If they came from the login page, but have no existing account to merge
                if (oauthSource === "login") {
                  console.log("No account found for Google user during login attempt. Logging out.");
                  localStorage.removeItem("oauth_source");
                  logout().then(() => {
                    toast.error("No account found with this Google account. Please sign up first.");
                    navigate({ to: "/login", search: { role: activeRole }, replace: true });
                  });
                } else {
                  localStorage.removeItem("oauth_source");
                  navigate({
                    to: "/register",
                    search: { role: activeRole, completeProfile: true },
                    replace: true,
                  });
                }
              }
            });
        } else {
          if (oauthSource === "login") {
            localStorage.removeItem("oauth_source");
            logout().then(() => {
              toast.error("No account found with this Google account. Please sign up first.");
              navigate({ to: "/login", search: { role: activeRole }, replace: true });
            });
          } else {
            localStorage.removeItem("oauth_source");
            navigate({
              to: "/register",
              search: { role: activeRole, completeProfile: true },
              replace: true,
            });
          }
        }
      } else {
        localStorage.removeItem("oauth_source");
        navigate({ to: user.role === "contractor" ? "/contractor" : "/worker", replace: true });
      }
    }
  }, [user, isLoading, navigate, updateUser, logout]);

  if (isLoading) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <main className="min-h-dvh w-full bg-background overflow-x-hidden">
      {/* Top nav */}
      <header className="sticky top-0 z-40 backdrop-blur bg-background/70 border-b border-border">
        <div className="max-w-7xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
          <Logo />
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors">Features</a>
            <a href="#how" className="hover:text-foreground transition-colors">How it works</a>
            <a href="#workers" className="hover:text-foreground transition-colors">For workers</a>
            <a href="#contractors" className="hover:text-foreground transition-colors">For contractors</a>
          </nav>
          <div className="flex items-center gap-2">
            <Link to="/login-choice" className="hidden sm:inline-flex h-10 items-center px-4 rounded-full text-sm font-medium hover:bg-muted transition-colors">
              Log in
            </Link>
            <Link to="/signup" className="inline-flex h-10 items-center px-5 rounded-full bg-gradient-primary text-primary-foreground text-sm font-semibold shadow-glow hover:opacity-95 transition-opacity">
              Create account
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-mesh opacity-60 pointer-events-none" />
        <div className="relative max-w-7xl mx-auto px-4 md:px-8 pt-16 pb-20 md:pt-24 md:pb-28 grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-semibold">
              <Sparkles className="h-3.5 w-3.5" /> India's #1 daily wage marketplace
            </span>
            <h1 className="mt-5 text-3xl sm:text-5xl md:text-6xl xl:text-7xl font-extrabold leading-[1.02] tracking-tight">
              Work near you.<br />
              <span className="text-gradient">Pay by the day.</span>
            </h1>
            <p className="mt-5 text-base sm:text-lg text-muted-foreground max-w-xl">
              JobNow connects skilled workers with contractors in their neighborhood — in real time, with secure same-day payouts.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/signup" className="inline-flex items-center gap-2 h-12 px-6 rounded-full bg-gradient-primary text-primary-foreground font-semibold shadow-glow hover:opacity-95">
                Create account <ArrowRight className="h-4 w-4" />
              </Link>
              <Link to="/login-choice" className="inline-flex items-center gap-2 h-12 px-6 rounded-full border border-border bg-card font-semibold hover:bg-muted">
                Log in
              </Link>
            </div>
            
            {!isMobileApp && (
              <div className="mt-6 flex flex-col sm:flex-row sm:items-center gap-3">
                <span className="text-xs text-muted-foreground font-bold uppercase tracking-wider shrink-0">Install App:</span>
                <div className="flex flex-wrap gap-2">
                  <a 
                    href="https://github.com/MohamedJalal88/JobNow/releases/download/v1.0.0/jobnow.apk" 
                    download
                    className="inline-flex items-center gap-2 text-xs font-semibold px-4 py-2.5 rounded-full border border-border hover:border-primary/40 bg-card hover:bg-muted shadow-soft transition-all shrink-0"
                  >
                    🤖 Download Android App (.apk)
                  </a>
                </div>
              </div>
            )}
            <div className="mt-10 grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6 max-w-xl">
              {stats.map((s) => (
                <div key={s.v}>
                  <p className="text-2xl md:text-3xl font-extrabold text-gradient">{s.k}</p>
                  <p className="text-xs text-muted-foreground mt-1">{s.v}</p>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.7, delay: 0.1 }}
            className="relative w-full max-w-md mx-auto lg:max-w-none"
          >
            <div className="relative rounded-3xl bg-gradient-hero p-0.5 sm:p-1 shadow-elegant">
              <div className="rounded-[22px] bg-card p-4 sm:p-6 md:p-8">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <p className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">Live near you</p>
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium text-success shrink-0">
                    <span className="h-2 w-2 rounded-full bg-success animate-pulse shrink-0" /> 24 jobs open now
                  </span>
                </div>
                <div className="mt-4 space-y-3">
                  {[
                    { t: "Painter — 2BHK interior", c: "Sharma Contractors", d: "1.2 km · ₹1,200/day", g: "from-blue-600 to-sky-700" },
                    { t: "Electrician — Wiring", c: "Bright Builders", d: "0.8 km · ₹1,500/day", g: "from-slate-600 to-slate-800" },
                    { t: "Plumber — Bathroom", c: "Reddy Estate", d: "2.1 km · ₹1,300/day", g: "from-cyan-600 to-blue-700" },
                  ].map((j) => (
                    <div key={j.t} className="flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 rounded-2xl border border-border hover:shadow-soft transition-shadow">
                      <div className={`h-10 w-10 sm:h-11 sm:w-11 rounded-xl bg-gradient-to-br ${j.g} grid place-items-center text-white shadow-soft shrink-0`}>
                        <Briefcase className="h-4 w-4 sm:h-5 sm:w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-xs sm:text-sm truncate">{j.t}</p>
                        <p className="text-[10px] sm:text-xs text-muted-foreground truncate">{j.c} · {j.d}</p>
                      </div>
                      <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
                    </div>
                  ))}
                </div>
                <div className="mt-5 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                  <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500 shrink-0" />
                  <span>4.8 average rating · 12,400+ reviews</span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 md:py-28 bg-muted/40">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-widest text-primary">Why JobNow</p>
            <h2 className="mt-3 text-3xl md:text-5xl font-extrabold tracking-tight">Everything you need to work or hire.</h2>
            <p className="mt-4 text-muted-foreground">Built from the ground up for India's daily-wage workforce and the contractors who depend on them.</p>
          </div>
          <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="rounded-3xl bg-card border border-border p-6 hover:shadow-elegant transition-shadow"
              >
                <div className="h-12 w-12 rounded-2xl bg-gradient-primary text-primary-foreground grid place-items-center shadow-soft">
                  <f.icon className="h-5 w-5" />
                </div>
                <p className="mt-5 font-bold text-lg">{f.title}</p>
                <p className="mt-1.5 text-sm text-muted-foreground">{f.body}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-widest text-primary">How it works</p>
            <h2 className="mt-3 text-3xl md:text-5xl font-extrabold tracking-tight">Three steps to your next job.</h2>
          </div>
          <div className="mt-12 grid md:grid-cols-3 gap-4">
            {steps.map((s) => (
              <div key={s.n} className="rounded-3xl border border-border p-8 bg-gradient-to-br from-card to-muted/30">
                <p className="text-5xl font-extrabold text-gradient">{s.n}</p>
                <p className="mt-4 font-bold text-xl">{s.t}</p>
                <p className="mt-2 text-sm text-muted-foreground">{s.b}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Worker / Contractor split */}
      <section className="py-20 md:py-28 bg-muted/40">
        <div className="max-w-7xl mx-auto px-4 md:px-8 grid lg:grid-cols-2 gap-6">
          <div id="workers" className="rounded-3xl p-8 md:p-12 bg-gradient-to-br from-blue-600 to-sky-700 text-white shadow-elegant">
            <div className="h-14 w-14 rounded-2xl bg-white/20 grid place-items-center"><Briefcase className="h-7 w-7" /></div>
            <h3 className="mt-6 text-3xl md:text-4xl font-extrabold">For workers</h3>
            <p className="mt-3 opacity-90 max-w-md">Find verified daily wage jobs near you. Paint, wire, plumb, build — and get paid the same day.</p>
            <ul className="mt-6 space-y-2.5 text-sm">
              {["Daily payouts", "Jobs within 10km", "Build your reputation", "Free to join"].map((b) => (
                <li key={b} className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4" /> {b}</li>
              ))}
            </ul>
            <Link to="/signup" className="mt-8 inline-flex items-center gap-2 h-12 px-6 rounded-full bg-white text-blue-700 font-semibold hover:scale-[1.02] transition-transform">
              Find jobs <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div id="contractors" className="rounded-3xl p-8 md:p-12 bg-gradient-to-br from-blue-800 to-slate-900 text-white shadow-elegant">
            <div className="h-14 w-14 rounded-2xl bg-white/20 grid place-items-center"><Users2 className="h-7 w-7" /></div>
            <h3 className="mt-6 text-3xl md:text-4xl font-extrabold">For contractors</h3>
            <p className="mt-3 opacity-90 max-w-md">Hire skilled, verified workers in minutes. Post a job, review applicants, and get the work done — fast.</p>
            <ul className="mt-6 space-y-2.5 text-sm">
              {["Hire in 30 minutes", "Verified profiles & ratings", "Bulk hiring tools", "Manage payments easily"].map((b) => (
                <li key={b} className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4" /> {b}</li>
              ))}
            </ul>
            <Link to="/signup" className="mt-8 inline-flex items-center gap-2 h-12 px-6 rounded-full bg-white text-blue-900 font-semibold hover:scale-[1.02] transition-transform">
              Hire workers <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-widest text-primary">Loved by thousands</p>
            <h2 className="mt-3 text-3xl md:text-5xl font-extrabold tracking-tight">A platform built on trust.</h2>
          </div>
          <div className="mt-12 grid md:grid-cols-3 gap-4">
            {testimonials.map((t) => (
              <div key={t.name} className="rounded-3xl border border-border bg-card p-6 hover:shadow-elegant transition-shadow">
                <div className="flex gap-0.5 text-amber-500">
                  {Array.from({ length: 5 }).map((_, i) => <Star key={i} className="h-4 w-4 fill-current" />)}
                </div>
                <p className="mt-4 text-sm leading-relaxed">"{t.quote}"</p>
                <div className="mt-5 pt-5 border-t border-border">
                  <p className="font-semibold text-sm">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{t.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="pb-20 md:pb-28">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="relative overflow-hidden rounded-[32px] bg-gradient-hero p-6 sm:p-10 md:p-16 text-primary-foreground">
            <div className="absolute inset-0 bg-gradient-mesh opacity-60" />
            <div className="relative max-w-3xl">
              <h2 className="text-3xl sm:text-4xl md:text-6xl font-extrabold tracking-tight">Ready to get to work?</h2>
              <p className="mt-4 text-sm sm:text-base md:text-lg opacity-90">Join 60,000+ workers and contractors building India's most trusted daily wage marketplace.</p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link to="/signup" className="inline-flex items-center gap-2 h-12 px-6 rounded-full bg-white text-primary font-semibold shadow-elegant hover:scale-[1.02] transition-transform">
                  Create account <ArrowRight className="h-4 w-4" />
                </Link>
                <Link to="/login-choice" className="inline-flex items-center gap-2 h-12 px-6 rounded-full border border-white/30 text-white font-semibold hover:bg-white/10">
                  Log in
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-border py-10">
        <div className="max-w-7xl mx-auto px-4 md:px-8 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-3">
            <Logo />
          </div>
          <p>© {new Date().getFullYear()} JobNow. Built for India.</p>
          <div className="flex items-center gap-6">
            <a href="#" className="hover:text-foreground">Privacy</a>
            <a href="#" className="hover:text-foreground">Terms</a>
            <a href="#" className="hover:text-foreground">Contact</a>
          </div>
        </div>
      </footer>
    </main>
  );
}
