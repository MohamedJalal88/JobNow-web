import { Link, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Clock, MapPin, IndianRupee, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SKILLS, type Job } from "@/lib/skills-config";
import { useLanguage } from "@/lib/language";

export function JobCard({ job, index = 0 }: { job: Job; index?: number }) {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const skill = SKILLS.find((s) => s.id === job.skill);
  const Icon = skill?.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.4 }}
    >
      <div
        onClick={() => navigate({ to: "/worker/jobs/$jobId", params: { jobId: job.id } })}
        className="block rounded-3xl bg-card border border-border p-4 shadow-soft hover:shadow-elegant transition-all hover:-translate-y-0.5 cursor-pointer"
      >
        <div className="flex items-start gap-3">
          <div
            className={`h-12 w-12 shrink-0 rounded-2xl bg-gradient-to-br ${skill?.color ?? "from-primary to-primary"} grid place-items-center text-white shadow-soft`}
          >
            {Icon && <Icon className="h-5 w-5" />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="font-semibold text-sm leading-tight truncate">{job.title}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">{job.contractor}</p>
              </div>
              <Badge variant="secondary" className="shrink-0 rounded-full text-[10px]">
                {job.distanceKm} {t("km")}
              </Badge>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                {job.location}
              </span>
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {job.postedMinsAgo} {t("m ago")}
              </span>
            </div>

            <div className="mt-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center font-bold text-foreground">
                  <IndianRupee className="h-3.5 w-3.5" />
                  {job.payPerDay}
                  <span className="text-xs text-muted-foreground font-normal ml-0.5">{t("/day")}</span>
                </span>
                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <Users className="h-3.5 w-3.5" />
                  {job.workersNeeded}
                </span>
              </div>
              <Button 
                size="sm" 
                className="rounded-full h-8 bg-gradient-primary text-primary-foreground hover:opacity-95"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  navigate({ to: "/worker/jobs/$jobId/apply", params: { jobId: job.id } });
                }}
              >
                {t("Apply")}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
