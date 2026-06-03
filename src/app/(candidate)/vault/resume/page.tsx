"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Upload,
  Pencil,
  FileText,
  X,
  Plus,
  Trash2,
  Download,
  Loader2,
  Calendar,
  User,
  Briefcase,
  GraduationCap,
  Award,
  Wrench,
} from "lucide-react";
import { toast } from "sonner";

interface ResumeData {
  id: number;
  fileUrl: string | null;
  isBuilderResume: boolean;
  createdAt: string;
  parsedData: ResumeParsedData | null;
}

interface ResumeParsedData {
  contact?: {
    fullName?: string;
    phone?: string;
    email?: string;
    address?: string;
  };
  summary?: string;
  experience?: {
    facility: string;
    unit: string;
    startDate: string;
    endDate: string;
    description: string;
  }[];
  education?: {
    school: string;
    degree: string;
    year: string;
  }[];
  certifications?: {
    name: string;
    issuingOrg: string;
    year: string;
  }[];
  skills?: {
    skill: string;
    proficiency: string;
  }[];
}

type PageMode = "loading" | "no-resume" | "builder" | "view";

export default function CandidateResumePage() {
  const [mode, setMode] = useState<PageMode>("loading");
  const [resume, setResume] = useState<ResumeData | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Builder state
  const [contact, setContact] = useState({
    fullName: "",
    phone: "",
    email: "",
    address: "",
  });
  const [summary, setSummary] = useState("");
  const [experiences, setExperiences] = useState<
    ResumeParsedData["experience"]
  >([]);
  const [education, setEducation] = useState<ResumeParsedData["education"]>([]);
  const [certifications, setCertifications] = useState<
    ResumeParsedData["certifications"]
  >([]);
  const [skills, setSkills] = useState<ResumeParsedData["skills"]>([]);

  const fetchResume = useCallback(async () => {
    try {
      const res = await fetch("/api/candidate/resume");
      if (!res.ok) throw new Error("Failed to fetch resume");
      const data = await res.json();
      if (data.resume) {
        setResume(data.resume);
        setMode("view");
      } else {
        setMode("no-resume");
      }
    } catch {
      toast.error("Failed to load resume");
      setMode("no-resume");
    }
  }, []);

  useEffect(() => {
    fetchResume();
  }, [fetchResume]);

  const populateBuilderFromResume = (data: ResumeParsedData) => {
    if (data.contact) {
      setContact({
        fullName: data.contact.fullName || "",
        phone: data.contact.phone || "",
        email: data.contact.email || "",
        address: data.contact.address || "",
      });
    }
    setSummary(data.summary || "");
    setExperiences(data.experience || []);
    setEducation(data.education || []);
    setCertifications(data.certifications || []);
    setSkills(data.skills || []);
  };

  const handleUpload = async (file: File) => {
    const allowedTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Only PDF and Word documents are accepted");
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/candidate/resume/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error("Upload failed", { description: data.error });
        return;
      }

      toast.success("Resume uploaded successfully!");
      fetchResume();
    } catch {
      toast.error("Failed to upload resume");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleUpload(file);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
  };

  const handleSaveBuilder = async () => {
    setIsSaving(true);
    try {
      const parsedData: ResumeParsedData = {
        contact,
        summary,
        experience: experiences,
        education,
        certifications,
        skills,
      };

      const res = await fetch("/api/candidate/resume", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ parsedData }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error("Save failed", { description: data.error });
        return;
      }

      toast.success("Resume saved successfully!");
      fetchResume();
    } catch {
      toast.error("Failed to save resume");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete your resume?")) return;

    try {
      const res = await fetch("/api/candidate/resume", { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        toast.error("Delete failed", { description: data.error });
        return;
      }
      toast.success("Resume deleted");
      setResume(null);
      setMode("no-resume");
      // Reset builder state
      setContact({ fullName: "", phone: "", email: "", address: "" });
      setSummary("");
      setExperiences([]);
      setEducation([]);
      setCertifications([]);
      setSkills([]);
    } catch {
      toast.error("Failed to delete resume");
    }
  };

  const handleExportPdf = () => {
    toast.info("PDF export will be available soon");
  };

  // Calculate completeness
  const calcCompleteness = (data: ResumeParsedData | null) => {
    if (!data) return 0;
    let total = 6; // contact fields + summary
    let filled = 0;
    if (data.contact?.fullName) filled++;
    if (data.contact?.phone) filled++;
    if (data.contact?.email) filled++;
    if (data.summary) filled++;
    if (data.experience && data.experience.length > 0) { total++; filled++; }
    if (data.education && data.education.length > 0) { total++; filled++; }
    if (data.certifications && data.certifications.length > 0) { total++; filled++; }
    if (data.skills && data.skills.length > 0) { total++; filled++; }
    return Math.round((filled / total) * 100);
  };

  // Loading state
  if (mode === "loading") {
    return (
      <div className="space-y-6">
        <PageHeader title="Resume" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-72 w-full" />
          <Skeleton className="h-72 w-full" />
        </div>
      </div>
    );
  }

  // No Resume State
  if (mode === "no-resume") {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Resume"
          description="Upload or build your professional resume for healthcare positions."
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Upload Option */}
          <Card
            className="border-2 border-dashed hover:border-primary/50 transition-colors cursor-pointer"
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => fileInputRef.current?.click()}
          >
            <CardContent className="flex flex-col items-center justify-center p-8 min-h-[300px]">
              <div className="size-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Upload className="size-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold">Upload Resume</h3>
              <p className="text-sm text-muted-foreground mt-2 text-center max-w-xs">
                Drag & drop your resume file or click to browse
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Accepts PDF and Word documents
              </p>
              {isUploading && (
                <div className="flex items-center gap-2 mt-4 text-primary">
                  <Loader2 className="size-4 animate-spin" />
                  <span className="text-sm">Uploading...</span>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept=".pdf,.doc,.docx"
                onChange={handleFileSelect}
              />
            </CardContent>
          </Card>

          {/* Builder Option */}
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="flex flex-col items-center justify-center p-8 min-h-[300px]">
              <div className="size-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mb-4">
                <Pencil className="size-8 text-emerald-600 dark:text-emerald-400" />
              </div>
              <h3 className="text-lg font-semibold">Use Resume Builder</h3>
              <p className="text-sm text-muted-foreground mt-2 text-center max-w-xs">
                Create a professional healthcare resume step by step with our guided builder
              </p>
              <Button
                className="mt-6 gap-2 bg-emerald-600 hover:bg-emerald-700"
                onClick={() => setMode("builder")}
              >
                <Pencil className="size-4" />
                Start Building
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Builder Mode
  if (mode === "builder") {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Resume Builder"
          description="Build your professional healthcare resume"
          actions={
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  if (resume) setMode("view");
                  else setMode("no-resume");
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveBuilder}
                disabled={isSaving}
                className="gap-2"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Resume"
                )}
              </Button>
              <Button variant="outline" onClick={handleExportPdf} className="gap-2">
                <Download className="size-4" />
                Export as PDF
              </Button>
            </div>
          }
        />

        <Tabs defaultValue="contact" className="space-y-4">
          <TabsList className="flex-wrap">
            <TabsTrigger value="contact" className="gap-1.5">
              <User className="size-3.5" /> Contact
            </TabsTrigger>
            <TabsTrigger value="summary" className="gap-1.5">
              <FileText className="size-3.5" /> Summary
            </TabsTrigger>
            <TabsTrigger value="experience" className="gap-1.5">
              <Briefcase className="size-3.5" /> Experience
            </TabsTrigger>
            <TabsTrigger value="education" className="gap-1.5">
              <GraduationCap className="size-3.5" /> Education
            </TabsTrigger>
            <TabsTrigger value="certifications" className="gap-1.5">
              <Award className="size-3.5" /> Certifications
            </TabsTrigger>
            <TabsTrigger value="skills" className="gap-1.5">
              <Wrench className="size-3.5" /> Skills
            </TabsTrigger>
          </TabsList>

          {/* Contact Tab */}
          <TabsContent value="contact">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Contact Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full Name</Label>
                    <Input
                      id="fullName"
                      placeholder="John Smith"
                      value={contact.fullName}
                      onChange={(e) =>
                        setContact({ ...contact, fullName: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      placeholder="(555) 123-4567"
                      value={contact.phone}
                      onChange={(e) =>
                        setContact({ ...contact, phone: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="john@example.com"
                      value={contact.email}
                      onChange={(e) =>
                        setContact({ ...contact, email: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="address">Address</Label>
                    <Input
                      id="address"
                      placeholder="City, State"
                      value={contact.address}
                      onChange={(e) =>
                        setContact({ ...contact, address: e.target.value })
                      }
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Summary Tab */}
          <TabsContent value="summary">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Professional Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  placeholder="Write a brief summary of your professional background, key skills, and career objectives..."
                  rows={6}
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Experience Tab */}
          <TabsContent value="experience">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Work Experience</CardTitle>
                  <Button
                    size="sm"
                    className="gap-1"
                    onClick={() =>
                      setExperiences([
                        ...experiences,
                        { facility: "", unit: "", startDate: "", endDate: "", description: "" },
                      ])
                    }
                  >
                    <Plus className="size-3.5" /> Add Experience
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {experiences.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Briefcase className="size-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No experience entries yet</p>
                  </div>
                )}
                {experiences.map((exp, idx) => (
                  <div key={idx}>
                    {idx > 0 && <Separator className="mb-4" />}
                    <div className="flex items-start gap-2">
                      <div className="flex-1 space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="space-y-2">
                            <Label>Facility</Label>
                            <Input
                              placeholder="Hospital Name"
                              value={exp.facility}
                              onChange={(e) => {
                                const updated = [...experiences];
                                updated[idx] = { ...exp, facility: e.target.value };
                                setExperiences(updated);
                              }}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Unit / Department</Label>
                            <Input
                              placeholder="ICU, ER, Med-Surg..."
                              value={exp.unit}
                              onChange={(e) => {
                                const updated = [...experiences];
                                updated[idx] = { ...exp, unit: e.target.value };
                                setExperiences(updated);
                              }}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Start Date</Label>
                            <Input
                              type="month"
                              value={exp.startDate}
                              onChange={(e) => {
                                const updated = [...experiences];
                                updated[idx] = { ...exp, startDate: e.target.value };
                                setExperiences(updated);
                              }}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>End Date</Label>
                            <Input
                              type="month"
                              placeholder="Present"
                              value={exp.endDate}
                              onChange={(e) => {
                                const updated = [...experiences];
                                updated[idx] = { ...exp, endDate: e.target.value };
                                setExperiences(updated);
                              }}
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>Description</Label>
                          <Textarea
                            placeholder="Describe your responsibilities and achievements..."
                            rows={3}
                            value={exp.description}
                            onChange={(e) => {
                              const updated = [...experiences];
                              updated[idx] = { ...exp, description: e.target.value };
                              setExperiences(updated);
                            }}
                          />
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive shrink-0 mt-6"
                        onClick={() =>
                          setExperiences(experiences.filter((_, i) => i !== idx))
                        }
                      >
                        <X className="size-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Education Tab */}
          <TabsContent value="education">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Education</CardTitle>
                  <Button
                    size="sm"
                    className="gap-1"
                    onClick={() =>
                      setEducation([
                        ...education,
                        { school: "", degree: "", year: "" },
                      ])
                    }
                  >
                    <Plus className="size-3.5" /> Add Education
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {education.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <GraduationCap className="size-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No education entries yet</p>
                  </div>
                )}
                {education.map((edu, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="space-y-2">
                        <Label>School</Label>
                        <Input
                          placeholder="University Name"
                          value={edu.school}
                          onChange={(e) => {
                            const updated = [...education];
                            updated[idx] = { ...edu, school: e.target.value };
                            setEducation(updated);
                          }}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Degree</Label>
                        <Input
                          placeholder="BSN, MSN..."
                          value={edu.degree}
                          onChange={(e) => {
                            const updated = [...education];
                            updated[idx] = { ...edu, degree: e.target.value };
                            setEducation(updated);
                          }}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Year</Label>
                        <Input
                          placeholder="2020"
                          value={edu.year}
                          onChange={(e) => {
                            const updated = [...education];
                            updated[idx] = { ...edu, year: e.target.value };
                            setEducation(updated);
                          }}
                        />
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive shrink-0 mt-6"
                      onClick={() =>
                        setEducation(education.filter((_, i) => i !== idx))
                      }
                    >
                      <X className="size-4" />
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Certifications Tab */}
          <TabsContent value="certifications">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Certifications</CardTitle>
                  <Button
                    size="sm"
                    className="gap-1"
                    onClick={() =>
                      setCertifications([
                        ...certifications,
                        { name: "", issuingOrg: "", year: "" },
                      ])
                    }
                  >
                    <Plus className="size-3.5" /> Add Certification
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {certifications.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Award className="size-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No certifications added yet</p>
                  </div>
                )}
                {certifications.map((cert, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="space-y-2">
                        <Label>Name</Label>
                        <Input
                          placeholder="BLS, ACLS..."
                          value={cert.name}
                          onChange={(e) => {
                            const updated = [...certifications];
                            updated[idx] = { ...cert, name: e.target.value };
                            setCertifications(updated);
                          }}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Issuing Organization</Label>
                        <Input
                          placeholder="AHA, ANCC..."
                          value={cert.issuingOrg}
                          onChange={(e) => {
                            const updated = [...certifications];
                            updated[idx] = { ...cert, issuingOrg: e.target.value };
                            setCertifications(updated);
                          }}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Year</Label>
                        <Input
                          placeholder="2023"
                          value={cert.year}
                          onChange={(e) => {
                            const updated = [...certifications];
                            updated[idx] = { ...cert, year: e.target.value };
                            setCertifications(updated);
                          }}
                        />
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive shrink-0 mt-6"
                      onClick={() =>
                        setCertifications(certifications.filter((_, i) => i !== idx))
                      }
                    >
                      <X className="size-4" />
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Skills Tab */}
          <TabsContent value="skills">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Skills</CardTitle>
                  <Button
                    size="sm"
                    className="gap-1"
                    onClick={() =>
                      setSkills([...skills, { skill: "", proficiency: "Intermediate" }])
                    }
                  >
                    <Plus className="size-3.5" /> Add Skill
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {skills.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Wrench className="size-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No skills added yet</p>
                  </div>
                )}
                {skills.map((s, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label>Skill</Label>
                        <Input
                          placeholder="IV Therapy, Patient Assessment..."
                          value={s.skill}
                          onChange={(e) => {
                            const updated = [...skills];
                            updated[idx] = { ...s, skill: e.target.value };
                            setSkills(updated);
                          }}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Proficiency</Label>
                        <Select
                          value={s.proficiency}
                          onValueChange={(value) => {
                            const updated = [...skills];
                            updated[idx] = { ...s, proficiency: value };
                            setSkills(updated);
                          }}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Beginner">Beginner</SelectItem>
                            <SelectItem value="Intermediate">Intermediate</SelectItem>
                            <SelectItem value="Advanced">Advanced</SelectItem>
                            <SelectItem value="Expert">Expert</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive shrink-0 mt-6"
                      onClick={() =>
                        setSkills(skills.filter((_, i) => i !== idx))
                      }
                    >
                      <X className="size-4" />
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    );
  }

  // View Mode
  const completeness = calcCompleteness(resume?.parsedData ?? null);
  const filename = resume?.fileUrl
    ? resume.fileUrl.startsWith("data:")
      ? "Uploaded Resume"
      : resume.fileUrl.split("/").pop() || "Resume"
    : "Builder Resume";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Resume"
        description="Your professional resume on file"
        actions={
          <div className="flex items-center gap-2">
            {resume?.isBuilderResume && (
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => {
                  if (resume?.parsedData) populateBuilderFromResume(resume.parsedData);
                  setMode("builder");
                }}
              >
                <Pencil className="size-4" />
                Edit in Builder
              </Button>
            )}
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="size-4" />
              Replace
            </Button>
            <Button
              variant="outline"
              className="gap-2 text-destructive hover:text-destructive border-destructive/30 hover:border-destructive/50"
              onClick={handleDelete}
            >
              <Trash2 className="size-4" />
              Delete
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept=".pdf,.doc,.docx"
              onChange={handleFileSelect}
            />
          </div>
        }
      />

      {/* Resume Preview Card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="size-14 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <FileText className="size-7 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold text-lg">{filename}</h3>
                <Badge variant={resume?.isBuilderResume ? "default" : "secondary"} className="text-xs">
                  {resume?.isBuilderResume ? "Builder" : "Uploaded"}
                </Badge>
              </div>
              <div className="flex items-center gap-1 mt-1 text-sm text-muted-foreground">
                <Calendar className="size-3.5" />
                Added {resume?.createdAt ? new Date(resume.createdAt).toLocaleDateString() : "N/A"}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Completeness Progress */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Resume Completeness</span>
            <span className="text-sm font-semibold text-primary">{completeness}%</span>
          </div>
          <Progress value={completeness} className="h-2" />
          <p className="text-xs text-muted-foreground mt-1.5">
            {completeness < 50
              ? "Add more sections to strengthen your resume"
              : completeness < 100
                ? "Almost there! Fill in remaining details"
                : "Your resume is complete!"}
          </p>
        </CardContent>
      </Card>

      {/* Parsed Data Preview Cards */}
      {resume?.parsedData && (
        <div className="space-y-4">
          {/* Contact */}
          {resume.parsedData.contact && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-primary uppercase tracking-wider flex items-center gap-2">
                  <User className="size-4" /> Contact Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                  {resume.parsedData.contact.fullName && (
                    <div><span className="text-muted-foreground">Name:</span> {resume.parsedData.contact.fullName}</div>
                  )}
                  {resume.parsedData.contact.phone && (
                    <div><span className="text-muted-foreground">Phone:</span> {resume.parsedData.contact.phone}</div>
                  )}
                  {resume.parsedData.contact.email && (
                    <div><span className="text-muted-foreground">Email:</span> {resume.parsedData.contact.email}</div>
                  )}
                  {resume.parsedData.contact.address && (
                    <div><span className="text-muted-foreground">Address:</span> {resume.parsedData.contact.address}</div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Summary */}
          {resume.parsedData.summary && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-primary uppercase tracking-wider flex items-center gap-2">
                  <FileText className="size-4" /> Professional Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{resume.parsedData.summary}</p>
              </CardContent>
            </Card>
          )}

          {/* Experience */}
          {resume.parsedData.experience && resume.parsedData.experience.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-primary uppercase tracking-wider flex items-center gap-2">
                  <Briefcase className="size-4" /> Work Experience ({resume.parsedData.experience.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {resume.parsedData.experience.map((exp, idx) => (
                  <div key={idx} className="border-l-2 border-primary/20 pl-3">
                    <p className="font-medium text-sm">{exp.facility}</p>
                    <p className="text-xs text-muted-foreground">{exp.unit}</p>
                    {(exp.startDate || exp.endDate) && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {exp.startDate}{exp.endDate ? ` — ${exp.endDate}` : " — Present"}
                      </p>
                    )}
                    {exp.description && (
                      <p className="text-sm mt-1 text-muted-foreground">{exp.description}</p>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Education */}
          {resume.parsedData.education && resume.parsedData.education.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-primary uppercase tracking-wider flex items-center gap-2">
                  <GraduationCap className="size-4" /> Education ({resume.parsedData.education.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {resume.parsedData.education.map((edu, idx) => (
                    <div key={idx} className="flex items-baseline justify-between text-sm">
                      <span className="font-medium">{edu.school}</span>
                      <span className="text-muted-foreground">{edu.degree} · {edu.year}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Certifications */}
          {resume.parsedData.certifications && resume.parsedData.certifications.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-primary uppercase tracking-wider flex items-center gap-2">
                  <Award className="size-4" /> Certifications ({resume.parsedData.certifications.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {resume.parsedData.certifications.map((cert, idx) => (
                    <Badge key={idx} variant="secondary" className="gap-1">
                      {cert.name}
                      {cert.issuingOrg && <span className="text-muted-foreground">· {cert.issuingOrg}</span>}
                      {cert.year && <span className="text-muted-foreground">· {cert.year}</span>}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Skills */}
          {resume.parsedData.skills && resume.parsedData.skills.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-primary uppercase tracking-wider flex items-center gap-2">
                  <Wrench className="size-4" /> Skills ({resume.parsedData.skills.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {resume.parsedData.skills.map((s, idx) => (
                    <Badge key={idx} variant="outline" className="gap-1">
                      {s.skill}
                      <span className="text-muted-foreground">· {s.proficiency}</span>
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
