// Offline contract and pure payload checks. No provider, credentials or conversion.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const packet = require('../offline/cad-convex/userUploadActivationReadiness.json');
const { LIMITS, upload } = require('../server/cadWorkerContract');
const { SANDBOX_LIMITS } = require('../server/cadSandboxConfig');
const root = path.resolve(__dirname, '..');

test('readiness evidence is unresolved and every separate approval gate is closed', () => {
  assert.equal(packet.mode, 'source-only-activation-readiness');
  for (const flag of ['enabled', 'liveReady', 'executable']) assert.equal(packet[flag], false);
  assert.deepEqual(Object.keys(packet.gates).sort(), [
    'publication', 'exactSessionAuthority', 'uploadPermission', 'payloadAdmission',
    'sharedControls', 'sandboxDispatch', 'providerReadiness', 'rollback', 'activation',
  ].sort());
  for (const gate of Object.values(packet.gates)) {
    assert.equal(gate.approved, false);
    assert.ok(Object.keys(gate.evidence).length >= 3);
    assert.ok(Object.values(gate.evidence).every(value => value === null));
  }
  assert.ok(Object.values(packet.authority).every(value => value === null));
  assert.equal(packet.proposedBounds.allInCostCapUsd, null);
  assert.equal(packet.currentTerminalCode, 'USER_UPLOADS_DISABLED');
});

test('proposed admission and Sandbox bounds cannot silently drift from worker limits', () => {
  const b = packet.proposedBounds;
  assert.equal(b.jsonBytes, LIMITS.jsonBytes);
  assert.equal(b.decodedBytes, LIMITS.inputBytes);
  assert.equal(b.encodedCharacters, Math.ceil(LIMITS.inputBytes / 3) * 4);
  for (const key of ['vcpus', 'memoryMb', 'lifetimeMs', 'requestMs', 'commandMs', 'cleanupMs'])
    assert.equal(b.sandbox[key], SANDBOX_LIMITS[key]);
  for (const key of ['outputBytes', 'meshes', 'vertices', 'triangles'])
    assert.equal(b.sandbox[key], LIMITS[key]);
  assert.equal(b.sandbox.network, 'deny-all');
});

// A deliberately minimal ASCII shape exercises the pure input validator only.
// Passing it is not geometry qualification or a successful conversion.
const row = (section, body = '') => body.padEnd(72, ' ') + section + '      1';
const content = directory => ['S', 'G'].map(s => row(s)).concat([
  row('D', String(directory).padStart(8, ' ')), row('D'), row('P'), row('T'),
]).join('\n');
const body = (text = content(110)) => ({ fileName: 'fixture.igs', contentBase64: Buffer.from(text, 'ascii').toString('base64') });

test('pure IGES payload checks reject unsafe names, unknown fields and external references', () => {
  assert.ok(upload(body()).bytes.length > 0);
  for (const fileName of ['../fixture.igs', '/fixture.igs', 'a\\fixture.igs', 'a\u0000.igs', 'x'.repeat(121) + '.igs'])
    assert.throws(() => upload({ ...body(), fileName }), { code: 'MALFORMED' });
  assert.throws(() => upload({ ...body(), fileName: 'fixture.step' }), { code: 'UNSUPPORTED' });
  assert.throws(() => upload({ ...body(), mimeType: 'model/iges' }), { code: 'MALFORMED' });
  assert.throws(() => upload(body(content(416))), { code: 'UNSUPPORTED' });
  assert.throws(() => upload(body('invalid IGES shape')), { code: 'MALFORMED' });
});

test('canonical base64, encoded and decoded limits fail before any conversion', () => {
  for (const value of ['%%%%', 'Zg=', 'Zh==', 'Zg==\n', ''])
    assert.throws(() => upload({ ...body(), contentBase64: value }));
  assert.throws(() => upload({ ...body(), contentBase64: 'A'.repeat(packet.proposedBounds.encodedCharacters + 4) }), { code: 'TOO_LARGE' });
  assert.throws(() => upload({ ...body(), contentBase64: Buffer.alloc(LIMITS.inputBytes + 1, 65).toString('base64') }), { code: 'TOO_LARGE' });
});

test('readiness packet stays isolated from runtime and current route stays terminal', () => {
  for (const directory of ['server', 'app', 'hooks', 'components', 'convex']) {
    const visit = dir => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const name = path.join(dir, entry.name);
        if (entry.isDirectory()) visit(name);
        else if (/\.[cm]?[jt]sx?$/.test(name)) assert.doesNotMatch(fs.readFileSync(name, 'utf8'), /userUploadActivationReadiness/);
      }
    };
    visit(path.join(root, directory));
  }
  const source = fs.readFileSync(path.join(root, 'server/cadUserUploadRouter.js'), 'utf8');
  assert.match(source, /return send\(res, 'USER_UPLOADS_DISABLED'\);/);
  assert.doesNotMatch(source, /process\.env|express\.json|express\.raw|require\(['"].*cadSandboxExecutor/);
});
