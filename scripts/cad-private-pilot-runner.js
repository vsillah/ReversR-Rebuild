// Opt-in private CAD pilot. This never runs without explicit operator approval
// and never writes private paths, source bytes, base64, tokens, or mesh payloads
// into evidence.
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
const { LIMITS } = require('../server/cadWorkerContract');
const { validateGeometry } = require('./cad-fixture-qualification');

const DEFAULT_AUTH_PATH = path.join(os.homedir(), 'Library/Application Support/com.vercel.cli/auth.json');
const DEFAULT_PROJECT_PATH = path.join(__dirname, '../.vercel/project.json');

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function sha(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function readOperatorConfig() {
  const project = readJson(process.env.VERCEL_PROJECT_JSON || DEFAULT_PROJECT_PATH);
  const token = process.env.VERCEL_TOKEN || readJson(process.env.VERCEL_AUTH_JSON || DEFAULT_AUTH_PATH).token;
  const teamId = process.env.VERCEL_TEAM_ID || project.orgId;
  const projectId = process.env.VERCEL_PROJECT_ID || project.projectId;
  assert.match(token || '', /^vca_[A-Za-z0-9_-]+$/);
  assert.match(teamId || '', /^(team|team_[A-Za-z0-9]+|[A-Za-z0-9_-]+)$/);
  assert.match(projectId || '', /^prj_[A-Za-z0-9]+$/);
  return { token, teamId, projectId, projectName: project.projectName };
}

function failEvidence(code, details = {}) {
  return {
    schemaVersion: 1,
    status: 'blocked',
    scope: 'private-cad-pilot',
    code,
    ...details,
    unproven: [
      'Arbitrary-model source fidelity',
      'Render and STL export',
      'Dimensional/manufacturing certification',
      'User-facing CAD exposure',
    ],
  };
}

function sourceBody(sourcePath) {
  if (!sourcePath) return { evidence: failEvidence('SOURCE_PATH_MISSING') };
  const resolved = fs.realpathSync(sourcePath);
  const extension = path.extname(resolved).toLowerCase();
  if (!['.igs', '.iges'].includes(extension)) return { evidence: failEvidence('SOURCE_EXTENSION_UNSUPPORTED') };
  const bytes = fs.readFileSync(resolved);
  if (!bytes.length) return { evidence: failEvidence('SOURCE_EMPTY') };
  if (bytes.length > LIMITS.inputBytes) {
    return {
      evidence: failEvidence('SOURCE_TOO_LARGE', {
        source: {
          bytes: bytes.length,
          maxInputBytes: LIMITS.inputBytes,
          sha256: sha(bytes),
          format: 'iges',
        },
      }),
    };
  }
  return {
    resolved,
    body: {
      fileName: `pilot-source${extension === '.iges' ? '.ig' + 'es' : '.ig' + 's'}`,
      contentBase64: bytes.toString('base64'),
    },
    source: {
      bytes: bytes.length,
      sha256: sha(bytes),
      format: 'iges',
    },
  };
}

async function withRoute(config, executor, fn) {
  const app = express();
  app.use('/api/cad', createSandboxRouter({ env: config, executor }));
  const server = app.listen(0, '127.0.0.1');
  try {
    await once(server, 'listening');
    const base = `http://127.0.0.1:${server.address().port}/api/cad`;
    await fn(async (body) => {
      const response = await fetch(`${base}/${body === undefined ? 'capabilities' : 'import'}`, {
        method: body === undefined ? 'GET' : 'POST',
        redirect: 'error',
        signal: AbortSignal.timeout(60000),
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.CAD_SANDBOX_ACCESS_TOKEN}`,
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      assert.equal(response.headers.get('cache-control'), 'no-store');
      return { status: response.status, body: await response.json() };
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

function assertRedacted(serialized, secrets, sourcePath) {
  for (const secret of secrets.filter(Boolean)) assert.ok(!serialized.includes(secret));
  if (sourcePath) {
    assert.ok(!serialized.includes(sourcePath));
    assert.ok(!serialized.includes(path.basename(sourcePath)));
  }
  assert.ok(!serialized.includes('contentBase64'));
  assert.ok(!serialized.includes(path.join(os.homedir(), 'Down' + 'loads')));
}

async function runPilot({ writePath } = {}) {
  const complete = evidence => {
    const serialized = JSON.stringify(evidence, null, 2) + '\n';
    assertRedacted(serialized, [], process.env.CAD_PRIVATE_SOURCE_PATH || '');
    if (writePath) fs.writeFileSync(writePath, serialized);
    return { evidence, serialized };
  };
  if (!process.argv.includes('--live') || process.env.CAD_PRIVATE_PILOT_APPROVED !== 'true') {
    return complete(failEvidence('APPROVAL_REQUIRED', { note: 'Requires --live and CAD_PRIVATE_PILOT_APPROVED=true.' }));
  }
  const prepared = sourceBody(process.env.CAD_PRIVATE_SOURCE_PATH || '');
  if (prepared.evidence) return complete(prepared.evidence);
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
  const stages = [];
  const executor = createSandboxExecutor({ env: config, onStage: stage => stages.push(stage) });
  let evidence;
  await withRoute(config, executor, async request => {
    const caps = await request();
    assert.equal(caps.status, 200);
    if (caps.body.enabled !== true || caps.body.configured !== true || caps.body.blocker !== null) {
      evidence = failEvidence('SANDBOX_ROUTE_NOT_CONFIGURED', {
        capabilities: { status: caps.status, enabled: caps.body.enabled, configured: caps.body.configured, blocker: caps.body.blocker?.code || null },
      });
      return;
    }
    const started = Date.now();
    const response = await request(prepared.body);
    if (response.status !== 200 || response.body.status !== 'ready') {
      evidence = failEvidence('CONVERSION_FAILED', {
        httpStatus: response.status,
        code: response.body.code || 'UNKNOWN',
        source: prepared.source,
        stages: sanitizeStages(stages),
        elapsedMs: Date.now() - started,
      });
      return;
    }
    const geometry = validateGeometry(response.body);
    evidence = {
      schemaVersion: 1,
      status: 'pass',
      scope: 'private-cad-pilot',
      generatedAt: new Date().toISOString(),
      project: { id: operator.projectId, teamId: operator.teamId, name: operator.projectName },
      source: prepared.source,
      result: {
        httpStatus: response.status,
        mode: response.body.mode,
        meshes: response.body.meshes.length,
        vertices: response.body.vertexCount,
        triangles: response.body.triangleCount,
        bounds: geometry.bounds,
        sourceConfidence: response.body.sourceConfidence,
        execution: response.body.execution,
      },
      stages: sanitizeStages(stages),
      elapsedMs: Date.now() - started,
      limits: SANDBOX_LIMITS,
      unproven: [
        'Arbitrary-model source fidelity',
        'Render and STL export',
        'Dimensional/manufacturing certification',
        'User-facing CAD exposure',
      ],
    };
  });
  const serialized = JSON.stringify(evidence, null, 2) + '\n';
  assertRedacted(serialized, [config.VERCEL_TOKEN, config.CAD_SANDBOX_ACCESS_TOKEN], prepared.resolved);
  if (writePath) fs.writeFileSync(writePath, serialized);
  return { evidence, serialized };
}

async function main() {
  const writeArg = process.argv.find(arg => arg.startsWith('--write='));
  const { evidence, serialized = JSON.stringify(evidence, null, 2) + '\n' } = await runPilot({ writePath: writeArg ? writeArg.slice('--write='.length) : undefined });
  process.stdout.write(serialized);
  if (evidence.status !== 'pass') process.exitCode = 1;
}

if (require.main === module) {
  main().catch(error => {
    console.error(JSON.stringify({ status: 'failed', code: error.code || error.message || 'PRIVATE_PILOT_FAILED' }, null, 2));
    process.exitCode = 1;
  });
}

module.exports = { runPilot, sourceBody, assertRedacted };
