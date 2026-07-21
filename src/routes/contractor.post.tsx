import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Loader2, Navigation } from "lucide-react";
import { googleReverseGeocode, googleGeocodeSearch } from "@/lib/google-maps";
import { MapPicker } from "@/components/map";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { SKILLS } from "@/lib/skills-config";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { RazorpayModal } from "@/components/razorpay-modal";

export const Route = createFileRoute("/contractor/post")({
  head: () => ({ meta: [{ title: "Post a job — JobNow" }] }),
  component: PostJob,
});

// ─── Schema ───────────────────────────────────────────────────────────────────
const postJobSchema = z.object({
  title: z.string().min(5, "Job title must be at least 5 characters"),
  description: z.string().min(20, "Please add at least 20 characters describing the job"),
  payPerDay: z
    .string()
    .min(1, "Pay per day is required")
    .refine((v) => Number(v) >= 200, "Pay must be at least ₹200/day"),
  workersNeeded: z
    .string()
    .min(1, "Required")
    .refine((v) => Number(v) >= 1 && Number(v) <= 100, "Workers must be between 1 and 100"),
  durationDays: z
    .string()
    .min(1, "Required")
    .refine((v) => Number(v) >= 1, "Duration must be at least 1 day"),
  startDate: z.string().min(1, "Start date is required"),
  location: z.string().min(3, "Enter a valid location"),
});

type PostJobForm = z.infer<typeof postJobSchema>;

