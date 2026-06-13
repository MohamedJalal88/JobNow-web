import {
  Paintbrush, Zap, Wrench, Hammer, Truck, Flame, Sparkles, HardHat, Box,
  type LucideIcon,
} from "lucide-react";

export type Skill = {
  id: string;
  name: string;
  icon: LucideIcon;
  color: string;
};

export const SKILLS: Skill[] = [
  { id: "painter", name: "Painter", icon: Paintbrush, color: "from-blue-600 to-sky-700" },
  { id: "electrician", name: "Electrician", icon: Zap, color: "from-blue-700 to-indigo-900" },
  { id: "plumber", name: "Plumber", icon: Wrench, color: "from-sky-500 to-blue-700" },
  { id: "carpenter", name: "Carpenter", icon: Hammer, color: "from-slate-600 to-slate-800" },
  { id: "mason", name: "Mason", icon: Box, color: "from-slate-700 to-slate-900" },
  { id: "driver", name: "Driver", icon: Truck, color: "from-blue-800 to-slate-900" },
  { id: "welder", name: "Welder", icon: Flame, color: "from-blue-700 to-cyan-900" },
  { id: "cleaner", name: "Cleaner", icon: Sparkles, color: "from-cyan-600 to-blue-800" },
  { id: "construction", name: "Construction", icon: HardHat, color: "from-slate-500 to-blue-900" },
];

export const FAQS = [
  { q: "How do I find jobs near me?", a: "Open the Nearby Jobs page and we'll show you available work sorted by distance, pay, and skill match." },
  { q: "When do I get paid?", a: "Payments are released within 24 hours after the contractor marks the job complete." },
  { q: "How does ratings work?", a: "After every job, both worker and contractor rate each other from 1 to 5 stars to keep the marketplace healthy." },
  { q: "Can I cancel an accepted job?", a: "Yes, but you should do it at least 4 hours before the start time to avoid affecting your reliability score." },
  { q: "How do I update my skills?", a: "Go to Profile → Edit profile and add or remove skills from your worker profile." },
];

export type Job = {
  id: string;
  title: string;
  contractor: string;
  contractorAvatar: string;
  skill: string;
  distanceKm: number;
  payPerDay: number;
  durationDays: number;
  workersNeeded: number;
  location: string;
  postedMinsAgo: number;
  description: string;
  startDate: string;
  status?: "open" | "active" | "completed";
  escrowStatus?: "locked" | "released" | "pending";
  attendanceStatus?: "pending_clockin" | "clocked_in" | "clocked_out" | "no_show";
  geofenceRadiusMeters?: number;
  qrCodeData?: string;
  complianceStatus?: "compliant" | "pending_pf_esic";
  standbyWorkersCount?: number;
};

export type Worker = {
  id: string;
  name: string;
  avatar: string;
  skill: string;
  rating: number;
  jobsDone: number;
  distanceKm: number;
  available: boolean;
  aadhaarVerified?: boolean;
  skillLevel?: "Level 1 Helper" | "Level 2 Semi-Skilled" | "Level 3 Expert";
  phone?: string;
  clockedIn?: boolean;
  clockInTime?: string;
};
