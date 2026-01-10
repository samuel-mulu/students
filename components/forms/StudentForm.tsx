"use client";

import { useState, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Student,
  CreateStudentRequest,
  UpdateStudentRequest,
} from "@/lib/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useClasses } from "@/lib/hooks/use-classes";
import { useActiveAcademicYear } from "@/lib/hooks/use-academicYears";

const studentSchema = z.object({
  // Personal
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  dateOfBirth: z.string().min(1, "Date of birth is required"),
  gender: z.string().min(1, "Gender is required"),
  nationality: z.string().optional(),
  religion: z.string().optional(),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  phone: z.string().optional(),
  // Parent
  parentName: z.string().min(1, "Parent name is required"),
  parentPhone: z.string().min(1, "Parent phone is required"),
  parentEmail: z.string().email("Invalid email").optional().or(z.literal("")),
  parentRelation: z.string().min(1, "Parent relation is required"),
  // Address
  address: z.string().min(1, "Address is required"),
  city: z.string().min(1, "City is required"),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  country: z.string().optional(),
  // Emergency
  emergencyName: z.string().min(1, "Emergency contact name is required"),
  emergencyPhone: z.string().min(1, "Emergency contact phone is required"),
  emergencyRelation: z.string().min(1, "Emergency relation is required"),
  // Medical
  medicalConditions: z.string().optional(),
  allergies: z.string().optional(),
  bloodGroup: z.string().optional(),
  // Previous school
  previousSchool: z.string().optional(),
  previousClass: z.string().optional(),
  transferReason: z.string().optional(),
  // Class assignment (optional, only for new students)
  classId: z.string().optional(),
  assignClassReason: z.string().optional(),
});

type StudentFormData = z.infer<typeof studentSchema>;

interface StudentFormProps {
  student?: Student;
  onSubmit: (
    data: CreateStudentRequest | UpdateStudentRequest
  ) => Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
}

