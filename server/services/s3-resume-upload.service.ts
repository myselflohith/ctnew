import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import fs from 'fs/promises';
import path from 'path';

function requireEnv(name: string): string {
  const v = (process.env[name] || '').trim();
  if (!v) throw new Error(`${name} not configured`);
  return v;
}

function getS3Client(region?: string): S3Client {
  const resolvedRegion = (region || (process.env.RESUME_S3_REGION || '').trim() || (process.env.AWS_REGION || '').trim()).trim();
  if (!resolvedRegion) throw new Error('AWS_REGION or RESUME_S3_REGION must be set for S3');
  const accessKeyId =
    (process.env.AWS_ACCESS_KEY_ID || '').trim() || (process.env.AWS_ACCESS_KEY || '').trim();
  const secretAccessKey =
    (process.env.AWS_SECRET_ACCESS_KEY || '').trim() || (process.env.AWS_SECRET_KEY || '').trim();

  if (accessKeyId && secretAccessKey) {
    return new S3Client({
      region: resolvedRegion,
      credentials: { accessKeyId, secretAccessKey },
    });
  }

  return new S3Client({ region: resolvedRegion });
}

function buildPublicUrl(params: { bucket: string; region: string; key: string }): string {
  const base = (process.env.RESUME_S3_PUBLIC_BASE_URL || '').trim().replace(/\/$/, '');
  if (base) return `${base}/${params.key}`;
  // default virtual-hosted-style URL
  return `https://${params.bucket}.s3.${params.region}.amazonaws.com/${params.key}`;
}

function safeFileName(name: string): string {
  // Keep it readable but safe for S3 keys
  return name
    .trim()
    .replace(/[^\w.\-()+ ]+/g, '')
    .replace(/\s+/g, '_')
    .slice(0, 120);
}

export async function uploadResumeFileToS3(params: {
  localFullPath: string;
  originalFileName: string;
  contentType?: string | null;
}): Promise<{ bucket: string; key: string; url: string }> {
  const bucket = requireEnv('RESUME_S3_BUCKET');
  const prefix = (process.env.RESUME_S3_PREFIX || '').trim().replace(/^\/+|\/+$/g, '');
  const region = (process.env.RESUME_S3_REGION || '').trim() || requireEnv('AWS_REGION');

  const now = new Date();
  const yyyy = String(now.getUTCFullYear());
  const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(now.getUTCDate()).padStart(2, '0');
  const datePath = `${yyyy}-${mm}-${dd}`;

  const base = safeFileName(params.originalFileName || path.basename(params.localFullPath));
  const key = `${prefix ? `${prefix}/` : ''}${datePath}/${base}`;

  const body = await fs.readFile(params.localFullPath);

  const s3 = getS3Client(region);
  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: params.contentType || undefined,
      ACL: 'public-read', // you chose public URLs
    })
  );

  const url = buildPublicUrl({ bucket, region, key });
  return { bucket, key, url };
}

/** Upload resume from buffer (e.g. from parse-resume in-memory file). Same key pattern as uploadResumeFileToS3. */
export async function uploadResumeBufferToS3(params: {
  buffer: Buffer;
  originalFileName: string;
  contentType?: string | null;
}): Promise<{ bucket: string; key: string; url: string }> {
  const bucket = requireEnv('RESUME_S3_BUCKET');
  const prefix = (process.env.RESUME_S3_PREFIX || '').trim().replace(/^\/+|\/+$/g, '');
  const region = (process.env.RESUME_S3_REGION || '').trim() || requireEnv('AWS_REGION');

  const now = new Date();
  const yyyy = String(now.getUTCFullYear());
  const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(now.getUTCDate()).padStart(2, '0');
  const datePath = `${yyyy}-${mm}-${dd}`;

  const base = safeFileName(params.originalFileName || 'resume.pdf');
  const key = `${prefix ? `${prefix}/` : ''}${datePath}/${base}`;

  const s3 = getS3Client(region);
  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: params.buffer,
      ContentType: params.contentType || undefined,
      ACL: 'public-read',
    })
  );

  const url = buildPublicUrl({ bucket, region, key });
  return { bucket, key, url };
}
