"use client";

import { useState, useEffect, useMemo } from "react";
import {
  useSettings,
  useSetting,
  useUpdateSetting,
} from "@/lib/hooks/use-settings";
import {
  usePaymentTypes,
  useCreatePaymentType,
  useUpdatePaymentType,
  useDeletePaymentType,
} from "@/lib/hooks/use-payment-types";
import { useGrades } from "@/lib/hooks/use-grades";
import { useGradeSubjects } from "@/lib/hooks/use-classes";
import {
  useSubExams,
  useCreateSubExam,
  useUpdateSubExam,
  useDeleteSubExam,
} from "@/lib/hooks/use-subexams";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Settings,
  Save,
  Sliders,
  Plus,
  Edit,
  Trash2,
  DollarSign,
  FileText,
  ClipboardList,
  BookOpen,
  GraduationCap,
  Loader2,
} from "lucide-react";
import { useAuthStore } from "@/lib/store/auth-store";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PaymentType, SubExam, ExamType } from "@/lib/types";
import { formatCurrency } from "@/lib/utils/format";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function SettingsPage() {
  const { hasRole } = useAuthStore();

  // Get initial tab from URL query parameter
  const [activeTab, setActiveTab] = useState(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      return params.get("tab") || "system";
    }
    return "system";
  });

  // System Settings
  const {
    data: settingsData,
    isLoading: settingsLoading,
    error: settingsError,
    refetch: refetchSettings,
  } = useSettings();
  const { data: thresholdData } = useSetting("promotionThreshold");
  const updateSetting = useUpdateSetting();
  const [threshold, setThreshold] = useState("60.0");

  // Marks/Sub-Exams
  const { data: gradesData } = useGrades();
  const grades = Array.isArray(gradesData?.data) ? gradesData.data : [];
  const [selectedGradeId, setSelectedGradeId] = useState<string>("");
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("");
  
  const { data: subjectsData, isLoading: subjectsLoading } = useGradeSubjects(selectedGradeId);
  const subjects = Array.isArray(subjectsData?.data) ? subjectsData.data : [];
  
  const { data: subExamsData, isLoading: subExamsLoading } = useSubExams(selectedGradeId, selectedSubjectId);
  
  const createSubExam = useCreateSubExam();
  const updateSubExam = useUpdateSubExam();
  const deleteSubExam = useDeleteSubExam();

  // Sub-Exam Dialog State
  const [subExamDialog, setSubExamDialog] = useState<{
    open: boolean;
    subExam: SubExam | null;
    mode: "create" | "edit";
  }>({
    open: false,
    subExam: null,
    mode: "create",
  });

  const [subExamFormData, setSubExamFormData] = useState({
    name: "",
    examType: "quiz" as ExamType,
    maxScore: 0,
    weightPercent: 0,
  });

  const [deleteSubExamDialog, setDeleteSubExamDialog] = useState<{
    open: boolean;
    subExam: SubExam | null;
  }>({
    open: false,
    subExam: null,
  });

  // Bulk Creation State
  const [bulkDialog, setBulkDialog] = useState<{
    open: boolean;
    loading: boolean;
    results: Array<{ gradeId: string; subjectId: string; gradeName: string; subjectName: string; success: boolean; error?: string }>;
  }>({
    open: false,
    loading: false,
    results: [],
  });
  const [selectedGrades, setSelectedGrades] = useState<string[]>([]);
  const [bulkFormData, setBulkFormData] = useState({
    name: "",
    examType: "quiz" as ExamType,
    maxScore: 0,
    weightPercent: 0,
  });

  // Payment Types
  const {
    data: paymentTypesData,
    isLoading: paymentTypesLoading,
    error: paymentTypesError,
    refetch: refetchPaymentTypes,
  } = usePaymentTypes();
  const createPaymentType = useCreatePaymentType();
  const updatePaymentType = useUpdatePaymentType();
  const deletePaymentType = useDeletePaymentType();

  // Payment Type Dialog State
  const [paymentTypeDialog, setPaymentTypeDialog] = useState<{
    open: boolean;
    paymentType: PaymentType | null;
    mode: "create" | "edit";
  }>({
    open: false,
    paymentType: null,
    mode: "create",
  });

  const [paymentTypeFormData, setPaymentTypeFormData] = useState({
    name: "",
    amount: 0,
    description: "",
    isActive: true,
  });

  const [deletePaymentTypeDialog, setDeletePaymentTypeDialog] = useState<{
    open: boolean;
    paymentType: PaymentType | null;
  }>({
    open: false,
    paymentType: null,
  });

  // Update threshold when data loads
  useEffect(() => {
    if (thresholdData?.data) {
      setThreshold(thresholdData.data.value);
    }
  }, [thresholdData]);

  // Reset subject when grade changes
  useEffect(() => {
    if (selectedGradeId) {
      setSelectedSubjectId("");
    }
  }, [selectedGradeId]);

  // Sub-Exam Handlers
  const handleOpenCreateSubExam = () => {
    if (!selectedSubjectId || !selectedGradeId) return;
    
    // Start with quiz preset (weight = maxScore)
    setSubExamFormData({
      name: "",
      examType: "quiz",
      maxScore: 10,
      weightPercent: 10, // Auto-set to maxScore
    });
    setSubExamDialog({ open: true, subExam: null, mode: "create" });
  };

  const handleOpenBulkCreate = () => {
    setSelectedGrades([]);
    // Start with quiz preset (weight = maxScore)
    setBulkFormData({
      name: "",
      examType: "quiz",
      maxScore: 10,
      weightPercent: 10, // Auto-set to maxScore
    });
    setBulkDialog({ open: true, loading: false, results: [] });
  };

  const handleBulkCreate = async () => {
    if (selectedGrades.length === 0 || selectedSubjectId === "" || !bulkFormData.name || bulkFormData.maxScore <= 0) {
      return;
    }

    // Validate max score limits
    if (bulkFormData.examType === "quiz" || bulkFormData.examType === "assignment") {
      if (bulkFormData.maxScore > 10) {
        toast.error("Max score too high", {
          description: `${bulkFormData.examType === "quiz" ? "Quiz" : "Assignment"} maximum is 10 points.`,
        });
        return;
      }
    } else if (bulkFormData.examType === "mid_exam") {
      if (bulkFormData.maxScore > 20) {
        toast.error("Max score too high", {
          description: "Mid Exam maximum is 20 points.",
        });
        return;
      }
    } else if (bulkFormData.examType === "general_test") {
      if (bulkFormData.maxScore > 40) {
        toast.error("Max score too high", {
          description: "General Test maximum is 40 points.",
        });
        return;
      }
    }

    // Auto-set weight = maxScore
    const finalBulkFormData = {
      ...bulkFormData,
      weightPercent: bulkFormData.maxScore, // Weight equals max score
    };

    setBulkDialog(prev => ({ ...prev, loading: true, results: [] }));
    const results: Array<{ gradeId: string; subjectId: string; gradeName: string; subjectName: string; success: boolean; error?: string }> = [];
    const subject = subjects.find(s => s.id === selectedSubjectId);
    const subjectName = subject?.name || selectedSubjectId;

    for (const gradeId of selectedGrades) {
      const grade = grades.find(g => g.id === gradeId);
      const gradeName = grade?.name || gradeId;
      
      try {
        await createSubExam.mutateAsync({
          gradeId,
          subjectId: selectedSubjectId,
          ...finalBulkFormData,
        });
        results.push({
          gradeId,
          subjectId: selectedSubjectId,
          gradeName,
          subjectName,
          success: true,
        });
      } catch (error: any) {
        results.push({
          gradeId,
          subjectId: selectedSubjectId,
          gradeName,
          subjectName,
          success: false,
          error: error?.response?.data?.message || error?.message || "Failed to create",
        });
    }
    }

    setBulkDialog(prev => ({ ...prev, loading: false, results }));
  };

  const handleOpenEditSubExam = (subExam: SubExam) => {
    setSubExamFormData({
      name: subExam.name,
      examType: subExam.examType,
      maxScore: subExam.maxScore,
      weightPercent: subExam.maxScore, // Auto-set weight = maxScore (weight should equal maxScore)
    });
    setSubExamDialog({ open: true, subExam, mode: "edit" });
  };

  const handleSubmitSubExam = async () => {
    if (!selectedSubjectId || !selectedGradeId) return;

    // Validate max score limits
    if (subExamFormData.examType === "quiz" || subExamFormData.examType === "assignment") {
      if (subExamFormData.maxScore > 10) {
        toast.error("Max score too high", {
          description: `${subExamFormData.examType === "quiz" ? "Quiz" : "Assignment"} maximum is 10 points.`,
        });
        return;
      }
    } else if (subExamFormData.examType === "mid_exam") {
      if (subExamFormData.maxScore > 20) {
        toast.error("Max score too high", {
          description: "Mid Exam maximum is 20 points.",
        });
        return;
      }
      // Check for existing mid exam
      const existingMidExam = subExams.find(
        (se) => se.examType === "mid_exam" && se.id !== subExamDialog.subExam?.id
      );
      if (existingMidExam) {
        toast.error("Mid Exam already exists", {
          description: "Only one mid exam can exist per subject. Please delete the existing one first.",
    });
        return;
      }
    } else if (subExamFormData.examType === "general_test") {
      if (subExamFormData.maxScore > 40) {
        toast.error("Max score too high", {
          description: "General Test maximum is 40 points.",
        });
        return;
      }
      // Check for existing general test
      const existingGeneralTest = subExams.find(
        (se) => se.examType === "general_test" && se.id !== subExamDialog.subExam?.id
      );
      if (existingGeneralTest) {
        toast.error("General Test already exists", {
          description: "Only one general test can exist per subject. Please delete the existing one first.",
        });
        return;
      }
    }

    // Validate max score is provided
    if (!subExamFormData.maxScore || subExamFormData.maxScore <= 0) {
      toast.error("Max score required", {
        description: "Please enter a max score for this sub-exam.",
      });
      return;
    }

    // Auto-set weight = maxScore
    const finalFormData = {
      ...subExamFormData,
      weightPercent: subExamFormData.maxScore, // Weight equals max score
    };

    if (subExamDialog.mode === "create") {
      await createSubExam.mutateAsync({
        gradeId: selectedGradeId,
        subjectId: selectedSubjectId,
        ...finalFormData,
      });
    } else if (subExamDialog.subExam) {
      await updateSubExam.mutateAsync({
        id: subExamDialog.subExam.id,
        data: finalFormData,
      });
    }
    setSubExamDialog({ open: false, subExam: null, mode: "create" });
  };

  const handleDeleteSubExam = async () => {
    if (deleteSubExamDialog.subExam) {
      await deleteSubExam.mutateAsync(deleteSubExamDialog.subExam.id);
      setDeleteSubExamDialog({ open: false, subExam: null });
    }
  };


  // Group sub-exams by exam type
  const groupedSubExams = useMemo(() => {
    const subExams = Array.isArray(subExamsData?.data) ? subExamsData.data : [];
    const groups: Record<string, SubExam[]> = {
      quiz: [],
      assignment: [],
      mid_exam: [],
      general_test: [],
    };

    subExams.forEach((subExam) => {
      if (groups[subExam.examType]) {
        groups[subExam.examType].push(subExam);
      }
    });

    return groups;
  }, [subExamsData]);

  // Get exam type display info
  const getExamTypeInfo = (type: ExamType) => {
    const info: Record<ExamType, { name: string; icon: any; color: string }> = {
      quiz: { name: "Quiz", icon: ClipboardList, color: "text-blue-600" },
      assignment: { name: "Assignment", icon: FileText, color: "text-purple-600" },
      mid_exam: { name: "Mid Exam", icon: BookOpen, color: "text-orange-600" },
      general_test: { name: "General Test", icon: GraduationCap, color: "text-green-600" },
    };
    return info[type] || info.quiz;
  };

  // Payment Type Handlers
  const handleOpenCreatePaymentType = () => {
    setPaymentTypeFormData({ name: "", amount: 0, description: "", isActive: true });
    setPaymentTypeDialog({ open: true, paymentType: null, mode: "create" });
  };

  const handleOpenEditPaymentType = (paymentType: PaymentType) => {
    setPaymentTypeFormData({
      name: paymentType.name,
      amount: paymentType.amount,
      description: paymentType.description || "",
      isActive: paymentType.isActive,
    });
    setPaymentTypeDialog({ open: true, paymentType, mode: "edit" });
  };

  const handleSubmitPaymentType = async () => {
    if (paymentTypeDialog.mode === "create") {
      await createPaymentType.mutateAsync(paymentTypeFormData);
    } else if (paymentTypeDialog.paymentType) {
      await updatePaymentType.mutateAsync({
        id: paymentTypeDialog.paymentType.id,
        data: paymentTypeFormData,
      });
    }
    setPaymentTypeDialog({ open: false, paymentType: null, mode: "create" });
  };

  const handleDeletePaymentTypeConfirm = async () => {
    if (deletePaymentTypeDialog.paymentType) {
      await deletePaymentType.mutateAsync(deletePaymentTypeDialog.paymentType.id);
      setDeletePaymentTypeDialog({ open: false, paymentType: null });
    }
  };

  // System Settings Handler
  const handleSaveThreshold = async () => {
    const numValue = parseFloat(threshold);
    if (isNaN(numValue) || numValue < 0 || numValue > 100) {
      return;
    }
    await updateSetting.mutateAsync({
      key: "promotionThreshold",
      data: { value: threshold },
    });
  };

  if (!hasRole(["OWNER", "REGISTRAR"])) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-semibold">Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">
            You do not have permission to access settings
          </p>
        </div>
      </div>
    );
  }

  const subExams = Array.isArray(subExamsData?.data) ? subExamsData.data : [];
  const paymentTypes = Array.isArray(paymentTypesData?.data) ? paymentTypesData.data : [];

  return (
    <div className="space-y-6">
      <div>
        <div>
          <h1 className="text-lg sm:text-xl font-semibold">Settings</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Manage system configuration, results/exams, and payment types
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 h-auto">
          <TabsTrigger value="system" className="flex-col sm:flex-row gap-1 sm:gap-2 py-2 sm:py-1.5">
            <Sliders className="h-4 w-4 sm:mr-2" />
            <span className="text-xs sm:text-sm">System</span>
          </TabsTrigger>
          <TabsTrigger value="marks" className="flex-col sm:flex-row gap-1 sm:gap-2 py-2 sm:py-1.5">
            <FileText className="h-4 w-4 sm:mr-2" />
            <span className="text-xs sm:text-sm">Results (Exam)</span>
          </TabsTrigger>
          <TabsTrigger value="payment-types" className="flex-col sm:flex-row gap-1 sm:gap-2 py-2 sm:py-1.5">
            <DollarSign className="h-4 w-4 sm:mr-2" />
            <span className="text-xs sm:text-sm">Payment Types</span>
          </TabsTrigger>
        </TabsList>

        {/* System Settings Tab */}
        <TabsContent value="system" className="space-y-6">
          {settingsLoading ? (
            <LoadingState rows={3} columns={2} />
          ) : settingsError ? (
            <ErrorState
              message="Failed to load settings"
              onRetry={() => refetchSettings()}
            />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Promotion Settings
                </CardTitle>
                <CardDescription>
                  Configure the minimum average score required for student
                  promotion
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="promotionThreshold">
                    Promotion Threshold (%)
                  </Label>
                  <Input
                    id="promotionThreshold"
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={threshold}
                    onChange={(e) => setThreshold(e.target.value)}
                    placeholder="60.0"
                    className="max-w-xs"
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    Students with an overall average below this threshold will
                    repeat their current grade. Students at or above this
                    threshold will be promoted to the next grade.
                  </p>
                </div>
                <Button
                  onClick={handleSaveThreshold}
                  disabled={updateSetting.isPending}
                >
                  <Save className="mr-2 h-4 w-4" />
                  {updateSetting.isPending ? "Saving..." : "Save Threshold"}
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Results (Exam) Tab */}
        <TabsContent value="marks" className="space-y-6">
            <div>
            <h2 className="text-xl font-semibold">Results & Exams Configuration</h2>
              <p className="text-sm text-muted-foreground">
              Manage sub-exams (quizzes, assignments, mid exams, general tests) and their weights for each subject
            </p>
          </div>

          {/* Selection Section */}
            <Card>
                  <CardHeader>
              <CardTitle>Select Grade and Subject</CardTitle>
              <CardDescription>
                Choose a grade and subject to manage sub-exams (sub-exams are shared across all terms)
              </CardDescription>
                  </CardHeader>
                  <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="grade-select">Grade</Label>
                  <Select
                    value={selectedGradeId}
                    onValueChange={setSelectedGradeId}
                  >
                    <SelectTrigger id="grade-select" className="w-full">
                      <SelectValue placeholder="Select a grade" />
                    </SelectTrigger>
                    <SelectContent>
                      {grades.map((grade) => (
                        <SelectItem key={grade.id} value={grade.id}>
                          {grade.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="subject-select">Subject</Label>
                  <Select
                    value={selectedSubjectId}
                    onValueChange={setSelectedSubjectId}
                    disabled={!selectedGradeId || subjectsLoading}
                          >
                    <SelectTrigger id="subject-select" className="w-full">
                      <SelectValue 
                        placeholder={
                          subjectsLoading 
                            ? "Loading subjects..." 
                            : "Select a subject"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {subjectsLoading ? (
                        <div className="flex items-center justify-center py-4">
                          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                          <span className="ml-2 text-sm text-muted-foreground">Loading subjects...</span>
                        </div>
                      ) : subjects.length === 0 ? (
                        <div className="py-4 text-center text-sm text-muted-foreground">
                          No subjects found
                        </div>
                      ) : (
                        subjects.map((subject) => (
                          <SelectItem key={subject.id} value={subject.id}>
                            {subject.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
                    </div>
                  </CardContent>
                </Card>

          {/* Sub-Exams List */}
          {selectedSubjectId && selectedGradeId ? (
            <div className="space-y-6">
              {subExamsLoading ? (
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                      <span className="ml-3 text-sm text-muted-foreground">Loading sub-exams...</span>
            </div>
                  </CardContent>
                </Card>
              ) : (
                <>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <h3 className="text-base sm:text-lg font-semibold">Sub-Exams</h3>
            {hasRole(["OWNER", "REGISTRAR"]) && (
                      <div className="flex flex-wrap items-center gap-2">
                        <Button variant="outline" onClick={handleOpenBulkCreate} size="sm" className="text-xs sm:text-sm">
                <Plus className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                          Bulk Create
              </Button>
                        <Button onClick={handleOpenCreateSubExam} size="sm" className="text-xs sm:text-sm">
                          <Plus className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                          Add Sub-Exam
                        </Button>
                      </div>
            )}
          </div>

                  {subExams.length === 0 ? (
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center py-8">
                      <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">No sub-exams found</p>
                      <p className="text-sm text-muted-foreground mt-2">
                        Create sub-exams for this subject
                    </p>
                  {hasRole(["OWNER", "REGISTRAR"]) && (
                        <Button onClick={handleOpenCreateSubExam} className="mt-4">
                          <Plus className="mr-2 h-4 w-4" />
                          Create First Sub-Exam
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
              ) : (
                <div className="space-y-4">
                  {Object.entries(groupedSubExams).map(([examType, typeSubExams]) => {
                    if (typeSubExams.length === 0) return null;
                    const typeInfo = getExamTypeInfo(examType as ExamType);
                    const TypeIcon = typeInfo.icon;
                    const totalWeight = typeSubExams.reduce((sum, se) => sum + se.maxScore, 0); // Use maxScore since weight = maxScore

                    return (
                      <Card key={examType}>
                  <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <TypeIcon className={cn("h-5 w-5", typeInfo.color)} />
                            {typeInfo.name}
                            <Badge variant="secondary" className="ml-auto">
                              {totalWeight.toFixed(1)} points total
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                            {typeSubExams.map((subExam) => (
                              <div
                                key={subExam.id}
                                className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0 p-3 border rounded-md hover:bg-slate-50"
                              >
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <p className="font-semibold">{subExam.name}</p>
                                    <Badge variant="outline">{subExam.examType}</Badge>
                                  </div>
                                  <div className="flex flex-col sm:flex-row sm:gap-4 mt-1 text-xs sm:text-sm text-muted-foreground">
                                    <span>Max Score: {subExam.maxScore} points</span>
                                    <span className="text-xs text-muted-foreground/70">(Weight = Max Score)</span>
                                  </div>
                                </div>
                      {hasRole(["OWNER", "REGISTRAR"]) && (
                                  <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                                      onClick={() => handleOpenEditSubExam(subExam)}
                            >
                                      <Edit className="h-4 w-4" />
                            </Button>
                          <Button
                            variant="outline"
                            size="sm"
                                      onClick={() =>
                                        setDeleteSubExamDialog({ open: true, subExam })
                                      }
                          >
                                      <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                              </div>
                            ))}
                    </div>
                  </CardContent>
                </Card>
                    );
                  })}
            </div>
                  )}
                </>
              )}
            </div>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Select a grade and subject to manage sub-exams</p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Payment Types Tab */}
        <TabsContent value="payment-types" className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-lg sm:text-xl font-semibold">Payment Types</h2>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Manage payment types with fixed amounts for student payments
              </p>
            </div>
            {hasRole(["OWNER"]) && (
              <Button onClick={handleOpenCreatePaymentType} size="sm" className="text-xs sm:text-sm">
                <Plus className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                Add Payment Type
              </Button>
            )}
          </div>

          {paymentTypesLoading ? (
            <LoadingState rows={5} columns={3} />
          ) : paymentTypesError ? (
            <ErrorState
              message="Failed to load payment types"
              onRetry={() => refetchPaymentTypes()}
            />
          ) : paymentTypes.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-8">
                  <DollarSign className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No payment types found</p>
                  {hasRole(["OWNER"]) && (
                    <Button onClick={handleOpenCreatePaymentType} className="mt-4">
                      <Plus className="mr-2 h-4 w-4" />
                      Create First Payment Type
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {paymentTypes.map((paymentType) => (
                <Card
                  key={paymentType.id}
                  className={`hover:shadow-md transition-shadow ${
                    !paymentType.isActive ? "opacity-60" : ""
                  }`}
                >
                  <CardHeader>
                    <CardTitle className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 sm:h-5 sm:w-5" />
                        <span className="text-base sm:text-lg">{paymentType.name}</span>
                      </div>
                      {!paymentType.isActive && (
                        <Badge variant="secondary" className="text-xs">Inactive</Badge>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <p className="text-sm font-semibold text-lg">
                        {formatCurrency(paymentType.amount)}
                      </p>
                      {paymentType.description && (
                        <p className="text-sm text-muted-foreground">
                          {paymentType.description}
                        </p>
                      )}
                      {hasRole(["OWNER"]) && (
                        <div className="flex gap-2 pt-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenEditPaymentType(paymentType)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              setDeletePaymentTypeDialog({ open: true, paymentType })
                            }
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Sub-Exam Dialog */}
      <Dialog
        open={subExamDialog.open}
        onOpenChange={(open) => setSubExamDialog({ ...subExamDialog, open })}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {subExamDialog.mode === "create" ? "Create Sub-Exam" : "Edit Sub-Exam"}
            </DialogTitle>
            <DialogDescription>
              {subExamDialog.mode === "create"
                ? "Add a new sub-exam for this subject and term"
                : "Update sub-exam information"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="subexam-name">Name *</Label>
              <Input
                id="subexam-name"
                value={subExamFormData.name}
                onChange={(e) =>
                  setSubExamFormData({ ...subExamFormData, name: e.target.value })
                }
                placeholder="e.g., Quiz 1, Assignment 1"
              />
            </div>
            <div>
              <Label htmlFor="subexam-type">Exam Type *</Label>
              <Select
                value={subExamFormData.examType}
                onValueChange={(value) => {
                  const examType = value as ExamType;
                  // Auto-fill with common presets based on exam type
                  // Weight is automatically set to maxScore
                  const presets: Record<ExamType, { maxScore: number }> = {
                    quiz: { maxScore: 10 },
                    assignment: { maxScore: 10 },
                    mid_exam: { maxScore: 20 },
                    general_test: { maxScore: 40 },
                  };
                  setSubExamFormData({
                    ...subExamFormData,
                    examType,
                    maxScore: presets[examType].maxScore,
                    weightPercent: presets[examType].maxScore, // Auto-set weight = maxScore
                  });
                }}
              >
                <SelectTrigger id="subexam-type" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="quiz">Quiz (Max: 10 points, multiple allowed)</SelectItem>
                  <SelectItem value="assignment">Assignment (Max: 10 points, multiple allowed)</SelectItem>
                  <SelectItem value="mid_exam">Mid Exam (Max: 20 points, one only)</SelectItem>
                  <SelectItem value="general_test">General Test (Max: 40 points, one only)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                Select exam type to auto-fill common values. You can adjust them below.
              </p>
            </div>
            <div>
              <Label htmlFor="subexam-maxScore">Max Score (Points) *</Label>
              <Input
                id="subexam-maxScore"
                type="number"
                min="0.01"
                step="0.01"
                max={subExamFormData.examType === "quiz" || subExamFormData.examType === "assignment" ? 10 : 
                     subExamFormData.examType === "mid_exam" ? 20 : 40}
                value={subExamFormData.maxScore || ""}
                onChange={(e) => {
                  const maxScore = parseFloat(e.target.value) || 0;
                  setSubExamFormData({
                    ...subExamFormData,
                    maxScore,
                    weightPercent: maxScore, // Auto-set weight = maxScore
                  });
                }}
                placeholder={
                  subExamFormData.examType === "quiz" || subExamFormData.examType === "assignment" ? "Max 10 points" :
                  subExamFormData.examType === "mid_exam" ? "Max 20 points" : "Max 40 points"
                }
              />
              <p className="text-xs text-muted-foreground mt-1">
                {subExamFormData.examType === "quiz" && "Maximum 10 points per quiz. Weight equals max score."}
                {subExamFormData.examType === "assignment" && "Maximum 10 points per assignment. Weight equals max score."}
                {subExamFormData.examType === "mid_exam" && "Maximum 20 points. Only one mid exam allowed. Weight equals max score."}
                {subExamFormData.examType === "general_test" && "Maximum 40 points. Only one general test allowed. Weight equals max score."}
              </p>
            </div>
            {(() => {
              // Calculate total of all sub-exams (excluding the one being edited)
              const currentSubExams = subExams.filter(se => se.id !== subExamDialog.subExam?.id);
              const currentTotal = currentSubExams.reduce((sum, se) => sum + se.maxScore, 0);
              const newTotal = currentTotal + (subExamFormData.maxScore || 0);
              const remaining = 100 - newTotal;
              
              // Check for mid exam and general test uniqueness
              let hasMidExam = currentSubExams.some(se => se.examType === "mid_exam") || 
                               (subExamFormData.examType === "mid_exam" && subExamDialog.mode === "create");
              let hasGeneralTest = currentSubExams.some(se => se.examType === "general_test") || 
                                   (subExamFormData.examType === "general_test" && subExamDialog.mode === "create");
              
              if (subExamDialog.subExam?.examType === "mid_exam") {
                // If editing mid exam, don't count it as duplicate
                const otherMidExam = currentSubExams.find(se => se.examType === "mid_exam" && se.id !== subExamDialog.subExam?.id);
                if (otherMidExam) hasMidExam = true;
              }
              if (subExamDialog.subExam?.examType === "general_test") {
                // If editing general test, don't count it as duplicate
                const otherGeneralTest = currentSubExams.find(se => se.examType === "general_test" && se.id !== subExamDialog.subExam?.id);
                if (otherGeneralTest) hasGeneralTest = true;
              }
              
              return (
                <div className="space-y-2">
                  <div className={cn(
                    "p-3 rounded-md text-xs",
                    newTotal > 100 ? "bg-red-50 text-red-700 border border-red-200" : 
                    remaining > 0 ? "bg-amber-50 text-amber-700 border border-amber-200" : 
                    "bg-green-50 text-green-700 border border-green-200"
                  )}>
                    <p className="font-medium">
                      Total Points: {newTotal.toFixed(1)} / 100 points
                      {remaining > 0 && ` (${remaining.toFixed(1)} points remaining)`}
                      {newTotal > 100 && " ⚠️ Exceeds 100 points limit!"}
                    </p>
                    <p className="mt-1 text-xs opacity-80">
                      All sub-exams combined must total exactly 100 points. Weight automatically equals max score.
                    </p>
            </div>
                  {subExamFormData.examType === "mid_exam" && hasMidExam && subExamDialog.mode === "create" && (
                    <div className="p-2 bg-red-50 text-red-700 border border-red-200 rounded-md text-xs">
                      ⚠️ Only one Mid Exam is allowed per subject.
                    </div>
                  )}
                  {subExamFormData.examType === "general_test" && hasGeneralTest && subExamDialog.mode === "create" && (
                    <div className="p-2 bg-red-50 text-red-700 border border-red-200 rounded-md text-xs">
                      ⚠️ Only one General Test is allowed per subject.
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setSubExamDialog({ ...subExamDialog, open: false })}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmitSubExam}
              disabled={createSubExam.isPending || updateSubExam.isPending}
            >
              {subExamDialog.mode === "create" ? "Create" : "Update"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Create Sub-Exam Dialog */}
      <Dialog
        open={bulkDialog.open}
        onOpenChange={(open) => {
          if (!bulkDialog.loading) {
            setBulkDialog({ open, loading: false, results: [] });
            setSelectedGrades([]);
          }
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Bulk Create Sub-Exam</DialogTitle>
            <DialogDescription>
              Create the same sub-exam for multiple grades and the selected subject
            </DialogDescription>
          </DialogHeader>
          {bulkDialog.results.length > 0 ? (
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 rounded-md">
                <h4 className="font-semibold mb-2">Creation Results</h4>
                <div className="space-y-2 text-sm">
                  <p>
                    <span className="font-medium">Total Attempted:</span> {bulkDialog.results.length}
                  </p>
                  <p className="text-green-600">
                    <span className="font-medium">Successful:</span> {bulkDialog.results.filter(r => r.success).length}
                  </p>
                  {bulkDialog.results.some(r => !r.success) && (
                    <p className="text-red-600">
                      <span className="font-medium">Failed:</span> {bulkDialog.results.filter(r => !r.success).length}
                    </p>
                  )}
                </div>
                {bulkDialog.results.some(r => !r.success) && (
                  <div className="mt-4 space-y-1">
                    <p className="text-sm font-medium text-red-600">Failed Combinations:</p>
                    <div className="max-h-32 overflow-y-auto space-y-1">
                      {bulkDialog.results.filter(r => !r.success).map((result, idx) => (
                        <p key={idx} className="text-xs text-red-600">
                          {result.gradeName} - {result.subjectName}: {result.error}
                        </p>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button onClick={() => {
                  setBulkDialog({ open: false, loading: false, results: [] });
                  setSelectedGrades([]);
                }}>
                  Close
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <>
          <div className="space-y-4">
            <div>
                  <Label>Select Grades *</Label>
                  <div className="mt-2 border rounded-md p-4 max-h-48 overflow-y-auto">
                    {grades.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No grades available</p>
                    ) : (
                      <div className="space-y-2">
                        {grades.map((grade) => (
                          <div key={grade.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={`grade-${grade.id}`}
                              checked={selectedGrades.includes(grade.id)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedGrades([...selectedGrades, grade.id]);
                                } else {
                                  setSelectedGrades(selectedGrades.filter(id => id !== grade.id));
                                }
                              }}
                            />
                            <label
                              htmlFor={`grade-${grade.id}`}
                              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                            >
                              {grade.name}
                            </label>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Select one or more grades to create the sub-exam for
                  </p>
            </div>
            <div>
                  <Label htmlFor="bulk-subexam-name">Name *</Label>
              <Input
                    id="bulk-subexam-name"
                    value={bulkFormData.name}
                onChange={(e) =>
                      setBulkFormData({ ...bulkFormData, name: e.target.value })
                }
                    placeholder="e.g., Quiz 1, Assignment 1"
              />
            </div>
            <div>
                  <Label htmlFor="bulk-subexam-type">Exam Type *</Label>
                  <Select
                    value={bulkFormData.examType}
                    onValueChange={(value) => {
                      const examType = value as ExamType;
                      // Auto-fill with common presets based on exam type
                      // Weight is automatically set to maxScore
                      const presets: Record<ExamType, { maxScore: number }> = {
                        quiz: { maxScore: 10 },
                        assignment: { maxScore: 10 },
                        mid_exam: { maxScore: 20 },
                        general_test: { maxScore: 40 },
                      };
                      setBulkFormData({
                        ...bulkFormData,
                        examType,
                        maxScore: presets[examType].maxScore,
                        weightPercent: presets[examType].maxScore, // Auto-set weight = maxScore
                      });
                    }}
                  >
                    <SelectTrigger id="bulk-subexam-type" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="quiz">Quiz (Max: 10 points, multiple allowed)</SelectItem>
                      <SelectItem value="assignment">Assignment (Max: 10 points, multiple allowed)</SelectItem>
                      <SelectItem value="mid_exam">Mid Exam (Max: 20 points, one only)</SelectItem>
                      <SelectItem value="general_test">General Test (Max: 40 points, one only)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    Select exam type to auto-fill common values. You can adjust them below.
                  </p>
                </div>
                <div>
                  <Label htmlFor="bulk-subexam-maxScore">Max Score (Points) *</Label>
              <Input
                    id="bulk-subexam-maxScore"
                    type="number"
                    min="0.01"
                    step="0.01"
                    max={bulkFormData.examType === "quiz" || bulkFormData.examType === "assignment" ? 10 : 
                         bulkFormData.examType === "mid_exam" ? 20 : 40}
                    value={bulkFormData.maxScore || ""}
                    onChange={(e) => {
                      const maxScore = parseFloat(e.target.value) || 0;
                      setBulkFormData({
                        ...bulkFormData,
                        maxScore,
                        weightPercent: maxScore, // Auto-set weight = maxScore
                      });
                    }}
                    placeholder={
                      bulkFormData.examType === "quiz" || bulkFormData.examType === "assignment" ? "Max 10 points" :
                      bulkFormData.examType === "mid_exam" ? "Max 20 points" : "Max 40 points"
                    }
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {bulkFormData.examType === "quiz" && "Maximum 10 points per quiz. Weight equals max score."}
                    {bulkFormData.examType === "assignment" && "Maximum 10 points per assignment. Weight equals max score."}
                    {bulkFormData.examType === "mid_exam" && "Maximum 20 points. Only one mid exam allowed. Weight equals max score."}
                    {bulkFormData.examType === "general_test" && "Maximum 40 points. Only one general test allowed. Weight equals max score."}
                  </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
                  onClick={() => {
                    setBulkDialog({ open: false, loading: false, results: [] });
                    setSelectedGrades([]);
                  }}
                  disabled={bulkDialog.loading}
            >
              Cancel
            </Button>
            <Button
                  onClick={handleBulkCreate}
              disabled={
                    bulkDialog.loading ||
                    selectedGrades.length === 0 ||
                    !selectedSubjectId ||
                    !bulkFormData.name ||
                    bulkFormData.maxScore <= 0
              }
            >
                  {bulkDialog.loading ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent mr-2" />
                      Creating...
                    </>
                  ) : (
                    "Create for Selected Grades"
                  )}
            </Button>
          </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Sub-Exam Dialog */}
      <ConfirmDialog
        open={deleteSubExamDialog.open}
        onOpenChange={(open) =>
          setDeleteSubExamDialog({ ...deleteSubExamDialog, open })
        }
        onConfirm={handleDeleteSubExam}
        title="Delete Sub-Exam"
        description={`Are you sure you want to delete "${deleteSubExamDialog.subExam?.name}"? This action cannot be undone.`}
      />

      {/* Payment Type Dialog */}
      <Dialog
        open={paymentTypeDialog.open}
        onOpenChange={(open) => setPaymentTypeDialog({ ...paymentTypeDialog, open })}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {paymentTypeDialog.mode === "create" ? "Create Payment Type" : "Edit Payment Type"}
            </DialogTitle>
            <DialogDescription>
              {paymentTypeDialog.mode === "create"
                ? "Add a new payment type with fixed amount"
                : "Update payment type information"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="payment-type-name">Name *</Label>
              <Input
                id="payment-type-name"
                value={paymentTypeFormData.name}
                onChange={(e) =>
                  setPaymentTypeFormData({ ...paymentTypeFormData, name: e.target.value })
                }
                placeholder="e.g., Tuition Fee"
              />
            </div>
            <div>
              <Label htmlFor="payment-type-amount">Amount *</Label>
              <Input
                id="payment-type-amount"
                type="number"
                step="0.01"
                min="0.01"
                value={paymentTypeFormData.amount}
                onChange={(e) =>
                  setPaymentTypeFormData({
                    ...paymentTypeFormData,
                    amount: parseFloat(e.target.value) || 0,
                  })
                }
                placeholder="0.00"
              />
            </div>
            <div>
              <Label htmlFor="payment-type-description">Description (Optional)</Label>
              <Input
                id="payment-type-description"
                value={paymentTypeFormData.description}
                onChange={(e) =>
                  setPaymentTypeFormData({ ...paymentTypeFormData, description: e.target.value })
                }
                placeholder="Optional description"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="payment-type-isActive"
                checked={paymentTypeFormData.isActive}
                onCheckedChange={(checked) =>
                  setPaymentTypeFormData({
                    ...paymentTypeFormData,
                    isActive: checked as boolean,
                  })
                }
              />
              <Label htmlFor="payment-type-isActive">Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setPaymentTypeDialog({ ...paymentTypeDialog, open: false })}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmitPaymentType}
              disabled={createPaymentType.isPending || updatePaymentType.isPending}
            >
              {paymentTypeDialog.mode === "create" ? "Create" : "Update"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Payment Type Dialog */}
      <ConfirmDialog
        open={deletePaymentTypeDialog.open}
        onOpenChange={(open) =>
          setDeletePaymentTypeDialog({ ...deletePaymentTypeDialog, open })
        }
        onConfirm={handleDeletePaymentTypeConfirm}
        title="Delete Payment Type"
        description={`Are you sure you want to delete "${deletePaymentTypeDialog.paymentType?.name}"? This action cannot be undone.`}
      />
    </div>
  );
}
