"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Mail, ArrowRight } from "@/lib/icons";
import { toast } from "sonner";

/**
 * /recruiter/messages — list of all chat conversations (accepted invites).
 * Each card links to /recruiter/messages/[inviteId] for the actual chat.
 */
export default function RecruiterMessagesPage() {
  const [invites, setInvites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/recruiter/invites?status=accepted")
      .then((r) => r.json())
      .then((data) => {
        if (data.invites) {
          setInvites(data.invites);
        }
      })
      .catch(() => toast.error("Failed to load messages"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-3">
        <h1 className="text-2xl font-bold">Messages</h1>
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 w-full" />)}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Mail className="size-6" /> Messages
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Chat with candidates who accepted your invitations.
        </p>
      </div>

      {invites.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Mail className="size-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No conversations yet.</p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              Send an invite from <Link href="/recruiter/invite" className="text-primary hover:underline">Invite Candidate</Link> — once accepted, the chat will appear here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {invites.map((inv) => (
            <Card key={inv.id}>
              <CardContent className="p-4 flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">
                    {[inv.candidate?.first_name, inv.candidate?.last_name].filter(Boolean).join(" ") || inv.candidate_email}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {inv.job?.title || "No job specified"} · Accepted {inv.accepted_at ? new Date(inv.accepted_at).toLocaleDateString() : ""}
                  </p>
                </div>
                <Link href={`/recruiter/messages/${inv.id}`}>
                  <Button size="sm" variant="outline">
                    Open Chat <ArrowRight className="size-3.5 ml-1" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
