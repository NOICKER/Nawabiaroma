import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { allowedUploadContentTypes, type UploadUrlRequest, type UploadUrlResponse } from '../models/types.js';
import { HttpError } from '../middleware/errorHandler.js';
import { env } from '../server/config/env.js';

const storageConfigured =
    !!env.AWS_REGION &&
    !!env.AWS_ACCESS_KEY_ID &&
    !!env.AWS_SECRET_ACCESS_KEY &&
    !!env.S3_BUCKET_NAME &&
    !!env.S3_PUBLIC_BASE_URL;

const s3Client = storageConfigured
    ? new S3Client({
          region: env.AWS_REGION,
          credentials: {
              accessKeyId: env.AWS_ACCESS_KEY_ID!,
              secretAccessKey: env.AWS_SECRET_ACCESS_KEY!,
          },
      })
    : null;

function sanitizeFileName(fileName: string) {
    return fileName.replace(/[^a-zA-Z0-9._-]/g, '-').replace(/-+/g, '-');
}

export async function createProductImageUploadUrl(input: UploadUrlRequest): Promise<UploadUrlResponse> {
    if (!s3Client || !env.S3_BUCKET_NAME || !env.S3_PUBLIC_BASE_URL) {
        throw new HttpError(500, 'Media storage is not configured.');
    }

    if (!allowedUploadContentTypes.includes(input.contentType)) {
        throw new HttpError(400, 'Unsupported upload content type.');
    }

    const safeName = sanitizeFileName(input.fileName);
    const key = `${env.S3_UPLOAD_PREFIX}/${Date.now()}-${safeName}`;
    const command = new PutObjectCommand({
        Bucket: env.S3_BUCKET_NAME,
        Key: key,
        ContentType: input.contentType,
    });

    const expiresInSeconds = 900;
    const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: expiresInSeconds });
    const publicBaseUrl = env.S3_PUBLIC_BASE_URL.replace(/\/$/, '');

    return {
        key,
        publicUrl: `${publicBaseUrl}/${key}`,
        uploadUrl,
        expiresInSeconds,
    };
}
