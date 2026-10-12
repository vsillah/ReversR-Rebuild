const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const read = relativePath => fs.readFileSync(path.join(root, relativePath), 'utf8');
const exists = relativePath => fs.existsSync(path.join(root, relativePath));

const canonicalFiles = [
  'commercial-backend/convex/cadAuthenticatedIgs.ts',
  'commercial-backend/convex/cadAuthenticatedIgsGateway.ts',
  'server/cadAuthenticatedIgsRouter.js',
  'server/cadAuthenticatedIgsSessionVerifier.js',
  'server/cadAuthenticatedIgsSandboxExecutor.js',
  'server/cadR2PrivateArtifactCustody.js',
  'server/cadR2S3Provider.js',
  'utils/cadAuthenticatedIgsBrowser.ts',
];

const removedParallelFiles = [
  'commercial-backend/convex/cadImports.ts',
  'commercial-backend/tests/cad-product-import.test.ts',
  'server/cadProductConvexStore.js',
  'server/cadProductImportPipeline.js',
  'server/cadProductImportRouter.js',
  'server/cadProductPrivateCustody.js',
  'server/cadProductWorkerContract.js',
  'server/cadR2Provider.js',
  'utils/cadProductIgesAdmission.js',
  'utils/cadProductIgesAdmission.d.ts',
  'utils/cadProductImport.ts',
  'scripts/cad-product-import.integration.test.js',
];

