import { httpAction } from './_generated/server';
import { internal } from './_generated/api';

export const CAD_AUTHENTICATED_IGS_GATEWAY_PATH = '/cad/authenticated-igs-service';
const TOKEN = /^[A-Za-z0-9_-]{43,256}$/;
const HEX = /^[a-f0-9]{64}$/;
const OPERATIONS = new Set([
  'session.insert', 'session.read', 'session.revoke', 'authorization.refresh',
  'job.claim', 'job.attachOriginal', 'job.claimConversion', 'job.complete', 'job.fail',
  'job.read', 'job.latest', 'job.artifacts', 'artifact.reserve', 'artifact.consumeOperation',
  'job.deleted',
  'artifact.read', 'artifact.transition', 'artifact.confirmDeleted', 'grant.issue', 'grant.resolve',
]);
const COMMON_HEADERS = { 'content-type': 'application/json; charset=utf-8',
  'cache-control': 'no-store', 'x-content-type-options': 'nosniff' };

const response = (status: number, body: Record<string, unknown>) => new Response(JSON.stringify({
  schemaVersion: 1, ...body,
}), { status, headers: COMMON_HEADERS });
const unavailable = () => response(503, { status: 'error', code: 'CAD_SERVICE_UNAVAILABLE' });
const toHex = (bytes: ArrayBuffer) => Array.from(new Uint8Array(bytes), byte =>
  byte.toString(16).padStart(2, '0')).join('');
const fixedEqual = (left: string, right: string) => {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return difference === 0;
};

async function authorized(request: Request) {
  const expected = process.env.CAD_AUTHENTICATED_IGS_SERVICE_TOKEN_SHA256 || '';
  const header = request.headers.get('authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!HEX.test(expected) || !TOKEN.test(token)) return false;
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
  return fixedEqual(toHex(hash), expected);
}

export const cadAuthenticatedIgsGateway = httpAction(async (ctx, request) => {
  if (request.method !== 'POST') return response(405, { status: 'error', code: 'METHOD_NOT_ALLOWED' });
  if (process.env.CAD_AUTHENTICATED_IGS_PREVIEW_ENABLED !== 'true'
    || !['development', 'preview'].includes(process.env.CAD_AUTHENTICATED_IGS_ENVIRONMENT || '')
    || !await authorized(request)) return unavailable();
  const contentType = request.headers.get('content-type') || '';
  if (!/^application\/json(?:;\s*charset=utf-8)?$/i.test(contentType)) return unavailable();
  let body: unknown;
  try { body = await request.json(); } catch { return unavailable(); }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return unavailable();
  const envelope = body as Record<string, unknown>;
  const now = Date.now();
  if (envelope.schemaVersion !== 1 || typeof envelope.operation !== 'string'
    || !OPERATIONS.has(envelope.operation) || typeof envelope.payloadJson !== 'string'
    || envelope.payloadJson.length > 32_000 || typeof envelope.deadlineAt !== 'number'
    || !Number.isSafeInteger(envelope.deadlineAt) || envelope.deadlineAt <= now
    || envelope.deadlineAt - now > 2_000) return unavailable();
  try {
    const result = await ctx.runMutation(internal.cadAuthenticatedIgs.service, {
      operation: envelope.operation,
      payloadJson: envelope.payloadJson,
      now,
    });
    if (Date.now() >= envelope.deadlineAt) return unavailable();
    return response(200, { status: 'success', result: JSON.parse(result.resultJson) });
  } catch { return unavailable(); }
});
