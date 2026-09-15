const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const crypto = require('node:crypto');

const packet = JSON.parse(fs.readFileSync('docs/cad-dev-auth-reviewed-source-gate.json', 'utf8'));
const envPacket = JSON.parse(fs.readFileSync('docs/cad-dev-env-custody-rollback-receipts.json', 'utf8'));
const binding = JSON.parse(fs.readFileSync('docs/cad-dev-exact-deploy-rollback-window-binding.json', 'utf8'));
const markdown = fs.readFileSync('docs/cad-dev-auth-reviewed-source-gate.md', 'utf8');
const developmentAuthSource = fs.readFileSync('convex/developmentAuth.ts', 'utf8');

const sha256 = value => crypto.createHash('sha256').update(value).digest('hex');
const fileDigest = file => sha256(fs.readFileSync(file));

function loadDevelopmentAuthForTest() {
  const js = developmentAuthSource
    .replace(/^import .*$/gm, '')
    .replace(/export /g, '')
    .replace(/ as const/g, '')
    .replace(/const fail = \(\): never =>/g, 'const fail = () =>')
    .replace(/developmentAuthReviewed: boolean/g, 'developmentAuthReviewed')
    .replace(/developmentConfiguration\(env: Record<string, string \| undefined>\)/g, 'developmentConfiguration(env)')
    .replace(/developmentPasswordCohort\(\): readonly string\[\]/g, 'developmentPasswordCohort()')
    .replace(/developmentPassword\(cohort: readonly string\[\]\)/g, 'developmentPassword(cohort)')
    .replace(/const policy: PasswordConfig<DataModel> =/g, 'const policy =')
    .replace(/developmentRedirect\(\{ redirectTo \}: \{ redirectTo: string \}\)/g, 'developmentRedirect({ redirectTo })');
  return Function('Password', `${js}
return { developmentAuthReviewed, developmentOrigin, developmentIssuer,
  developmentCohort, developmentConfiguration, developmentPasswordCohort,
  developmentPassword, developmentRedirect };`)(policy => ({ provider: 'password', policy }));
}

test('packet records a source-only reviewed auth gate with current inputs', () => {
  assert.equal(packet.mode, 'source-only-cad-development-auth-reviewed-source-gate');
  assert.equal(packet.status, 'REVIEWED_SOURCE_GATE_ENABLED_NO_DEPLOYMENT');
  assert.equal(packet.sourceOnly, true);
  assert.equal(packet.production, false);
  assert.equal(packet.baseMainCommit, '389cadad0fee8a1abe8c334933a956f9845129cb');
  assert.equal(packet.target.repo, 'vsillah/ReversR-Rebuild');
  assert.equal(packet.target.deploymentName, 'majestic-alligator-31');
  assert.equal(packet.reviewedSourceGate.developmentAuthReviewed, true);
});

test('source input digests match tracked files before this source change', () => {
  for (const [name, input] of Object.entries(packet.sourceInputs)) {
    if (name === 'priorDevelopmentAuthSource') {
      assert.equal(input.sha256, '652a79381b45a1454e91eee662d147bc521a375eb6251642b1d0029a0428a322');
      continue;
    }
    assert.equal(input.sha256, fileDigest(input.path), input.path);
  }
});

test('development Auth source gate is enabled and cohort is exactly two synthetic users', () => {
  assert.match(developmentAuthSource, /developmentAuthReviewed: boolean = true/);
  const auth = loadDevelopmentAuthForTest();
  assert.equal(auth.developmentAuthReviewed, true);
  assert.equal(auth.developmentOrigin, 'http://localhost:5001');
  assert.equal(auth.developmentIssuer, 'https://majestic-alligator-31.convex.site');
  assert.deepEqual(auth.developmentPasswordCohort(), [
    'cad-test-alpha-20260915@auth-test.invalid',
    'cad-test-beta-20260915@auth-test.invalid',
  ]);
});

test('development configuration requires exact reviewed development env row values', () => {
  const auth = loadDevelopmentAuthForTest();
  const env = {
    CONVEX_SITE_URL: 'https://majestic-alligator-31.convex.site',
    SITE_URL: 'http://localhost:5001',
    JWT_PRIVATE_KEY: 'value-present-not-recorded',
    JWKS: 'value-present-not-recorded',
  };
  assert.deepEqual(auth.developmentConfiguration(env), {
    origin: 'http://localhost:5001',
    issuer: 'https://majestic-alligator-31.convex.site',
  });
  assert.throws(() => auth.developmentConfiguration({ ...env, SITE_URL: 'https://reversr.vercel.app' }), /AUTH_UNAVAILABLE/);
  assert.throws(() => auth.developmentConfiguration({ ...env, JWKS: '' }), /AUTH_UNAVAILABLE/);
});

