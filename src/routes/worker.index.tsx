import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, ChevronRight, IndianRupee, MapPin, TrendingUp, Map, List, Search, Navigation, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { JobCard } from "@/components/job-card";
import { SKILLS } from "@/lib/skills-config";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { useLanguage } from "@/lib/language";
import { supabase } from "@/lib/supabase";
import { googleReverseGeocode, googleGeocodeSearch } from "@/lib/google-maps";
import { MapNearby } from "@/components/map";
import { toast } from "sonner";

export const Route = createFileRoute("/worker/")({
  head: () => ({ meta: [{ title: "Worker dashboard — JobNow" }] }),
  component: WorkerHome,
});

// Haversine Proximity calculator
function getDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // Earth radius in km
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

function WorkerHome() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const firstName = user?.name?.split(" ")[0] ?? "there";
  const [skill, setSkill] = useState<string | null>(null);
  const [available, setAvailable] = useState(true);

  const [jobs, setJobs] = useState<any[]>([]);
  const [activeJobs, setActiveJobs] = useState<any[]>([]);
  const [earningsStats, setEarningsStats] = useState({ thisWeek: 0, thisMonth: 0, pending: 0 });
  const [isLoading, setIsLoading] = useState(true);

  // Map & Geolocation States
  const [viewMode, setViewMode] = useState<"list" | "map">("list");
  const [workerLat, setWorkerLat] = useState<number | null>(user?.latitude || null);
  const [workerLng, setWorkerLng] = useState<number | null>(user?.longitude || null);
  const [locationName, setLocationName] = useState(user?.location || "Sector 22, Noida");
  
  const [gpsBlocked, setGpsBlocked] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchingGps, setIsSearchingGps] = useState(false);

  // Load location on mount
  useEffect(() => {
    detectLocation();
  }, []);

  const detectLocation = () => {
    setIsSearchingGps(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const latitude = pos.coords.latitude;
        const longitude = pos.coords.longitude;
        setWorkerLat(latitude);
        setWorkerLng(longitude);
        setGpsBlocked(false);

        // Fetch location name using Google Geocoder
        googleReverseGeocode(latitude, longitude)
          .then((result) => {
            setLocationName(result.locationName || `${latitude.toFixed(3)}, ${longitude.toFixed(3)}`);
          })
          .catch(() => {
            setLocationName(`${latitude.toFixed(3)}, ${longitude.toFixed(3)}`);
          })
          .finally(() => setIsSearchingGps(false));
      },
      (err) => {
        console.error("GPS blocked or denied:", err);
        if (!user?.latitude || !user?.longitude) {
          setGpsBlocked(true);
        }
        setIsSearchingGps(false);
      },
      { timeout: 6000 }
    );
  };

  // Google Maps search
  const handleManualSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setIsSearchingGps(true);

    try {
      const result = await googleGeocodeSearch(searchQuery);
      setWorkerLat(result.latitude);
      setWorkerLng(result.longitude);
      setLocationName(result.locationName);
      setGpsBlocked(false);
    } catch (err) {
      console.error(err);
      toast.error("Location not found. Try another sector or city.");
    } finally {
      setIsSearchingGps(false);
    }
  };

  const filtered = jobs.filter((j) => !skill || j.skill === skill);

  const mapItems = filtered.map((j) => {
    const jobLat = j.latitude || (workerLat ? workerLat + (Math.random() - 0.5) * 0.04 : 28.5355);
    const jobLng = j.longitude || (workerLng ? workerLng + (Math.random() - 0.5) * 0.04 : 77.3910);
    return {
      id: j.id,
      lat: Number(jobLat),
      lng: Number(jobLng),
      title: j.title,
      subtitle: `${j.contractor} · ₹${j.payPerDay}/d · ${j.distanceKm.toFixed(1)} km`,
      onClick: () => {
        navigate({ to: `/worker/jobs/${j.id}` });
      },
    };
  });

  // Load live jobs and filter
  useEffect(() => {
    async function loadData() {
      if (!user) return;
      try {
        const { data: dbJobs, error: jobsErr } = await supabase
          .from("jobs")
          .select("*, contractor:profiles(name, avatar)")
          .eq("status", "open")
          .order("created_at", { ascending: false });

        if (jobsErr) throw jobsErr;

        // Map distances based on coordinates
        const formattedJobs = (dbJobs || []).map((j) => {
          const createdTime = new Date(j.created_at).getTime();
          const diffMins = Math.max(1, Math.floor((Date.now() - createdTime) / 60000));

          let distance = j.distance_km || 1.2;
          if (workerLat && workerLng && j.latitude && j.longitude) {
            distance = getDistanceKm(workerLat, workerLng, parseFloat(j.latitude.toString()), parseFloat(j.longitude.toString()));
          }

          return {
            id: j.id,
            title: j.title,
            description: j.description,
            skill: j.skill,
            distanceKm: distance,
            location: j.location,
            postedMinsAgo: diffMins,
            payPerDay: j.pay_per_day,
            workersNeeded: j.workers_needed,
            contractor: j.contractor?.name || "Contractor",
            contractorAvatar: j.contractor?.avatar || "C",
            latitude: j.latitude,
            longitude: j.longitude,
          };
        });

        // Proximity Sorting: closest jobs first
        formattedJobs.sort((a, b) => a.distanceKm - b.distanceKm);
        setJobs(formattedJobs);

        // Fetch active jobs
        const { data: dbApps, error: appsErr } = await supabase
          .from("applications")
          .select("*, job:jobs(*, contractor:profiles(name))")
          .eq("worker_id", user.id);

        if (appsErr) throw appsErr;

        const formattedActive = (dbApps || [])
          .filter((app) => app.status === "hired" || app.status === "applied")
          .map((app) => ({
            id: app.job.id,
            title: app.job.title,
            contractor: app.job.contractor?.name || "Contractor",
            durationDays: app.job.duration_days,
            payPerDay: app.job.pay_per_day,
            status: app.status,
          }));
        setActiveJobs(formattedActive);

        // Compute stats
        const completedJobs = (dbApps || []).filter((app) => app.status === "completed" || app.job?.status === "completed");
        const totalCompletedEarnings = completedJobs.reduce((acc, app) => acc + (app.job.pay_per_day * app.job.duration_days), 0);
        
        const hiredJobs = (dbApps || []).filter((app) => app.status === "hired");
        const totalPendingEarnings = hiredJobs.reduce((acc, app) => acc + (app.job.pay_per_day * app.job.duration_days), 0);

        setEarningsStats({
          thisWeek: totalCompletedEarnings,
          thisMonth: totalCompletedEarnings,
          pending: totalPendingEarnings,
        });

      } catch (err) {
        console.error("Error loading worker data:", err);
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, [user, workerLat, workerLng]);



  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 pt-6 md:pt-8 pb-10">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-hero text-white p-6 md:p-8 shadow-elegant">
        <div className="absolute inset-0 bg-gradient-mesh opacity-40" />
        <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-5">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <p className="text-xs uppercase tracking-widest opacity-80">{t("Good morning")}</p>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold mt-1">{t("Welcome back")}, {firstName} 👋</h1>
            <p className="mt-1.5 inline-flex items-center gap-1.5 text-sm opacity-90">
              <MapPin className="h-3.5 w-3.5 text-white animate-pulse" /> {locationName} · {jobs.length} jobs nearby
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="glass border border-white/20 rounded-2xl p-3 flex items-center gap-4 w-full sm:w-auto">
              <div>
                <p className="text-[10px] uppercase tracking-widest opacity-80">{t("Availability")}</p>
                <p className="font-semibold text-sm">{available ? t("Available for work") : t("Offline")}</p>
              </div>
              <Switch checked={available} onCheckedChange={setAvailable} />
            </div>
          </div>
        </div>
      </section>

      {/* GPS Search Fallback Banner */}
      {gpsBlocked && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mt-5 rounded-2xl bg-destructive/10 border border-destructive/20 p-5 shadow-soft">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="font-bold text-sm text-destructive">📍 Geolocation services are blocked</p>
              <p className="text-xs text-muted-foreground mt-0.5">Please type your sector/address below to match nearby jobs by GPS distance.</p>
            </div>
            <form onSubmit={handleManualSearch} className="flex gap-2 w-full sm:w-80">
              <Input
                placeholder="Search sector, e.g. Noida Sector 62"
                className="h-10 rounded-xl bg-card text-xs"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                required
              />
              <Button type="submit" disabled={isSearchingGps} className="h-10 rounded-xl px-4 text-xs bg-gradient-primary">
                {isSearchingGps ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search"}
              </Button>
            </form>
          </div>
        </motion.div>
      )}

      {/* Geofenced QR Attendance Quick Action Banner */}
      <div className="mt-6 rounded-2xl bg-card border-2 border-primary/40 p-5 shadow-soft flex flex-col sm:flex-row items-center justify-between gap-4 bg-gradient-to-r from-primary/5 via-transparent to-primary/5">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-2xl bg-primary text-primary-foreground grid place-items-center shadow-lg shrink-0">
            <span className="text-2xl">📍</span>
          </div>
          <div>
            <p className="font-extrabold text-base">Geofenced QR Attendance & Escrow</p>
            <p className="text-xs text-muted-foreground mt-0.5">Clock in at your job site to verify GPS & unlock same-day ₹850 escrow payout.</p>
          </div>
        </div>
        <Link
          to="/worker/accepted"
          className="h-11 px-6 rounded-full bg-gradient-primary text-primary-foreground font-semibold shadow-glow flex items-center gap-2 hover:opacity-95 transition-opacity shrink-0"
        >
          <span>{t("Scan QR & Clock In")}</span>
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>

      {/* Stats */}
      <section className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <StatCard label={t("This week")} value={`₹${earningsStats.thisWeek.toLocaleString()}`} icon={<TrendingUp className="h-4 w-4" />} />
        <StatCard label={t("This month")} value={`₹${earningsStats.thisMonth.toLocaleString()}`} icon={<IndianRupee className="h-4 w-4" />} />
        <StatCard label={t("Active jobs")} value={activeJobs.length.toString()} icon={<Bell className="h-4 w-4" />} />
        <StatCard label={t("Pending")} value={`₹${earningsStats.pending.toLocaleString()}`} icon={<TrendingUp className="h-4 w-4" />} />
      </section>

      {/* Toggle View mode */}
      <div className="mt-6 flex justify-between items-center">
        <h2 className="font-bold text-lg">{viewMode === "map" ? "Nearby Jobs (Map)" : t("Browse by skill")}</h2>
        <div className="flex gap-2">
          {gpsBlocked && (
            <Button size="sm" variant="outline" className="rounded-full h-9 gap-1 text-xs" onClick={detectLocation}>
              <Navigation className="h-3.5 w-3.5 text-primary" /> Retry GPS
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            className="rounded-full h-9 gap-1.5 text-xs font-semibold"
            onClick={() => setViewMode(viewMode === "list" ? "map" : "list")}
          >
            {viewMode === "list" ? (
              <>
                <Map className="h-3.5 w-3.5 text-primary" /> View on Map
              </>
            ) : (
              <>
                <List className="h-3.5 w-3.5 text-primary" /> View List
              </>
            )}
          </Button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {viewMode === "list" ? (
          <motion.div key="list-view" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {/* Skills */}
            <section className="mt-3">
              <div className="flex gap-3 overflow-x-auto no-scrollbar -mx-4 px-4 md:flex-wrap md:overflow-visible md:mx-0 md:px-0">
                {SKILLS.map((s, i) => {
                  const active = skill === s.id;
                  const Icon = s.icon;
                  return (
                    <motion.button key={s.id}
                      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                      onClick={() => setSkill(active ? null : s.id)}
                      className={cn(
                        "shrink-0 flex flex-col items-center gap-2 rounded-2xl p-4 w-24 md:w-28 border bg-card transition-all hover:shadow-soft",
                        active ? "border-primary shadow-soft -translate-y-0.5" : "border-border hover:border-primary/40",
                      )}>
                      <div className={`h-12 w-12 rounded-2xl bg-gradient-to-br ${s.color} grid place-items-center text-white shadow-soft`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <span className="text-xs font-medium text-center leading-tight">{s.name}</span>
                    </motion.button>
                  );
                })}
              </div>
            </section>

            <div className="mt-7 grid grid-cols-1 xl:grid-cols-3 gap-5">
              {/* Nearby jobs list */}
              <section className="xl:col-span-2">
                <SectionHeader title={t("Nearby jobs")} actionTo="/worker/jobs" />
                {isLoading ? (
                  <div className="flex items-center justify-center h-48">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                  </div>
                ) : filtered.length === 0 ? (
                  <div className="rounded-3xl border border-dashed border-border bg-card p-12 text-center">
                    <p className="font-semibold text-muted-foreground">{t("No jobs found matching your criteria.")}</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {filtered.slice(0, 6).map((j, i) => (
                      <JobCard key={j.id} job={{ ...j, distanceKm: j.distanceKm }} index={i} />
                    ))}
                  </div>
                )}
              </section>

              {/* Active jobs sidebar */}
              <aside>
                <SectionHeader title={t("Active jobs")} actionTo="/worker/accepted" />
                <div className="space-y-3">
                  {activeJobs.map((j) => (
                    <div key={j.id} className="rounded-2xl border border-border bg-card p-4 shadow-soft">
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-semibold text-sm truncate">{j.title}</p>
                          <p className="text-xs text-muted-foreground truncate">{j.contractor}</p>
                        </div>
                        <Badge className="bg-success/15 text-success border-0 rounded-full">
                          {j.status === "hired" ? t("Hired") : t("Applied")}
                        </Badge>
                      </div>
                      <div className="mt-3 h-1.5 rounded-full bg-muted overflow-hidden">
                        <div className="h-full bg-gradient-primary" style={{ width: j.status === "hired" ? "100%" : "30%" }} />
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        {j.status === "hired" ? t("Confirmed slot!") : t("Pending approval")}
                      </p>
                    </div>
                  ))}
                  {activeJobs.length === 0 && (
                    <div className="rounded-2xl border border-dashed border-border bg-card p-6 text-center text-sm text-muted-foreground">
                      {t("No active jobs yet")}
                    </div>
                  )}
                </div>
              </aside>
            </div>
          </motion.div>
        ) : (
          <motion.div key="map-view" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mt-4 space-y-4">
            {/* Search Input on Map overlay */}
            <form onSubmit={handleManualSearch} className="flex gap-2 max-w-md mx-auto">
              <Input
                placeholder="Search sector or location, e.g. Noida Sector 15"
                className="h-11 rounded-xl bg-card text-xs shadow-soft"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                required
              />
              <Button type="submit" disabled={isSearchingGps} className="h-11 rounded-xl px-4 bg-gradient-primary shadow-soft">
                {isSearchingGps ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              </Button>
            </form>
            <div className="h-[60vh] w-full rounded-[2rem] border border-border shadow-soft relative overflow-hidden">
              <MapNearby
                centerLat={workerLat || 28.5355}
                centerLng={workerLng || 77.3910}
                radiusKm={10}
                items={mapItems}
                className="h-full w-full"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SectionHeader({ title, actionTo }: { title: string; actionTo: string }) {
  const { t } = useLanguage();
  return (
    <div className="flex items-center justify-between mb-3">
      <h2 className="font-bold text-lg">{title}</h2>
      <Link to={actionTo} className="text-xs text-primary font-semibold inline-flex items-center hover:gap-2 gap-1 transition-all">
        {t("See all")} <ChevronRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}

function StatCard({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-card border border-border p-4 md:p-5 shadow-soft hover:shadow-elegant hover:-translate-y-0.5 transition-all">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground font-medium">{label}</p>
        <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary grid place-items-center">{icon}</div>
      </div>
      <p className="mt-3 text-2xl md:text-3xl font-extrabold tracking-tight">{value}</p>
    </div>
  );
}
