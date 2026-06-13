import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Filter, MapPin, Search, Loader2 } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { SKILLS } from "@/lib/skills-config";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/contractor/workers")({
  head: () => ({ meta: [{ title: "Find workers — JobNow" }] }),
  component: WorkersPage,
});

interface WorkerProfile {
  id: string;
  name: string;
  avatar: string;
  skill: string;
  jobs_done: number;
  rating: number;
  location: string;
}

function WorkersPage() {
  const [skill, setSkill] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [workers, setWorkers] = useState<WorkerProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchWorkers() {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("role", "worker");
        
        if (error) throw error;
        
        const mapped: WorkerProfile[] = (data || []).map((w: any) => ({
          id: w.id,
          name: w.name,
          avatar: w.avatar || w.name.split(" ").map((n: string) => n[0]).slice(0, 2).join("").toUpperCase(),
          skill: w.skill || "",
          jobs_done: w.jobs_done ?? 0,
          rating: w.rating ? parseFloat(w.rating.toString()) : 5.0,
          location: w.location || "Noida",
        }));
        setWorkers(mapped);
      } catch (err) {
        console.error("Error fetching workers:", err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchWorkers();
  }, []);

  const filtered = workers.filter((w) =>
    (!skill || w.skill === skill) && w.name.toLowerCase().includes(q.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto px-5 pt-7">
      <h1 className="text-2xl font-extrabold">Find workers</h1>
      <p className="text-sm text-muted-foreground">Browse skilled workers near you.</p>

      <div className="mt-5 bg-card border border-border rounded-2xl p-2.5 flex items-center gap-2 shadow-soft">
        <Search className="h-4 w-4 text-muted-foreground ml-1" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name" className="border-0 shadow-none px-0 h-9 focus-visible:ring-0" />
        <button className="h-8 px-3 rounded-full bg-muted text-xs font-medium inline-flex items-center gap-1"><Filter className="h-3.5 w-3.5" />Filters</button>
      </div>

      <div className="mt-4 flex gap-2 overflow-x-auto no-scrollbar -mx-5 px-5">
        <Chip active={!skill} onClick={() => setSkill(null)}>All</Chip>
        {SKILLS.map((s) => (
          <Chip key={s.id} active={skill === s.id} onClick={() => setSkill(s.id)}>{s.name}</Chip>
        ))}
      </div>

      {isLoading ? (
        <div className="mt-12 flex flex-col items-center justify-center gap-2 py-10">
          <Loader2 className="h-6 w-6 text-primary animate-spin" />
          <p className="text-xs text-muted-foreground">Loading workers list...</p>
        </div>
      ) : (
        <div className="mt-5 space-y-3 pb-20">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No workers found matching criteria.
            </div>
          ) : (
            filtered.map((w) => {
              const sk = SKILLS.find((s) => s.id === w.skill);
              return (
                <div key={w.id} className="rounded-2xl bg-card border border-border p-4 shadow-soft">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12">
                      <AvatarFallback className="bg-gradient-primary text-primary-foreground font-semibold">
                        {w.avatar}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="font-semibold text-sm truncate">{w.name}</p>
                        <span className="h-2 w-2 rounded-full bg-success" />
                      </div>
                      <p className="text-xs text-muted-foreground">{sk?.name || w.skill || "Helper"} · {w.jobs_done} jobs</p>
                    </div>
                    <Badge variant="secondary" className="rounded-full">★ {w.rating}</Badge>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <p className="text-xs text-muted-foreground inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{w.location || "Noida"}</p>
                    <div className="flex gap-2">
                      <Link to="/contractor/messages" search={{ userId: w.id }} className="flex items-center justify-center h-9 px-3 rounded-full bg-muted text-xs font-medium">Message</Link>
                      <Link to="/contractor/worker-details" search={{ id: w.id }} className="flex items-center justify-center h-9 px-4 rounded-full bg-gradient-primary text-primary-foreground text-xs font-semibold shadow-soft">Hire</Link>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className={cn(
      "shrink-0 px-3.5 py-2 rounded-full text-xs font-medium border transition-all",
      active ? "bg-gradient-primary text-primary-foreground border-transparent shadow-soft" : "bg-card border-border"
    )}>{children}</button>
  );
}