export function StudentForm({
  student,
  onSubmit,
  onCancel,
  isLoading,
}: StudentFormProps) {
  const { data: classesData } = useClasses();
  const { data: activeYearData } = useActiveAcademicYear();
  const allClasses = Array.isArray(classesData?.data) ? classesData.data : [];
  const activeYear = activeYearData?.data;
  const isCreating = !student;
  const [activeTab, setActiveTab] = useState("personal");

  // Filter classes to show only classes from active academic year when creating student
  const classes = useMemo(() => {
    if (isCreating && activeYear) {
      return allClasses.filter((cls) => cls.academicYearId === activeYear.id);
    }
    return allClasses;
  }, [isCreating, activeYear, allClasses]);

  // Map field names to their tab values
  const fieldToTabMap: Record<string, string> = {
    firstName: "personal",
    lastName: "personal",
    dateOfBirth: "personal",
    gender: "personal",
    email: "personal",
    phone: "personal",
    nationality: "personal",
    religion: "personal",
    parentName: "parent",
    parentRelation: "parent",
    parentPhone: "parent",
    parentEmail: "parent",
    emergencyName: "parent",
    emergencyRelation: "parent",
    emergencyPhone: "parent",
    address: "address",
    city: "address",
    state: "address",
    zipCode: "address",
    country: "address",
    bloodGroup: "other",
    allergies: "other",
    medicalConditions: "other",
    previousSchool: "other",
    previousClass: "other",
    transferReason: "other",
    classId: "class",
    assignClassReason: "class",
  };

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    trigger,
  } = useForm<StudentFormData>({
    resolver: zodResolver(studentSchema),
    defaultValues: student
      ? {
          firstName: student.firstName,
          lastName: student.lastName,
          dateOfBirth: student.dateOfBirth.split("T")[0],
          gender: student.gender,
          nationality: student.nationality || "",
          religion: student.religion || "",
          email: student.email || "",
          phone: student.phone || "",
          parentName: student.parentName,
          parentPhone: student.parentPhone,
          parentEmail: student.parentEmail || "",
          parentRelation: student.parentRelation,
          address: student.address,
          city: student.city,
          state: student.state || "",
          zipCode: student.zipCode || "",
          country: student.country || "",
          emergencyName: student.emergencyName,
          emergencyPhone: student.emergencyPhone,
          emergencyRelation: student.emergencyRelation,
          medicalConditions: student.medicalConditions || "",
          allergies: student.allergies || "",
          bloodGroup: student.bloodGroup || "",
          previousSchool: student.previousSchool || "",
          previousClass: student.previousClass || "",
          transferReason: student.transferReason || "",
        }
      : undefined,
  });

  // Navigate to tab with first error and scroll to it
  useEffect(() => {
    const errorFields = Object.keys(errors);
    if (errorFields.length > 0) {
      const firstErrorField = errorFields[0];
      const tabForError = fieldToTabMap[firstErrorField];

      if (tabForError) {
        setActiveTab(tabForError);

        // Scroll to the error field after a short delay to allow tab switch
        setTimeout(() => {
          const errorElement = document.getElementById(firstErrorField);
          if (errorElement) {
            errorElement.scrollIntoView({
              behavior: "smooth",
              block: "center",
            });
            errorElement.focus();
          }
        }, 100);
      }
    }
  }, [errors]);

  const handleFormSubmit = async (data: StudentFormData) => {
    // Trigger validation for all fields
    const isValid = await trigger();

    if (!isValid) {
      // Find first error and navigate to its tab
      const errorFields = Object.keys(errors);
      if (errorFields.length > 0) {
        const firstErrorField = errorFields[0];
        const tabForError = fieldToTabMap[firstErrorField];

        if (tabForError) {
          setActiveTab(tabForError);

          // Scroll to the error field
          setTimeout(() => {
            const errorElement = document.getElementById(firstErrorField);
            if (errorElement) {
              errorElement.scrollIntoView({
                behavior: "smooth",
                block: "center",
              });
              errorElement.focus();
            }
          }, 100);
        }
      }
      return;
    }

    // Clean up empty strings to undefined
    const cleaned = Object.fromEntries(
      Object.entries(data).map(([key, value]) => [
        key,
        value === "" ? undefined : value,
      ])
    ) as CreateStudentRequest | UpdateStudentRequest;
    await onSubmit(cleaned);
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-4"
      >
        <TabsList
          className={`grid w-full ${
            isCreating ? "grid-cols-5" : "grid-cols-4"
          }`}
        >
          <TabsTrigger value="personal">Personal</TabsTrigger>
          <TabsTrigger value="parent">Parent</TabsTrigger>
          <TabsTrigger value="address">Address</TabsTrigger>
          <TabsTrigger value="other">Other</TabsTrigger>
          {isCreating && <TabsTrigger value="class">Class</TabsTrigger>}
        </TabsList>

        <TabsContent value="personal" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name *</Label>
              <Input id="firstName" {...register("firstName")} />
              {errors.firstName && (
                <p className="text-sm text-destructive">
                  {errors.firstName.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name *</Label>
              <Input id="lastName" {...register("lastName")} />
              {errors.lastName && (
                <p className="text-sm text-destructive">
                  {errors.lastName.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="dateOfBirth">Date of Birth *</Label>
              <Input
                id="dateOfBirth"
                type="date"
                {...register("dateOfBirth")}
              />
              {errors.dateOfBirth && (
                <p className="text-sm text-destructive">
                  {errors.dateOfBirth.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="gender">Gender *</Label>
              <Select
                value={watch("gender")}
                onValueChange={(value) => setValue("gender", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Male">Male</SelectItem>
                  <SelectItem value="Female">Female</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
              {errors.gender && (
                <p className="text-sm text-destructive">
                  {errors.gender.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                {...register("email")}
                aria-invalid={errors.email ? "true" : "false"}
                className={errors.email ? "border-destructive" : ""}
              />
              {errors.email && (
                <p className="text-sm text-destructive font-medium">
                  {errors.email.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                {...register("phone")}
                aria-invalid={errors.phone ? "true" : "false"}
                className={errors.phone ? "border-destructive" : ""}
              />
              {errors.phone && (
                <p className="text-sm text-destructive font-medium">
                  {errors.phone.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="nationality">Nationality</Label>
              <Input id="nationality" {...register("nationality")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="religion">Religion</Label>
              <Input id="religion" {...register("religion")} />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="parent" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="parentName">Parent/Guardian Name *</Label>
              <Input
                id="parentName"
                {...register("parentName")}
                aria-invalid={errors.parentName ? "true" : "false"}
                className={errors.parentName ? "border-destructive" : ""}
              />
              {errors.parentName && (
                <p className="text-sm text-destructive font-medium">
                  {errors.parentName.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="parentRelation">Relation *</Label>
              <Select
                value={watch("parentRelation")}
                onValueChange={(value) =>
                  setValue("parentRelation", value, { shouldValidate: true })
                }
              >
                <SelectTrigger
                  id="parentRelation"
                  aria-invalid={errors.parentRelation ? "true" : "false"}
                  className={errors.parentRelation ? "border-destructive" : ""}
                >
                  <SelectValue placeholder="Select relation" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Father">Father</SelectItem>
                  <SelectItem value="Mother">Mother</SelectItem>
                  <SelectItem value="Guardian">Guardian</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
              {errors.parentRelation && (
                <p className="text-sm text-destructive font-medium">
                  {errors.parentRelation.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="parentPhone">Parent Phone *</Label>
              <Input
                id="parentPhone"
                {...register("parentPhone")}
                aria-invalid={errors.parentPhone ? "true" : "false"}
                className={errors.parentPhone ? "border-destructive" : ""}
              />
              {errors.parentPhone && (
                <p className="text-sm text-destructive font-medium">
                  {errors.parentPhone.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="parentEmail">Parent Email</Label>
              <Input
                id="parentEmail"
                type="email"
                {...register("parentEmail")}
                aria-invalid={errors.parentEmail ? "true" : "false"}
                className={errors.parentEmail ? "border-destructive" : ""}
              />
              {errors.parentEmail && (
                <p className="text-sm text-destructive font-medium">
                  {errors.parentEmail.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="emergencyName">Emergency Contact Name *</Label>
              <Input
                id="emergencyName"
                {...register("emergencyName")}
                aria-invalid={errors.emergencyName ? "true" : "false"}
                className={errors.emergencyName ? "border-destructive" : ""}
              />
              {errors.emergencyName && (
                <p className="text-sm text-destructive font-medium">
                  {errors.emergencyName.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="emergencyRelation">Emergency Relation *</Label>
              <Input
                id="emergencyRelation"
                {...register("emergencyRelation")}
                aria-invalid={errors.emergencyRelation ? "true" : "false"}
                className={errors.emergencyRelation ? "border-destructive" : ""}
              />
              {errors.emergencyRelation && (
                <p className="text-sm text-destructive font-medium">
                  {errors.emergencyRelation.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="emergencyPhone">Emergency Phone *</Label>
              <Input
                id="emergencyPhone"
                {...register("emergencyPhone")}
                aria-invalid={errors.emergencyPhone ? "true" : "false"}
                className={errors.emergencyPhone ? "border-destructive" : ""}
              />
              {errors.emergencyPhone && (
                <p className="text-sm text-destructive font-medium">
                  {errors.emergencyPhone.message}
                </p>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="address" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2 space-y-2">
              <Label htmlFor="address">Address *</Label>
              <Input
                id="address"
                {...register("address")}
                aria-invalid={errors.address ? "true" : "false"}
                className={errors.address ? "border-destructive" : ""}
              />
              {errors.address && (
                <p className="text-sm text-destructive font-medium">
                  {errors.address.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="city">City *</Label>
              <Input
                id="city"
                {...register("city")}
                aria-invalid={errors.city ? "true" : "false"}
                className={errors.city ? "border-destructive" : ""}
              />
              {errors.city && (
                <p className="text-sm text-destructive font-medium">
                  {errors.city.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="state">State</Label>
              <Input id="state" {...register("state")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="zipCode">Zip Code</Label>
              <Input id="zipCode" {...register("zipCode")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="country">Country</Label>
              <Input id="country" {...register("country")} />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="other" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="bloodGroup">Blood Group</Label>
              <Input id="bloodGroup" {...register("bloodGroup")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="allergies">Allergies</Label>
              <Input id="allergies" {...register("allergies")} />
            </div>
            <div className="md:col-span-2 space-y-2">
              <Label htmlFor="medicalConditions">Medical Conditions</Label>
              <Input
                id="medicalConditions"
                {...register("medicalConditions")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="previousSchool">Previous School</Label>
              <Input id="previousSchool" {...register("previousSchool")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="previousClass">Previous Class</Label>
              <Input id="previousClass" {...register("previousClass")} />
            </div>
            <div className="md:col-span-2 space-y-2">
              <Label htmlFor="transferReason">Transfer Reason</Label>
              <Input id="transferReason" {...register("transferReason")} />
            </div>
          </div>
        </TabsContent>

        {isCreating && (
          <TabsContent value="class" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="classId">Assign to Class (Optional)</Label>
                <Select
                  value={watch("classId") || undefined}
                  onValueChange={(value) =>
                    setValue("classId", value || undefined, {
                      shouldValidate: true,
                    })
                  }
                >
                  <SelectTrigger
                    id="classId"
                    aria-invalid={errors.classId ? "true" : "false"}
                    className={errors.classId ? "border-destructive" : ""}
                  >
                    <SelectValue placeholder="Select a class (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {classes.length === 0 ? (
                      <div className="px-2 py-1.5 text-sm text-muted-foreground">
                        {isCreating && activeYear
                          ? `No classes found in active academic year (${activeYear.name})`
                          : "No classes available"}
                      </div>
                    ) : (
                      classes.map((cls) => (
                        <SelectItem key={cls.id} value={cls.id}>
                          {cls.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                {errors.classId && (
                  <p className="text-sm text-destructive font-medium">
                    {errors.classId.message}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  You can assign the student to a class now or do it later
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="assignClassReason">
                  Assignment Reason (Optional)
                </Label>
                <Input
                  id="assignClassReason"
                  {...register("assignClassReason")}
                  placeholder="e.g., Initial assignment"
                  disabled={!watch("classId")}
                  aria-invalid={errors.assignClassReason ? "true" : "false"}
                  className={
                    errors.assignClassReason ? "border-destructive" : ""
                  }
                />
                {errors.assignClassReason && (
                  <p className="text-sm text-destructive font-medium">
                    {errors.assignClassReason.message}
                  </p>
                )}
              </div>
            </div>
          </TabsContent>
        )}
      </Tabs>

      <div className="flex justify-end gap-2">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isLoading}
          >
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={isLoading}>
          {isLoading
            ? "Saving..."
            : student
            ? "Update Student"
            : "Create Student"}
        </Button>
      </div>
    </form>
  );
}
