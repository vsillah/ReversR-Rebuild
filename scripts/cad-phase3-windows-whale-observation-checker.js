const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const SCHEMA_PATH = 'docs/cad-phase3-windows-whale-observation.schema.json';
const CHECK_IDS = Object.freeze([
  'browserAccess',
  'publicFixtureSelection',
  'render',
  'dimensions',
  'mouseControls',
  'keyboardControls',
  'downloads',
  'buildHold',
]);
const OUTCOMES = Object.freeze(['pass', 'fail', 'blocked', 'unclear']);
const OUTCOME_PRIORITY = Object.freeze({ pass: 0, unclear: 1, blocked: 2, fail: 3 });
const EVIDENCE_REF = /^(rrb-ref|screenshot|clip|note):[A-Za-z0-9._/-]{1,180}$/;
const SENSITIVE_TEXT = /(?:[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}|\b(?:https?|file):\/\/|\/[Uu]sers\/|[A-Za-z]:\\Users\\|\b(?:password|access[_ -]?token|api[_ -]?key|secret)\b)/i;

const isPlainObject = value => Boolean(value) && typeof value === 'object'
  && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype;
const exactKeys = (value, keys) => isPlainObject(value)
  && Object.keys(value).length === keys.length
  && keys.every(key => Object.hasOwn(value, key));
const safeText = (value, maxLength, { allowEmpty = false } = {}) => typeof value === 'string'
  && value.length <= maxLength
  && (allowEmpty || value.length > 0)
  && !SENSITIVE_TEXT.test(value);

function loadSchema() {
  return JSON.parse(fs.readFileSync(path.join(ROOT, SCHEMA_PATH), 'utf8'));
}

function checkSchema(schema = loadSchema()) {
  const checks = schema?.properties?.checks;
  const fixture = schema?.properties?.fixture?.properties;
  const privacy = schema?.properties?.privacy?.properties;
  const claims = schema?.properties?.claims?.properties;
  const outcomes = schema?.$defs?.outcome?.enum;
  const ok = schema?.properties?.schemaVersion?.const === 1
    && schema?.properties?.recordKind?.const === 'cad-phase3-public-fixture-observation'
    && schema?.additionalProperties === false
    && fixture?.fixtureId?.const === 'mark-dispenser-v1'
    && fixture?.sourceFileName?.const === 'Dispenser.IGS'
    && fixture?.selectionMethod?.const === 'use-public-sample'
    && fixture?.privateCadUsed?.const === false
    && CHECK_IDS.every(id => checks?.required?.includes(id) && checks?.properties?.[id]?.$ref === '#/$defs/checkResult')
    && OUTCOMES.every(outcome => outcomes?.includes(outcome))
    && privacy?.telemetrySent?.const === false
    && privacy?.externalWrites?.const === 0
    && privacy?.uploadAttempted?.const === false
    && privacy?.providerContacted?.const === false
    && claims?.whaleCompatibilityClaimed?.const === false
    && claims?.manufacturingReadinessClaimed?.const === false
    && claims?.externalValidationClaimed?.const === false;
  return { ok, code: ok ? 'OBSERVATION_SCHEMA_READY' : 'OBSERVATION_SCHEMA_BLOCKED', effectsExecuted: 0 };
}

function expectedOverallOutcome(checks) {
  return CHECK_IDS.map(id => checks[id].outcome)
    .reduce((current, outcome) => OUTCOME_PRIORITY[outcome] > OUTCOME_PRIORITY[current] ? outcome : current, 'pass');
}

function validateCheckResult(value) {
  return exactKeys(value, ['outcome', 'notes', 'evidenceRefs'])
    && OUTCOMES.includes(value.outcome)
    && safeText(value.notes, 500, { allowEmpty: true })
    && Array.isArray(value.evidenceRefs)
    && value.evidenceRefs.length <= 8
    && value.evidenceRefs.every(ref => EVIDENCE_REF.test(ref));
}

