// Checks sanitized candidate discovery only. Never opens private receipt/register refs.
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { isDeepStrictEqual } = require('node:util');
const { plainData } = require('../offline/cad-auth-command-card-source/preparation');
const { REQUIRED_LIVE_BINDINGS } = require('../offline/cad-auth-live-collector-binding/guardedCollector');
const { PACKET: SOURCE_INTAKE_FILE, checkIntake } =
  require('./cad-auth-restricted-source-intake-checker');
const {
  SOURCE_INTAKE_PACKET,
  candidateDiscoveryDisposition,
  checkCandidateDiscoveryDisposition,
} = require('../offline/cad-auth-restricted-candidate-discovery/preparation');

const ROOT = path.resolve(__dirname, '..');
const PACKET = 'docs/cad-auth-restricted-candidate-discovery.json';
const SOURCES = Object.freeze([
  SOURCE_INTAKE_FILE,
  'docs/cad-auth-restricted-candidate-discovery.md',
  'offline/cad-auth-restricted-candidate-discovery/preparation.js',
  'scripts/cad-auth-restricted-candidate-discovery-checker.js',
  'scripts/cad-auth-restricted-candidate-discovery.test.js',
]);

const EXPECTED_PARTIAL_COVERAGE = Object.freeze({
  'rrb-local:cad-auth-candidate-discovery-019': 'f301f6d513e40468653eb0c0e3e0814bdceb119ebd91be13a5e9eaadf4c7e09e',
  'rrb-local:cad-auth-candidate-discovery-027': 'ac05a8b41592a5cb4b467c4eab91caf13a59021508c94cb4432775659a53b77f',
});

const read = file => fs.readFileSync(path.join(ROOT, file));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const shaText = text => createHash('sha256').update(text).digest('hex');

function stable(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  const keys = Object.keys(value).sort();
  return '{' + keys.map(key => JSON.stringify(key) + ':' + stable(value[key])).join(',') + '}';
}

function candidateDigest(record) {
  return shaText(stable(record));
}

function summarizeCandidates(candidateRecords) {
  const refs = Object.keys(candidateRecords).sort();
  return {
    candidateCount: refs.length,
    validJsonCount: refs.filter(ref => candidateRecords[ref].validJson === true).length,
    refsSha256: shaText(refs.join('\n')),
    recordSetSha256: shaText(refs.map(ref => candidateDigest(candidateRecords[ref])).join('\n')),
    coverageRefs: Object.fromEntries(REQUIRED_LIVE_BINDINGS.map(category => [
      category,
      Object.fromEntries(refs.filter(ref => candidateRecords[ref].categoryCoverage[category].present === true)
        .map((ref, index) => [`candidate${index + 1}`, ref])),
    ])),
  };
}

function validateCandidateRecords(candidateRecords) {
  if (!plainData(candidateRecords)) return false;
  const refs = Object.keys(candidateRecords).sort();
  if (refs.length !== 78) return false;
  const seenSha = new Set();
  for (let i = 0; i < refs.length; i++) {
    const expectedRef = `rrb-local:cad-auth-candidate-discovery-${String(i + 1).padStart(3, '0')}`;
    const ref = refs[i];
    const record = candidateRecords[ref];
    if (ref !== expectedRef || record.candidateRef !== ref) return false;
    if (!/^[a-f0-9]{64}$/.test(record.sha256) || seenSha.has(record.sha256)) return false;
    seenSha.add(record.sha256);
    if (!Number.isInteger(record.byteLength) || record.byteLength <= 0) return false;
    if (record.validJson !== true) return false;
    if (!record.categoryCoverage || Object.keys(record.categoryCoverage).length !== REQUIRED_LIVE_BINDINGS.length) return false;
    for (const category of REQUIRED_LIVE_BINDINGS) {
      const coverage = record.categoryCoverage[category];
      if (!coverage || typeof coverage.present !== 'boolean'
        || !Number.isInteger(coverage.fieldsPresentCount)
        || !Number.isInteger(coverage.fieldsRequired)) return false;
      if (category === 'concreteProviderRuntimeBinding'
        && Object.hasOwn(EXPECTED_PARTIAL_COVERAGE, ref)) {
        if (coverage.present !== true || coverage.fieldsPresentCount !== 1
          || record.sha256 !== EXPECTED_PARTIAL_COVERAGE[ref]) return false;
      } else if (coverage.present !== false || coverage.fieldsPresentCount !== 0) return false;
    }
  }
  return true;
}

