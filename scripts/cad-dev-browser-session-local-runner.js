#!/usr/bin/env node
const fs = require('node:fs');
const crypto = require('node:crypto');

const {
  falseAuthorityKeys,
  validateRunBinding,
  assertPrivateBindingFile,
} = require('./cad-dev-browser-session-runner-binding');

const sha256 = value => crypto.createHash('sha256').update(value).digest('hex');
const fail = code => { throw new Error(code); };

function parseBindingFile(bindingFile) {
  assertPrivateBindingFile(bindingFile);
  const bytes = fs.readFileSync(bindingFile);
  const binding = JSON.parse(bytes.toString('utf8'));
  const validated = validateRunBinding(binding);
  return { bytes, binding, validated };
}

function assertLocalLoopbackBinding(binding, validated) {
  const target = binding.target || {};
  if (target.kind !== 'local-loopback-https') fail('LOCAL_RUNNER_TARGET_KIND_INVALID');
  const parsed = new URL(validated.origin);
  if (parsed.protocol !== 'https:' || !['127.0.0.1', 'localhost'].includes(parsed.hostname)) {
    fail('LOCAL_RUNNER_TARGET_NOT_LOOPBACK_HTTPS');
  }
  return {
    origin: parsed.origin,
    host: parsed.hostname,
    port: Number.parseInt(parsed.port || '443', 10),
    route: target.exactBrowserRoute,
  };
}

function buildLocalRunnerPlan(bindingFile, { generatedAtUtc = 'source-review' } = {}) {
  const { bytes, binding, validated } = parseBindingFile(bindingFile);
  const target = assertLocalLoopbackBinding(binding, validated);
  const bindingSha256 = sha256(bytes);
  return Object.freeze({
    schemaVersion: 1,
    mode: 'cad-dev-browser-session-local-runner-plan',
    status: 'SOURCE_READY_LOCAL_BROWSER_RUNNER_REVIEWED',
    sourceOnly: true,
    generatedAtUtc,
    runId: binding.runId,
    sourceCommit: binding.sourceCommit,
    bindingSha256,
    target,
    window: {
      startUtc: binding.window.startUtc,
      endUtc: binding.window.endUtc,
    },
    packet: {
      markdownSha256: binding.packet.markdownSha256,
      jsonSha256: binding.packet.jsonSha256,
    },
    guards: {
      bindingMustRemainMode0600: true,
      bindingDirectoryMustRemainMode0700: true,
      exactBindingSha256Required: bindingSha256,
      exactSourceCommitRequired: binding.sourceCommit,
      executeFlagAcceptedNow: false,
      liveRunAuthorizedNow: false,
      maxIssuerRequests: binding.limits.maxIssuerRequests,
      maxDisabledUploadRequests: binding.limits.maxDisabledUploadRequests,
      requestBodyBytes: binding.limits.requestBodyBytes,
      bodyReads: binding.limits.bodyReads,
      retry: binding.limits.retry,
      secondRun: binding.limits.secondRun,
      redirects: binding.limits.redirects,
    },
    executionPlan: [
      'validate the private run binding and exact source commit',
      'require a separate explicit one-run approval before any browser opens',
      'start only the run-owned local HTTPS target described by the binding',
      'open one fresh Chromium context with persistent profile, extensions and service workers disabled',
      'issue at most one bodyless synthetic session request',
      'attempt at most one disabled upload-route request without a request body',
      'write sanitized local evidence and stop on any unknown outcome',
    ],
    authority: Object.freeze(Object.fromEntries(falseAuthorityKeys.map(key => [key, false]))),
  });
}

function usage() {
  return [
    'Usage:',
    '  node scripts/cad-dev-browser-session-local-runner.js --plan <binding.json>',
    '',
    'This source-only runner plan never starts a server, opens a browser, or sends requests.',
  ].join('\n');
}

if (require.main === module) {
  try {
    if (process.argv.includes('--execute') || process.argv.includes('--execute-approved-once')) {
      fail('LOCAL_BROWSER_EXECUTION_NOT_AUTHORIZED_IN_SOURCE_PACKET');
    }
    if (process.argv[2] !== '--plan' || !process.argv[3]) {
      process.stderr.write(`${usage()}\n`);
      process.exit(1);
    }
    const plan = buildLocalRunnerPlan(process.argv[3]);
    process.stdout.write(`${JSON.stringify(plan, null, 2)}\n`);
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exit(1);
  }
}

module.exports = {
  buildLocalRunnerPlan,
  assertLocalLoopbackBinding,
};
