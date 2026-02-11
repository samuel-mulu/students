/**
 * Cloudinary Delivery Optimization Helper
 * 
 * This helper generates optimized URLs for images stored on Cloudinary.
 * It ensures we use auto-format (f_auto) and auto-quality (q_auto).
 */

export interface CloudinaryOptions {
  width?: number;
  height?: number;
  quality?: string;
  format?: string;
  crop?: string;
}

/**
 * Generates an optimized Cloudinary URL
 * @param input - Either a secure_url or a public_id
 * @param options - Transformation options
 * @returns Fully qualified optimized URL
 */
export function getOptimizedCloudinaryUrl(
  input: string | null | undefined,
  options: CloudinaryOptions = {}
): string | null {
  if (!input) return null;

  // Handle placeholders or non-Cloudinary URLs
  if (!input.includes('cloudinary.com') && !input.startsWith('students/')) {
    // If it's not a Cloudinary URL and not a public_id (assuming our IDs start with folder), return as is
    if (input.startsWith('http') || input.startsWith('/') || input.startsWith('data:')) {
      return input;
    }
  }

  let publicId = input;
  let cloudName = '';

  // Try to extract public_id if input is a URL
  if (input.includes('cloudinary.com')) {
    // If URL already has transformations, return as-is to avoid double-processing
    if (input.includes('f_auto') || input.includes('q_auto')) {
      return input;
    }

    // URL format: https://res.cloudinary.com/{cloud_name}/image/upload/v{version}/{public_id}.{ext}
    const match = input.match(/cloudinary\.com\/([^/]+)\/image\/upload\/(v\d+\/)?(.+)/);
    
    if (match) {
      cloudName = match[1];
      publicId = match[3].replace(/\.[^/.]+$/, ''); // Remove extension
    } else {
      // Fallback: return original URL if we can't parse it
      return input;
    }
  }

  // Fallback cloud name if extraction fails
  if (!cloudName) {
    cloudName = 'digital-kg';
  }

  // Build transformation string
  const transformations = ['f_auto', 'q_auto', 'c_limit'];
  
  if (options.width) transformations.push(`w_${options.width}`);
  if (options.height) transformations.push(`h_${options.height}`);
  if (options.quality && options.quality !== 'auto') transformations.push(`q_${options.quality}`);
  if (options.format && options.format !== 'auto') transformations.push(`f_${options.format}`);

  const transformStr = transformations.join(',');

  return `https://res.cloudinary.com/${cloudName}/image/upload/${transformStr}/${publicId}`;
}
