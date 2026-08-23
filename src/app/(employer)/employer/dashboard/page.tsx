"use client";

import { Briefcase, Users, Send, TrendingUp } from "@/lib/icons";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";

export default function EmployerDashboard() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Employer Dashboard"
        description="Manage your job postings, review submissions, and find candidates."
        actions={
          <Link href="/employer/jobs/new">
            <button className="spatial-button primary sm">Post a Job</button>
          </Link>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-4 flex items-center gap-2">
          <Briefcase className="size-5 text-[var(--primary)]" />
          <div><p className="text-xs text-muted-foreground">Active Jobs</p><p className="text-lg font-bold">—</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-2">
          <Send className="size-5 text-[var(--primary)]" />
          <div><p className="text-xs text-muted-foreground">Submissions</p><p className="text-lg font-bold">—</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-2">
          <Users className="size-5 text-[var(--primary)]" />
          <div><p className="text-xs text-muted-foreground">Candidates Found</p><p className="text-lg font-bold">—</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-2">
          <TrendingUp className="size-5 text-[var(--primary)]" />
          <div><p className="text-xs text-muted-foreground">Placed</p><p className="text-lg font-bold">—</p></div>
        </CardContent></Card>
      </div>

      <Card>
        <CardContent className="p-8 text-center">
          <Briefcase className="size-12 text-muted-foreground mx-auto mb-3" />
          <p className="font-medium text-muted-foreground">Welcome to MyZipVault Employer Dashboard</p>
          <p className="text-sm text-muted-foreground mt-1">
            Post your first job to start receiving candidate submissions from our network of recruiters.
          </p>
          <Link href="/employer/jobs/new">
            <button className="spatial-button primary sm mt-4">Post Your First Job</button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
