import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "../config/env";
import { randomUUID } from "crypto";

const s3 = new S3Client({
  region: env.S3_REGION,
  credentials: env.AWS_ACCESS_KEY_ID
    ? { accessKeyId: env.AWS_ACCESS_KEY_ID, secretAccessKey: env.AWS_SECRET_ACCESS_KEY! }
    : undefined,
});

export async function uploadToS3(buffer: Buffer, mimeType: string, folder = "uploads"): Promise<string> {
  const key = `${folder}/${randomUUID()}.jpg`;
  await s3.send(new PutObjectCommand({
    Bucket: env.S3_BUCKET!,
    Key: key,
    Body: buffer,
    ContentType: mimeType,
  }));
  return `https://${env.S3_BUCKET}.s3.${env.S3_REGION}.amazonaws.com/${key}`;
}

export async function getPresignedUrl(key: string, expiresIn = 3600): Promise<string> {
  return getSignedUrl(s3, new GetObjectCommand({ Bucket: env.S3_BUCKET!, Key: key }), { expiresIn });
}
