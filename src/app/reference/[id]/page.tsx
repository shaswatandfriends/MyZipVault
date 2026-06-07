"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Shield,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Loader2,
  Send,
  Building2,
} from "@/lib/icons";
import { toast } from "sonner";

interface ReferenceInfo {
  id: number;
  candidateName: string;
  facilityName: string;
  employmentStatus: string;
  status: string;
  managerEmail: string;
  managerPhone: string;
}

interface QuestionItem {
  id: number;
  questionText: string;
  responseType: string;
  sortOrder: number;
  existingAnswer: string | null;
}

type PageState = "loading" | "error" | "completed" | "declined" | "expired" | "form";

export default function ReferenceFormPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [id, setId] = useState<string>("");
  const [pageState, setPageState] = useState<PageState>("loading");
  const [reference, setReference] = useState<ReferenceInfo | null>(null);
  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [overallComment, setOverallComment] = useState("");
  const [digitalSignature, setDigitalSignature] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    params.then((p) => setId(p.id));
  }, [params]);

  const fetchReference = useCallback(async () => {
    if (!id) return;
    try {
      const res = await fetch(`/api/reference/${id}`);
      const data = await res.json();

      if (!res.ok) {
        setPageState("error");
        return;
      }

      if (data.code === "ALREADY_COMPLETED") {
        setReference(data.reference);
        setPageState("completed");
        return;
      }

      if (data.code === "DECLINED") {
        setReference(data.reference);
        setPageState("declined");
        return;
      }

      setReference(data.reference);
      setQuestions(data.questions || []);

      // Populate existing answers
      if (data.existingResponses) {
        setAnswers(data.existingResponses);
      }
      if (data.overallComment) {
        setOverallComment(data.overallComment);
      }

      setPageState("form");
    } catch {
      setPageState("error");
    }
  }, [id]);

  useEffect(() => {
    fetchReference();
  }, [fetchReference]);

  const handleSubmit = async () => {
    if (!digitalSignature.trim()) {
      toast.error("Please provide your digital signature");
      return;
    }

    // Validate that all required questions are answered
    const unanswered = questions.filter((q) => {
      const answer = answers[q.id];
      return !answer || !answer.trim();
    });

    if (unanswered.length > 0) {
      toast.error("Please answer all questions", {
        description: `${unanswered.length} question${unanswered.length > 1 ? "s" : ""} still need answers`,
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const answerList = questions.map((q) => ({
        questionId: q.id,
        answerText: answers[q.id] || "",
      }));

      const res = await fetch(`/api/reference/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          answers: answerList,
          overallComment,
          digitalSignature: digitalSignature.trim(),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error("Submission failed", { description: data.error });
        return;
      }

      toast.success("Reference submitted successfully!");
      setPageState("completed");
    } catch {
      toast.error("Failed to submit reference");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getEmploymentBadge = (status: string) => {
    switch (status) {
      case "current":
        return (
          <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-0">
            Current Employee
          </Badge>
        );
      case "former":
        return (
          <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-0">
            Former Employee
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  // Loading
  if (pageState === "loading") {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <div className="max-w-2xl w-full mx-auto p-6 space-y-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    );
  }

  // Error state
  if (pageState === "error") {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="p-8 text-center">
            <div className="size-14 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="size-7 text-red-600 dark:text-red-400" />
            </div>
            <h3 className="text-lg font-semibold">Invalid Reference Link</h3>
            <p className="text-sm text-muted-foreground mt-1">
              This reference link is invalid or has expired. Please contact the requester for a new link.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Already Completed
  if (pageState === "completed") {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="p-8 text-center">
            <div className="size-14 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="size-7 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h3 className="text-lg font-semibold">Reference Already Submitted</h3>
            <p className="text-sm text-muted-foreground mt-1">
              This reference evaluation has already been completed. Thank you for your time.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Declined
  if (pageState === "declined") {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="p-8 text-center">
            <div className="size-14 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mx-auto mb-4">
              <XCircle className="size-7 text-amber-600 dark:text-amber-400" />
            </div>
            <h3 className="text-lg font-semibold">Reference Declined</h3>
            <p className="text-sm text-muted-foreground mt-1">
              This reference has been declined and is no longer accepting responses.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Expired
  if (pageState === "expired") {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="p-8 text-center">
            <div className="size-14 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mx-auto mb-4">
              <Clock className="size-7 text-amber-600 dark:text-amber-400" />
            </div>
            <h3 className="text-lg font-semibold">Reference Expired</h3>
            <p className="text-sm text-muted-foreground mt-1">
              This reference link has expired. Please contact the requester for a new link.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Form
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="max-w-2xl mx-auto p-4 sm:p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3 pt-4">
          <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Shield className="size-5 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-bold">MyZipVault</h1>
            <p className="text-xs text-muted-foreground">Reference Evaluation Form</p>
          </div>
        </div>

        {/* Reference Info Card */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Building2 className="size-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Reference for</p>
                <p className="font-semibold text-lg">{reference?.candidateName}</p>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-sm text-muted-foreground">
                    Facility: {reference?.facilityName}
                  </p>
                  {reference?.employmentStatus && getEmploymentBadge(reference.employmentStatus)}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Evaluation Questions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Evaluation Questions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {questions.map((question, idx) => (
              <div key={question.id}>
                {idx > 0 && <Separator className="mb-6" />}
                <div className="space-y-3">
                  <p className="text-sm font-medium">
                    <span className="text-muted-foreground mr-1.5">{idx + 1}.</span>
                    {question.questionText}
                  </p>

                  {question.responseType === "rating_1_5" && (
                    <RadioGroup
                      value={answers[question.id] || ""}
                      onValueChange={(value) =>
                        setAnswers({ ...answers, [question.id]: value })
                      }
                      className="flex flex-wrap gap-3"
                    >
                      {[
                        { value: "1", label: "Poor" },
                        { value: "2", label: "Fair" },
                        { value: "3", label: "Good" },
                        { value: "4", label: "Very Good" },
                        { value: "5", label: "Excellent" },
                      ].map((option) => (
                        <div key={option.value} className="flex items-center gap-1.5">
                          <RadioGroupItem
                            value={option.value}
                            id={`q${question.id}-${option.value}`}
                          />
                          <Label
                            htmlFor={`q${question.id}-${option.value}`}
                            className="text-sm cursor-pointer"
                          >
                            {option.label}
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                  )}

                  {question.responseType === "yes_no" && (
                    <RadioGroup
                      value={answers[question.id] || ""}
                      onValueChange={(value) =>
                        setAnswers({ ...answers, [question.id]: value })
                      }
                      className="flex gap-6"
                    >
                      <div className="flex items-center gap-1.5">
                        <RadioGroupItem
                          value="yes"
                          id={`q${question.id}-yes`}
                        />
                        <Label
                          htmlFor={`q${question.id}-yes`}
                          className="text-sm cursor-pointer"
                        >
                          Yes
                        </Label>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <RadioGroupItem
                          value="no"
                          id={`q${question.id}-no`}
                        />
                        <Label
                          htmlFor={`q${question.id}-no`}
                          className="text-sm cursor-pointer"
                        >
                          No
                        </Label>
                      </div>
                    </RadioGroup>
                  )}

                  {question.responseType === "text" && (
                    <Textarea
                      placeholder="Enter your response..."
                      rows={3}
                      value={answers[question.id] || ""}
                      onChange={(e) =>
                        setAnswers({ ...answers, [question.id]: e.target.value })
                      }
                    />
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Overall Comment */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Overall Comment</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="Share any additional comments about this candidate's clinical performance, work ethic, or any other relevant information..."
              rows={4}
              value={overallComment}
              onChange={(e) => setOverallComment(e.target.value)}
            />
          </CardContent>
        </Card>

        {/* Attestation & Signature */}
        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle className="text-base">Attestation & Signature</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-muted/50 p-4 rounded-lg">
              <p className="text-sm">
                I certify that the information provided in this reference evaluation
                is accurate and based on my direct professional experience with the
                candidate. I understand that this information will be used for
                employment verification purposes and may be shared with authorized
                parties through the MyZipVault platform.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="ref-signature">Digital Signature (Full Legal Name)</Label>
              <Input
                id="ref-signature"
                placeholder="Type your full legal name"
                value={digitalSignature}
                onChange={(e) => setDigitalSignature(e.target.value)}
              />
            </div>
            <Button
              className="w-full gap-2"
              size="lg"
              disabled={isSubmitting}
              onClick={handleSubmit}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="size-4" />
                  Submit Reference
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center pb-6">
          <p className="text-xs text-muted-foreground">
            Powered by MyZipVault · Secure Healthcare Credential Verification
          </p>
        </div>
      </div>
    </div>
  );
}
