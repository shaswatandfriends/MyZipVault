"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Send, Loader2, AlertCircle, FileText } from "@/lib/icons";

/**
 * /recruiter/invite
 *
 * Phase 3.1 — "Invite Candidate" flow with 72-hr cooldown.
 *
 * Flow:
 *   1. Recruiter enters candidate email + name (optional)
 *   2. Recruiter enters Job ID, clicks "Load" → fetches job title + description
 *   3. Job brief auto-inserted into email body (below greeting)
 *   4. Recruiter edits subject + body, clicks "Send Invite"
 *   5. 72-hr cooldown enforced server-side
 *
 * Backend: POST /api/recruiter/invite
 *          GET  /api/recruiter/invite/check-cooldown?email=X
 *          GET  /api/recruiter/jobs/[id]/brief
 */
export default function RecruiterInvitePage() {
  const router = useRouter();
  const [candidateEmail, setCandidateEmail] = useState("");
  const [candidateName, setCandidateName] = useState("");
  const [jobId, setJobId] = useState("");
  const [jobBrief, setJobBrief] = useState<{ id: number; title: string; description: string | null; city: string | null; state: string | null; is_remote: boolean; salary_display: string | null } | null>(null);
  const [loadingJob, setLoadingJob] = useState(false);
  const [emailSubject, setEmailSubject] = useState("Opportunity at MyZipVault — {{JOB_TITLE}}");
  const [emailBody, setEmailBody] = useState("");
  const [cooldown, setCooldown] = useState<{ can_invite: boolean; retry_after?: string; cooldown_hours: number } | null>(null);
  const [sending, setSending] = useState(false);
  const [jobLoadError, setJobLoadError] = useState<string | null>(null);

  // ─── Check cooldown when email changes (debounced) ───────────────────
  useEffect(() => {
    if (!candidateEmail || !candidateEmail.includes("@")) {
      setCooldown(null);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/recruiter/invite/check-cooldown?email=${encodeURIComponent(candidateEmail)}`);
        if (res.ok) setCooldown(await res.json());
      } catch {}
    }, 500);
    return () => clearTimeout(t);
  }, [candidateEmail]);

  // ─── Load job brief by ID ────────────────────────────────────────────
  const loadJob = async () => {
    const id = parseInt(jobId, 10);
    if (isNaN(id) || id <= 0) {
      setJobLoadError("Enter a valid Job ID (number)");
      return;
    }
    setLoadingJob(true);
    setJobLoadError(null);
    try {
      const res = await fetch(`/api/recruiter/jobs/${id}/brief`);
      const data = await res.json();
      if (!res.ok) {
        setJobLoadError(data.error || "Job not found");
        setJobBrief(null);
        return;
      }
      setJobBrief(data.job);
      // Compose the email body with the job brief auto-inserted
      const loc = [data.job.city, data.job.state].filter(Boolean).join(", ") || (data.job.is_remote ? "Remote" : "");
      const salary = data.job.salary_display ? `\nCompensation: ${data.job.salary_display}` : "";
      const composed = `Hello ${candidateName || "there"},\n\nI came across your profile and would like to discuss an opportunity:\n\nPosition: ${data.job.title}\nLocation: ${loc}${salary}\n\nJob Description:\n${data.job.description || "(no description provided)"}\n\nIf you're interested, please reply here or log in to your MyZipVault account to review the full details and connect.\n\nBest regards`;
      setEmailBody(composed);
      // Auto-update subject with the job title
      setEmailSubject(`Opportunity: ${data.job.title}`);
    } catch (e: any) {
      setJobLoadError(e.message || "Failed to load job");
    } finally {
      setLoadingJob(false);
    }
  };

  // ─── Send the invite ────────────────────────────────────────────────
  const sendInvite = async () => {
    if (!candidateEmail || !emailSubject || !emailBody || !jobBrief) {
      toast.error("All fields are required");
      return;
    }
    setSending(true);
    try {
      const res = await fetch("/api/recruiter/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidate_email: candidateEmail,
          candidate_name: candidateName || undefined,
          job_id: jobBrief.id,
          email_subject: emailSubject,
          email_body: emailBody,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("Invite sent! Candidate will receive an email.");
        // Reset form
        setCandidateEmail("");
        setCandidateName("");
        setJobId("");
        setJobBrief(null);
        setEmailSubject("Opportunity at MyZipVault — {{JOB_TITLE}}");
        setEmailBody("");
        setCooldown(null);
      } else if (res.status === 429) {
        toast.error(data.error || "Cooldown active");
        setCooldown({ can_invite: false, retry_after: data.retry_after, cooldown_hours: data.cooldown_hours });
      } else {
        toast.error(data.error || "Failed to send invite");
      }
    } catch (e: any) {
      toast.error(e.message || "Network error");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Invite Candidate</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Send a candidate an invitation to discuss a specific job. The 72-hr cooldown prevents duplicate invites.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Send className="size-4" /> Candidate
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="email">Candidate Email *</Label>
              <Input
                id="email"
                type="email"
                placeholder="nurse@example.com"
                value={candidateEmail}
                onChange={(e) => setCandidateEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Candidate Name (optional)</Label>
              <Input
                id="name"
                placeholder="Jane Doe"
                value={candidateName}
                onChange={(e) => setCandidateName(e.target.value)}
              />
            </div>
          </div>

          {cooldown && !cooldown.can_invite && (
            <div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-950/50 dark:text-amber-200">
              <AlertCircle className="size-4 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium">Cooldown active</p>
                <p className="text-xs mt-0.5">
                  You can re-invite this candidate after{" "}
                  {cooldown.retry_after ? new Date(cooldown.retry_after).toLocaleString() : `${cooldown.cooldown_hours} hours`}.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="size-4" /> Job Brief
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Job ID (e.g., 42)"
              value={jobId}
              onChange={(e) => setJobId(e.target.value)}
              className="max-w-xs"
              inputMode="numeric"
            />
            <Button type="button" variant="secondary" onClick={loadJob} disabled={loadingJob}>
              {loadingJob ? <Loader2 className="size-4 animate-spin" /> : "Load Job"}
            </Button>
          </div>

          {jobLoadError && (
            <p className="text-sm text-red-600 flex items-center gap-1">
              <AlertCircle className="size-4" /> {jobLoadError}
            </p>
          )}

          {jobBrief && (
            <div className="rounded-md border border-emerald-300 bg-emerald-50 p-3 dark:bg-emerald-950/30">
              <p className="text-sm font-medium">{jobBrief.title}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {[jobBrief.city, jobBrief.state].filter(Boolean).join(", ") || (jobBrief.is_remote ? "Remote" : "—")}
                {jobBrief.salary_display ? ` · ${jobBrief.salary_display}` : ""}
              </p>
              {jobBrief.description && (
                <p className="mt-2 text-xs text-muted-foreground line-clamp-3">
                  {jobBrief.description.slice(0, 240)}
                  {jobBrief.description.length > 240 ? "…" : ""}
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Email Composer</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="subject">Subject</Label>
            <Input
              id="subject"
              value={emailSubject}
              onChange={(e) => setEmailSubject(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="body">Body</Label>
            <Textarea
              id="body"
              value={emailBody}
              onChange={(e) => setEmailBody(e.target.value)}
              rows={12}
              placeholder="Load a job to auto-fill this. Or write your own message."
            />
            <p className="text-xs text-muted-foreground">
              {emailBody.length} chars · candidate sees this verbatim in their email
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => router.back()}>Cancel</Button>
            <Button
              onClick={sendInvite}
              disabled={sending || !candidateEmail || !emailSubject || !emailBody || !jobBrief || (cooldown !== null && !cooldown.can_invite)}
            >
              {sending ? <Loader2 className="size-4 animate-spin mr-2" /> : <Send className="size-4 mr-2" />}
              Send Invite
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
