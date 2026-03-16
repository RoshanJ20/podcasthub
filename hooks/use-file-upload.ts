/**
 * Custom hook for file uploads with progress tracking.
 *
 * Handles fetching a presigned URL from /api/upload, then uploading
 * the file via XMLHttpRequest with real-time progress updates.
 * Designed to work with the admin podcast upload form.
 */
'use client';

import { useState, useCallback } from 'react';

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
 * const { progress, isUploading, error, uploadedKey, upload } = useFileUpload();
 * const key = await upload(file, 'thumbnail');
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
      // Step 1: Request a presigned upload URL from the server
      const presignResponse = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: file.name,
          content_type: file.type,
          file_size: file.size,
          category,
        }),
      });

      if (!presignResponse.ok) {
        const body = await presignResponse.json().catch(() => ({}));
        throw new Error(body.message || 'Failed to get upload URL');
      }

      const { data } = await presignResponse.json();
      const { upload_url: url, key } = data;

      // Step 2: Upload the file via XHR with progress tracking
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable) {
            const percent = Math.round((event.loaded / event.total) * 100);
            setProgress(percent);
          }
        });

        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve();
          } else {
            reject(new Error(`Upload failed with status ${xhr.status}`));
          }
        });

        xhr.addEventListener('error', () => {
          reject(new Error('Network error during upload'));
        });

        xhr.addEventListener('abort', () => {
          reject(new Error('Upload was aborted'));
        });

        xhr.open('PUT', url);
        xhr.setRequestHeader('Content-Type', file.type);
        xhr.send(file);
      });

      setUploadedKey(key);
      setIsUploading(false);
      return key;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Upload failed';
      setError(message);
      setIsUploading(false);
      return null;
    }
  }, []);

  return { progress, isUploading, error, uploadedKey, upload };
}
