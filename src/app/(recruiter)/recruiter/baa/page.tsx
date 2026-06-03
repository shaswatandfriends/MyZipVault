"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  FileSignature,
  CheckCircle2,
  Info,
  Loader2,
  ShieldCheck,
  User,
  Briefcase,
} from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";

// ─── Types ──────────────────────────────────────────────────────────
interface BAAOrganization {
  name: string;
  baaStatus: string;
  signedByName: string | null;
  signedByTitle: string | null;
  signedAt: string | null;
}

interface BAAData {
  baaRequired: boolean;
  baaContent: string;
  organization: BAAOrganization;
}

// ─── Skeleton Loader ────────────────────────────────────────────────
function BAASkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-48" />
      </CardHeader>
      <CardContent className="space-y-4">
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-6 w-64" />
        <Skeleton className="h-10 w-48" />
      </CardContent>
    </Card>
  );
}

// ─── Main Component ─────────────────────────────────────────────────
export default function RecruiterBaaPage() {
  const [data, setData] = useState<BAAData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSigning, setIsSigning] = useState(false);

  // Form state
  const [signerName, setSignerName] = useState("");
  const [signerTitle, setSignerTitle] = useState("");
  const [agreed, setAgreed] = useState(false);

  const fetchBAA = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/recruiter/baa");
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to fetch BAA data");
      }
      const json = (await res.json()) as BAAData;
      setData(json);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      toast.error("Failed to load BAA", { description: message });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBAA();
  }, [fetchBAA]);

  const handleSign = async () => {
    if (!signerName.trim() || !signerTitle.trim() || !agreed) {
      toast.error("Missing fields", {
        description: "Please fill in all fields and agree to the BAA terms.",
      });
      return;
    }

    setIsSigning(true);
    try {
      const res = await fetch("/api/recruiter/baa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "sign",
          fullName: signerName.trim(),
          title: signerTitle.trim(),
          agreed: true,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to sign BAA");
      }

      toast.success("BAA signed successfully", {
        description: "Your Business Associate Agreement has been recorded.",
      });
      await fetchBAA();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      toast.error("Failed to sign BAA", { description: message });
    } finally {
      setIsSigning(false);
    }
  };

  const isSigned = data?.organization.baaStatus === "signed";
  const isPendingOrExpired =
    data?.organization.baaStatus === "pending" ||
    data?.organization.baaStatus === "expired" ||
    !data?.organization.baaStatus;

  return (
    <div className="space-y-6">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <PageHeader
        title="Business Associate Agreement (BAA)"
        description="View and sign your BAA to comply with HIPAA requirements for handling protected health information."
      />

      {isLoading ? (
        <BAASkeleton />
      ) : !data?.baaRequired ? (
        /* ── BAA Not Required ────────────────────────────────────── */
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="size-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <Info className="size-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold">BAA is not required at this time</h3>
            <p className="text-sm text-muted-foreground mt-2 max-w-md">
              A Business Associate Agreement is not currently required for your
              organization. You will be notified if this changes.
            </p>
          </CardContent>
        </Card>
      ) : isSigned ? (
        /* ── BAA Already Signed ──────────────────────────────────── */
        <Card className="border-emerald-200 dark:border-emerald-900">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="size-5 text-emerald-600" />
              BAA Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center gap-3">
              <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-100 text-sm px-3 py-1">
                <CheckCircle2 className="size-3.5" />
                BAA Signed
              </Badge>
            </div>

            <Separator />

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Signed By</p>
                <p className="font-medium text-sm">{data.organization.signedByName ?? "—"}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Title</p>
                <p className="font-medium text-sm">{data.organization.signedByTitle ?? "—"}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Signed Date</p>
                <p className="font-medium text-sm">
                  {data.organization.signedAt
                    ? new Date(data.organization.signedAt).toLocaleDateString("en-US", {
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      })
                    : "—"}
                </p>
              </div>
            </div>

            <Separator />

            {/* View BAA content */}
            <div>
              <h3 className="text-sm font-semibold mb-3">Agreement Text</h3>
              <div className="rounded-lg border bg-muted/30 p-6 max-h-72 overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border">
                <div
                  className="prose prose-sm max-w-none dark:prose-invert font-serif text-sm leading-relaxed whitespace-pre-wrap"
                >
                  {data.baaContent || "BAA content not available."}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : isPendingOrExpired ? (
        /* ── BAA Needs Signing ───────────────────────────────────── */
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSignature className="size-5 text-amber-600" />
              Business Associate Agreement
            </CardTitle>
            <CardDescription>
              Please review and sign the BAA below. This is required before accessing candidate health information.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Status warning */}
            <Alert className="border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200">
              <Info className="size-4" />
              <AlertTitle>Action Required</AlertTitle>
              <AlertDescription>
                Your organization&apos;s BAA status is{" "}
                <span className="font-semibold">{data.organization.baaStatus || "pending"}</span>.
                Please sign the agreement to continue using the platform.
              </AlertDescription>
            </Alert>

            {/* BAA Content - Professional Legal Styling */}
            <div className="rounded-lg border bg-white dark:bg-gray-950 shadow-sm">
              <div className="p-6 max-h-96 overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border">
                <div className="max-w-none font-serif text-sm leading-relaxed whitespace-pre-wrap text-gray-800 dark:text-gray-200">
                  {data.baaContent || "BAA content not available. Please contact support."}
                </div>
              </div>
            </div>

            <Separator />

            {/* Signature Section */}
            <div className="space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <FileSignature className="size-4 text-emerald-600" />
                Sign the Agreement
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="signerName">
                    Full Legal Name <span className="text-destructive">*</span>
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="signerName"
                      placeholder="Jane Doe"
                      value={signerName}
                      onChange={(e) => setSignerName(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signerTitle">
                    Title <span className="text-destructive">*</span>
                  </Label>
                  <div className="relative">
                    <Briefcase className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="signerTitle"
                      placeholder="Director of HR"
                      value={signerTitle}
                      onChange={(e) => setSignerTitle(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-lg border p-4 bg-muted/30">
                <Checkbox
                  id="agree"
                  checked={agreed}
                  onCheckedChange={(checked) => setAgreed(checked === true)}
                  className="mt-0.5"
                />
                <Label htmlFor="agree" className="text-sm leading-relaxed cursor-pointer">
                  I agree to the terms of the Business Associate Agreement and sign on
                  behalf of{" "}
                  <span className="font-semibold">
                    {data.organization.name || "my organization"}
                  </span>
                  . I have the authority to bind this organization to this agreement.
                </Label>
              </div>

              <Button
                className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                disabled={!signerName.trim() || !signerTitle.trim() || !agreed || isSigning}
                onClick={handleSign}
              >
                {isSigning ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Signing...
                  </>
                ) : (
                  <>
                    <FileSignature className="size-4" />
                    Sign BAA
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
