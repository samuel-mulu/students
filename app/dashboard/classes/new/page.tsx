'use client';

import { useRouter } from 'next/navigation';
import { useCreateClass } from '@/lib/hooks/use-classes';
import { ClassForm } from '@/components/forms/ClassForm';
import { CreateClassRequest } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function NewClassPage() {
  const router = useRouter();
  const createClass = useCreateClass();

  const handleSubmit = async (data: CreateClassRequest) => {
    const result = await createClass.mutateAsync(data);
    router.push(`/dashboard/classes/${result.id}`);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-page-title">Add New Class</h1>
        <p className="text-body text-muted-foreground mt-1">
          Create a new class
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Class Information</CardTitle>
        </CardHeader>
        <CardContent>
          <ClassForm
            onSubmit={handleSubmit}
            onCancel={() => router.back()}
            isLoading={createClass.isPending}
          />
        </CardContent>
      </Card>
    </div>
  );
}

