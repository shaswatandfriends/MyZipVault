"use client";

/**
 * AddLeadDialog — form for creating a new lead.
 *
 * Required: first_name, last_name, source
 * Optional: email, phone, job_title, specialty, reached_for, remark, notes
 *
 * If source === "other", a free-text source_other field appears.
 *
 * Duplicate email check happens server-side (returns 409 with existing_lead).
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Loader2, X } from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { SOURCE_OPTIONS } from "@/lib/bob/types";

interface AddLeadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (leadId: number) => void;
}

export function AddLeadDialog({ open, onOpenChange, onCreated }: AddLeadDialogProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  // Form state
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [reachedFor, setReachedFor] = useState("");
  const [remark, setRemark] = useState("");
  const [notes, setNotes] = useState("");
  const [source, setSource] = useState("");
  const [sourceOther, setSourceOther] = useState("");

  function resetForm() {
    setFirstName(""); setLastName(""); setEmail(""); setPhone("");
    setJobTitle(""); setSpecialty(""); setReachedFor(""); setRemark("");
    setNotes(""); setSource(""); setSourceOther("");
  }

  async function handleSubmit() {
    if (!firstName.trim() || !lastName.trim()) {
      toast.error("First name and last name are required");
      return;
    }
    if (!source) {
      toast.error("Please select a source");
      return;
    }
    if (source === "other" && !sourceOther.trim()) {
      toast.error("Please specify the source name");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/recruiter/bob", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          email: email.trim() || null,
          phone: phone.trim() || null,
          job_title: jobTitle.trim() || null,
          specialty: specialty.trim() || null,
          reached_for: reachedFor.trim() || null,
          remark: remark.trim() || null,
          notes: notes.trim() || null,
          source,
          source_other: source === "other" ? sourceOther.trim() : null,
        }),
      });

      if (res.status === 409) {
        const data = await res.json();
        toast.error("A lead with this email already exists", {
          description: `${data.existing_lead.first_name} ${data.existing_lead.last_name} — status: ${data.existing_lead.pipeline_stage}`,
        });
        return;
      }

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Failed to create lead");
        return;
      }

      const data = await res.json();
      toast.success("Lead added to your BOB");
      resetForm();
      onOpenChange(false);
      if (onCreated) {
        onCreated(data.lead.id);
      } else {
        router.push(`/recruiter/candidates/${data.lead.id}`);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to create lead");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add new lead to BOB</DialogTitle>
          <DialogDescription>
            Create a new candidate lead. They'll be added to your Book of Business with status "New Lead".
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Name */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="first_name">First name *</Label>
              <Input
                id="first_name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Jordan"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="last_name">Last name *</Label>
              <Input
                id="last_name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Reyes"
                className="mt-1"
              />
            </div>
          </div>

          {/* Contact */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="jordan@example.com"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 (555) 123-4567"
                className="mt-1"
              />
            </div>
          </div>

          {/* Job info */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="job_title">Job title</Label>
              <Input
                id="job_title"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                placeholder="Registered Nurse"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="specialty">Specialty</Label>
              <Input
                id="specialty"
                value={specialty}
                onChange={(e) => setSpecialty(e.target.value)}
                placeholder="Case Management"
                className="mt-1"
              />
            </div>
          </div>

          {/* Source */}
          <div>
            <Label htmlFor="source">Source *</Label>
            <Select value={source} onValueChange={setSource}>
              <SelectTrigger id="source" className="mt-1">
                <SelectValue placeholder="How did you find this candidate?" />
              </SelectTrigger>
              <SelectContent>
                {SOURCE_OPTIONS.map((s) => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {source === "other" && (
              <Input
                value={sourceOther}
                onChange={(e) => setSourceOther(e.target.value)}
                placeholder="Specify the source (e.g. 'Conference 2026')"
                className="mt-2"
              />
            )}
          </div>

          {/* Reached for */}
          <div>
            <Label htmlFor="reached_for">Reaching for</Label>
            <Input
              id="reached_for"
              value={reachedFor}
              onChange={(e) => setReachedFor(e.target.value)}
              placeholder="What position/role are you contacting them for?"
              className="mt-1"
            />
          </div>

          {/* Remark */}
          <div>
            <Label htmlFor="remark">Call remark</Label>
            <Textarea
              id="remark"
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              placeholder="How did the call go? What was discussed?"
              rows={2}
              className="mt-1"
            />
          </div>

          {/* Notes */}
          <div>
            <Label htmlFor="notes">Internal notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Private notes for this lead (only visible to your org)..."
              rows={2}
              className="mt-1"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Plus className="h-4 w-4 mr-1.5" />}
            Add to BOB
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
