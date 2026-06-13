import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { motion } from "framer-motion";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, LifeBuoy, Mail, MessageSquare, Phone, Search } from "lucide-react";
import { FAQS } from "@/lib/skills-config";
import { toast } from "sonner";

export const Route = createFileRoute("/contractor/help")({
  head: () => ({ meta: [{ title: "Help & support — JobNow" }] }),
  component: Help,
});

function Help() {
  const [q, setQ] = useState("");
  const filtered = FAQS.filter((f) => f.q.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 pt-6 md:pt-8">
      <Link to="/contractor" className="inline-flex items-center gap-1 text-sm text-muted-foreground mb-4"><ArrowLeft className="h-4 w-4" /> Back to dashboard</Link>
      <section className="relative overflow-hidden rounded-3xl bg-gradient-hero text-primary-foreground p-8 md:p-12 shadow-elegant text-center">
        <div className="absolute inset-0 bg-gradient-mesh opacity-40" />
        <div className="relative">
          <div className="mx-auto h-14 w-14 rounded-2xl bg-white/15 grid place-items-center backdrop-blur border border-white/20">
            <LifeBuoy className="h-6 w-6" />
          </div>
          <h1 className="mt-4 text-3xl md:text-4xl font-extrabold">How can we help?</h1>
          <p className="mt-2 opacity-90">Get answers to common contractor questions or contact support.</p>
          <div className="mt-6 max-w-xl mx-auto relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-foreground/60" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search help articles…"
              className="h-12 pl-11 rounded-full bg-white text-foreground border-0" />
          </div>
        </div>
      </section>

      <section className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card icon={<MessageSquare className="h-5 w-5" />} title="Live chat" desc="Avg response < 2 min" cta="Start chat" tone="from-blue-700 to-slate-800" />
        <Card icon={<Mail className="h-5 w-5" />} title="Email support" desc="business@jobnow.in" cta="Send email" tone="from-emerald-500 to-teal-600" />
        <Card icon={<Phone className="h-5 w-5" />} title="Phone support" desc="1800-202-808" cta="Call now" tone="from-blue-600 to-sky-700" />
      </section>

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <section className="lg:col-span-2 rounded-3xl bg-card border border-border p-6 shadow-soft">
          <h2 className="font-bold text-lg">Frequently asked</h2>
          <Accordion type="single" collapsible className="mt-4">
            {filtered.map((f, i) => (
              <AccordionItem key={i} value={`f${i}`}>
                <AccordionTrigger className="text-left text-sm font-semibold">{f.q}</AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">{f.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </section>

        <aside className="rounded-3xl bg-card border border-border p-6 shadow-soft">
          <h3 className="font-bold">Open a ticket</h3>
          <form onSubmit={(e) => { e.preventDefault(); toast.success("Ticket submitted"); }} className="mt-3 space-y-3">
            <Input placeholder="Subject" className="h-11 rounded-xl bg-muted/40 border-transparent" />
            <Textarea placeholder="Describe your issue" className="rounded-xl min-h-28 bg-muted/40 border-transparent" />
            <Button type="submit" className="w-full rounded-full bg-gradient-primary text-primary-foreground font-semibold">Submit ticket</Button>
          </form>
        </aside>
      </div>
    </div>
  );
}

function Card({ icon, title, desc, cta, tone }: { icon: React.ReactNode; title: string; desc: string; cta: string; tone: string }) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className={`rounded-3xl p-6 text-white bg-gradient-to-br ${tone} shadow-soft relative overflow-hidden`}>
      <div className="absolute -top-6 -right-6 h-24 w-24 rounded-full bg-white/15 blur-xl" />
      <div className="h-10 w-10 rounded-xl bg-white/20 grid place-items-center">{icon}</div>
      <p className="mt-3 font-bold text-lg">{title}</p>
      <p className="text-sm opacity-90">{desc}</p>
      <button className="mt-4 h-9 px-4 rounded-full bg-white text-foreground text-xs font-semibold">{cta}</button>
    </motion.div>
  );
}
