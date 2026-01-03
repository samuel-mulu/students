"use client";

import { useState, useMemo } from "react";
import {
  useAcademicYears,
  useActiveAcademicYear,
  useCreateAcademicYear,
  useUpdateAcademicYear,
  useActivateAcademicYear,
  useCloseAcademicYear,
} from "@/lib/hooks/use-academicYears";
import { useTerms } from "@/lib/hooks/use-terms";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { AcademicYear, Term } from "@/lib/types";
import { Plus, Calendar, CheckCircle2, XCircle, Settings, ChevronDown, ChevronUp, BookOpen } from "lucide-react";
import { useAuthStore } from "@/lib/store/auth-store";
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { CreateTermDialog } from "@/components/forms/CreateTermDialog";

export default function AcademicYearsPage() {
  const { hasRole } = useAuthStore();
  const { data, isLoading, error, refetch } = useAcademicYears();
  const { data: activeYearData } = useActiveAcademicYear();
  const { data: termsData } = useTerms();
  const createYear = useCreateAcademicYear();
  const updateYear = useUpdateAcademicYear();
  const activateYear = useActivateAcademicYear();
  const closeYear = useCloseAcademicYear();

  const [expandedYears, setExpandedYears] = useState<Set<string>>(new Set());
  const [createTermDialog, setCreateTermDialog] = useState<{
    open: boolean;
    academicYearId?: string;
  }>({
    open: false,
  });

  const [dialog, setDialog] = useState<{
    open: boolean;
    year: AcademicYear | null;
    mode: "create" | "edit";
  }>({
    open: false,
    year: null,
    mode: "create",
  });

  const [formData, setFormData] = useState({
    name: "",
    startDate: "",
    endDate: "",
  });

  const terms = Array.isArray(termsData?.data) ? termsData.data : [];

  // Group terms by academic year
  const termsByAcademicYear = useMemo(() => {
    const grouped: Record<string, Term[]> = {};
    terms.forEach((term) => {
      if (term.academicYearId) {
        if (!grouped[term.academicYearId]) {
          grouped[term.academicYearId] = [];
        }
        grouped[term.academicYearId].push(term);
      }
    });
    return grouped;
  }, [terms]);

  const toggleYearExpansion = (yearId: string) => {
    setExpandedYears((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(yearId)) {
        newSet.delete(yearId);
      } else {
        newSet.add(yearId);
      }
      return newSet;
    });
  };

  const handleOpenCreate = () => {
    setFormData({ name: "", startDate: "", endDate: "" });
    setDialog({ open: true, year: null, mode: "create" });
  };

  const handleOpenEdit = (year: AcademicYear) => {
    setFormData({
      name: year.name,
      startDate: year.startDate.split("T")[0],
      endDate: year.endDate ? year.endDate.split("T")[0] : "",
    });
    setDialog({ open: true, year, mode: "edit" });
  };

  const handleSubmit = async () => {
    const submitData = {
      name: formData.name,
      startDate: new Date(formData.startDate).toISOString(),
      endDate: formData.endDate
        ? new Date(formData.endDate).toISOString()
        : undefined,
    };

    if (dialog.mode === "create") {
      await createYear.mutateAsync(submitData);
    } else if (dialog.year) {
      await updateYear.mutateAsync({ id: dialog.year.id, data: submitData });
    }
    setDialog({ open: false, year: null, mode: "create" });
  };

  const handleActivate = async (id: string) => {
    await activateYear.mutateAsync(id);
  };

  const handleClose = async (id: string) => {
    await closeYear.mutateAsync(id);
  };

  if (isLoading) {
    return <LoadingState rows={5} columns={3} />;
  }

  if (error) {
    return (
      <ErrorState
        message="Failed to load academic years"
        onRetry={() => refetch()}
      />
    );
  }

  const years = Array.isArray(data?.data) ? data.data : [];
  const activeYear = activeYearData?.data;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Academic Years</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage academic years and set the active year
          </p>
        </div>
        <div className="flex gap-2">
          {hasRole(["OWNER", "REGISTRAR"]) && (
            <>
              <Button variant="outline" asChild>
                <Link href="/dashboard/settings?tab=academic-years">
                  <Settings className="mr-2 h-4 w-4" />
                  Manage in Settings
                </Link>
              </Button>
              <Button onClick={handleOpenCreate}>
                <Plus className="mr-2 h-4 w-4" />
                Add Academic Year
              </Button>
            </>
          )}
        </div>
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
                  onClick={() => handleClose(activeYear.id)}
                  disabled={closeYear.isPending}
                >
                  Close Year
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {years.map((year) => (
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
                  variant={year.status === "ACTIVE" ? "default" : "secondary"}
                >
                  {year.status}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    {new Date(year.startDate).toLocaleDateString()} -{" "}
                    {year.endDate
                      ? new Date(year.endDate).toLocaleDateString()
                      : "Ongoing"}
                  </p>
                </div>

                {/* Terms Section */}
                {(() => {
                  const yearTerms = termsByAcademicYear[year.id] || [];
                  const isExpanded = expandedYears.has(year.id);
                  return yearTerms.length > 0 ? (
                    <div className="border-t pt-3">
                      <button
                        onClick={() => toggleYearExpansion(year.id)}
                        className="flex items-center justify-between w-full text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <span>Terms ({yearTerms.length})</span>
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </button>

                      {isExpanded && (
                        <div className="mt-3 space-y-1 pl-2">
                          {yearTerms.map((term) => (
                            <div
                              key={term.id}
                              className="flex items-center justify-between p-2 rounded-md bg-slate-50 hover:bg-slate-100 transition-colors"
                            >
                              <div className="flex items-center gap-2 flex-1">
                                <BookOpen className="h-3 w-3 text-muted-foreground" />
                                <div className="flex flex-col">
                                  <span className="text-sm font-medium">{term.name}</span>
                                  {term.startDate && (
                                    <span className="text-xs text-muted-foreground">
                                      {new Date(term.startDate).toLocaleDateString()}
                                      {term.endDate
                                        ? ` - ${new Date(term.endDate).toLocaleDateString()}`
                                        : ''}
                                    </span>
                                  )}
                                </div>
                                <Badge
                                  variant={term.status === "OPEN" ? "default" : "secondary"}
                                  className="text-xs"
                                >
                                  {term.status}
                                </Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : null;
                })()}

                {/* Actions */}
                {hasRole(["OWNER", "REGISTRAR"]) && (
                  <div className="flex gap-2 pt-2 border-t">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setCreateTermDialog({ open: true, academicYearId: year.id });
                      }}
                      className="flex-1"
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Add Term
                    </Button>
                    {year.status !== "ACTIVE" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleActivate(year.id)}
                        disabled={activateYear.isPending}
                      >
                        Activate
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenEdit(year)}
                    >
                      Edit
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog
        open={dialog.open}
        onOpenChange={(open) => setDialog({ ...dialog, open })}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialog.mode === "create"
                ? "Create Academic Year"
                : "Edit Academic Year"}
            </DialogTitle>
            <DialogDescription>
              {dialog.mode === "create"
                ? "Add a new academic year"
                : "Update academic year information"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="e.g., 2024-2025"
              />
            </div>
            <div>
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={formData.startDate}
                onChange={(e) =>
                  setFormData({ ...formData, startDate: e.target.value })
                }
              />
            </div>
            <div>
              <Label htmlFor="endDate">End Date (Optional)</Label>
              <Input
                id="endDate"
                type="date"
                value={formData.endDate}
                onChange={(e) =>
                  setFormData({ ...formData, endDate: e.target.value })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialog({ ...dialog, open: false })}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={createYear.isPending || updateYear.isPending}
            >
              {dialog.mode === "create" ? "Create" : "Update"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <CreateTermDialog
        open={createTermDialog.open}
        onOpenChange={(open) => setCreateTermDialog({ ...createTermDialog, open })}
        academicYearId={createTermDialog.academicYearId}
      />
    </div>
  );
}
