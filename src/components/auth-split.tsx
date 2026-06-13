import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ArrowLeft, ShieldCheck, Sparkles, Users2 } from "lucide-react";
import { Logo } from "@/components/logo";

type Bullet = { icon: React.ComponentType<{ className?: string }>; title: string; body: string };

const defaultBullets: Bullet[] = [
  { icon: Sparkles, title: "Hyperlocal matching", body: "Connect within 10km in seconds." },
  { icon: Users2, title: "50,000+ workers", body: "Verified skilled professionals nearby." },
  { icon: ShieldCheck, title: "Secure payments", body: "Protected daily wage transactions." },
];

export function AuthSplit({
  backTo = "/welcome",
  eyebrow,
  heading,
  subheading,
  bullets = defaultBullets,
  children,
}: {
  backTo?: string;
  eyebrow?: string;
  heading: string;
  subheading: string;
  bullets?: Bullet[];
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-dvh w-full bg-background grid lg:grid-cols-2">
      {/* Brand panel */}
      <aside className="relative hidden lg:flex overflow-hidden bg-gradient-hero text-primary-foreground p-12 xl:p-16 flex-col justify-between">
        <div className="absolute inset-0 bg-gradient-mesh opacity-60 pointer-events-none" />
        <div className="relative">
          <Logo />
          <motion.div
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
            className="mt-20 max-w-lg"
          >
            {eyebrow && (
              <p className="text-xs font-semibold uppercase tracking-[0.3em] opacity-80">{eyebrow}</p>
            )}
            <h2 className="mt-4 text-4xl xl:text-5xl font-extrabold leading-[1.05]">{heading}</h2>
            <p className="mt-4 text-base xl:text-lg opacity-90">{subheading}</p>
          </motion.div>
        </div>

        <div className="relative space-y-3 max-w-lg">
          {bullets.map((b, i) => (
            <motion.div
              key={b.title}
              initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15 + i * 0.08 }}
              className="glass border border-white/15 rounded-2xl p-4 flex items-start gap-3"
            >
              <div className="h-10 w-10 rounded-xl bg-white/20 grid place-items-center shrink-0">
                <b.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold text-sm">{b.title}</p>
                <p className="text-xs opacity-85">{b.body}</p>
              </div>
            </motion.div>
          ))}
          <p className="text-xs opacity-70 pt-4">© {new Date().getFullYear()} JobNow. All rights reserved.</p>
        </div>
      </aside>

      {/* Form panel */}
      <section className="relative flex flex-col min-h-dvh">
        <header className="flex items-center justify-between px-6 md:px-10 py-5">
          <Link to={backTo} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>
          <div className="lg:hidden"><Logo /></div>
        </header>

        <div className="flex-1 flex items-center justify-center px-6 md:px-10 py-6">
          <motion.div
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
            className="w-full max-w-xl"
          >
            {children}
          </motion.div>
        </div>
      </section>
    </main>
  );
}