// ─── Component ────────────────────────────────────────────────────────────────
function PostJob() {
  const nav = useNavigate();
  const { user } = useAuth();
  const [skill, setSkill] = useState<string>("painter");
  const [skillError, setSkillError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Maps and Geolocation states
  const [lat, setLat] = useState<number>(28.5355); // Noida default
  const [lng, setLng] = useState<number>(77.3910);
  const [isDetectingGps, setIsDetectingGps] = useState(false);

  // Escrow Payment Gateway states
  const [showPayment, setShowPayment] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [pendingJobData, setPendingJobData] = useState<PostJobForm | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    getValues,
    formState: { errors },
  } = useForm<PostJobForm>({
    resolver: zodResolver(postJobSchema),
    mode: "onBlur",
    defaultValues: {
      location: "Sector 22, Noida"
    }
  });

  // Reverse Geocoding
  const reverseGeocode = async (latitude: number, longitude: number) => {
    try {
      const result = await googleReverseGeocode(latitude, longitude);
      if (result.locationName) {
        setValue("location", result.locationName, { shouldValidate: true, shouldDirty: true });
      }
    } catch (err) {
      console.error("Reverse geocoding failed:", err);
    }
  };

  // GPS Locate Device
  const detectGpsLocation = () => {
    setIsDetectingGps(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const latitude = pos.coords.latitude;
        const longitude = pos.coords.longitude;
        setLat(latitude);
        setLng(longitude);

        reverseGeocode(latitude, longitude);
        toast.success("GPS Coordinates mapped!");
        setIsDetectingGps(false);
      },
      (err) => {
        console.error(err);
        toast.error("Geolocation denied. Drag map pin manually.");
        setIsDetectingGps(false);
      }
    );
  };

  // Search Address Geocoding
  const searchAddress = async (query: string) => {
    if (!query || !query.trim()) return;
    try {
      const result = await googleGeocodeSearch(query);
      const latitude = result.latitude;
      const longitude = result.longitude;
      setLat(latitude);
      setLng(longitude);
      
      setValue("location", result.locationName, { shouldValidate: true, shouldDirty: true });
      toast.success("Location found and marked on map!");
    } catch (err) {
      console.error("Geocoding failed:", err);
      toast.error("Location not found. Try search or drag pin manually.");
    }
  };

  // Post form submit: triggers Escrow check first
  async function onSubmit(data: PostJobForm) {
    if (!user) {
      toast.error("You must be logged in to post a job.");
      return;
    }
    if (!skill) {
      setSkillError("Please select the required skill");
      return;
    }
    setSkillError("");

    // Calculate total escrow required
    const pay = Number(data.payPerDay);
    const workers = Number(data.workersNeeded);
    const days = Number(data.durationDays);
    const totalEscrow = pay * workers * days;

    // Save form values & prompt Razorpay Payment Dialog
    setPaymentAmount(totalEscrow);
    setPendingJobData(data);
    setShowPayment(true);
  }

  // Live submit post after Razorpay Payment Success
  const executeJobPost = async (txId: string) => {
    if (!pendingJobData || !user) return;
    setIsSubmitting(true);

    try {
      const { error } = await supabase.from("jobs").insert({
        contractor_id: user.id,
        title: pendingJobData.title,
        description: pendingJobData.description,
        skill,
        pay_per_day: Number(pendingJobData.payPerDay),
        workers_needed: Number(pendingJobData.workersNeeded),
        duration_days: Number(pendingJobData.durationDays),
        location: pendingJobData.location,
        latitude: lat,
        longitude: lng,
        status: "open",
        escrow_status: "locked", // Escrow locked by simulated Razorpay
        attendance_status: "pending_clockin",
        geofence_radius_meters: 1000,
      });

      if (error) throw error;

      toast.success(`Job posted successfully! Escrow locked via transaction ${txId.substring(0, 10)}.`);
      nav({ to: "/contractor" });
    } catch (err) {
      console.error("Error posting job:", err);
      toast.error(err instanceof Error ? err.message : "Failed to post job.");
    } finally {
      setIsSubmitting(false);
      setPendingJobData(null);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-5 pt-7 pb-12">
      <h1 className="text-2xl font-extrabold">Post a new job</h1>
      <p className="text-sm text-muted-foreground">Reach nearby workers in seconds.</p>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-5" noValidate>
        {/* Title */}
        <div>
          <Label className="text-xs">Job title <span className="text-destructive">*</span></Label>
          <Input
            id="post-title"
            className={`mt-1.5 h-12 rounded-xl bg-card ${errors.title ? "border-destructive" : ""}`}
            placeholder="e.g. Interior wall painting"
            {...register("title")}
          />
          {errors.title && <p className="mt-1 text-xs text-destructive">{errors.title.message}</p>}
        </div>

        {/* Skill selector */}
        <div>
          <Label className="text-xs">Required skill <span className="text-destructive">*</span></Label>
          <div className="mt-2 flex gap-2 overflow-x-auto no-scrollbar -mx-5 px-5">
            {SKILLS.map((s) => {
              const active = skill === s.id;
              const Icon = s.icon;
              return (
                <button
                  type="button"
                  key={s.id}
                  onClick={() => { setSkill(s.id); setSkillError(""); }}
                  className={cn(
                    "shrink-0 inline-flex items-center gap-2 px-3.5 py-2 rounded-full text-xs font-medium border transition-all",
                    active
                      ? "bg-gradient-primary text-primary-foreground border-transparent shadow-soft"
                      : "bg-card border-border hover:border-primary/40",
                  )}
                >
                  <Icon className="h-3.5 w-3.5" /> {s.name}
                </button>
              );
            })}
          </div>
          {skillError && <p className="mt-1 text-xs text-destructive">{skillError}</p>}
        </div>

        {/* Description */}
        <div>
          <Label className="text-xs">Description <span className="text-destructive">*</span></Label>
          <Textarea
            id="post-description"
            className={`mt-1.5 rounded-xl bg-card min-h-28 ${errors.description ? "border-destructive" : ""}`}
            placeholder="Tell workers what to expect, tools required, lunch provided, etc."
            {...register("description")}
          />
          {errors.description && <p className="mt-1 text-xs text-destructive">{errors.description.message}</p>}
        </div>

        {/* Pay + Workers */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Pay (₹/day) <span className="text-destructive">*</span></Label>
            <Input
              id="post-pay"
              className={`mt-1.5 h-12 rounded-xl bg-card ${errors.payPerDay ? "border-destructive" : ""}`}
              type="number"
              placeholder="850"
              {...register("payPerDay")}
            />
            {errors.payPerDay && <p className="mt-1 text-xs text-destructive">{errors.payPerDay.message}</p>}
          </div>
          <div>
            <Label className="text-xs">Workers needed <span className="text-destructive">*</span></Label>
            <Input
              id="post-workers"
              className={`mt-1.5 h-12 rounded-xl bg-card ${errors.workersNeeded ? "border-destructive" : ""}`}
              type="number"
              placeholder="2"
              {...register("workersNeeded")}
            />
            {errors.workersNeeded && <p className="mt-1 text-xs text-destructive">{errors.workersNeeded.message}</p>}
          </div>
        </div>

        {/* Duration + Start date */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Duration (days) <span className="text-destructive">*</span></Label>
            <Input
              id="post-duration"
              className={`mt-1.5 h-12 rounded-xl bg-card ${errors.durationDays ? "border-destructive" : ""}`}
              type="number"
              placeholder="3"
              {...register("durationDays")}
            />
            {errors.durationDays && <p className="mt-1 text-xs text-destructive">{errors.durationDays.message}</p>}
          </div>
          <div>
            <Label className="text-xs">Start date <span className="text-destructive">*</span></Label>
            <Input
              id="post-start-date"
              className={`mt-1.5 h-12 rounded-xl bg-card ${errors.startDate ? "border-destructive" : ""}`}
              type="date"
              {...register("startDate")}
            />
            {errors.startDate && <p className="mt-1 text-xs text-destructive">{errors.startDate.message}</p>}
          </div>
        </div>

        {/* Location & GPS */}
        <div className="space-y-2">
          <Label className="text-xs">Location & Coordinates <span className="text-destructive">*</span></Label>
          <div className="flex gap-2">
            <Input
              id="post-location"
              className={`h-12 rounded-xl bg-card flex-1 ${errors.location ? "border-destructive" : ""}`}
              placeholder="Sector 22, Noida"
              {...register("location")}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  searchAddress(e.currentTarget.value);
                }
              }}
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => searchAddress(getValues("location"))}
              className="h-12 rounded-xl border border-input px-4 font-bold text-xs"
            >
              Search
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={detectGpsLocation}
              disabled={isDetectingGps}
              className="h-12 rounded-xl border border-input px-3"
            >
              {isDetectingGps ? (
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
              ) : (
                <Navigation className="h-4 w-4 text-primary" />
              )}
            </Button>
          </div>
          {errors.location && <p className="mt-1 text-xs text-destructive">{errors.location.message}</p>}

          {/* Leaflet Map Picker */}
          <div className="mt-2 space-y-1">
            <MapPicker
              lat={lat}
              lng={lng}
              onChange={(newLat, newLng) => {
                setLat(newLat);
                setLng(newLng);
                reverseGeocode(newLat, newLng);
              }}
              className="h-60 w-full rounded-2xl border border-border shadow-soft overflow-hidden"
            />
            <p className="text-[10px] text-muted-foreground text-center">
              Click the map or drag the pin to select the job site location.
            </p>
          </div>
        </div>

        <Button
          id="post-job-submit"
          type="submit"
          disabled={isSubmitting}
          className="w-full h-12 rounded-full bg-gradient-primary text-primary-foreground font-semibold shadow-glow"
        >
          {isSubmitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Publishing…</> : "Publish & Fund Escrow"}
        </Button>
      </form>

      {/* Razorpay Escrow Modal */}
      <RazorpayModal
        isOpen={showPayment}
        onClose={() => setShowPayment(false)}
        onSuccess={executeJobPost}
        amount={paymentAmount}
        jobTitle={pendingJobData?.title || "Job Listing"}
      />
    </div>
  );
}
