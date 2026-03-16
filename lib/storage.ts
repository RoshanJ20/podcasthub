/**
 * S3-compatible storage client for Podcast Hub v2.
 *
 * Key responsibilities:
 * - Configures an S3Client from environment variables
 * - Generates presigned upload URLs (PutObject) with 1-hour expiry
 * - Generates presigned download URLs (GetObject) with 1-hour expiry
 * - Deletes objects from S3-compatible storage
 *
 * Environment variables:
 * - S3_ENDPOINT: The S3-compatible endpoint URL
 * - S3_ACCESS_KEY: Access key for authentication
 * - S3_SECRET_KEY: Secret key for authentication
 * - S3_REGION: AWS region (defaults to 'us-east-1')
 *
 * Dependencies:
 * - @aws-sdk/client-s3
 * - @aws-sdk/s3-request-presigner
 */
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

/** Presigned URL expiry in seconds (1 hour). */
const PRESIGN_EXPIRY_SECONDS = 3600;

/**
 * S3-compatible client configured from environment variables.
 *
 * Uses forcePathStyle to support MinIO and other S3-compatible services.
 */
export const s3Client = new S3Client({
  endpoint: process.env.S3_ENDPOINT,
  region: process.env.S3_REGION ?? 'us-east-1',
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY ?? '',
    secretAccessKey: process.env.S3_SECRET_KEY ?? '',
  },
  forcePathStyle: true,
});

/**
 * Generates a presigned URL for uploading an object via HTTP PUT.
 *
 * @param bucket - The target S3 bucket name
 * @param key - The object key (path) within the bucket
 * @param contentType - The MIME type of the file to upload
 * @returns A presigned URL valid for 1 hour
 */
export async function generatePresignedUploadUrl(
  bucket: string,
  key: string,
  contentType: string
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: contentType,
  });

  return getSignedUrl(s3Client, command, { expiresIn: PRESIGN_EXPIRY_SECONDS });
}

/**
 * Generates a presigned URL for downloading an object via HTTP GET.
 *
 * @param bucket - The source S3 bucket name
 * @param key - The object key (path) within the bucket
 * @returns A presigned URL valid for 1 hour
 */
export async function generatePresignedDownloadUrl(bucket: string, key: string): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
  });

  return getSignedUrl(s3Client, command, { expiresIn: PRESIGN_EXPIRY_SECONDS });
}

/**
 * Deletes an object from S3-compatible storage.
 *
 * @param bucket - The S3 bucket name
 * @param key - The object key (path) to delete
 */
export async function deleteObject(bucket: string, key: string): Promise<void> {
  const command = new DeleteObjectCommand({
    Bucket: bucket,
    Key: key,
  });

  await s3Client.send(command);
}
