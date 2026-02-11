'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { studentsApi } from '@/lib/api/students';
import { cn } from '@/lib/utils';
import { Image as ImageIcon, Loader2, Upload, X } from 'lucide-react';
import { useRef, useState } from 'react';

interface ImageUploadProps {
  value?: string; // Current image URL
  onChange: (imageUrl: string) => void; // Callback when image is uploaded
  onRemove?: () => void; // Optional callback when image is removed
  disabled?: boolean;
  className?: string;
}

export function ImageUpload({
  value,
  onChange,
  onRemove,
  disabled = false,
  className,
}: ImageUploadProps) {
  const [preview, setPreview] = useState<string | null>(value || null);
  const [isUploading, setIsUploading] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    setError(null);

    // Dynamically import to keep bundle smaller
    const imageCompression = (await import('browser-image-compression')).default;

    let fileToUpload = file;

    // Show preview immediately for original file
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    try {
      setIsCompressing(true);

      const compressionOptions = {
        maxSizeMB: 0.5, // Aim for < 500KB
        maxWidthOrHeight: 1200,
        useWebWorker: true,
      };

      console.log('Original size:', file.size / 1024 / 1024, 'MB');

      fileToUpload = await imageCompression(file, compressionOptions);

      console.log('Compressed size:', fileToUpload.size / 1024 / 1024, 'MB');

      setIsCompressing(false);
      setIsUploading(true);

      // Upload to Cloudinary
      const result = await studentsApi.uploadImage(fileToUpload);
      onChange(result.imageUrl);
      setPreview(result.imageUrl);
    } catch (err: any) {
      console.error('Upload Error:', err);
      setError(err.response?.data?.error || err.message || 'Failed to process image');
      setPreview(value || null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } finally {
      setIsCompressing(false);
      setIsUploading(false);
    }
  };

  const handleRemove = () => {
    setPreview(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    if (onRemove) {
      onRemove();
    } else {
      onChange('');
    }
  };

  const handleClick = () => {
    if (!disabled && !isUploading) {
      fileInputRef.current?.click();
    }
  };

  return (
    <div className={cn('space-y-2', className)}>
      <Label>Profile Photo (Optional)</Label>
      <div className="flex items-start gap-4">
        {/* Image Preview */}
        <div className="relative">
          {preview ? (
            <div className="relative">
              <img
                src={preview}
                alt="Profile preview"
                className="h-24 w-24 rounded-full object-cover border-2 border-gray-200"
              />
              {!disabled && (
                <button
                  type="button"
                  onClick={handleRemove}
                  className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600 transition-colors"
                  disabled={isUploading}
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          ) : (
            <div className="h-24 w-24 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center bg-gray-50">
              <ImageIcon className="h-8 w-8 text-gray-400" />
            </div>
          )}
        </div>

        {/* Upload Controls */}
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <Input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              disabled={disabled || isUploading}
              className="hidden"
            />
            <Button
              type="button"
              variant="outline"
              onClick={handleClick}
              disabled={disabled || isUploading || isCompressing}
              className="flex items-center gap-2"
            >
              {isCompressing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Compressing...
                </>
              ) : isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  {preview ? 'Change Photo' : 'Upload Photo'}
                </>
              )}
            </Button>
          </div>
          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}
          <p className="text-xs text-muted-foreground">
            JPG, PNG or GIF. Max size 5MB.
          </p>
        </div>
      </div>
    </div>
  );
}
