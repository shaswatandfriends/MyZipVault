"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  PenSquare,
  Plus,
  Pencil,
  Trash2,
  Download,
  Upload,
  FileDown,
  Eye,
  FileSpreadsheet,
  AlertTriangle,
  Check,
  CheckCircle2,
  X,
  Loader2,
} from "@/lib/icons";

import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { priorityColors, destructiveColors } from "@/lib/status-colors";

// ─── Types ──────────────────────────────────────────────────────────
interface ReferenceQuestionItem {
  id: number;
  employmentStatus: string;
  questionText: string;
  responseType: string;
  sortOrder: number;
}

interface ContentData {
  checklistTemplates: any[];
  skills: any[];
  referenceQuestions: ReferenceQuestionItem[];
}

interface PreviewRefQuestion {
  id: number;
  questionText: string;
  responseType: string;
  sortOrder: number;
}

// ─── Employment Status Helpers ──────────────────────────────────────
const EMPLOYMENT_STATUS_OPTIONS = [
  { value: "current", label: "Current" },
  { value: "ending_contract", label: "Ending Contract" },
  { value: "past", label: "Past" },
] as const;

const EMPLOYMENT_STATUS_LABELS: Record<string, string> = {
  current: "Currently Working",
  ending_contract: "Ending Contract",
  past: "Past Employment",
};

const RESPONSE_TYPE_OPTIONS = [
  { value: "rating_1_4", label: "1-4 Rating" },
  { value: "yes_no", label: "Yes-No" },
  { value: "text", label: "Text" },
] as const;

