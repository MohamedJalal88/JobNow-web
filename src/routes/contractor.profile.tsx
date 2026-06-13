import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Briefcase, ChevronRight, LogOut, MapPin, Settings, Verified, Loader2, Upload, Navigation, CheckCircle2, X, Check } from "lucide-react";
import { PRESET_AVATARS } from "@/lib/avatars-config";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { googleReverseGeocode } from "@/lib/google-maps";

export const Route = createFileRoute("/contractor/profile")({
  head: () => ({ meta: [{ title: "Contractor profile — JobNow" }] }),
  component: ContractorProfile,
});

function ContractorProfile() {
  const { user, logout, updateUser } = useAuth();
  const nav = useNavigate();
  const [jobsPosted, setJobsPosted] = useState(0);
  const [workersHired, setWorkersHired] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);

  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [avatarUrl, setAvatarUrl] = useState("");

  const [isSaving, setIsSaving] = useState(false);
  const [isDetectingGps, setIsDetectingGps] = useState(false);
  const [isUploadingPic, setIsUploadingPic] = useState(false);
  const [avatarTab, setAvatarTab] = useState<"presets" | "upload">("presets");

  function handleLogout() {
    logout();
    nav({ to: "/welcome", replace: true });
  }

  useEffect(() => {
    async function loadStats() {
      if (!user) return;
      try {
        // Fetch jobs posted count
        const { count: jobsCount, error: jobsErr } = await supabase
          .from("jobs")
          .select("id", { count: "exact", head: true })
          .eq("contractor_id", user.id);

        if (jobsErr) throw jobsErr;
        setJobsPosted(jobsCount || 0);

        // Fetch jobs to get IDs
        const { data: dbJobs, error: dbJobsErr } = await supabase
          .from("jobs")
          .select("id")
          .eq("contractor_id", user.id);

        if (dbJobsErr) throw dbJobsErr;
        const jobIds = (dbJobs || []).map((j) => j.id);

        if (jobIds.length > 0) {
          // Fetch workers hired count
          const { count: hiredCount, error: hiredErr } = await supabase
            .from("applications")
            .select("id", { count: "exact", head: true })
            .in("job_id", jobIds)
            .eq("status", "hired");

          if (hiredErr) throw hiredErr;
          setWorkersHired(hiredCount || 0);
        }
      } catch (err) {
        console.error("Error loading contractor profile stats:", err);
      } finally {
        setIsLoading(false);
      }
    }

    if (user) {
      setName(user.name || "");
      setLocation(user.location || "");
      setLat(user.latitude || null);
      setLng(user.longitude || null);
      setAvatarUrl(user.avatar || "");
    }

    loadStats();
  }, [user]);

  const detectGpsLocation = () => {
    setIsDetectingGps(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const latitude = pos.coords.latitude;
        const longitude = pos.coords.longitude;
        setLat(latitude);
        setLng(longitude);

        googleReverseGeocode(latitude, longitude)
          .then((result) => {
            setLocation(result.locationName || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
            toast.success("GPS Location verified successfully!");
          })
          .catch((err) => {
            console.error("Reverse geocoding error:", err);
            setLocation(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
            toast.success("GPS Location verified!");
          })
          .finally(() => {
            setIsDetectingGps(false);
          });
      },
      (err) => {
        console.error("GPS error:", err);
        toast.error("Location permission denied. Please enter manually.");
        setIsDetectingGps(false);
      },
      { enableHighAccuracy: true, timeout: 5000 }
    );
  };

  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setIsUploadingPic(true);

    try {
      const fileExt = file.name.split(".").pop();
      const filePath = `${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, { cacheControl: "3600", upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

      setAvatarUrl(publicUrl);
      toast.success("Profile picture uploaded successfully!");
    } catch (err) {
      console.error("Avatar upload error:", err);
      toast.error(err instanceof Error ? err.message : "Failed to upload image.");
    } finally {
      setIsUploadingPic(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }
    setIsSaving(true);

    try {
      await updateUser({
        name,
        location,
        avatar: avatarUrl,
        latitude: lat || undefined,
        longitude: lng || undefined,
      });

      toast.success("Profile updated successfully! 🎉");
      setIsEditing(false);
    } catch (err) {
      console.error("Save profile error:", err);
      toast.error("Failed to update profile settings.");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const displayName = user?.name || "शर्मा ठेकेदार (Contractor)";
  const displayAvatar = user?.avatar || "C";
  const displayLocation = user?.location || "Noida, UP";
  const displayRating = user?.rating ? parseFloat(user.rating.toString()).toFixed(1) : "5.0";
  const hasUploadedAvatar = displayAvatar.startsWith("http");

  return (
    <div className="max-w-7xl mx-auto pb-10">
      <header className="relative px-5 pt-7 pb-16 bg-gradient-hero text-primary-foreground rounded-b-[2rem] overflow-hidden">
        <div className="absolute inset-0 bg-gradient-mesh opacity-40" />
        <div className="relative flex items-center gap-4">
          <Avatar className="h-20 w-20 border-4 border-white/30 shadow-elegant overflow-hidden bg-white">
            {hasUploadedAvatar ? (
              <img src={displayAvatar} alt={displayName} className="h-full w-full object-cover" />
            ) : (
              <AvatarFallback className="bg-white text-primary font-bold text-xl">
                {displayName.split(" ").map((n: string) => n[0]).slice(0, 2).join("").toUpperCase()}
              </AvatarFallback>
            )}
          </Avatar>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="text-xl font-bold">{displayName}</h1>
              <Verified className="h-4 w-4" />
            </div>
            <p className="text-sm opacity-90 inline-flex items-center gap-1 mt-0.5">
              <MapPin className="h-3.5 w-3.5" /> {displayLocation}
            </p>
            <Badge className="mt-2 bg-white/15 border-white/20 rounded-full">Construction & Interiors</Badge>
          </div>
        </div>
      </header>

      <div className="px-5 -mt-10 grid grid-cols-3 gap-2.5 relative">
        <Stat label="Jobs posted" value={String(jobsPosted)} />
        <Stat label="Workers hired" value={String(workersHired)} />
        <Stat label="Avg rating" value={displayRating} />
      </div>

      <section className="px-5 mt-7 space-y-2">
        <Item icon={Briefcase} label="My job posts" to="/contractor" />
        <Item icon={Settings} label="Settings" to="/contractor/settings" />
        <Item icon={LogOut} label="Log out" onClick={handleLogout} tone="text-destructive" />
      </section>

      <div className="px-5 mt-8">
        <Button 
          onClick={() => setIsEditing(true)}
          className="w-full h-12 rounded-full bg-gradient-primary text-primary-foreground font-semibold shadow-glow"
        >
          Edit profile
        </Button>
      </div>

      <AnimatePresence>
        {isEditing && (
          <div className="fixed inset-0 z-50 flex items-end justify-center">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isSaving && setIsEditing(false)}
              className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 220 }}
              className="relative w-full max-w-lg bg-card border-t border-border rounded-t-[2.5rem] shadow-elegant overflow-y-auto max-h-[85vh] z-10 flex flex-col"
            >
              <div className="px-6 py-5 border-b border-border flex items-center justify-between">
                <div>
                  <h3 className="font-extrabold text-lg">Edit Business Profile</h3>
                  <p className="text-xs text-muted-foreground">Keep your contractor business details verified and updated</p>
                </div>
                <button
                  disabled={isSaving}
                  onClick={() => setIsEditing(false)}
                  className="h-8 w-8 rounded-full hover:bg-muted grid place-items-center text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleSaveProfile} className="p-6 space-y-5 flex-1 overflow-y-auto">
                <div className="rounded-2xl border border-border bg-card p-4 shadow-soft space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="relative group">
                      <Avatar className="h-16 w-16 border border-border overflow-hidden bg-muted">
                        {avatarUrl && avatarUrl.startsWith("http") ? (
                          <img src={avatarUrl} alt={name} className="h-full w-full object-cover" />
                        ) : (
                          <AvatarFallback className="bg-primary text-primary-foreground font-bold text-lg">
                            {(name || "C").split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()}
                          </AvatarFallback>
                        )}
                      </Avatar>
                    </div>
                    <div>
                      <p className="font-extrabold text-sm">Upload Profile Photo</p>
                      <p className="text-xs text-muted-foreground">Upload only passport size photo (JPG/PNG)</p>
                    </div>
                  </div>

                  <div className="pt-2 flex items-center justify-center">
                    <label className="flex items-center gap-2 px-4 py-3 rounded-xl border border-border border-dashed bg-card hover:bg-muted/40 cursor-pointer w-full justify-center transition-colors">
                      {isUploadingPic ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin text-primary" />
                          <span className="text-xs text-muted-foreground">Uploading photo…</span>
                        </>
                      ) : (
                        <>
                          <Upload className="h-4 w-4 text-primary" />
                          <span className="text-xs font-semibold text-muted-foreground">Choose passport size photo</span>
                        </>
                      )}
                      <input 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        onChange={handleAvatarFileChange} 
                        disabled={isUploadingPic || isSaving}
                      />
                    </label>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="edit-name" className="text-xs">Full Name / Company Name</Label>
                  <Input
                    id="edit-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="h-11 rounded-xl bg-card"
                    placeholder="Enter business name"
                    required
                    disabled={isSaving}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="edit-location" className="text-xs">Business Location (City / Area)</Label>
                  <div className="flex gap-2">
                    <Input
                      id="edit-location"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      className="h-11 rounded-xl bg-card flex-1"
                      placeholder="e.g. Sector 62, Noida"
                      required
                      disabled={isSaving}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={detectGpsLocation}
                      disabled={isDetectingGps || isSaving}
                      className="h-11 rounded-xl border border-input px-3"
                    >
                      {isDetectingGps ? (
                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      ) : (
                        <Navigation className="h-4 w-4 text-primary" />
                      )}
                    </Button>
                  </div>
                  {lat && lng && (
                    <p className="text-[10px] text-success font-semibold inline-flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" /> GPS Registered ({lat.toFixed(4)}, {lng.toFixed(4)})
                    </p>
                  )}
                </div>

                <div className="pt-2 flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsEditing(false)}
                    disabled={isSaving}
                    className="flex-1 h-12 rounded-full font-bold"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSaving}
                    className="flex-1 h-12 rounded-full bg-gradient-primary text-primary-foreground font-bold shadow-soft"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Saving…
                      </>
                    ) : (
                      "Save Profile"
                    )}
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-card border border-border p-3.5 shadow-soft text-center">
      <p className="text-xl font-extrabold">{value}</p>
      <p className="text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}

function Item({ icon: Icon, label, to, tone, onClick }: { icon: React.ElementType; label: string; to?: string; tone?: string; onClick?: () => void }) {
  const inner = (
    <div className="rounded-2xl bg-card border border-border p-3.5 flex items-center gap-3 shadow-soft hover:bg-muted/40 transition-colors">
      <div className="h-9 w-9 rounded-xl bg-muted grid place-items-center"><Icon className={`h-4.5 w-4.5 ${tone ?? ""}`} /></div>
      <p className={`flex-1 font-medium text-sm ${tone ?? ""}`}>{label}</p>
      <ChevronRight className="h-4 w-4 text-muted-foreground" />
    </div>
  );
  if (to) return <Link to={to} className="block">{inner}</Link>;
  return <button className="w-full text-left" onClick={onClick}>{inner}</button>;
}
