import 'server-only';
import { S3Client, GetObjectCommand, HeadObjectCommand, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { isSafeObjectPath, type FileBucket } from './types';

export interface R2Configuration { accountId: string; bucket: string; accessKeyId: string; secretAccessKey: string }
export function readR2Configuration(env: NodeJS.ProcessEnv = process.env): R2Configuration {
  const accountId = env.R2_ACCOUNT_ID ?? '', bucket = env.R2_BUCKET_NAME ?? '';
  const accessKeyId = env.R2_ACCESS_KEY_ID ?? '', secretAccessKey = env.R2_SECRET_ACCESS_KEY ?? '';
  if (!/^[a-f0-9]{32}$/i.test(accountId) || !/^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/.test(bucket) || !accessKeyId || !secretAccessKey) {
    throw new Error('R2 configuration is incomplete');
  }
  return { accountId, bucket, accessKeyId, secretAccessKey };
}
export function r2ObjectKey(bucket: FileBucket, path: string): string {
  if (!isSafeObjectPath(path)) throw new Error('Invalid object path');
  return `${bucket}/${path}`;
}
export function createR2Reader(config = readR2Configuration()) {
  const client = new S3Client({
    region: 'auto', forcePathStyle: true, endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey },
    requestChecksumCalculation: 'WHEN_REQUIRED', responseChecksumValidation: 'WHEN_REQUIRED',
  });
  return {
    async signedReadUrl(bucket: FileBucket, path: string) {
      const disposition = bucket === 'documents'
        ? `attachment; filename*=UTF-8''${encodeURIComponent(path.split('/').at(-1)!)}` : 'inline';
      return getSignedUrl(client, new GetObjectCommand({
        Bucket: config.bucket, Key: r2ObjectKey(bucket, path), ResponseContentDisposition: disposition,
      }), { expiresIn: 60 });
    },
    /** Immutable creation: callers must use server-generated, registered paths. */
    async signedUploadUrl(bucket: FileBucket, path: string, contentType: string) {
      if (!(bucket === 'documents' ? ['image/jpeg', 'image/png', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'] : bucket === 'jizdni-rady' ? ['image/jpeg', 'application/pdf'] : ['image/jpeg']).includes(contentType)) throw new Error('Unsupported content type');
      const url = await getSignedUrl(client, new PutObjectCommand({
        Bucket: config.bucket, Key: r2ObjectKey(bucket, path), ContentType: contentType, IfNoneMatch: '*',
      }), { expiresIn: 60, signableHeaders: new Set(['content-type', 'if-none-match']) });
      return { url, headers: { 'Content-Type': contentType, 'If-None-Match': '*' }, expiresIn: 60 };
    },
    /** Server-only; invoke only for a currently leased cleanup reservation. */
    async remove(bucket: FileBucket, path: string) {
      await client.send(new DeleteObjectCommand({ Bucket: config.bucket, Key: r2ObjectKey(bucket, path) }));
    },
    async head(bucket: FileBucket, path: string) {
      const object = await client.send(new HeadObjectCommand({ Bucket: config.bucket, Key: r2ObjectKey(bucket, path) }));
      return { bytes: object.ContentLength, contentType: object.ContentType, etag: object.ETag };
    },
  };
}
