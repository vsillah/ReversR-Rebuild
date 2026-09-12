// Opt-in live hosted fixture qualification. This script must never print tokens,
// raw source content, private CAD, or full mesh payloads.
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const express = require('express');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { once } = require('node:events');

const { createSandboxRouter } = require('../server/cadSandboxRouter');
const { createSandboxExecutor } = require('../server/cadSandboxExecutor');
const { SANDBOX_LIMITS } = require('../server/cadSandboxConfig');
const { ERRORS } = require('../server/cadWorkerContract');
const {
  fixtureBody,
  loadFixtures,
  validateGeometry,
} = require('./cad-fixture-qualification');
const matrix = require('./fixtures/cad-public-matrix.json');

const DEFAULT_AUTH_PATH = path.join(os.homedir(), 'Library/Application Support/com.vercel.cli/auth.json');
const DEFAULT_PROJECT_PATH = path.join(__dirname, '../.vercel/project.json');

function sha(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function readOperatorConfig() {
  const project = readJson(process.env.VERCEL_PROJECT_JSON || DEFAULT_PROJECT_PATH);
  const token = process.env.VERCEL_TOKEN || readJson(process.env.VERCEL_AUTH_JSON || DEFAULT_AUTH_PATH).token;
  const teamId = process.env.VERCEL_TEAM_ID || project.orgId;
  const projectId = process.env.VERCEL_PROJECT_ID || project.projectId;
  assert.match(token || '', /^vca_[A-Za-z0-9_-]+$/);
  assert.match(project.orgId || '', /^(team|team_[A-Za-z0-9]+|[A-Za-z0-9_-]+)$/);
  assert.match(project.projectId || '', /^prj_[A-Za-z0-9]+$/);
  assert.match(teamId || '', /^(team|team_[A-Za-z0-9]+|[A-Za-z0-9_-]+)$/);
  assert.match(projectId || '', /^prj_[A-Za-z0-9]+$/);
  return {
    token,
    teamId,
    projectId,
    projectName: project.projectName,
  };
}

async function withRoute(config, executor, fn) {
  const app = express();
  app.use('/api/cad', createSandboxRouter({ env: config, executor }));
  const server = app.listen(0, '127.0.0.1');
  try {
    await once(server, 'listening');
    const base = `http://127.0.0.1:${server.address().port}/api/cad`;
    await fn(async (body, authorization = `Bearer ${config.CAD_SANDBOX_ACCESS_TOKEN}`) => {
      const response = await fetch(`${base}/${body === undefined ? 'capabilities' : 'import'}`, {
        method: body === undefined ? 'GET' : 'POST',
        redirect: 'error',
        signal: AbortSignal.timeout(60000),
        headers: {
          'Content-Type': 'application/json',
          Authorization: authorization,
        },
        body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body),
      });
      assert.equal(response.headers.get('cache-control'), 'no-store');
      const raw = await response.text();
      for (const secret of [config.VERCEL_TOKEN, config.CAD_SANDBOX_ACCESS_TOKEN].filter(Boolean)) {
        assert.ok(!raw.includes(secret));
      }
      return { status: response.status, body: JSON.parse(raw) };
    });
  } finally {
    await new Promise(resolve => {
      server.close(resolve);
      server.closeAllConnections();
    });
  }
}

function sanitizeStages(stages) {
  return stages.map(stage => {
    const out = { name: stage.name };
    for (const key of ['bytes', 'files', 'persistent', 'vcpus', 'memoryMb', 'timeoutMs', 'networkPolicy', 'exitCode', 'status', 'guestMemoryBytes']) {
      if (Object.hasOwn(stage, key)) out[key] = stage[key];
    }
    return out;
  });
}

function redactionAssert(serialized, config) {
  for (const secret of [config.VERCEL_TOKEN, config.CAD_SANDBOX_ACCESS_TOKEN].filter(Boolean)) {
    assert.ok(!serialized.includes(secret));
  }
  assert.ok(!serialized.includes(path.join(os.homedir(), 'Down' + 'loads')));
}

