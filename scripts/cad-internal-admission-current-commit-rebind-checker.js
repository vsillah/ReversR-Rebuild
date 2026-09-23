// Offline evidence review only. No network, runtime invocation or activation.
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const PACKET = 'docs/cad-internal-admission-current-commit-rebind.json';
const ROOT = path.resolve(__dirname, '..');
const REQUIRED_SOURCES = [
  'docs/cad-internal-admission-candidate-opening-bundle.json',
  'docs/cad-internal-admission-exact-opening-decision-packet.json',
  'docs/cad-production-upload-activation-scope.json',
  'docs/cad-gateway-exact-session-bridge.json',
  'offline/cad-convex/userUploadActivationReadiness.json',
  'server/cadExactSessionBridge.js',
  'server/cadUploadSessionGatewayService.js',
  'server/uploadSessionStore.js',
  'server/cadUserUploadRouter.js',
];
const FORBIDDEN = ['merge', 'deployment', 'productionSmoke', 'uploadSessionIssuance',
  'requestBodyRead', 'productionUploadActivation', 'conversionDispatch', 'sandboxDispatch',
  'providerEnvResourceBillingChanges', 'secrets', 'privateCad', 'realUsers',
  'externalMessages', 'secondRunOrRetry', 'commercialReadinessClaim'];

function checkRebind(packet, { expectedCommit, root = ROOT } = {}) {
  const problems = [];
  const requireValue = (ok, label) => { if (!ok) problems.push(label); };
  const read = file => fs.readFileSync(path.join(root, file));
  requireValue(/^[a-f0-9]{40}$/.test(expectedCommit || ''), 'explicit full expected merge commit required');
  requireValue(packet.schemaVersion === 1 && packet.sourceOnly === true && packet.runtimeRouteChanged === false,
    'source-only schema required');
  requireValue(packet.baseCommit === expectedCommit, 'stale opening base commit');
  const opening = packet.effectiveOpeningEvidence || {};
  const smoke = packet.productionFailClosedSmoke || {};
  requireValue(opening.exactRuntimeCommit === expectedCommit, 'stale exact opening commit');
  requireValue(opening.bridgeIncludedInMerge === expectedCommit, 'stale bridge merge binding');
  requireValue(opening.bridgePacket === REQUIRED_SOURCES[3], 'exact-session bridge packet required');
  requireValue(opening.route === 'POST /api/cad/user-import' && opening.productionUrl === 'https://reversr.vercel.app', 'exact route binding required');
  requireValue(smoke.commit === expectedCommit && smoke.cacheBuster === `qa=${expectedCommit?.slice(0, 7)}`, 'stale smoke commit/cache buster');
  requireValue(smoke.canonicalTarget === opening.productionUrl && smoke.deploymentState === 'success'
    && /^\d+$/.test(smoke.deploymentId || '') && Number.isFinite(Date.parse(smoke.deploymentUpdatedAtUtc))
    && /^https:\/\/reversr-[a-z0-9-]+\.vercel\.app$/.test(smoke.deploymentUrl || '')
    && smoke.sourceTask === '019eb769-b20d-7cb0-9602-f588a7fcb78c'
    && smoke.source === 'captain-supplied sanitized PR #380 receipt; not rerun by this lane', 'sanitized deployment and captain provenance required');
  for (const [route, status, code] of [
    ['GET /', 200], ['GET /api/cad/capabilities', 200],
    ['POST /api/cad/user-import {}', 401, 'USER_SESSION_REQUIRED'],
    ['POST /api/cad/import {}', 401, 'UNAUTHORIZED'], ['GET /api/cad/import-source-record', 404],
  ]) requireValue(smoke.results?.filter(item => item.route === route && item.status === status && item.code === code).length === 1,
    `missing fail-closed smoke result: ${route}`);
  for (const key of ['productionIssuerBound', 'humanQaAcceptedForRebind', 'activationApprovalAccepted', 'historicalWindowReusable'])
    requireValue(opening[key] === false, `${key} must remain false`);
  requireValue(opening.startsAtUtc === null && opening.expiresAtUtc === null && opening.freshWindowRequired === true,
    'fresh unapproved window required; historical window cannot be reused');
  for (const key of FORBIDDEN) requireValue(packet.authorizes?.[key] === false, `${key} must remain unauthorized`);
  for (const file of REQUIRED_SOURCES) {
    try {
      requireValue(packet.sourceBindings?.[file]?.sha256 === createHash('sha256').update(read(file)).digest('hex'), `stale source digest: ${file}`);
    } catch { problems.push(`missing source: ${file}`); }
  }
  try {
    const readiness = JSON.parse(read(REQUIRED_SOURCES[4]));
    requireValue(['enabled', 'liveReady', 'executable'].every(key => readiness[key] === false)
      && Object.values(readiness.gates).every(gate => gate.approved === false)
      && Object.values(readiness.authority).every(value => value === null), 'readiness must remain disabled and unapproved');
    const bridge = JSON.parse(read(REQUIRED_SOURCES[3]));
    requireValue(bridge.sourceOnly === true && bridge.runtimeBehavior.productionIssuerBoundByThisGate === false
      && bridge.runtimeBehavior.defaultGatewayIssuanceEnabled === false
      && bridge.runtimeBehavior.requestBodyAdmissionEnabled === false, 'bridge must remain source-only and closed');
    requireValue(/const BODY_ADMISSION_AUTHORIZED = false;/.test(read(REQUIRED_SOURCES[8]).toString()), 'body admission must remain disabled');
  } catch { problems.push('required readiness/bridge/route evidence unavailable'); }
  return { ok: problems.length === 0, sourceReviewCurrent: problems.length === 0,
    readyForSeparateActivationApproval: false, routeMayOpenNow: false,
    terminalCodeUntilSeparateApproval: 'USER_UPLOADS_DISABLED', problems };
}
if (require.main === module) {
  const result = checkRebind(JSON.parse(fs.readFileSync(path.join(ROOT, PACKET))), { expectedCommit: process.argv[2] });
  console.log(JSON.stringify(result, null, 2));
  process.exitCode = result.ok ? 0 : 1;
}
module.exports = { checkRebind, PACKET, REQUIRED_SOURCES };
