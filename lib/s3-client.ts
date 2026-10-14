import "dotenv/config";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  CreateBucketCommand,
  HeadBucketCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// Neon Object Storage (S3-compatible). The endpoint/region/credentials are
// read from AWS_* environment variables (see .env / .env.example).
export const s3 = new S3Client({
  region: process.env.AWS_REGION ?? "us-east-2",
  endpoint: process.env.AWS_ENDPOINT_URL_S3,
  forcePathStyle: true,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? "",
  },
});

export const ASSETS_BUCKET = process.env.S3_BUCKET ?? "assets";

export async function uploadFile(
  key: string,
  body: Buffer | Uint8Array | string,
  contentType = "application/octet-stream",
) {
  await s3.send(
    new PutObjectCommand({
      Bucket: ASSETS_BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  );
  return key;
}

export async function ensureBucket(bucket = ASSETS_BUCKET) {
  try {
    await s3.send(new HeadBucketCommand({ Bucket: bucket }));
  } catch {
    await s3.send(new CreateBucketCommand({ Bucket: bucket }));
  }
  return bucket;
}

export async function getSignedAssetUrl(key: string, expiresIn = 3600) {
  return getSignedUrl(
    s3,
    new GetObjectCommand({ Bucket: ASSETS_BUCKET, Key: key }),
    { expiresIn },
  );
}
