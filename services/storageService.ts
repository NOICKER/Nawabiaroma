import { DeleteObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
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
          endpoint: env.S3_ENDPOINT,
          forcePathStyle: true,
          credentials: {
              accessKeyId: env.AWS_ACCESS_KEY_ID!,
              secretAccessKey: env.AWS_SECRET_ACCESS_KEY!,
          },
      })
    : null;

function sanitizeFileName(fileName: string) {
    return fileName.replace(/[^a-zA-Z0-9._-]/g, '-').replace(/-+/g, '-');
}

function getStorageConfig() {
    if (!s3Client || !env.S3_BUCKET_NAME || !env.S3_PUBLIC_BASE_URL) {
        throw new HttpError(500, 'Media storage is not configured.');
    }

    return {
        client: s3Client,
        bucketName: env.S3_BUCKET_NAME,
        publicBaseUrl: env.S3_PUBLIC_BASE_URL.replace(/\/$/, ''),
    };
}

function resolveStorageKeyFromPublicUrl(publicUrl: string, publicBaseUrl: string) {
    const normalizedUrl = publicUrl.trim();
    const directPrefix = `${publicBaseUrl}/`;

    if (normalizedUrl.startsWith(directPrefix)) {
        return decodeURIComponent(normalizedUrl.slice(directPrefix.length));
    }

    const parsedPublicUrl = new URL(normalizedUrl);
    const parsedBaseUrl = new URL(publicBaseUrl);

    if (parsedPublicUrl.origin !== parsedBaseUrl.origin) {
        throw new HttpError(400, 'Image URL does not belong to the configured media storage.');
    }

    const basePath = parsedBaseUrl.pathname.replace(/\/$/, '');
    const imagePath = parsedPublicUrl.pathname;
    const expectedPrefix = basePath.length > 0 ? `${basePath}/` : '/';

    if (!imagePath.startsWith(expectedPrefix)) {
        throw new HttpError(400, 'Image URL does not belong to the configured media storage.');
    }

    return decodeURIComponent(imagePath.slice(expectedPrefix.length));
}

export async function createProductImageUploadUrl(input: UploadUrlRequest): Promise<UploadUrlResponse> {
    const { client, bucketName, publicBaseUrl } = getStorageConfig();

    if (!allowedUploadContentTypes.includes(input.contentType)) {
        throw new HttpError(400, 'Unsupported upload content type.');
    }

    const safeName = sanitizeFileName(input.fileName);
    const key = `${env.S3_UPLOAD_PREFIX}/${Date.now()}-${safeName}`;
    const command = new PutObjectCommand({
        Bucket: bucketName,
        Key: key,
        ContentType: input.contentType,
    });

    const expiresInSeconds = 900;
    const uploadUrl = await getSignedUrl(client, command, { expiresIn: expiresInSeconds });

    return {
        key,
        publicUrl: `${publicBaseUrl}/${key}`,
        uploadUrl,
        expiresInSeconds,
    };
}

export async function deleteProductImageFromStorage(publicUrl: string) {
    const { client, bucketName, publicBaseUrl } = getStorageConfig();
    const key = resolveStorageKeyFromPublicUrl(publicUrl, publicBaseUrl);

    await client.send(
        new DeleteObjectCommand({
            Bucket: bucketName,
            Key: key,
        }),
    );
}