function expectedPacket(seed, readSource = read) {
  const sourceIntake = JSON.parse(readSource(SOURCE_INTAKE_FILE));
  if (!checkIntake(sourceIntake, { readSource }).ok) throw Error('INVALID_RESTRICTED_SOURCE_INTAKE_PARENT');
  const candidateRecords = seed && seed.preparation && seed.preparation.discoveryResult
    ? seed.preparation.discoveryResult.candidateRecords : {};
  if (!validateCandidateRecords(candidateRecords)) throw Error('INVALID_CANDIDATE_RECORDS');
  const summary = summarizeCandidates(candidateRecords);
  return {
    schemaVersion: 1,
    packet: 'cad-auth-restricted-candidate-discovery-v1',
    sourceOnly: true,
    status: 'CANDIDATE_DISCOVERY_INCOMPLETE_RESTRICTED_BUNDLE_ABSENT',
    parent: {
      packet: sourceIntake.packet,
      sha256: sha(readSource(SOURCE_INTAKE_FILE)),
      sourceMergeCommit: sourceIntake.sourceMergeCommit,
      status: sourceIntake.status,
      matchesApprovedSourceIntakePacket: SOURCE_INTAKE_PACKET.sha256 === sha(readSource(SOURCE_INTAKE_FILE)),
    },
    preparation: candidateDiscoveryDisposition(candidateRecords),
    discoverySummary: summary,
    futureHumanGate: {
      status: 'COHERENT_EIGHT_CATEGORY_PRIVATE_SOURCE_SET_REQUIRED',
      required: true,
      automaticallyPromotable: false,
      exactPhrase: null,
      nextStep: 'Provide or authorize one coherent private source set that contains all eight CAD Auth restricted receipt categories.',
      blockedUntilAllEightCategoryRefsPresent: true,
      blockedUntilDigestRecomputationComplete: true,
      blockedUntilCustodyReviewerSeparationAccepted: true,
      blockedUntilRetentionDispositionSettled: true,
      blockedUntilImmutableTargetRechecked: true,
    },
    sourceBindings: Object.fromEntries(SOURCES.map(file => [file, sha(readSource(file))])),
    sourceMergeCommit: SOURCE_INTAKE_PACKET.boundMainCommit,
  };
}

function checkDiscovery(packet, { readSource = read } = {}) {
  let ok = false;
  try {
    ok = packet !== null && typeof packet === 'object' && !Array.isArray(packet)
      && plainData(packet)
      && isDeepStrictEqual(packet, expectedPacket(packet, readSource))
      && checkCandidateDiscoveryDisposition(packet.preparation).ok;
  } catch { /* sanitized */ }
  return {
    ...checkCandidateDiscoveryDisposition(null),
    ok,
    sourceBindingValid: ok,
    code: ok ? 'SOURCE_ONLY_RESTRICTED_CANDIDATE_DISCOVERY_VALID'
      : 'INVALID_SOURCE_ONLY_RESTRICTED_CANDIDATE_DISCOVERY',
    problems: ok ? [] : ['INVALID_SOURCE_ONLY_RESTRICTED_CANDIDATE_DISCOVERY'],
  };
}

if (require.main === module) {
  try {
    if (process.argv.length > 3 || process.argv[2] && process.argv[2] !== '--write') throw Error('INVALID_ARGUMENT');
    const seed = fs.existsSync(path.join(ROOT, PACKET)) ? JSON.parse(read(PACKET)) : null;
    if (process.argv[2] === '--write') {
      fs.writeFileSync(path.join(ROOT, PACKET), JSON.stringify(expectedPacket(seed), null, 2) + '\n');
    }
    const result = checkDiscovery(JSON.parse(read(PACKET)));
    console.log(JSON.stringify(result, null, 2));
    process.exitCode = result.ok ? 0 : 1;
  } catch {
    console.log(JSON.stringify({
      ...checkCandidateDiscoveryDisposition(null),
      code: 'RESTRICTED_CANDIDATE_DISCOVERY_BLOCKED',
    }));
    process.exitCode = 1;
  }
}

module.exports = { PACKET, SOURCES, expectedPacket, checkDiscovery, validateCandidateRecords };
