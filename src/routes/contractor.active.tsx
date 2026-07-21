import { createFileRoute, Link } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";
import { ChevronRight, Users, Briefcase } from "lucide-react";
import { SKILLS } from "@/lib/skills-config";
import { MoreHorizontal, Edit, PauseCircle, Trash2 } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

export const Route = createFileRoute("/contractor/active")({
  head: () => ({ meta: [{ title: "Active jobs — JobNow" }] }),
  component: ActiveJobs,
});

function ActiveJobs() {
  const { user } = useAuth();
  const [jobs, setJobs] = useState<any[]>([]);
  const [applications, setApplications] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadActiveJobs() {
      if (!user) return;
      try {
        const { data: dbJobs, error: jobsErr } = await supabase
          .from("jobs")
          .select("*")
          .eq("contractor_id", user.id)
          .order("created_at", { ascending: false });

        if (jobsErr) throw jobsErr;
        setJobs(dbJobs || []);

        const jobIds = (dbJobs || []).map((j) => j.id);
        if (jobIds.length > 0) {
          const { data: dbApps, error: appsErr } = await supabase
            .from("applications")
            .select("id, job_id")
            .in("job_id", jobIds);

          if (appsErr) throw appsErr;
          setApplications(dbApps || []);
        }
      } catch (err) {
        console.error("Error loading active jobs:", err);
      } finally {
        setIsLoading(false);
      }
    }

    loadActiveJobs();
  }, [user]);

  async function handleDelete(jobId: string) {
    try {
      const { error } = await supabase.from("jobs").delete().eq("id", jobId);
      if (error) throw error;
      setJobs((prev) => prev.filter((j) => j.id !== jobId));
      toast.success("Job deleted successfully");
    } catch (err) {
      console.error("Error deleting job:", err);
      toast.error("Failed to delete job");
    }
  }

  async function handleTogglePause(jobId: string, currentStatus: string) {
    const nextStatus = currentStatus === "open" ? "completed" : "open"; // Simplified status toggle
    try {
      const { error } = await supabase
        .from("jobs")
        .update({ status: nextStatus })
        .eq("id", jobId);
      if (error) throw error;
      setJobs((prev) =>
        prev.map((j) => (j.id === jobId ? { ...j, status: nextStatus } : j))
      );
      toast.success(`Job status updated to ${nextStatus}`);
    } catch (err) {
      console.error("Error updating status:", err);
      toast.error("Failed to update status");
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 pt-6 md:pt-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Active Jobs & Escrow Roster</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage live job posts, view geofenced check-ins, and oversee escrow locks.</p>
        </div>
        <div className="rounded-2xl bg-primary/10 border border-primary/20 px-4 py-2 flex items-center gap-2 w-fit">
          <span className="text-lg">🛡️</span>
          <span className="text-xs font-extrabold text-primary uppercase tracking-wider">Escrow Fully Funded</span>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
        </div>
      ) : jobs.length === 0 ? (
        <div className="rounded-3xl bg-card border border-border p-10 text-center text-muted-foreground">
          No jobs posted yet. Go to <Link to="/contractor/post" className="text-primary hover:underline font-bold">Post Job</Link> to start hiring.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {jobs.map((j) => {
            const skill = SKILLS.find((s) => s.id === j.skill);
            const Icon = skill?.icon;
            const totalEscrow = j.pay_per_day * j.workers_needed * j.duration_days;
            const jobApps = applications.filter((app) => app.job_id === j.id);

            return (
              <div key={j.id} className="relative group">
                <Link to="/contractor/jobs/$jobId/manage" params={{ jobId: j.id }}
                  className="block rounded-3xl bg-card border border-border p-5 shadow-soft hover:shadow-elegant transition-all hover:-translate-y-1">
                  <div className="flex items-center gap-3">
                    <div className={`h-12 w-12 rounded-2xl bg-gradient-to-br ${skill?.color || "from-primary to-primary-foreground"} grid place-items-center text-white shadow-soft shrink-0`}>
                      {Icon ? <Icon className="h-5 w-5" /> : <Briefcase className="h-5 w-5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                        <Badge className={`${j.status === "open" ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"} border-0 rounded-full text-[10px] font-bold uppercase tracking-wider`}>
                          {j.status === "open" ? "Live" : j.status}
                        </Badge>
                        <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 text-[10px] font-bold uppercase tracking-wider">
                          🔒 ₹{totalEscrow.toLocaleString()} Escrow
                        </Badge>
                      </div>
                      <p className="font-bold text-base truncate text-foreground">{j.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{j.location} · 📍 Geofence: {j.geofence_radius_meters ? (j.geofence_radius_meters >= 1000 ? `${(j.geofence_radius_meters / 1000).toFixed(0)}km` : `${j.geofence_radius_meters}m`) : "1km"}</p>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                    <Stat label="Pay/Day" value={`₹${j.pay_per_day}`} />
                    <Stat label="Workers" value={`${j.workers_needed}`} />
                    <Stat label="Duration" value={`${j.duration_days}d`} />
                  </div>

                  <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-xs">
                    <span className="text-muted-foreground inline-flex items-center gap-1 font-medium">
                      <Users className="h-3.5 w-3.5 text-primary" /> {jobApps.length} applications
                    </span>
                    <span className="text-primary font-bold inline-flex items-center gap-1">
                      Manage Roster <ChevronRight className="h-3.5 w-3.5" />
                    </span>
                  </div>
                </Link>
                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="h-8 w-8 rounded-full bg-background/80 backdrop-blur border border-border grid place-items-center hover:bg-muted text-muted-foreground hover:text-foreground transition-colors shadow-sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-40 rounded-xl">
                      <DropdownMenuItem className="gap-2" asChild>
                        <Link to="/contractor/post" search={{ editId: j.id }}><Edit className="h-4 w-4" /> Edit</Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem className="gap-2" onClick={() => handleTogglePause(j.id, j.status)}>
                        <PauseCircle className="h-4 w-4" /> {j.status === "open" ? "Pause" : "Resume"}
                      </DropdownMenuItem>
                      <DropdownMenuItem className="gap-2 text-destructive focus:text-destructive" onClick={() => handleDelete(j.id)}>
                        <Trash2 className="h-4 w-4" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-muted/40 p-2">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="font-bold text-sm">{value}</p>
    </div>
  );
}
