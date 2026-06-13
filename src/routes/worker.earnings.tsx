import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import {
  ArrowDownRight, ArrowUpRight, Clock, Download, IndianRupee, TrendingUp, Wallet, Loader2
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

export const Route = createFileRoute("/worker/earnings")({
  head: () => ({ meta: [{ title: "Earnings — JobNow" }] }),
  component: Earnings,
});

const RANGES = [
  { id: "weekly", label: "Weekly" },
  { id: "monthly", label: "30 Days" },
  { id: "quarterly", label: "3 Months" },
  { id: "yearly", label: "1 Year" },
] as const;

type RangeId = (typeof RANGES)[number]["id"];

function Earnings() {
  const { user } = useAuth();
  const [range, setRange] = useState<RangeId>("weekly");
  const [earningsData, setEarningsData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

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
        let thisMonth = 0;
        
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        const historyList = apps.map((app: any) => {
          const j = app.job;
          const amt = j.pay_per_day * j.duration_days;
          const isCompleted = j.status === "completed" || j.escrow_status === "released";
          
          total += amt;
          if (isCompleted) {
            completed += amt;
            const completedDate = new Date(j.created_at);
            if (completedDate >= startOfMonth) {
              thisMonth += amt;
            }
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

        // Construct dynamic chart ranges
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

        // 2. Monthly (30 days, grouped into 6 buckets of 5 days)
        const monthlyData = Array.from({ length: 6 }).map((_, i) => {
          const endD = new Date();
          endD.setDate(endD.getDate() - (5 - i) * 5);
          const startD = new Date(endD);
          startD.setDate(startD.getDate() - 4);
          
          const label = `${startD.getDate()} ${startD.toLocaleDateString("en-US", { month: "short" })} - ${endD.getDate()} ${endD.toLocaleDateString("en-US", { month: "short" })}`;
          const amt = historyList
            .filter((h) => h.rawDate >= startD && h.rawDate <= endD)
            .reduce((sum, h) => sum + h.amount, 0);
          return { label, amt };
        });

        // 3. Quarterly (3 months, grouped weekly)
        const quarterlyData = Array.from({ length: 12 }).map((_, i) => {
          const endD = new Date();
          endD.setDate(endD.getDate() - (11 - i) * 7);
          const startD = new Date(endD);
          startD.setDate(startD.getDate() - 6);
          const label = `W${i + 1}`;
          const amt = historyList
            .filter((h) => h.rawDate >= startD && h.rawDate <= endD)
            .reduce((sum, h) => sum + h.amount, 0);
          return { label, amt };
        });

        // 4. Yearly (12 months)
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
          thisMonth,
          weekly: weeklyData,
          monthly: monthlyData,
          quarterly: quarterlyData,
          yearly: yearlyData,
          history: historyList.slice(0, 5),
          allHistory: historyList,
        });

      } catch (err) {
        console.error("Error loading earnings:", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [user]);

  const activeRangeData = earningsData ? earningsData[range] : [];
  const totalPeriod = useMemo(() => activeRangeData.reduce((s: number, d: any) => s + d.amt, 0), [activeRangeData]);
  const avgPeriod = Math.round(totalPeriod / Math.max(activeRangeData.length, 1));

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 pt-6 md:pt-8 flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 text-primary animate-spin mb-2" />
        <p className="text-sm text-muted-foreground">Loading earnings details...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 pt-6 md:pt-8 pb-20">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Earnings</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Track your income, pending payouts and payment history.
          </p>
        </div>
        <Button variant="outline" className="rounded-full gap-2"><Download className="h-4 w-4" /> Export</Button>
      </div>

      <div className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <Stat to="/worker/earnings/total" tone="from-blue-800 to-slate-900" icon={<Wallet className="h-4 w-4" />}
          label="Total earnings" value={`₹${earningsData.total.toLocaleString()}`} sub="All-time" />
        <Stat to="/worker/earnings/monthly" tone="from-emerald-500 to-teal-600" icon={<TrendingUp className="h-4 w-4" />}
          label="This month" value={`₹${earningsData.thisMonth.toLocaleString()}`} sub="Current cycle" />
        <Stat to="/worker/earnings/pending" tone="from-blue-600 to-sky-700" icon={<Clock className="h-4 w-4" />}
          label="Pending" value={`₹${earningsData.pending.toLocaleString()}`} sub="Escrow locked" />
        <Stat to="/worker/earnings/completed" tone="from-cyan-600 to-blue-700" icon={<ArrowDownRight className="h-4 w-4" />}
          label="Completed" value={`₹${earningsData.completed.toLocaleString()}`} sub="Paid out" />
      </div>

      <div className="mt-6 grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2 rounded-3xl bg-card border border-border p-5 shadow-soft">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground">Earnings overview</p>
              <p className="text-2xl font-extrabold mt-1 inline-flex items-center">
                <IndianRupee className="h-5 w-5" />{totalPeriod.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground">Avg ₹{avgPeriod.toLocaleString()} / period</p>
            </div>
            <div className="inline-flex bg-muted rounded-full p-1">
              {RANGES.map((r) => (
                <button key={r.id} onClick={() => setRange(r.id)}
                  className={cn(
                    "px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all",
                    range === r.id ? "bg-card shadow-soft text-foreground" : "text-muted-foreground"
                  )}>
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-5 h-72">
            <ResponsiveContainer width="100%" height="100%">
              {range === "weekly" || range === "quarterly" ? (
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
                    <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
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
                  <Area type="monotone" dataKey="amt" stroke="oklch(0.42 0.15 240)" strokeWidth={2.5} fill="url(#areaFill)" />
                </AreaChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-3xl bg-gradient-to-br from-blue-800 via-blue-900 to-slate-950 text-white p-6 shadow-elegant relative overflow-hidden">
          <div className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-white/15 blur-2xl" />
          <p className="text-xs uppercase tracking-widest opacity-80">Payment summary</p>
          <p className="text-3xl font-extrabold mt-2 inline-flex items-center"><IndianRupee className="h-6 w-6" />{earningsData.thisMonth.toLocaleString()}</p>
          <p className="text-xs opacity-90 mt-1">Earned this month</p>
          <div className="mt-5 space-y-3 relative">
            <Row label="Completed" value={`₹${earningsData.completed.toLocaleString()}`} />
            <Row label="Pending" value={`₹${earningsData.pending.toLocaleString()}`} />
            <Row label="Avg per job" value={`₹${(earningsData.allHistory.length > 0 ? Math.round(earningsData.total / earningsData.allHistory.length) : 0).toLocaleString()}`} />
          </div>
          <Button className="mt-5 w-full rounded-full bg-white text-blue-900 hover:bg-white/90 font-semibold" onClick={() => toast.success("Bank transfer request received!")}>
            Withdraw to bank
          </Button>
        </div>
      </div>

      <div className="mt-6 rounded-3xl bg-card border border-border shadow-soft overflow-hidden">
        <div className="p-5 flex items-center justify-between">
          <div>
            <h2 className="font-bold">Payment history</h2>
            <p className="text-xs text-muted-foreground">All recent earnings, with payout status.</p>
          </div>
          <Button variant="ghost" size="sm" className="rounded-full" asChild>
            <Link to="/worker/earnings/completed">View all</Link>
          </Button>
        </div>
        <div className="overflow-x-auto">
          {earningsData.history.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No recent payment transactions.
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
                {earningsData.history.map((h: any, i: number) => (
                  <motion.tr key={h.id}
                    initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                    className="border-t border-border hover:bg-muted/30">
                    <td className="px-5 py-3 font-medium">{h.title}</td>
                    <td className="px-5 py-3 text-muted-foreground hidden md:table-cell">{h.contractor}</td>
                    <td className="px-5 py-3 text-muted-foreground hidden sm:table-cell">{h.date}</td>
                    <td className="px-5 py-3 font-semibold inline-flex items-center"><IndianRupee className="h-3.5 w-3.5" />{h.amount.toLocaleString()}</td>
                    <td className="px-5 py-3">
                      <Badge className={cn("rounded-full border-0",
                        h.status === "Paid" ? "bg-success/15 text-success" : "bg-warning/15 text-warning")}>{h.status}</Badge>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({ to, tone, icon, label, value, sub }: { to: string; tone: string; icon: React.ReactNode; label: string; value: string; sub: string }) {
  return (
    <Link to={to} className={`group block relative overflow-hidden rounded-2xl p-4 text-white bg-gradient-to-br ${tone} shadow-soft hover:shadow-elegant hover:-translate-y-0.5 transition-all`}>
      <div className="absolute -top-6 -right-6 h-24 w-24 rounded-full bg-white/15 blur-xl" />
      <div className="relative flex items-center justify-between">
        <p className="text-xs opacity-90">{label}</p>
        <div className="h-7 w-7 rounded-full bg-white/20 grid place-items-center">{icon}</div>
      </div>
      <p className="relative mt-2 text-xl md:text-2xl font-extrabold">{value}</p>
      <p className="relative text-[10px] opacity-90 mt-0.5 inline-flex items-center gap-1"><ArrowUpRight className="h-3 w-3" />{sub}</p>
    </Link>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="opacity-80">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}