async function qualify({ writePath } = {}) {
  if (!process.argv.includes('--live') || process.env.CAD_FIXTURE_MATRIX_APPROVED !== 'true') {
    throw new Error('LIVE_MATRIX_REQUIRES_APPROVAL');
  }
  const operator = readOperatorConfig();
  const routeToken = crypto.randomBytes(32).toString('hex');
  const config = {
    CAD_IMPORT_EXECUTOR: 'sandbox',
    VERCEL_TOKEN: operator.token,
    VERCEL_TEAM_ID: operator.teamId,
    VERCEL_PROJECT_ID: operator.projectId,
    CAD_SANDBOX_LIVE_QUALIFIED: 'true',
    CAD_SANDBOX_ACCESS_TOKEN: routeToken,
  };
  const fixtures = loadFixtures(matrix);
  const stagesByCase = {};
  let activeCase = 'startup';
  const executor = createSandboxExecutor({
    env: config,
    onStage(stage) {
      if (!stagesByCase[activeCase]) stagesByCase[activeCase] = [];
      stagesByCase[activeCase].push(stage);
    },
  });
  const report = {
    schemaVersion: 1,
    status: 'pass',
    scope: 'live-hosted-public-fixture-matrix',
    generatedAt: new Date().toISOString(),
    commit: require('child_process').execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
    project: { id: operator.projectId, teamId: operator.teamId, name: operator.projectName },
    limits: SANDBOX_LIMITS,
    fixtures: matrix.fixtures.map(({ id, source, format, sha256, bytes, license, sourceUrl, sourceCommit }) => ({
      id,
      source,
      format,
      sha256,
      bytes,
      ...(license ? { license } : {}),
      ...(sourceUrl ? { sourceUrl } : {}),
      ...(sourceCommit ? { sourceCommit } : {}),
    })),
    checks: [],
    conversions: [],
    providerDispatchesExpected: matrix.cases.filter(entry => entry.dispatches === 1).length,
    providerDispatchesObserved: 0,
    unproven: [
      'Private CAD readiness',
      'Arbitrary-model fidelity',
      'Manufacturing certification',
      'Render and STL export qualification',
    ],
  };
  const check = async (id, fn) => {
    activeCase = id;
    const started = Date.now();
    const before = report.providerDispatchesObserved;
    try {
      const detail = await fn();
      const dispatches = report.providerDispatchesObserved - before;
      report.checks.push({ id, passed: true, elapsedMs: Date.now() - started, dispatches, ...detail, stages: sanitizeStages(stagesByCase[id] || []) });
    } catch (error) {
      report.status = 'fail';
      report.checks.push({
        id,
        passed: false,
        elapsedMs: Date.now() - started,
        dispatches: report.providerDispatchesObserved - before,
        error: error.code || error.message || 'CHECK_FAILED',
        stages: sanitizeStages(stagesByCase[id] || []),
      });
    } finally {
      activeCase = 'idle';
    }
  };
  await withRoute(config, executor, async request => {
    await check('configured-capabilities', async () => {
      const r = await request();
      assert.equal(r.status, 200);
      assert.equal(r.body.enabled, true);
      assert.equal(r.body.configured, true);
      assert.equal(r.body.blocker, null);
      return { httpStatus: r.status, mode: r.body.mode };
    });
    const cube = fixtures.get('cube');
    for (const [id, auth] of [['missing-auth', ''], ['invalid-auth', 'Bearer invalid']]) {
      await check(id, async () => {
        const r = await request(fixtureBody(cube.data, 'none'), auth);
        assert.equal(r.status, 401);
        assert.equal(r.body.code, 'UNAUTHORIZED');
        assert.equal(r.body.diagnostic, undefined);
        return { httpStatus: r.status, code: r.body.code };
      });
    }
    for (const entry of matrix.cases) {
      await check(entry.id, async () => {
        const fixture = fixtures.get(entry.fixture);
        const body = fixtureBody(fixture.data, entry.mutation, fixture.format);
        const r = await request(body);
        assert.equal(r.status, entry.status);
        if (entry.code) {
          assert.equal(r.body.code, entry.code);
          return { httpStatus: r.status, code: r.body.code, expectedStatus: entry.status };
        }
        assert.equal(r.body.status, 'ready');
        assert.equal(r.body.source.sha256, sha(Buffer.from(body.contentBase64, 'base64')));
        const geometry = validateGeometry(r.body, fixture.geometry);
        assert.equal(r.body.sourceConfidence.status, 'unqualified');
        assert.equal(r.body.execution.cleanup, 'stopped');
        report.providerDispatchesObserved++;
        const conversion = {
          fixtureId: fixture.id,
          caseId: entry.id,
          sourceSha256: r.body.source.sha256,
          meshes: r.body.meshes.length,
          vertices: r.body.vertexCount,
          triangles: r.body.triangleCount,
          bounds: geometry.bounds,
          execution: r.body.execution,
        };
        report.conversions.push(conversion);
        return { httpStatus: r.status, expectedStatus: entry.status, conversion };
      });
    }
  });
  const gates = [
    ['missing-executor', { ...config, CAD_IMPORT_EXECUTOR: '' }],
    ['invalid-executor', { ...config, CAD_IMPORT_EXECUTOR: 'unknown' }],
    ['missing-credentials', { ...config, VERCEL_TOKEN: '', VERCEL_TEAM_ID: '', VERCEL_PROJECT_ID: '' }],
    ['missing-qualification', { ...config, CAD_SANDBOX_LIVE_QUALIFIED: '' }],
    ['missing-token', { ...config, CAD_SANDBOX_ACCESS_TOKEN: '' }],
    ['invalid-token', { ...config, CAD_SANDBOX_ACCESS_TOKEN: 'short' }],
  ];
  for (const [id, gateConfig] of gates) {
    await withRoute(gateConfig, executor, async request => {
      await check(id, async () => {
        const caps = await request();
        assert.equal(caps.status, 200);
        assert.equal(caps.body.enabled, false);
        assert.equal(caps.body.configured, false);
        const r = await request(fixtureBody(fixtures.get('cube').data, 'none'));
        assert.equal(r.status, 503);
        assert.equal(r.body.code, 'DISABLED');
        return { httpStatus: r.status, capabilitiesStatus: caps.status, code: r.body.code };
      });
    });
  }
  if (report.providerDispatchesObserved !== report.providerDispatchesExpected) {
    report.status = 'fail';
    report.checks.push({
      id: 'provider-dispatch-count',
      passed: false,
      observed: report.providerDispatchesObserved,
      expected: report.providerDispatchesExpected,
    });
  } else {
    report.checks.push({
      id: 'provider-dispatch-count',
      passed: true,
      observed: report.providerDispatchesObserved,
      expected: report.providerDispatchesExpected,
    });
  }
  const serialized = JSON.stringify(report, null, 2) + '\n';
  redactionAssert(serialized, config);
  if (writePath) fs.writeFileSync(writePath, serialized);
  return { report, serialized };
}

async function main() {
  const writeArg = process.argv.find(arg => arg.startsWith('--write='));
  const { report, serialized } = await qualify({ writePath: writeArg ? writeArg.slice('--write='.length) : undefined });
  console.log(serialized);
  if (report.status !== 'pass') process.exitCode = 1;
}

if (require.main === module) {
  main().catch(error => {
    console.error(JSON.stringify({
      status: 'failed',
      code: error.code || 'LIVE_MATRIX_FAILED',
      frames: String(error.stack || '').split('\n').slice(1, 8).map(line => line.trim()),
    }, null, 2));
    process.exitCode = 1;
  });
}

module.exports = { qualify };
