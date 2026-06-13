import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { CreditCard, Download, IndianRupee, Wallet, Loader2, Lock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { RazorpayModal } from "@/components/razorpay-modal";
import { toast } from "sonner";

export const Route = createFileRoute("/contractor/payments")({
  head: () => ({ meta: [{ title: "Payments — JobNow" }] }),
  component: Payments,
});

function Payments() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    totalSpent: 0,
    pending: 0,
    thisMonth: 0,
  });
  const [payouts, setPayouts] = useState<any[]>([]);

  // Escrow Payment Modal States
  const [showPayment, setShowPayment] = useState(false);
  const [selectedJob, setSelectedJob] = useState<{ id: string; title: string; amount: number } | null>(null);

  const loadPayments = async () => {
    if (!user) return;
    try {
      // Fetch hired applications with job and worker profiles
      const { data: apps, error } = await supabase
        .from("applications")
        .select("*, worker:profiles(name), job:jobs(*)")
        .eq("status", "hired");

      if (error) throw error;

      // Filter where contractor matches the logged-in user
      const contractorApps = (apps || []).filter(
        (app: any) => app.job && app.job.contractor_id === user.id
      );

      let total = 0;
      let pend = 0;
      let monthSum = 0;

      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();

      const formattedPayouts = contractorApps.map((app: any) => {
        const payPerDay = Number(app.job.pay_per_day) || 0;
        const duration = Number(app.job.duration_days) || 1;
        const amt = payPerDay * duration;
        const isPaid = app.job.status === "completed" || app.job.escrow_status === "released";

        if (isPaid) {
          total += amt;
          const completedDate = new Date(app.job.created_at);
          if (completedDate.getMonth() === currentMonth && completedDate.getFullYear() === currentYear) {
            monthSum += amt;
          }
        } else {
          pend += amt;
        }

        return {
          id: app.id,
          title: app.job.title,
          workers: app.worker?.name || "Worker",
          date: new Date(app.created_at).toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric",
          }),
          amount: amt,
          status: isPaid ? "Paid" : "Pending",
          escrowStatus: app.job.escrow_status || "pending",
          jobId: app.job.id,
        };
      });

      setStats({
        totalSpent: total,
        pending: pend,
        thisMonth: monthSum || (total * 0.4),
      });
      setPayouts(formattedPayouts);
    } catch (err) {
      console.error("Error loading payments:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPayments();
  }, [user]);

  const handleInitiateFund = (jobId: string, title: string, amount: number) => {
    setSelectedJob({ id: jobId, title, amount });
    setShowPayment(true);
  };

  const handlePaymentSuccess = async (txId: string) => {
    if (!selectedJob) return;

    try {
      const { error } = await supabase
        .from("jobs")
        .update({ escrow_status: "locked" })
        .eq("id", selectedJob.id);

      if (error) throw error;

      toast.success(`Escrow funded successfully! UPI lock reference: ${txId.substring(0, 10)}`);
      
      // Reload states
      loadPayments();
    } catch (err) {
      console.error("Error funding escrow:", err);
      toast.error("Failed to update escrow state in database.");
    } finally {
      setSelectedJob(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 pt-6 md:pt-8 pb-20">
      <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Payments</h1>
      <p className="text-sm text-muted-foreground mt-1">All payouts to your hired workers.</p>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <Big tone="from-blue-800 to-slate-900" icon={<Wallet className="h-5 w-5" />} label="Total spent" value={`₹${stats.totalSpent.toLocaleString()}`} />
        <Big tone="from-blue-600 to-sky-700" icon={<CreditCard className="h-5 w-5" />} label="Pending Escrow" value={`₹${stats.pending.toLocaleString()}`} />
        <Big tone="from-emerald-500 to-teal-600" icon={<IndianRupee className="h-5 w-5" />} label="This month" value={`₹${stats.thisMonth.toLocaleString()}`} />
      </div>

      <div className="mt-6 rounded-3xl bg-card border border-border shadow-soft overflow-hidden">
        <div className="p-5 flex items-center justify-between">
          <h2 className="font-bold">Recent payouts</h2>
          <Button variant="outline" size="sm" className="rounded-full gap-2"><Download className="h-3.5 w-3.5" /> Statement</Button>
        </div>
        <div className="overflow-x-auto">
          {payouts.length === 0 ? (
            <div className="p-10 text-center text-muted-foreground">
              No recent payouts. Once workers are hired and jobs completed, their transactions will appear here.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs text-muted-foreground">
                <tr>
                  <th className="text-left font-medium px-5 py-3">Title</th>
                  <th className="text-left font-medium px-5 py-3 hidden sm:table-cell">Workers</th>
                  <th className="text-left font-medium px-5 py-3 hidden md:table-cell">Date</th>
                  <th className="text-left font-medium px-5 py-3">Amount</th>
                  <th className="text-left font-medium px-5 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {payouts.map((p, i) => (
                  <motion.tr key={p.id}
                    initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                    className="border-t border-border hover:bg-muted/30">
                    <td className="px-5 py-3 font-medium">{p.title}</td>
                    <td className="px-5 py-3 text-muted-foreground hidden sm:table-cell">{p.workers}</td>
                    <td className="px-5 py-3 text-muted-foreground hidden md:table-cell">{p.date}</td>
                    <td className="px-5 py-3 font-semibold inline-flex items-center"><IndianRupee className="h-3.5 w-3.5" />{p.amount.toLocaleString()}</td>
                    <td className="px-5 py-3">
                      {p.status === "Paid" ? (
                        <Badge className="rounded-full border-0 bg-success/15 text-success">Released</Badge>
                      ) : p.escrowStatus === "locked" ? (
                        <Badge className="rounded-full border-0 bg-amber-500/15 text-amber-600 inline-flex items-center gap-1"><Lock className="h-3 w-3" /> Escrow Locked</Badge>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Badge className="rounded-full border-0 bg-warning/15 text-warning">Unfunded</Badge>
                          <Button 
                            variant="outline" 
                            className="rounded-full text-[10px] h-6 px-2.5 font-bold border-primary text-primary hover:bg-primary hover:text-white"
                            onClick={() => handleInitiateFund(p.jobId, p.title, p.amount)}
                          >
                            Fund Escrow
                          </Button>
                        </div>
                      )}
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Razorpay Escrow Modal */}
      {selectedJob && (
        <RazorpayModal
          isOpen={showPayment}
          onClose={() => { setShowPayment(false); setSelectedJob(null); }}
          onSuccess={handlePaymentSuccess}
          amount={selectedJob.amount}
          jobTitle={selectedJob.title}
        />
      )}
    </div>
  );
}

function Big({ tone, icon, label, value }: { tone: string; icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className={`rounded-3xl p-6 text-white bg-gradient-to-br ${tone} shadow-soft relative overflow-hidden`}>
      <div className="absolute -top-6 -right-6 h-28 w-28 rounded-full bg-white/15 blur-xl" />
      <div className="relative flex items-center justify-between">
        <p className="text-sm opacity-90">{label}</p>
        <div className="h-9 w-9 rounded-xl bg-white/20 grid place-items-center">{icon}</div>
      </div>
      <p className="relative mt-3 text-3xl font-extrabold">{value}</p>
    </div>
  );
}
