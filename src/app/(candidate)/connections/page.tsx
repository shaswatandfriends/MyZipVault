"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Inbox, Check, X, Loader2, Building2, MapPin, DollarSign } from "@/lib/icons";

interface ConnectionInvite {
  id: number;
  status: string;
  sent_at: string;
  email_subject: string;
  email_body: string;
  accepted_at: string | null;
  denied_at: string | null;
  recruiter: { id: number; first_name: string | null; last_name: string | null; email: string; organization_id: number | null };
  job: { id: number; title: string; profession: string | null; specialty: string | null; city: string | null; state: string | null; is_remote: boolean; salary_display: string | null } | null;
}

/**
 * /connections
 *
 * Phase 3.3 — candidate's list of recruiter invites.
 * Accept → opens chat (Phase 3.4)
 * Deny → records denial, recruiter's data + job preserved for future reference.
 */
export default function ConnectionsPage() {
  const [invites, setInvites] = useState<ConnectionInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "sent" | "accepted" | "denied">("all");
  const [actionInProgress, setActionInProgress] = useState<number | null>(null);

  const fetchInvites = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/candidate/connections${filter !== "all" ? `?status=${filter}` : ""}`);
      const data = await res.json();
      if (res.ok) setInvites(data.invites);
      else toast.error(data.error || "Failed to load connections");
    } catch (e: any) {
      toast.error("Network error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchInvites(); }, [filter]);

  const accept = async (inviteId: number) => {
    setActionInProgress(inviteId);
    try {
      const res = await fetch(`/api/candidate/connections/${inviteId}/accept`, { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        toast.success("Invite accepted — chat is now open");
        // Update the local state to reflect the change
        setInvites((prev) => prev.map((inv) => inv.id === inviteId ? { ...inv, status: "accepted", accepted_at: new Date().toISOString() } : inv));
        // Optionally open the chat page
        if (data.chat_url) {
          window.location.href = data.chat_url;
        }
      } else {
        toast.error(data.error || "Failed to accept");
      }
    } catch (e: any) {
      toast.error("Network error");
    } finally {
      setActionInProgress(null);
    }
  };

  const deny = async (inviteId: number) => {
    setActionInProgress(inviteId);
    try {
      const res = await fetch(`/api/candidate/connections/${inviteId}/deny`, { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        toast.success("Invite declined");
        setInvites((prev) => prev.map((inv) => inv.id === inviteId ? { ...inv, status: "denied", denied_at: new Date().toISOString() } : inv));
      } else {
        toast.error(data.error || "Failed to decline");
      }
    } catch (e: any) {
      toast.error("Network error");
    } finally {
      setActionInProgress(null);
    }
  };

  const formatDate = (iso: string) => new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });

  const filtered = invites.filter((inv) => filter === "all" ? true : inv.status === filter);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Inbox className="size-6" /> Connections
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Recruiter invitations and messages. Accept to open a chat — decline to keep your data private.
        </p>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 rounded-lg bg-muted p-1">
        {(["all", "sent", "accepted", "denied"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition ${
              filter === f ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {f === "all" ? "All" : f === "sent" ? "Pending" : f === "accepted" ? "Accepted" : "Declined"}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-32 w-full" />)}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Inbox className="size-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No connections yet.</p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              When a recruiter invites you to a position, it will appear here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((inv) => (
            <Card key={inv.id}>
              <CardContent className="p-4 space-y-3">
                {/* Top row: recruiter name + status + date */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">
                      {[inv.recruiter.first_name, inv.recruiter.last_name].filter(Boolean).join(" ") || inv.recruiter.email}
                    </p>
                    <p className="text-xs text-muted-foreground">{inv.recruiter.email}</p>
                  </div>
                  <Badge variant={inv.status === "accepted" ? "default" : inv.status === "denied" ? "secondary" : "outline"}>
                    {inv.status === "sent" ? "Pending" : inv.status === "accepted" ? "Accepted" : "Declined"}
                  </Badge>
                </div>

                {/* Job brief */}
                {inv.job && (
                  <div className="rounded-md border bg-muted/30 p-3 text-sm">
                    <p className="font-medium">{inv.job.title}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      {inv.job.profession && <span>{inv.job.profession}{inv.job.specialty ? ` · ${inv.job.specialty}` : ""}</span>}
                      {(inv.job.city || inv.job.state || inv.job.is_remote) && (
                        <span className="flex items-center gap-1">
                          <MapPin className="size-3" />
                          {inv.job.is_remote ? "Remote" : [inv.job.city, inv.job.state].filter(Boolean).join(", ")}
                        </span>
                      )}
                      {inv.job.salary_display && (
                        <span className="flex items-center gap-1 text-emerald-700 dark:text-emerald-400">
                          <DollarSign className="size-3" /> {inv.job.salary_display}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Email preview */}
                <div className="rounded-md border-l-2 border-muted-foreground/30 pl-3 text-xs text-muted-foreground line-clamp-3">
                  {inv.email_body.slice(0, 280)}
                  {inv.email_body.length > 280 ? "…" : ""}
                </div>

                {/* Footer: date + actions */}
                <div className="flex items-center justify-between gap-2 pt-1">
                  <span className="text-xs text-muted-foreground">Sent {formatDate(inv.sent_at)}</span>
                  <div className="flex gap-2">
                    {inv.status === "sent" && (
                      <>
                        <Button size="sm" variant="outline" onClick={() => deny(inv.id)} disabled={actionInProgress === inv.id}>
                          {actionInProgress === inv.id ? <Loader2 className="size-3.5 animate-spin mr-1" /> : <X className="size-3.5 mr-1" />}
                          Decline
                        </Button>
                        <Button size="sm" onClick={() => accept(inv.id)} disabled={actionInProgress === inv.id}>
                          {actionInProgress === inv.id ? <Loader2 className="size-3.5 animate-spin mr-1" /> : <Check className="size-3.5 mr-1" />}
                          Accept
                        </Button>
                      </>
                    )}
                    {inv.status === "accepted" && (
                      <Button size="sm" variant="outline" onClick={() => window.location.href = `/messages/${inv.id}`}>
                        Open chat
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
