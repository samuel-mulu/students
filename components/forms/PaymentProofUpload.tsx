'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { paymentsApi } from '@/lib/api/payments';
import { Upload, X, Loader2, Image as ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PaymentProofUploadProps {
  imageUrl?: string;
  transactionNumber?: string;
  onImageChange: (imageUrl: string) => void;
  onTransactionNumberChange: (transactionNumber: string) => void;
  onRemove?: () => void;
  disabled?: boolean;
  className?: string;
}

export function PaymentProofUpload({
  imageUrl,
  transactionNumber,
  onImageChange,
  onTransactionNumberChange,
  onRemove,
  disabled = false,
  className,
}: PaymentProofUploadProps) {
  const [preview, setPreview] = useState<string | null>(imageUrl || null);
  const [isUploading, setIsUploading] = useState(false);
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

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image size must be less than 5MB');
      return;
    }

    setError(null);
    setIsUploading(true);

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    try {
      // Upload to Cloudinary
      const result = await paymentsApi.uploadProof(file);
      onImageChange(result.imageUrl);
      setPreview(result.imageUrl);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to upload image');
      setPreview(null);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemove = () => {
    setPreview(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onImageChange('');
    onTransactionNumberChange('');
    if (onRemove) {
      onRemove();
    }
  };

  const handleClick = () => {
    if (!disabled && !isUploading) {
      fileInputRef.current?.click();
    }
  };

  return (
    <div className={cn('space-y-4', className)}>
      <div className="space-y-2">
        <Label>Transfer Proof Image (Optional)</Label>
        <div className="flex items-start gap-4">
          {/* Image Preview */}
          <div className="relative">
            {preview ? (
              <div className="relative">
                <img
                  src={preview}
                  alt="Payment proof preview"
                  className="h-24 w-24 rounded-lg object-cover border-2 border-gray-200"
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
              <div className="h-24 w-24 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center bg-gray-50">
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
                disabled={disabled || isUploading}
                className="flex items-center gap-2"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" />
                    {preview ? 'Change Image' : 'Upload Image'}
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

      <div className="space-y-2">
        <Label htmlFor="transactionNumber">Transaction Number (Optional)</Label>
        <Input
          id="transactionNumber"
          type="text"
          value={transactionNumber || ''}
          onChange={(e) => onTransactionNumberChange(e.target.value)}
          placeholder="Enter transaction/reference number"
          disabled={disabled}
        />
        <p className="text-xs text-muted-foreground">
          Enter the transaction or reference number from your mobile banking transfer
        </p>
      </div>
    </div>
  );
}
