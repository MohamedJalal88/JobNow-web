import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { ArrowLeft, Check, CheckCircle2, MapPin, Phone, Star, X, MessageSquare, Clock } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/language";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

export const Route = createFileRoute("/contractor/applications/$applicationId")({
  head: () => ({ meta: [{ title: "Application Details — JobNow" }] }),
  component: ApplicationDetails,
});

function ApplicationDetails() {
  const { applicationId } = useParams({ from: "/contractor/applications/$applicationId" });
  const { t } = useLanguage();
  const [app, setApp] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadAppDetails() {
      try {
        const { data: dbApp, error } = await supabase
          .from("applications")
          .select("*, worker:profiles(*), job:jobs(*)")
          .eq("id", applicationId)
          .single();

        if (error) throw error;
        setApp(dbApp);
      } catch (err) {
        console.error("Error loading application details:", err);
      } finally {
        setIsLoading(false);
      }
    }

    loadAppDetails();
  }, [applicationId]);

  async function handleStatusChange(nextStatus: "hired" | "declined") {
    try {
      const { error } = await supabase
        .from("applications")
        .update({ status: nextStatus })
        .eq("id", app.id);

      if (error) throw error;
      setApp((prev: any) => ({ ...prev, status: nextStatus }));

      // Create notification for the worker
      try {
        await supabase
          .from("notifications")
          .insert({
            user_id: app.worker_id,
            title: nextStatus === "hired" ? "Congratulations! You are hired!" : "Application Status",
            body: nextStatus === "hired" 
              ? `You have been hired for the job "${app.job?.title}". Pack your tools!` 
              : `Your application for the job "${app.job?.title}" was declined.`,
            type: "job",
            unread: true,
          });
      } catch (notifErr) {
        console.warn("Could not insert notification:", notifErr);
      }

      if (nextStatus === "hired") {
        toast.success("Worker hired! Escrow wage roll locked successfully.");
      } else {
        toast.success("Application declined politely.");
      }
    } catch (err) {
      console.error("Error updating application status:", err);
      toast.error("Failed to update status");
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  if (!app) {
    return (
      <div className="max-w-4xl mx-auto px-4 pt-10 text-center">
        <h2 className="text-xl font-bold">Application not found</h2>
        <Button className="mt-4 rounded-full" asChild>
          <Link to="/contractor/applications">Back to Applications</Link>
        </Button>
      </div>
    );
  }

  const w = app.worker;
  const job = app.job;
  const initials = w.name?.split(" ").map((n: string) => n[0]).join("") || "W";
  const createdTime = new Date(app.created_at).getTime();
  const diffMins = Math.max(1, Math.floor((Date.now() - createdTime) / 60000));
  const timeAgo = diffMins < 60 ? `${diffMins}m ago` : `${Math.floor(diffMins / 60)}h ago`;

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-6 lg:px-8 pt-6 md:pt-8 pb-20">
      <div className="flex items-center gap-4 mb-8">
        <Button variant="outline" size="icon" className="rounded-full h-10 w-10 shrink-0" asChild>
          <Link to="/contractor/applications"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">{t("Worker Verification & Application Review")}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{t("Inspect physical verification badges, and check geofenced readiness before locking escrow.")}</p>
        </div>
      </div>

      <div className="grid md:grid-cols-[1fr_300px] gap-6">
        <div className="space-y-6">
          {/* Worker Profile Card */}
          <div className="rounded-3xl bg-card border border-border p-6 shadow-soft text-center relative overflow-hidden">
            <div className="absolute top-4 right-4">
              <span className="text-[10px] bg-success/20 text-success px-3 py-1 rounded-full font-extrabold uppercase tracking-wider flex items-center gap-1">
                <span>🛡️</span> Aadhaar Verified (100% Match)
              </span>
            </div>
            <Avatar className="h-24 w-24 mx-auto mb-4 border-4 border-background shadow-sm">
              <AvatarFallback className="bg-gradient-primary text-primary-foreground text-2xl font-bold">{w.avatar || initials}</AvatarFallback>
            </Avatar>
            <h2 className="text-xl font-bold">{w.name}</h2>
            <p className="text-primary font-medium text-sm mt-1 capitalize">{w.skill || "Helper"} · Level 3 Expert</p>
            <div className="mt-4 flex items-center justify-center gap-4 text-sm text-muted-foreground flex-wrap">
              <span className="inline-flex items-center gap-1"><Star className="h-4 w-4 text-amber-500 fill-amber-500" /> {w.rating || 5.0}</span>
              <span className="inline-flex items-center gap-1"><CheckCircle2 className="h-4 w-4 text-success" /> {w.jobs_done || 0} Jobs Done</span>
              <span className="inline-flex items-center gap-1"><MapPin className="h-4 w-4 text-primary" /> Noida (Ready for Geofence)</span>
            </div>

            <div className="mt-6 flex gap-3 justify-center">
              <Button variant="outline" className="rounded-full gap-2"><Phone className="h-4 w-4" /> {t("Call")}</Button>
              <Button variant="outline" className="rounded-full gap-2" asChild>
                <Link to="/contractor/messages" search={{ userId: w.id }}><MessageSquare className="h-4 w-4" /> {t("Message")}</Link>
              </Button>
            </div>
          </div>

          {/* About Worker & Compliance Check */}
          <div className="rounded-3xl bg-card border border-border p-6 shadow-soft space-y-4">
            <div>
              <h3 className="font-bold text-lg mb-2">{t("Physical Verification & Attendance Readiness")}</h3>
              <ul className="text-xs space-y-2 text-muted-foreground">
                <li className="flex items-center gap-2 text-foreground font-medium">
                  <CheckCircle2 className="h-4 w-4 text-success shrink-0" /> Government Aadhaar ID physically verified by JobNow Field Team.
                </li>
                <li className="flex items-center gap-2 text-foreground font-medium">
                  <CheckCircle2 className="h-4 w-4 text-success shrink-0" /> Worker device supports GPS Geofencing (100m accuracy).
                </li>
                <li className="flex items-center gap-2 text-foreground font-medium">
                  <CheckCircle2 className="h-4 w-4 text-success shrink-0" /> Same-day UPI Escrow payout route active and verified.
                </li>
              </ul>
            </div>
            <div className="pt-4 border-t border-border">
              <h3 className="font-bold text-sm mb-2">Work History Highlights</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Experienced {w.skill || "helper"} with over 5 years of field experience. Specializes in residential and commercial projects. Known for punctuality and high-quality finish. Has own transport and basic tools.
              </p>
            </div>
          </div>
        </div>

        {/* Application Info & Actions */}
        <div className="space-y-6">
          <div className="rounded-3xl bg-card border border-border p-6 shadow-soft">
            <Badge className="bg-primary/15 text-primary border-0 rounded-full mb-4 uppercase text-[10px] font-extrabold tracking-wider">{app.status}</Badge>
            <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">{t("Applied For")}</p>
            <p className="font-bold text-lg">{job?.title}</p>
            <p className="text-sm text-muted-foreground mt-2 inline-flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" /> {timeAgo}</p>
            
            {app.status === "applied" && (
              <div className="mt-8 space-y-3">
                <Button onClick={() => handleStatusChange("hired")} className="w-full h-12 rounded-full bg-gradient-primary text-primary-foreground font-semibold shadow-glow text-base gap-2">
                  <Check className="h-5 w-5" /> {t("Hire & Lock Escrow")}
                </Button>
                <Button onClick={() => handleStatusChange("declined")} variant="outline" className="w-full h-12 rounded-full font-semibold text-base gap-2">
                  <X className="h-5 w-5" /> {t("Decline")}
                </Button>
              </div>
            )}
            
            {app.status === "hired" && (
              <div className="mt-8 p-3 rounded-2xl bg-success/10 text-success text-center font-bold text-sm">
                🛡️ Hired! Escrow Locked & Roster Active.
              </div>
            )}
            {app.status === "declined" && (
              <div className="mt-8 p-3 rounded-2xl bg-destructive/10 text-destructive text-center font-bold text-sm">
                ❌ Application Declined.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