test('password provider is sign-in only for the reviewed synthetic cohort', () => {
  const auth = loadDevelopmentAuthForTest();
  const provider = auth.developmentPassword(auth.developmentPasswordCohort());
  assert.equal(provider.provider, 'password');
  assert.deepEqual(provider.policy.profile({
    flow: 'signIn',
    email: 'cad-test-alpha-20260915@auth-test.invalid',
    password: 'synthetic-password-only',
  }), { email: 'cad-test-alpha-20260915@auth-test.invalid' });
  assert.throws(() => provider.policy.profile({
    flow: 'signUp',
    email: 'cad-test-alpha-20260915@auth-test.invalid',
    password: 'synthetic-password-only',
  }), /AUTH_UNAVAILABLE/);
  assert.throws(() => provider.policy.profile({
    flow: 'signIn',
    email: 'mark@example.com',
    password: 'synthetic-password-only',
  }), /AUTH_UNAVAILABLE/);
  assert.throws(() => provider.policy.profile({
    flow: 'signIn',
    email: 'cad-test-beta-20260915@auth-test.invalid',
    password: 'synthetic-password-only',
    name: 'not allowed',
  }), /AUTH_UNAVAILABLE/);
  assert.throws(() => provider.policy.validatePasswordRequirements(), /AUTH_UNAVAILABLE/);
});

test('redirect and safety boundaries stay fail closed', () => {
  const auth = loadDevelopmentAuthForTest();
  assert.equal(auth.developmentRedirect({ redirectTo: '/' }), 'http://localhost:5001/');
  assert.equal(auth.developmentRedirect({ redirectTo: 'http://localhost:5001/' }), 'http://localhost:5001/');
  assert.throws(() => auth.developmentRedirect({ redirectTo: 'http://localhost:5001/?x=1' }), /AUTH_UNAVAILABLE/);
  assert.throws(() => auth.developmentRedirect({ redirectTo: 'https://reversr.vercel.app/' }), /AUTH_UNAVAILABLE/);
});

test('command binding must be refreshed after the source-gate merge', () => {
  assert.equal(packet.commandBindingEffect.priorDeployCommandDigest, binding.exactCommandBinding.deployCommand.sha256);
  assert.equal(packet.commandBindingEffect.priorDisabledRollbackCommandDigest, binding.exactCommandBinding.disabledRollbackCommand.sha256);
  assert.equal(packet.commandBindingEffect.exactDeployCommandMustBeReboundAfterMerge, true);
  assert.equal(packet.commandBindingEffect.deploymentAuthorityNow, false);
  assert.equal(packet.commandBindingEffect.rollbackAuthorityNow, false);
  assert.equal(packet.remainingGates[0].id, 'D-REVIEWED-SOURCE-DEPLOY-BINDING');
  assert.equal(packet.nextSafeAction.branch, 'codex/cad-dev-reviewed-source-deploy-binding');
});

test('custody carries forward and all sensitive authority remains false', () => {
  assert.equal(packet.custody.backupCustodian, 'Amina');
  assert.equal(packet.custody.markRole, 'tester-reviewer');
  assert.equal(packet.custody.markIsCustodian, false);
  assert.equal(envPacket.custodyProjection.backupCustodian, packet.custody.backupCustodian);
  for (const [key, value] of Object.entries(packet.authorityPreserved)) {
    assert.equal(value, false, `${key} must remain false`);
  }
  for (const [key, value] of Object.entries(packet.safetyProperties)) {
    if (key.endsWith('RemainDisabled') || key.endsWith('Rejected') || key === 'cadUploadsRemainDisabled'
      || key === 'cadConversionRemainDisabled') continue;
    assert.equal(value, false, `${key} must remain false`);
  }
});

test('markdown remains source-safe and does not overclaim readiness', () => {
  assert.match(markdown, /source-only/);
  assert.match(markdown, /Amina/);
  assert.match(markdown, /must rebind exact development deploy and/);
  assert.doesNotMatch(markdown, /BEGIN PRIVATE KEY/);
  assert.doesNotMatch(markdown, /\/Users\//);
  assert.doesNotMatch(markdown, /production CAD ready/i);
  assert.doesNotMatch(markdown, /private CAD approved/i);
});
