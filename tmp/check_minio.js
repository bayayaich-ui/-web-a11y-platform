require('dotenv').config({path:'./.env'});
const { S3Client, HeadBucketCommand, CreateBucketCommand } = require('@aws-sdk/client-s3');
const endpoint = process.env.S3_ENDPOINT || process.env.MINIO_ENDPOINT || 'http://localhost:9000';
const accessKeyId = process.env.S3_ACCESS_KEY || process.env.MINIO_ROOT_USER || 'a11y_user';
const secretAccessKey = process.env.S3_SECRET_KEY || process.env.MINIO_ROOT_PASSWORD || 'a11y_password';
const bucket = process.env.S3_BUCKET || process.env.MINIO_BUCKET || 'a11y-platform';
const client = new S3Client({ endpoint, region: 'us-east-1', credentials: { accessKeyId, secretAccessKey }, forcePathStyle: true });
(async () => {
  try {
    await client.send(new HeadBucketCommand({ Bucket: bucket }));
    console.log('bucket exists');
  } catch (error) {
    console.error('head bucket failed', error.name || error.constructor.name, error.$metadata?.httpStatusCode, error.message || error);
    try {
      await client.send(new CreateBucketCommand({ Bucket: bucket }));
      console.log('bucket created');
    } catch (createError) {
      console.error('create bucket failed', createError.name || createError.constructor.name, createError.$metadata?.httpStatusCode, createError.message || createError);
      process.exit(1);
    }
  }
})().catch(err => { console.error('unexpected', err); process.exit(1); });
