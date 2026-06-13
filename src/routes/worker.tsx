import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import {
  Briefcase, ClipboardCheck, HelpCircle, History, Home, LayoutDashboard,
  LogOut, MessageSquare, Settings, User, Wallet,
} from "lucide-react";
import { BottomNav } from "@/components/bottom-nav";
import { SideNav } from "@/components/side-nav";
import { TopNav } from "@/components/top-nav";
import { supabase } from "@/lib/supabase";
import { useAuth, isProfileIncomplete } from "@/lib/auth";
import { useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

const sideItems = [
  { to: "/worker", label: "Dashboard", icon: LayoutDashboard },
  { to: "/worker/jobs", label: "Nearby Jobs", icon: Briefcase },
  { to: "/worker/accepted", label: "Accepted Jobs", icon: ClipboardCheck },
  { to: "/worker/earnings", label: "Earnings", icon: Wallet },
  { to: "/worker/messages", label: "Messages", icon: MessageSquare },
  { to: "/worker/history", label: "Job History", icon: History },
  { to: "/worker/settings", label: "Settings", icon: Settings },
  { to: "/worker/help", label: "Help & Support", icon: HelpCircle },
];

const bottomItems = [
  { to: "/worker", label: "Home", icon: Home },
  { to: "/worker/jobs", label: "Jobs", icon: Briefcase },
  { to: "/worker/messages", label: "Chat", icon: MessageSquare },
  { to: "/worker/earnings", label: "Earnings", icon: Wallet },
  { to: "/worker/profile", label: "Profile", icon: User },
];

export const Route = createFileRoute("/worker")({
  // ── beforeLoad runs BEFORE the component mounts ────────────────────────────
  // This is the authoritative gate: no render happens until this resolves.
  // It guards against:
  //   • Unauthenticated access (TC-38)
  //   • Cross-role access — contractors reaching worker routes (TC-21)
  beforeLoad: async () => {
    // SSR fallback: Supabase uses localStorage by default, so we can only check session on the client.
    // The server will safely render an empty shell because useAuth defaults to isLoading: true.
    if (typeof window === "undefined") return;

    const { data: { session } } = await supabase.auth.getSession();

    // No session at all → send to worker login
    if (!session?.user) {
      throw redirect({ to: "/login", search: { role: "worker" }, replace: true });
    }

    // Session exists — fetch user metadata role (fast local check)
    const metadataRole = session.user.user_metadata?.role;
    if (metadataRole && metadataRole !== "worker") {
      throw redirect({ to: "/contractor", replace: true });
    }

    // Session exists — fetch the role from the profiles table
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", session.user.id)
      .single();

    if (!error && profile?.role) {
      if (profile.role !== "worker") {
        throw redirect({ to: "/contractor", replace: true });
      }
    } else if (error) {
      console.warn("Profile query failed in worker beforeLoad, using metadata role fallback:", error);
      if (metadataRole && metadataRole !== "worker") {
        throw redirect({ to: "/contractor", replace: true });
      }
    }
  },
  component: WorkerLayout,
});

function WorkerLayout() {
  const { user, isLoading, logout } = useAuth();
  const nav = useNavigate();

  // Redirect if not authenticated or wrong role
  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        nav({ to: "/login", search: { role: "worker" }, replace: true });
      } else if (user.role !== "worker") {
        nav({ to: "/contractor", replace: true });
      } else if (isProfileIncomplete(user)) {
        nav({
          to: "/register",
          search: { role: "worker", completeProfile: true },
          replace: true,
        });
      }
    }
  }, [user, isLoading, nav]);

  // Show nothing while checking auth state
  if (isLoading || !user || user.role !== "worker") return null;

  // Logout nav item (calls logout + navigates)
  const sideItemsWithLogout = [
    ...sideItems,
    {
      to: "/welcome" as const,
      label: "Logout",
      icon: LogOut,
      onClick: logout,
    },
  ];

  return (
    <div className="min-h-dvh flex w-full bg-muted/40">
      <SideNav items={sideItemsWithLogout} role="worker" onLogout={logout} />
      <div className="flex-1 min-w-0 flex flex-col">
        <TopNav name={user.name} role="worker" onLogout={logout} />
        <main className="flex-1 min-w-0 pb-28 md:pb-10">
          <Outlet />
        </main>
      </div>
      <BottomNav items={bottomItems} />
    </div>
  );
}
