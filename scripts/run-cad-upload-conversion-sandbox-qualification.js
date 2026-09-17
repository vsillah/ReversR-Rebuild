#!/usr/bin/env node
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const packet = require('../offline/cad-convex/uploadConversionSandboxReadiness.json');
const uploadCloseout = require('../offline/cad-convex/uploadAdmissionActivationRolloverCloseout.json');
const { inspectUploadConversionSandboxReadiness } =
  require('../offline/cad-convex/uploadConversionSandboxReadiness');

const root = path.resolve(__dirname, '..');
const DEFAULT_PROJECT_PATH = path.join(root, '.vercel/project.json');
const AUTHORIZATION_PREFLIGHT_MS = 10000;
const sha = value => crypto.createHash('sha256').update(value).digest('hex');

function blocked(code, details = {}) {
  return {
    schemaVersion: 1,
    decision: 'BLOCKED',
    code,
    runCompleted: false,
    unknownOutcome: false,
    automaticRetry: false,
    secondRun: false,
    ...details,
  };
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function readOperatorConfig(env = process.env) {
  const project = readJson(env.VERCEL_PROJECT_JSON || DEFAULT_PROJECT_PATH);
  const teamId = project.orgId;
  const projectId = project.projectId;
  assert.match(teamId || '', /^(team|team_[A-Za-z0-9]+|[A-Za-z0-9_-]+)$/);
  assert.match(projectId || '', /^prj_[A-Za-z0-9]+$/);
  assert.equal(project.projectName, 'reversr');
  return { teamId, projectId, projectName: project.projectName };
}

async function sandboxAuthorizationPreflight({ list, timeoutMs = AUTHORIZATION_PREFLIGHT_MS } = {}) {
  assert.ok(Number.isInteger(timeoutMs) && timeoutMs > 0
    && timeoutMs <= AUTHORIZATION_PREFLIGHT_MS);
  const listSandboxes = list || (await import('@vercel/sandbox')).Sandbox.list;
  const control = new AbortController();
  const timer = setTimeout(() => control.abort(), timeoutMs);
  try {
    await listSandboxes({ limit: 1, signal: control.signal });
    return { status: 'authorized' };
  } catch {
    const error = new Error('SANDBOX_AUTHORIZATION_FAILED');
    error.code = 'SANDBOX_AUTHORIZATION_FAILED';
    error.preDispatch = true;
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

function fixedFixture() {
  const directory = path.join(
    path.dirname(require.resolve('occt-import-js/package.json')),
    'test/testfiles/cube-10x10mm',
  );
  const names = fs.readdirSync(directory).filter(name => /\.igs$/i.test(name));
  assert.equal(names.length, 1, 'Public fixture unavailable');
  const bytes = fs.readFileSync(path.join(directory, names[0]));
  assert.equal(bytes.length, packet.fixture.bytes);
  assert.equal(sha(bytes), packet.fixture.sha256);
  return {
    body: { fileName: 'cube.igs', contentBase64: bytes.toString('base64') },
    evidence: { id: packet.fixture.id, bytes: bytes.length, sha256: sha(bytes), privateCad: false },
  };
}

function routeClosed() {
  const source = fs.readFileSync(path.join(root, packet.routeGate.source), 'utf8');
  return source.includes(packet.routeGate.requiredDisabledLiteral)
    && !source.includes('BODY_ADMISSION_AUTHORIZED = true');
}

function exactWindow({ startUtc, endUtc, now = Date.now }) {
  const start = Date.parse(startUtc || '');
  const end = Date.parse(endUtc || '');
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
    return blocked('WINDOW_INVALID');
  }
  if ((end - start) / 1000 > packet.futureRunBounds.maxWindowSeconds) {
    return blocked('WINDOW_TOO_LONG');
  }
  const current = now();
  if (current < start) return blocked('WINDOW_NOT_OPEN', { startUtc, endUtc });
  if (current >= end) return blocked('WINDOW_EXPIRED', { startUtc, endUtc });
  return { ok: true, startUtc, endUtc };
}

function sanitizeStages(stages) {
  return stages.map(stage => {
    const safe = { name: stage.name };
    for (const key of [
      'bytes', 'files', 'persistent', 'vcpus', 'memoryMb', 'timeoutMs',
      'networkPolicy', 'exitCode', 'status', 'guestMemoryBytes',
    ]) {
      if (Object.hasOwn(stage, key)) safe[key] = stage[key];
    }
    return safe;
  });
}

function safeEvidenceRoot(relativeRoot) {
  if (typeof relativeRoot !== 'string'
      || !/^\.local\/cad-convex\/[A-Za-z0-9._-]+$/.test(relativeRoot)) {
    throw new Error('EVIDENCE_ROOT_INVALID');
  }
  const resolved = path.resolve(root, relativeRoot);
  const prefix = path.join(root, '.local/cad-convex') + path.sep;
  if (!resolved.startsWith(prefix)) throw new Error('EVIDENCE_ROOT_INVALID');
  return resolved;
}

function writeJson600(file, value) {
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n', { mode: 0o600, flag: 'wx' });
  fs.chmodSync(file, 0o600);
}

function prepareEvidenceDestination(relativeRoot) {
  const destination = safeEvidenceRoot(relativeRoot);
  const evidencePath = path.join(destination, 'sanitized-evidence.json');
  const receiptPath = path.join(destination, 'sanitized-run-receipt.json');
  if (fs.existsSync(evidencePath) || fs.existsSync(receiptPath)) {
    throw new Error('EVIDENCE_EXISTS');
  }
  fs.mkdirSync(destination, { recursive: true, mode: 0o700 });
  fs.chmodSync(destination, 0o700);
  return { destination, evidencePath, receiptPath };
}

function persistEvidence(paths, evidence) {
  writeJson600(paths.evidencePath, evidence);
  const evidenceSha256 = sha(fs.readFileSync(paths.evidencePath));
  writeJson600(paths.receiptPath, {
    schemaVersion: 1,
    status: evidence.decision,
    code: evidence.code || null,
    runCompleted: evidence.runCompleted,
    unknownOutcome: evidence.unknownOutcome,
    runRef: evidence.runRef,
    evidenceSha256,
    evidencePath: path.relative(root, paths.evidencePath),
    production: false,
    privateCad: false,
    storeMutation: false,
    automaticRetry: false,
    secondRun: false,
    completedAtUtc: evidence.completedAtUtc,
  });
  return {
    ...evidence,
    evidenceSha256,
    receiptPath: path.relative(root, paths.receiptPath),
  };
}

async function liveConverter({
  env = process.env,
  onStage,
  authorize = sandboxAuthorizationPreflight,
  executorFactory,
} = {}) {
  const operator = readOperatorConfig(env);
  await authorize();
  onStage?.({ name: 'sandbox_authorization_preflight', status: 'authorized' });
  const createExecutor = executorFactory
    || require('../server/cadSandboxExecutor').createSandboxExecutor;
  // Let the SDK refresh and infer the linked project's credentials. Passing the
  // generic CLI token here bypasses that path and can leave a stale bearer token.
  const executor = createExecutor({ env: {}, onStage });
  return {
    project: { id: operator.projectId, teamId: operator.teamId, name: operator.projectName },
    convert: body => executor.convert(body),
    cleanupBlocked: () => executor.cleanupBlocked(),
  };
}

async function runUploadConversionSandboxQualification({
  approved = false,
  startUtc,
  endUtc,
  runRef,
  evidenceRoot,
  now = Date.now,
  converter,
  converterFactory = liveConverter,
  writeEvidence = true,
  env = process.env,
} = {}) {
  const inspected = inspectUploadConversionSandboxReadiness(packet, uploadCloseout);
  if (!inspected.readyForOneFutureDevelopmentConversionRun) {
    return blocked('SOURCE_PACKET_INVALID', { inspected });
  }
  if (!routeClosed()) return blocked('MOUNTED_ROUTE_NOT_DISABLED');
  if (!approved) return blocked('APPROVAL_REQUIRED');
  if (typeof runRef !== 'string' || !/^rrb-ref:[A-Za-z0-9._-]{1,96}$/.test(runRef)) {
    return blocked('RUN_REF_INVALID');
  }
  const window = exactWindow({ startUtc, endUtc, now });
  if (!window.ok) return window;

  const fixture = fixedFixture();
  const stages = [];
  let evidencePaths;
  if (writeEvidence) {
    try {
      evidencePaths = prepareEvidenceDestination(evidenceRoot);
    } catch (error) {
      return blocked(error.message || 'EVIDENCE_DESTINATION_INVALID');
    }
  }
  let active;
  let result;
  try {
    active = converter || await converterFactory({ env, onStage: stage => stages.push(stage) });
    result = await active.convert(fixture.body);
  } catch (error) {
    const preDispatchFailure = error.preDispatch === true;
    const failure = {
      schemaVersion: 1,
      decision: 'UPLOAD_CONVERSION_SANDBOX_QUALIFICATION_STOPPED',
      code: error.code || error.message || 'CONVERSION_FAILED',
      runCompleted: false,
      unknownOutcome: !preDispatchFailure,
      automaticRetry: false,
      secondRun: false,
      cleanupBlocked: preDispatchFailure
        ? false
        : (typeof active?.cleanupBlocked === 'function' ? active.cleanupBlocked() : true),
      runRef,
      acceptedWindow: { startUtc, endUtc },
      production: false,
      fixture: fixture.evidence,
      stages: sanitizeStages(stages),
      flags: {
        mountedProductionRouteChanged: false,
        productionUploadActivation: false,
        privateCad: false,
        realUser: false,
        storeMutation: false,
        automaticRetry: false,
        secondRun: false,
      },
      recordsContentBase64: false,
      recordsRawCredential: false,
      recordsPrivateCad: false,
      recordsRawMeshPayload: false,
      completedAtUtc: new Date(now()).toISOString(),
    };
    return evidencePaths ? persistEvidence(evidencePaths, failure) : failure;
  }
  if (!routeClosed()) return blocked('MOUNTED_ROUTE_CHANGED_DURING_RUN', { unknownOutcome: true });
  if (result?.status !== 'ready' || result?.source?.sha256 !== fixture.evidence.sha256
      || result?.execution?.cleanup !== 'stopped') {
    return blocked('RESULT_INVALID', { unknownOutcome: true, runRef });
  }

  const evidence = {
    schemaVersion: 1,
    decision: 'UPLOAD_CONVERSION_SANDBOX_QUALIFICATION_EXECUTED',
    runCompleted: true,
    unknownOutcome: false,
    runRef,
    acceptedWindow: { startUtc, endUtc },
    production: false,
    uploadPathCloseoutMergeCommit: packet.acceptedUploadPathCloseout.mergeCommit,
    fixture: fixture.evidence,
    result: {
      status: result.status,
      mode: result.mode,
      meshCount: Array.isArray(result.meshes) ? result.meshes.length : null,
      vertexCount: result.vertexCount,
      triangleCount: result.triangleCount,
      sourceConfidence: result.sourceConfidence?.status || null,
      execution: result.execution,
    },
    stages: sanitizeStages(stages),
    project: active.project || { name: 'injected-development-adapter' },
    flags: {
      mountedProductionRouteChanged: false,
      productionUploadActivation: false,
      privateCad: false,
      realUser: false,
      storeMutation: false,
      automaticRetry: false,
      secondRun: false,
    },
    recordsContentBase64: false,
    recordsRawCredential: false,
    recordsPrivateCad: false,
    recordsRawMeshPayload: false,
    completedAtUtc: new Date(now()).toISOString(),
  };
  if (!writeEvidence) return evidence;
  return persistEvidence(evidencePaths, evidence);
}

function preflight() {
  const inspected = inspectUploadConversionSandboxReadiness(packet, uploadCloseout);
  const fixture = fixedFixture();
  return {
    status: inspected.readyForOneFutureDevelopmentConversionRun && routeClosed()
      ? 'READY_WAITING_FOR_WINDOW' : 'BLOCKED',
    sourcePacketReady: inspected.readyForOneFutureDevelopmentConversionRun,
    mountedRouteDisabled: routeClosed(),
    fixture: fixture.evidence,
    liveRunAuthorizedBySourcePacket: false,
    automaticRetry: false,
    secondRun: false,
  };
}

async function main() {
  if (process.argv.includes('--preflight')) {
    process.stdout.write(JSON.stringify(preflight(), null, 2) + '\n');
    return;
  }
  const result = await runUploadConversionSandboxQualification({
    approved: process.argv.includes('--live')
      && process.env.CAD_UPLOAD_CONVERSION_QUALIFICATION_APPROVED === 'true',
    startUtc: process.env.CAD_UPLOAD_CONVERSION_WINDOW_START_UTC,
    endUtc: process.env.CAD_UPLOAD_CONVERSION_WINDOW_END_UTC,
    runRef: process.env.CAD_UPLOAD_CONVERSION_RUN_REF,
    evidenceRoot: process.env.CAD_UPLOAD_CONVERSION_EVIDENCE_ROOT,
  });
  process.stdout.write(JSON.stringify(result, null, 2) + '\n');
  if (!result.runCompleted) process.exitCode = 2;
}

if (require.main === module) {
  main().catch(error => {
    process.stdout.write(JSON.stringify({
      ...blocked(error.code || error.message || 'QUALIFICATION_FAILED'),
      unknownOutcome: true,
    }, null, 2) + '\n');
    process.exitCode = 1;
  });
}

module.exports = {
  exactWindow,
  fixedFixture,
  liveConverter,
  preflight,
  prepareEvidenceDestination,
  readOperatorConfig,
  routeClosed,
  runUploadConversionSandboxQualification,
  sandboxAuthorizationPreflight,
  safeEvidenceRoot,
};
