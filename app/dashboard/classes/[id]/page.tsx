'use client';

import { use } from 'react';
import { useClass, useClassSubjects, useCreateSubject, useDeleteSubject, useUpdateClass } from '@/lib/hooks/use-classes';
import { useStudents } from '@/lib/hooks/use-students';
import { useTeachers } from '@/lib/hooks/use-users';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LoadingState } from '@/components/shared/LoadingState';
import { ErrorState } from '@/components/shared/ErrorState';
import { Plus, Trash2, Users, BookOpen, Calendar, GraduationCap, School, ChevronDown, ChevronUp, UserCog } from 'lucide-react';
import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CreateSubjectRequest } from '@/lib/types';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { StudentsTable } from '@/components/tables/StudentsTable';
import { BackButton } from '@/components/shared/BackButton';

const subjectSchema = z.object({
  name: z.string().min(1, 'Subject name is required'),
  code: z.string().optional(),
  description: z.string().optional(),
});

type SubjectFormData = z.infer<typeof subjectSchema>;

export default function ClassDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [subjectDialog, setSubjectDialog] = useState(false);
  const [subjectsExpanded, setSubjectsExpanded] = useState(true);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; subjectId: string | null }>({
    open: false,
    subjectId: null,
  });

  const { data: classData, isLoading: classLoading, error: classError } = useClass(id);
  const { data: subjectsData, isLoading: subjectsLoading } = useClassSubjects(id);
  const { data: studentsData, isLoading: studentsLoading } = useStudents({ 
    classId: id,
    page,
    limit,
  });
  const { data: teachersData } = useTeachers();
  const createSubject = useCreateSubject();
  const deleteSubject = useDeleteSubject();
  const updateClass = useUpdateClass();
  const [assignTeacherDialog, setAssignTeacherDialog] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<SubjectFormData>({
    resolver: zodResolver(subjectSchema),
  });

  const handleCreateSubject = async (data: SubjectFormData) => {
    await createSubject.mutateAsync({ classId: id, data: data as CreateSubjectRequest });
    reset();
    setSubjectDialog(false);
  };

  const handleDeleteSubject = async () => {
    if (deleteDialog.subjectId) {
      await deleteSubject.mutateAsync(deleteDialog.subjectId);
      setDeleteDialog({ open: false, subjectId: null });
    }
  };

  if (classLoading) {
    return <LoadingState rows={5} columns={2} />;
  }

  if (classError || !classData?.data) {
    return <ErrorState message="Failed to load class details" />;
  }

  const cls = classData.data;
  const subjects = Array.isArray(subjectsData?.data) ? subjectsData.data : [];
  const students = Array.isArray(studentsData?.data) ? studentsData.data : [];
  const studentCount = studentsData?.pagination?.total || students.length;
  const teachers = Array.isArray(teachersData?.data) ? teachersData.data : [];

  const handleAssignHeadTeacher = async (teacherId: string) => {
    const updateData: any = {};
    if (teacherId === '' || teacherId === 'none') {
      updateData.headTeacherId = null;
    } else {
      updateData.headTeacherId = teacherId;
    }
    await updateClass.mutateAsync({
      id: cls.id,
      data: updateData,
    });
    setAssignTeacherDialog(false);
  };

  const handleRemoveHeadTeacher = async () => {
    await updateClass.mutateAsync({
      id: cls.id,
      data: { headTeacherId: null },
    });
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <BackButton href="/dashboard/classes" />
          <div className="flex items-center gap-3">
            <div className="p-3 bg-slate-100 rounded-lg border border-slate-200">
              <GraduationCap className="h-8 w-8 text-slate-700" />
            </div>
            <div>
              <h1 className="text-xl font-semibold">{cls.name}</h1>
              <p className="text-sm text-muted-foreground mt-1">
                {cls.description || 'Class Details'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Class Information Card */}
      <Card className="border border-slate-200 shadow-sm">
        <CardHeader className="bg-slate-50 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <School className="h-5 w-5 text-slate-600" />
            <CardTitle className="text-slate-900">Class Information</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="flex items-start gap-3 p-4 bg-white rounded-lg border border-slate-200 hover:border-slate-300 transition-colors">
              <div className="p-2 bg-slate-100 rounded-lg">
                <BookOpen className="h-4 w-4 text-slate-600" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Class Name</p>
                <p className="text-base font-semibold text-gray-900 mt-1">{cls.name}</p>
              </div>
            </div>
            
            {cls.description && (
              <div className="flex items-start gap-3 p-4 bg-white rounded-lg border border-slate-200 hover:border-slate-300 transition-colors">
                <div className="p-2 bg-slate-100 rounded-lg">
                  <BookOpen className="h-4 w-4 text-slate-600" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Description</p>
                  <p className="text-base font-semibold text-gray-900 mt-1">{cls.description}</p>
                </div>
              </div>
            )}
            
            {cls.academicYear && (
              <div className="flex items-start gap-3 p-4 bg-white rounded-lg border border-slate-200 hover:border-slate-300 transition-colors">
                <div className="p-2 bg-slate-100 rounded-lg">
                  <Calendar className="h-4 w-4 text-slate-600" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Academic Year</p>
                  <p className="text-base font-semibold text-gray-900 mt-1">
                    {typeof cls.academicYear === 'string' ? cls.academicYear : cls.academicYear.name}
                  </p>
                </div>
              </div>
            )}
            
            <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-lg border border-slate-200">
              <div className="p-2 bg-slate-200 rounded-lg">
                <Users className="h-4 w-4 text-slate-700" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-medium text-slate-600 uppercase tracking-wide">Total Students</p>
                <p className="text-xl font-bold text-slate-900 mt-1">{studentCount}</p>
              </div>
            </div>
            
            {cls.headTeacher ? (
              <div className="flex items-start gap-3 p-4 bg-white rounded-lg border border-slate-200 hover:border-slate-300 transition-colors">
                <div className="p-2 bg-slate-100 rounded-lg">
                  <UserCog className="h-4 w-4 text-slate-600" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-medium text-slate-600 uppercase tracking-wide">Head Teacher</p>
                  <p className="text-base font-semibold text-gray-900 mt-1">
                    {cls.headTeacher.name}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setAssignTeacherDialog(true)}
                  >
                    Change
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRemoveHeadTeacher}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    disabled={updateClass.isPending}
                  >
                    Remove
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-3 p-4 bg-white rounded-lg border border-slate-200 hover:border-slate-300 transition-colors">
                <div className="p-2 bg-slate-100 rounded-lg">
                  <UserCog className="h-4 w-4 text-slate-600" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-medium text-slate-600 uppercase tracking-wide">Head Teacher</p>
                  <p className="text-base font-semibold text-gray-500 mt-1">Not Assigned</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setAssignTeacherDialog(true)}
                >
                  Assign
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Subjects Card with Toggle */}
      <Card className="border border-slate-200 shadow-sm">
        <CardHeader className="bg-slate-50 border-b border-slate-200">
          <div className="flex flex-row items-center justify-between">
            <button
              onClick={() => setSubjectsExpanded(!subjectsExpanded)}
              className="flex items-center gap-3 hover:opacity-80 transition-opacity cursor-pointer"
            >
              <BookOpen className="h-5 w-5 text-slate-600" />
              <div className="text-left">
                <CardTitle className="text-slate-900">Subjects</CardTitle>
                <CardDescription className="text-slate-600">
                  {subjects.length} {subjects.length === 1 ? 'subject' : 'subjects'}
                </CardDescription>
              </div>
              {subjectsExpanded ? (
                <ChevronUp className="h-5 w-5 text-slate-600 ml-auto" />
              ) : (
                <ChevronDown className="h-5 w-5 text-slate-600 ml-auto" />
              )}
            </button>
            <Button 
              onClick={() => setSubjectDialog(true)}
              variant="outline"
              size="sm"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Subject
            </Button>
          </div>
        </CardHeader>
        {subjectsExpanded && (
          <CardContent className="p-6">
            {subjectsLoading ? (
              <LoadingState rows={3} columns={3} />
            ) : subjects.length === 0 ? (
              <div className="text-center py-12">
                <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                <p className="text-sm text-muted-foreground">No subjects added yet</p>
                <Button 
                  onClick={() => setSubjectDialog(true)}
                  variant="outline"
                  className="mt-4"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add First Subject
                </Button>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {subjects.map((subject) => (
                  <div
                    key={subject.id}
                    className="flex items-start justify-between p-4 border border-slate-200 rounded-lg bg-white hover:border-slate-300 hover:shadow-sm transition-all"
                  >
                    <div className="flex items-start gap-3 flex-1">
                      <div className="p-2 bg-slate-100 rounded-lg">
                        <BookOpen className="h-4 w-4 text-slate-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900">{subject.name}</p>
                        {subject.code && (
                          <p className="text-sm text-muted-foreground mt-1">Code: {subject.code}</p>
                        )}
                        {subject.description && (
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{subject.description}</p>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeleteDialog({ open: true, subjectId: subject.id })}
                      className="ml-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        )}
      </Card>

      {/* Students Table Section */}
      <Card className="border border-slate-200 shadow-sm">
        <CardHeader className="bg-slate-50 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <Users className="h-5 w-5 text-slate-600" />
            <div>
              <CardTitle className="text-slate-900">Students in Class</CardTitle>
              <CardDescription className="text-slate-600">
                {studentCount} {studentCount === 1 ? 'student' : 'students'} enrolled in this class
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {studentsLoading ? (
            <LoadingState rows={5} columns={3} />
          ) : students.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <p className="text-sm text-muted-foreground">No students assigned to this class yet</p>
            </div>
          ) : (
            <>
              <StudentsTable 
                students={students} 
                showActions={false}
              />
              {studentsData?.pagination && studentsData.pagination.totalPages > 1 && (
                <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-200">
                  <p className="text-sm text-muted-foreground">
                    Showing {(page - 1) * limit + 1} to{' '}
                    {Math.min(page * limit, studentsData.pagination.total)} of{' '}
                    {studentsData.pagination.total} students
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setPage((p) => Math.min(studentsData.pagination!.totalPages, p + 1))
                      }
                      disabled={page === studentsData.pagination!.totalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={subjectDialog} onOpenChange={setSubjectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Subject</DialogTitle>
            <DialogDescription>Add a new subject to this class</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(handleCreateSubject)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Subject Name *</Label>
              <Input id="name" {...register('name')} />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="code">Subject Code</Label>
              <Input id="code" {...register('code')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input id="description" {...register('description')} />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setSubjectDialog(false)}
                disabled={createSubject.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createSubject.isPending}>
                {createSubject.isPending ? 'Adding...' : 'Add Subject'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog({ open, subjectId: deleteDialog.subjectId })}
        title="Delete Subject"
        description="Are you sure you want to delete this subject? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={handleDeleteSubject}
        variant="destructive"
      />

      <Dialog open={assignTeacherDialog} onOpenChange={setAssignTeacherDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Head Teacher</DialogTitle>
            <DialogDescription>
              Select a teacher to assign as head teacher for {cls.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="teacher">Teacher</Label>
              <Select
                value={cls.headTeacherId || 'none'}
                onValueChange={(teacherId) => {
                  handleAssignHeadTeacher(teacherId);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a teacher" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None (Remove Head Teacher)</SelectItem>
                  {teachers.map((teacher) => (
                    <SelectItem key={teacher.id} value={teacher.id}>
                      {teacher.name} ({teacher.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setAssignTeacherDialog(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

