const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const packet = require('../offline/cad-convex/uploadConversionSandboxReadiness.json');
const closeout = require('../offline/cad-convex/uploadAdmissionActivationRolloverCloseout.json');
const docsSummary = require('../docs/cad-upload-conversion-sandbox-readiness.json');
const { inspectUploadConversionSandboxReadiness } =
  require('../offline/cad-convex/uploadConversionSandboxReadiness');
const {
  exactWindow,
  liveConverter,
  preflight,
  readOperatorConfig,
  runUploadConversionSandboxQualification,
  sandboxAuthorizationPreflight,
} = require('./run-cad-upload-conversion-sandbox-qualification');

const root = path.resolve(__dirname, '..');
const fileSha = relative => crypto.createHash('sha256')
  .update(fs.readFileSync(path.join(root, relative)))
  .digest('hex');

function fakeConverter({ fail = false } = {}) {
  let calls = 0;
  return {
    project: { name: 'injected-development-adapter' },
    cleanupBlocked: () => fail,
    calls: () => calls,
    async convert(body) {
      calls += 1;
      if (fail) throw Object.assign(new Error('synthetic failure'), { code: 'CONVERSION_FAILED' });
      assert.equal(typeof body.contentBase64, 'string');
      return {
        status: 'ready',
        mode: 'sandbox-stock-occt-mesh-beta',
        source: { sha256: packet.fixture.sha256 },
        meshes: [{}],
        vertexCount: 24,
        triangleCount: 12,
        sourceConfidence: { status: 'unqualified' },
        execution: { boundary: 'sandbox-microvm', vcpus: 1, memoryMb: 2048, cleanup: 'stopped' },
      };
    },
  };
}

test('packet binds accepted upload evidence and reuses source-bound Sandbox qualification', () => {
  const result = inspectUploadConversionSandboxReadiness(packet, closeout);
  assert.equal(result.structureValid, true);
  assert.equal(result.uploadCloseoutBound, true);
  assert.equal(result.qualificationReusable, true);
  assert.equal(result.boundsValid, true);
  assert.equal(result.routeClosed, true);
  assert.equal(result.authoritiesClosed, true);
  assert.equal(result.readyForOneFutureDevelopmentConversionRun, true);
  assert.equal(result.liveRunAuthorizedByThisPacket, false);
});

test('historical evidence and current Sandbox source hashes match the reviewed bindings', () => {
  assert.equal(fileSha('docs/cad-live-hosted-public-fixture-matrix-evidence.json'),
    packet.historicalQualification.livePublicFixtureMatrix.evidenceSha256);
  assert.equal(fileSha('docs/cad-private-pilot.md'),
    packet.historicalQualification.privatePilot.sourceSha256);
  assert.equal(fileSha('server/cadSandboxExecutor.js'),
    packet.historicalQualification.sourceContinuity.executorSha256);
  assert.equal(fileSha('server/cadSandboxConfig.js'),
    packet.historicalQualification.sourceContinuity.configSha256);
  assert.equal(fileSha('server/cadSandboxRunner.js'),
    packet.historicalQualification.sourceContinuity.guestRunnerSha256);
  assert.equal(fileSha('server/cadWorkerContract.js'),
    packet.historicalQualification.sourceContinuity.workerContractSha256);
  assert.equal(fileSha('server/cadUserUploadRouter.js'), packet.routeGate.sourceSha256);
  assert.equal(fileSha('offline/cad-convex/uploadAdmissionActivationRolloverCloseout.json'),
    packet.acceptedUploadPathCloseout.sourceSha256);
});

test('preflight is provider-free and verifies fixed fixture plus disabled route', () => {
  const result = preflight();
  assert.equal(result.status, 'READY_WAITING_FOR_WINDOW');
  assert.equal(result.sourcePacketReady, true);
  assert.equal(result.mountedRouteDisabled, true);
  assert.equal(result.fixture.sha256, packet.fixture.sha256);
  assert.equal(result.fixture.privateCad, false);
});

