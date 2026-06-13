import { createFileRoute } from "@tanstack/react-router";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { Briefcase, TrendingUp, UserCheck, Users, Loader2 } from "lucide-react";
import { SKILLS } from "@/lib/skills-config";
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/contractor/analytics")({
  head: () => ({ meta: [{ title: "Analytics — JobNow" }] }),
  component: Analytics,
});

const COLORS = ["#1e3a8a", "#0284c7", "#0f766e", "#334155", "#1d4ed8", "#0891b2", "#475569", "#2563eb"];

function Analytics() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    activeJobs: 0,
    hiredWorkers: 0,
    applications: 0,
    hireRate: 0,
  });
  const [hireChartData, setHireChartData] = useState<any[]>([]);
  const [skillChartData, setSkillChartData] = useState<any[]>([]);
  const [spendChartData, setSpendChartData] = useState<any[]>([]);

  useEffect(() => {
    async function loadAnalytics() {
      if (!user) return;
      try {
        // 1. Fetch contractor's jobs
        const { data: jobs, error: jobsErr } = await supabase
          .from("jobs")
          .select("*")
          .eq("contractor_id", user.id);

        if (jobsErr) throw jobsErr;

        const dbJobs = jobs || [];

        // 2. Fetch applications for these jobs
        const jobIds = dbJobs.map(j => j.id);
        let dbApps: any[] = [];
        if (jobIds.length > 0) {
          const { data: apps, error: appsErr } = await supabase
            .from("applications")
            .select("*")
            .in("job_id", jobIds);

          if (appsErr) throw appsErr;
          dbApps = apps || [];
        }

        // 3. Compute KPI counts
        const activeJobsCount = dbJobs.filter(j => j.status === "open" || j.status === "active").length;
        const hiredCount = dbApps.filter(a => a.status === "hired").length;
        const totalApps = dbApps.length;
        const computedHireRate = totalApps > 0 ? Math.round((hiredCount / totalApps) * 100) : 0;

        setStats({
          activeJobs: activeJobsCount,
          hiredWorkers: hiredCount,
          applications: totalApps,
          role: user.role, // Just auxiliary
          hireRate: computedHireRate,
        } as any);

        // 4. Group Hires vs Applications (Last 5 Months)
        const last5Months: Array<{ label: string; monthVal: number; yearVal: number; hired: number; applied: number }> = [];
        for (let i = 4; i >= 0; i--) {
          const d = new Date();
          d.setMonth(d.getMonth() - i);
          const label = d.toLocaleString("en-US", { month: "short" });
          const yearVal = d.getFullYear();
          const monthVal = d.getMonth();
          last5Months.push({ label, monthVal, yearVal, hired: 0, applied: 0 });
        }

        dbApps.forEach(app => {
          const appDate = new Date(app.created_at);
          const appMonth = appDate.getMonth();
          const appYear = appDate.getFullYear();
          const bucket = last5Months.find(m => m.monthVal === appMonth && m.yearVal === appYear);
          if (bucket) {
            bucket.applied++;
            if (app.status === "hired") {
              bucket.hired++;
            }
          }
        });
        setHireChartData(last5Months);

        // 5. Group Hires by Skill
        const skillCounts: Record<string, number> = {};
        dbApps.forEach(app => {
          if (app.status === "hired") {
            const job = dbJobs.find(j => j.id === app.job_id);
            if (job) {
              const skillId = job.skill;
              const skillObj = SKILLS.find(s => s.id === skillId);
              const displayName = skillObj ? skillObj.name : (skillId.charAt(0).toUpperCase() + skillId.slice(1));
              skillCounts[displayName] = (skillCounts[displayName] || 0) + 1;
            }
          }
        });

        let skillData = Object.keys(skillCounts).map(name => ({
          name,
          value: skillCounts[name]
        }));

        if (skillData.length === 0) {
          skillData = [{ name: "No Hires Yet", value: 1 }];
        }
        setSkillChartData(skillData);

        // 6. Spend Trend (Monthly payout volume - Last 6 Months)
        const spendMonths: Array<{ label: string; monthVal: number; yearVal: number; amt: number }> = [];
        for (let i = 5; i >= 0; i--) {
          const d = new Date();
          d.setMonth(d.getMonth() - i);
          const label = d.toLocaleString("en-US", { month: "short" });
          const yearVal = d.getFullYear();
          const monthVal = d.getMonth();
          spendMonths.push({ label, monthVal, yearVal, amt: 0 });
        }

        dbApps.forEach(app => {
          if (app.status === "hired") {
            const appDate = new Date(app.created_at);
            const appMonth = appDate.getMonth();
            const appYear = appDate.getFullYear();
            const bucket = spendMonths.find(m => m.monthVal === appMonth && m.yearVal === appYear);
            if (bucket) {
              const job = dbJobs.find(j => j.id === app.job_id);
              if (job) {
                const cost = (Number(job.pay_per_day) || 0) * (Number(job.duration_days) || 0);
                bucket.amt += cost;
              }
            }
          }
        });
        setSpendChartData(spendMonths);

      } catch (err) {
        console.error("Error loading contractor analytics data:", err);
      } finally {
        setIsLoading(false);
      }
    }

    loadAnalytics();
  }, [user]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 pt-6 md:pt-8">
      <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Analytics</h1>
      <p className="text-sm text-muted-foreground mt-1">Performance insights for your hiring activity.</p>

      <div className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <KPI tone="from-blue-800 to-slate-900" icon={<Briefcase className="h-4 w-4" />} label="Active jobs" value={String(stats.activeJobs)} sub="Jobs ready or in progress" />
        <KPI tone="from-emerald-500 to-teal-600" icon={<UserCheck className="h-4 w-4" />} label="Workers hired" value={String(stats.hiredWorkers)} sub="Cumulative hires" />
        <KPI tone="from-blue-600 to-sky-700" icon={<Users className="h-4 w-4" />} label="Applications" value={String(stats.applications)} sub="Total applications received" />
        <KPI tone="from-slate-700 to-slate-900" icon={<TrendingUp className="h-4 w-4" />} label="Hire rate" value={`${stats.hireRate}%`} sub="Hired / Total Applications" />
      </div>

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 rounded-3xl bg-card border border-border p-5 shadow-soft">
          <h2 className="font-bold">Hires vs applications</h2>
          <p className="text-xs text-muted-foreground">Last 5 months</p>
          <div className="mt-4 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hireChartData} margin={{ top: 8, right: 6, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.92 0.01 250)" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: "oklch(0.5 0.03 250)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "oklch(0.5 0.03 250)" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid oklch(0.92 0.01 250)" }} />
                <Bar dataKey="applied" name="Applied" fill="oklch(0.66 0.10 220)" radius={[8, 8, 0, 0]} />
                <Bar dataKey="hired" name="Hired" fill="oklch(0.42 0.15 240)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-3xl bg-card border border-border p-5 shadow-soft">
          <h2 className="font-bold">Hires by skill</h2>
          <p className="text-xs text-muted-foreground">Distribution of workers hired</p>
          <div className="mt-4 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={skillChartData} dataKey="value" innerRadius={50} outerRadius={90} paddingAngle={2}>
                  {skillChartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid oklch(0.92 0.01 250)" }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-1.5 text-xs">
            {skillChartData.map((s, i) => (
              <div key={s.name} className="inline-flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                <span className="truncate">{s.name} ({s.value})</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-3xl bg-card border border-border p-5 shadow-soft">
        <h2 className="font-bold">Spend trend</h2>
        <p className="text-xs text-muted-foreground">Monthly payout volume</p>
        <div className="mt-4 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={spendChartData} margin={{ top: 8, right: 6, left: -16, bottom: 0 }}>
              <defs>
                <linearGradient id="spendFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="oklch(0.58 0.12 220)" stopOpacity={0.45} />
                  <stop offset="100%" stopColor="oklch(0.58 0.12 220)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.92 0.01 240)" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: "oklch(0.5 0.03 240)" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "oklch(0.5 0.03 240)" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid oklch(0.92 0.01 240)" }} />
              <Area type="monotone" dataKey="amt" name="Payouts (₹)" stroke="oklch(0.58 0.12 220)" strokeWidth={2.5} fill="url(#spendFill)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function KPI({ tone, icon, label, value, sub }: { tone: string; icon: React.ReactNode; label: string; value: string; sub: string }) {
  return (
    <div className={`relative overflow-hidden rounded-2xl p-4 text-white bg-gradient-to-br ${tone} shadow-soft`}>
      <div className="absolute -top-4 -right-4 h-20 w-20 rounded-full bg-white/15 blur-xl" />
      <div className="relative flex items-center justify-between">
        <p className="text-xs opacity-90">{label}</p>
        <div className="h-7 w-7 rounded-full bg-white/20 grid place-items-center">{icon}</div>
      </div>
      <p className="relative mt-2 text-2xl font-extrabold">{value}</p>
      <p className="relative text-[10px] opacity-90">{sub}</p>
    </div>
  );
}
