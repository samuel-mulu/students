'use client';

import { useRouter } from 'next/navigation';
import { useCreateStudent } from '@/lib/hooks/use-students';
import { StudentForm } from '@/components/forms/StudentForm';
import { CreateStudentRequest } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function NewStudentPage() {
  const router = useRouter();
  const createStudent = useCreateStudent();

  const handleSubmit = async (data: CreateStudentRequest) => {
    const result = await createStudent.mutateAsync(data);
    router.push(`/dashboard/students/${result.id}`);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-page-title">Add New Student</h1>
        <p className="text-body text-muted-foreground mt-1">
          Enter student information to create a new record
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Student Information</CardTitle>
        </CardHeader>
        <CardContent>
          <StudentForm
            onSubmit={handleSubmit}
            onCancel={() => router.back()}
            isLoading={createStudent.isPending}
          />
        </CardContent>
      </Card>
    </div>
  );
}

