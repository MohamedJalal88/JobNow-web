import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ArrowLeft, XCircle, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { z } from "zod";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";

const search = z.object({ id: z.string().catch("") });

export const Route = createFileRoute("/contractor/applications/declined")({
  head: () => ({ meta: [{ title: "Application Declined — JobNow" }] }),
  validateSearch: search,
  component: Declined,
});

const REASONS = ["Not enough experience", "Skill mismatch", "Position filled", "Distance too far", "Other"];

function Declined() {
  const { id } = Route.useSearch();
  const [isLoading, setIsLoading] = useState(true);
  const [app, setApp] = useState<any>(null);
  const [reason, setReason] = useState(REASONS[0]);
  const [note, setNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    async function loadDeclinedApplication() {
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
        console.error("Error loading declined application:", err);
      } finally {
        setIsLoading(false);
      }
    }

    loadDeclinedApplication();
  }, [id]);

  async function handleSendFeedback() {
    if (!app) return;
    setIsSubmitting(true);
    try {
      // Update application status to declined (if not already)
      const { error } = await supabase
        .from("applications")
        .update({ status: "declined" })
        .eq("id", app.id);

      if (error) throw error;

      // Create a notification for the worker about being declined with reason
      // If notifications table exists, try to insert, else swallow error so it behaves gracefully
      try {
        await supabase
          .from("notifications")
          .insert({
            user_id: app.worker_id,
            title: "Application Status Updated",
            body: `Your application for "${app.job?.title}" was declined. Reason: ${reason}. ${note ? `Note: ${note}` : ""}`,
            type: "job",
            unread: true,
          });
      } catch (notifErr) {
        console.warn("Notifications table might not exist yet, skipping in-app notification:", notifErr);
      }

      toast.success("Feedback sent to worker");
    } catch (err) {
      console.error("Error declining application:", err);
      toast.error("Failed to submit feedback");
    } finally {
      setIsSubmitting(false);
    }
  }

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
        <p className="text-muted-foreground text-sm mt-2">Could not load details for this application.</p>
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

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 pt-6 md:pt-8">
      <Link to="/contractor/applications" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="h-4 w-4" /> Back to Applications
      </Link>

      <div className="grid lg:grid-cols-3 gap-5">
        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          className="lg:col-span-2 rounded-3xl bg-card border border-border p-8 md:p-10 shadow-elegant"
        >
          <div className="h-16 w-16 rounded-full bg-destructive/10 text-destructive grid place-items-center">
            <XCircle className="h-9 w-9" />
          </div>
          <h1 className="mt-5 text-2xl md:text-3xl font-extrabold">Application declined</h1>
          <p className="mt-1.5 text-muted-foreground">
            You've declined {workerName}'s application for "{jobTitle}". They will be notified politely.
          </p>

          <div className="mt-6">
            <p className="text-sm font-semibold mb-2">Reason for declining</p>
            <div className="flex flex-wrap gap-2">
              {REASONS.map((r) => (
                <button key={r} onClick={() => setReason(r)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                    reason === r ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted"
                  }`}>
                  {r}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-5">
            <p className="text-sm font-semibold mb-2">Optional note (visible to worker)</p>
            <Textarea value={note} onChange={(e) => setNote(e.target.value)}
              className="rounded-2xl bg-card" rows={4} placeholder="Add a kind note for the worker…" />
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Button 
              onClick={handleSendFeedback}
              disabled={isSubmitting}
              className="rounded-full bg-gradient-primary text-primary-foreground font-semibold min-w-[120px]"
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send feedback"}
            </Button>
            <Button variant="outline" className="rounded-full" asChild>
              <Link to="/contractor/applications">Back to applications</Link>
            </Button>
          </div>
        </motion.div>

        <div className="rounded-3xl bg-card border border-border p-6 shadow-soft">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Worker</p>
          <div className="mt-3 flex items-center gap-3">
            <Avatar className="h-14 w-14"><AvatarFallback className="bg-gradient-primary text-primary-foreground font-bold">{workerAvatar}</AvatarFallback></Avatar>
            <div>
              <p className="font-bold">{workerName}</p>
              <p className="text-xs text-muted-foreground">{workerSkill} · ★ {workerRating}</p>
            </div>
          </div>
          <Badge className="mt-4 rounded-full border-0 bg-destructive/15 text-destructive">Declined</Badge>
          <div className="mt-4 rounded-2xl bg-muted/40 p-3 text-xs">
            <p className="font-semibold">Applied for</p>
            <p className="text-muted-foreground mt-1">{jobTitle}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
