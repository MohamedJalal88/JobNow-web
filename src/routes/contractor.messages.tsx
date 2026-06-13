import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Paperclip, Phone, Search, Send, Smile, Video, Loader2, MessageSquare } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { z } from "zod";

const searchSchema = z.object({
  userId: z.string().optional(),
});

export const Route = createFileRoute("/contractor/messages")({
  head: () => ({ meta: [{ title: "Messages — JobNow" }] }),
  validateSearch: searchSchema,
  component: ContractorMessages,
});

interface DBMessage {
  id: string;
  sender_id: string;
  receiver_id: string;
  message_text: string;
  created_at: string;
}

interface Contact {
  id: string;
  name: string;
  avatar: string;
  lastMessage: string;
  lastMessageTime: string;
  lastMessageTimestamp: string;
  unread: number;
}

function formatMessageTime(createdAtString: string): string {
  const date = new Date(createdAtString);
  const now = new Date();
  
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } else {
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) {
      return "Yesterday";
    }
    return date.toLocaleDateString([], { month: "short", day: "numeric" });
  }
}

function ContractorMessages() {
  const { user } = useAuth();
  const { userId: urlUserId } = Route.useSearch();
  const [messages, setMessages] = useState<DBMessage[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [activeContactId, setActiveContactId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Auto scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, activeContactId]);

  // Load chats and profiles
  useEffect(() => {
    async function loadData() {
      if (!user) return;
      setIsLoading(true);

      try {
        // Fetch all messages involving the current user
        const { data: dbMsgs, error: msgsErr } = await supabase
          .from("messages")
          .select("*")
          .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
          .order("created_at", { ascending: true });

        if (msgsErr) throw msgsErr;

        const msgs: DBMessage[] = dbMsgs || [];
        setMessages(msgs);

        // Find unique contact IDs
        const uniqueContactIds = new Set<string>();
        msgs.forEach((m) => {
          if (m.sender_id !== user.id) uniqueContactIds.add(m.sender_id);
          if (m.receiver_id !== user.id) uniqueContactIds.add(m.receiver_id);
        });

        // Add URL userId if present and not the current user
        if (urlUserId && urlUserId !== user.id) {
          uniqueContactIds.add(urlUserId);
        }

        if (uniqueContactIds.size === 0) {
          setContacts([]);
          setIsLoading(false);
          return;
        }

        // Fetch profiles of all contact IDs
        const { data: profiles, error: profilesErr } = await supabase
          .from("profiles")
          .select("*")
          .in("id", Array.from(uniqueContactIds));

        if (profilesErr) throw profilesErr;

        const contactList: Contact[] = (profiles || []).map((p) => {
          const chatMsgs = msgs.filter(
            (m) =>
              (m.sender_id === user.id && m.receiver_id === p.id) ||
              (m.sender_id === p.id && m.receiver_id === user.id)
          );
          const lastMsg = chatMsgs.length > 0 ? chatMsgs[chatMsgs.length - 1] : null;

          return {
            id: p.id,
            name: p.name,
            avatar: p.avatar || p.name.split(" ").map((n: string) => n[0]).slice(0, 2).join("").toUpperCase(),
            lastMessage: lastMsg ? lastMsg.message_text : "No messages yet",
            lastMessageTime: lastMsg ? formatMessageTime(lastMsg.created_at) : "",
            lastMessageTimestamp: lastMsg ? lastMsg.created_at : new Date(0).toISOString(),
            unread: 0,
          };
        });

        // Sort contacts: URL userId first, then by last message timestamp descending
        contactList.sort((a, b) => {
          if (urlUserId) {
            if (a.id === urlUserId) return -1;
            if (b.id === urlUserId) return 1;
          }
          return new Date(b.lastMessageTimestamp).getTime() - new Date(a.lastMessageTimestamp).getTime();
        });

        setContacts(contactList);

        // Determine active chat
        if (urlUserId && contactList.some((c) => c.id === urlUserId)) {
          setActiveContactId(urlUserId);
        } else if (contactList.length > 0) {
          setActiveContactId(contactList[0].id);
        }
      } catch (err) {
        console.error("Exception loading messaging data:", err);
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, [user, urlUserId]);

  // Real-time subscription
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("contractor-messages")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
        },
        async (payload) => {
          const newMsg = payload.new as DBMessage;
          
          if (newMsg.sender_id === user.id || newMsg.receiver_id === user.id) {
            // Append message if not duplicate
            setMessages((prev) => {
              if (prev.some((m) => m.id === newMsg.id)) return prev;
              return [...prev, newMsg];
            });

            const otherUserId = newMsg.sender_id === user.id ? newMsg.receiver_id : newMsg.sender_id;

            setContacts((prevContacts) => {
              const idx = prevContacts.findIndex((c) => c.id === otherUserId);
              
              if (idx !== -1) {
                const updated = [...prevContacts];
                updated[idx] = {
                  ...updated[idx],
                  lastMessage: newMsg.message_text,
                  lastMessageTime: formatMessageTime(newMsg.created_at),
                  lastMessageTimestamp: newMsg.created_at,
                };
                return updated.sort((a, b) => {
                  if (urlUserId) {
                    if (a.id === urlUserId) return -1;
                    if (b.id === urlUserId) return 1;
                  }
                  return new Date(b.lastMessageTimestamp).getTime() - new Date(a.lastMessageTimestamp).getTime();
                });
              } else {
                // Fetch the new user's profile
                supabase
                  .from("profiles")
                  .select("*")
                  .eq("id", otherUserId)
                  .single()
                  .then(({ data: profile }) => {
                    if (profile) {
                      const newContact: Contact = {
                        id: profile.id,
                        name: profile.name,
                        avatar: profile.avatar || profile.name.split(" ").map((n: string) => n[0]).slice(0, 2).join("").toUpperCase(),
                        lastMessage: newMsg.message_text,
                        lastMessageTime: formatMessageTime(newMsg.created_at),
                        lastMessageTimestamp: newMsg.created_at,
                        unread: 0,
                      };
                      setContacts((prev) => [newContact, ...prev]);
                    }
                  });
                return prevContacts;
              }
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, urlUserId]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !activeContactId || !user) return;

    const messageText = input.trim();
    setInput("");

    try {
      const { data, error } = await supabase
        .from("messages")
        .insert({
          sender_id: user.id,
          receiver_id: activeContactId,
          message_text: messageText,
        })
        .select()
        .single();

      if (error) throw error;

      if (data) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === data.id)) return prev;
          return [...prev, data];
        });

        // Insert notification for the recipient
        try {
          await supabase
            .from("notifications")
            .insert({
              user_id: activeContactId,
              title: `New message from ${user.name || "User"}`,
              body: messageText.length > 60 ? `${messageText.slice(0, 60)}...` : messageText,
              type: "chat",
              unread: true,
            });
        } catch (notifErr) {
          console.warn("Could not insert message notification:", notifErr);
        }

        setContacts((prevContacts) => {
          const idx = prevContacts.findIndex((c) => c.id === activeContactId);
          if (idx !== -1) {
            const updated = [...prevContacts];
            updated[idx] = {
              ...updated[idx],
              lastMessage: data.message_text,
              lastMessageTime: formatMessageTime(data.created_at),
              lastMessageTimestamp: data.created_at,
            };
            return updated.sort((a, b) => {
              if (urlUserId) {
                if (a.id === urlUserId) return -1;
                if (b.id === urlUserId) return 1;
              }
              return new Date(b.lastMessageTimestamp).getTime() - new Date(a.lastMessageTimestamp).getTime();
            });
          }
          return prevContacts;
        });
      }
    } catch (err) {
      console.error("Error sending message:", err);
    }
  };

  const filteredContacts = contacts.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeChat = contacts.find((c) => c.id === activeContactId);
  const activeChatMessages = messages.filter(
    (m) =>
      (m.sender_id === user?.id && m.receiver_id === activeContactId) ||
      (m.sender_id === activeContactId && m.receiver_id === user?.id)
  );

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 pt-6 md:pt-8">
      <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Messages</h1>
      <p className="text-sm text-muted-foreground mt-1">Communicate with applicants and hired workers.</p>

      {isLoading ? (
        <div className="mt-12 flex flex-col items-center justify-center gap-3 py-20">
          <Loader2 className="h-8 w-8 text-primary animate-spin" />
          <p className="text-sm text-muted-foreground">Loading chats...</p>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 md:grid-cols-[320px_1fr] gap-4 h-[calc(100dvh-15rem)]">
          <aside className="rounded-3xl bg-card border border-border shadow-soft overflow-hidden flex flex-col">
            <div className="p-3 border-b border-border">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search conversations"
                  className="h-10 pl-9 rounded-full bg-muted/60 border-transparent"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {filteredContacts.length === 0 ? (
                <div className="p-6 text-center text-xs text-muted-foreground">
                  No conversations found.
                </div>
              ) : (
                filteredContacts.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setActiveContactId(c.id)}
                    className={cn(
                      "w-full text-left p-3 flex items-center gap-3 hover:bg-muted/40 transition-colors border-b border-border",
                      activeContactId === c.id && "bg-primary/5"
                    )}
                  >
                    <div className="relative">
                      <Avatar className="h-11 w-11">
                        <AvatarFallback className="bg-gradient-primary text-primary-foreground font-semibold">
                          {c.avatar}
                        </AvatarFallback>
                      </Avatar>
                      <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-success ring-2 ring-card" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-semibold text-sm truncate">{c.name}</p>
                        <p className="text-[10px] text-muted-foreground shrink-0">{c.lastMessageTime}</p>
                      </div>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">{c.lastMessage}</p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </aside>

          <section className="rounded-3xl bg-card border border-border shadow-soft overflow-hidden flex flex-col">
            {activeChat ? (
              <>
                <header className="px-5 py-4 border-b border-border flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-gradient-primary text-primary-foreground font-semibold">
                      {activeChat.avatar}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="font-semibold text-sm">{activeChat.name}</p>
                    <p className="text-[11px] text-success inline-flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-success" /> Online
                    </p>
                  </div>
                  <button className="h-9 w-9 rounded-full grid place-items-center hover:bg-muted">
                    <Phone className="h-4 w-4" />
                  </button>
                  <button className="h-9 w-9 rounded-full grid place-items-center hover:bg-muted">
                    <Video className="h-4 w-4" />
                  </button>
                </header>

                <div className="flex-1 overflow-y-auto p-5 space-y-3 bg-muted/20">
                  {activeChatMessages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
                      <MessageSquare className="h-8 w-8 mb-2 opacity-50" />
                      <p className="text-sm">No messages yet. Send a message to start the conversation!</p>
                    </div>
                  ) : (
                    activeChatMessages.map((m, i) => (
                      <motion.div
                        key={m.id}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: Math.min(i * 0.02, 0.4) }}
                        className={cn("flex", m.sender_id === user?.id ? "justify-end" : "justify-start")}
                      >
                        <div
                          className={cn(
                            "max-w-[70%] rounded-2xl px-4 py-2.5 text-sm shadow-sm",
                            m.sender_id === user?.id
                              ? "bg-gradient-primary text-primary-foreground rounded-br-md"
                              : "bg-card border border-border rounded-bl-md"
                          )}
                        >
                          <p className="whitespace-pre-wrap break-words">{m.message_text}</p>
                          <p
                            className={cn(
                              "text-[10px] mt-1 text-right",
                              m.sender_id === user?.id ? "text-primary-foreground/70" : "text-muted-foreground"
                            )}
                          >
                            {formatMessageTime(m.created_at)}
                          </p>
                        </div>
                      </motion.div>
                    ))
                  )}
                  <div ref={messagesEndRef} />
                </div>

                <form onSubmit={handleSendMessage} className="p-3 border-t border-border flex items-center gap-2">
                  <button type="button" className="h-10 w-10 rounded-full grid place-items-center hover:bg-muted">
                    <Paperclip className="h-4 w-4" />
                  </button>
                  <Input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Type a message…"
                    className="h-11 rounded-full bg-muted/60 border-transparent"
                  />
                  <button type="button" className="h-10 w-10 rounded-full grid place-items-center hover:bg-muted">
                    <Smile className="h-4 w-4" />
                  </button>
                  <button
                    type="submit"
                    className="h-11 px-5 rounded-full bg-gradient-primary text-primary-foreground font-semibold inline-flex items-center gap-2 shadow-soft hover:brightness-105 transition-all"
                  >
                    <Send className="h-4 w-4" /> Send
                  </button>
                </form>
              </>
            ) : (
              <div className="h-full flex flex-col items-center justify-center p-8 text-center text-muted-foreground bg-muted/10">
                <MessageSquare className="h-12 w-12 text-primary opacity-50 mb-3" />
                <h3 className="text-base font-semibold text-foreground mb-1">No Active Conversation</h3>
                <p className="text-sm max-w-sm">
                  Select a worker from the sidebar or click "Message" on an applicant's profile to start chatting.
                </p>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

