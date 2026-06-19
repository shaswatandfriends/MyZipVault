"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Briefcase, Mail, Building2, ArrowRight } from "@/lib/icons";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

interface Recruiter {
  id: number;
  email: string;
  first_name: string | null;
  last_name: string | null;
  organization: {
    id: number;
    name: string;
  } | null;
}

export default function CandidateRecruitersPage() {
  const [recruiters, setRecruiters] = useState<Recruiter[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchRecruiters = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/candidate/recruiters");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setRecruiters(data.recruiters || []);
    } catch (error) {
      console.error("[RECRUITERS_PAGE]", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRecruiters();
  }, [fetchRecruiters]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Recruiters"
        description="Agencies and recruiters who have sent you checklist requests or document shares."
      />

      {/* Recruiters List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      ) : recruiters.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Briefcase className="size-10 text-text-muted mx-auto mb-3" />
            <p className="text-sm font-medium text-foreground">No recruiters yet</p>
            <p className="text-xs text-text-secondary mt-1">
              When a recruiter sends you a checklist request or asks to share your
              documents, they&apos;ll appear here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {recruiters.map((recruiter) => {
            const fullName =
              `${recruiter.first_name ?? ""} ${recruiter.last_name ?? ""}`.trim() ||
              recruiter.email;
            const initials =
              `${recruiter.first_name?.[0] ?? "?"}${recruiter.last_name?.[0] ?? ""}`.toUpperCase();

            return (
              <Card key={recruiter.id}>
                <CardContent className="p-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4 min-w-0 flex-1">
                    {/* Avatar */}
                    <div className="size-12 rounded-full bg-primary-light flex items-center justify-center text-primary font-semibold text-sm shrink-0">
                      {initials}
                    </div>

                    {/* Info */}
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-foreground truncate">{fullName}</h3>
                      <div className="flex items-center gap-3 text-xs text-text-secondary mt-1">
                        <span className="flex items-center gap-1">
                          <Mail className="size-3" />
                          <span className="truncate">{recruiter.email}</span>
                        </span>
                      </div>
                      {recruiter.organization && (
                        <div className="flex items-center gap-1 mt-1">
                          <Building2 className="size-3 text-text-muted" />
                          <Badge variant="outline" className="text-xs">
                            {recruiter.organization.name}
                          </Badge>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right side: view sharing */}
                  <Link
                    href="/sharing"
                    className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary-light rounded-lg transition-colors shrink-0"
                  >
                    View Shares
                    <ArrowRight className="size-3.5" />
                  </Link>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Info note */}
      {!isLoading && recruiters.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-text-secondary">
              <strong>Privacy note:</strong> Only recruiters who have sent you a
              checklist request appear here. You control who sees your documents
              via the Sharing page. Recruiters cannot search for you on this
              platform — they only see what you choose to share.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
