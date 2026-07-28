import { S3Client, PutObjectCommand, HeadBucketCommand, CreateBucketCommand } from '@aws-sdk/client-s3';

function createS3Client() {
  const endpoint = process.env.S3_ENDPOINT || process.env.MINIO_ENDPOINT || 'http://localhost:9000';
  const accessKeyId = process.env.S3_ACCESS_KEY || process.env.MINIO_ROOT_USER;
  const secretAccessKey = process.env.S3_SECRET_KEY || process.env.MINIO_ROOT_PASSWORD;

  if (!accessKeyId || !secretAccessKey) {
    throw new Error('S3_ACCESS_KEY/MINIO_ROOT_USER and S3_SECRET_KEY/MINIO_ROOT_PASSWORD are required for S3 uploads.');
  }

  return new S3Client({
    endpoint,
    region: 'us-east-1',
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
    forcePathStyle: true,
  });
}

function getBucketName() {
  return process.env.S3_BUCKET || process.env.MINIO_BUCKET || 'a11y-platform';
}

let bucketInitialized = false;

async function ensureBucketExists(s3Client: S3Client, bucketName: string): Promise<void> {
  if (bucketInitialized) return;

  try {
    await s3Client.send(new HeadBucketCommand({ Bucket: bucketName }));
    bucketInitialized = true;
    return;
  } catch (error: any) {
    const code = error?.name || error?.Code || error?.$metadata?.httpStatusCode;
    if (code === 'NotFound' || code === 'NoSuchBucket' || code === 404) {
      await s3Client.send(new CreateBucketCommand({ Bucket: bucketName }));
      bucketInitialized = true;
      return;
    }

    throw error;
  }
}

export async function uploadScreenshot(
  scanId: string,
  pageId: string,
  imageBuffer: Buffer
): Promise<string> {
  const key = `screenshots/${scanId}/${pageId}.png`;
  const bucketName = getBucketName();
  const s3Client = createS3Client();

  await ensureBucketExists(s3Client, bucketName);

  await s3Client.send(
    new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: imageBuffer,
      ContentType: 'image/png',
    })
  );

  return `${bucketName}/${key}`;
}
