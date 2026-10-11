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
const R2_PROVIDER_PHASE_BUDGET_MS = 15 * 1000;
const R2_JURISDICTION = 'us';
const r2Endpoint = accountId => `https://${accountId}.${R2_JURISDICTION}.r2.cloudflarestorage.com`;
const AUTH_FAILURE_NAMES = new Set([
  'AccessDenied', 'AccessDeniedException', 'AuthFailure', 'ExpiredToken',
  'InvalidAccessKeyId', 'InvalidSignatureException', 'InvalidToken',
  'RequestExpired', 'RequestTimeTooSkewed', 'SignatureDoesNotMatch',
]);
const NETWORK_FAILURE_CODES = new Set([
  'EAI_AGAIN', 'ECONNREFUSED', 'ECONNRESET', 'EHOSTUNREACH', 'ENETUNREACH',
  'ENOTFOUND', 'EPIPE',
]);
const TIMEOUT_FAILURE_CODES = new Set(['ETIMEDOUT', 'ERR_HTTP2_STREAM_ERROR']);

function classifyR2Error(error) {
  const status = error?.$metadata?.httpStatusCode;
  if (error?.name === 'NoSuchKey' || error?.name === 'NotFound') return 'R2_OBJECT_ABSENT';
  if (error?.name === 'NoSuchBucket') return 'R2_TARGET_MISMATCH';
  if (AUTH_FAILURE_NAMES.has(error?.name) || status === 401 || status === 403) {
    return 'R2_AUTH_REJECTED';
  }
  if (error?.name === 'AbortError' || error?.name === 'TimeoutError'
    || TIMEOUT_FAILURE_CODES.has(error?.code)) return 'R2_TIMEOUT';
  if (NETWORK_FAILURE_CODES.has(error?.code)) return 'R2_NETWORK_UNAVAILABLE';
  if (status === 404) return 'R2_NOT_FOUND_UNCLASSIFIED';
  return 'R2_PROVIDER_REJECTED';
}

async function sendBounded(client, command, parentSignal, consume = response => response) {
  const controller = new AbortController();
  const abort = () => controller.abort();
  const timer = setTimeout(abort, R2_PROVIDER_PHASE_BUDGET_MS);
  try {
    if (parentSignal?.aborted) throw Object.assign(new Error('R2_ABORTED'), { name: 'AbortError' });
    parentSignal?.addEventListener('abort', abort, { once: true });
    const response = await client.send(command, { abortSignal: controller.signal });
    return await consume(response);
  } catch (error) {
    if (controller.signal.aborted && error?.name !== 'AbortError') {
      throw Object.assign(new Error('R2_PHASE_TIMEOUT'), { name: 'AbortError' });
    }
    throw error;
  } finally {
    clearTimeout(timer);
    parentSignal?.removeEventListener('abort', abort);
    controller.abort();
  }
}

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
    endpoint: r2Endpoint(config.accountId),
    credentials: { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey },
    maxAttempts: 1,
  });
  const send = (command, signal, consume) => sendBounded(client, command, signal, consume);
  const missing = error => classifyR2Error(error) === 'R2_OBJECT_ABSENT';
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
      const bytes = await send(new GetObjectCommand({ Bucket: bucket, Key: input.objectKey }), signal,
        response => bytesFromBody(response.Body, input.expectedBytes));
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

module.exports = { R2_JURISDICTION, R2_PROVIDER_PHASE_BUDGET_MS, classifyR2Error, r2Endpoint,
  createCadR2S3Provider, readConfig };
