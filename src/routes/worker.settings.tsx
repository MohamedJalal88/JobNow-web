import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft, Bell, ChevronRight, Globe, HelpCircle, KeyRound, Languages,
  Lock, Mail, Moon, Trash2, User, Wallet,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useEffect, useState } from "react";
import { useLanguage } from "@/lib/language";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/worker/settings")({
  head: () => ({ meta: [{ title: "Settings — JobNow Worker" }] }),
  component: WorkerSettings,
});

function WorkerSettings() {
  const { user } = useAuth();
  const [dark, setDark] = useState(false);
  const [notif, setNotif] = useState(true);
  const [emailN, setEmailN] = useState(false);
  const { t, language, setLanguage } = useLanguage();

  useEffect(() => {
    if (typeof document !== "undefined") setDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggleDark(v: boolean) {
    setDark(v);
    if (typeof document !== "undefined") document.documentElement.classList.toggle("dark", v);
  }

  return (
    <main className="min-h-dvh bg-muted/30">
      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 pt-6 md:pt-8 pb-12">
        <Link to="/worker" className="inline-flex items-center gap-1 text-sm text-muted-foreground"><ArrowLeft className="h-4 w-4" /> Back to dashboard</Link>
        <h1 className="mt-4 text-2xl md:text-3xl font-extrabold tracking-tight">{t("Worker Settings")}</h1>
        <p className="text-sm text-muted-foreground mt-1">{t("Manage your account, preferences and security.")}</p>

        <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-5">
          <Section title={t("Language Settings")}>
            <div className="p-5 space-y-4">
              <p className="text-xs text-muted-foreground">{t("Select your preferred site language")}:</p>
              <div className="grid grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setLanguage("en")}
                  className={`p-3 rounded-2xl border font-bold text-sm flex flex-col items-center gap-1 transition-all ${language === "en" ? "bg-primary text-primary-foreground border-primary shadow-md" : "bg-card border-border hover:bg-muted"}`}
                >
                  <Globe className="h-5 w-5" />
                  <span>English</span>
                </button>
                <button
                  type="button"
                  onClick={() => setLanguage("hi")}
                  className={`p-3 rounded-2xl border font-bold text-sm flex flex-col items-center gap-1 transition-all ${language === "hi" ? "bg-primary text-primary-foreground border-primary shadow-md" : "bg-card border-border hover:bg-muted"}`}
                >
                  <Globe className="h-5 w-5" />
                  <span>हिंदी (Hindi)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setLanguage("ta")}
                  className={`p-3 rounded-2xl border font-bold text-sm flex flex-col items-center gap-1 transition-all ${language === "ta" ? "bg-primary text-primary-foreground border-primary shadow-md" : "bg-card border-border hover:bg-muted"}`}
                >
                  <Globe className="h-5 w-5" />
                  <span>தமிழ் (Tamil)</span>
                </button>
              </div>
            </div>
            <Row icon={Languages} label={t("Region")} right={<span className="text-xs text-muted-foreground">India</span>} />
          </Section>

          <Section title={t("Profile")}>
            <Row icon={User} label={t("Edit profile")} desc="Name, skills, photo, contact info" to="/worker/profile" chevron />
          </Section>

          <Section title={t("Account")}>
            <Row icon={Mail} label={t("Email address")} right={<span className="text-xs text-muted-foreground">{user?.email || "No email"}</span>} />
            <Row icon={KeyRound} label={t("Change password")} to="/worker/change-password" chevron />
            <Row icon={Wallet} label={t("UPI & Bank Details")} desc={t("Manage daily payout bank details")} onClick={() => toast.info(t("UPI and Bank settings coming soon!"))} chevron />
          </Section>

          <Section title={t("Appearance")}>
            <Row icon={Moon} label={t("Dark mode")} desc={t("Toggle a darker UI theme")} right={<Switch checked={dark} onCheckedChange={toggleDark} />} />
          </Section>

          <Section title={t("Notifications")}>
            <Row icon={Bell} label={t("Push notifications")} desc={t("Receive instant job alerts and chat updates")} right={<Switch checked={notif} onCheckedChange={setNotif} />} />
            <Row icon={Mail} label={t("Email notifications")} desc={t("Get weekly payouts summary, invoices and updates")} right={<Switch checked={emailN} onCheckedChange={setEmailN} />} />
          </Section>

          <Section title={t("Security & privacy")}>
            <Row icon={Lock} label={t("Privacy & data")} to="/worker/privacy" chevron />
            <Row icon={HelpCircle} label={t("Help & support")} to="/worker/help" chevron />
            <Row icon={Trash2} label={t("Delete Account")} desc={t("Permanently delete profile and history")} danger onClick={() => toast.error(t("Please contact support to delete your account."))} chevron />
          </Section>
        </div>

        <p className="mt-8 text-center text-xs text-muted-foreground">JobNow Worker Portal v1.0.0</p>
      </div>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2 px-1">{title}</p>
      <div className="rounded-3xl bg-card border border-border overflow-hidden shadow-soft divide-y divide-border">
        {children}
      </div>
    </div>
  );
}

function Row({ icon: Icon, label, desc, right, chevron, to, onClick, danger }: {
  icon: React.ElementType; label: string; desc?: string; right?: React.ReactNode; chevron?: boolean; to?: string; onClick?: () => void; danger?: boolean;
}) {
  const inner = (
    <div
      onClick={onClick}
      className={cn(
        "px-4 py-3.5 flex items-center gap-3 hover:bg-muted/40 transition-colors",
        onClick && "cursor-pointer"
      )}
    >
      <div className={cn("h-10 w-10 rounded-xl bg-muted grid place-items-center shrink-0", danger && "bg-destructive/10 text-destructive")}>
        <Icon className="h-4.5 w-4.5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className={cn("text-sm font-semibold", danger && "text-destructive")}>{label}</p>
        {desc && <p className="text-xs text-muted-foreground">{desc}</p>}
      </div>
      {right}
      {chevron && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
    </div>
  );
  return to ? <Link to={to}>{inner}</Link> : inner;
}
