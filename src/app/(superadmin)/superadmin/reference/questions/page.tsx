"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Plus,
  Pencil,
  Trash2,
  HelpCircle,
  Loader2,
  Inbox,
  GripVertical,
} from "@/lib/icons";

import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// ─── Types ──────────────────────────────────────────────────────────

interface QuestionItem {
  id: number;
  employmentStatus: string;
  questionText: string;
  responseType: string;
  sortOrder: number;
}

// ─── Badge Helpers ──────────────────────────────────────────────────

function getEmploymentBadge(status: string) {
  switch (status) {
    case "current":
      return (
        <Badge className="text-xs" style={{ background: "#DCFCE7", color: "#166534", border: "none" }}>
          Current
        </Badge>
      );
    case "ending_contract":
      return (
        <Badge className="text-xs" style={{ background: "#FEF3C7", color: "#92400E", border: "none" }}>
          Ending Contract
        </Badge>
      );
    case "past":
      return (
        <Badge className="text-xs" style={{ background: "#F3F4F6", color: "#6B7280", border: "none" }}>
          Past
        </Badge>
      );
    default:
      return <Badge variant="outline" className="text-xs">{status}</Badge>;
  }
}

function getEmploymentLabel(status: string) {
  switch (status) {
    case "current":
      return "Currently Working";
    case "ending_contract":
      return "Ending Contract";
    case "past":
      return "Past";
    default:
      return status;
  }
}

function getResponseTypeBadge(type: string) {
  switch (type) {
    case "rating_5":
      return (
        <Badge className="text-xs" style={{ background: "#DCFCE7", color: "#166534", border: "none" }}>
          1-5 Rating
        </Badge>
      );
    case "rating_3":
      return (
        <Badge className="text-xs" style={{ background: "#DCFCE7", color: "#166534", border: "none" }}>
          1-3 Rating
        </Badge>
      );
    case "yes_no":
      return (
        <Badge className="text-xs" style={{ background: "#DBEAFE", color: "#1E40AF", border: "none" }}>
          Yes/No
        </Badge>
      );
    case "text":
      return (
        <Badge className="text-xs" style={{ background: "#F3F4F6", color: "#6B7280", border: "none" }}>
          Text
        </Badge>
      );
    default:
      return <Badge variant="outline" className="text-xs">{type}</Badge>;
  }
}

// ─── Main Component ─────────────────────────────────────────────────