// ─── Main Component ─────────────────────────────────────────────────
export default function SuperadminReferencesPage() {
  const [data, setData] = useState<ContentData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // ── Employment status filter
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // ── Question dialog state
  const [questionDialogOpen, setQuestionDialogOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<ReferenceQuestionItem | null>(null);
  const [questionForm, setQuestionForm] = useState({
    employmentStatus: "current",
    questionText: "",
    responseType: "rating_1_4",
    sortOrder: 0,
  });

  // ── Delete confirm dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ReferenceQuestionItem | null>(null);

  // ── Import modal state
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importValidating, setImportValidating] = useState(false);
  const [importImporting, setImportImporting] = useState(false);
  const [importValidationResult, setImportValidationResult] = useState<{
    totalRows: number;
    validRows: number;
    errorRows: number;
    errors: Array<{ row: number; message: string }>;
    preview: Array<{
      employmentStatus: string;
      questionText: string;
      responseType: string;
      sortOrder: string;
    }>;
  } | null>(null);
  const [importResult, setImportResult] = useState<{
    imported: number;
    skipped: number;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Delete All modal state
  const [deleteAllModalOpen, setDeleteAllModalOpen] = useState(false);
  const [deleteAllStep, setDeleteAllStep] = useState<1 | 2>(1);
  const [deleteAllOtp, setDeleteAllOtp] = useState<string[]>([
    "",
    "",
    "",
    "",
    "",
    "",
  ]);
  const [deleteAllSending, setDeleteAllSending] = useState(false);
  const [deleteAllDeleting, setDeleteAllDeleting] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const otpInputRefs = useRef<Array<HTMLInputElement | null>>([]);

  // ── Preview Form modal state
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewStatus, setPreviewStatus] = useState<string>("current");
  const [previewData, setPreviewData] = useState<{
    employmentStatus: string;
    questions: PreviewRefQuestion[];
    totalQuestions: number;
  } | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  // ── Resend cooldown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  // ─── Fetch content ────────────────────────────────────────────────
  const fetchContent = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/admin/content");
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to fetch content");
      }
      const json = (await res.json()) as ContentData;
      setData(json);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      toast.error("Failed to load content", { description: message });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchContent();
  }, [fetchContent]);

  // ─── CRUD helper ──────────────────────────────────────────────────
  const performAction = async (
    type: string,
    action: string,
    data: Record<string, unknown>
  ) => {
    try {
      setActionLoading(true);
      const res = await fetch("/api/admin/content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, action, data }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Action failed");
      }
      toast.success(
        `Successfully ${action === "create" ? "created" : action === "update" ? "updated" : "deleted"} ${type.replace("_", " ")}`
      );
      fetchContent();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      toast.error("Action failed", { description: message });
    } finally {
      setActionLoading(false);
    }
  };

  // ─── Question handlers ───────────────────────────────────────────
  const openQuestionDialog = (question?: ReferenceQuestionItem) => {
    if (question) {
      setEditingQuestion(question);
      setQuestionForm({
        employmentStatus: question.employmentStatus,
        questionText: question.questionText,
        responseType: question.responseType,
        sortOrder: question.sortOrder,
      });
    } else {
      setEditingQuestion(null);
      setQuestionForm({
        employmentStatus: "current",
        questionText: "",
        responseType: "rating_1_4",
        sortOrder: 0,
      });
    }
    setQuestionDialogOpen(true);
  };

  const saveQuestion = async () => {
    if (!questionForm.questionText || !questionForm.employmentStatus) {
      toast.error("Please fill in all required fields");
      return;
    }
    if (editingQuestion) {
      await performAction("reference_question", "update", {
        id: editingQuestion.id,
        ...questionForm,
      });
    } else {
      await performAction("reference_question", "create", questionForm);
    }
    setQuestionDialogOpen(false);
  };

  // ─── Delete handler ──────────────────────────────────────────────
  const confirmDelete = async () => {
    if (!deleteTarget) return;
    await performAction("reference_question", "delete", { id: deleteTarget.id });
    setDeleteDialogOpen(false);
    setDeleteTarget(null);
  };

  // ─── Export Template ──────────────────────────────────────────────
  const handleExportTemplate = () => {
    window.open("/api/admin/reference-questions/export-template", "_blank");
  };

  // ─── Export Current Data ──────────────────────────────────────────
  const handleExportData = () => {
    window.open("/api/admin/reference-questions/export-data", "_blank");
  };

  // ─── Import handlers ──────────────────────────────────────────────
  const handleImportFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.name.endsWith(".xlsx")) {
        toast.error("Only .xlsx files are accepted");
        return;
      }
      setImportFile(file);
      setImportValidationResult(null);
      setImportResult(null);
    }
  };

  const handleValidate = async () => {
    if (!importFile) return;
    try {
      setImportValidating(true);
      const formData = new FormData();
      formData.append("file", importFile);
      const res = await fetch("/api/admin/reference-questions/validate-import", {
        method: "POST",
        body: formData,
      });
      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || "Validation failed");
      }
      setImportValidationResult(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      toast.error("Validation failed", { description: message });
    } finally {
      setImportValidating(false);
    }
  };

  const handleImport = async () => {
    if (!importFile) return;
    try {
      setImportImporting(true);
      const formData = new FormData();
      formData.append("file", importFile);
      const res = await fetch("/api/admin/reference-questions/import", {
        method: "POST",
        body: formData,
      });
      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || "Import failed");
      }
      setImportResult(result);
      fetchContent();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      toast.error("Import failed", { description: message });
    } finally {
      setImportImporting(false);
    }
  };

  const resetImportModal = () => {
    setImportFile(null);
    setImportValidationResult(null);
    setImportResult(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // ─── Delete All handlers ──────────────────────────────────────────
  const handleRequestOtp = async () => {
    try {
      setDeleteAllSending(true);
      const res = await fetch("/api/admin/reference-questions/request-delete-otp", {
        method: "POST",
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to send code");
      setDeleteAllStep(2);
      setResendCooldown(60);
      toast.success("Verification code sent to your email");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      toast.error("Failed to send code", { description: message });
    } finally {
      setDeleteAllSending(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) return;
    const newOtp = [...deleteAllOtp];
    newOtp[index] = value;
    setDeleteAllOtp(newOtp);
    // Auto advance
    if (value && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, 6);
    const newOtp = [...deleteAllOtp];
    for (let i = 0; i < 6; i++) {
      newOtp[i] = pasted[i] || "";
    }
    setDeleteAllOtp(newOtp);
  };

  const handleDeleteAll = async () => {
    const otpValue = deleteAllOtp.join("");
    if (otpValue.length !== 6) return;
    try {
      setDeleteAllDeleting(true);
      const res = await fetch("/api/admin/reference-questions/delete-all", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ otp: otpValue }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to delete");
      toast.success("All reference questions have been permanently deleted");
      setDeleteAllModalOpen(false);
      setDeleteAllStep(1);
      setDeleteAllOtp(["", "", "", "", "", ""]);
      fetchContent();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      toast.error("Deletion failed", { description: message });
    } finally {
      setDeleteAllDeleting(false);
    }
  };

  // ─── Preview Form handler ────────────────────────────────────────
  const handlePreviewForm = async (status?: string) => {
    const targetStatus = status || previewStatus;
    try {
      setPreviewLoading(true);
      setPreviewModalOpen(true);
      const res = await fetch(
        `/api/admin/reference-questions/preview?employment_status=${targetStatus}`
      );
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to load preview");
      setPreviewData(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      toast.error("Preview failed", { description: message });
      setPreviewModalOpen(false);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handlePreviewTabChange = async (status: string) => {
    setPreviewStatus(status);
    try {
      setPreviewLoading(true);
      const res = await fetch(
        `/api/admin/reference-questions/preview?employment_status=${status}`
      );
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to load preview");
      setPreviewData(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      toast.error("Preview failed", { description: message });
    } finally {
      setPreviewLoading(false);
    }
  };

  // ─── Filtered questions ──────────────────────────────────────────
  const filteredQuestions =
    data?.referenceQuestions.filter(
      (q) => statusFilter === "all" || q.employmentStatus === statusFilter
    ) ?? [];

  // ─── Rating button style helper ───────────────────────────────────
  const getRatingBtnClass = (rating: number, selected: number | null) => {
    const isSelected = selected === rating;
    const base =
      "w-10 h-10 rounded-lg font-bold text-sm border-2 transition-all ";
    const colors = priorityColors[rating];
    if (!colors) return base;

    switch (rating) {
      case 1:
        return (
          base +
          (isSelected
            ? `${colors.bg} border-status-red ${colors.text}`
            : "border-border text-text-muted hover:border-status-red hover:text-status-red")
        );
      case 2:
        return (
          base +
          (isSelected
            ? `${colors.bg} border-status-amber ${colors.text}`
            : "border-border text-text-muted hover:border-status-amber hover:text-status-amber")
        );
      case 3:
        return (
          base +
          (isSelected
            ? `${colors.bg} border-status-blue ${colors.text}`
            : "border-border text-text-muted hover:border-status-blue hover:text-status-blue")
        );
      case 4:
        return (
          base +
          (isSelected
            ? "bg-primary border-primary text-primary-foreground"
            : "border-border text-text-muted hover:border-primary hover:text-primary")
        );
      default:
        return base;
    }
  };

  // ─── Status badge color helper ────────────────────────────────────
  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "current":
        return "bg-primary-light text-primary border-primary/30 hover:bg-primary-light";
      case "ending_contract":
        return "bg-status-amber-bg text-status-amber border-status-amber/30 hover:bg-status-amber-bg";
      case "past":
        return "bg-surface-2 text-text-secondary border-border hover:bg-surface-2";
      default:
        return "";
    }
  };

  const formatStatusLabel = (status: string) => {
    return EMPLOYMENT_STATUS_LABELS[status] || status;
  };

  const formatResponseType = (type: string) => {
    const found = RESPONSE_TYPE_OPTIONS.find((o) => o.value === type);
    return found ? found.label : type;
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reference Questions"
        description="Manage reference questions, import/export, preview, and delete all data."
      />

      {/* ═══════════════════════════════════════════════════════════════
          Main Card
      ═══════════════════════════════════════════════════════════════ */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <CardTitle className="text-base">Reference Questions</CardTitle>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {EMPLOYMENT_STATUS_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                className="bg-primary hover:bg-primary-hover text-primary-foreground"
                onClick={() => openQuestionDialog()}
              >
                <Plus className="size-4" />
                Add Question
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleExportTemplate}
              >
                <Download className="size-4" />
                Export Template
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  resetImportModal();
                  setImportModalOpen(true);
                }}
              >
                <Upload className="size-4" />
                Import Data
              </Button>
              <Button variant="ghost" size="sm" onClick={handleExportData}>
                <FileDown className="size-4" />
                Export Current Data
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setPreviewStatus("current");
                  handlePreviewForm("current");
                }}
              >
                <Eye className="size-4" />
                Preview Form
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="border-status-red text-status-red hover:bg-badge-red-bg bg-transparent"
                onClick={() => {
                  setDeleteAllStep(1);
                  setDeleteAllOtp(["", "", "", "", "", ""]);
                  setDeleteAllModalOpen(true);
                }}
              >
                <Trash2 className="size-4" />
                Delete All Data
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full rounded" />
              ))}
            </div>
          ) : filteredQuestions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <PenSquare className="size-10 text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">
                No reference questions found
              </p>
            </div>
          ) : (
            <div className="max-h-96 overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">Order</TableHead>
                    <TableHead>Employment Status</TableHead>
                    <TableHead>Question</TableHead>
                    <TableHead>Response Type</TableHead>
                    <TableHead className="w-24">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredQuestions.map((question) => (
                    <TableRow key={question.id}>
                      <TableCell className="text-sm text-muted-foreground">
                        {question.sortOrder}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={`capitalize ${getStatusBadgeClass(question.employmentStatus)}`}
                        >
                          {question.employmentStatus.replace("_", " ")}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium text-sm max-w-xs truncate">
                        {question.questionText}
                      </TableCell>
                      <TableCell className="text-sm">
                        {formatResponseType(question.responseType)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7"
                            onClick={() => openQuestionDialog(question)}
                          >
                            <Pencil className="size-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7 text-destructive hover:text-destructive"
                            onClick={() => {
                              setDeleteTarget(question);
                              setDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="size-3.5" />
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

      {/* ── Add/Edit Question Dialog ─────────────────────────────────── */}
      <Dialog
        open={questionDialogOpen}
        onOpenChange={setQuestionDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingQuestion ? "Edit Question" : "Add Question"}
            </DialogTitle>
            <DialogDescription>
              {editingQuestion
                ? "Update the reference question details."
                : "Create a new reference question for reference forms."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Employment Status</Label>
              <Select
                value={questionForm.employmentStatus}
                onValueChange={(val) =>
                  setQuestionForm((f) => ({ ...f, employmentStatus: val }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select employment status" />
                </SelectTrigger>
                <SelectContent>
                  {EMPLOYMENT_STATUS_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Question Text</Label>
              <Textarea
                rows={3}
                placeholder="e.g. How would you rate this employee's clinical skills?"
                value={questionForm.questionText}
                onChange={(e) =>
                  setQuestionForm((f) => ({
                    ...f,
                    questionText: e.target.value,
                  }))
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Response Type</Label>
                <Select
                  value={questionForm.responseType}
                  onValueChange={(val) =>
                    setQuestionForm((f) => ({ ...f, responseType: val }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {RESPONSE_TYPE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Sort Order</Label>
                <Input
                  type="number"
                  value={questionForm.sortOrder}
                  onChange={(e) =>
                    setQuestionForm((f) => ({
                      ...f,
                      sortOrder: parseInt(e.target.value) || 0,
                    }))
                  }
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setQuestionDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              className="bg-primary hover:bg-primary-hover text-primary-foreground"
              onClick={saveQuestion}
              disabled={actionLoading}
            >
              {editingQuestion ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation Dialog ─────────────────────────────── */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this question? This action cannot
              be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={actionLoading}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══════════════════════════════════════════════════════════════
          Import Modal
      ═══════════════════════════════════════════════════════════════ */}
      <Dialog
        open={importModalOpen}
        onOpenChange={(open) => {
          setImportModalOpen(open);
          if (!open) resetImportModal();
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Import Reference Questions</DialogTitle>
            <DialogDescription>
              Upload an Excel file to import reference questions into the
              database.
            </DialogDescription>
          </DialogHeader>

          {!importResult ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Card 1 - Download Template */}
                <Card className="border-2 border-dashed border-border hover:border-primary/30 transition-colors">
                  <CardContent className="p-6 flex flex-col items-center text-center gap-3">
                    <FileSpreadsheet className="size-8 text-primary" />
                    <h3 className="font-semibold text-sm">
                      Download Template
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Download the Excel template with correct column format.
                      Fill it in and upload it back.
                    </p>
                    <Button
                      variant="secondary"
                      className="w-full"
                      onClick={handleExportTemplate}
                    >
                      <Download className="size-4" />
                      Download Excel Template
                    </Button>
                  </CardContent>
                </Card>

                {/* Card 2 - Upload Data */}
                <Card className="border-2 border-dashed border-border hover:border-primary/30 transition-colors">
                  <CardContent className="p-6 flex flex-col items-center text-center gap-3">
                    <Upload className="size-8 text-status-amber" />
                    <h3 className="font-semibold text-sm">Upload Data</h3>
                    <p className="text-xs text-muted-foreground">
                      Upload your completed Excel file. Data will be validated
                      before import.
                    </p>
                    <div className="w-full">
                      <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-border rounded-lg cursor-pointer hover:bg-surface-2 transition-colors">
                        {importFile ? (
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="size-5 text-primary" />
                            <span className="text-sm font-medium">
                              {importFile.name}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              ({(importFile.size / 1024).toFixed(1)} KB)
                            </span>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center gap-1">
                            <Upload className="size-5 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">
                              .xlsx files only
                            </span>
                          </div>
                        )}
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept=".xlsx"
                          className="hidden"
                          onChange={handleImportFileSelect}
                        />
                      </label>
                    </div>
                    <Button
                      className="w-full bg-primary hover:bg-primary-hover text-primary-foreground"
                      disabled={!importFile || importValidating}
                      onClick={handleValidate}
                    >
                      {importValidating ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Upload className="size-4" />
                      )}
                      Upload &amp; Validate
                    </Button>
                  </CardContent>
                </Card>
              </div>

              {/* Warning box */}
              <div className="bg-badge-yellow-bg border border-status-amber rounded-lg p-4 flex gap-3">
                <AlertTriangle className="size-5 text-status-amber flex-shrink-0 mt-0.5" />
                <p className="text-sm text-status-amber-dark">
                  Importing will <strong>ADD</strong> new questions to existing
                  data. To replace all data, use Delete All Data first, then
                  import. Duplicate questions (same Employment Status + Question
                  Text) will be skipped.
                </p>
              </div>

              {/* Validation Results */}
              {importValidationResult && (
                <div className="space-y-3">
                  {importValidationResult.errorRows > 0 && (
                    <div className="bg-status-red-bg border border-status-red-border rounded-lg p-4">
                      <p className="text-sm font-semibold text-status-red-dark">
                        {importValidationResult.errorRows} row(s) have errors
                      </p>
                      <div className="mt-2 max-h-32 overflow-y-auto text-xs text-status-red-dark space-y-1">
                        {importValidationResult.errors
                          .slice(0, 10)
                          .map((e, i) => (
                            <p key={i}>
                              Row {e.row}: {e.message}
                            </p>
                          ))}
                        {importValidationResult.errors.length > 10 && (
                          <p>
                            ...and {importValidationResult.errors.length - 10}{" "}
                            more errors
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                  {importValidationResult.validRows > 0 && (
                    <div className="bg-primary-light border border-status-green-border rounded-lg p-4">
                      <p className="text-sm font-semibold text-primary">
                        {importValidationResult.validRows} valid row(s) found
                        out of {importValidationResult.totalRows} total
                      </p>
                      {importValidationResult.preview.length > 0 && (
                        <div className="mt-3 overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="text-xs">
                                  Employment Status
                                </TableHead>
                                <TableHead className="text-xs">
                                  Question Text
                                </TableHead>
                                <TableHead className="text-xs">
                                  Response Type
                                </TableHead>
                                <TableHead className="text-xs">Order</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {importValidationResult.preview
                                .slice(0, 5)
                                .map((row, i) => (
                                  <TableRow key={i}>
                                    <TableCell className="text-xs">
                                      {row.employmentStatus}
                                    </TableCell>
                                    <TableCell className="text-xs max-w-[200px] truncate">
                                      {row.questionText}
                                    </TableCell>
                                    <TableCell className="text-xs">
                                      {row.responseType}
                                    </TableCell>
                                    <TableCell className="text-xs">
                                      {row.sortOrder}
                                    </TableCell>
                                  </TableRow>
                                ))}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                      <div className="mt-4 flex gap-2">
                        <Button
                          className="bg-primary hover:bg-primary-hover text-primary-foreground"
                          onClick={handleImport}
                          disabled={importImporting}
                        >
                          {importImporting ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : null}
                          Import {importValidationResult.validRows} Valid Rows
                        </Button>
                        <Button
                          variant="ghost"
                          onClick={() => {
                            setImportModalOpen(false);
                            resetImportModal();
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            /* Import Success */
            <div className="flex flex-col items-center py-8 text-center gap-3">
              <div className="size-16 rounded-full bg-primary-light flex items-center justify-center">
                <Check className="size-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold">
                {importResult.imported} questions imported successfully
              </h3>
              {importResult.skipped > 0 && (
                <p className="text-sm text-muted-foreground">
                  {importResult.skipped} duplicates skipped
                </p>
              )}
              <Button
                className="mt-4 bg-primary hover:bg-primary-hover text-primary-foreground"
                onClick={() => {
                  setImportModalOpen(false);
                  resetImportModal();
                }}
              >
                Close
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ═══════════════════════════════════════════════════════════════
          Delete All Data Modal
      ═══════════════════════════════════════════════════════════════ */}
      <Dialog
        open={deleteAllModalOpen}
        onOpenChange={setDeleteAllModalOpen}
      >
        <DialogContent>
          {deleteAllStep === 1 ? (
            <>
              <DialogHeader>
                <DialogTitle className="text-center">
                  Delete All Data?
                </DialogTitle>
              </DialogHeader>
              <div className="flex flex-col items-center gap-4">
                <div className="size-16 rounded-full bg-status-red-bg flex items-center justify-center">
                  <AlertTriangle className="size-8 text-status-red" />
                </div>
                <div className="bg-status-red-bg border border-status-red-border rounded-lg p-4 w-full">
                  <p className="text-sm text-status-red-dark font-medium">
                    This will permanently delete:
                  </p>
                  <ul className="mt-2 text-sm text-status-red-dark list-disc list-inside space-y-1">
                    <li>All professions</li>
                    <li>All job titles</li>
                    <li>All specialties</li>
                    <li>All categories</li>
                    <li>All skills</li>
                    <li>All reference questions</li>
                  </ul>
                  <p className="mt-3 text-sm text-status-red-dark font-semibold">
                    This action cannot be undone.
                  </p>
                  <p className="mt-1 text-sm text-status-red-dark">
                    To proceed, you will need to verify with a one-time code.
                  </p>
                </div>
              </div>
              <DialogFooter className="gap-2">
                <Button
                  variant="ghost"
                  onClick={() => setDeleteAllModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  className={`${destructiveColors.buttonBg} ${destructiveColors.buttonText}`}
                  onClick={handleRequestOtp}
                  disabled={deleteAllSending}
                >
                  {deleteAllSending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : null}
                  Continue to Verification →
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Verify Your Identity</DialogTitle>
                <DialogDescription>
                  A one-time verification code has been sent to your registered
                  email.
                </DialogDescription>
              </DialogHeader>
              <div className="flex flex-col items-center gap-4">
                <div
                  className="flex gap-2 justify-center"
                  onPaste={handleOtpPaste}
                >
                  {deleteAllOtp.map((digit, i) => (
                    <Input
                      key={i}
                      ref={(el) => {
                        otpInputRefs.current[i] = el;
                      }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) =>
                        handleOtpChange(i, e.target.value.replace(/\D/g, ""))
                      }
                      className="w-12 h-14 text-center text-2xl font-bold"
                      autoFocus={i === 0}
                    />
                  ))}
                </div>
                <div className="text-center">
                  <button
                    className="text-sm text-primary hover:underline disabled:opacity-50 disabled:no-underline"
                    onClick={handleRequestOtp}
                    disabled={resendCooldown > 0 || deleteAllSending}
                  >
                    {resendCooldown > 0
                      ? `Resend Code (${resendCooldown}s)`
                      : "Resend Code"}
                  </button>
                </div>
                <Button
                  className={`w-full ${destructiveColors.buttonBg} ${destructiveColors.buttonText}`}
                  onClick={handleDeleteAll}
                  disabled={
                    deleteAllOtp.join("").length !== 6 || deleteAllDeleting
                  }
                >
                  {deleteAllDeleting ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : null}
                  Permanently Delete All Data
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ═══════════════════════════════════════════════════════════════
          Preview Form Modal (full-screen)
      ═══════════════════════════════════════════════════════════════ */}
      {previewModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
          onClick={() => setPreviewModalOpen(false)}
        >
          <div
            className="bg-background rounded-xl w-full max-w-[860px] max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-lg font-semibold">
                Reference Form Preview
              </h2>
              <button
                onClick={() => setPreviewModalOpen(false)}
                className="size-8 flex items-center justify-center rounded-lg hover:bg-surface-2"
              >
                <X className="size-5" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6">
              {previewLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="size-8 animate-spin text-muted-foreground" />
                </div>
              ) : previewData ? (
                <div className="space-y-6">
                  {/* Employment Status Tabs */}
                  <div className="flex gap-2">
                    {[
                      {
                        value: "current",
                        label: "Currently Working",
                      },
                      {
                        value: "ending_contract",
                        label: "Ending Contract",
                      },
                      {
                        value: "past",
                        label: "Past Employment",
                      },
                    ].map((tab) => (
                      <button
                        key={tab.value}
                        onClick={() => handlePreviewTabChange(tab.value)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                          previewStatus === tab.value
                            ? "bg-primary text-primary-foreground"
                            : "bg-surface-2 text-text-secondary hover:bg-surface-2"
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  {/* Rating scale legend */}
                  <div className="bg-surface-2 rounded-lg p-4">
                    <p className="text-xs font-semibold text-muted-foreground mb-2">
                      Rating Scale:
                    </p>
                    <div className="grid grid-cols-4 gap-2">
                      <div className="flex items-center gap-2 text-xs">
                        <div className={`size-6 rounded ${priorityColors[1].bg} border-2 border-status-red flex items-center justify-center font-bold ${priorityColors[1].text}`}>
                          1
                        </div>
                        <span>No theory / experience</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <div className={`size-6 rounded ${priorityColors[2].bg} border-2 border-status-amber flex items-center justify-center font-bold ${priorityColors[2].text}`}>
                          2
                        </div>
                        <span>Limited Experience</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <div className={`size-6 rounded ${priorityColors[3].bg} border-2 border-status-blue flex items-center justify-center font-bold ${priorityColors[3].text}`}>
                          3
                        </div>
                        <span>Experienced</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <div className="size-6 rounded bg-primary border-2 border-primary flex items-center justify-center font-bold text-primary-foreground">
                          4
                        </div>
                        <span>Proficient</span>
                      </div>
                    </div>
                  </div>

                  {/* Questions list */}
                  <div className="space-y-3">
                    {previewData.questions.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-8 text-center">
                        <PenSquare className="size-8 text-muted-foreground mb-2" />
                        <p className="text-sm text-muted-foreground">
                          No questions configured for this employment status
                        </p>
                      </div>
                    ) : (
                      previewData.questions.map((question, idx) => (
                        <div
                          key={question.id}
                          className="flex items-start justify-between py-3 border-b border-border gap-4"
                        >
                          <div className="flex items-start gap-3 flex-1">
                            <span className="text-sm text-muted-foreground font-medium mt-0.5">
                              {idx + 1}.
                            </span>
                            <span className="text-sm flex-1">
                              {question.questionText}
                            </span>
                          </div>
                          <div className="flex-shrink-0">
                            {question.responseType === "rating_1_4" ? (
                              <div className="flex gap-2">
                                {[1, 2, 3, 4].map((r) => (
                                  <button
                                    key={r}
                                    className={getRatingBtnClass(r, null)}
                                  >
                                    {r}
                                  </button>
                                ))}
                              </div>
                            ) : question.responseType === "yes_no" ? (
                              <div className="flex gap-2">
                                <button className="px-4 h-10 rounded-lg border-2 border-border text-text-muted text-sm font-medium hover:border-primary hover:text-primary">
                                  Yes
                                </button>
                                <button className="px-4 h-10 rounded-lg border-2 border-border text-text-muted text-sm font-medium hover:border-status-red hover:text-status-red">
                                  No
                                </button>
                              </div>
                            ) : (
                              <Textarea
                                placeholder="Enter response..."
                                disabled
                                className="w-48 h-10 text-sm"
                              />
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Overall Comment */}
                  <Card className="border-dashed">
                    <CardContent className="p-4">
                      <Label className="text-sm font-medium">
                        Overall Comment
                      </Label>
                      <Textarea
                        rows={3}
                        placeholder="Enter overall comments about this candidate..."
                        disabled
                        className="mt-2"
                      />
                    </CardContent>
                  </Card>

                  {/* Attestation + Signature section */}
                  <Card className="border-dashed">
                    <CardContent className="p-4 space-y-4">
                      <Label className="text-sm font-medium">
                        Attestation
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        I hereby attest that the information provided in this
                        reference form is true and accurate to the best of my
                        knowledge. I understand that providing false information
                        may result in disciplinary action.
                      </p>
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">
                          Digital Signature
                        </Label>
                        <div className="h-16 border-2 border-dashed border-border rounded-lg flex items-center justify-center text-sm text-muted-foreground">
                          Signature area (disabled in preview)
                        </div>
                        <Input
                          placeholder="Type your full name"
                          disabled
                          className="mt-2"
                        />
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <div className="flex items-center justify-center py-12 text-muted-foreground">
                  Loading preview...
                </div>
              )}
            </div>

            {/* Footer */}
            {previewData && (
              <div className="px-6 py-3 border-t bg-surface-2 flex items-center justify-between text-sm text-muted-foreground">
                <span>
                  {previewData.totalQuestions} questions for{" "}
                  {formatStatusLabel(previewData.employmentStatus)}
                </span>
                <span>This is how managers see this form</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
