const { S3Client, ListObjectsV2Command, GetObjectCommand } = require('@aws-sdk/client-s3');
const fs = require('fs');
const path = require('path');

const endpoint = process.env.S3_ENDPOINT || 'http://localhost:9000';
const accessKeyId = process.env.S3_ACCESS_KEY || process.env.MINIO_ROOT_USER || 'a11y_user';
const secretAccessKey = process.env.S3_SECRET_KEY || process.env.MINIO_ROOT_PASSWORD || 'a11y_password';
const bucket = process.env.S3_BUCKET || 'a11y-platform';
const scanId = process.env.SCAN_ID || 'bc5cf610-212e-41ff-ae23-f78b11a14f72';
const prefix = `screenshots/${scanId}/`;
const outDir = path.join(__dirname, 'images');

if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

const client = new S3Client({ endpoint, region: 'us-east-1', credentials: { accessKeyId, secretAccessKey }, forcePathStyle: true });

async function streamToFile(stream, filePath) {
  return new Promise((resolve, reject) => {
    const writeStream = fs.createWriteStream(filePath);
    stream.pipe(writeStream);
    stream.on('error', reject);
    writeStream.on('finish', resolve);
    writeStream.on('error', reject);
  });
}

async function run() {
  try {
    const resp = await client.send(new ListObjectsV2Command({ Bucket: bucket, Prefix: prefix }));
    const contents = resp.Contents || [];
    const items = [];
    for (let i = 0; i < Math.min(contents.length, 3); i++) {
      const key = contents[i].Key;
      const outPath = path.join(outDir, path.basename(key));
      const getResp = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
      await streamToFile(getResp.Body, outPath);
      items.push({ Key: key, OutPath: outPath, Size: contents[i].Size });
    }
    console.log(JSON.stringify({ bucket, prefix, downloaded: items.length, items }, null, 2));
  } catch (err) {
    console.error('ERROR', err && err.message ? err.message : err);
    process.exit(1);
  }
}

run();