export default function ReferenceQuestionsPage() {
  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("all");

  // Dialog states
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<QuestionItem | null>(null);
  const [form, setForm] = useState({
    employmentStatus: "current",
    questionText: "",
    responseType: "rating_5",
    sortOrder: 0,
  });

  // Delete dialog
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<QuestionItem | null>(null);

  const fetchQuestions = useCallback(async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (activeTab !== "all") params.set("employmentStatus", activeTab);

      const res = await fetch(`/api/superadmin/reference/questions?${params.toString()}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to fetch questions");
      }
      const data = await res.json();
      setQuestions(data.questions || []);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      toast.error("Failed to load questions", { description: message });
    } finally {
      setIsLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchQuestions();
  }, [fetchQuestions]);

  const openDialog = (question?: QuestionItem) => {
    if (question) {
      setEditingQuestion(question);
      setForm({
        employmentStatus: question.employmentStatus,
        questionText: question.questionText,
        responseType: question.responseType,
        sortOrder: question.sortOrder,
      });
    } else {
      setEditingQuestion(null);
      const defaultStatus = activeTab !== "all" ? activeTab : "current";
      setForm({
        employmentStatus: defaultStatus,
        questionText: "",
        responseType: "rating_5",
        sortOrder: questions.length + 1,
      });
    }
    setDialogOpen(true);
  };

  const saveQuestion = async () => {
    if (!form.questionText.trim()) {
      toast.error("Please enter a question");
      return;
    }

    try {
      setActionLoading(true);
      const payload = editingQuestion
        ? { action: "update", data: { id: editingQuestion.id, ...form } }
        : { action: "create", data: form };

      const res = await fetch("/api/superadmin/reference/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to save question");
      }

      toast.success(
        editingQuestion ? "Question updated successfully" : "Question created successfully"
      );
      setDialogOpen(false);
      fetchQuestions();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      toast.error("Failed to save question", { description: message });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;

    try {
      setActionLoading(true);
      const res = await fetch("/api/superadmin/reference/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", data: { id: deleteTarget.id } }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to delete question");
      }

      toast.success("Question deleted successfully");
      fetchQuestions();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      toast.error("Failed to delete question", { description: message });
    } finally {
      setActionLoading(false);
      setDeleteOpen(false);
      setDeleteTarget(null);
    }
  };

  const filteredQuestions = activeTab === "all"
    ? questions
    : questions.filter((q) => q.employmentStatus === activeTab);

  return (
    <div className="space-y-6 animate-page-fade">
      <PageHeader
        title="Reference Questions"
        description="Create and manage reference questions for each employment status type."
        actions={
          <Button
            onClick={() => openDialog()}
            className="text-white gap-1.5"
            style={{ background: "#166534" }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#14532D")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "#166534")}
          >
            <Plus className="size-4" />
            Add Question
          </Button>
        }
      />

      {/* Employment Status Filter Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="current">Current</TabsTrigger>
          <TabsTrigger value="ending_contract">Ending Contract</TabsTrigger>
          <TabsTrigger value="past">Past</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          <Card className="rounded-xl border" style={{ borderColor: "var(--border)" }}>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="space-y-3 p-4">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="h-14 w-full rounded-lg" />
                  ))}
                </div>
              ) : filteredQuestions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <HelpCircle className="size-10 mb-3" style={{ color: "var(--text-muted)" }} />
                  <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                    No questions found
                  </p>
                  <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                    Click &quot;Add Question&quot; to create one
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">#</TableHead>
                        <TableHead>Question</TableHead>
                        <TableHead>Employment Status</TableHead>
                        <TableHead>Response Type</TableHead>
                        <TableHead>Sort Order</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredQuestions.map((q) => (
                        <TableRow key={q.id}>
                          <TableCell>
                            <div className="flex items-center gap-1.5">
                              <GripVertical className="size-3.5" style={{ color: "var(--text-muted)" }} />
                              <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                                {q.id}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="font-medium max-w-[400px]" style={{ color: "var(--text-primary)" }}>
                            {q.questionText}
                          </TableCell>
                          <TableCell>{getEmploymentBadge(q.employmentStatus)}</TableCell>
                          <TableCell>{getResponseTypeBadge(q.responseType)}</TableCell>
                          <TableCell className="text-sm" style={{ color: "var(--text-muted)" }}>
                            {q.sortOrder}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={() => openDialog(q)}
                                title="Edit question"
                              >
                                <Pencil className="size-3.5" style={{ color: "var(--text-muted)" }} />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={() => {
                                  setDeleteTarget(q);
                                  setDeleteOpen(true);
                                }}
                                title="Delete question"
                              >
                                <Trash2 className="size-3.5 text-red-500" />
                              </Button>
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
      </Tabs>

      {/* Add/Edit Question Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingQuestion ? "Edit Question" : "Add New Question"}
            </DialogTitle>
            <DialogDescription>
              {editingQuestion
                ? "Update the reference question details below."
                : "Create a new reference question for managers to answer."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="questionText">Question Text *</Label>
              <Textarea
                id="questionText"
                placeholder="e.g., How would you rate this candidate's clinical skills?"
                value={form.questionText}
                onChange={(e) => setForm((f) => ({ ...f, questionText: e.target.value }))}
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="employmentStatus">Employment Status *</Label>
                <Select
                  value={form.employmentStatus}
                  onValueChange={(v) => setForm((f) => ({ ...f, employmentStatus: v }))}
                >
                  <SelectTrigger id="employmentStatus">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="current">Currently Working</SelectItem>
                    <SelectItem value="ending_contract">Ending Contract</SelectItem>
                    <SelectItem value="past">Past</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="responseType">Response Type *</Label>
                <Select
                  value={form.responseType}
                  onValueChange={(v) => setForm((f) => ({ ...f, responseType: v }))}
                >
                  <SelectTrigger id="responseType">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="rating_5">1-5 Rating</SelectItem>
                    <SelectItem value="rating_3">1-3 Rating</SelectItem>
                    <SelectItem value="yes_no">Yes/No</SelectItem>
                    <SelectItem value="text">Text</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="sortOrder">Sort Order</Label>
              <Input
                id="sortOrder"
                type="number"
                min={0}
                value={form.sortOrder}
                onChange={(e) => setForm((f) => ({ ...f, sortOrder: parseInt(e.target.value) || 0 }))}
              />
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                Lower numbers appear first. Questions with the same order are sorted by ID.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={actionLoading}>
              Cancel
            </Button>
            <Button
              onClick={saveQuestion}
              disabled={actionLoading}
              className="text-white"
              style={{ background: "#166534" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#14532D")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "#166534")}
            >
              {actionLoading ? (
                <>
                  <Loader2 className="size-4 mr-1 animate-spin" />
                  Saving...
                </>
              ) : editingQuestion ? (
                "Update Question"
              ) : (
                "Create Question"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Question</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this question? All associated responses will also be removed.
              This action cannot be undone.
              <div className="mt-3 rounded-md border p-2" style={{ borderColor: "var(--border)" }}>
                <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                  &quot;{deleteTarget?.questionText}&quot;
                </p>
                <div className="flex items-center gap-2 mt-1">
                  {deleteTarget && getEmploymentBadge(deleteTarget.employmentStatus)}
                  {deleteTarget && getResponseTypeBadge(deleteTarget.responseType)}
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={actionLoading}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              {actionLoading ? (
                <>
                  <Loader2 className="size-4 mr-1 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
