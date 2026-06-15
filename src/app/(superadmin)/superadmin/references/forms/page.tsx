"use client";

import { useState, useEffect, useCallback } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ChevronUp,
  ChevronDown,
  Eye,
  Loader2,
  Pencil,
  Save,
  GripVertical,
  Star,
  FileSignature,
  ListChecks,
  Plus,
} from "@/lib/icons";
import { toast } from "sonner";
import Link from "next/link";

interface QuestionItem {
  id: number;
  employment_status: string;
  question_text: string;
  response_type: string;
  sort_order: number;
}

interface FormsData {
  questions: QuestionItem[];
  grouped: Record<string, QuestionItem[]>;
  employmentStatuses: string[];
}

const empStatusLabel: Record<string, string> = {
  current: "Currently Working",
  ending_contract: "Ending Contract",
  past: "Past Employment",
};

const empTabIcon: Record<string, string> = {
  current: "🟢",
  ending_contract: "🟡",
  past: "⚪",
};

function getResponseTypeBadge(type: string) {
  switch (type) {
    case "rating_1_4":
      return <Badge className="bg-primary/10 text-primary border-0">1-4 Rating</Badge>;
    case "yes_no":
      return <Badge className="bg-blue-100 text-blue-700 border-0">Yes / No</Badge>;
    case "text":
      return <Badge className="bg-gray-100 text-gray-700 border-0">Text</Badge>;
    default:
      return <Badge variant="secondary">{type}</Badge>;
  }
}

