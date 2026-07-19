import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useRef, useCallback } from "react";
import { Eye, EyeOff, Loader2, Navigation, Search, Upload, Check, Mail, Phone } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthSplit } from "@/components/auth-split";
import { MapPicker } from "@/components/map";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useAuth, isProfileIncomplete } from "@/lib/auth";
import type { UserRole } from "@/lib/auth";
import { PRESET_AVATARS } from "@/lib/avatars-config";
import { supabase } from "@/lib/supabase";
import { googleReverseGeocode, googleGeocodeSearch } from "@/lib/google-maps";

// ─── Search schema ────────────────────────────────────────────────────────────
const searchSchema = z.object({
  role: z.enum(["worker", "contractor"]).catch("worker"),
  completeProfile: z.boolean().or(z.string().transform((v) => v === "true")).optional().catch(false),
});

export const Route = createFileRoute("/register")({
  head: () => ({ meta: [{ title: "Create account — JobNow" }] }),
  validateSearch: searchSchema,
  component: Register,
});

// ─── Form schema ──────────────────────────────────────────────────────────────
const makeRegisterSchema = (isCompleteMode: boolean, signUpStep: "phone" | "otp" | "password", tab: "phone" | "email") => {
  if (isCompleteMode) {
    return z.object({
      name: z.string().min(2, "Name must be at least 2 characters"),
      phone: z
        .string()
        .min(10, "Enter a valid 10-digit phone number")
        .regex(/^[6-9]\d{9}$/, "Must be a valid Indian mobile number"),
      email: z.string().email("Invalid email address").optional().or(z.literal("")),
      location: z.string().min(3, "Please enter a valid location/address"),
      pincode: z.string().regex(/^\d{6}$/, "Pincode must be exactly 6 digits"),
    });
  }

  if (signUpStep === "password") {
    return z
      .object({
        phone: z
          .string()
          .min(10, "Enter a valid 10-digit phone number")
          .regex(/^[6-9]\d{9}$/, "Must be a valid Indian mobile number")
          .optional()
          .or(z.literal("")),
        email: z.string().email("Invalid email address").optional().or(z.literal("")),
        password: z.string()
          .min(8, "Password must be at least 8 characters")
          .regex(/(?=.*[0-9!@#$%^&*])/, "Password must contain a number or special character"),
        confirmPassword: z.string(),
      })
      .refine((d) => d.password === d.confirmPassword, {
        message: "Passwords do not match",
        path: ["confirmPassword"],
      });
  }

  if (tab === "email") {
    return z.object({
      email: z.string().email("Invalid email address"),
    });
  }

  return z.object({
    phone: z
      .string()
      .min(10, "Enter a valid 10-digit phone number")
      .regex(/^[6-9]\d{9}$/, "Must be a valid Indian mobile number"),
  });
};

type RegisterForm = any;

// ─── Static data ──────────────────────────────────────────────────────────────
const WORKER_SKILLS = ["Painter", "Electrician", "Plumber", "Carpenter", "Mason", "Cleaner", "Welder", "Driver"];
const CONTRACTOR_TYPES = ["Construction", "Interior", "Renovation", "Maintenance", "Industrial"];
const EXPERIENCE = ["0-1 yrs", "1-3 yrs", "3-5 yrs", "5+ yrs"];

// ─── Component ────────────────────────────────────────────────────────────────
function Register() {
  const nav = useNavigate();
  const { role, completeProfile } = Route.useSearch();
  const { register: registerUser, user, updateUser, logout, isLoading: authLoading } = useAuth();
  const isCompleteMode = !!(completeProfile && user);
  const currentRole = isCompleteMode && user && !isProfileIncomplete(user) ? user.role : role;
  const isWorker = currentRole === "worker";
  const [showPwd, setShowPwd] = useState(false);
  const [tab, setTab] = useState<"phone" | "email">("phone");
  const [skill, setSkill] = useState<string>("");
  const [experience, setExperience] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [skillError, setSkillError] = useState("");

  const [signUpStep, setSignUpStep] = useState<"phone" | "otp" | "password">("phone");
  const [otpCode, setOtpCode] = useState("");

  const [completeProfileStep, setCompleteProfileStep] = useState<"password" | "details">("details");
  const [completeProfilePwd, setCompleteProfilePwd] = useState("");
  const [completeProfileConfirmPwd, setCompleteProfileConfirmPwd] = useState("");
  const [pwdError, setPwdError] = useState("");
  const [confirmPwdError, setConfirmPwdError] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const hasInitializedStep = useRef(false);

  useEffect(() => {
    if (role) {
      localStorage.setItem("signup_role", role);
    }
  }, [role]);

  // Prevent role switching on refresh/reload/back by enforcing the cached role
  useEffect(() => {
    if (completeProfile) {
      const savedRole = localStorage.getItem("signup_role");
      if (savedRole && savedRole !== role && (savedRole === "worker" || savedRole === "contractor")) {
        nav({
          to: "/register",
          search: { role: savedRole as any, completeProfile: true },
          replace: true,
        });
      }
    }
  }, [role, completeProfile, nav]);

  useEffect(() => {
    if (isCompleteMode && user && !hasInitializedStep.current) {
      hasInitializedStep.current = true;
      if (!user.phone || user.phone.trim() === "") {
        setCompleteProfileStep("password");
      } else {
        setCompleteProfileStep("details");
      }
    }
  }, [isCompleteMode, user]);

  const handleSetGooglePassword = async () => {
    setPwdError("");
    setConfirmPwdError("");

    if (completeProfilePwd.length < 8 || !/(?=.*[0-9!@#$%^&*])/.test(completeProfilePwd)) {
      setPwdError("Password must be at least 8 characters and contain a number or special character");
      return;
    }
    if (completeProfilePwd !== completeProfileConfirmPwd) {
      setConfirmPwdError("Passwords do not match");
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: completeProfilePwd,
      });
      if (error) throw error;

      toast.success("Password created successfully!");
      setCompleteProfileStep("details");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to set password. Try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendOtp = async () => {
    if (cooldown > 0) return;
    const isValid = await trigger(tab);
    if (!isValid) return;

    setIsSubmitting(true);
    try {
      if (tab === "phone") {
        const rawPhone = getValues("phone");
        const formattedPhone = `+91${rawPhone.replace(/\D/g, "")}`;
        
        const { error } = await supabase.auth.signInWithOtp({
          phone: formattedPhone,
          options: {
            data: {
              role: role,
            },
          },
        });
        if (error) throw error;
        toast.success("Verification OTP sent! Please check your mobile.");
      } else {
        const emailAddress = getValues("email");
        const { error } = await supabase.auth.signInWithOtp({
          email: emailAddress,
          options: {
            data: {
              role: role,
            },
          },
        });
        if (error) throw error;
        toast.success("Verification OTP sent! Please check your email inbox.");
      }
      setSignUpStep("otp");
      setCooldown(60);
      const timer = setInterval(() => {
        setCooldown((c) => {
          if (c <= 1) {
            clearInterval(timer);
            return 0;
          }
          return c - 1;
        });
      }, 1000);
    } catch (err) {
      console.error("OTP send failed:", err);
      const errMsg = err instanceof Error ? err.message : String(err);
      toast.error(`Failed to send OTP: ${errMsg}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otpCode || otpCode.length < 6) {
      toast.error("Please enter a valid 6-digit OTP code.");
      return;
    }

    setIsSubmitting(true);

    try {
      if (tab === "phone") {
        const rawPhone = getValues("phone");
        const formattedPhone = `+91${rawPhone.replace(/\D/g, "")}`;
        const { error } = await supabase.auth.verifyOtp({
          phone: formattedPhone,
          token: otpCode,
          type: "sms",
        });
        if (error) throw error;
      } else {
        const emailAddress = getValues("email");
        const { error } = await supabase.auth.verifyOtp({
          email: emailAddress,
          token: otpCode,
          type: "email",
        });
        if (error) throw error;
      }
      
      toast.success("OTP Verified! Please create a password for your account.");
      setSignUpStep("password");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Invalid OTP verification code.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = async () => {
    try {
      await logout();
      nav({ to: "/welcome", replace: true });
    } catch (err) {
      console.error("Logout failed during cancel:", err);
    }
  };

  useEffect(() => {
    if (!authLoading) {
      if (completeProfile && !user) {
        nav({ to: "/register", search: { role, completeProfile: false }, replace: true });
      } else if (!completeProfile && user && isProfileIncomplete(user)) {
        const signupRole = localStorage.getItem("signup_role") || user.user_metadata?.role || role || "worker";
        nav({ to: "/register", search: { role: signupRole as any, completeProfile: true }, replace: true });
      } else if (user && !isProfileIncomplete(user)) {
        nav({ to: user.role === "contractor" ? "/contractor" : "/worker", replace: true });
      }
    }
  }, [authLoading, completeProfile, user, role, nav]);

  async function handleGoogleLogin() {
    setIsSubmitting(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: window.location.origin + "/welcome",
          queryParams: {
            prompt: "select_account",
          },
          data: {
            role: role,
          },
        },
      });
      if (error) throw error;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Google registration failed. Try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const skillOptions = isWorker ? WORKER_SKILLS : CONTRACTOR_TYPES;

  // Google map and geocoding state
  const [lat, setLat] = useState<number>(28.5355); // default Noida
  const [lng, setLng] = useState<number>(77.3910);
  const [isDetectingGps, setIsDetectingGps] = useState(false);

  const [avatarUrl, setAvatarUrl] = useState<string>("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploadingPic, setIsUploadingPic] = useState(false);
  const [avatarTab, setAvatarTab] = useState<"presets" | "upload">("presets");

  const handleAvatarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    setAvatarUrl(URL.createObjectURL(file));
    toast.success("Photo selected successfully!");
  };

  const {
    register,
    handleSubmit,
    setValue,
    getValues,
    trigger,
    formState: { errors },
  } = useForm<any>({
    resolver: zodResolver(makeRegisterSchema(isCompleteMode, signUpStep, tab)),
    mode: "onBlur",
  });

  useEffect(() => {
    if (isCompleteMode && user) {
      if (user.name) setValue("name", user.name);
      if (user.email) setValue("email", user.email);
      if (user.avatar) setAvatarUrl(user.avatar);
    }
  }, [isCompleteMode, user, setValue]);



  // Reverse geocoding when pin is dragged/clicked
  const reverseGeocode = async (latitude: number, longitude: number) => {
    try {
      const result = await googleReverseGeocode(latitude, longitude);
      if (result.locationName) {
        setValue("location", result.locationName, { shouldValidate: true, shouldDirty: true });
        if (result.pincode) {
          setValue("pincode", result.pincode.replace(/\D/g, "").slice(0, 6), { shouldValidate: true, shouldDirty: true });
        }
      }
    } catch (err) {
      console.error("Google reverse geocoding failed:", err);
    }
  };

  // Locate by text address/pincode search
  const searchAddress = async (query: string, pincodeVal?: string) => {
    let fullQuery = query || "";
    if (pincodeVal) {
      fullQuery += ` ${pincodeVal}`;
    }
    if (!fullQuery || !fullQuery.trim()) return;

    try {
      const result = await googleGeocodeSearch(fullQuery);
      const latitude = result.latitude;
      const longitude = result.longitude;
      setLat(latitude);
      setLng(longitude);

      setValue("location", result.locationName, { shouldValidate: true, shouldDirty: true });
      if (result.pincode) {
        setValue("pincode", result.pincode.replace(/\D/g, "").slice(0, 6), { shouldValidate: true, shouldDirty: true });
      }
      toast.success("Location found on map!");
    } catch (err) {
      console.error("Google geocoding search failed:", err);
      toast.error("Location not found. Try searching for a nearby area.");
    }
  };

  // Locate by GPS
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

  async function onSubmit(data: RegisterForm) {
    if (isCompleteMode && !skill) {
      setSkillError(`Please select a ${isWorker ? "skill" : "project type"}`);
      return;
    }
    setSkillError("");
    setIsSubmitting(true);
    try {
      if (isCompleteMode) {
        let finalAvatarUrl = avatarUrl;
        if (selectedFile && user) {
          const fileExt = selectedFile.name.split(".").pop();
          const filePath = `${user.id}/avatar-${Date.now()}.${fileExt}`;
          const { error: uploadError } = await supabase.storage
            .from("avatars")
            .upload(filePath, selectedFile, { cacheControl: "3600", upsert: true });
          if (uploadError) throw uploadError;
          const { data: { publicUrl } } = supabase.storage
            .from("avatars")
            .getPublicUrl(filePath);
          finalAvatarUrl = publicUrl;
        }

        let formattedPhone = data.phone.trim();
        if (formattedPhone && !formattedPhone.startsWith("+")) {
          formattedPhone = formattedPhone.replace(/\D/g, "");
          formattedPhone = `+91${formattedPhone}`;
        }

        await updateUser({
          role: currentRole,
          name: data.name,
          phone: formattedPhone,
          email: data.email || undefined,
          skill: skill.toLowerCase(),
          location: `${data.location}, ${data.pincode}`,
          latitude: lat,
          longitude: lng,
          avatar: finalAvatarUrl || undefined,
        });
        toast.success("Profile completed! Welcome to JobNow 🎉");
        nav({ to: isWorker ? "/worker" : "/contractor" });
      } else {
        if (signUpStep !== "password") {
          toast.error("Please complete the steps in order.");
          return;
        }

        // Check if there is an active session from real OTP verification
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session) {
          // User is authenticated via SMS OTP. Set their password.
          const { error: pwdErr } = await supabase.auth.updateUser({
            password: data.password || "",
          });
          if (pwdErr) throw pwdErr;
          
          toast.success("Account created successfully! Complete your profile next 🎉");
          nav({ to: "/register", search: { role, completeProfile: true }, replace: true });
        } else {
          // No active session means OTP was never properly verified.
          toast.error("OTP verification failed. Please restart the signup process.");
          return;
        }
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Registration failed. Try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <AuthSplit
      backTo={isCompleteMode ? "/welcome" : "/signup"}
      eyebrow={isCompleteMode ? `Completing ${currentRole} profile` : `Creating ${currentRole} account`}
      heading={
        isCompleteMode
          ? "Just a few more details."
          : isWorker
          ? "Start earning, on your terms."
          : "Build your hiring engine."
      }
      subheading={
        isCompleteMode
          ? "Please provide your phone number and location details to finish setting up your account."
          : isWorker
          ? "Join 50,000+ workers finding daily work nearby with secure same-day payouts."
          : "Join 12,000+ contractors hiring verified workers in minutes."
      }
    >
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">
            {isCompleteMode ? "Complete your profile" : "Create your account"}
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {isCompleteMode ? "Fill in your profile details to continue." : "It only takes a minute."}
          </p>
        </div>
        <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-semibold capitalize">
          {currentRole}
        </span>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-4" noValidate>
        {isCompleteMode ? (
          completeProfileStep === "password" ? (
            <div className="space-y-4">
              <div className="rounded-2xl border border-border bg-card p-6 shadow-soft space-y-4">
                <div>
                  <h3 className="font-extrabold text-lg text-foreground">Create account password</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Set a secure password for your JobNow account before completing your profile.
                  </p>
                </div>



                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs">Password <span className="text-destructive">*</span></Label>
                    <div className="relative mt-1.5">
                      <Input
                        id="complete-password"
                        className={`h-12 rounded-xl bg-card pr-11 ${pwdError ? "border-destructive" : ""}`}
                        type={showPwd ? "text" : "password"}
                        placeholder="••••••••"
                        disabled={isSubmitting}
                        value={completeProfilePwd}
                        onChange={(e) => {
                          setCompleteProfilePwd(e.target.value);
                          setPwdError("");
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPwd((s) => !s)}
                        disabled={isSubmitting}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {pwdError && <p className="mt-1 text-xs text-destructive">{pwdError}</p>}
                  </div>
                  <div>
                    <Label className="text-xs">Confirm password <span className="text-destructive">*</span></Label>
                    <Input
                      id="complete-confirm-password"
                      className={`mt-1.5 h-12 rounded-xl bg-card ${confirmPwdError ? "border-destructive" : ""}`}
                      placeholder="••••••••"
                      type="password"
                      disabled={isSubmitting}
                      value={completeProfileConfirmPwd}
                      onChange={(e) => {
                        setCompleteProfileConfirmPwd(e.target.value);
                        setConfirmPwdError("");
                      }}
                    />
                    {confirmPwdError && <p className="mt-1 text-xs text-destructive">{confirmPwdError}</p>}
                  </div>
                </div>

                <Button
                  type="button"
                  onClick={handleSetGooglePassword}
                  disabled={isSubmitting}
                  className="w-full h-12 rounded-full bg-gradient-primary text-primary-foreground font-semibold shadow-glow mt-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving Password…
                    </>
                  ) : (
                    "Set Password & Continue"
                  )}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancel}
                  className="w-full h-12 rounded-full border border-border bg-card text-muted-foreground font-semibold hover:bg-muted/60 mt-1 transition-colors"
                >
                  Cancel & Sign Out
                </Button>
              </div>
            </div>
          ) : (
            <>
            {/* Profile Photo Section */}
            <div className="rounded-2xl border border-border bg-card p-4 shadow-soft space-y-4">
              <div className="flex items-center gap-4">
                <div className="relative group">
                  <div className="h-16 w-16 rounded-2xl bg-muted border border-border overflow-hidden relative flex items-center justify-center">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt="Selected Profile Photo" className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-muted-foreground font-bold text-xs uppercase">Photo</span>
                    )}
                  </div>
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
                    disabled={isUploadingPic || isSubmitting}
                  />
                </label>
              </div>
            </div>

            {/* Name + Phone */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-xs">Full name <span className="text-destructive">*</span></Label>
                <Input
                  id="reg-name"
                  className={`mt-1.5 h-12 rounded-xl bg-card ${errors.name ? "border-destructive" : ""}`}
                  placeholder="Your name"
                  {...register("name")}
                />
                {errors.name && <p className="mt-1 text-xs text-destructive">{errors.name.message}</p>}
              </div>
              <div>
                <Label className="text-xs">Phone <span className="text-destructive">*</span></Label>
                <Input
                  id="reg-phone"
                  className={`mt-1.5 h-12 rounded-xl bg-card ${errors.phone ? "border-destructive" : ""}`}
                  placeholder="98765 43210"
                  type="tel"
                  {...register("phone")}
                />
                {errors.phone && <p className="mt-1 text-xs text-destructive">{errors.phone.message}</p>}
              </div>
            </div>

            {/* Email */}
            <div>
              <Label className="text-xs">Email <span className="text-muted-foreground">(optional)</span></Label>
              <Input
                id="reg-email"
                className={`mt-1.5 h-12 rounded-xl bg-card ${errors.email ? "border-destructive" : ""}`}
                placeholder="you@example.com"
                type="email"
                {...register("email")}
              />
              {errors.email && <p className="mt-1 text-xs text-destructive">{errors.email.message}</p>}
            </div>

            {/* Location & Pincode with Map Search */}
            <div className="grid sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <Label className="text-xs">Location / Sector <span className="text-destructive">*</span></Label>
                <div className="relative mt-1.5 flex gap-2">
                  <Input
                    id="reg-location"
                    className={`h-12 rounded-xl bg-card flex-1 ${errors.location ? "border-destructive" : ""}`}
                    placeholder="e.g. Sector 22, Noida"
                    {...register("location")}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        searchAddress(e.currentTarget.value, getValues("pincode"));
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => searchAddress(getValues("location"), getValues("pincode"))}
                    className="h-12 rounded-xl border border-input px-4 font-bold text-xs"
                  >
                    Search
                  </Button>
                </div>
                {errors.location && <p className="mt-1 text-xs text-destructive">{errors.location.message}</p>}
              </div>

              <div>
                <Label className="text-xs">Pincode <span className="text-destructive">*</span></Label>
                <div className="relative mt-1.5 flex gap-2">
                  <Input
                    id="reg-pincode"
                    className={`h-12 rounded-xl bg-card flex-1 ${errors.pincode ? "border-destructive" : ""}`}
                    placeholder="201301"
                    type="text"
                    maxLength={6}
                    {...register("pincode", {
                      onChange: (e) => {
                        const val = e.target.value.replace(/\D/g, "").slice(0, 6);
                        e.target.value = val;
                        if (val.length === 6) {
                          searchAddress(getValues("location"), val);
                        }
                      }
                    })}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        searchAddress(getValues("location"), e.currentTarget.value);
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={detectGpsLocation}
                    disabled={isDetectingGps}
                    className="h-12 rounded-xl border border-input px-3"
                    title="Locate via GPS"
                  >
                    {isDetectingGps ? (
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    ) : (
                      <Navigation className="h-4 w-4 text-primary" />
                    )}
                  </Button>
                </div>
                {errors.pincode && <p className="mt-1 text-xs text-destructive">{errors.pincode.message}</p>}
              </div>
            </div>

            {/* Map Picker Visual */}
            <div className="mt-2 space-y-1">
              <MapPicker
                lat={lat}
                lng={lng}
                onChange={(newLat, newLng) => {
                  setLat(newLat);
                  setLng(newLng);
                  reverseGeocode(newLat, newLng);
                }}
                className="h-48 w-full rounded-2xl border border-border shadow-soft overflow-hidden"
              />
              <p className="text-[10px] text-muted-foreground text-center">
                Click map or drag marker pin to match exact coordinates.
              </p>
            </div>

            {/* Skill / Project type */}
            <div>
              <Label className="text-xs">
                {isWorker ? "Primary skill" : "Project type"} <span className="text-destructive">*</span>
              </Label>
              <div className="mt-2 flex flex-wrap gap-2">
                {skillOptions.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => { setSkill(s); setSkillError(""); }}
                    className={cn(
                      "h-9 px-4 rounded-full text-sm font-medium border transition-colors",
                      skill === s
                        ? "bg-gradient-primary text-primary-foreground border-transparent shadow-soft"
                        : "border-border bg-card text-muted-foreground hover:border-primary/40",
                    )}
                  >
                    {s}
                  </button>
                ))}
              </div>
              {skillError && <p className="mt-1 text-xs text-destructive">{skillError}</p>}
            </div>

            {/* Experience */}
            <div>
              <Label className="text-xs">Experience level</Label>
              <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2">
                {EXPERIENCE.map((e) => (
                  <button
                    key={e}
                    type="button"
                    onClick={() => setExperience(e)}
                    className={cn(
                      "h-11 rounded-xl text-sm font-medium border transition-colors",
                      experience === e
                        ? "bg-primary/10 text-primary border-primary"
                        : "border-border bg-card text-muted-foreground hover:border-primary/40",
                    )}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>

            <Button
              id="register-submit"
              type="submit"
              disabled={isSubmitting}
              className="w-full h-12 rounded-full bg-gradient-primary text-primary-foreground font-semibold shadow-glow mt-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />{" "}
                  Completing Profile…
                </>
              ) : (
                "Complete Profile & Register"
              )}
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              className="w-full h-12 rounded-full border border-border bg-card text-muted-foreground font-semibold hover:bg-muted/60 mt-2 transition-colors"
            >
              Cancel & Sign Out
            </Button>
          </>
          )
        ) : (
          <>
            {signUpStep === "phone" && (
              <div className="space-y-4">
                {/* Tab switcher */}
                <div className="grid grid-cols-2 p-1 bg-muted rounded-full">
                  {(["phone", "email"] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => { setTab(t); }}
                      className={`relative h-10 rounded-full text-xs md:text-sm font-medium capitalize transition-colors ${tab === t ? "text-primary-foreground" : "text-muted-foreground"}`}
                    >
                      {tab === t && (
                        <motion.span layoutId="register-tab" className="absolute inset-0 rounded-full bg-gradient-primary" transition={{ type: "spring", stiffness: 400, damping: 30 }} />
                      )}
                      <span className="relative inline-flex items-center gap-1.5">
                        {t === "phone" && <Phone className="h-3.5 w-3.5" />}
                        {t === "email" && <Mail className="h-3.5 w-3.5" />}
                        {t}
                      </span>
                    </button>
                  ))}
                </div>

                {tab === "phone" ? (
                  <div>
                    <Label className="text-xs">Phone number <span className="text-destructive">*</span></Label>
                    <div className="mt-1.5 flex gap-2">
                      <div className="h-12 px-3 rounded-xl border border-input bg-card grid place-items-center text-sm font-medium">+91</div>
                      <div className="flex-1">
                        <Input
                          id="reg-phone"
                          className={`h-12 rounded-xl bg-card ${errors.phone ? "border-destructive" : ""}`}
                          placeholder="98765 43210"
                          type="tel"
                          disabled={isSubmitting}
                          {...register("phone")}
                        />
                        {errors.phone && <p className="mt-1 text-xs text-destructive">{errors.phone.message}</p>}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div>
                    <Label className="text-xs">Email address (Gmail) <span className="text-destructive">*</span></Label>
                    <Input
                      id="reg-email"
                      className={`mt-1.5 h-12 rounded-xl bg-card ${errors.email ? "border-destructive" : ""}`}
                      placeholder="yourname@gmail.com"
                      type="email"
                      disabled={isSubmitting}
                      {...register("email")}
                    />
                    {errors.email && <p className="mt-1 text-xs text-destructive">{errors.email.message}</p>}
                  </div>
                )}

                <Button
                  type="button"
                  onClick={handleSendOtp}
                  disabled={isSubmitting || cooldown > 0}
                  className="w-full h-12 rounded-full bg-gradient-primary text-primary-foreground font-semibold shadow-glow mt-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Sending OTP…
                    </>
                  ) : cooldown > 0 ? (
                    `Wait ${cooldown}s`
                  ) : (
                    "Send Verification OTP"
                  )}
                </Button>
              </div>
            )}

            {signUpStep === "otp" && (
              <div className="space-y-4">
                <div>
                  <Label className="text-xs">{tab === "phone" ? "Phone number" : "Email address"}</Label>
                  <Input
                    className="mt-1.5 h-12 rounded-xl bg-muted text-muted-foreground border-border"
                    type={tab === "phone" ? "tel" : "email"}
                    readOnly
                    value={tab === "phone" ? getValues("phone") : getValues("email")}
                  />
                  {/* Keep original phone input in the DOM so react-hook-form keeps it registered */}
                  <input type="hidden" {...register("phone")} />
                  <input type="hidden" {...register("email")} />
                </div>

                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-2xl border border-primary/20 bg-primary/5 p-4 space-y-3"
                >
                  <div>
                    <Label className="text-xs text-primary font-bold">
                      Enter 6-Digit OTP <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="reg-otp"
                      className="mt-1.5 h-12 rounded-xl bg-card border-primary/30 text-center tracking-[0.5em] text-lg font-bold"
                      placeholder="123456"
                      maxLength={6}
                      type="text"
                      disabled={isSubmitting}
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    />
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      If you do not receive {tab === "phone" ? "an SMS" : "an email"}, enter the mock code <span className="font-extrabold text-primary">123456</span> to proceed.
                    </p>
                  </div>
                </motion.div>

                <Button
                  type="button"
                  onClick={handleVerifyOtp}
                  disabled={isSubmitting}
                  className="w-full h-12 rounded-full bg-gradient-primary text-primary-foreground font-semibold shadow-glow mt-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Verifying OTP…
                    </>
                  ) : (
                    "Verify OTP"
                  )}
                </Button>

                <button
                  type="button"
                  onClick={() => setSignUpStep("phone")}
                  className="w-full text-center text-xs text-primary font-semibold hover:underline"
                >
                  Change {tab === "phone" ? "Phone Number" : "Email Address"}
                </button>
              </div>
            )}

            {signUpStep === "password" && (
              <div className="space-y-4">
                {/* Keep original phone input in the DOM so react-hook-form keeps it registered */}
                <input type="hidden" {...register("phone")} />
                <input type="hidden" {...register("email")} />

                <div className="rounded-2xl border border-border bg-card p-6 shadow-soft space-y-4">
                  <div>
                    <h3 className="font-extrabold text-lg text-foreground">Create account password</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      Set a secure password for your JobNow account before completing your profile.
                    </p>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs">Password <span className="text-destructive">*</span></Label>
                      <div className="relative mt-1.5">
                        <Input
                          id="reg-password"
                          className={`h-12 rounded-xl bg-card pr-11 ${errors.password ? "border-destructive" : ""}`}
                          type={showPwd ? "text" : "password"}
                          placeholder="••••••••"
                          disabled={isSubmitting}
                          {...register("password")}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPwd((s) => !s)}
                          disabled={isSubmitting}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                      {errors.password && <p className="mt-1 text-xs text-destructive">{errors.password.message}</p>}
                    </div>
                    <div>
                      <Label className="text-xs">Confirm password <span className="text-destructive">*</span></Label>
                      <Input
                        id="reg-confirm-password"
                        className={`mt-1.5 h-12 rounded-xl bg-card ${errors.confirmPassword ? "border-destructive" : ""}`}
                        placeholder="••••••••"
                        type="password"
                        disabled={isSubmitting}
                        {...register("confirmPassword")}
                      />
                      {errors.confirmPassword && <p className="mt-1 text-xs text-destructive">{errors.confirmPassword.message}</p>}
                    </div>
                  </div>

                  <Button
                    id="register-submit"
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full h-12 rounded-full bg-gradient-primary text-primary-foreground font-semibold shadow-glow mt-2"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Creating Account…
                      </>
                    ) : (
                      "Create Account & Continue"
                    )}
                  </Button>

                  <button
                    type="button"
                    onClick={() => setSignUpStep("otp")}
                    className="w-full text-center text-xs text-muted-foreground font-semibold hover:underline transition-colors py-2"
                  >
                    Back to OTP verification
                  </button>
                </div>
              </div>
            )}

            <p className="text-center text-xs text-muted-foreground mt-4">
              By signing up, you agree to our <a href="#" className="text-primary font-medium">Terms</a> &{" "}
              <a href="#" className="text-primary font-medium">Privacy Policy</a>.
            </p>

            <p className="text-center text-sm text-muted-foreground pt-4 border-t border-border mt-4">
              Already have an account?{" "}
              <Link to="/login" search={{ role }} className="text-primary font-semibold">Log in</Link>
            </p>
          </>
        )}
      </form>
    </AuthSplit>
  );
}
