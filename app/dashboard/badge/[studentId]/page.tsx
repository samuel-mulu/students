'use client';

import { BadgeFront } from '@/components/badge/BadgeFront';
import { BackButton } from '@/components/shared/BackButton';
import { ErrorState } from '@/components/shared/ErrorState';
import { LoadingState } from '@/components/shared/LoadingState';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useBadgePreview, useDownloadBadge } from '@/lib/hooks/use-badge';
import { Circle, Download, FileText, Image as ImageIcon, Layout, Square } from 'lucide-react';
import { use, useState } from 'react';

export default function BadgePage({
  params,
}: {
  params: Promise<{ studentId: string }>;
}) {
  const { studentId } = use(params);
  const [badgeType, setBadgeType] = useState<'full' | 'minimal'>('full');
  const [photoStyle, setPhotoStyle] = useState<'square' | 'rounded' | 'circle'>('square');
  const [isDownloading, setIsDownloading] = useState<string | null>(null);
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

  const handleDownload = async (format: 'pdf' | 'png', side: 'front' | 'back' | 'combined') => {
    const id = `${format}-${side}`;
    setIsDownloading(id);
    try {
      await download(studentId, format, side, badgeType === 'minimal', photoStyle);
    } finally {
      setIsDownloading(null);
    }
  };

  const handleDownloadForWord = async () => {
    setIsDownloading('word');
    try {
      await downloadForWord(studentId, 'front', badgeType === 'minimal', photoStyle);
    } finally {
      setIsDownloading(null);
    }
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

        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            Badge Type:
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

          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mt-2">
            Photo Style:
          </div>
          <Tabs value={photoStyle} onValueChange={(v) => setPhotoStyle(v as any)} className="w-auto">
            <TabsList>
              <TabsTrigger value="square" className="flex items-center gap-2">
                <Square className="h-4 w-4" />
                Square
              </TabsTrigger>
              <TabsTrigger value="rounded" className="flex items-center gap-2">
                <Square className="h-4 w-4 rounded-sm" />
                Rounded
              </TabsTrigger>
              <TabsTrigger value="circle" className="flex items-center gap-2">
                <Circle className="h-4 w-4" />
                Circle
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* Front Badge */}
        <Card>
          <CardHeader>
            <CardTitle>ID Badge Preview</CardTitle>
            <CardDescription>Front side with school contact information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-center bg-slate-50 p-4 rounded-lg border-2 border-dashed border-slate-300 overflow-hidden">
              <div style={{ transform: 'scale(1.5)', transformOrigin: 'top center', paddingBottom: '30mm' }}>
                <BadgeFront data={badgeData.data} minimal={badgeType === 'minimal'} photoStyle={photoStyle} />
              </div>
            </div>
            <div className="flex flex-wrap gap-2 justify-center">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDownload('pdf', 'front')}
                disabled={!!isDownloading}
              >
                <FileText className="h-4 w-4 mr-2" />
                {isDownloading === 'pdf-front' ? 'Downloading...' : 'Download PDF'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDownload('png', 'front')}
                disabled={!!isDownloading}
              >
                <ImageIcon className="h-4 w-4 mr-2" />
                {isDownloading === 'png-front' ? 'Downloading...' : 'Download PNG'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Download Options */}
      <Card>
        <CardHeader>
          <CardTitle>Download Options</CardTitle>
          <CardDescription>Export your student ID badge</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3 items-center">
            <Button
              onClick={() => handleDownload('pdf', 'front')}
              disabled={!!isDownloading}
              className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto"
            >
              <Download className="h-4 w-4 mr-2" />
              {isDownloading === 'pdf-front' ? 'Downloading...' : 'Download PDF Badge'}
            </Button>
            <Button
              onClick={handleDownloadForWord}
              disabled={!!isDownloading}
              variant="outline"
              className="w-full sm:w-auto"
            >
              <FileText className="h-4 w-4 mr-2" />
              {isDownloading === 'word' ? 'Downloading...' : 'Download for Word (Editable)'}
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
