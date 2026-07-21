import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import {
  ArrowLeft, Calendar, CheckCircle2, Clock, IndianRupee, MapPin,
  MessageSquare, Phone, Share2, ShieldCheck, Star, Users, Loader2, Download,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { JobCard } from "@/components/job-card";
import { SKILLS } from "@/lib/skills-config";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { MapDisplay } from "@/components/map";
import { z } from "zod";

const searchSchema = z.object({
  from: z.string().optional(),
});

export const Route = createFileRoute("/worker/jobs/$jobId/")({
  validateSearch: (search) => searchSchema.parse(search),
  head: () => ({ meta: [{ title: "Job details — JobNow" }] }),
  component: JobDetails,
});

function JobDetails() {
  const { jobId } = useParams({ from: "/worker/jobs/$jobId/" });
  const { from } = Route.useSearch();
  const { user } = useAuth();
  const [job, setJob] = useState<any>(null);
  const [related, setRelated] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const skill = SKILLS.find((s) => s.id === job?.skill);
  const Icon = skill?.icon;

  useEffect(() => {
    async function loadJob() {
      try {
        const { data: dbJob, error: jobErr } = await supabase
          .from("jobs")
          .select("*, contractor:profiles(name, avatar)")
          .eq("id", jobId)
          .single();

        if (jobErr) throw jobErr;

        let appData = null;
        if (user) {
          const { data: a } = await supabase
            .from("applications")
            .select("*")
            .eq("job_id", jobId)
            .eq("worker_id", user.id)
            .maybeSingle();
          appData = a;
        }

        if (dbJob) {
          const isCompleted =
            dbJob.status === "completed" ||
            dbJob.attendance_status === "clocked_out" ||
            dbJob.escrow_status === "released" ||
            appData?.status === "completed";

          const formattedJob = {
            id: dbJob.id,
            title: dbJob.title,
            description: dbJob.description,
            skill: dbJob.skill,
            distanceKm: dbJob.distance_km || 1.2,
            location: dbJob.location,
            latitude: dbJob.latitude,
            longitude: dbJob.longitude,
            payPerDay: dbJob.pay_per_day,
            durationDays: dbJob.duration_days,
            workersNeeded: dbJob.workers_needed,
            startDate: new Date(dbJob.created_at).toLocaleDateString("en-IN", { day: 'numeric', month: 'short' }),
            contractor: dbJob.contractor?.name || "Contractor",
            contractorAvatar: dbJob.contractor?.avatar || "C",
            contractorId: dbJob.contractor_id,
            isCompleted,
            userAppStatus: appData?.status || null,
          };
          setJob(formattedJob);

          // Fetch other open jobs if active
          if (!isCompleted) {
            const { data: dbRelated, error: relatedErr } = await supabase
              .from("jobs")
              .select("*, contractor:profiles(name, avatar)")
              .eq("status", "open")
              .neq("id", jobId)
              .limit(3);

            if (!relatedErr && dbRelated) {
              const formattedRelated = dbRelated.map((r) => ({
                id: r.id,
                title: r.title,
                description: r.description,
                skill: r.skill,
                distanceKm: r.distance_km || 1.2,
                location: r.location,
                postedMinsAgo: Math.max(1, Math.floor((Date.now() - new Date(r.created_at).getTime()) / 60000)),
                payPerDay: r.pay_per_day,
                workersNeeded: r.workers_needed,
                contractor: r.contractor?.name || "Contractor",
              }));
              setRelated(formattedRelated);
            }
          }
        }
      } catch (err) {
        console.error("Error loading job details:", err);
        toast.error("Failed to load job details.");
      } finally {
        setIsLoading(false);
      }
    }

    loadJob();
  }, [jobId, user]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-12 text-center">
        <h2 className="text-xl font-bold">Job not found</h2>
        <p className="text-muted-foreground mt-2">This job posting may have been closed or deleted.</p>
        <Link to="/worker/history" className="mt-4 inline-flex h-10 px-5 items-center bg-primary text-primary-foreground rounded-full text-sm font-semibold">Back to Job History</Link>
      </div>
    );
  }

  const backLinkTarget = from === "history" || job.isCompleted ? "/worker/history" : "/worker/jobs";

  return (
    <main className="min-h-dvh bg-muted/40 pb-32 md:pb-12">
      {/* Hero */}
      <header className={`relative text-white bg-gradient-to-br ${job.isCompleted ? "from-emerald-700 via-teal-800 to-slate-900" : skill?.color ?? "from-primary to-primary"}`}>
        <div className="max-w-7xl mx-auto px-4 md:px-8 pt-6 pb-16 md:pb-24">
          <div className="flex items-center justify-between">
            <Link to={backLinkTarget} className="h-10 w-10 rounded-full glass border border-white/20 grid place-items-center">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <button className="h-10 w-10 rounded-full glass border border-white/20 grid place-items-center"><Share2 className="h-4 w-4" /></button>
          </div>
          <div className="mt-6 flex items-center gap-4">
            <div className="h-16 w-16 md:h-20 md:w-20 rounded-2xl bg-white/20 grid place-items-center backdrop-blur">
              {Icon && <Icon className="h-8 w-8 md:h-10 md:w-10" />}
            </div>
            <div>
              {job.isCompleted ? (
                <Badge className="bg-success text-white border-0 rounded-full font-bold">✅ Job Completed & Paid</Badge>
              ) : (
                <Badge className="bg-white/20 border-white/20 rounded-full">{skill?.name}</Badge>
              )}
              <h1 className="mt-1.5 text-3xl md:text-4xl xl:text-5xl font-extrabold leading-tight">{job.title}</h1>
              <p className="mt-1 text-sm opacity-90 inline-flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" /> {job.location} · {job.distanceKm} km away</p>
            </div>
          </div>
        </div>
      </header>

      {/* Content grid */}
      <section className="max-w-7xl mx-auto px-4 md:px-8 -mt-8 md:-mt-12 grid lg:grid-cols-3 gap-5 relative z-10">
        <div className="lg:col-span-2 space-y-5">
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Info icon={IndianRupee} label="Pay per day" value={`₹${job.payPerDay}`} />
            <Info icon={Clock} label="Duration" value={`${job.durationDays} days`} />
            <Info icon={Users} label="Workers needed" value={String(job.workersNeeded)} />
            <Info icon={Calendar} label="Starts" value={job.startDate} />
          </div>

          {/* Description */}
          <div className="rounded-3xl bg-card border border-border p-6 shadow-soft">
            <h2 className="font-bold text-lg">About this job</h2>
            <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{job.description}</p>
            <div className="mt-5 grid sm:grid-cols-2 gap-3">
              {[
                "Material provided on-site",
                "Lunch & water provided",
                "Safety equipment included",
                "Same-day payment after completion",
              ].map((p) => (
                <div key={p} className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-success mt-0.5 shrink-0" />
                  {p}
                </div>
              ))}
            </div>
          </div>

          {/* Map */}
          <div className="rounded-3xl bg-card border border-border p-6 shadow-soft">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-lg inline-flex items-center gap-2"><MapPin className="h-5 w-5 text-primary" /> Location</h2>
              <Badge variant="outline" className="rounded-full">{job.distanceKm} km</Badge>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">{job.location}</p>
            <div className="mt-4 h-72 md:h-96 rounded-2xl border border-border overflow-hidden relative" style={{ minHeight: "288px" }}>
              <MapDisplay
                lat={job.latitude ? Number(job.latitude) : 28.5355}
                lng={job.longitude ? Number(job.longitude) : 77.3910}
                title={job.title}
                className="h-full w-full"
              />
            </div>
          </div>

          {/* Related / Similar jobs (only if active) */}
          {!job.isCompleted && related.length > 0 && (
            <div>
              <h2 className="font-bold text-lg">Similar jobs nearby</h2>
              <div className="mt-3 grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {related.map((r, i) => <JobCard key={r.id} job={r} index={i} />)}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-3xl bg-card border border-border p-6 shadow-elegant">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Contractor</p>
            <div className="mt-3 flex items-center gap-3">
              <Avatar className="h-14 w-14"><AvatarFallback className="bg-gradient-primary text-primary-foreground font-bold">{job.contractorAvatar}</AvatarFallback></Avatar>
              <div>
                <p className="font-bold">{job.contractor}</p>
                <p className="text-xs text-amber-600 font-semibold inline-flex items-center gap-1"><Star className="h-3 w-3 fill-current" /> 4.7 · 86 hires</p>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <Button variant="outline" className="rounded-full gap-1.5"><Phone className="h-4 w-4" /> Call</Button>
              <Button variant="outline" className="rounded-full gap-1.5" asChild>
                <Link to="/worker/messages" search={{ userId: job.contractorId }}><MessageSquare className="h-4 w-4" /> Chat</Link>
              </Button>
            </div>
            <div className="mt-4 rounded-2xl bg-success/10 text-success p-3 text-xs inline-flex items-center gap-2">
              <ShieldCheck className="h-4 w-4" /> ID verified · GST registered
            </div>
          </div>

          {job.isCompleted ? (
            <div className="rounded-3xl bg-card border border-border p-6 shadow-soft space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs uppercase tracking-widest text-muted-foreground">Total Payout</p>
                <Badge className="bg-success/15 text-success border-0 font-bold text-xs">Paid via Escrow</Badge>
              </div>
              <div>
                <p className="text-3xl font-extrabold inline-flex items-center text-success">
                  <IndianRupee className="h-6 w-6" />{(job.payPerDay * job.durationDays).toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground mt-1">₹{job.payPerDay}/day × {job.durationDays} days · Same-day UPI</p>
              </div>
              <Button
                onClick={() => toast.success("Downloading official completion invoice PDF...")}
                className="w-full h-12 rounded-full bg-gradient-primary text-primary-foreground font-semibold shadow-glow gap-2"
              >
                <Download className="h-4 w-4" /> Download Invoice
              </Button>
            </div>
          ) : (
            <div className="rounded-3xl bg-card border border-border p-6 shadow-soft">
              <p className="text-xs uppercase tracking-widest text-muted-foreground">Total payout</p>
              <p className="mt-2 text-3xl font-extrabold inline-flex items-center"><IndianRupee className="h-6 w-6" />{(job.payPerDay * job.durationDays).toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">₹{job.payPerDay}/day × {job.durationDays} days</p>
              <Link 
                to="/worker/jobs/$jobId/apply" 
                params={{ jobId: job.id }} 
                className="mt-5 w-full inline-flex items-center justify-center h-12 rounded-full bg-gradient-primary text-primary-foreground font-semibold shadow-glow"
              >
                Apply now
              </Link>
              <Button variant="outline" className="mt-2 w-full h-12 rounded-full">Save for later</Button>
            </div>
          )}
        </aside>
      </section>

      {/* Mobile sticky bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-30 border-t border-border bg-card/90 backdrop-blur-md">
        <div className="max-w-2xl mx-auto px-5 py-3 flex items-center justify-between gap-3">
          {job.isCompleted ? (
            <>
              <div>
                <p className="text-xs font-bold text-success">✅ Job Completed</p>
                <p className="text-sm font-extrabold">₹{(job.payPerDay * job.durationDays).toLocaleString()} Received</p>
              </div>
              <Button
                onClick={() => toast.success("Downloading invoice PDF...")}
                className="h-10 px-5 rounded-full bg-gradient-primary text-primary-foreground font-semibold text-xs gap-1.5 shadow-soft"
              >
                <Download className="h-3.5 w-3.5" /> Invoice
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" className="rounded-full h-12 px-5">Save</Button>
              <Link 
                to="/worker/jobs/$jobId/apply" 
                params={{ jobId: job.id }} 
                className="flex-1 inline-flex items-center justify-center h-12 rounded-full bg-gradient-primary text-primary-foreground font-semibold shadow-glow"
              >
                Apply now · ₹{job.payPerDay}/day
              </Link>
            </>
          )}
        </div>
      </div>
    </main>
  );
}

function Info({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-card border border-border p-4 shadow-soft hover:shadow-elegant transition-all">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        <p className="text-xs">{label}</p>
      </div>
      <p className="mt-1 font-bold text-lg">{value}</p>
    </div>
  );
}

function Info({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-card border border-border p-4 shadow-soft hover:shadow-elegant transition-all">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        <p className="text-xs">{label}</p>
      </div>
      <p className="mt-1 font-bold text-lg">{value}</p>
    </div>
  );
}
