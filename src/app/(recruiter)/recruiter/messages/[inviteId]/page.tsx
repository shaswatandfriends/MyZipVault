"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { ArrowLeft, Send, Loader2 } from "@/lib/icons";
import { useSession } from "next-auth/react";

interface ChatMessage {
  id: number;
  body: string;
  sent_at: string;
  read_at: string | null;
  sender: { id: number; first_name: string | null; last_name: string | null; role: string };
}

const POLL_INTERVAL_MS = 10000; // 10s — v1 polling, v2 will be WebSocket

/**
 * /messages/[inviteId]
 *
 * Phase 3.4 — shared chat UI for candidate + recruiter.
 * Both roles hit the same /api/messages/[inviteId] endpoint.
 *
 * v1: polling every 10 seconds when chat is open.
 * v2: WebSocket upgrade (deferred per EXECUTION-PLAN).
 */
export default function ChatPage() {
  const { inviteId } = useParams<{ inviteId: string }>();
  const router = useRouter();
  const { data: session } = useSession();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const currentUserId = session?.user ? Number((session.user as Record<string, unknown>).id) : null;

  // ─── Fetch messages + mark-read ───────────────────────────────────
  const fetchMessages = async (markRead = false) => {
    try {
      const res = await fetch(`/api/messages/${inviteId}${markRead ? "?markRead=true" : ""}`);
      const data = await res.json();
      if (res.ok) {
        setMessages(data.messages);
        setError(null);
      } else {
        setError(data.error || "Failed to load messages");
        if (res.status === 404 || res.status === 403) {
          setLoading(false);
          return; // stop polling on hard errors
        }
      }
    } catch (e: any) {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  };

  // Initial load + mark read on mount
  useEffect(() => {
    if (!inviteId) return;
    fetchMessages(true);
  }, [inviteId]);

  // Polling — only when document is visible (saves bandwidth)
  useEffect(() => {
    if (!inviteId) return;
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        fetchMessages(true);
      }
    }, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [inviteId]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ─── Send message ────────────────────────────────────────────────
  const sendMessage = async () => {
    if (!draft.trim()) return;
    setSending(true);
    try {
      const res = await fetch(`/api/messages/${inviteId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: draft.trim() }),
      });
      const data = await res.json();
      if (res.ok && data.message) {
        setMessages((prev) => [...prev, data.message]);
        setDraft("");
      } else {
        toast.error(data.error || "Failed to send");
      }
    } catch (e: any) {
      toast.error("Network error");
    } finally {
      setSending(false);
    }
  };

  // ─── Keyboard shortcut: Cmd/Ctrl+Enter to send ──────────────────
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    return isToday
      ? d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })
      : d.toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  };

  const senderName = (msg: ChatMessage) => {
    if (msg.sender.id === currentUserId) return "You";
    return [msg.sender.first_name, msg.sender.last_name].filter(Boolean).join(" ") || msg.sender.role;
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl space-y-3">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  if (error && messages.length === 0) {
    return (
      <div className="mx-auto max-w-3xl">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-sm text-muted-foreground">{error}</p>
            <Button variant="outline" onClick={() => router.back()} className="mt-3">Go back</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <Card className="flex flex-col" style={{ height: "calc(100vh - 8rem)" }}>
        <CardHeader className="border-b">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Chat</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => router.back()}>
              <ArrowLeft className="size-4 mr-1" /> Back
            </Button>
          </div>
        </CardHeader>

        <CardContent className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-sm text-muted-foreground">No messages yet.</p>
              <p className="text-xs text-muted-foreground/70 mt-1">Say hello 👋</p>
            </div>
          ) : (
            messages.map((msg) => {
              const isOwn = msg.sender.id === currentUserId;
              return (
                <div key={msg.id} className={`flex flex-col ${isOwn ? "items-end" : "items-start"}`}>
                  <div className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                    isOwn
                      ? "bg-blue-600 text-white"
                      : "bg-muted text-foreground"
                  }`}>
                    <p className="text-xs font-medium mb-0.5 opacity-80">{senderName(msg)}</p>
                    <p className="text-sm whitespace-pre-wrap break-words">{msg.body}</p>
                  </div>
                  <p className="mt-0.5 text-[10px] text-muted-foreground">
                    {formatTime(msg.sent_at)} {msg.read_at && isOwn && "· Read"}
                  </p>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </CardContent>

        {/* Composer */}
        <div className="border-t p-3 space-y-2">
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onKeyDown}
            rows={2}
            placeholder="Type a message… (Cmd/Ctrl+Enter to send)"
            className="resize-none"
            disabled={sending}
          />
          <div className="flex justify-end">
            <Button onClick={sendMessage} disabled={!draft.trim() || sending} size="sm">
              {sending ? <Loader2 className="size-3.5 animate-spin mr-1" /> : <Send className="size-3.5 mr-1" />}
              Send
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
