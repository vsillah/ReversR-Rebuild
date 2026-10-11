import { getApiBase } from './apiBase';
import { resolveAuthenticatedIgsApiBase, type CadInternalTesterFixture }
  from './cadInternalTesterPreview';

export const AUTHENTICATED_IGS_MAX_BYTES = 8 * 1024 * 1024;
const SESSION_KEY = 'reversr_authenticated_igs_session_v1';

type Job = { jobId: string; state: 'admitted' | 'converting' | 'ready' | 'failed' | 'quarantined' | 'deleted';
  extension: 'igs' | 'iges'; byteCount: number; attemptCount: number; createdAt: number; updatedAt: number;
  code?: string; artifacts?: { original: true; preview: true; stl: true } };
type Session = { csrfToken: string; expiresAt: number };
type Preview = { schemaVersion: 1; format: 'reversr-inspection-mesh-v1'; units: 'millimeter';
  warning: string; vertexCount: number; triangleCount: number;
  meshes: Array<{ name: string; positions: number[]; indices: number[] }> };

const extensionFor = (name: string) => /\.iges$/i.test(name) ? 'iges' as const
  : /\.igs$/i.test(name) ? 'igs' as const : null;
const randomKey = () => {
  const bytes = new Uint8Array(32);
  globalThis.crypto.getRandomValues(bytes);
  return Array.from(bytes, value => value.toString(16).padStart(2, '0')).join('');
};
const contentSha256 = async (file: File) => {
  if (!globalThis.crypto?.subtle) throw new Error('Secure CAD upload hashing is unavailable.');
  const bytes = new Uint8Array(await file.arrayBuffer());
  try {
    const digest = new Uint8Array(await globalThis.crypto.subtle.digest('SHA-256', bytes));
    return Array.from(digest, value => value.toString(16).padStart(2, '0')).join('');
  } finally { bytes.fill(0); }
};
const readJson = async (response: Response) => {
  try { return await response.json(); } catch { return null; }
};

export function validateAuthenticatedIgsFile(file: File) {
  const extension = extensionFor(file.name);
  if (!extension) return { ok: false as const, message: 'Choose a .igs or .iges file.' };
  if (!file.size) return { ok: false as const, message: 'The selected CAD file is empty.' };
  if (file.size > AUTHENTICATED_IGS_MAX_BYTES) {
    return { ok: false as const, message: 'Choose an IGS file no larger than 8 MiB.' };
  }
  return { ok: true as const, extension };
}

function dimensions(preview: Preview) {
  const minimum = [Infinity, Infinity, Infinity];
  const maximum = [-Infinity, -Infinity, -Infinity];
  for (const mesh of preview.meshes) {
    for (let index = 0; index < mesh.positions.length; index += 3) {
      for (let axis = 0; axis < 3; axis += 1) {
        minimum[axis] = Math.min(minimum[axis], mesh.positions[index + axis]);
        maximum[axis] = Math.max(maximum[axis], mesh.positions[index + axis]);
      }
    }
  }
  if (![...minimum, ...maximum].every(Number.isFinite)) throw new Error('The private preview geometry is invalid.');
  return { min: minimum as [number, number, number], max: maximum as [number, number, number],
    size: maximum.map((value, index) => value - minimum[index]) as [number, number, number] };
}

function fixtureFor(job: Job, preview: Preview): CadInternalTesterFixture {
  const bounds = dimensions(preview);
  return {
    fixtureName: 'Private IGS review',
    sourceFileName: `Private CAD source.${job.extension}`,
    sourceAssetUrl: '',
    referenceImageUrl: '',
    referenceImages: [],
    sourcePackage: 'Owner-scoped private upload',
    sourceLicense: 'Private source; no redistribution permission inferred',
    format: 'IGES',
    bytes: job.byteCount,
    sha256: 'owner-scoped-private',
    units: preview.units,
    expectedDimensions: bounds.size,
    importedBoundingBox: bounds,
    meshes: preview.meshes.length,
    vertices: preview.vertexCount,
    triangles: preview.triangleCount,
    sourceConfidence: 'Private source · inspection only',
    previewGeometry: { kind: 'mesh', sha256: 'owner-scoped-private',
      vertices: preview.vertexCount, triangles: preview.triangleCount, meshes: preview.meshes },
    qualificationProvenance: { kind: 'authenticated-igs-preview',
      accountSessionAdapter: 'commercial-convex-auth', uploadSessionAdapter: 'http-only-cookie-csrf',
      conversionAdapter: 'one-shot-deny-all-sandbox', productionAuthenticationQualified: false,
      realGeometryConverterQualified: true },
    warnings: [preview.warning, 'Development/preview capability only. Production remains disabled.',
      'Geometry is for visual inspection and STL download, not manufacturing certification.'],
  };
}

