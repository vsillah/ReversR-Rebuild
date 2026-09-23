// Source-only HTTP gateway scaffold. It authenticates the server envelope, then
// stays fail-closed until a separate gate approves internal dispatch.
import { httpAction, env } from './_generated/server';

export const CAD_UPLOAD_SESSION_GATEWAY_PATH = '/cad/upload-session-gateway';
export const CAD_UPLOAD_SESSION_GATEWAY_AUDIENCE = 'rrb-ref:cad-upload-internal-mark-test-cohort-v1';
export const CAD_UPLOAD_SESSION_GATEWAY_ENV_NAMES = Object.freeze({
  audience: 'CAD_UPLOAD_SESSION_GATEWAY_AUDIENCE',
  tokenHash: 'CAD_UPLOAD_SESSION_GATEWAY_SERVICE_TOKEN_SHA256',
});

const TOKEN_PATTERN = /^[A-Za-z0-9_-]{32,256}$/;
const SHA256_HEX_PATTERN = /^[a-f0-9]{64}$/;
const OPERATIONS = new Set(['insertIfAbsent', 'read', 'revoke', 'refreshAuthorization']);
const FORBIDDEN_PAYLOAD_KEYS = new Set([
  'authorization',
  'clientPrincipal',
  'credential',
  'principal',
  'secret',
  'serviceToken',
  'token',
]);
const COMMON_HEADERS = Object.freeze({
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'no-store',
  'x-content-type-options': 'nosniff',
});

type GatewayConfig =
  | { ok: true; audience: string; tokenHash: string }
  | { ok: false; code: string };

type GatewayEnvelope = {
  schemaVersion: 1;
  audience: string;
  operation: string;
  payload: Record<string, unknown>;
};

function json(status: number, body: Record<string, unknown>, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify({ schemaVersion: 1, ...body }), {
    status,
    headers: { ...COMMON_HEADERS, ...headers },
  });
}

function failUnavailable(code = 'AUTH_UNAVAILABLE') {
  return json(503, { status: 'error', code });
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isSafeTime(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0;
}

function hasForbiddenPayloadKey(payload: Record<string, unknown>) {
  return Object.keys(payload).some((key) => FORBIDDEN_PAYLOAD_KEYS.has(key));
}

export function readCadUploadSessionGatewayConfig(source: Record<string, string | undefined> = env): GatewayConfig {
  const audience = source[CAD_UPLOAD_SESSION_GATEWAY_ENV_NAMES.audience];
  const tokenHash = source[CAD_UPLOAD_SESSION_GATEWAY_ENV_NAMES.tokenHash];
  if (!audience && !tokenHash) {
    return { ok: false, code: 'CAD_UPLOAD_SESSION_GATEWAY_UNCONFIGURED' };
  }
  if (!audience || !tokenHash) {
    return { ok: false, code: 'CAD_UPLOAD_SESSION_GATEWAY_INCOMPLETE' };
  }
  if (audience !== CAD_UPLOAD_SESSION_GATEWAY_AUDIENCE || !SHA256_HEX_PATTERN.test(tokenHash)) {
    return { ok: false, code: 'CAD_UPLOAD_SESSION_GATEWAY_INVALID' };
  }
  return { ok: true, audience, tokenHash };
}

function parseBearerToken(header: string | null) {
  if (!header?.startsWith('Bearer ')) return null;
  const token = header.slice('Bearer '.length);
  return TOKEN_PATTERN.test(token) ? token : null;
}

function toHex(bytes: ArrayBuffer) {
  return Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function fixedTimeEquals(left: string, right: string) {
  if (left.length !== right.length) return false;
  let diff = 0;
  for (let index = 0; index < left.length; index += 1) {
    diff |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return diff === 0;
}

async function authenticateService(request: Request, config: Extract<GatewayConfig, { ok: true }>) {
  const token = parseBearerToken(request.headers.get('authorization'));
  if (!token) return false;
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
  return fixedTimeEquals(toHex(digest), config.tokenHash);
}

async function readEnvelope(request: Request): Promise<GatewayEnvelope | null> {
  const contentType = request.headers.get('content-type') ?? '';
  if (!contentType.toLowerCase().startsWith('application/json')) return null;
  let parsed: unknown;
  try {
    parsed = await request.json();
  } catch {
    return null;
  }
  if (!isPlainObject(parsed) || parsed.schemaVersion !== 1 || parsed.audience !== CAD_UPLOAD_SESSION_GATEWAY_AUDIENCE
    || typeof parsed.operation !== 'string' || !OPERATIONS.has(parsed.operation) || !isPlainObject(parsed.payload)
    || hasForbiddenPayloadKey(parsed.payload) || !isSafeTime(parsed.payload.deadlineAt)) {
    return null;
  }
  return {
    schemaVersion: 1,
    audience: parsed.audience,
    operation: parsed.operation,
    payload: parsed.payload,
  };
}

export async function handleCadUploadSessionGatewayRequest(_ctx: unknown, request: Request) {
  if (request.method !== 'POST') {
    return json(405, { status: 'error', code: 'METHOD_NOT_ALLOWED' }, { allow: 'POST' });
  }

  const config = readCadUploadSessionGatewayConfig();
  if (!config.ok) return failUnavailable();

  if (!(await authenticateService(request, config))) {
    return failUnavailable();
  }

  const envelope = await readEnvelope(request);
  if (!envelope) {
    return json(400, { status: 'error', code: 'INVALID_GATEWAY_ENVELOPE' });
  }

  return failUnavailable();
}

export const cadUploadSessionGateway = httpAction(handleCadUploadSessionGatewayRequest);
