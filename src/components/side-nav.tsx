import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";
import { Briefcase, LogOut, AlertTriangle } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/lib/language";

export type SideItem = { to: string; label: string; icon: LucideIcon; onClick?: () => void };

export function SideNav({
  items,
  role,
  collapsed = false,
  onLogout,
}: {
  items: SideItem[];
  role: string;
  collapsed?: boolean;
  onLogout?: () => void;
}) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const { t } = useLanguage();

  const handleLogout = () => {
    onLogout?.();      // clear auth state
    navigate({ to: "/welcome", replace: true });
  };

  return (
    <aside
      className={cn(
        "hidden md:flex shrink-0 flex-col bg-sidebar border-r border-sidebar-border text-sidebar-foreground transition-colors duration-300 relative",
        collapsed ? "md:w-20" : "md:w-64 xl:w-72",
      )}
    >
      <div className={cn("relative px-5 pt-6 pb-5 flex items-center gap-2.5", collapsed && "justify-center px-0")}>
        <img 
          src="/logo.png" 
          alt="JobNow Logo" 
          className="h-10 w-10 rounded-2xl shadow-soft object-cover border border-border" 
        />
        {!collapsed && (
          <div>
            <p className="text-lg font-extrabold leading-tight tracking-tight">JobNow</p>
            <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground capitalize">{role} portal</p>
          </div>
        )}
      </div>

      <nav className="relative flex-1 px-3 py-2 overflow-y-auto">
        <ul className="space-y-1">
          {items.map((it) => {
            const active =
              path === it.to || (it.to !== "/" && it.to !== "/settings" && path.startsWith(it.to));
            const Icon = it.icon;
            return (
              <li key={it.to + it.label}>
                {it.to === "/welcome" ? (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <button
                        className={cn(
                          "w-full group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-foreground",
                          collapsed && "justify-center px-0",
                        )}
                        title={collapsed ? t(it.label) : undefined}
                      >
                        <Icon className="h-4.5 w-4.5" />
                        {!collapsed && <span>{t(it.label)}</span>}
                      </button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="rounded-3xl border-border bg-card/95 backdrop-blur-xl">
                      <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2">
                          <AlertTriangle className="h-5 w-5 text-destructive" /> Confirm Logout
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to logout? You will need to login again to access your dashboard.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel className="rounded-full">Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleLogout} className="rounded-full bg-gradient-primary text-primary-foreground">Logout</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                ) : (
                  <Link
                    to={it.to}
                    className={cn(
                      "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
                      active
                        ? "bg-primary/10 text-primary font-bold shadow-soft"
                        : "text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-foreground",
                      collapsed && "justify-center px-0",
                    )}
                    title={collapsed ? t(it.label) : undefined}
                  >
                    <Icon className="h-4.5 w-4.5" />
                    {!collapsed && <span>{t(it.label)}</span>}
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      </nav>

      {!collapsed && (
        <div className="relative m-3 p-4 rounded-2xl bg-muted/60 border border-border">
          <p className="text-xs font-bold text-foreground">Need help?</p>
          <p className="text-[11px] text-muted-foreground mt-1">We're online 24/7. Reach out anytime.</p>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:opacity-85 transition-opacity">
                <LogOut className="h-3.5 w-3.5" /> {t("Log out")}
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent className="rounded-3xl border-border bg-card/95 backdrop-blur-xl">
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-destructive" /> Confirm Logout
                </AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to logout? You will need to login again to access your dashboard.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="rounded-full">Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleLogout} className="rounded-full bg-gradient-primary text-primary-foreground">Logout</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}
    </aside>
  );
}
