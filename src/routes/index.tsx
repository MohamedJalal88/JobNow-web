import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useEffect } from "react";
import { Logo } from "@/components/logo";

import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/")({
  component: Splash,
});

function Splash() {
  const nav = useNavigate();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading) {
      if (user) {
        nav({ to: user.role === "worker" ? "/worker" : "/contractor", replace: true });
      } else {
        const t = setTimeout(() => nav({ to: "/welcome" }), 1800);
        return () => clearTimeout(t);
      }
    }
  }, [user, isLoading, nav]);

  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-hero text-primary-foreground grid place-items-center px-6">
      <div className="absolute inset-0 bg-gradient-mesh opacity-60" />
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="relative text-center"
      >
        <div className="mx-auto h-20 w-20 rounded-3xl bg-white/15 backdrop-blur grid place-items-center shadow-elegant border border-white/20">
          <motion.div
            initial={{ rotate: -10 }}
            animate={{ rotate: 0 }}
            transition={{ duration: 0.8, type: "spring" }}
            className="h-12 w-12 rounded-2xl bg-white/95 grid place-items-center"
          >
            <Logo showText={false} />
          </motion.div>
        </div>
        <h1 className="mt-6 text-5xl font-extrabold tracking-tight">JobNow</h1>
        <p className="mt-2 text-sm uppercase tracking-[0.3em] opacity-80">Hire · Work · Earn</p>

        <motion.div
          className="mt-10 mx-auto h-1 w-32 rounded-full bg-white/20 overflow-hidden"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
        >
          <motion.div
            className="h-full bg-white"
            initial={{ width: "0%" }} animate={{ width: "100%" }}
            transition={{ duration: 1.4, ease: "easeInOut" }}
          />
        </motion.div>

        <Link to="/welcome" className="mt-8 inline-block text-xs opacity-70 hover:opacity-100">
          Skip
        </Link>
      </motion.div>
    </main>
  );
}
