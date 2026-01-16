'use client';

import { use } from 'react';
import { useBadgePreview, useDownloadBadge } from '@/lib/hooks/use-badge';
import { BadgeFront } from '@/components/badge/BadgeFront';
import { BadgeBack } from '@/components/badge/BadgeBack';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingState } from '@/components/shared/LoadingState';
import { ErrorState } from '@/components/shared/ErrorState';
import { Download, FileText, Image as ImageIcon } from 'lucide-react';
import { BackButton } from '@/components/shared/BackButton';

export default function BadgePage({
  params,
}: {
  params: Promise<{ studentId: string }>;
}) {
  const { studentId } = use(params);
  const { data: badgeData, isLoading, error } = useBadgePreview(studentId);
  const { download } = useDownloadBadge();

  if (isLoading) {
    return <LoadingState rows={5} columns={2} />;
  }

  if (error) {
    return <ErrorState message="Failed to load badge data." />;
  }

  if (!badgeData?.data) {
    return <ErrorState message="Badge data not found." />;
  }

  const handleDownload = (format: 'pdf' | 'png', side: 'front' | 'back' | 'combined') => {
    download(studentId, format, side);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <BackButton href={`/dashboard/students/${studentId}`} />
          <div>
            <h1 className="text-xl font-semibold">Student ID Badge</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {badgeData.data.student.firstName} {badgeData.data.student.lastName}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Front Badge */}
        <Card>
          <CardHeader>
            <CardTitle>Front</CardTitle>
            <CardDescription>Student ID Badge - Front Side</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-center bg-slate-50 p-4 rounded-lg border-2 border-dashed border-slate-300">
              <div style={{ transform: 'scale(1.5)', transformOrigin: 'top center' }}>
                <BadgeFront data={badgeData.data} />
              </div>
            </div>
            <div className="flex flex-wrap gap-2 justify-center">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDownload('pdf', 'front')}
              >
                <FileText className="h-4 w-4 mr-2" />
                Download Front PDF
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDownload('png', 'front')}
              >
                <ImageIcon className="h-4 w-4 mr-2" />
                Download Front PNG
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Back Badge */}
        <Card>
          <CardHeader>
            <CardTitle>Back</CardTitle>
            <CardDescription>Student ID Badge - Back Side</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-center bg-slate-50 p-4 rounded-lg border-2 border-dashed border-slate-300">
              <div style={{ transform: 'scale(1.5)', transformOrigin: 'top center' }}>
                <BadgeBack data={badgeData.data} />
              </div>
            </div>
            <div className="flex flex-wrap gap-2 justify-center">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDownload('pdf', 'back')}
              >
                <FileText className="h-4 w-4 mr-2" />
                Download Back PDF
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDownload('png', 'back')}
              >
                <ImageIcon className="h-4 w-4 mr-2" />
                Download Back PNG
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Combined Download */}
      <Card>
        <CardHeader>
          <CardTitle>Combined Badge</CardTitle>
          <CardDescription>Download both front and back as a single PDF</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center">
            <Button
              onClick={() => handleDownload('pdf', 'combined')}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Download className="h-4 w-4 mr-2" />
              Download Combined PDF
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
