import { createFileRoute } from "@tanstack/react-router";
import { Bell, BriefcaseBusiness, Check, IndianRupee, MessageCircle, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

export const Route = createFileRoute("/worker/notifications")({
  head: () => ({ meta: [{ title: "Notifications — JobNow" }] }),
  component: Notifications,
});

const ICONS: Record<string, { icon: React.ElementType; tone: string }> = {
  job: { icon: BriefcaseBusiness, tone: "from-blue-700 to-slate-800" },
  accept: { icon: Check, tone: "from-emerald-500 to-teal-600" },
  payment: { icon: IndianRupee, tone: "from-blue-600 to-sky-700" },
  chat: { icon: MessageCircle, tone: "from-sky-500 to-blue-600" },
};

function formatTimeAgo(dateString: string): string {
  const now = new Date();
  const past = new Date(dateString);
  const diffMs = now.getTime() - past.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return "Yesterday";
  return `${diffDays}d ago`;
}

function Notifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dbError, setDbError] = useState(false);

  async function loadNotifications() {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        // Check if table does not exist error
        if (error.code === "P0001" || error.message.includes("does not exist")) {
          setDbError(true);
        }
        throw error;
      }
      setNotifications(data || []);
      setDbError(false);
    } catch (err) {
      console.error("Error fetching notifications:", err);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (!user) return;
    loadNotifications();

    const channel = supabase
      .channel(`worker-notifications-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
        },
        (payload) => {
          const newNotif = payload.new;
          if (newNotif && newNotif.user_id === user.id) {
            setNotifications((prev) => {
              if (prev.some((n) => n.id === newNotif.id)) return prev;
              return [newNotif, ...prev];
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  async function handleMarkAllRead() {
    if (!user || notifications.length === 0) return;
    try {
      const { error } = await supabase
        .from("notifications")
        .update({ unread: false })
        .eq("user_id", user.id)
        .eq("unread", true);

      if (error) throw error;
      
      setNotifications(prev => prev.map(n => ({ ...n, unread: false })));
      toast.success("All notifications marked as read");
    } catch (err) {
      console.error("Error marking read:", err);
      toast.error("Failed to update notifications");
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-5 pt-7">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold">Notifications</h1>
        {notifications.some(n => n.unread) && (
          <button onClick={handleMarkAllRead} className="text-xs font-medium text-primary hover:underline">
            Mark all read
          </button>
        )}
      </div>
      <p className="text-sm text-muted-foreground">Latest job alerts and updates.</p>

      {dbError && (
        <div className="mt-5 p-4 rounded-2xl bg-warning/10 border border-warning/20 text-xs text-warning-foreground leading-relaxed">
          <p className="font-bold mb-1">Database Table Missing</p>
          To enable live notifications, make sure to execute the SQL query to create the <code className="bg-black/10 px-1 py-0.5 rounded">public.notifications</code> table in your Supabase SQL Editor. See the deployment guide in <code className="bg-black/10 px-1 py-0.5 rounded">walkthrough.md</code> or <code className="bg-black/10 px-1 py-0.5 rounded">implementation_plan.md</code> for the SQL schema.
        </div>
      )}

      <div className="mt-5 space-y-2.5">
        {notifications.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground text-sm">
            No notifications yet.
          </div>
        ) : (
          notifications.map((n, i) => {
            const meta = ICONS[n.type] ?? { icon: Bell, tone: "from-muted to-muted" };
            const Icon = meta.icon;
            return (
              <motion.div
                key={n.id}
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                className="rounded-2xl bg-card border border-border p-3.5 flex items-start gap-3 shadow-soft"
              >
                <div className={`h-11 w-11 rounded-xl bg-gradient-to-br ${meta.tone} grid place-items-center text-white shrink-0`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold text-sm">{n.title}</p>
                    <p className="text-[11px] text-muted-foreground shrink-0">{formatTimeAgo(n.created_at)}</p>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{n.body}</p>
                </div>
                {n.unread && <span className="h-2 w-2 rounded-full bg-primary mt-1.5" />}
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}
