'use client';

import { BadgeBack } from '@/components/badge/BadgeBack';
import { BadgeFront } from '@/components/badge/BadgeFront';
import { BackButton } from '@/components/shared/BackButton';
import { ErrorState } from '@/components/shared/ErrorState';
import { LoadingState } from '@/components/shared/LoadingState';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useBadgePreview, useDownloadBadge } from '@/lib/hooks/use-badge';
import { Download, FileText, Image as ImageIcon, Layout, Square } from 'lucide-react';
import { use, useState } from 'react';

export default function BadgePage({
  params,
}: {
  params: Promise<{ studentId: string }>;
}) {
  const { studentId } = use(params);
  const [badgeType, setBadgeType] = useState<'full' | 'minimal'>('full');
  const { data: badgeData, isLoading, error } = useBadgePreview(studentId);
  const { download, downloadForWord } = useDownloadBadge();

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
    download(studentId, format, side, badgeType === 'minimal');
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

        <Tabs value={badgeType} onValueChange={(v) => setBadgeType(v as any)} className="w-auto">
          <TabsList>
            <TabsTrigger value="full" className="flex items-center gap-2">
              <Layout className="h-4 w-4" />
              Full Badge
            </TabsTrigger>
            <TabsTrigger value="minimal" className="flex items-center gap-2">
              <Square className="h-4 w-4" />
              Minimal (Name + QR)
            </TabsTrigger>
          </TabsList>
        </Tabs>
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
                <BadgeFront data={badgeData.data} minimal={badgeType === 'minimal'} />
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
          <div className="flex flex-col gap-3 items-center">
            <Button
              onClick={() => handleDownload('pdf', 'combined')}
              className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto"
            >
              <Download className="h-4 w-4 mr-2" />
              Download Combined PDF
            </Button>
            <Button
              onClick={() => downloadForWord(studentId, 'combined', badgeType === 'minimal')}
              variant="outline"
              className="w-full sm:w-auto"
            >
              <FileText className="h-4 w-4 mr-2" />
              Download for Word (Editable)
            </Button>
            <p className="text-xs text-muted-foreground text-center mt-2">
              Word file can be edited to add multiple students on one page
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
