import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import { ArrowLeft, Download, IndianRupee, TrendingUp, Loader2 } from "lucide-react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/worker/earnings/total")({
  head: () => ({ meta: [{ title: "Total Earnings — JobNow" }] }),
  component: TotalEarnings,
});

const FILTERS = [
  { id: "weekly", label: "Week" },
  { id: "monthly", label: "Month" },
  { id: "yearly", label: "Year" },
] as const;

function TotalEarnings() {
  const { user } = useAuth();
  const [range, setRange] = useState<"weekly" | "monthly" | "yearly">("monthly");
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
          .eq("status", "hired");

        if (error) throw error;

        const apps = data || [];
        
        let total = 0;
        let completed = 0;
        let pending = 0;
        
        const historyList = apps.map((app: any) => {
          const j = app.job;
          const amt = j.pay_per_day * j.duration_days;
          const isCompleted = j.status === "completed" || j.escrow_status === "released";
          
          total += amt;
          if (isCompleted) {
            completed += amt;
          } else {
            pending += amt;
          }

          return {
            id: app.id,
            title: j.title,
            contractor: j.contractor?.name || "Contractor",
            date: new Date(j.created_at).toLocaleDateString("en-IN", { day: 'numeric', month: 'short', year: 'numeric' }),
            amount: amt,
            status: isCompleted ? "Paid" : "Pending",
            rawDate: new Date(j.created_at),
          };
        });

        // Sort history by date descending
        historyList.sort((a, b) => b.rawDate.getTime() - a.rawDate.getTime());

        // 1. Weekly (7 days)
        const weeklyData = Array.from({ length: 7 }).map((_, i) => {
          const d = new Date();
          d.setDate(d.getDate() - (6 - i));
          const label = d.toLocaleDateString("en-US", { weekday: "short" });
          const amt = historyList
            .filter((h) => h.rawDate.toDateString() === d.toDateString())
            .reduce((sum, h) => sum + h.amount, 0);
          return { label, amt };
        });

        // 2. Monthly (30 days daily)
        const monthlyData = Array.from({ length: 30 }).map((_, i) => {
          const d = new Date();
          d.setDate(d.getDate() - (29 - i));
          const label = `${d.getDate()}`;
          const amt = historyList
            .filter((h) => h.rawDate.toDateString() === d.toDateString())
            .reduce((sum, h) => sum + h.amount, 0);
          return { label, amt };
        });

        // 3. Yearly (12 months)
        const yearlyData = Array.from({ length: 12 }).map((_, i) => {
          const d = new Date();
          d.setMonth(d.getMonth() - (11 - i));
          const label = d.toLocaleDateString("en-US", { month: "short" });
          const amt = historyList
            .filter((h) => h.rawDate.getMonth() === d.getMonth() && h.rawDate.getFullYear() === d.getFullYear())
            .reduce((sum, h) => sum + h.amount, 0);
          return { label, amt };
        });

        setEarningsData({
          total,
          completed,
          pending,
          weekly: weeklyData,
          monthly: monthlyData,
          yearly: yearlyData,
          history: historyList,
        });
      } catch (err) {
        console.error("Error loading total earnings:", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [user]);

  const activeRangeData = useMemo(() => {
    if (!earningsData) return [];
    return earningsData[range];
  }, [earningsData, range]);

  const maxWeeklyAmt = useMemo(() => {
    if (!earningsData) return 1500;
    return Math.max(...earningsData.weekly.map((w: any) => w.amt), 1500);
  }, [earningsData]);

  const maxMonthlyAmt = useMemo(() => {
    if (!earningsData) return 26000;
    const last6 = earningsData.yearly.slice(-6);
    return Math.max(...last6.map((m: any) => m.amt), 26000);
  }, [earningsData]);

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 pt-6 md:pt-8 flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 text-primary animate-spin mb-2" />
        <p className="text-sm text-muted-foreground">Loading total earnings...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 pt-6 md:pt-8 pb-20">
      <Link to="/worker/earnings" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="h-4 w-4" /> Back to Earnings
      </Link>

      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Total Earnings</h1>
          <p className="text-sm text-muted-foreground mt-1">Complete overview of your lifetime earnings on JobNow.</p>
        </div>
        <Button variant="outline" className="rounded-full gap-2"><Download className="h-4 w-4" /> Export Report</Button>
      </div>

      {/* Hero stat */}
      <div className="mt-6 rounded-3xl bg-gradient-to-br from-blue-800 via-blue-900 to-slate-950 text-white p-8 shadow-elegant relative overflow-hidden">
        <div className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-white/15 blur-2xl" />
        <p className="text-xs uppercase tracking-widest opacity-80">Lifetime earnings</p>
        <p className="text-5xl font-extrabold mt-2 inline-flex items-center"><IndianRupee className="h-9 w-9" />{earningsData.total.toLocaleString()}</p>
        <p className="text-sm opacity-90 mt-2 inline-flex items-center gap-1"><TrendingUp className="h-4 w-4" /> Active JobNow Wallet</p>
      </div>

      {/* Chart */}
      <div className="mt-6 rounded-3xl bg-card border border-border p-5 shadow-soft">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Income trends</p>
            <p className="font-bold mt-1">Earnings breakdown</p>
          </div>
          <div className="inline-flex bg-muted rounded-full p-1">
            {FILTERS.map((f) => (
              <button key={f.id} onClick={() => setRange(f.id)}
                className={cn("px-4 py-1.5 rounded-full text-xs font-semibold transition-all",
                  range === f.id ? "bg-card shadow-soft text-foreground" : "text-muted-foreground")}>
                {f.label}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-5 h-80">
          <ResponsiveContainer width="100%" height="100%">
            {range === "weekly" ? (
              <BarChart data={activeRangeData} margin={{ top: 8, right: 6, left: -16, bottom: 0 }}>
                <defs>
                  <linearGradient id="barFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="oklch(0.60 0.13 240)" />
                    <stop offset="100%" stopColor="oklch(0.42 0.15 240)" />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.92 0.01 240)" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: "oklch(0.45 0.03 240)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "oklch(0.45 0.03 240)" }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: "1px solid oklch(0.92 0.01 240)" }}
                  formatter={(v: number) => [`₹${v.toLocaleString()}`, "Earned"]}
                />
                <Bar dataKey="amt" fill="url(#barFill)" radius={[8, 8, 0, 0]} />
              </BarChart>
            ) : (
              <AreaChart data={activeRangeData} margin={{ top: 8, right: 6, left: -16, bottom: 0 }}>
                <defs>
                  <linearGradient id="totalArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="oklch(0.42 0.15 240)" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="oklch(0.42 0.15 240)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.92 0.01 240)" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: "oklch(0.45 0.03 240)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "oklch(0.45 0.03 240)" }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: "1px solid oklch(0.92 0.01 240)" }}
                  formatter={(v: number) => [`₹${v.toLocaleString()}`, "Earned"]}
                />
                <Area type="monotone" dataKey="amt" stroke="oklch(0.42 0.15 240)" strokeWidth={2.5} fill="url(#totalArea)" />
              </AreaChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>

      {/* Breakdown grids */}
      <div className="mt-6 grid lg:grid-cols-2 gap-4">
        <div className="rounded-3xl bg-card border border-border p-5 shadow-soft">
          <h2 className="font-bold">Weekly breakdown</h2>
          <div className="mt-4 space-y-2">
            {earningsData.weekly.map((w: any) => (
              <div key={w.label} className="flex items-center gap-3">
                <span className="w-10 text-xs font-medium text-muted-foreground">{w.label}</span>
                <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                  <div className="h-full bg-gradient-primary rounded-full" style={{ width: `${Math.min(100, (w.amt / maxWeeklyAmt) * 100)}%` }} />
                </div>
                <span className="text-sm font-semibold w-20 text-right">₹{w.amt.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl bg-card border border-border p-5 shadow-soft">
          <h2 className="font-bold">Monthly breakdown</h2>
          <div className="mt-4 space-y-2">
            {earningsData.yearly.slice(-6).map((m: any) => (
              <div key={m.label} className="flex items-center gap-3">
                <span className="w-10 text-xs font-medium text-muted-foreground">{m.label}</span>
                <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full" style={{ width: `${Math.min(100, (m.amt / maxMonthlyAmt) * 100)}%` }} />
                </div>
                <span className="text-sm font-semibold w-24 text-right">₹{m.amt.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Payment timeline */}
      <div className="mt-6 rounded-3xl bg-card border border-border shadow-soft overflow-hidden">
        <div className="p-5 flex items-center justify-between">
          <div>
            <h2 className="font-bold">Payment timeline</h2>
            <p className="text-xs text-muted-foreground">Full history of every payment received.</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          {earningsData.history.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No payments recorded yet.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs text-muted-foreground">
                <tr>
                  <th className="text-left font-medium px-5 py-3">Job</th>
                  <th className="text-left font-medium px-5 py-3 hidden md:table-cell">Contractor</th>
                  <th className="text-left font-medium px-5 py-3 hidden sm:table-cell">Date</th>
                  <th className="text-left font-medium px-5 py-3">Amount</th>
                  <th className="text-left font-medium px-5 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {earningsData.history.map((h: any) => (
                  <tr key={h.id} className="border-t border-border hover:bg-muted/30">
                    <td className="px-5 py-3 font-medium">{h.title}</td>
                    <td className="px-5 py-3 text-muted-foreground hidden md:table-cell">{h.contractor}</td>
                    <td className="px-5 py-3 text-muted-foreground hidden sm:table-cell">{h.date}</td>
                    <td className="px-5 py-3 font-semibold inline-flex items-center"><IndianRupee className="h-3.5 w-3.5" />{h.amount.toLocaleString()}</td>
                    <td className="px-5 py-3">
                      <Badge className={cn("rounded-full border-0",
                        h.status === "Paid" ? "bg-success/15 text-success" : "bg-warning/15 text-warning")}>{h.status}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
