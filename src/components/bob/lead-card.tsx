"use client";

/**
 * LeadCard — compact card showing a lead in the BOB list/kanban.
 *
 * Shows: name, status badge, tag emoji, last activity, next action, specialty.
 * Clicking opens the candidate profile page.
 */

import Link from "next/link";
import { STATUS_META, TAG_META, type CandidateStatus, type CandidateTag } from "@/lib/bob/types";

export interface LeadCardData {
  id: number;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  specialty: string | null;
  pipeline_stage: string;
  tag: string;
  last_activity_at: string;
  last_activity_type: string | null;
  next_action: string | null;
  next_action_at: string | null;
  source: string;
  reached_for: string | null;
  _count?: {
    activities: number;
    vault_sign_documents: number;
  };
  recruiter_user?: {
    id: number;
    first_name: string | null;
    last_name: string | null;
    email: string;
  };
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

export function LeadCard({ lead }: { lead: LeadCardData }) {
  const status = STATUS_META[lead.pipeline_stage as CandidateStatus];
  const tag = TAG_META[lead.tag as CandidateTag];

  return (
    <Link
      href={`/recruiter/candidates/${lead.id}`}
      className="block bg-white border rounded-lg p-3 hover:shadow-md hover:border-primary/30 transition-all duration-200 group"
    >
      {/* Top row: name + status */}
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors">
            {lead.first_name} {lead.last_name}
          </p>
          {lead.specialty && (
            <p className="text-xs text-text-muted truncate">{lead.specialty}</p>
          )}
        </div>
        <span
          className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0"
          style={{
            color: status.color,
            backgroundColor: status.bgColor,
            border: `1px solid ${status.borderColor}`,
          }}
          title={status.description}
        >
          {status.icon} {status.label}
        </span>
      </div>

      {/* Tag + last activity */}
      <div className="flex items-center gap-2 text-[11px] text-text-muted">
        <span title={tag.description}>{tag.emoji} {tag.label}</span>
        <span>•</span>
        <span title={`Last activity: ${lead.last_activity_type || "unknown"}`}>
          {timeAgo(lead.last_activity_at)}
        </span>
      </div>

      {/* Next action (if set) */}
      {lead.next_action && (
        <div className="mt-2 pt-2 border-t border-border/60 text-[11px]">
          <span className="text-text-muted">Next: </span>
          <span className="font-medium text-foreground">{lead.next_action}</span>
          {lead.next_action_at && (
            <span className="text-text-muted ml-1">
              (due {new Date(lead.next_action_at).toLocaleDateString()})
            </span>
          )}
        </div>
      )}

      {/* Bottom row: counts + recruiter (admin view) */}
      <div className="mt-2 pt-2 border-t border-border/60 flex items-center justify-between text-[10px] text-text-muted">
        <div className="flex items-center gap-3">
          {lead._count && lead._count.vault_sign_documents > 0 && (
            <span title="VaultSign documents">📄 {lead._count.vault_sign_documents}</span>
          )}
          {lead._count && lead._count.activities > 0 && (
            <span title="Total activities">📊 {lead._count.activities}</span>
          )}
          {lead.reached_for && (
            <span className="truncate max-w-[120px]" title={`Reaching for: ${lead.reached_for}`}>
              🎯 {lead.reached_for}
            </span>
          )}
        </div>
        {lead.recruiter_user && (
          <span className="text-[10px]" title={`Owned by ${lead.recruiter_user.email}`}>
            {lead.recruiter_user.first_name?.[0] ?? ""}{lead.recruiter_user.last_name?.[0] ?? ""}
          </span>
        )}
      </div>
    </Link>
  );
}
