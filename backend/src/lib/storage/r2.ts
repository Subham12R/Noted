import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"

function getR2Client() {
  const accountId = process.env.R2_ACCOUNT_ID
  const accessKeyId = process.env.R2_ACCESS_KEY_ID
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY
  if (!accountId || !accessKeyId || !secretAccessKey) throw new Error("R2 credentials not configured")
  return new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  })
}

function getBucketName(): string {
  const bucket = process.env.R2_BUCKET_NAME
  if (!bucket) throw new Error("R2_BUCKET_NAME is not set")
  return bucket
}

function getPublicUrl(key: string): string {
  const base = process.env.R2_PUBLIC_URL
  if (!base) throw new Error("R2_PUBLIC_URL is not set")
  return `${base.replace(/\/$/, "")}/${key}`
}

export async function uploadFile(key: string, buffer: Buffer, mimeType: string): Promise<string> {
  const client = getR2Client()
  await client.send(new PutObjectCommand({ Bucket: getBucketName(), Key: key, Body: buffer, ContentType: mimeType }))
  return getPublicUrl(key)
}

export async function deleteFile(key: string): Promise<void> {
  const client = getR2Client()
  await client.send(new DeleteObjectCommand({ Bucket: getBucketName(), Key: key }))
}

export async function getPresignedUrl(key: string, expiresIn = 3600): Promise<string> {
  const client = getR2Client()
  return getSignedUrl(client, new GetObjectCommand({ Bucket: getBucketName(), Key: key }), { expiresIn })
}

export function isR2Configured(): boolean {
  return !!(process.env.R2_ACCOUNT_ID && process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY && process.env.R2_BUCKET_NAME && process.env.R2_PUBLIC_URL)
}