test('operator config reads linked project metadata without reading a raw token', () => {
  const directory = fs.mkdtempSync(path.join(require('node:os').tmpdir(), 'cad-sandbox-project-'));
  const projectPath = path.join(directory, 'project.json');
  fs.writeFileSync(projectPath, JSON.stringify({
    orgId: 'team_e1YXCCGoccmBLfbBfXGhwbd4',
    projectId: 'prj_Geremoki2OhowX1579EolsuPWXPy',
    projectName: 'reversr',
  }));
  try {
    const result = readOperatorConfig({
      VERCEL_PROJECT_JSON: projectPath,
      VERCEL_TOKEN: 'must-not-be-read',
    });
    assert.deepEqual(result, {
      teamId: 'team_e1YXCCGoccmBLfbBfXGhwbd4',
      projectId: 'prj_Geremoki2OhowX1579EolsuPWXPy',
      projectName: 'reversr',
    });
    assert.equal(Object.hasOwn(result, 'token'), false);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test('authorization preflight is read-only and reports a sanitized known failure', async () => {
  let params;
  const success = await sandboxAuthorizationPreflight({
    list: async value => { params = value; return { sandboxes: [] }; },
  });
  assert.equal(success.status, 'authorized');
  assert.equal(params.limit, 1);
  assert.ok(params.signal instanceof AbortSignal);

  await assert.rejects(
    sandboxAuthorizationPreflight({ list: async () => { throw new Error('raw provider detail'); } }),
    error => error.code === 'SANDBOX_AUTHORIZATION_FAILED'
      && error.preDispatch === true
      && !error.message.includes('raw provider detail'),
  );
});

test('live converter authorizes before constructing an inferred-credential executor', async () => {
  const directory = fs.mkdtempSync(path.join(require('node:os').tmpdir(), 'cad-sandbox-project-'));
  const projectPath = path.join(directory, 'project.json');
  fs.writeFileSync(projectPath, JSON.stringify({
    orgId: 'team_e1YXCCGoccmBLfbBfXGhwbd4',
    projectId: 'prj_Geremoki2OhowX1579EolsuPWXPy',
    projectName: 'reversr',
  }));
  const events = [];
  let executorOptions;
  try {
    const converter = await liveConverter({
      env: { VERCEL_PROJECT_JSON: projectPath, VERCEL_TOKEN: 'must-not-be-forwarded' },
      onStage: event => events.push(event),
      authorize: async () => ({ status: 'authorized' }),
      executorFactory: options => {
        executorOptions = options;
        return { convert: async () => ({}), cleanupBlocked: () => false };
      },
    });
    assert.deepEqual(executorOptions.env, {});
    assert.equal(events[0].name, 'sandbox_authorization_preflight');
    assert.equal(converter.project.id, 'prj_Geremoki2OhowX1579EolsuPWXPy');
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test('window parser requires a valid bounded open window', () => {
  assert.equal(exactWindow({ startUtc: '', endUtc: '' }).code, 'WINDOW_INVALID');
  assert.equal(exactWindow({
    startUtc: '2026-09-17T02:00:00Z',
    endUtc: '2026-09-17T02:31:00Z',
    now: () => Date.parse('2026-09-17T02:01:00Z'),
  }).code, 'WINDOW_TOO_LONG');
  assert.equal(exactWindow({
    startUtc: '2026-09-17T02:00:00Z',
    endUtc: '2026-09-17T02:30:00Z',
    now: () => Date.parse('2026-09-17T01:59:59Z'),
  }).code, 'WINDOW_NOT_OPEN');
  assert.equal(exactWindow({
    startUtc: '2026-09-17T02:00:00Z',
    endUtc: '2026-09-17T02:30:00Z',
    now: () => Date.parse('2026-09-17T02:00:01Z'),
  }).ok, true);
});

test('runner stays inert without approval and executes an injected adapter once in-window', async () => {
  const adapter = fakeConverter();
  const base = {
    startUtc: '2026-09-17T02:00:00Z',
    endUtc: '2026-09-17T02:30:00Z',
    runRef: 'rrb-ref:cad-upload-conversion-sandbox-qualification',
    now: () => Date.parse('2026-09-17T02:00:05Z'),
    converter: adapter,
    writeEvidence: false,
  };
  const denied = await runUploadConversionSandboxQualification(base);
  assert.equal(denied.code, 'APPROVAL_REQUIRED');
  assert.equal(adapter.calls(), 0);

  const result = await runUploadConversionSandboxQualification({ ...base, approved: true });
  assert.equal(adapter.calls(), 1);
  assert.equal(result.decision, 'UPLOAD_CONVERSION_SANDBOX_QUALIFICATION_EXECUTED');
  assert.equal(result.runCompleted, true);
  assert.equal(result.unknownOutcome, false);
  assert.equal(result.fixture.sha256, packet.fixture.sha256);
  assert.equal(result.result.triangleCount, 12);
  assert.equal(result.result.execution.cleanup, 'stopped');
  assert.equal(result.flags.automaticRetry, false);
  assert.equal(result.flags.secondRun, false);
  assert.equal(result.flags.productionUploadActivation, false);
});

test('one failed conversion stops with unknown outcome and no retry', async () => {
  const adapter = fakeConverter({ fail: true });
  const result = await runUploadConversionSandboxQualification({
    approved: true,
    startUtc: '2026-09-17T02:00:00Z',
    endUtc: '2026-09-17T02:30:00Z',
    runRef: 'rrb-ref:cad-upload-conversion-sandbox-qualification',
    now: () => Date.parse('2026-09-17T02:00:05Z'),
    converter: adapter,
    writeEvidence: false,
  });
  assert.equal(adapter.calls(), 1);
  assert.equal(result.runCompleted, false);
  assert.equal(result.unknownOutcome, true);
  assert.equal(result.automaticRetry, false);
  assert.equal(result.secondRun, false);
});

test('authorization failure blocks before dispatch with a known outcome', async () => {
  let calls = 0;
  const result = await runUploadConversionSandboxQualification({
    approved: true,
    startUtc: '2026-09-17T02:00:00Z',
    endUtc: '2026-09-17T02:30:00Z',
    runRef: 'rrb-ref:cad-upload-conversion-sandbox-qualification',
    now: () => Date.parse('2026-09-17T02:00:05Z'),
    converterFactory: async () => {
      calls += 1;
      const error = new Error('SANDBOX_AUTHORIZATION_FAILED');
      error.code = 'SANDBOX_AUTHORIZATION_FAILED';
      error.preDispatch = true;
      throw error;
    },
    writeEvidence: false,
  });
  assert.equal(calls, 1);
  assert.equal(result.code, 'SANDBOX_AUTHORIZATION_FAILED');
  assert.equal(result.runCompleted, false);
  assert.equal(result.unknownOutcome, false);
  assert.equal(result.cleanupBlocked, false);
  assert.equal(result.stages.length, 0);
  assert.equal(result.automaticRetry, false);
  assert.equal(result.secondRun, false);
});

test('invalid evidence destination blocks before converter invocation', async () => {
  const adapter = fakeConverter();
  const result = await runUploadConversionSandboxQualification({
    approved: true,
    startUtc: '2026-09-17T02:00:00Z',
    endUtc: '2026-09-17T02:30:00Z',
    runRef: 'rrb-ref:cad-upload-conversion-sandbox-qualification',
    evidenceRoot: '../outside-local-custody',
    now: () => Date.parse('2026-09-17T02:00:05Z'),
    converter: adapter,
    writeEvidence: true,
  });
  assert.equal(result.code, 'EVIDENCE_ROOT_INVALID');
  assert.equal(adapter.calls(), 0);
});

test('mounted route remains disabled and isolated from the new packet and runner', () => {
  const route = fs.readFileSync(path.join(root, 'server/cadUserUploadRouter.js'), 'utf8');
  assert.match(route, /const BODY_ADMISSION_AUTHORIZED = false;/);
  assert.doesNotMatch(route, /BODY_ADMISSION_AUTHORIZED = true/);
  assert.doesNotMatch(route, /uploadConversionSandboxReadiness|run-cad-upload-conversion-sandbox/);
});

test('docs preserve the execution boundary', () => {
  const markdown = fs.readFileSync(
    path.join(root, 'docs/cad-upload-conversion-sandbox-readiness.md'),
    'utf8',
  );
  assert.equal(docsSummary.liveRunHappened, false);
  assert.equal(docsSummary.liveRunAuthorizedByThisPacket, false);
  assert.equal(docsSummary.productionUploadActivationAuthorized, false);
  assert.equal(docsSummary.privateCadAuthorized, false);
  assert.match(markdown, /No Sandbox was\s+created and no conversion ran/i);
  assert.match(markdown, /mounted user route stays disabled/i);
});
