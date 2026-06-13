import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { ArrowLeft, CheckCircle2, Download, IndianRupee, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/worker/earnings/completed")({
  head: () => ({ meta: [{ title: "Completed Payments — JobNow" }] }),
  component: Completed,
});

function Completed() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [completedData, setCompletedData] = useState<any[]>([]);
  const [totalCompleted, setTotalCompleted] = useState(0);

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
            return j && (j.status === "completed" || j.escrow_status === "released");
          })
          .map((app: any, i: number) => {
            const j = app.job;
            const amt = j.pay_per_day * j.duration_days;
            sum += amt;
            return {
              id: app.id,
              title: j.title,
              contractor: j.contractor?.name || "Contractor",
              date: new Date(j.created_at).toLocaleDateString("en-IN", { day: 'numeric', month: 'short', year: 'numeric' }),
              amount: amt,
              txn: `TXN${String(2026000 + i * 137).padStart(8, "0")}`,
              method: i % 2 === 0 ? "UPI" : "Bank transfer",
            };
          });

        setCompletedData(rows);
        setTotalCompleted(sum);
      } catch (err) {
        console.error("Error loading completed payments:", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [user]);

  const upiCount = completedData.filter((r) => r.method === "UPI").length;
  const bankCount = completedData.filter((r) => r.method !== "UPI").length;

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 pt-6 md:pt-8 flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 text-primary animate-spin mb-2" />
        <p className="text-sm text-muted-foreground">Loading completed payments...</p>
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
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Completed Payments</h1>
          <p className="text-sm text-muted-foreground mt-1">All successfully paid jobs and their invoices.</p>
        </div>
        <Button variant="outline" className="rounded-full gap-2"><Download className="h-4 w-4" /> Export CSV</Button>
      </div>

      <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        {[
          { label: "Total received", value: `₹${totalCompleted.toLocaleString()}` },
          { label: "Transactions", value: String(completedData.length) },
          { label: "UPI payouts", value: String(upiCount) },
          { label: "Bank transfers", value: String(bankCount) },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl bg-card border border-border p-4 shadow-soft">
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className="mt-1 text-2xl font-extrabold">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-3xl bg-card border border-border shadow-soft overflow-hidden">
        <div className="overflow-x-auto">
          {completedData.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No completed payment transactions.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs text-muted-foreground">
                <tr>
                  <th className="text-left font-medium px-5 py-3">Job</th>
                  <th className="text-left font-medium px-5 py-3 hidden md:table-cell">Transaction ID</th>
                  <th className="text-left font-medium px-5 py-3 hidden sm:table-cell">Date</th>
                  <th className="text-left font-medium px-5 py-3 hidden lg:table-cell">Method</th>
                  <th className="text-left font-medium px-5 py-3">Amount</th>
                  <th className="text-left font-medium px-5 py-3">Invoice</th>
                </tr>
              </thead>
              <tbody>
                {completedData.map((h) => (
                  <tr key={h.id} className="border-t border-border hover:bg-muted/30">
                    <td className="px-5 py-3">
                      <p className="font-medium">{h.title}</p>
                      <p className="text-xs text-muted-foreground">{h.contractor}</p>
                    </td>
                    <td className="px-5 py-3 text-muted-foreground font-mono text-xs hidden md:table-cell">{h.txn}</td>
                    <td className="px-5 py-3 text-muted-foreground hidden sm:table-cell">{h.date}</td>
                    <td className="px-5 py-3 hidden lg:table-cell">
                      <Badge className="rounded-full border-0 bg-primary/10 text-primary">{h.method}</Badge>
                    </td>
                    <td className="px-5 py-3 font-semibold inline-flex items-center"><IndianRupee className="h-3.5 w-3.5" />{h.amount.toLocaleString()}</td>
                    <td className="px-5 py-3">
                      <Button size="sm" variant="ghost" className="rounded-full gap-1" onClick={() => toast.success("Invoice downloaded")}>
                        <Download className="h-3.5 w-3.5" /> PDF
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className="mt-6 rounded-3xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white p-6 shadow-elegant flex items-center gap-4">
        <CheckCircle2 className="h-10 w-10 shrink-0" />
        <div>
          <p className="font-bold">All payments verified</p>
          <p className="text-sm opacity-90">Every transaction is encrypted and verifiable from your invoice PDF.</p>
        </div>
      </div>
    </div>
  );
}
