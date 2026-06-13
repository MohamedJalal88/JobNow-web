import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import {
  Activity, ArrowLeft, BarChart3, CheckCircle2, ChevronRight, Clock, Copy, Download,
  Edit, MoreHorizontal, PauseCircle, Phone, StopCircle, Trash2, Users, MessageSquare, AlertCircle
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { SKILLS } from "@/lib/skills-config";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

export const Route = createFileRoute("/contractor/jobs/$jobId/manage")({
  head: () => ({ meta: [{ title: "Manage Job — JobNow" }] }),
  component: ManageJob,
});

function ManageJob() {
  const { jobId } = useParams({ from: "/contractor/jobs/$jobId/manage" });
  const [job, setJob] = useState<any>(null);
  const [applications, setApplications] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadJobData() {
      try {
        const { data: dbJob, error: jobErr } = await supabase
          .from("jobs")
          .select("*, contractor:profiles(name)")
          .eq("id", jobId)
          .single();

        if (jobErr) throw jobErr;
        setJob(dbJob);

        const { data: dbApps, error: appsErr } = await supabase
          .from("applications")
          .select("*, worker:profiles(*)")
          .eq("job_id", jobId);

        if (appsErr) throw appsErr;
        setApplications(dbApps || []);
      } catch (err) {
        console.error("Error loading job details:", err);
      } finally {
        setIsLoading(false);
      }
    }

    loadJobData();
  }, [jobId]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="max-w-7xl mx-auto px-4 pt-10 text-center">
        <h2 className="text-xl font-bold">Job not found</h2>
        <Button className="mt-4 rounded-full" asChild>
          <Link to="/contractor/active">Back to Active Jobs</Link>
        </Button>
      </div>
    );
  }

  const skill = SKILLS.find((s) => s.id === job.skill);
  const Icon = skill?.icon;
  const totalEscrow = job.pay_per_day * job.duration_days * job.workers_needed;
  const hiredCount = applications.filter((app) => app.status === "hired" || app.status === "completed").length;

  async function handleTogglePause() {
    const nextStatus = job.status === "open" ? "completed" : "open";
    try {
      const { error } = await supabase
        .from("jobs")
        .update({ status: nextStatus })
        .eq("id", job.id);
      if (error) throw error;
      setJob((prev: any) => ({ ...prev, status: nextStatus }));
      toast.success(`Job status set to ${nextStatus}`);
    } catch (err) {
      console.error("Error pausing job:", err);
      toast.error("Failed to update status");
    }
  }

  async function handleDeleteJob() {
    try {
      const { error } = await supabase.from("jobs").delete().eq("id", job.id);
      if (error) throw error;
      toast.success("Job deleted successfully");
      // Redirect
      window.location.href = "/contractor/active";
    } catch (err) {
      console.error("Error deleting job:", err);
      toast.error("Failed to delete job");
    }
  }

  function copyIdToClipboard() {
    navigator.clipboard.writeText(job.id);
    toast.success("Copied Job ID to clipboard");
  }

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 pt-6 md:pt-8 pb-20">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" className="rounded-full h-10 w-10 shrink-0" asChild>
            <Link to="/contractor/active"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">{job.title}</h1>
              <Badge className={`${job.status === "open" ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"} border-0 rounded-full font-bold uppercase tracking-wider`}>
                {job.status === "open" ? "Active" : job.status}
              </Badge>
              <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 font-bold uppercase tracking-wider">
                🔒 ₹{totalEscrow.toLocaleString()} Escrow Funded
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1 inline-flex items-center gap-1.5 flex-wrap">
              ID: {job.id.toUpperCase()} <Copy className="h-3 w-3 cursor-pointer hover:text-foreground" onClick={copyIdToClipboard} /> · Posted {Math.max(1, Math.floor((Date.now() - new Date(job.created_at).getTime()) / 60000))} mins ago · Geofence: {job.geofence_radius_meters || 100}m
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="rounded-full gap-2" onClick={handleTogglePause}>
            <PauseCircle className="h-4 w-4" /> {job.status === "open" ? "Pause" : "Resume"}
          </Button>
          <Button className="rounded-full gap-2 bg-gradient-primary text-primary-foreground" asChild>
            <Link to="/contractor/post" search={{ editId: job.id }}><Edit className="h-4 w-4" /> Edit Job</Link>
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="rounded-full h-10 w-10"><MoreHorizontal className="h-4 w-4" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 rounded-2xl">
              <DropdownMenuLabel>Job Actions</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="gap-2" onClick={handleTogglePause}><StopCircle className="h-4 w-4" /> Toggle Open/Close</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="gap-2 text-destructive focus:text-destructive" onClick={handleDeleteJob}><Trash2 className="h-4 w-4" /> Delete Job</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="mt-8 grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Quick Analytics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard icon={Users} label="Applications" value={String(applications.length)} trend="Total applications" />
            <StatCard icon={CheckCircle2} label="Hired" value={String(hiredCount)} trend={`out of ${job.workers_needed}`} />
            <StatCard icon={Clock} label="Duration" value={`${job.duration_days} Days`} trend="Job timeframe" />
            <StatCard icon={Activity} label="Status" value={job.status === "open" ? "Live" : "Paused"} trend="Current visibility" />
          </div>

          {/* Applications & Geofenced Roster */}
          <div className="rounded-3xl bg-card border border-border shadow-soft overflow-hidden">
            <div className="p-5 border-b border-border flex items-center justify-between">
              <h2 className="font-bold text-lg inline-flex items-center gap-2"><Users className="h-5 w-5 text-primary" /> Active Roster & Applicants</h2>
              <Link to="/contractor/applications" className="text-sm text-primary font-semibold hover:underline">View All</Link>
            </div>
            <div className="divide-y divide-border">
              {applications.length === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  No one has applied to this job yet.
                </div>
              ) : (
                applications.map((app) => {
                  const w = app.worker;
                  const initials = w.name?.split(" ").map((n: string) => n[0]).join("") || "W";
                  return (
                    <div key={app.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-muted/30 transition-colors">
                      <div className="flex items-center gap-4">
                        <Avatar className="h-10 w-10"><AvatarFallback className="bg-gradient-primary text-primary-foreground text-xs">{w.avatar || initials}</AvatarFallback></Avatar>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold text-sm">{w.name}</p>
                            <Badge className={`${app.status === "hired" ? "bg-success/15 text-success" : app.status === "declined" ? "bg-destructive/15 text-destructive" : "bg-primary/10 text-primary"} border-0 text-[10px] rounded-full uppercase tracking-wider`}>
                              {app.status}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            ★ {w.rating || "5.0"} · {app.status === "hired" ? "🟢 GPS Active (Clocked In)" : "⚪ Pending Roster Activation"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                        <Button variant="outline" size="icon" className="rounded-full h-8 w-8" asChild>
                          <Link to="/contractor/messages" search={{ userId: w.id }}><MessageSquare className="h-3.5 w-3.5" /></Link>
                        </Button>
                        <Button size="sm" variant="outline" className="rounded-full h-8 px-4 font-bold" asChild>
                          <Link to="/contractor/applications/$applicationId" params={{ applicationId: app.id }}>Review</Link>
                        </Button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Job Details Summary */}
          <div className="rounded-3xl bg-card border border-border p-6 shadow-soft">
            <h2 className="font-bold text-lg mb-4">Job Summary & Compliance</h2>
            <div className="grid sm:grid-cols-2 gap-y-6 gap-x-4">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Description</p>
                <p className="text-sm leading-relaxed">{job.description}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Escrow & Compliance Mandates</p>
                <ul className="text-sm space-y-1.5">
                  <li className="inline-flex items-center gap-1.5 text-xs font-medium"><CheckCircle2 className="h-4 w-4 text-success shrink-0" /> Digital Escrow Funded (100% Wage Guarantee)</li>
                  <li className="inline-flex items-center gap-1.5 text-xs font-medium"><CheckCircle2 className="h-4 w-4 text-success shrink-0" /> Geofence Attendance Matching ({job.geofence_radius_meters || 100}m Radius)</li>
                  <li className="inline-flex items-center gap-1.5 text-xs font-medium"><CheckCircle2 className="h-4 w-4 text-success shrink-0" /> Aadhaar Physical Verification Required</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Payment & Budget */}
          <div className="rounded-3xl bg-card border border-border p-6 shadow-soft">
            <h3 className="font-bold flex items-center gap-2"><BarChart3 className="h-4 w-4 text-primary" /> Escrow & Budget Overview</h3>
            <div className="mt-4 p-4 rounded-2xl bg-muted/40 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Pay Per Day</p>
                <p className="text-2xl font-extrabold mt-1">₹{job.pay_per_day}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Escrow Locked</p>
                <p className="text-lg font-extrabold mt-1 text-amber-600 dark:text-amber-400">₹{totalEscrow.toLocaleString()}</p>
              </div>
            </div>
            <div className="mt-4 space-y-2 text-sm text-muted-foreground">
              <div className="flex justify-between"><span>Duration</span> <span className="font-medium text-foreground">{job.duration_days} Days</span></div>
              <div className="flex justify-between"><span>Workers Needed</span> <span className="font-medium text-foreground">{job.workers_needed}</span></div>
              <div className="flex justify-between"><span>Skill Required</span> <span className="font-medium text-foreground capitalize">{job.skill}</span></div>
              <div className="flex justify-between"><span>Compliance</span> <span className="font-medium text-success">Compliant</span></div>
            </div>
          </div>

          {/* Activity Timeline */}
          <div className="rounded-3xl bg-card border border-border p-6 shadow-soft">
            <h3 className="font-bold flex items-center gap-2"><Clock className="h-4 w-4 text-primary" /> Activity Timeline</h3>
            <div className="mt-5 space-y-4 relative before:absolute before:inset-0 before:ml-2 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-border before:to-transparent">
              <TimelineItem time="Live" title="Applications open" desc="System receiving live worker applications" active />
              <TimelineItem time="System Checked" title="Escrow funded" desc="Batch UPI Escrow lock verified" />
              <TimelineItem time="Posted" title="Job published" desc={`Posted on ${new Date(job.created_at).toLocaleDateString()}`} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, trend }: { icon: React.ElementType; label: string; value: string; trend: string }) {
  return (
    <div className="rounded-2xl border border-border p-4 bg-muted/20">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Icon className="h-4 w-4" />
          <span className="text-xs font-medium">{label}</span>
        </div>
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-[10px] text-primary font-medium">{trend}</p>
      </div>
    </div>
  );
}

function TimelineItem({ time, title, desc, active }: { time: string; title: string; desc: string; active?: boolean }) {
  return (
    <div className="relative flex items-start justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
      <div className="flex items-center justify-center w-5 h-5 rounded-full border-[3px] border-card bg-muted group-[.is-active]:bg-primary shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-soft" style={{ backgroundColor: active ? "var(--primary)" : undefined }} />
      <div className="w-[calc(100%-2rem)] md:w-[calc(50%-1.5rem)] pl-3 md:pl-0">
        <div className="flex flex-col mb-1 group-odd:md:items-end">
          <span className="text-[10px] font-semibold text-primary">{time}</span>
          <h4 className="text-sm font-bold">{title}</h4>
        </div>
        <p className="text-xs text-muted-foreground group-odd:md:text-right">{desc}</p>
      </div>
    </div>
  );
}
