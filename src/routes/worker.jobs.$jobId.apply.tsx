import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
import { ArrowLeft, Clock, IndianRupee, MapPin } from "lucide-react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SKILLS } from "@/lib/skills-config";
import { toast } from "sonner";
import { useLanguage } from "@/lib/language";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/worker/jobs/$jobId/apply")({
  head: () => ({ meta: [{ title: "Apply for Job — JobNow" }] }),
  component: ApplyForJob,
});

function ApplyForJob() {
  const { jobId } = useParams({ from: "/worker/jobs/$jobId/apply" });
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { user } = useAuth();

  const [job, setJob] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [rate, setRate] = useState("");

  const skill = SKILLS.find((s) => s.id === job?.skill);

  useEffect(() => {
    async function fetchJob() {
      try {
        const { data, error } = await supabase
          .from("jobs")
          .select("*, contractor:profiles(name, avatar)")
          .eq("id", jobId)
          .single();

        if (error) throw error;
        if (data) {
          setJob({
            id: data.id,
            contractorId: data.contractor_id,
            title: data.title,
            description: data.description,
            skill: data.skill,
            payPerDay: data.pay_per_day,
            durationDays: data.duration_days,
            workersNeeded: data.workers_needed,
            location: data.location,
            contractor: data.contractor?.name || "Contractor",
            contractorAvatar: data.contractor?.avatar || "C",
          });
          setRate(data.pay_per_day.toString());
        }
      } catch (err) {
        console.error("Error fetching job details:", err);
        toast.error("Failed to load job details.");
      } finally {
        setIsLoading(false);
      }
    }

    fetchJob();
  }, [jobId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !job) {
      toast.error("You must be logged in to apply.");
      return;
    }

    try {
      const { error } = await supabase.from("applications").insert({
        job_id: jobId,
        worker_id: user.id,
        status: "applied",
      });

      if (error) {
        if (error.code === "23505") { // Unique violation code in Postgres
          toast.info("You have already applied for this job!");
          navigate({ to: "/worker/accepted" });
          return;
        }
        throw error;
      }

      // Create notification for the contractor
      try {
        if (job.contractorId) {
          await supabase.from("notifications").insert({
            user_id: job.contractorId,
            title: "New Job Application",
            body: `${user.name || "A worker"} has claimed a slot for "${job.title}".`,
            type: "job",
            unread: true,
          });
        }
      } catch (notifErr) {
        console.warn("Could not insert application notification:", notifErr);
      }

      toast.success("✅ Slot Claimed! ₹850 Escrow locked for your attendance.");
      navigate({ to: "/worker/accepted" });
    } catch (err) {
      console.error("Error submitting application:", err);
      toast.error(err instanceof Error ? err.message : "Failed to claim job slot.");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="max-w-2xl mx-auto px-4 pt-8 text-center">
        <h2 className="text-xl font-bold">Job not found</h2>
        <Link to="/worker" className="text-primary mt-2 inline-block underline">
          Go back to dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 md:px-6 lg:px-8 pt-6 md:pt-8 pb-12">
      <Link to="/worker/jobs/$jobId" params={{ jobId: job.id }} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> {t("Back to job details")}
      </Link>

      <h1 className="mt-5 text-2xl md:text-3xl font-extrabold tracking-tight">{t("Claim Escrow Job Slot")}</h1>
      <p className="text-sm text-muted-foreground mt-1">{t("No cover letters needed. Lock your slot instantly with Escrow Guarantee.")}</p>

      <div className="mt-6 rounded-3xl bg-card border border-border overflow-hidden shadow-soft">
        <div className={`p-5 text-white bg-gradient-to-br ${skill?.color ?? "from-primary to-primary"}`}>
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="bg-white/20 text-white text-xs font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">
              🔒 Escrow Guaranteed Job
            </span>
            <span className="text-xs bg-black/30 px-2.5 py-1 rounded-full font-bold">
              {job.workersNeeded} Slots Left
            </span>
          </div>
          <h2 className="font-bold text-lg">{job.title}</h2>
          <p className="text-sm opacity-90">{job.contractor}</p>
          <div className="mt-3 flex flex-wrap items-center gap-4 text-xs font-medium">
            <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {job.location}</span>
            <span className="inline-flex items-center gap-1"><IndianRupee className="h-3.5 w-3.5" /> {job.payPerDay}/day baseline</span>
            <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {job.durationDays} days</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-6">
          <div className="rounded-2xl bg-amber-500/10 border border-amber-500/20 p-4 space-y-2">
            <p className="text-xs font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
              <span>🛡️</span> {t("100% Escrow Protection")}
            </p>
            <p className="text-xs text-muted-foreground">
              {t("The contractor has already deposited the wages into JobNow Escrow. Upon successful GPS clock-out, your pay will be instantly credited to your UPI account.")}
            </p>
          </div>

          <div>
            <Label className="text-sm font-semibold">{t("Agreed Daily Wage (₹)")}</Label>
            <p className="text-xs text-muted-foreground mb-2">{t("Fixed escrow baseline rate set by contractor.")}</p>
            <div className="relative">
              <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-muted-foreground" />
              <Input 
                value={rate} 
                disabled
                type="number" 
                className="pl-9 h-12 rounded-xl bg-muted/60 border-transparent text-lg font-bold text-foreground" 
              />
            </div>
          </div>

          <div className="pt-4 flex items-center gap-3">
            <Button 
              type="button" 
              variant="outline" 
              className="flex-1 h-12 rounded-full font-semibold"
              onClick={() => navigate({ to: "/worker/jobs/$jobId", params: { jobId: job.id } })}
            >
              {t("Cancel")}
            </Button>
            <Button 
              type="submit" 
              className="flex-1 h-12 rounded-full bg-gradient-primary text-primary-foreground font-semibold shadow-glow text-base"
            >
              {t("Claim Slot & Lock Escrow")}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
