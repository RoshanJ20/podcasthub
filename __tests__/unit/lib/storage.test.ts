/**
 * Unit tests for the S3 storage client.
 *
 * Verifies:
 * - generatePresignedUploadUrl creates a PutObject presigned URL with correct params
 * - generatePresignedDownloadUrl creates a GetObject presigned URL with correct params
 * - deleteObject sends a DeleteObjectCommand with correct params
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Declare mock functions in vi.hoisted so they are available during vi.mock hoisting
const { mockSend, mockGetSignedUrl } = vi.hoisted(() => ({
  mockSend: vi.fn(),
  mockGetSignedUrl: vi.fn(),
}));

vi.mock('@aws-sdk/client-s3', () => {
  const S3Client = vi.fn().mockImplementation(function () {
    // @ts-expect-error - mock constructor
    this.send = mockSend;
  });
  const PutObjectCommand = vi.fn().mockImplementation(function (input: Record<string, unknown>) {
    Object.assign(this, input, { _type: 'PutObject' });
  });
  const GetObjectCommand = vi.fn().mockImplementation(function (input: Record<string, unknown>) {
    Object.assign(this, input, { _type: 'GetObject' });
  });
  const DeleteObjectCommand = vi.fn().mockImplementation(function (input: Record<string, unknown>) {
    Object.assign(this, input, { _type: 'DeleteObject' });
  });
  return { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand };
});

vi.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: mockGetSignedUrl,
}));

import {
  generatePresignedUploadUrl,
  generatePresignedDownloadUrl,
  deleteObject,
} from '@/lib/storage';
import { PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

describe('S3 Storage Client', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('generatePresignedUploadUrl', () => {
    it('returns a presigned upload URL with correct parameters', async () => {
      mockGetSignedUrl.mockResolvedValue('https://s3.example.com/upload?signed=true');

      const url = await generatePresignedUploadUrl('my-bucket', 'audio/test.mp3', 'audio/mpeg');

      expect(url).toBe('https://s3.example.com/upload?signed=true');
      expect(PutObjectCommand).toHaveBeenCalledWith({
        Bucket: 'my-bucket',
        Key: 'audio/test.mp3',
        ContentType: 'audio/mpeg',
      });
      expect(mockGetSignedUrl).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ _type: 'PutObject' }),
        { expiresIn: 3600 }
      );
    });

    it('passes the correct expiry of 1 hour (3600 seconds)', async () => {
      mockGetSignedUrl.mockResolvedValue('https://s3.example.com/signed');

      await generatePresignedUploadUrl('bucket', 'key', 'text/plain');

      expect(mockGetSignedUrl).toHaveBeenCalledWith(expect.anything(), expect.anything(), {
        expiresIn: 3600,
      });
    });
  });

  describe('generatePresignedDownloadUrl', () => {
    it('returns a presigned download URL with correct parameters', async () => {
      mockGetSignedUrl.mockResolvedValue('https://s3.example.com/download?signed=true');

      const url = await generatePresignedDownloadUrl('my-bucket', 'audio/test.mp3');

      expect(url).toBe('https://s3.example.com/download?signed=true');
      expect(GetObjectCommand).toHaveBeenCalledWith({
        Bucket: 'my-bucket',
        Key: 'audio/test.mp3',
      });
      expect(mockGetSignedUrl).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ _type: 'GetObject' }),
        { expiresIn: 3600 }
      );
    });

    it('passes the correct expiry of 1 hour (3600 seconds)', async () => {
      mockGetSignedUrl.mockResolvedValue('https://s3.example.com/signed');

      await generatePresignedDownloadUrl('bucket', 'key');

      expect(mockGetSignedUrl).toHaveBeenCalledWith(expect.anything(), expect.anything(), {
        expiresIn: 3600,
      });
    });
  });

  describe('deleteObject', () => {
    it('sends a DeleteObjectCommand with correct bucket and key', async () => {
      mockSend.mockResolvedValue({});

      await deleteObject('my-bucket', 'audio/test.mp3');

      expect(DeleteObjectCommand).toHaveBeenCalledWith({
        Bucket: 'my-bucket',
        Key: 'audio/test.mp3',
      });
      expect(mockSend).toHaveBeenCalledWith(expect.objectContaining({ _type: 'DeleteObject' }));
    });

    it('returns void on success', async () => {
      mockSend.mockResolvedValue({});

      const result = await deleteObject('bucket', 'key');

      expect(result).toBeUndefined();
    });

    it('propagates errors from S3', async () => {
      mockSend.mockRejectedValue(new Error('S3 error'));

      await expect(deleteObject('bucket', 'key')).rejects.toThrow('S3 error');
    });
  });
});
