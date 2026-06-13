import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { ArrowLeft, Clock, IndianRupee, Wallet, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/worker/earnings/pending")({
  head: () => ({ meta: [{ title: "Pending Payments — JobNow" }] }),
  component: Pending,
});

function Pending() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [pendingData, setPendingData] = useState<any[]>([]);
  const [totalPending, setTotalPending] = useState(0);

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
        
        let sum = 0;
        const rows = apps
          .filter((app: any) => {
            const j = app.job;
            return j && j.status !== "completed" && j.escrow_status !== "released";
          })
          .map((app: any) => {
            const j = app.job;
            const amt = j.pay_per_day * j.duration_days;
            sum += amt;
            
            // Expected payout date is 5 days after creation
            const created = new Date(j.created_at);
            const expectedDate = new Date(created.getTime() + 5 * 24 * 60 * 60 * 1000);
            
            return {
              id: app.id,
              job: j.title,
              contractor: j.contractor?.name || "Contractor",
              amount: amt,
              date: created.toLocaleDateString("en-IN", { day: 'numeric', month: 'short', year: 'numeric' }),
              expected: expectedDate.toLocaleDateString("en-IN", { day: 'numeric', month: 'short', year: 'numeric' }),
            };
          });

        setPendingData(rows);
        setTotalPending(sum);
      } catch (err) {
        console.error("Error loading pending payments:", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [user]);

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 pt-6 md:pt-8 flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 text-primary animate-spin mb-2" />
        <p className="text-sm text-muted-foreground">Loading pending payments...</p>
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
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Pending Payments</h1>
          <p className="text-sm text-muted-foreground mt-1">Payouts that are still being processed.</p>
        </div>
        <Button onClick={() => toast.success("Withdraw request sent")} className="rounded-full bg-gradient-primary text-primary-foreground gap-2">
          <Wallet className="h-4 w-4" /> Request withdrawal
        </Button>
      </div>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
        <div className="md:col-span-2 rounded-3xl bg-gradient-to-br from-blue-600 to-sky-700 text-white p-6 shadow-elegant relative overflow-hidden">
          <div className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-white/15 blur-2xl" />
          <p className="text-xs uppercase tracking-widest opacity-90">Total pending</p>
          <p className="text-4xl md:text-5xl font-extrabold mt-2 inline-flex items-center"><IndianRupee className="h-8 w-8" />{totalPending.toLocaleString()}</p>
          <p className="text-sm opacity-90 mt-2">{pendingData.length} payouts awaiting</p>
        </div>
        <div className="rounded-3xl bg-card border border-border p-6 shadow-soft">
          <p className="text-xs text-muted-foreground">Avg release time</p>
          <p className="text-2xl font-extrabold mt-1">3.2 days</p>
          <p className="text-xs text-muted-foreground mt-2">Most contractors release within 5 days of job completion.</p>
        </div>
      </div>

      <div className="mt-6 space-y-3">
        {pendingData.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground bg-card border border-border rounded-2xl">
            No pending payments.
          </div>
        ) : (
          pendingData.map((p) => (
            <div key={p.id} className="rounded-2xl bg-card border border-border p-5 shadow-soft hover:shadow-elegant transition-all flex flex-col md:flex-row md:items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-amber-500/15 text-amber-600 grid place-items-center shrink-0">
                <Clock className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">{p.job}</p>
                <p className="text-xs text-muted-foreground">{p.contractor} · Created on {p.date}</p>
              </div>
              <div className="md:text-right">
                <p className="font-extrabold text-lg inline-flex items-center"><IndianRupee className="h-4 w-4" />{p.amount.toLocaleString()}</p>
                <p className="text-[11px] text-muted-foreground">Expected by {p.expected}</p>
              </div>
              <Badge className="rounded-full border-0 bg-warning/15 text-warning self-start md:self-center">Pending</Badge>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
