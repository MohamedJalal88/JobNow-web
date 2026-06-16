import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { ArrowLeft, Briefcase, Flag, IndianRupee, MoreHorizontal, TrendingUp, Users } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Admin — JobNow" }] }),
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      throw redirect({ to: "/login", replace: true });
    }
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", session.user.id)
      .single();
    if (profile?.role !== "admin") {
      throw redirect({ to: "/", replace: true });
    }
  },
  component: Admin,
});

function Admin() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeJobs: 0,
    gmv: 0,
    reports: 0,
  });
  const [recentUsers, setRecentUsers] = useState<any[]>([]);
  const [recentJobs, setRecentJobs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadAdminData() {
      try {
        // Fetch profiles (users)
        const { data: usersData, error: usersErr } = await supabase
          .from("profiles")
          .select("*")
          .order("created_at", { ascending: false });

        if (usersErr) throw usersErr;

        // Fetch jobs
        const { data: jobsData, error: jobsErr } = await supabase
          .from("jobs")
          .select("*")
          .order("created_at", { ascending: false });

        if (jobsErr) throw jobsErr;

        // Fetch hired applications for GMV calculation
        const { data: appsData } = await supabase
          .from("applications")
          .select("*, job:jobs(pay_per_day, duration_days)")
          .eq("status", "hired");

        const calculatedGmv = (appsData || []).reduce((acc, app: any) => {
          const pay = app.job?.pay_per_day || 0;
          const days = app.job?.duration_days || 0;
          return acc + (pay * days);
        }, 0);

        const openOrActiveJobsCount = (jobsData || []).filter(
          (j) => j.status === "open" || j.status === "active"
        ).length;

        // Low rating warnings as simulated reports
        const reportsCount = (usersData || []).filter((u) => u.rating && u.rating < 3.0).length;

        setStats({
          totalUsers: usersData?.length || 0,
          activeJobs: openOrActiveJobsCount,
          gmv: calculatedGmv,
          reports: reportsCount,
        });

        setRecentUsers((usersData || []).slice(0, 5));
        setRecentJobs((jobsData || []).slice(0, 5));
      } catch (err) {
        console.error("Error loading admin data:", err);
      } finally {
        setIsLoading(false);
      }
    }

    loadAdminData();
  }, []);

  const STATS_CARDS = [
    { label: "Total users", value: stats.totalUsers.toLocaleString(), icon: Users, tone: "from-blue-800 to-slate-900" },
    { label: "Active jobs", value: stats.activeJobs.toLocaleString(), icon: Briefcase, tone: "from-emerald-500 to-teal-600" },
    { label: "GMV (₹)", value: stats.gmv >= 100000 ? `${(stats.gmv / 100000).toFixed(1)}L` : stats.gmv.toLocaleString(), icon: IndianRupee, tone: "from-blue-600 to-sky-700" },
    { label: "Reports", value: stats.reports.toString(), icon: Flag, tone: "from-slate-700 to-slate-900" },
  ];

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <main className="min-h-dvh bg-background">
      <div className="max-w-5xl mx-auto px-5 pt-7 pb-16">
        <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground"><ArrowLeft className="h-4 w-4" /> Back</Link>
        <div className="mt-4 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Admin console</p>
            <h1 className="text-3xl font-extrabold">Overview</h1>
          </div>
          <Badge className="bg-success/15 text-success border-0 rounded-full">All systems normal</Badge>
        </div>

        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
          {STATS_CARDS.map((s) => (
            <div key={s.label} className={`relative overflow-hidden rounded-2xl p-4 text-white bg-gradient-to-br ${s.tone} shadow-soft`}>
              <div className="absolute -top-4 -right-4 h-20 w-20 rounded-full bg-white/15 blur-xl" />
              <div className="relative flex items-center justify-between">
                <p className="text-xs opacity-90">{s.label}</p>
                <s.icon className="h-4 w-4 opacity-90" />
              </div>
              <p className="relative mt-2 text-2xl font-extrabold">{s.value}</p>
              <p className="relative text-[10px] opacity-90 mt-0.5 inline-flex items-center gap-1"><TrendingUp className="h-3 w-3" />+12% MoM</p>
            </div>
          ))}
        </div>

        <div className="mt-7 grid md:grid-cols-2 gap-5">
          <Panel title="Recent users">
            <div className="divide-y divide-border">
              {recentUsers.map((w) => {
                const initials = w.name?.split(" ").map((n: string) => n[0]).slice(0, 2).join("").toUpperCase() || "U";
                return (
                  <div key={w.id} className="py-3 flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-gradient-primary text-primary-foreground font-semibold">
                        {w.avatar || initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{w.name}</p>
                      <p className="text-xs text-muted-foreground capitalize">{w.role} · {w.skill || "Helper"} · ★ {w.rating || "5.0"}</p>
                    </div>
                    <button className="h-8 w-8 rounded-full hover:bg-muted grid place-items-center"><MoreHorizontal className="h-4 w-4" /></button>
                  </div>
                );
              })}
            </div>
          </Panel>

          <Panel title="Recent jobs">
            <div className="divide-y divide-border">
              {recentJobs.map((j) => (
                <div key={j.id} className="py-3 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-muted grid place-items-center text-xs font-bold uppercase">
                    {j.title.substring(0, 2)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{j.title}</p>
                    <p className="text-xs text-muted-foreground">₹{j.pay_per_day}/day · {j.location}</p>
                  </div>
                  <Badge variant="secondary" className="rounded-full capitalize">{j.status}</Badge>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </div>
    </main>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-3xl bg-card border border-border p-5 shadow-soft">
      <div className="flex items-center justify-between mb-2">
        <h2 className="font-bold">{title}</h2>
        <button className="text-xs text-primary font-medium">View all</button>
      </div>
      {children}
    </div>
  );
}
