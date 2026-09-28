const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { test } = require('node:test');
const { createCadProductionExecutableRuntimeMount } =
  require('../server/cadProductionExecutableRuntimeMountCompletion');
const { createCadLiveOpeningExecutableRuntimeBootstrap } =
  require('../server/cadLiveOpeningExecutableRuntimeBootstrap');
const {
  BOOTSTRAP_BINDING_REPAIR_PACKET_SHA256,
  PREVIOUS_EXECUTABLE_COMMAND_CARD_REBIND_PACKET_SHA256,
  PREVIOUS_DIGEST_REFRESH_SHA256,
  BOUNDED_SESSION_REF,
  INTERNAL_COHORT_REF,
  exactLiveOpeningApprovalPhrase,
  runtimeMountCompletionPreparation,
  checkRuntimeMountCompletionPreparation,
} = require('../offline/cad-auth-prod-runtime-mount-completion/preparation');
const { harness } = require('./cad-auth-prod-runtime-mount-fixture');
const {
  PACKET,
  SOURCES,
  checkPacket,
} = require('./cad-auth-prod-runtime-mount-completion-checker');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file));
const packet = () => JSON.parse(read(PACKET));

function closed(result) {
  for (const [field, expected] of Object.entries(runtimeMountCompletionPreparation().controls)) {
    assert.equal(result[field], expected, field);
  }
  assert.doesNotMatch(JSON.stringify(result), /PRIVATE_SENTINEL|PRIVATE_HOME|ABSOLUTE_PRIVATE_SOURCE|\/Users\/|\.local\//);
}

test('historical mount packet fails current-source validation after execution binding closure', () => {
  const p = packet();
  const result = checkPacket(p);
  assert.equal(result.ok, false);
  closed(result);
  assert.equal(p.parent.bootstrapBindingRepair.sha256, BOOTSTRAP_BINDING_REPAIR_PACKET_SHA256);
  assert.equal(p.preparation.parent.previousExecutableCommandCardRebindPacketSha256,
    PREVIOUS_EXECUTABLE_COMMAND_CARD_REBIND_PACKET_SHA256);
  assert.equal(p.preparation.parent.previousDigestRefreshSha256, PREVIOUS_DIGEST_REFRESH_SHA256);
  assert.equal(p.preparation.productionMount.defaultProductionBehaviorClosed, true);
  assert.equal(p.preparation.productionMount.noEnvironmentRuntimeSwitch, true);
  assert.equal(p.preparation.nextGate.liveOpeningAuthorizedByThisGate, false);
});

test('production helper defaults closed and passes exact runtime binding only when supplied', async () => {
  const defaultMount = createCadLiveOpeningExecutableRuntimeBootstrap();
  assert.equal(defaultMount.enabled, false);
  assert.equal((await defaultMount.admissionSwitch.decide()).code, 'EXECUTABLE_RUNTIME_WIRING_DISABLED');

  const exact = harness();
  let capturedBootstrapRuntime;
  let capturedRouterOptions;
  const expectedMount = Object.freeze({ admissionSwitch: defaultMount.admissionSwitch });
  const returned = createCadProductionExecutableRuntimeMount({
    corsOrigins: ['https://reversr.vercel.app'],
    sessionService: { lookupSession() {} },
    executableRuntime: exact.options,
    bootstrap({ executableRuntime }) {
      capturedBootstrapRuntime = executableRuntime;
      return expectedMount;
    },
    createRouter(options) {
      capturedRouterOptions = options;
      return 'router';
    },
  });
  assert.equal(returned, 'router');
  assert.strictEqual(capturedBootstrapRuntime, exact.options);
  assert.deepEqual(capturedRouterOptions.corsOrigins, ['https://reversr.vercel.app']);
  assert.strictEqual(capturedRouterOptions.liveOpeningRuntimeMount, expectedMount);
  assert.equal(typeof capturedRouterOptions.sessionService.lookupSession, 'function');
});

test('server source mounts helper before body parser without env-driven activation', () => {
  const index = read('server/index.js').toString();
  const helper = read('server/cadProductionExecutableRuntimeMountCompletion.js').toString();
  const route = read('server/cadUserUploadRouter.js').toString();
  assert.match(index, /createCadProductionExecutableRuntimeMount/);
  assert.ok(index.indexOf("app.use('/api/cad', createCadProductionExecutableRuntimeMount") <
    index.indexOf("app.use(express.json"));
  assert.doesNotMatch(index, /commandCardBytes|commandCardSha256|currentDeploymentReference/);
  assert.match(helper, /createCadLiveOpeningExecutableRuntimeBootstrap/);
  assert.match(helper, /createCadUserUploadRouter/);
  assert.match(helper, /executableRuntime/);
  assert.match(helper, /liveOpeningRuntimeMount/);
  assert.doesNotMatch(helper, /process\.env|node:fs|child_process|fetch\s*\(|https?\.request|\.listen\s*\(/);
  assert.match(route, /const BODY_ADMISSION_AUTHORIZED = false;/);
  assert.ok(route.indexOf('decision = await admissionSwitch.decide') < route.indexOf('bodyGateDecision = routeBodyGate'));
  assert.ok(route.indexOf('bodyGateDecision = routeBodyGate') < route.indexOf('validateRequestBody(req)'));
});

test('next live approval phrase is complete except post-merge values this gate cannot know', () => {
  const phrase = exactLiveOpeningApprovalPhrase();
  assert.match(phrase, /one bounded internal production upload-admission opening/);
  assert.match(phrase, new RegExp(BOOTSTRAP_BINDING_REPAIR_PACKET_SHA256));
  assert.match(phrase, new RegExp(PREVIOUS_EXECUTABLE_COMMAND_CARD_REBIND_PACKET_SHA256));
  assert.match(phrase, new RegExp(PREVIOUS_DIGEST_REFRESH_SHA256));
  assert.match(phrase, new RegExp(BOUNDED_SESSION_REF));
  assert.match(phrase, new RegExp(INTERNAL_COHORT_REF));
  for (const unresolved of runtimeMountCompletionPreparation().nextGate.unresolvedFields) {
    assert.match(phrase, new RegExp(`<${unresolved}>`));
  }
  assert.equal(runtimeMountCompletionPreparation().nextGate.requiresFreshPostMergeProductionDeploymentRebind, true);
  assert.equal(runtimeMountCompletionPreparation().nextGate.requiresFreshExecutableCommandCardSha256, true);
  assert.equal(runtimeMountCompletionPreparation().nextGate.requiresExactBoundedSessionBinding, true);
});

test('every leaf is immutable and sanitized failure stays closed', () => {
  const original = runtimeMountCompletionPreparation();
  function visit(value, trail = []) {
    for (const [key, item] of Object.entries(value)) {
      const next = [...trail, key];
      if (item && typeof item === 'object') visit(item, next);
      else {
        const changed = structuredClone(original);
        let target = changed;
        for (const parent of trail) target = target[parent];
        target[key] = item === true ? false : item === false ? true : 'PRIVATE_SENTINEL';
        const result = checkRuntimeMountCompletionPreparation(changed);
        assert.equal(result.ok, false, next.join('.'));
        closed(result);
        delete target[key];
        assert.equal(checkRuntimeMountCompletionPreparation(changed).ok, false, next.join('.'));
      }
    }
  }
  visit(original);
});

test('source drift, missing files and hostile inputs fail closed', () => {
  const p = packet();
  for (const source of SOURCES) {
    for (const missing of [false, true]) {
      const result = checkPacket(p, { readSource(file) {
        if (file !== source) return read(file);
        if (missing) throw Error('PRIVATE_SENTINEL');
        return Buffer.concat([read(file), Buffer.from('\n')]);
      } });
      assert.equal(result.ok, false, source);
      closed(result);
    }
  }
  let calls = 0;
  const hook = () => { calls += 1; throw Error('PRIVATE_SENTINEL'); };
  const accessor = {};
  Object.defineProperty(accessor, 'preparation', { enumerable: true, get: hook });
  const proxy = new Proxy({}, { get: hook, ownKeys: hook, getPrototypeOf: hook });
  const cycle = {};
  cycle.self = cycle;
  for (const input of [null, undefined, [], 'PRIVATE_SENTINEL', accessor, proxy, cycle, { toJSON: hook }]) {
    const result = checkPacket(input, { readSource: hook });
    assert.equal(result.ok, false);
    closed(result);
  }
  assert.equal(calls, 0);
});

test('checker refuses live execution, command-card issuance and arbitrary paths', () => {
  for (const args of [['--execute'], ['--live'], ['--activate'], ['--issue-command-card'],
    ['--approval', 'PRIVATE_SENTINEL'], ['PRIVATE_SENTINEL'], ['--write', 'PRIVATE_SENTINEL']]) {
    const run = spawnSync(process.execPath, [
      'scripts/cad-auth-prod-runtime-mount-completion-checker.js',
      ...args,
    ], { cwd: root, encoding: 'utf8' });
    assert.equal(run.status, 1);
    assert.doesNotMatch(run.stdout + run.stderr, /PRIVATE_SENTINEL|\/Users\//);
    closed(JSON.parse(run.stdout));
  }
});
