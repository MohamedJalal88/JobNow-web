import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import { ArrowLeft, ArrowUpRight, Briefcase, IndianRupee, TrendingUp, Loader2 } from "lucide-react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/worker/earnings/monthly")({
  head: () => ({ meta: [{ title: "Monthly Earnings — JobNow" }] }),
  component: Monthly,
});

function Monthly() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [earningsData, setEarningsData] = useState<any>(null);

  useEffect(() => {
    async function loadData() {
      if (!user) return;
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from("applications")
          .select("*, job:jobs(*, contractor:profiles(*))")
          .eq("worker_id", user.id)
          .in("status", ["hired", "completed"]);

        if (error) throw error;

        const apps = data || [];
        
        let total = 0;
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        const historyList = apps.map((app: any) => {
          const j = app.job;
          const amt = j.pay_per_day * j.duration_days;
          const isCompleted = j.status === "completed" || j.escrow_status === "released" || j.attendance_status === "clocked_out" || app.status === "completed";
          
          total += amt;

          return {
            id: app.id,
            amount: amt,
            status: isCompleted ? "Paid" : "Pending",
            rawDate: new Date(j.created_at),
          };
        });

        // 12 Months Trend
        const yearlyData = Array.from({ length: 12 }).map((_, i) => {
          const d = new Date();
          d.setMonth(d.getMonth() - (11 - i));
          const label = d.toLocaleDateString("en-US", { month: "short" });
          const amt = historyList
            .filter((h) => h.status === "Paid" && h.rawDate.getMonth() === d.getMonth() && h.rawDate.getFullYear() === d.getFullYear())
            .reduce((sum, h) => sum + h.amount, 0);
          return { label, amt };
        });

        // Completed jobs this month
        const thisMonthCompletedJobs = historyList.filter(
          (h) => h.status === "Paid" && h.rawDate >= startOfMonth
        );
        const thisMonthAmt = thisMonthCompletedJobs.reduce((sum, h) => sum + h.amount, 0);
        const completedCount = thisMonthCompletedJobs.length;

        // Previous month completed
        const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
        const prevMonthCompletedJobs = historyList.filter(
          (h) => h.status === "Paid" && h.rawDate >= prevMonthStart && h.rawDate <= prevMonthEnd
        );
        const prevMonthAmt = prevMonthCompletedJobs.reduce((sum, h) => sum + h.amount, 0);

        // Worked days calendar
        const workedDays = new Set(
          thisMonthCompletedJobs.map((h) => h.rawDate.getDate())
        );

        setEarningsData({
          yearly: yearlyData,
          thisMonthAmt,
          completedCount,
          prevMonthAmt,
          workedDays,
        });
      } catch (err) {
        console.error("Error loading monthly earnings:", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [user]);

  const months = useMemo(() => earningsData?.yearly || [], [earningsData]);
  const last = useMemo(() => months[months.length - 1]?.amt || 0, [months]);
  const prev = useMemo(() => months[months.length - 2]?.amt || 0, [months]);

  const growth = useMemo(() => {
    if (prev === 0) return last > 0 ? "100.0" : "0.0";
    return (((last - prev) / prev) * 100).toFixed(1);
  }, [last, prev]);

  const avgPerJob = useMemo(() => {
    if (!earningsData || earningsData.completedCount === 0) return 0;
    return Math.round(earningsData.thisMonthAmt / earningsData.completedCount);
  }, [earningsData]);

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 pt-6 md:pt-8 flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 text-primary animate-spin mb-2" />
        <p className="text-sm text-muted-foreground">Loading monthly earnings...</p>
      </div>
    );
  }

  const currentMonthLabel = new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" });

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 pt-6 md:pt-8 pb-20">
      <Link to="/worker/earnings" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="h-4 w-4" /> Back to Earnings
      </Link>

      <div>
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Monthly Earnings Analytics</h1>
        <p className="text-sm text-muted-foreground mt-1">Detailed view of your performance this month.</p>
      </div>

      {/* Summary cards */}
      <div className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {[
          { label: "This month", value: `₹${earningsData.thisMonthAmt.toLocaleString()}`, sub: currentMonthLabel, icon: IndianRupee },
          { label: "Jobs completed", value: String(earningsData.completedCount), sub: "Paid out this cycle", icon: Briefcase },
          { label: "Growth", value: `${growth}%`, sub: "vs last month", icon: TrendingUp },
          { label: "Avg per job", value: `₹${avgPerJob.toLocaleString()}`, sub: "Earnings efficiency", icon: ArrowUpRight },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl bg-card border border-border p-4 shadow-soft hover:shadow-elegant hover:-translate-y-0.5 transition-all">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <div className="h-8 w-8 rounded-full bg-primary/10 text-primary grid place-items-center"><s.icon className="h-4 w-4" /></div>
            </div>
            <p className="mt-2 text-2xl md:text-3xl font-extrabold">{s.value}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Trend */}
      <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 rounded-3xl bg-card border border-border p-5 shadow-soft">
          <p className="font-bold">Monthly trend (last 12 months)</p>
          <div className="mt-4 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={months} margin={{ top: 8, right: 6, left: -16, bottom: 0 }}>
                <defs>
                  <linearGradient id="mfill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="oklch(0.58 0.12 240)" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="oklch(0.58 0.12 240)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.92 0.01 240)" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: "oklch(0.5 0.03 240)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "oklch(0.5 0.03 240)" }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: "1px solid oklch(0.92 0.01 240)" }}
                  formatter={(v: number) => [`₹${v.toLocaleString()}`, "Earned"]}
                />
                <Area type="monotone" dataKey="amt" stroke="oklch(0.58 0.12 240)" strokeWidth={2.5} fill="url(#mfill)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-3xl bg-card border border-border p-5 shadow-soft">
          <p className="font-bold">Comparison</p>
          <p className="text-xs text-muted-foreground">This month vs last month</p>
          <div className="mt-4 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[{ label: "Last Month", amt: prev }, { label: "This Month", amt: last }]} margin={{ top: 8, right: 6, left: -16, bottom: 0 }}>
                <defs>
                  <linearGradient id="compFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="oklch(0.66 0.10 220)" />
                    <stop offset="100%" stopColor="oklch(0.58 0.12 240)" />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.92 0.01 240)" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: "oklch(0.5 0.03 240)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "oklch(0.5 0.03 240)" }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: "1px solid oklch(0.92 0.01 240)" }}
                  formatter={(v: number) => [`₹${v.toLocaleString()}`, "Earned"]}
                />
                <Bar dataKey="amt" fill="url(#compFill)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Work frequency */}
      <div className="mt-6 rounded-3xl bg-card border border-border p-5 shadow-soft">
        <p className="font-bold">Work frequency this month</p>
        <p className="text-xs text-muted-foreground">Days you completed jobs (highlighted in blue).</p>
        <div className="mt-4 grid grid-cols-7 md:grid-cols-15 gap-1.5">
          {Array.from({ length: 30 }).map((_, i) => {
            const worked = earningsData.workedDays.has(i + 1);
            return <div key={i} className={`aspect-square rounded-md transition-all ${worked ? "bg-gradient-primary scale-105 shadow-soft" : "bg-muted"}`} title={`Day ${i + 1}`} />;
          })}
        </div>
      </div>
    </div>
  );
}
