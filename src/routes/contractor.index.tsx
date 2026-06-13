import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Bell, Briefcase, ChevronRight, Plus, TrendingUp, Users, MapPin } from "lucide-react";
import { motion } from "framer-motion";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { SKILLS } from "@/lib/skills-config";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { useLanguage } from "@/lib/language";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/contractor/")({
  head: () => ({ meta: [{ title: "Contractor dashboard — JobNow" }] }),
  component: ContractorHome,
});

function ContractorHome() {
  const { user } = useAuth();
  const companyName = user?.name ?? "Sharma Contractors";
  const [batchPaid, setBatchPaid] = useState(false);
  const [isPaying, setIsPaying] = useState(false);
  const { t } = useLanguage();

  const [jobs, setJobs] = useState<any[]>([]);
  const [applications, setApplications] = useState<any[]>([]);
  const [workers, setWorkers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadDashboardData() {
      if (!user) return;
      try {
        // 1. Fetch contractor's jobs
        const { data: dbJobs, error: jobsErr } = await supabase
          .from("jobs")
          .select("*")
          .eq("contractor_id", user.id)
          .order("created_at", { ascending: false });

        if (jobsErr) throw jobsErr;
        setJobs(dbJobs || []);

        const jobIds = (dbJobs || []).map((j) => j.id);

        // 2. Fetch applications if contractor has jobs
        if (jobIds.length > 0) {
          const { data: dbApps, error: appsErr } = await supabase
            .from("applications")
            .select("*, worker:profiles(*), job:jobs(*)")
            .in("job_id", jobIds);

          if (appsErr) throw appsErr;
          setApplications(dbApps || []);
        }

        // 3. Fetch nearby workers (profiles with role worker)
        const { data: dbWorkers, error: workersErr } = await supabase
          .from("profiles")
          .select("*")
          .eq("role", "worker")
          .limit(5);

        if (workersErr) throw workersErr;
        setWorkers(dbWorkers || []);

      } catch (err) {
        console.error("Error loading contractor dashboard:", err);
      } finally {
        setIsLoading(false);
      }
    }

    loadDashboardData();
  }, [user]);

  // Derived stats
  const activeJobsCount = jobs.filter((j) => j.status === "open" || j.status === "active").length;
  const hiredCount = applications.filter((a) => a.status === "hired" || a.status === "completed").length;
  const pendingAppsCount = applications.filter((a) => a.status === "applied").length;
  const hireRate = applications.length > 0 
    ? Math.round((hiredCount / applications.length) * 100) 
    : 0;

  const STATS = [
    { label: "Active jobs", value: String(activeJobsCount), trend: `${jobs.length} total posted`, icon: Briefcase },
    { label: "Workers hired", value: String(hiredCount), trend: "Active roster", icon: Users },
    { label: "Applications", value: String(pendingAppsCount), trend: `${applications.length} total received`, icon: Bell },
    { label: "Hire rate", value: `${hireRate}%`, trend: "Dynamic conversion", icon: TrendingUp },
  ];

  // Hired workers roster (Live Attendance)
  const rosterWorkers = applications
    .filter((a) => a.status === "hired" || a.status === "completed")
    .slice(0, 5)
    .map((a) => {
      const w = a.worker;
      const job = a.job;
      return {
        id: w.id,
        name: w.name,
        avatar: w.avatar || w.name?.split(" ").map((n: string) => n[0]).join("") || "W",
        rating: w.rating || 5.0,
        skillLevel: w.skill ? `${w.skill.charAt(0).toUpperCase()}${w.skill.slice(1)}` : "Worker",
        clockedIn: job.attendance_status === "clocked_in" || job.attendance_status === "clocked_out",
        clockInTime: job.attendance_status === "clocked_in" ? "7:30 AM" : "Pending",
      };
    });

  const totalTodayEscrow = rosterWorkers.length * 850; // Dynamic wage roll simulation based on actual roster size

  function simulateBatchPayout() {
    if (rosterWorkers.length === 0) {
      toast.error("No hired workers to pay!");
      return;
    }
    setIsPaying(true);
    setTimeout(() => {
      setIsPaying(false);
      setBatchPaid(true);
      toast.success(`✅ ₹${totalTodayEscrow.toLocaleString()} Escrow released instantly to ${rosterWorkers.length} workers via Batch UPI!`);
    }, 2000);
  }

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 pt-6 md:pt-8">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-hero text-white p-6 md:p-8 shadow-elegant">
        <div className="absolute inset-0 bg-gradient-mesh opacity-40" />
        <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-5">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <p className="text-xs uppercase tracking-widest opacity-80">{t("Welcome back")}</p>
              <span className="bg-success text-white text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                🛡️ {t("PF & ESIC Compliant Enterprise")}
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold mt-1">{companyName}</h1>
            <p className="mt-1.5 inline-flex items-center gap-1 text-sm opacity-90">
              <MapPin className="h-3.5 w-3.5" /> Hiring in {user?.location?.split(",")[0] || "Noida"} · Escrow Reserve: ₹45,000
            </p>
          </div>
          <Link
            to="/contractor/post"
            className="inline-flex items-center gap-2 h-11 px-5 rounded-full bg-white text-primary font-semibold shadow-glow hover:opacity-95 transition-all w-fit"
          >
            <Plus className="h-4 w-4" /> {t("Post a new job")}
          </Link>
        </div>
      </section>

      {/* Live Geofenced Attendance Roster & Batch UPI Escrow Payout Simulator */}
      <section className="mt-6 rounded-3xl bg-card border-2 border-primary/40 p-6 shadow-soft bg-gradient-to-r from-primary/5 via-transparent to-primary/5">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-2xl">📍</span>
              <h2 className="text-lg font-extrabold text-foreground">{t("Live Geofenced Attendance & Escrow Payout")}</h2>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {rosterWorkers.length} workers assigned. GPS Geofence: 100m.
            </p>
          </div>
          <div className="flex items-center gap-3 w-full md:w-auto justify-end">
            <div className="text-right hidden sm:block">
              <p className="text-[11px] text-muted-foreground uppercase font-bold tracking-wider">{t("Today's Escrow Wage Roll")}</p>
              <p className="text-lg font-extrabold text-primary">₹{totalTodayEscrow.toLocaleString()} <span className="text-xs font-normal text-muted-foreground">({rosterWorkers.length} workers)</span></p>
            </div>
            <button
              onClick={simulateBatchPayout}
              disabled={batchPaid || isPaying || rosterWorkers.length === 0}
              className={`h-12 px-6 rounded-full bg-gradient-primary text-primary-foreground font-bold shadow-glow hover:opacity-95 transition-all shrink-0 flex items-center gap-2 ${isPaying ? "animate-pulse" : batchPaid ? "bg-success text-white opacity-100" : ""}`}
            >
              <span>{isPaying ? "Processing Batch UPI…" : batchPaid ? "Wages Released (Escrow Cleared)" : `Release Batch Payout (${rosterWorkers.length} Workers)`}</span>
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Mini Roster Grid */}
        {rosterWorkers.length === 0 ? (
          <div className="text-center py-6 text-sm text-muted-foreground">
            No workers currently hired. When you hire workers, their geofenced attendance will appear here.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {rosterWorkers.map((w) => (
              <div key={w.id} className="rounded-2xl border border-border bg-card p-3.5 flex flex-col items-center text-center shadow-soft">
                <Avatar className="h-12 w-12 mb-2"><AvatarFallback className="bg-gradient-primary text-primary-foreground font-bold">{w.avatar}</AvatarFallback></Avatar>
                <p className="font-bold text-sm truncate w-full">{w.name}</p>
                <p className="text-[11px] text-muted-foreground mb-2">★ {w.rating} · {w.skillLevel}</p>
                <div className="mt-auto w-full pt-2 border-t border-border flex items-center justify-between text-[11px]">
                  <span className="font-semibold text-muted-foreground">Clock-in:</span>
                  <span className={w.clockedIn ? "font-bold text-success" : "font-bold text-amber-500"}>
                    {w.clockedIn ? `🟢 ${w.clockInTime}` : "🔴 7:30 AM (Pending)"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Stats — unified theme */}
      <section className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {STATS.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className="rounded-2xl bg-card border border-border p-4 md:p-5 shadow-soft hover:shadow-elegant hover:-translate-y-0.5 transition-all"
          >
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground font-medium">{t(s.label)}</p>
              <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary grid place-items-center">
                <s.icon className="h-4 w-4" />
              </div>
            </div>
            <p className="mt-3 text-2xl md:text-3xl font-extrabold tracking-tight">{s.value}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">{s.trend}</p>
          </motion.div>
        ))}
      </section>

      <div className="mt-7 grid grid-cols-1 xl:grid-cols-3 gap-5">
        {/* Active job posts */}
        <section className="xl:col-span-2">
          <Heading title={t("Active job posts")} actionTo="/contractor/active" />
          {isLoading ? (
            <div className="flex justify-center py-10">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : jobs.length === 0 ? (
            <div className="rounded-2xl bg-card border border-border p-6 text-center text-sm text-muted-foreground">
              You haven't posted any jobs yet. Click "Post a new job" above to start.
            </div>
          ) : (
            <div className="space-y-3">
              {jobs.slice(0, 4).map((j) => {
                const skill = SKILLS.find((s) => s.id === j.skill);
                const Icon = skill?.icon;
                const jobApps = applications.filter((app) => app.job_id === j.id);
                const createdTime = new Date(j.created_at).getTime();
                const diffMins = Math.max(1, Math.floor((Date.now() - createdTime) / 60000));
                
                return (
                  <Link
                    key={j.id}
                    to="/contractor/jobs/$jobId/manage"
                    params={{ jobId: j.id }}
                    className="block rounded-2xl bg-card border border-border p-4 shadow-soft hover:shadow-elegant hover:-translate-y-0.5 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`h-11 w-11 rounded-xl bg-gradient-to-br ${skill?.color || "from-primary to-primary-foreground"} grid place-items-center text-white shadow-soft`}>
                        {Icon ? <Icon className="h-5 w-5" /> : <Briefcase className="h-5 w-5" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate">{j.title}</p>
                        <p className="text-xs text-muted-foreground">{j.workers_needed} workers · ₹{j.pay_per_day}/day · {j.location}</p>
                      </div>
                      <Badge className={`${j.status === "open" ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"} border-0 rounded-full`}>
                        {j.status === "open" ? "Live" : j.status}
                      </Badge>
                    </div>
                    <div className="mt-3 flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">{jobApps.length} applications · posted {diffMins < 60 ? `${diffMins}m ago` : `${Math.floor(diffMins / 60)}h ago`}</span>
                      <span className="text-primary font-semibold inline-flex items-center">View <ChevronRight className="h-3.5 w-3.5" /></span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        {/* Nearby workers */}
        <aside>
          <Heading title={t("Nearby workers")} actionTo="/contractor/workers" />
          {isLoading ? (
            <div className="flex justify-center py-10">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : workers.length === 0 ? (
            <div className="rounded-2xl bg-card border border-border p-6 text-center text-sm text-muted-foreground">
              No workers registered in your area yet.
            </div>
          ) : (
            <div className="space-y-2.5">
              {workers.map((w) => {
                const skill = SKILLS.find((s) => s.id === w.skill);
                const nameInitials = w.name?.split(" ").map((n: string) => n[0]).join("") || "W";
                return (
                  <div key={w.id} className="rounded-2xl bg-card border border-border p-3.5 flex items-center gap-3 shadow-soft hover:shadow-elegant transition-all">
                    <Avatar className="h-11 w-11"><AvatarFallback className="bg-gradient-primary text-primary-foreground font-semibold">{w.avatar || nameInitials}</AvatarFallback></Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{w.name}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {skill?.name || w.skill || "Helper"} · ★ {w.rating || 5.0} · 1.2km
                      </p>
                    </div>
                    <Link to="/contractor/worker-details" search={{ id: w.id }} className="flex items-center justify-center h-9 px-4 rounded-full bg-gradient-primary text-primary-foreground text-xs font-semibold shadow-soft hover:opacity-95">{t("Hire")}</Link>
                  </div>
                );
              })}
            </div>
          )}
        </aside>
      </div>

      <div className="h-10" />
    </div>
  );
}

function Heading({ title, actionTo, actionLabel = "See all" }: { title: string; actionTo: string; actionLabel?: string }) {
  const { t } = useLanguage();
  return (
    <div className="flex items-center justify-between mb-3">
      <h2 className="font-bold text-lg">{title}</h2>
      <Link to={actionTo} className="text-xs text-primary font-semibold inline-flex items-center hover:gap-2 gap-1 transition-all">
        {t(actionLabel)} <ChevronRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}

