import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { CalendarRange, Download, Filter, IndianRupee, Search, SortDesc, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/lib/language";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/worker/history")({
  head: () => ({ meta: [{ title: "Job history — JobNow" }] }),
  component: History,
});

function History() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [q, setQ] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [historyItems, setHistoryItems] = useState<any[]>([]);

  useEffect(() => {
    async function loadHistory() {
      if (!user) return;
      try {
        const { data, error } = await supabase
          .from("applications")
          .select("*, job:jobs(*, contractor:profiles(name))")
          .eq("worker_id", user.id)
          .in("status", ["hired", "completed"]);

        if (error) throw error;

        const completedLocalIds: string[] = JSON.parse(localStorage.getItem(`completed_jobs_${user.id}`) || "[]");

        const formatted = (data || []).map((app: any) => {
          const payPerDay = Number(app.job?.pay_per_day) || 0;
          const duration = Number(app.job?.duration_days) || 1;
          const amt = payPerDay * duration;
          const isCompleted =
            completedLocalIds.includes(app.job_id) ||
            localStorage.getItem(`job_clocked_out_${app.job_id}`) === "true" ||
            app.status === "completed" ||
            app.job?.status === "completed" ||
            app.job?.attendance_status === "clocked_out";

          return {
            id: app.id,
            jobId: app.job_id,
            title: app.job?.title || "General Job",
            contractor: app.job?.contractor?.name || "Contractor",
            date: new Date(app.created_at).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
              year: "numeric",
            }),
            amount: amt,
            status: isCompleted ? "Paid" : "Pending",
          };
        });

        setHistoryItems(formatted);
      } catch (err) {
        console.error("Error fetching worker history:", err);
      } finally {
        setIsLoading(false);
      }
    }

    loadHistory();
  }, [user]);

  const rows = historyItems.filter((h) =>
    h.title.toLowerCase().includes(q.toLowerCase()) ||
    h.contractor.toLowerCase().includes(q.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 pt-6 md:pt-8">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">{t("Job History")}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t("All completed jobs and invoices.")}</p>
        </div>
        <Button variant="outline" className="rounded-full gap-2"><Download className="h-4 w-4" /> {t("Export CSV")}</Button>
      </div>

      <div className="mt-5 grid grid-cols-1 md:grid-cols-[1fr_auto_auto] gap-3">
        <div className="bg-card border border-border rounded-2xl p-2.5 flex items-center gap-2 shadow-soft">
          <Search className="h-4 w-4 text-muted-foreground ml-1" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("Search by job title or contractor")} className="border-0 shadow-none px-0 h-9 focus-visible:ring-0" />
        </div>
        <Button variant="outline" className="rounded-full gap-2 h-12"><Filter className="h-4 w-4" /> {t("Filters")}</Button>
        <Button variant="outline" className="rounded-full gap-2 h-12"><SortDesc className="h-4 w-4" /> {t("Latest")}</Button>
      </div>

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-3">
        {rows.map((h, i) => (
          <motion.div key={h.id}
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
            className="rounded-2xl bg-card border border-border p-4 shadow-soft hover:shadow-elegant transition-all">
            <div className="flex items-start gap-3">
              <div className="h-12 w-12 rounded-xl bg-gradient-primary text-primary-foreground grid place-items-center font-bold">
                {h.title.split(" ").map((w: string) => w[0]).slice(0, 2).join("")}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-sm truncate">{h.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{h.contractor}</p>
                  </div>
                  <Badge className={cn("rounded-full border-0 shrink-0",
                    h.status === "Paid" ? "bg-success/15 text-success" : "bg-warning/15 text-warning")}>{t(h.status)}</Badge>
                </div>
                <div className="mt-3 flex items-center justify-between text-xs">
                  <span className="text-muted-foreground inline-flex items-center gap-1"><CalendarRange className="h-3.5 w-3.5" />{h.date}</span>
                  <span className="font-bold text-base inline-flex items-center"><IndianRupee className="h-3.5 w-3.5" />{h.amount.toLocaleString()}</span>
                </div>
                <div className="mt-3 flex gap-2">
                  <Link to="/worker/jobs/$jobId" params={{ jobId: h.jobId }} search={{ from: "history" }} className="flex-1 h-9 rounded-full bg-muted text-xs font-medium grid place-items-center hover:bg-muted/70">{t("View details")}</Link>
                  <button className="h-9 px-4 rounded-full bg-gradient-primary text-primary-foreground text-xs font-semibold shadow-soft inline-flex items-center gap-1">
                    <Download className="h-3.5 w-3.5" /> {t("Invoice")}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {rows.length === 0 && (
        <div className="mt-6 rounded-3xl border border-dashed border-border bg-card p-10 text-center">
          <p className="font-semibold">{t("No jobs found")}</p>
          <p className="text-sm text-muted-foreground mt-1">{t("Try a different search term.")}</p>
        </div>
      )}
    </div>
  );
}
