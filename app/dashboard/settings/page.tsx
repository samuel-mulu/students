"use client";

import { useState, useEffect } from "react";
import {
  useSettings,
  useSetting,
  useUpdateSetting,
} from "@/lib/hooks/use-settings";
import {
  useGrades,
  useCreateGrade,
  useUpdateGrade,
  useDeleteGrade,
} from "@/lib/hooks/use-grades";
import {
  useAcademicYears,
  useActiveAcademicYear,
  useCreateAcademicYear,
  useUpdateAcademicYear,
  useActivateAcademicYear,
  useCloseAcademicYear,
} from "@/lib/hooks/use-academicYears";
import {
  usePaymentTypes,
  useCreatePaymentType,
  useUpdatePaymentType,
  useDeletePaymentType,
} from "@/lib/hooks/use-payment-types";
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
  GraduationCap,
  Calendar,
  Sliders,
  Plus,
  Edit,
  Trash2,
  CheckCircle2,
  XCircle,
  DollarSign,
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
import { Grade, AcademicYear, PaymentType } from "@/lib/types";
import { formatCurrency } from "@/lib/utils/format";

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

  // Grades
  const {
    data: gradesData,
    isLoading: gradesLoading,
    error: gradesError,
    refetch: refetchGrades,
  } = useGrades();
  const createGrade = useCreateGrade();
  const updateGrade = useUpdateGrade();
  const deleteGrade = useDeleteGrade();

  // Academic Years
  const {
    data: academicYearsData,
    isLoading: academicYearsLoading,
    error: academicYearsError,
    refetch: refetchAcademicYears,
  } = useAcademicYears();
  const { data: activeYearData } = useActiveAcademicYear();
  const createAcademicYear = useCreateAcademicYear();
  const updateAcademicYear = useUpdateAcademicYear();
  const activateAcademicYear = useActivateAcademicYear();
  const closeAcademicYear = useCloseAcademicYear();

  // Grade Dialog State
  const [gradeDialog, setGradeDialog] = useState<{
    open: boolean;
    grade: Grade | null;
    mode: "create" | "edit";
  }>({
    open: false,
    grade: null,
    mode: "create",
  });

  const [gradeFormData, setGradeFormData] = useState({
    name: "",
    order: 1,
    isHighest: false,
  });

  const [deleteGradeDialog, setDeleteGradeDialog] = useState<{
    open: boolean;
    grade: Grade | null;
  }>({
    open: false,
    grade: null,
  });

  // Academic Year Dialog State
  const [academicYearDialog, setAcademicYearDialog] = useState<{
    open: boolean;
    year: AcademicYear | null;
    mode: "create" | "edit";
  }>({
    open: false,
    year: null,
    mode: "create",
  });

  const [academicYearFormData, setAcademicYearFormData] = useState({
    name: "",
    startDate: "",
    endDate: "",
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

  // Grade Handlers
  const handleOpenCreateGrade = () => {
    setGradeFormData({ name: "", order: 1, isHighest: false });
    setGradeDialog({ open: true, grade: null, mode: "create" });
  };

  const handleOpenEditGrade = (grade: Grade) => {
    setGradeFormData({
      name: grade.name,
      order: grade.order,
      isHighest: grade.isHighest,
    });
    setGradeDialog({ open: true, grade, mode: "edit" });
  };

  const handleSubmitGrade = async () => {
    if (gradeDialog.mode === "create") {
      await createGrade.mutateAsync(gradeFormData);
    } else if (gradeDialog.grade) {
      await updateGrade.mutateAsync({
        id: gradeDialog.grade.id,
        data: gradeFormData,
      });
    }
    setGradeDialog({ open: false, grade: null, mode: "create" });
  };

  const handleDeleteGrade = async () => {
    if (deleteGradeDialog.grade) {
      await deleteGrade.mutateAsync(deleteGradeDialog.grade.id);
      setDeleteGradeDialog({ open: false, grade: null });
    }
  };

  // Academic Year Handlers
  const handleOpenCreateAcademicYear = () => {
    setAcademicYearFormData({ name: "", startDate: "", endDate: "" });
    setAcademicYearDialog({ open: true, year: null, mode: "create" });
  };

  const handleOpenEditAcademicYear = (year: AcademicYear) => {
    setAcademicYearFormData({
      name: year.name,
      startDate: year.startDate.split("T")[0],
      endDate: year.endDate ? year.endDate.split("T")[0] : "",
    });
    setAcademicYearDialog({ open: true, year, mode: "edit" });
  };

  const handleSubmitAcademicYear = async () => {
    const submitData = {
      name: academicYearFormData.name,
      startDate: new Date(academicYearFormData.startDate).toISOString(),
      endDate: academicYearFormData.endDate
        ? new Date(academicYearFormData.endDate).toISOString()
        : undefined,
    };

    if (academicYearDialog.mode === "create") {
      await createAcademicYear.mutateAsync(submitData);
    } else if (academicYearDialog.year) {
      await updateAcademicYear.mutateAsync({
        id: academicYearDialog.year.id,
        data: submitData,
      });
    }
    setAcademicYearDialog({ open: false, year: null, mode: "create" });
  };

  const handleActivateAcademicYear = async (id: string) => {
    await activateAcademicYear.mutateAsync(id);
  };

  const handleCloseAcademicYear = async (id: string) => {
    await closeAcademicYear.mutateAsync(id);
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

  const grades = Array.isArray(gradesData?.data) ? gradesData.data : [];
  const academicYears = Array.isArray(academicYearsData?.data)
    ? academicYearsData.data
    : [];
  const activeYear = activeYearData?.data;
  const paymentTypes = Array.isArray(paymentTypesData?.data) ? paymentTypesData.data : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage system configuration, grades, and academic years
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="system">
            <Sliders className="mr-2 h-4 w-4" />
            System
          </TabsTrigger>
          <TabsTrigger value="grades">
            <GraduationCap className="mr-2 h-4 w-4" />
            Grades
          </TabsTrigger>
          <TabsTrigger value="academic-years">
            <Calendar className="mr-2 h-4 w-4" />
            Academic Years
          </TabsTrigger>
          <TabsTrigger value="payment-types">
            <DollarSign className="mr-2 h-4 w-4" />
            Payment Types
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

        {/* Grades Tab */}
        <TabsContent value="grades" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">Grade Progression</h2>
              <p className="text-sm text-muted-foreground">
                Manage the grade sequence for student progression
              </p>
            </div>
            {hasRole(["OWNER", "REGISTRAR"]) && (
              <Button onClick={handleOpenCreateGrade}>
                <Plus className="mr-2 h-4 w-4" />
                Add Grade
              </Button>
            )}
          </div>

          {gradesLoading ? (
            <LoadingState rows={5} columns={3} />
          ) : gradesError ? (
            <ErrorState
              message="Failed to load grades"
              onRetry={() => refetchGrades()}
            />
          ) : grades.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-8">
                  <GraduationCap className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No grades found</p>
                  {hasRole(["OWNER", "REGISTRAR"]) && (
                    <Button onClick={handleOpenCreateGrade} className="mt-4">
                      <Plus className="mr-2 h-4 w-4" />
                      Create First Grade
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {grades.map((grade) => (
                <Card
                  key={grade.id}
                  className="hover:shadow-md transition-shadow"
                >
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <GraduationCap className="h-5 w-5" />
                        {grade.name}
                      </div>
                      {grade.isHighest && (
                        <Badge variant="default">Highest</Badge>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">
                        Order:{" "}
                        <span className="font-semibold">{grade.order}</span>
                      </p>
                      {hasRole(["OWNER", "REGISTRAR"]) && (
                        <div className="flex gap-2 pt-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenEditGrade(grade)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              setDeleteGradeDialog({ open: true, grade })
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

        {/* Academic Years Tab */}
        <TabsContent value="academic-years" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">Academic Years</h2>
              <p className="text-sm text-muted-foreground">
                Manage academic years and set the active year
              </p>
            </div>
            {hasRole(["OWNER", "REGISTRAR"]) && (
              <Button onClick={handleOpenCreateAcademicYear}>
                <Plus className="mr-2 h-4 w-4" />
                Add Academic Year
              </Button>
            )}
          </div>

          {activeYear && (
            <Card className="border-primary">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                  Active Academic Year
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold">{activeYear.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(activeYear.startDate).toLocaleDateString()} -{" "}
                      {activeYear.endDate
                        ? new Date(activeYear.endDate).toLocaleDateString()
                        : "Ongoing"}
                    </p>
                  </div>
                  {hasRole(["OWNER", "REGISTRAR"]) && (
                    <Button
                      variant="outline"
                      onClick={() => handleCloseAcademicYear(activeYear.id)}
                      disabled={closeAcademicYear.isPending}
                    >
                      <XCircle className="mr-2 h-4 w-4" />
                      Close Year
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {academicYearsLoading ? (
            <LoadingState rows={5} columns={3} />
          ) : academicYearsError ? (
            <ErrorState
              message="Failed to load academic years"
              onRetry={() => refetchAcademicYears()}
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {academicYears.map((year) => (
                <Card
                  key={year.id}
                  className={`hover:shadow-md transition-shadow ${
                    year.id === activeYear?.id ? "border-primary" : ""
                  }`}
                >
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-5 w-5" />
                        {year.name}
                      </div>
                      <Badge
                        variant={
                          year.status === "ACTIVE" ? "default" : "secondary"
                        }
                      >
                        {year.status}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">
                        {new Date(year.startDate).toLocaleDateString()} -{" "}
                        {year.endDate
                          ? new Date(year.endDate).toLocaleDateString()
                          : "Ongoing"}
                      </p>
                      {hasRole(["OWNER", "REGISTRAR"]) && (
                        <div className="flex gap-2 pt-2">
                          {year.status !== "ACTIVE" && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                handleActivateAcademicYear(year.id)
                              }
                              disabled={activateAcademicYear.isPending}
                            >
                              <CheckCircle2 className="mr-2 h-4 w-4" />
                              Activate
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenEditAcademicYear(year)}
                          >
                            <Edit className="h-4 w-4" />
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

        {/* Payment Types Tab */}
        <TabsContent value="payment-types" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">Payment Types</h2>
              <p className="text-sm text-muted-foreground">
                Manage payment types with fixed amounts for student payments
              </p>
            </div>
            {hasRole(["OWNER"]) && (
              <Button onClick={handleOpenCreatePaymentType}>
                <Plus className="mr-2 h-4 w-4" />
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
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-5 w-5" />
                        {paymentType.name}
                      </div>
                      {!paymentType.isActive && (
                        <Badge variant="secondary">Inactive</Badge>
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

      {/* Grade Dialog */}
      <Dialog
        open={gradeDialog.open}
        onOpenChange={(open) => setGradeDialog({ ...gradeDialog, open })}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {gradeDialog.mode === "create" ? "Create Grade" : "Edit Grade"}
            </DialogTitle>
            <DialogDescription>
              {gradeDialog.mode === "create"
                ? "Add a new grade to the progression sequence"
                : "Update grade information"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="grade-name">Name</Label>
              <Input
                id="grade-name"
                value={gradeFormData.name}
                onChange={(e) =>
                  setGradeFormData({ ...gradeFormData, name: e.target.value })
                }
                placeholder="e.g., Grade 1"
              />
            </div>
            <div>
              <Label htmlFor="grade-order">Order</Label>
              <Input
                id="grade-order"
                type="number"
                value={gradeFormData.order}
                onChange={(e) =>
                  setGradeFormData({
                    ...gradeFormData,
                    order: parseInt(e.target.value) || 1,
                  })
                }
              />
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="grade-isHighest"
                checked={gradeFormData.isHighest}
                onCheckedChange={(checked) =>
                  setGradeFormData({
                    ...gradeFormData,
                    isHighest: checked as boolean,
                  })
                }
              />
              <Label htmlFor="grade-isHighest">Mark as highest grade</Label>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setGradeDialog({ ...gradeDialog, open: false })}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmitGrade}
              disabled={createGrade.isPending || updateGrade.isPending}
            >
              {gradeDialog.mode === "create" ? "Create" : "Update"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Grade Dialog */}
      <ConfirmDialog
        open={deleteGradeDialog.open}
        onOpenChange={(open) =>
          setDeleteGradeDialog({ ...deleteGradeDialog, open })
        }
        onConfirm={handleDeleteGrade}
        title="Delete Grade"
        description={`Are you sure you want to delete "${deleteGradeDialog.grade?.name}"? This action cannot be undone.`}
      />

      {/* Academic Year Dialog */}
      <Dialog
        open={academicYearDialog.open}
        onOpenChange={(open) =>
          setAcademicYearDialog({ ...academicYearDialog, open })
        }
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {academicYearDialog.mode === "create"
                ? "Create Academic Year"
                : "Edit Academic Year"}
            </DialogTitle>
            <DialogDescription>
              {academicYearDialog.mode === "create"
                ? "Add a new academic year"
                : "Update academic year information"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="year-name">Name</Label>
              <Input
                id="year-name"
                value={academicYearFormData.name}
                onChange={(e) =>
                  setAcademicYearFormData({
                    ...academicYearFormData,
                    name: e.target.value,
                  })
                }
                placeholder="e.g., 2024-2025"
              />
            </div>
            <div>
              <Label htmlFor="year-startDate">Start Date</Label>
              <Input
                id="year-startDate"
                type="date"
                value={academicYearFormData.startDate}
                onChange={(e) =>
                  setAcademicYearFormData({
                    ...academicYearFormData,
                    startDate: e.target.value,
                  })
                }
              />
            </div>
            <div>
              <Label htmlFor="year-endDate">End Date (Optional)</Label>
              <Input
                id="year-endDate"
                type="date"
                value={academicYearFormData.endDate}
                onChange={(e) =>
                  setAcademicYearFormData({
                    ...academicYearFormData,
                    endDate: e.target.value,
                  })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() =>
                setAcademicYearDialog({ ...academicYearDialog, open: false })
              }
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmitAcademicYear}
              disabled={
                createAcademicYear.isPending || updateAcademicYear.isPending
              }
            >
              {academicYearDialog.mode === "create" ? "Create" : "Update"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
