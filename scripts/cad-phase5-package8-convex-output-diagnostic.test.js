const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { TARGET, classifyCapture, classifyConsumedRun,
  inspectInstalledSource } = require('./cad-phase5-package8-convex-output-diagnostic');

const valid = JSON.stringify({ url: TARGET,
  functions: [{ identifier: 'auth.js:isAuthenticated' }] });

test('valid metadata produces only a count and digest', () => {
  const result = classifyCapture({ cliExitStatus: 0, stdout: valid });
  assert.equal(result.classification, 'SANITIZED_METADATA_AVAILABLE');
  assert.equal(result.functionCount, 1);
  assert.match(result.functionNamesDigest, /^[a-f0-9]{64}$/);
  assert.equal(Object.hasOwn(result, 'functionNames'), false);
});

test('capture failures have fixed privacy-safe classifications', () => {
  const cases = [
    [{ cliExitStatus: null, stdout: '' }, 'CLI_EXIT_UNKNOWN'],
    [{ cliExitStatus: 1, stdout: '' }, 'CLI_EXIT_NONZERO'],
    [{ cliExitStatus: 0, stdout: '' }, 'STDOUT_EMPTY'],
    [{ cliExitStatus: 0, stdout: '{' }, 'STDOUT_JSON_INVALID'],
    [{ cliExitStatus: 0, stdout: JSON.stringify({ url: TARGET, functions: {} }) }, 'RESPONSE_SHAPE_INVALID'],
    [{ cliExitStatus: 0, stdout: JSON.stringify({ url: `${TARGET}/`, functions: [] }) }, 'TARGET_MISMATCH'],
    [{ cliExitStatus: 0, stdout: JSON.stringify({ url: TARGET, functions: [{}] }) }, 'IDENTIFIER_MISSING'],
    [{ cliExitStatus: 0, stdout: JSON.stringify({ url: TARGET,
      functions: [{ identifier: 'component$path/module.js:fn' }] }) }, 'IDENTIFIER_GRAMMAR_UNSUPPORTED'],
    [{ cliExitStatus: 0, stdout: JSON.stringify({ url: TARGET,
      functions: [{ identifier: 'a.js:q' }, { identifier: 'a.js:q' }] }) }, 'IDENTIFIER_DUPLICATE'],
  ];
  for (const [input, expected] of cases) {
    assert.equal(classifyCapture(input).classification, expected);
  }
});

test('stderr presence is classified without retaining its contents', () => {
  const result = classifyCapture({ cliExitStatus: 0, stdout: valid, stderr: 'synthetic warning' });
  assert.equal(result.classification, 'SANITIZED_METADATA_AVAILABLE');
  assert.equal(result.stderrClassification, 'PRESENT_NOT_RETAINED');
  assert.equal(JSON.stringify(result).includes('synthetic warning'), false);
});

test('the consumed run is unobservable without status, output, or artifact', () => {
  assert.equal(classifyConsumedRun({ parserExitStatusRecorded: false,
    sanitizedOutputPresent: false, sanitizedArtifactPresent: false }),
  'WRAPPER_SILENT_EXIT_UNOBSERVABLE');
});

test('installed CLI source confirms stdout, two system queries, and retry risk', () => {
  const root = path.resolve(__dirname, '..');
  const findings = inspectInstalledSource({
    functionSpecSource: fs.readFileSync(path.join(root,
      'node_modules/convex/dist/cjs/cli/lib/functionSpec.js'), 'utf8'),
    logSource: fs.readFileSync(path.join(root,
      'node_modules/convex/dist/cjs/bundler/log.js'), 'utf8'),
    bundleSource: fs.readFileSync(path.join(root,
      'node_modules/convex/dist/cli.bundle.cjs'), 'utf8'),
  });
  assert.deepEqual(findings, {
    functionSpecWritesStdout: true,
    systemQueryCount: 2,
    transportMaxRetries: 6,
    functionSpecNoRetryFlagFound: true,
  });
});
