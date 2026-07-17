import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const s3Client = new S3Client({
  endpoint: process.env.S3_ENDPOINT || 'http://localhost:9000',
  region: 'us-east-1', // valeur arbitraire, requise par le SDK mais ignorée par MinIO
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY || '',
    secretAccessKey: process.env.S3_SECRET_KEY || '',
  },
  forcePathStyle: true, // nécessaire pour MinIO (contrairement au vrai AWS S3)
});

const BUCKET_NAME = process.env.S3_BUCKET || 'a11y-platform';

export async function uploadScreenshot(
  scanId: string,
  pageId: string,
  imageBuffer: Buffer
): Promise<string> {
  const key = `screenshots/${scanId}/${pageId}.png`;

  await s3Client.send(
    new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: imageBuffer,
      ContentType: 'image/png',
    })
  );

  return `${BUCKET_NAME}/${key}`; // référence stockée, pas l'URL publique directe
}