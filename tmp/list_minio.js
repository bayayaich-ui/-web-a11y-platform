const { S3Client, ListObjectsV2Command } = require('@aws-sdk/client-s3');

const endpoint = process.env.S3_ENDPOINT || 'http://localhost:9000';
const accessKeyId = process.env.S3_ACCESS_KEY || process.env.MINIO_ROOT_USER || 'a11y_user';
const secretAccessKey = process.env.S3_SECRET_KEY || process.env.MINIO_ROOT_PASSWORD || 'a11y_password';
const bucket = process.env.S3_BUCKET || 'a11y-platform';
const scanId = process.env.SCAN_ID || 'bc5cf610-212e-41ff-ae23-f78b11a14f72';
const prefix = `screenshots/${scanId}/`;

const client = new S3Client({
  endpoint,
  region: 'us-east-1',
  credentials: { accessKeyId, secretAccessKey },
  forcePathStyle: true,
});

async function listObjects() {
  try {
    const resp = await client.send(new ListObjectsV2Command({ Bucket: bucket, Prefix: prefix }));
    const items = (resp.Contents || []).map(o => ({ Key: o.Key, Size: o.Size, LastModified: o.LastModified }));
    console.log(JSON.stringify({ bucket, prefix, count: items.length, items }, null, 2));
  } catch (err) {
    console.error('ERROR', err && err.message ? err.message : err);
    process.exit(1);
  }
}

listObjects();
