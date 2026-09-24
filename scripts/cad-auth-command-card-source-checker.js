// Source-only command-card preparation checker. It never emits or runs a live command.
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { isDeepStrictEqual } = require('node:util');
const { PACKET: COLLECTOR_BINDING, checkBinding }
  = require('./cad-auth-live-collector-binding-checker');
const { MERGE_COMMIT, disabledPreparation, checkDisabledPreparation, plainData }
  = require('../offline/cad-auth-command-card-source/preparation');

const ROOT = path.resolve(__dirname, '..');
const PACKET = 'docs/cad-auth-command-card-source.json';
const SOURCES = Object.freeze([
  COLLECTOR_BINDING,
  'docs/cad-auth-command-card-source.md',
  'offline/cad-auth-command-card-source/preparation.js',
  'scripts/cad-auth-command-card-source-checker.js',
  'scripts/cad-auth-command-card-source.test.js',
  'docs/cad-auth-live-collector-binding.md',
  'offline/cad-auth-live-collector-binding/guardedCollector.js',
  'docs/cad-auth-sealed-setup-stop-runbook.md',
]);
const read = file => fs.readFileSync(path.join(ROOT, file));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');

function expectedPacket(readSource = read) {
  const parent = JSON.parse(readSource(COLLECTOR_BINDING));
  if (!checkBinding(parent, { readSource }).ok) throw Error('INVALID_COLLECTOR_BINDING_PARENT');
  const preparation = disabledPreparation();
  if (!checkDisabledPreparation(preparation).ok) throw Error('INVALID_DISABLED_PREPARATION');
  return {
    schemaVersion: 1,
    packet: 'cad-auth-command-card-source-v1',
    sourceOnly: true,
    status: 'DISABLED_COMMAND_CARD_RECEIPT_STRUCTURE_BOUND_EXECUTION_BLOCKED',
    parent: {
      packet: parent.packet,
      mergeCommit: MERGE_COMMIT,
      sha256: sha(readSource(COLLECTOR_BINDING)),
      consumedStopCode: parent.approval.consumedStopCode,
      priorApprovalReusable: false,
    },
    preparation,
    disabledCommandCardSource: {
      source: 'offline/cad-auth-command-card-source/preparation.js',
      checker: 'scripts/cad-auth-command-card-source-checker.js',
      commandLine: null,
      dryRunCommandLine: null,
      executableCommandCardIssued: false,
      liveCollectionAuthorized: false,
      runtimeActivationAuthorized: false,
      uploadSessionIssuanceEnabled: false,
      bodyAdmissionAuthorized: false,
      retryOrSecondRunAuthorized: false,
    },
    futureSealingGate: {
      status: 'RECEIPTS_AND_EXECUTABLE_CARD_STILL_REQUIRED',
      exactApprovalPhraseReady: false,
      reason: 'The executable command-card phrase cannot be exact until receipt refs and digests are reviewed.',
      template: 'Approve one read-only synthetic CAD Auth evidence collection for acceptance packet cad-auth-live-evidence-acceptance-v1, reviewed packet SHA-256 [reviewed packet], sealed card SHA-256 [sealed card], command-card packet SHA-256 [command card packet], receipt bundle SHA-256 [receipt bundle], candidate [commit], immutable deployment [deployment], restricted cohort [cohort], custodian [custodian], independent reviewer [reviewer], during [UTC start] through [UTC expiry]. Only the sealed observations and ceilings are authorized. No setup changes, upload sessions, request-body reads, activation, retries or second run.',
      nextSourceOnlyWork: {
        restrictedReceiptBundle: 'produce restricted receipt bundle structure outside public source values',
        providerRuntimeAdapter: 'bind concrete provider runtime adapter receipt without secret values',
        routeBodyObserver: 'bind installed route/body observer receipt before any upload body read',
        consumedRunLedger: 'bind durable consumed-run ledger and late-grant observer receipts',
        immutableTarget: 'bind immutable target recheck receipt for a fresh deployment',
      },
    },
    sourceBindings: Object.fromEntries(SOURCES.map(file => [file, sha(readSource(file))])),
  };
}

function checkPreparation(packet, { readSource = read } = {}) {
  let ok = false;
  try { ok = plainData(packet) && isDeepStrictEqual(packet, expectedPacket(readSource)); } catch { /* sanitized */ }
  return {
    ok,
    sourceBindingValid: ok,
    executable: false,
    liveCollectorCommandLine: null,
    liveCollectionAuthorized: false,
    runtimeActivationAuthorized: false,
    bodyAdmissionAuthorized: false,
    uploadSessionIssuanceEnabled: false,
    problems: ok ? [] : ['INVALID_SOURCE_ONLY_COMMAND_CARD_PACKET'],
  };
}

if (require.main === module) {
  try {
    if (process.argv.length > 3 || process.argv[2] && process.argv[2] !== '--write') throw Error('INVALID_ARGUMENT');
    if (process.argv[2] === '--write') fs.writeFileSync(path.join(ROOT, PACKET), JSON.stringify(expectedPacket(), null, 2) + '\n');
    const result = checkPreparation(JSON.parse(read(PACKET)));
    console.log(JSON.stringify(result, null, 2));
    process.exitCode = result.ok ? 0 : 1;
  } catch {
    console.log(JSON.stringify({
      ok: false,
      executable: false,
      liveCollectionAuthorized: false,
      liveCollectorCommandLine: null,
      code: 'COMMAND_CARD_SOURCE_BLOCKED',
    }));
    process.exitCode = 1;
  }
}

module.exports = { PACKET, SOURCES, expectedPacket, checkPreparation };
