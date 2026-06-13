import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ArrowLeft, Bell, Briefcase, CheckCircle2, IndianRupee, MessageSquare, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

export const Route = createFileRoute("/contractor/notifications")({
  head: () => ({ meta: [{ title: "Notifications — JobNow" }] }),
  component: Notifications,
});

const ICONS: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  job: { icon: Briefcase, color: "text-blue-500", bg: "bg-blue-500/10" },
  accept: { icon: CheckCircle2, color: "text-emerald-500", bg: "bg-emerald-500/10" },
  payment: { icon: IndianRupee, color: "text-blue-600", bg: "bg-blue-600/10" },
  chat: { icon: MessageSquare, color: "text-sky-600", bg: "bg-sky-600/10" },
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
        if (error.code === "P0001" || error.message.includes("does not exist")) {
          setDbError(true);
        }
        throw error;
      }
      setNotifications(data || []);
      setDbError(false);
    } catch (err) {
      console.error("Error fetching contractor notifications:", err);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (!user) return;
    loadNotifications();

    const channel = supabase
      .channel(`contractor-notifications-${user.id}`)
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

      setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
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
    <div className="max-w-4xl mx-auto px-4 md:px-6 lg:px-8 pt-6 md:pt-8 pb-12">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Notifications</h1>
          <p className="text-sm text-muted-foreground mt-1">Stay updated on your jobs and workers.</p>
        </div>
        {notifications.some((n) => n.unread) && (
          <Button variant="outline" size="sm" className="rounded-full" onClick={handleMarkAllRead}>
            Mark all as read
          </Button>
        )}
      </div>

      {dbError && (
        <div className="mb-5 p-4 rounded-2xl bg-warning/10 border border-warning/20 text-xs text-warning-foreground leading-relaxed">
          <p className="font-bold mb-1">Database Table Missing</p>
          To enable live notifications, make sure to execute the SQL query to create the <code className="bg-black/10 px-1 py-0.5 rounded">public.notifications</code> table in your Supabase SQL Editor.
        </div>
      )}

      <div className="space-y-3">
        {notifications.length === 0 ? (
          <div className="rounded-3xl bg-card border border-border p-10 text-center text-muted-foreground">
            No notifications yet.
          </div>
        ) : (
          notifications.map((n, i) => {
            const meta = ICONS[n.type] ?? { icon: Bell, color: "text-muted-foreground", bg: "bg-muted/15" };
            const Icon = meta.icon;
            return (
              <motion.div
                key={n.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className={`group flex gap-4 p-4 md:p-5 rounded-2xl bg-card border border-border hover:border-primary/30 transition-all shadow-sm ${
                  n.unread ? "ring-1 ring-primary/20" : ""
                }`}
              >
                <div className={`h-12 w-12 rounded-full flex-shrink-0 grid place-items-center ${meta.bg} ${meta.color}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-1">
                    <p className="font-semibold text-sm">{n.title}</p>
                    <div className="flex items-center gap-2">
                      <p className="text-xs text-muted-foreground whitespace-nowrap">{formatTimeAgo(n.created_at)}</p>
                      {n.unread && <span className="h-2 w-2 rounded-full bg-primary" />}
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">{n.body}</p>
                  
                  {n.type === "job" && (
                    <div className="mt-3 flex gap-2">
                      <Button size="sm" className="h-8 rounded-full bg-gradient-primary text-primary-foreground text-xs" asChild>
                        <Link to="/contractor/applications">Review applications</Link>
                      </Button>
                    </div>
                  )}
                  {n.type === "chat" && (
                    <div className="mt-3 flex gap-2">
                      <Button size="sm" className="h-8 rounded-full bg-gradient-primary text-primary-foreground text-xs" asChild>
                        <Link to="/contractor/messages">Open Chat</Link>
                      </Button>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}
