import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Cookie, Database, Download, ShieldAlert, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/contractor/privacy")({
  head: () => ({ meta: [{ title: "Privacy & data — JobNow Contractor" }] }),
  component: Privacy,
});

function Privacy() {
  const [prefs, setPrefs] = useState({ ads: false, analytics: true, location: true, share: false });

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-6 lg:px-8 pt-6 md:pt-8">
      <Link to="/contractor/settings" className="inline-flex items-center gap-1 text-sm text-muted-foreground"><ArrowLeft className="h-4 w-4" /> Back to settings</Link>

      <h1 className="mt-5 text-2xl md:text-3xl font-extrabold tracking-tight">Privacy & Data</h1>
      <p className="text-sm text-muted-foreground mt-1">Control how your business data is used across JobNow.</p>

      <Section title="Data preferences" icon={Database}>
        <Toggle label="Personalised worker recommendations" desc="Use your activity to suggest better workers." value={prefs.analytics} onChange={(v) => setPrefs((p) => ({ ...p, analytics: v }))} />
        <Toggle label="Share location for nearby workers" desc="Required to show workers around your sites." value={prefs.location} onChange={(v) => setPrefs((p) => ({ ...p, location: v }))} />
        <Toggle label="Marketing communications" desc="Tips, offers and product updates." value={prefs.ads} onChange={(v) => setPrefs((p) => ({ ...p, ads: v }))} />
      </Section>

      <Section title="Cookie preferences" icon={Cookie}>
        <Toggle label="Essential cookies" desc="Required for the app to work." value disabled />
        <Toggle label="Analytics cookies" desc="Help us understand how the app is used." value={prefs.analytics} onChange={(v) => setPrefs((p) => ({ ...p, analytics: v }))} />
        <Toggle label="Marketing cookies" desc="Used to personalise ads." value={prefs.ads} onChange={(v) => setPrefs((p) => ({ ...p, ads: v }))} />
      </Section>

      <Section title="Your data" icon={Download}>
        <Action title="Download business data" desc="Get a copy of everything we have about your account." cta="Request" onClick={() => toast.success("We'll email your archive within 48h")} />
        <Action title="Privacy policy" desc="Read how we collect and process your data." cta="Open" />
        <Action title="Terms & conditions" desc="The legal stuff for using JobNow." cta="Open" />
      </Section>

      <Section title="Danger zone" icon={ShieldAlert} tone="destructive">
        <Action danger title="Delete account" desc="Permanently remove your contractor account and all associated data." cta="Delete" onClick={() => toast.error("Account deletion requested")} />
      </Section>
    </div>
  );
}

function Section({ title, icon: Icon, tone, children }: { title: string; icon: React.ElementType; tone?: "destructive"; children: React.ReactNode }) {
  return (
    <div className="mt-6 rounded-3xl bg-card border border-border shadow-soft overflow-hidden">
      <div className="p-5 border-b border-border flex items-center gap-3">
        <div className={`h-10 w-10 rounded-xl grid place-items-center ${tone === "destructive" ? "bg-destructive/15 text-destructive" : "bg-primary/10 text-primary"}`}>
          <Icon className="h-4.5 w-4.5" />
        </div>
        <h2 className="font-bold">{title}</h2>
      </div>
      <div className="divide-y divide-border">{children}</div>
    </div>
  );
}

function Toggle({ label, desc, value, onChange, disabled }: { label: string; desc: string; value: boolean; onChange?: (v: boolean) => void; disabled?: boolean }) {
  return (
    <div className="p-5 flex items-start justify-between gap-4">
      <div>
        <p className="text-sm font-semibold">{label}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
      </div>
      <Switch checked={value} onCheckedChange={onChange} disabled={disabled} />
    </div>
  );
}

function Action({ title, desc, cta, onClick, danger }: { title: string; desc: string; cta: string; onClick?: () => void; danger?: boolean }) {
  return (
    <div className="p-5 flex items-start justify-between gap-4">
      <div>
        <p className="text-sm font-semibold">{title}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
      </div>
      <Button variant={danger ? "destructive" : "outline"} className="rounded-full" onClick={onClick}>
        {danger && <Trash2 className="h-4 w-4 mr-1.5" />}{cta}
      </Button>
    </div>
  );
}