export default function RefFormsPage() {
  const [data, setData] = useState<FormsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("current");

  // Preview dialog
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewStatus, setPreviewStatus] = useState("current");

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/superadmin/references/forms");
      if (!res.ok) throw new Error("Failed to fetch");
      const json = await res.json();
      setData(json);
    } catch {
      toast.error("Failed to load form configuration");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const moveQuestion = async (questionId: number, direction: "up" | "down", currentOrder: number) => {
    if (!data) return;
    const questions = data.grouped[activeTab] || [];
    const sorted = [...questions].sort((a, b) => a.sort_order - b.sort_order);
    const idx = sorted.findIndex((q) => q.id === questionId);

    if (direction === "up" && idx === 0) return;
    if (direction === "down" && idx === sorted.length - 1) return;

    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    const swapQ = sorted[swapIdx];

    try {
      setIsSaving(true);
      const res = await fetch("/api/superadmin/references/forms", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          updates: [
            { id: questionId, sort_order: swapQ.sort_order },
            { id: swapQ.id, sort_order: currentOrder },
          ],
        }),
      });
      if (!res.ok) throw new Error("Failed to reorder");
      const json = await res.json();
      setData(json);
      toast.success("Question order updated");
    } catch {
      toast.error("Failed to reorder question");
    } finally {
      setIsSaving(false);
    }
  };

  const toggleEmploymentStatus = async (questionId: number, newStatus: string) => {
    if (!data) return;
    try {
      setIsSaving(true);
      const res = await fetch("/api/superadmin/references/forms", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          updates: [{ id: questionId, employment_status: newStatus }],
        }),
      });
      if (!res.ok) throw new Error("Failed to update");
      const json = await res.json();
      setData(json);
      toast.success("Question status updated");
    } catch {
      toast.error("Failed to update question status");
    } finally {
      setIsSaving(false);
    }
  };

  const openPreview = (status: string) => {
    setPreviewStatus(status);
    setPreviewOpen(true);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Ref Forms Configuration" />
        <div className="space-y-3">
          <Skeleton className="h-12 w-64 rounded" />
          <Skeleton className="h-96 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  const currentQuestions = data?.grouped[activeTab] || [];
  const sortedQuestions = [...currentQuestions].sort((a, b) => a.sort_order - b.sort_order);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Ref Forms Configuration"
        description="Configure which questions appear for each employment status. Reorder, toggle, and preview forms."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => openPreview(activeTab)}>
              <Eye className="size-4" /> Preview Form
            </Button>
            <Button size="sm" className="bg-primary hover:bg-primary-hover text-white" asChild>
              <Link href="/superadmin/references">
                <Plus className="size-4" /> Add Question
              </Link>
            </Button>
          </div>
        }
      />

      {/* Form counts overview */}
      {data && (
        <div className="grid grid-cols-3 gap-4">
          {data.employmentStatuses.map((status) => {
            const count = (data.grouped[status] || []).length;
            return (
              <Card
                key={status}
                className={`cursor-pointer transition-all ${activeTab === status ? "ring-2 ring-[var(--primary)]" : "hover:shadow-md"}`}
                onClick={() => setActiveTab(status)}
              >
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{empTabIcon[status]} {empStatusLabel[status]}</p>
                    <p className="text-xs text-muted-foreground">{count} question(s)</p>
                  </div>
                  <Button variant="ghost" size="icon" className="size-8" onClick={(e) => { e.stopPropagation(); openPreview(status); }}>
                    <Eye className="size-4" />
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Tabs for employment status */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          {data?.employmentStatuses.map((status) => (
            <TabsTrigger key={status} value={status}>
              {empTabIcon[status]} {empStatusLabel[status]} ({(data.grouped[status] || []).length})
            </TabsTrigger>
          ))}
        </TabsList>

        {data?.employmentStatuses.map((status) => (
          <TabsContent key={status} value={status} className="mt-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <ListChecks className="size-4" />
                    Questions for {empStatusLabel[status]}
                  </CardTitle>
                  <Button variant="outline" size="sm" onClick={() => openPreview(status)}>
                    <Eye className="size-4" /> Preview
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {sortedQuestions.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <FileSignature className="size-10 text-muted-foreground mb-3" />
                    <p className="text-sm text-muted-foreground">
                      No questions configured for {empStatusLabel[status]}
                    </p>
                    <Button size="sm" className="mt-3 bg-primary hover:bg-primary-hover text-white" asChild>
                      <Link href="/superadmin/references">Add Questions</Link>
                    </Button>
                  </div>
                ) : (
                  <div className="max-h-96 overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-10"></TableHead>
                          <TableHead className="w-16">Order</TableHead>
                          <TableHead>Question</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead className="w-24">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sortedQuestions.map((q, idx) => (
                          <TableRow key={q.id}>
                            <TableCell>
                              <GripVertical className="size-4 text-muted-foreground" />
                            </TableCell>
                            <TableCell className="text-sm font-mono text-muted-foreground">
                              {idx + 1}
                            </TableCell>
                            <TableCell className="text-sm font-medium max-w-sm">
                              {q.question_text}
                            </TableCell>
                            <TableCell>
                              {getResponseTypeBadge(q.response_type)}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-0.5">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="size-7"
                                  disabled={isSaving || idx === 0}
                                  onClick={() => moveQuestion(q.id, "up", q.sort_order)}
                                >
                                  <ChevronUp className="size-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="size-7"
                                  disabled={isSaving || idx === sortedQuestions.length - 1}
                                  onClick={() => moveQuestion(q.id, "down", q.sort_order)}
                                >
                                  <ChevronDown className="size-3.5" />
                                </Button>
                                <Select
                                  value={q.employment_status}
                                  onValueChange={(v) => toggleEmploymentStatus(q.id, v)}
                                >
                                  <SelectTrigger className="h-7 w-7 p-0 border-0" disabled={isSaving}>
                                    <Pencil className="size-3 text-muted-foreground" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {data.employmentStatuses.map((s) => (
                                      <SelectItem key={s} value={s}>{empStatusLabel[s]}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="size-5" />
              Preview — {empStatusLabel[previewStatus]} Form
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-muted/50 rounded-lg p-4">
              <p className="text-sm font-medium mb-1">Reference Form</p>
              <p className="text-xs text-muted-foreground">
                This is how the reference form will appear to a referee filling out a reference for a candidate with employment status: <strong>{empStatusLabel[previewStatus]}</strong>
              </p>
            </div>

            {(data?.grouped[previewStatus] || [])
              .sort((a, b) => a.sort_order - b.sort_order)
              .map((q, idx) => (
                <Card key={q.id}>
                  <CardContent className="p-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium">
                          {idx + 1}. {q.question_text}
                        </p>
                        {getResponseTypeBadge(q.response_type)}
                      </div>

                      {/* Render form controls */}
                      {q.response_type === "rating_1_4" && (
                        <div className="flex gap-2 mt-2">
                          {[1, 2, 3, 4].map((r) => (
                            <button
                              key={r}
                              className="size-10 rounded-lg font-bold text-sm border-2 border-gray-200 transition-all"
                              style={{
                                backgroundColor:
                                  r === 1 ? "var(--badge-red-bg)" : r === 2 ? "var(--badge-yellow-bg)" : r === 3 ? "var(--badge-blue-bg)" : "var(--primary)",
                                color: r === 1 ? "var(--status-red)" : r === 2 ? "var(--status-amber)" : r === 3 ? "var(--status-blue)" : "white",
                                borderColor:
                                  r === 1 ? "var(--status-red)" : r === 2 ? "var(--status-amber)" : r === 3 ? "var(--status-blue)" : "var(--primary)",
                              }}
                            >
                              {r}
                            </button>
                          ))}
                        </div>
                      )}
                      {q.response_type === "yes_no" && (
                        <div className="flex gap-2 mt-2">
                          <Badge className="bg-emerald-100 text-emerald-700 border-0 cursor-pointer">Yes</Badge>
                          <Badge className="bg-red-100 text-red-700 border-0 cursor-pointer">No</Badge>
                        </div>
                      )}
                      {q.response_type === "text" && (
                        <div className="mt-2 border rounded-lg p-3 bg-muted/30">
                          <p className="text-xs text-muted-foreground italic">Text response area...</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}

            {(data?.grouped[previewStatus] || []).length === 0 && (
              <div className="text-center py-8">
                <p className="text-sm text-muted-foreground">No questions configured for this employment status.</p>
              </div>
            )}

            {/* Signature area */}
            {(data?.grouped[previewStatus] || []).length > 0 && (
              <Card>
                <CardContent className="p-4">
                  <div className="border-t-2 border-dashed pt-4 mt-2">
                    <p className="text-sm font-medium mb-2">Digital Signature</p>
                    <div className="border rounded-lg p-4 bg-muted/30">
                      <p className="text-xs text-muted-foreground italic">Signature area...</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
