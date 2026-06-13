import { motion } from "framer-motion";
import { Logo } from "@/components/logo";

export function LoadingScreen() {
  return (
    <main className="relative min-h-screen w-full overflow-hidden bg-gradient-hero text-primary-foreground grid place-items-center px-6 z-50">
      <div className="absolute inset-0 bg-gradient-mesh opacity-60 pointer-events-none" />
      <div className="relative text-center">
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

        <div className="mt-10 mx-auto h-1 w-32 rounded-full bg-white/20 overflow-hidden">
          <motion.div
            className="h-full bg-white"
            initial={{ width: "0%" }}
            animate={{ width: "100%" }}
            transition={{ duration: 1.2, ease: "easeInOut" }}
          />
        </div>
      </div>
    </main>
  );
}
