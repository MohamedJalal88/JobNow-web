import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Check, X } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

export const Route = createFileRoute("/contractor/applications/")({
  head: () => ({ meta: [{ title: "Applications — JobNow" }] }),
  component: Applications,
});

function Applications() {
  const { user } = useAuth();
  const [applications, setApplications] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadApplications() {
      if (!user) return;
      try {
        // 1. Get contractor's jobs
        const { data: dbJobs } = await supabase
          .from("jobs")
          .select("id")
          .eq("contractor_id", user.id);

        const jobIds = (dbJobs || []).map((j) => j.id);

        if (jobIds.length > 0) {
          const { data: dbApps, error: appsErr } = await supabase
            .from("applications")
            .select("*, worker:profiles(*), job:jobs(*)")
            .in("job_id", jobIds)
            .order("created_at", { ascending: false });

          if (appsErr) throw appsErr;
          setApplications(dbApps || []);
        }
      } catch (err) {
        console.error("Error loading contractor applications:", err);
      } finally {
        setIsLoading(false);
      }
    }

    loadApplications();
  }, [user]);

  async function handleHire(appId: string) {
    try {
      const app = applications.find((a) => a.id === appId);
      const { error } = await supabase
        .from("applications")
        .update({ status: "hired" })
        .eq("id", appId);

      if (error) throw error;

      // Create notification for the worker
      if (app) {
        try {
          await supabase.rpc("insert_notification", {
            p_user_id: app.worker_id,
            p_title: "Congratulations! You are hired!",
            p_body: `You have been hired for the job "${app.job?.title}". Pack your tools!`,
            p_type: "job",
          });
        } catch (notifErr) {
          console.warn("Could not insert notification:", notifErr);
        }
      }

      setApplications((prev) =>
        prev.map((app) => (app.id === appId ? { ...app, status: "hired" } : app))
      );
      toast.success("Worker hired successfully! Escrow locked.");
    } catch (err) {
      console.error("Error hiring worker:", err);
      toast.error("Failed to hire worker");
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 pt-6 md:pt-8">
      <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Applications</h1>
      <p className="text-sm text-muted-foreground mt-1">Workers who applied to your jobs.</p>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
        </div>
      ) : applications.length === 0 ? (
        <div className="rounded-3xl bg-card border border-border p-10 text-center text-muted-foreground">
          No worker applications found. Post more jobs to get candidate matches!
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {applications.map((a, i) => {
            const w = a.worker;
            const initials = w.name?.split(" ").map((n: string) => n[0]).join("") || "W";
            const createdTime = new Date(a.created_at).getTime();
            const diffMins = Math.max(1, Math.floor((Date.now() - createdTime) / 60000));
            const timeAgo = diffMins < 60 ? `${diffMins}m ago` : `${Math.floor(diffMins / 60)}h ago`;

            return (
              <motion.div key={a.id}
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                className="rounded-3xl bg-card border border-border p-5 shadow-soft hover:shadow-elegant transition-all">
                <div className="flex items-start gap-3">
                  <Avatar className="h-12 w-12"><AvatarFallback className="bg-gradient-primary text-primary-foreground font-semibold">{w.avatar || initials}</AvatarFallback></Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">{w.name}</p>
                    <p className="text-xs text-muted-foreground capitalize">{w.skill || "Helper"} · ★ {w.rating || 5.0}</p>
                  </div>
                  <Badge className={cn("rounded-full border-0 uppercase text-[10px] font-extrabold tracking-wider",
                    a.status === "applied" ? "bg-primary/15 text-primary"
                    : a.status === "shortlisted" ? "bg-muted text-foreground"
                    : a.status === "hired" ? "bg-success/15 text-success"
                    : "bg-destructive/15 text-destructive")}>{a.status}</Badge>
                </div>
                <div className="mt-4 rounded-2xl bg-muted/40 p-3">
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Applied for</p>
                  <p className="text-sm font-semibold truncate">{a.job?.title}</p>
                  <p className="text-[11px] text-muted-foreground mt-1">{timeAgo}</p>
                </div>
                <div className="mt-4 flex gap-2">
                  <Button variant="outline" className="rounded-full flex-1" asChild>
                    <Link to="/contractor/applications/$applicationId" params={{ applicationId: a.id }}>Review</Link>
                  </Button>
                  {a.status === "applied" && (
                    <Button onClick={() => handleHire(a.id)} className="rounded-full flex-1 bg-gradient-primary text-primary-foreground gap-1">
                      <Check className="h-4 w-4" /> Hire
                    </Button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