test('one authenticated IGS route and durable authority family remains', () => {
  for (const relativePath of canonicalFiles) {
    assert.equal(exists(relativePath), true, `missing canonical authority ${relativePath}`);
  }
  for (const relativePath of removedParallelFiles) {
    assert.equal(exists(relativePath), false, `parallel authority returned at ${relativePath}`);
  }

  const schema = read('commercial-backend/convex/schema.ts');
  const tableNames = [...schema.matchAll(/^\s{2}(cad[A-Za-z0-9]+): defineTable/gm)]
    .map(match => match[1]);
  assert.deepEqual(tableNames.filter(name => name.startsWith('cadAuthenticatedIgs')), [
    'cadAuthenticatedIgsJobs',
    'cadAuthenticatedIgsArtifacts',
    'cadAuthenticatedIgsGrants',
    'cadAuthenticatedIgsQuota',
  ]);
  assert.doesNotMatch(schema, /cadProduct|cadImports|cadImportQuota/);

  const convexHttp = read('commercial-backend/convex/http.ts');
  assert.match(convexHttp, /CAD_AUTHENTICATED_IGS_GATEWAY_PATH/);
  assert.equal((convexHttp.match(/CAD_AUTHENTICATED_IGS_GATEWAY_PATH/g) || []).length, 2);
  assert.doesNotMatch(convexHttp, /cadProduct|product-import/i);

  const mountedRouter = read('server/cadSandboxRouter.js');
  assert.match(mountedRouter, /createCadAuthenticatedIgsRouter/);
  assert.doesNotMatch(mountedRouter, /cadProductImport|product-import/i);

  const router = read('server/cadAuthenticatedIgsRouter.js');
  assert.doesNotMatch(router, /cadProductImport|product-import/i);
  const directRoutes = [...router.matchAll(/router\.(?:get|post|delete|all)\((?:\[\s*)?['"](\/[^'"]+)/g)]
    .map(match => match[1]);
  assert.ok(directRoutes.length >= 6, 'expected authenticated upload, job, grant, artifact and delete routes');
  assert.equal(directRoutes.every(route => route.startsWith('/authenticated-')), true);
});

test('the current workspace UI delegates private files to the canonical browser client', () => {
  const workflow = read('components/CadWorkflow.tsx');
  assert.match(workflow, /createCadAuthenticatedIgsBrowserClient/);
  assert.match(workflow, /onAuthenticatedFile=\{authenticatedLiveClient/);
  assert.match(workflow, /authenticatedLiveClient\.upload\(file\)/);
  assert.match(workflow, /authenticatedLiveClient\.download/);
  assert.match(workflow, /authenticatedLiveClient\.delete/);
  assert.doesNotMatch(workflow, /cadProductImport|product-import/i);

  const importPanel = read('components/PublicIgsImportPanel.tsx');
  assert.match(importPanel, /validateAuthenticatedIgsFile/);
  assert.match(importPanel, /onAuthenticatedFile\?: \(file: File\)/);
  assert.match(importPanel, /await onAuthenticatedFile\(file\)/);
  assert.doesNotMatch(importPanel, /authenticated-(?:upload-session|import|artifacts)/);
  assert.doesNotMatch(importPanel, /cadProductImport|product-import/i);

  const browser = read('utils/cadAuthenticatedIgsBrowser.ts');
  for (const endpoint of [
    '/api/cad/authenticated-upload-session',
    '/api/cad/authenticated-import',
  ]) assert.match(browser, new RegExp(endpoint.replaceAll('/', '\\/')));
  assert.match(browser, /issued\.grant\.url/);
  assert.match(browser, /'X-ReversR-Download-Grant'/);
  assert.match(browser, /credentials: 'include'/);
  assert.match(browser, /'X-Upload-CSRF'/);
  assert.doesNotMatch(browser, /cadProductImport|product-import/i);
});

test('cookie auth, one-shot conversion, owner scope, and confirmed deletion stay fail closed', () => {
  const sessionVerifier = read('server/cadAuthenticatedIgsSessionVerifier.js');
  assert.match(sessionVerifier, /cookies\.length !== 1 \|\| headers\.authorization !== undefined/);
  assert.match(sessionVerifier, /record\.transport !== 'cookie'/);
  assert.match(sessionVerifier, /timingSafeEqual\(Buffer\.from\(digest\(credential\.csrf\)/);

  const authority = read('commercial-backend/convex/cadAuthenticatedIgs.ts');
  assert.match(authority, /job\.attemptCount !== 0/);
  assert.match(authority, /attemptCount: 1/);
  assert.match(authority, /job\.attemptCount !== 1/);
  assert.match(authority, /sameOwner\(job, owner\)/);
  assert.match(authority, /grant\.uploadSessionId !== owner\.uploadSessionId/);
  assert.match(authority, /grant\.consumedAt !== undefined/);
  assert.match(authority, /consumedAt: now/);
  assert.match(authority, /revokedAt: now/);

  const provider = read('server/cadR2S3Provider.js');
  assert.match(provider, /maxAttempts: 1/);
  const executor = read('server/cadAuthenticatedIgsSandboxExecutor.js');
  assert.match(executor, /networkPolicy: 'deny-all'/);
  assert.doesNotMatch(executor, /\b(?:retry|retries)\b/i);

  const custody = read('server/cadR2PrivateArtifactCustody.js');
  const deletion = custody.slice(custody.indexOf('async deleteArtifact'));
  assert.ok(deletion.indexOf('provider.deleteExact') < deletion.indexOf('provider.headExact'));
  assert.ok(deletion.indexOf('provider.headExact') < deletion.indexOf('store.confirmDeleted'));
  assert.match(deletion, /if \(remaining !== null\) throw new Error\('DELETE_UNCONFIRMED'\)/);

  const router = read('server/cadAuthenticatedIgsRouter.js');
  const deleteRoute = router.slice(router.indexOf("router.delete('/authenticated-import/:jobId'"));
  assert.ok(deleteRoute.indexOf('custody.deleteArtifact') < deleteRoute.indexOf('runtime.job.deleted'));
});

test('the consolidation record preserves source-only evidence boundaries', () => {
  const record = read('docs/cad-authenticated-igs-authority-consolidation.md');
  assert.match(record, /d15468230d46e9dd4e32d9057373e31880b82cb2/);
  assert.match(record, /sole runtime authority/i);
  assert.match(record, /cadProductImport/);
  assert.match(record, /source-only/i);
  assert.match(record, /does not prove live private CAD conversion/i);
  assert.match(record, /production remains disabled/i);
});