export function createCadAuthenticatedIgsBrowserClient({
  apiBase,
  getAuthorizationHeaders,
  fetchImpl = globalThis.fetch,
  storage = typeof window !== 'undefined' ? window.sessionStorage : null,
}: { apiBase?: string; getAuthorizationHeaders: () => Promise<Record<string, string>>;
  fetchImpl?: typeof fetch; storage?: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> | null }) {
  const resolvedApiBase = apiBase || (typeof window !== 'undefined'
    ? resolveAuthenticatedIgsApiBase(window.location, getApiBase()) : null);
  if (!resolvedApiBase) throw new Error('Authenticated CAD preview transport is unavailable.');
  let session: Session | null = null;
  const request = async (path: string, init: RequestInit = {}) => {
    const response = await fetchImpl(`${resolvedApiBase}${path}`, { credentials: 'include', ...init });
    const body = await readJson(response);
    if (response.status === 401) {
      session = null;
      storage?.removeItem(SESSION_KEY);
    }
    if (!response.ok) throw new Error(body?.message || 'Authenticated CAD import is unavailable.');
    return body;
  };
  const loadSession = () => {
    if (session && session.expiresAt > Date.now() + 1000) return session;
    try {
      const value = JSON.parse(storage?.getItem(SESSION_KEY) || 'null');
      session = value && typeof value.csrfToken === 'string' && Number.isSafeInteger(value.expiresAt)
        && value.expiresAt > Date.now() + 1000 ? value : null;
    } catch { session = null; }
    return session;
  };
  const ensureSession = async () => {
    const current = loadSession();
    if (current) return current;
    const headers = await getAuthorizationHeaders();
    const body = await request('/api/cad/authenticated-upload-session', { method: 'POST', headers });
    session = body.session;
    storage?.setItem(SESSION_KEY, JSON.stringify(session));
    return session!;
  };
  const csrfHeaders = async () => ({ 'X-Upload-CSRF': (await ensureSession()).csrfToken });
  const status = async (jobId: string) => (await request(`/api/cad/authenticated-import/${encodeURIComponent(jobId)}`,
    { headers: await csrfHeaders() })).job as Job;
  const latest = async () => (await request('/api/cad/authenticated-import/latest', {
    headers: await csrfHeaders(),
  })).job as Job | null;
  const artifact = async (jobId: string, kind: 'original' | 'preview' | 'stl') => {
    const headers = await csrfHeaders();
    const issued = await request(`/api/cad/authenticated-import/${encodeURIComponent(jobId)}/grants/${kind}`,
      { method: 'POST', headers });
    const response = await fetchImpl(`${resolvedApiBase}${issued.grant.url}`, { credentials: 'include', headers: {
      ...headers, 'X-ReversR-Download-Grant': issued.grant.token,
    } });
    if (!response.ok) {
      const body = await readJson(response);
      if (response.status === 401) {
        session = null;
        storage?.removeItem(SESSION_KEY);
      }
      throw new Error(body?.message || 'The private artifact grant expired.');
    }
    return response.blob();
  };
  const ready = async (job: Job) => {
    if (job.state !== 'ready') throw new Error(job.code || 'The private CAD conversion is not ready.');
    const blob = await artifact(job.jobId, 'preview');
    if (blob.size > 1024 * 1024) throw new Error('The private preview geometry exceeded its limit.');
    const preview = JSON.parse(await blob.text()) as Preview;
    if (preview.schemaVersion !== 1 || preview.format !== 'reversr-inspection-mesh-v1'
      || preview.units !== 'millimeter' || !Array.isArray(preview.meshes)
      || !preview.meshes.length || !Number.isSafeInteger(preview.vertexCount)
      || !Number.isSafeInteger(preview.triangleCount)) throw new Error('The private preview geometry is invalid.');
    return { job, fixture: fixtureFor(job, preview) };
  };
  return Object.freeze({
    ensureSession,
    async upload(file: File) {
      const valid = validateAuthenticatedIgsFile(file);
      if (!valid.ok) throw new Error(valid.message);
      const current = await ensureSession();
      const sourceSha256 = await contentSha256(file);
      const body = await request('/api/cad/authenticated-import', { method: 'POST', body: file,
        headers: { 'Content-Type': ['model/iges', 'application/iges'].includes(file.type)
          ? file.type : 'application/octet-stream', 'X-Upload-CSRF': current.csrfToken,
        'X-ReversR-CAD-Extension': valid.extension,
        'X-ReversR-CAD-Content-SHA256': sourceSha256,
        'X-ReversR-Idempotency-Key': randomKey() } });
      return ready(body.job);
    },
    status,
    latest,
    ready,
    async resume() {
      await ensureSession();
      return latest();
    },
    async download(jobId: string, kind: 'original' | 'stl') {
      const blob = await artifact(jobId, kind);
      const href = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = href;
      link.download = kind === 'original' ? 'reversr-original.igs' : 'reversr-inspection-mesh.stl';
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link); link.click(); link.remove();
      window.setTimeout(() => URL.revokeObjectURL(href), 1000);
    },
    async delete(jobId: string) {
      await request(`/api/cad/authenticated-import/${encodeURIComponent(jobId)}`, {
        method: 'DELETE', headers: await csrfHeaders(),
      });
    },
  });
}

export type CadAuthenticatedIgsBrowserClient = ReturnType<typeof createCadAuthenticatedIgsBrowserClient>;
export type CadAuthenticatedIgsReady = Awaited<ReturnType<CadAuthenticatedIgsBrowserClient['ready']>>;
