/**
 * Custom hook for file uploads with progress tracking.
 *
 * Uploads files directly to /api/upload/file (server-side proxy to MinIO/S3).
 * This avoids CORS issues that occur with browser-to-MinIO presigned URL uploads.
 */
'use client';

import { useState, useCallback } from 'react';
import { withBasePath } from '@/lib/config/base-path';

interface UseFileUploadReturn {
  /** Upload progress percentage (0-100). */
  progress: number;
  /** Whether an upload is currently in progress. */
  isUploading: boolean;
  /** Error message if the upload failed. */
  error: string | null;
  /** The storage key returned after a successful upload. */
  uploadedKey: string | null;
  /** Initiates a file upload for the given category. */
  upload: (file: File, category: string) => Promise<string | null>;
}

/**
 * Provides file upload functionality with progress tracking.
 *
 * @returns Upload state and the upload function.
 *
 * @example
 * const { progress, isUploading, error, upload } = useFileUpload();
 * const key = await upload(file, 'image');
 */
export function useFileUpload(): UseFileUploadReturn {
  const [progress, setProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadedKey, setUploadedKey] = useState<string | null>(null);

  const upload = useCallback(async (file: File, category: string): Promise<string | null> => {
    setProgress(0);
    setIsUploading(true);
    setError(null);
    setUploadedKey(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('category', category);

      // Upload via XHR for progress tracking
      const result = await new Promise<string>((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable) {
            setProgress(Math.round((event.loaded / event.total) * 100));
          }
        });

        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const data = JSON.parse(xhr.responseText);
              resolve(data.data.key);
            } catch {
              reject(new Error('Invalid response from server'));
            }
          } else {
            try {
              const data = JSON.parse(xhr.responseText);
              reject(new Error(data.message || `Upload failed (${xhr.status})`));
            } catch {
              reject(new Error(`Upload failed with status ${xhr.status}`));
            }
          }
        });

        xhr.addEventListener('error', () => reject(new Error('Network error during upload')));
        xhr.addEventListener('abort', () => reject(new Error('Upload was aborted')));

        xhr.open('POST', withBasePath('/api/upload/file'));
        xhr.timeout = 120000; // 2 minutes for file uploads
        xhr.send(formData);
      });

      setUploadedKey(result);
      setIsUploading(false);
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Upload failed';
      setError(message);
      setIsUploading(false);
      return null;
    }
  }, []);

  return { progress, isUploading, error, uploadedKey, upload };
}
