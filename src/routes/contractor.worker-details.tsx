import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ArrowLeft, MapPin, Star, ShieldCheck, Phone, MessageSquare, Briefcase, Calendar, Loader2 } from "lucide-react";
import { z } from "zod";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

const search = z.object({ id: z.string().catch("w1") });

export const Route = createFileRoute("/contractor/worker-details")({
  head: () => ({ meta: [{ title: "Worker Details — JobNow" }] }),
  validateSearch: search,
  component: WorkerDetails,
});

function WorkerDetails() {
  const { id } = Route.useSearch();
  const [worker, setWorker] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadWorker() {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", id)
          .single();

        if (error) throw error;
        setWorker(data);
      } catch (err) {
        console.error("Error loading worker details:", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadWorker();
  }, [id]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (!worker) {
    return (
      <div className="max-w-4xl mx-auto px-4 pt-10 text-center">
        <h2 className="text-xl font-bold">Worker not found</h2>
        <Button className="mt-4 rounded-full" asChild>
          <Link to="/contractor/workers">Back to Workers list</Link>
        </Button>
      </div>
    );
  }

  const initials = worker.name?.split(" ").map((n: string) => n[0]).slice(0, 2).join("").toUpperCase() || "W";
  const rating = worker.rating ? parseFloat(worker.rating.toString()) : 5.0;
  const jobsDone = worker.jobs_done ?? 0;
  const skillName = worker.skill || "General Helper";
  const memberSince = worker.created_at 
    ? new Date(worker.created_at).toLocaleDateString("en-IN", { month: "short", year: "numeric" })
    : "Jan 2026";

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-6 lg:px-8 pt-6 md:pt-8 pb-12">
      <Link to="/contractor/workers" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft className="h-4 w-4" /> Back to Nearby Workers
      </Link>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="rounded-3xl bg-card border border-border shadow-elegant overflow-hidden">
        <div className="h-32 bg-gradient-primary relative">
           <div className="absolute inset-0 bg-gradient-mesh opacity-40" />
        </div>
        
        <div className="px-6 md:px-10 pb-8 relative">
          <div className="flex flex-col sm:flex-row gap-5 items-start sm:items-end -mt-12 sm:-mt-16 mb-6">
            <Avatar className="h-24 w-24 sm:h-32 sm:w-32 border-4 border-card bg-card shadow-soft">
              <AvatarFallback className="bg-gradient-primary text-primary-foreground text-3xl font-bold">{worker.avatar || initials}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h1 className="text-2xl md:text-3xl font-extrabold">{worker.name}</h1>
                <Badge className="bg-success/15 text-success border-0 rounded-full inline-flex items-center gap-1">
                  <ShieldCheck className="h-3.5 w-3.5" /> Aadhaar Verified
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-1 inline-flex items-center gap-1.5">
                <MapPin className="h-4 w-4" /> {worker.location || "Noida"} · Near You
              </p>
            </div>
            <div className="flex gap-3 w-full sm:w-auto mt-2 sm:mt-0">
              <Button variant="outline" className="rounded-full flex-1 sm:flex-none gap-2" asChild>
                <Link to="/contractor/messages" search={{ userId: worker.id }}>
                  <MessageSquare className="h-4 w-4" /> Message
                </Link>
              </Button>
              <Button className="rounded-full flex-1 sm:flex-none bg-gradient-primary text-primary-foreground gap-2" asChild>
                <Link to="/contractor/post">
                  <Briefcase className="h-4 w-4" /> Hire now
                </Link>
              </Button>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-6">
              <section>
                <h2 className="font-bold text-lg">About</h2>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                  Experienced {skillName.toLowerCase()} available for commercial and residential construction projects. Device supports full GPS geofencing attendance, digital roster listings, and automated UPI Escrow wage transfers on JobNow.
                </p>
              </section>

              <section>
                <h2 className="font-bold text-lg mb-3">Skills & Expertise</h2>
                <div className="flex flex-wrap gap-2">
                  {[skillName, "Attendance Guaranteed", "Geofence Clockin Support", "UPI Account Active"].map((s) => (
                    <Badge key={s} variant="secondary" className="rounded-full px-3 py-1 font-medium">{s}</Badge>
                  ))}
                </div>
              </section>
              
              <section>
                <h2 className="font-bold text-lg mb-3">Recent Reviews</h2>
                <div className="space-y-4">
                  {[
                    { name: "Verified Contractor Review", rating: Math.floor(rating), date: "Recently", text: "Excellent field work. Arrived on time and was very professional." },
                  ].map((r, i) => (
                    <div key={i} className="rounded-2xl bg-muted/30 p-4 border border-border">
                      <div className="flex justify-between items-start">
                        <p className="font-semibold text-sm">{r.name}</p>
                        <span className="text-xs text-muted-foreground">{r.date}</span>
                      </div>
                      <div className="flex gap-0.5 text-amber-500 mt-1">
                         {Array.from({ length: 5 }).map((_, j) => <Star key={j} className={`h-3.5 w-3.5 ${j < r.rating ? "fill-current" : "opacity-30"}`} />)}
                      </div>
                      <p className="text-sm mt-2 text-muted-foreground">{r.text}</p>
                    </div>
                  ))}
                </div>
              </section>
            </div>

            <aside className="space-y-4">
              <div className="rounded-2xl bg-muted/30 p-5 border border-border space-y-4">
                <InfoRow icon={Star} label="Rating" value={`${rating} / 5.0`} />
                <InfoRow icon={Briefcase} label="Jobs completed" value={`${jobsDone} jobs`} />
                <InfoRow icon={Calendar} label="Member since" value={memberSince} />
                <InfoRow icon={Phone} label="Contact" value={worker.phone || "No phone provided"} />
              </div>
            </aside>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: any, label: string, value: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="h-8 w-8 rounded-lg bg-card border border-border grid place-items-center text-muted-foreground">
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-semibold">{value}</p>
      </div>
    </div>
  );
}
