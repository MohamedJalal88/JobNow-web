import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ArrowLeft, Briefcase, Calendar, CheckCircle2, MapPin, MessageSquare, Phone, Star, Loader2 } from "lucide-react";
import { z } from "zod";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

const search = z.object({ id: z.string().catch("") });

export const Route = createFileRoute("/contractor/applications/hired")({
  head: () => ({ meta: [{ title: "Worker Hired — JobNow" }] }),
  validateSearch: search,
  component: Hired,
});

function Hired() {
  const { id } = Route.useSearch();
  const [isLoading, setIsLoading] = useState(true);
  const [app, setApp] = useState<any>(null);

  useEffect(() => {
    async function loadHiredApplication() {
      if (!id) {
        setIsLoading(false);
        return;
      }
      try {
        const { data, error } = await supabase
          .from("applications")
          .select("*, worker:profiles(*), job:jobs(*)")
          .eq("id", id)
          .single();

        if (error) throw error;
        setApp(data);
      } catch (err) {
        console.error("Error loading hired application:", err);
      } finally {
        setIsLoading(false);
      }
    }

    loadHiredApplication();
  }, [id]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!app) {
    return (
      <div className="max-w-md mx-auto mt-12 p-6 rounded-3xl bg-card border border-border text-center">
        <h2 className="text-xl font-bold">Application not found</h2>
        <p className="text-muted-foreground text-sm mt-2">Could not load details for this hiring event.</p>
        <Button className="mt-4 rounded-full" asChild>
          <Link to="/contractor/applications">Back to Applications</Link>
        </Button>
      </div>
    );
  }

  const workerName = app.worker?.name || "Worker";
  const workerAvatar = app.worker?.avatar || workerName.split(" ").map((n: string) => n[0]).slice(0, 2).join("").toUpperCase();
  const workerSkill = app.worker?.skill || "Helper";
  const workerRating = app.worker?.rating || "5.0";
  const jobTitle = app.job?.title || "General Job";
  const jobLocation = app.job?.location || "On site";

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 pt-6 md:pt-8">
      <Link to="/contractor/applications" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="h-4 w-4" /> Back to Applications
      </Link>

      <div className="grid lg:grid-cols-3 gap-5">
        {/* Hero confirmation */}
        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          className="lg:col-span-2 rounded-3xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white p-8 md:p-10 shadow-elegant relative overflow-hidden"
        >
          <div className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-white/15 blur-2xl" />
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 200 }}
            className="h-20 w-20 rounded-full bg-white/20 grid place-items-center backdrop-blur">
            <CheckCircle2 className="h-12 w-12" />
          </motion.div>
          <h1 className="mt-6 text-3xl md:text-4xl font-extrabold">Worker hired successfully!</h1>
          <p className="mt-2 opacity-95">{workerName} has been assigned to "{jobTitle}". They've been notified.</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button className="rounded-full bg-white text-emerald-700 hover:bg-white/90 font-semibold gap-2">
              <Phone className="h-4 w-4" /> Call worker
            </Button>
            <Button variant="outline" className="rounded-full border-white/40 text-white bg-white/10 hover:bg-white/20 gap-2" asChild>
              <Link to="/contractor/messages" search={{ userId: app.worker_id }}><MessageSquare className="h-4 w-4" /> Message</Link>
            </Button>
          </div>
        </motion.div>

        {/* Worker card */}
        <div className="rounded-3xl bg-card border border-border p-6 shadow-soft">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Worker</p>
          <div className="mt-3 flex items-center gap-3">
            <Avatar className="h-14 w-14"><AvatarFallback className="bg-gradient-primary text-primary-foreground font-bold">{workerAvatar}</AvatarFallback></Avatar>
            <div>
              <p className="font-bold">{workerName}</p>
              <p className="text-xs text-muted-foreground">{workerSkill}</p>
              <p className="text-xs text-amber-600 font-semibold mt-0.5 inline-flex items-center gap-1"><Star className="h-3 w-3 fill-current" /> {workerRating} rating</p>
            </div>
          </div>
          <Badge className="mt-4 rounded-full border-0 bg-success/15 text-success">Hired</Badge>
        </div>
      </div>

      {/* Job details */}
      <div className="mt-5 grid lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 rounded-3xl bg-card border border-border p-6 shadow-soft">
          <h2 className="font-bold">Assigned job</h2>
          <p className="mt-1 text-lg font-extrabold">{jobTitle}</p>
          <div className="mt-4 grid sm:grid-cols-3 gap-3">
            <Info icon={Briefcase} label="Skill" value={workerSkill} />
            <Info icon={Calendar} label="Start date" value="Scheduled start" />
            <Info icon={MapPin} label="Location" value={jobLocation} />
          </div>
          <div className="mt-5 rounded-2xl bg-muted/40 p-4">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Next steps</p>
            <ul className="mt-2 text-sm space-y-1.5 text-muted-foreground">
              <li>• Worker will receive job details in their accepted jobs dashboard.</li>
              <li>• Confirm the job location and timing directly with the worker via chat or phone.</li>
              <li>• Mark the job as complete once the work is finished to trigger the payment payout.</li>
            </ul>
          </div>
        </div>

        <div className="rounded-3xl bg-card border border-border p-6 shadow-soft">
          <h2 className="font-bold">Quick actions</h2>
          <div className="mt-4 space-y-2">
            <Button variant="outline" className="w-full rounded-full justify-start gap-2" asChild>
              <Link to="/contractor"><ArrowLeft className="h-4 w-4" /> Back to dashboard</Link>
            </Button>
            <Button variant="outline" className="w-full rounded-full justify-start gap-2" asChild>
              <Link to="/contractor/active">View active jobs</Link>
            </Button>
            <Button variant="outline" className="w-full rounded-full justify-start gap-2" asChild>
              <Link to="/contractor/applications">More applications</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Info({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border p-3.5">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        <p className="text-xs">{label}</p>
      </div>
      <p className="mt-1 font-semibold text-sm">{value}</p>
    </div>
  );
}
