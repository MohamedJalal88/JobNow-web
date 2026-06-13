import { Link, useRouterState } from "@tanstack/react-router";
import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/lib/language";

export type NavItem = { to: string; label: string; icon: LucideIcon };

export function BottomNav({ items }: { items: NavItem[] }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { t } = useLanguage();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden">
      <div className="mx-auto max-w-md px-3 pb-3">
        <div className="glass shadow-elegant rounded-3xl border border-border/50 px-2 py-2">
          <ul className="flex items-center justify-between">
            {items.map((it) => {
              const active = path === it.to || (it.to !== "/" && path.startsWith(it.to));
              const Icon = it.icon;
              return (
                <li key={it.to} className="flex-1">
                  <Link to={it.to} className="relative flex flex-col items-center gap-0.5 rounded-2xl px-2 py-2 text-[10px] font-medium">
                    {active && (
                      <motion.span
                        layoutId="bottom-nav-active"
                        className="absolute inset-0 -z-10 rounded-2xl bg-gradient-primary shadow-glow"
                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                      />
                    )}
                    <Icon className={cn("h-5 w-5 transition-colors", active ? "text-primary-foreground" : "text-muted-foreground")} />
                    <span className={cn("transition-colors", active ? "text-primary-foreground" : "text-muted-foreground")}>{t(it.label)}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </nav>
  );
}
