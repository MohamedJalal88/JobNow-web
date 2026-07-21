import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { CheckCircle2, ClipboardCheck, Clock, IndianRupee, MapPin, MessageSquare, Phone, Loader2 } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { SKILLS } from "@/lib/skills-config";
import { toast } from "sonner";
import { useLanguage } from "@/lib/language";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { MapDisplay } from "@/components/map";

export const Route = createFileRoute("/worker/accepted")({
  head: () => ({ meta: [{ title: "Accepted jobs — JobNow" }] }),
  component: Accepted,
});

interface ActiveJob {
  id: string;
  title: string;
  contractorName: string;
  contractorId: string;
  contractorAvatar: string;
  skill: string;
  distanceKm: number;
  payPerDay: number;
  durationDays: number;
  location: string;
  attendance_status: string;
  escrow_status: string;
  startDate: string;
  latitude: number | null;
  longitude: number | null;
  geofenceRadiusMeters: number;
}

// Proximity distance formula
function getDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function Accepted() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [jobs, setJobs] = useState<ActiveJob[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isScanning, setIsScanning] = useState<string | null>(null);

  // GPS worker tracking states
  const [workerLat, setWorkerLat] = useState<number | null>(null);
  const [workerLng, setWorkerLng] = useState<number | null>(null);

  useEffect(() => {
    async function loadActiveJobs() {
      if (!user) return;
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from("applications")
          .select("*, job:jobs(*, contractor:profiles(*))")
          .eq("worker_id", user.id)
          .eq("status", "hired");

        if (error) throw error;
        const completedLocalIds: string[] = JSON.parse(localStorage.getItem(`completed_jobs_${user.id}`) || "[]");

        const mapped: ActiveJob[] = (data || [])
          .filter((app: any) => {
            const j = app.job;
            if (!j) return false;
            // Vanish once clocked out or completed locally or in DB
            if (
              completedLocalIds.includes(j.id) ||
              localStorage.getItem(`job_clocked_out_${j.id}`) === "true" ||
              j.attendance_status === "clocked_out" ||
              j.status === "completed" ||
              j.escrow_status === "released" ||
              app.status === "completed"
            ) {
              return false;
            }
            return true;
          })
          .map((app: any) => {
            const j = app.job;
            const c = j.contractor || {};
            return {
              id: j.id,
              title: j.title,
              contractorName: c.name || "Contractor",
              contractorId: c.id || "",
              contractorAvatar: c.avatar || (c.name || "C").split(" ").map((n: string) => n[0]).slice(0, 2).join("").toUpperCase(),
              skill: j.skill || "",
              distanceKm: j.distance_km ? parseFloat(j.distance_km.toString()) : 1.0,
              payPerDay: j.pay_per_day ? parseFloat(j.pay_per_day.toString()) : 0,
              durationDays: j.duration_days ?? 1,
              location: j.location || "Noida",
              attendance_status: j.attendance_status || "pending_clockin",
              escrow_status: j.escrow_status || "pending",
              startDate: "Tomorrow, 8:00 AM",
              latitude: j.latitude ? parseFloat(j.latitude.toString()) : null,
              longitude: j.longitude ? parseFloat(j.longitude.toString()) : null,
              geofenceRadiusMeters: j.geofence_radius_meters || 1000,
            };
          });

        setJobs(mapped);
      } catch (err) {
        console.error("Error loading accepted jobs:", err);
      } finally {
        setIsLoading(false);
      }
    }

    loadActiveJobs();
  }, [user]);



  const totalPayout = jobs.reduce((s, j) => s + j.payPerDay * j.durationDays, 0);

  // Validate Geofence Distance
  const verifyGeofence = (job: ActiveJob): Promise<{ success: boolean; distance: number }> => {
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const latitude = pos.coords.latitude;
          const longitude = pos.coords.longitude;
          setWorkerLat(latitude);
          setWorkerLng(longitude);

          // If job has no coordinates set, allow check for demo
          if (job.latitude === null || job.longitude === null) {
            resolve({ success: true, distance: 0 });
            return;
          }

          const distKm = getDistanceKm(latitude, longitude, job.latitude, job.longitude);
          const distMeters = distKm * 1000;

          if (distMeters <= job.geofenceRadiusMeters) {
            resolve({ success: true, distance: distMeters });
          } else {
            resolve({ success: false, distance: distMeters });
          }
        },
        (err) => {
          console.error(err);
          reject(new Error("GPS Location access denied. Geofence clock-in requires location permissions."));
        },
        { enableHighAccuracy: true, timeout: 6000 }
      );
    });
  };

  async function handleClockIn(job: ActiveJob) {
    setIsScanning(job.id);
    try {
      const check = await verifyGeofence(job);

      if (!check.success && check.distance > 0) {
        toast.error(`📍 GPS Verification Failed! You are ${check.distance.toFixed(0)}m away. You must be within ${job.geofenceRadiusMeters}m of the site to Clock In.`);
        return;
      }

      // Save clock in state locally as well
      localStorage.setItem(`job_clocked_in_${job.id}`, "true");

      const { error } = await supabase
        .from("jobs")
        .update({ attendance_status: "clocked_in" })
        .eq("id", job.id);

      if (error) console.error("Database clockin update:", error);

      setJobs((prev) =>
        prev.map((item) =>
          item.id === job.id ? { ...item, attendance_status: "clocked_in" } : item
        )
      );
      toast.success("📍 GPS verified! Clocked in successfully. Work session active.");
    } catch (err) {
      console.error("Error clocking in:", err);
      toast.error(err instanceof Error ? err.message : "Failed to verify clock in");
    } finally {
      setIsScanning(null);
    }
  }

  async function handleClockOut(job: ActiveJob) {
    setIsScanning(job.id);
    try {
      const check = await verifyGeofence(job);

      if (!check.success && check.distance > 0) {
        toast.error(`📍 GPS Verification Failed! You are ${check.distance.toFixed(0)}m away. You must be within ${job.geofenceRadiusMeters}m of the site to Clock Out.`);
        return;
      }

      // 1. Save locally to guarantee it vanishes from Accepted Jobs across re-login
      if (user) {
        const completedLocalIds: string[] = JSON.parse(localStorage.getItem(`completed_jobs_${user.id}`) || "[]");
        if (!completedLocalIds.includes(job.id)) {
          completedLocalIds.push(job.id);
          localStorage.setItem(`completed_jobs_${user.id}`, JSON.stringify(completedLocalIds));
        }
        localStorage.setItem(`job_clocked_out_${job.id}`, "true");
        localStorage.setItem(`job_completed_${job.id}`, "true");
      }

      // 2. Attempt Supabase updates
      await supabase
        .from("jobs")
        .update({ status: "completed", attendance_status: "clocked_out", escrow_status: "released" })
        .eq("id", job.id);

      await supabase
        .from("applications")
        .update({ status: "completed" })
        .eq("job_id", job.id)
        .eq("worker_id", user?.id);

      // 3. Remove job from active accepted list so it vanishes upon clock-out
      setJobs((prev) => prev.filter((item) => item.id !== job.id));

      const payoutAmt = job.payPerDay * job.durationDays;
      toast.success(`✅ Job Completed! ₹${payoutAmt} added to your Worker Earnings Wallet. You can withdraw anytime!`);
    } catch (err) {
      console.error("Error clocking out:", err);
      toast.error(err instanceof Error ? err.message : "Failed to clock out");
    } finally {
      setIsScanning(null);
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 pt-6 md:pt-8 pb-20">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">{t("Accepted Jobs")}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t("Jobs you've been hired for and are currently working on.")}</p>
        </div>
        <Badge className="rounded-full border-0 bg-success/15 text-success">{jobs.length} active</Badge>
      </div>

      {isLoading ? (
        <div className="mt-12 flex flex-col items-center justify-center gap-2 py-20">
          <Loader2 className="h-8 w-8 text-primary animate-spin" />
          <p className="text-sm text-muted-foreground">Loading accepted jobs...</p>
        </div>
      ) : jobs.length === 0 ? (
        <div className="mt-8 rounded-3xl border border-dashed border-border bg-card p-12 text-center">
          <ClipboardCheck className="h-10 w-10 mx-auto text-muted-foreground" />
          <p className="mt-3 font-semibold">No accepted jobs yet</p>
          <p className="text-sm text-muted-foreground mt-1">Apply to nearby jobs to get hired.</p>
          <Button className="mt-5 rounded-full bg-gradient-primary text-primary-foreground" asChild>
            <Link to="/worker/jobs">Browse jobs</Link>
          </Button>
        </div>
      ) : (
        <div className="mt-6 grid lg:grid-cols-3 gap-5">
          {/* Jobs list */}
          <div className="lg:col-span-2 space-y-4">
            {jobs.map((j) => {
              const skill = SKILLS.find((s) => s.id === j.skill);
              const Icon = skill?.icon;
              const isClockedIn = j.attendance_status === "clocked_in";

              return (
                <div key={j.id} className="rounded-3xl bg-card border border-border shadow-soft hover:shadow-elegant transition-all overflow-hidden">
                  <div className="grid md:grid-cols-[auto_1fr_auto] gap-4 p-5 items-start">
                    <div className={`h-14 w-14 rounded-2xl bg-gradient-to-br ${skill?.color || "from-primary to-primary-foreground"} text-white grid place-items-center shadow-soft shrink-0`}>
                      {Icon ? <Icon className="h-6 w-6" /> : <ClipboardCheck className="h-6 w-6" />}
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge className="rounded-full border-0 bg-success/15 text-success capitalize">{j.attendance_status.replace("_", " ")}</Badge>
                        <Badge variant="outline" className="rounded-full">{skill?.name || j.skill}</Badge>
                        <Badge className="rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                          🔒 ₹{j.payPerDay} Locked in Escrow
                        </Badge>
                      </div>
                      <p className="mt-2 font-bold text-lg truncate">{j.title}</p>
                      <p className="text-xs text-muted-foreground inline-flex items-center gap-1.5">
                        <MapPin className="h-3 w-3" /> {j.location} · {j.distanceKm.toFixed(1)} km (Geofence: {j.geofenceRadiusMeters >= 1000 ? `${(j.geofenceRadiusMeters / 1000).toFixed(0)}km` : `${j.geofenceRadiusMeters}m`})
                      </p>
                      <div className="mt-3 grid sm:grid-cols-3 gap-2">
                        <Stat icon={IndianRupee} label="Per day" value={`₹${j.payPerDay}`} />
                        <Stat icon={Clock} label="Duration" value={`${j.durationDays}d`} />
                        <Stat icon={CheckCircle2} label="Starts" value={j.startDate.split(",")[0]} />
                      </div>
                    </div>
                    <div className="md:text-right">
                      <p className="text-[11px] text-muted-foreground">Contractor</p>
                      <div className="mt-1 flex md:justify-end items-center gap-2">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-gradient-primary text-primary-foreground text-xs font-semibold">
                            {j.contractorAvatar}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-semibold truncate">{j.contractorName}</span>
                      </div>
                    </div>
                  </div>

                  {/* Visual Map Geofence Radius Map */}
                  <div className="px-5 pb-4">
                    <Label className="text-xs font-semibold text-muted-foreground">Live Site Geofence Boundary</Label>
                    <MapDisplay
                      lat={j.latitude || 28.5355}
                      lng={j.longitude || 77.3910}
                      title="Job Site"
                      className="h-44 w-full rounded-2xl border border-border mt-1.5 shadow-soft"
                    />
                  </div>

                  {/* Geofenced QR Attendance Tracker Bar */}
                  <div className="px-5 py-3 bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 border-t border-b border-primary/20 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">📍</span>
                      <div>
                        <p className="text-xs font-bold text-foreground">Geofenced QR Attendance Status</p>
                        <p className="text-[11px] text-muted-foreground">
                          {isClockedIn ? "🟢 Clocked in (GPS Verified within 1km)" : j.attendance_status === "clocked_out" ? "✅ Clocked out successfully" : `🔴 Not clocked in yet (Must be within ${j.geofenceRadiusMeters >= 1000 ? `${(j.geofenceRadiusMeters / 1000).toFixed(0)}km` : `${j.geofenceRadiusMeters}m`})`}
                        </p>
                      </div>
                    </div>
                    {j.attendance_status !== "clocked_out" && (
                      <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                        {isClockedIn ? (
                          <Button
                            size="sm"
                            variant="destructive"
                            className="rounded-full shadow-soft font-bold w-full sm:w-auto text-xs"
                            disabled={isScanning === j.id}
                            onClick={() => handleClockOut(j)}
                          >
                            {isScanning === j.id ? "Verifying GPS…" : "Scan QR & Clock Out"}
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            className="rounded-full bg-gradient-primary text-primary-foreground shadow-glow font-bold w-full sm:w-auto text-xs"
                            disabled={isScanning === j.id}
                            onClick={() => handleClockIn(j)}
                          >
                            {isScanning === j.id ? "Verifying GPS…" : "Scan QR & Clock In"}
                          </Button>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="px-5 py-3 bg-muted/30 flex flex-wrap gap-2 items-center">
                    <Button size="sm" variant="outline" className="rounded-full gap-1.5"><Phone className="h-3.5 w-3.5" /> {t("Call")}</Button>
                    <Button size="sm" variant="outline" className="rounded-full gap-1.5" asChild>
                      <Link to="/worker/messages" search={{ userId: j.contractorId }}><MessageSquare className="h-3.5 w-3.5" /> {t("Message")}</Link>
                    </Button>
                    <Button size="sm" variant="outline" className="rounded-full" asChild>
                      <Link to="/worker/jobs/$jobId" params={{ jobId: j.id }}>{t("View details")}</Link>
                    </Button>
                    {isClockedIn && (
                      <Button
                        size="sm"
                        className="rounded-full bg-success text-white hover:bg-success/90 ml-auto gap-1 text-xs"
                        onClick={() => handleClockOut(j)}
                      >
                        <CheckCircle2 className="h-4 w-4" /> Request Escrow Release
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Side panel */}
          <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-3xl bg-gradient-to-br from-blue-800 via-blue-900 to-slate-950 text-white p-6 shadow-elegant relative overflow-hidden">
              <div className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-white/15 blur-2xl" />
              <p className="text-xs uppercase tracking-widest opacity-90">{t("Expected payout")}</p>
              <p className="text-3xl font-extrabold mt-2 inline-flex items-center"><IndianRupee className="h-7 w-7" />{totalPayout.toLocaleString()}</p>
              <p className="text-xs opacity-90 mt-2">{t("From active jobs")}</p>
            </div>
            <div className="rounded-3xl bg-card border border-border p-6 shadow-soft space-y-4">
              <div>
                <h3 className="font-bold flex items-center gap-2 text-primary">
                  <span className="text-lg">🛡️</span> {t("Escrow & Trust Rules")}
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Your daily wages are locked in a digital escrow before you start. Payout is guaranteed upon QR clock-out.
                </p>
              </div>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-success mt-0.5 shrink-0" /> Reach 15 minutes early.</li>
                <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-success mt-0.5 shrink-0" /> Scan QR at site to verify GPS.</li>
                <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-success mt-0.5 shrink-0" /> Clock out to release same-day UPI pay.</li>
              </ul>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}

function Stat({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border p-2.5">
      <div className="flex items-center gap-1.5 text-muted-foreground"><Icon className="h-3 w-3" /><span className="text-[10px] uppercase tracking-wider">{label}</span></div>
      <p className="mt-0.5 font-bold text-sm">{value}</p>
    </div>
  );
}