function validateObservation(input) {
  let ok = false;
  try {
    ok = checkSchema().ok
      && exactKeys(input, ['schemaVersion', 'recordKind', 'observedAt', 'sourceCommit', 'environment', 'fixture', 'checks', 'privacy', 'claims', 'summary'])
      && input.schemaVersion === 1
      && input.recordKind === 'cad-phase3-public-fixture-observation'
      && Number.isFinite(Date.parse(input.observedAt))
      && /^[0-9a-f]{40}$/.test(input.sourceCommit)
      && exactKeys(input.environment, ['osFamily', 'osVersion', 'browserName', 'browserVersion', 'viewport'])
      && input.environment.osFamily === 'Windows'
      && safeText(input.environment.osVersion, 80)
      && input.environment.browserName === 'Whale'
      && safeText(input.environment.browserVersion, 80)
      && exactKeys(input.environment.viewport, ['width', 'height'])
      && Number.isInteger(input.environment.viewport.width)
      && input.environment.viewport.width >= 1024
      && input.environment.viewport.width <= 7680
      && Number.isInteger(input.environment.viewport.height)
      && input.environment.viewport.height >= 600
      && input.environment.viewport.height <= 4320
      && exactKeys(input.fixture, ['fixtureId', 'sourceFileName', 'selectionMethod', 'privateCadUsed'])
      && input.fixture.fixtureId === 'mark-dispenser-v1'
      && input.fixture.sourceFileName === 'Dispenser.IGS'
      && input.fixture.selectionMethod === 'use-public-sample'
      && input.fixture.privateCadUsed === false
      && exactKeys(input.checks, CHECK_IDS)
      && CHECK_IDS.every(id => validateCheckResult(input.checks[id]))
      && exactKeys(input.privacy, ['telemetrySent', 'externalWrites', 'uploadAttempted', 'providerContacted'])
      && input.privacy.telemetrySent === false
      && input.privacy.externalWrites === 0
      && input.privacy.uploadAttempted === false
      && input.privacy.providerContacted === false
      && exactKeys(input.claims, ['whaleCompatibilityClaimed', 'manufacturingReadinessClaimed', 'externalValidationClaimed'])
      && input.claims.whaleCompatibilityClaimed === false
      && input.claims.manufacturingReadinessClaimed === false
      && input.claims.externalValidationClaimed === false
      && exactKeys(input.summary, ['overallOutcome', 'unresolved'])
      && OUTCOMES.includes(input.summary.overallOutcome)
      && input.summary.overallOutcome === expectedOverallOutcome(input.checks)
      && Array.isArray(input.summary.unresolved)
      && input.summary.unresolved.length <= 24
      && input.summary.unresolved.every(value => safeText(value, 240));
  } catch { /* fail closed without echoing observation content */ }
  return {
    ok,
    code: ok ? 'PUBLIC_FIXTURE_OBSERVATION_ACCEPTED' : 'PUBLIC_FIXTURE_OBSERVATION_BLOCKED',
    publicFixtureOnly: ok,
    telemetrySent: false,
    compatibilityQualified: false,
    manufacturingReady: false,
    effectsExecuted: 0,
  };
}

if (require.main === module) {
  try {
    if (process.argv.length === 2) {
      console.log(JSON.stringify(checkSchema()));
    } else if (process.argv.length === 4 && process.argv[2] === '--input') {
      const file = path.resolve(process.argv[3]);
      const stat = fs.statSync(file);
      if (!stat.isFile() || stat.size > 65536 || path.extname(file).toLowerCase() !== '.json') throw Error('INVALID_INPUT');
      const result = validateObservation(JSON.parse(fs.readFileSync(file, 'utf8')));
      console.log(JSON.stringify(result));
      process.exitCode = result.ok ? 0 : 1;
    } else {
      throw Error('INVALID_ARGUMENT');
    }
  } catch {
    console.log(JSON.stringify(validateObservation(null)));
    process.exitCode = 1;
  }
}

module.exports = { SCHEMA_PATH, CHECK_IDS, OUTCOMES, checkSchema, expectedOverallOutcome, validateObservation };
