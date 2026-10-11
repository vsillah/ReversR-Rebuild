const { createHash } = require('node:crypto');
const {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} = require('@aws-sdk/client-s3');

const hash = value => createHash('sha256').update(value).digest('hex');
const unavailable = () => { throw new Error('R2_UNAVAILABLE'); };

function readConfig(env = process.env) {
  const accountId = env.CAD_R2_ACCOUNT_ID;
  const accessKeyId = env.CAD_R2_ACCESS_KEY_ID;
  const secretAccessKey = env.CAD_R2_SECRET_ACCESS_KEY;
  const bucket = env.CAD_R2_BUCKET;
  if (!/^[a-f0-9]{32}$/.test(accountId || '')
    || !/^[A-Za-z0-9_-]{16,128}$/.test(accessKeyId || '')
    || typeof secretAccessKey !== 'string' || secretAccessKey.length < 32
    || !/^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/.test(bucket || '')) return null;
  return { accountId, accessKeyId, secretAccessKey, bucket };
}

async function bytesFromBody(body, maximum) {
  if (!body) unavailable();
  if (typeof body.transformToByteArray === 'function') {
    const value = Buffer.from(await body.transformToByteArray());
    if (value.length > maximum) unavailable();
    return value;
  }
  if (typeof body[Symbol.asyncIterator] !== 'function') unavailable();
  const chunks = [];
  let size = 0;
  for await (const part of body) {
    const chunk = Buffer.from(part);
    size += chunk.length;
    if (size > maximum) unavailable();
    chunks.push(chunk);
  }
  return Buffer.concat(chunks, size);
}

function createCadR2S3Provider({ env = process.env, client: injectedClient } = {}) {
  const config = readConfig(env);
  if (!config && !injectedClient) return null;
  const bucket = config?.bucket || env.CAD_R2_BUCKET;
  if (!bucket) return null;
  const client = injectedClient || new S3Client({
    region: 'auto',
    endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey },
    maxAttempts: 1,
  });
  const send = (command, signal) => client.send(command, { abortSignal: signal });
  const missing = error => error?.name === 'NoSuchKey' || error?.name === 'NotFound'
    || error?.$metadata?.httpStatusCode === 404;
  return Object.freeze({
    async putExact(input, { signal } = {}) {
      if (!input || !Buffer.isBuffer(input.bytes) || !input.bytes.length
        || typeof input.objectKey !== 'string') unavailable();
      const sha256 = hash(input.bytes);
      await send(new PutObjectCommand({ Bucket: bucket, Key: input.objectKey,
        Body: input.bytes, ContentLength: input.bytes.length, ContentType: input.contentType,
        CacheControl: input.cacheControl, StorageClass: input.storageClass,
        IfNoneMatch: input.ifNoneMatch, Metadata: { sha256 } }), signal);
      const head = await send(new HeadObjectCommand({ Bucket: bucket, Key: input.objectKey }), signal);
      if (head.ContentLength !== input.bytes.length || head.Metadata?.sha256 !== sha256) unavailable();
      return { committed: true, byteCount: input.bytes.length, sha256 };
    },
    async getExact(input, { signal } = {}) {
      if (!input || typeof input.objectKey !== 'string' || !Number.isSafeInteger(input.expectedBytes)
        || !/^[a-f0-9]{64}$/.test(input.expectedSha256 || '')) unavailable();
      const response = await send(new GetObjectCommand({ Bucket: bucket, Key: input.objectKey }), signal);
      const bytes = await bytesFromBody(response.Body, input.expectedBytes);
      if (bytes.length !== input.expectedBytes || hash(bytes) !== input.expectedSha256) unavailable();
      return { bytes };
    },
    async deleteExact(objectKey, { signal } = {}) {
      if (typeof objectKey !== 'string') unavailable();
      await send(new DeleteObjectCommand({ Bucket: bucket, Key: objectKey }), signal);
      return true;
    },
    async headExact(objectKey, { signal } = {}) {
      if (typeof objectKey !== 'string') unavailable();
      try {
        const response = await send(new HeadObjectCommand({ Bucket: bucket, Key: objectKey }), signal);
        return { byteCount: response.ContentLength };
      } catch (error) {
        if (missing(error)) return null;
        throw error;
      }
    },
  });
}

module.exports = { createCadR2S3Provider, readConfig };
