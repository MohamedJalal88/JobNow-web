import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { JobCard } from "@/components/job-card";
import { useLanguage } from "@/lib/language";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/worker/jobs/")({
  head: () => ({ meta: [{ title: "Jobs — JobNow" }] }),
  component: WorkerJobs,
});

function WorkerJobs() {
  const { user } = useAuth();
  const [q, setQ] = useState("");
  const { t } = useLanguage();
  const [jobs, setJobs] = useState<any[]>([]);
  const [activeJobs, setActiveJobs] = useState<any[]>([]);
  const [historyJobs, setHistoryJobs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      if (!user) return;
      try {
        // 1. Fetch live jobs with contractor profile details
        const { data: dbJobs, error: jobsErr } = await supabase
          .from("jobs")
          .select("*, contractor:profiles(name, avatar)")
          .eq("status", "open")
          .order("created_at", { ascending: false });

        if (jobsErr) throw jobsErr;

        const formattedJobs = (dbJobs || []).map((j) => {
          const createdTime = new Date(j.created_at).getTime();
          const diffMins = Math.max(1, Math.floor((Date.now() - createdTime) / 60000));
          return {
            id: j.id,
            title: j.title,
            description: j.description,
            skill: j.skill,
            distanceKm: j.distance_km || 1.2,
            location: j.location,
            postedMinsAgo: diffMins,
            payPerDay: j.pay_per_day,
            workersNeeded: j.workers_needed,
            contractor: j.contractor?.name || "Contractor",
            contractorAvatar: j.contractor?.avatar || "C",
          };
        });
        setJobs(formattedJobs);

        // 2. Fetch worker's applications
        const { data: dbApps, error: appsErr } = await supabase
          .from("applications")
          .select("*, job:jobs(*, contractor:profiles(name))")
          .eq("worker_id", user.id);

        if (appsErr) throw appsErr;

        const formattedApps = (dbApps || []).map((app) => ({
          id: app.job.id,
          title: app.job.title,
          description: app.job.description,
          skill: app.job.skill,
          distanceKm: app.job.distance_km || 1.2,
          location: app.job.location,
          postedMinsAgo: Math.max(1, Math.floor((Date.now() - new Date(app.job.created_at).getTime()) / 60000)),
          payPerDay: app.job.pay_per_day,
          workersNeeded: app.job.workers_needed,
          contractor: app.job.contractor?.name || "Contractor",
          status: app.status,
          jobStatus: app.job.status,
        }));

        const active = formattedApps.filter(
          (app) => app.status === "hired" || app.status === "applied"
        );
        const history = formattedApps.filter(
          (app) => app.status === "completed" || app.jobStatus === "completed" || app.status === "declined"
        );

        setActiveJobs(active);
        setHistoryJobs(history);
      } catch (err) {
        console.error("Error loading jobs feed:", err);
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, [user]);

  const filter = (list: any[]) =>
    list.filter((j) =>
      j.title.toLowerCase().includes(q.toLowerCase()) ||
      j.skill.toLowerCase().includes(q.toLowerCase())
    );

  return (
    <div className="max-w-7xl mx-auto px-5 pt-7">
      <h1 className="text-2xl font-extrabold">{t("Jobs")}</h1>
      <p className="text-sm text-muted-foreground">{t("Browse and manage your work.")}</p>

      <div className="mt-5 bg-card border border-border rounded-2xl p-2.5 flex items-center gap-2 shadow-soft">
        <Search className="h-4 w-4 text-muted-foreground ml-1" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("Search by title or skill")} className="border-0 shadow-none px-0 h-9 focus-visible:ring-0" />
      </div>

      <Tabs defaultValue="nearby" className="mt-5">
        <TabsList className="grid grid-cols-3 w-full bg-muted rounded-full h-11 p-1">
          <TabsTrigger value="nearby" className="rounded-full data-[state=active]:bg-card data-[state=active]:shadow-soft">{t("Nearby")}</TabsTrigger>
          <TabsTrigger value="active" className="rounded-full data-[state=active]:bg-card data-[state=active]:shadow-soft">{t("Active")}</TabsTrigger>
          <TabsTrigger value="history" className="rounded-full data-[state=active]:bg-card data-[state=active]:shadow-soft">{t("History")}</TabsTrigger>
        </TabsList>

        <TabsContent value="nearby" className="mt-5 space-y-3">
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : filter(jobs).length === 0 ? (
            <EmptyState title={t("No jobs found")} body={t("Try adjusting your search criteria.")} />
          ) : (
            filter(jobs).map((j, i) => <JobCard key={j.id} job={j} index={i} />)
          )}
        </TabsContent>
        <TabsContent value="active" className="mt-5 space-y-3">
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : filter(activeJobs).length === 0 ? (
            <EmptyState title={t("No active jobs")} body={t("Claim a job slot to get started.")} />
          ) : (
            filter(activeJobs).map((j, i) => <JobCard key={j.id} job={j} index={i} />)
          )}
        </TabsContent>
        <TabsContent value="history" className="mt-5 space-y-3">
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : filter(historyJobs).length === 0 ? (
            <EmptyState title={t("No completed jobs yet")} body={t("Your finished work will appear here.")} />
          ) : (
            filter(historyJobs).map((j, i) => <JobCard key={j.id} job={j} index={i} />)
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-3xl border border-dashed border-border bg-card p-8 text-center">
      <div className="mx-auto h-14 w-14 rounded-2xl bg-gradient-mesh grid place-items-center">
        <Search className="h-6 w-6 text-muted-foreground" />
      </div>
      <p className="mt-3 font-semibold">{title}</p>
      <p className="text-sm text-muted-foreground mt-1">{body}</p>
    </div>
  );
}
