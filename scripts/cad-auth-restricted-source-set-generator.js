// Local ignored source-set generator. Reads only explicitly named receipt files.
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { REQUIRED_LIVE_BINDINGS, ZERO_ACTIONS } = require('../offline/cad-auth-live-collector-binding/guardedCollector');
const { RECEIPT_FIELDS, plainData } = require('../offline/cad-auth-command-card-source/preparation');
const { expectedReceiptFiles } = require('../offline/cad-auth-restricted-source-set-generator/preparation');

const ROOT = path.resolve(__dirname, '..');
const OUTPUT_ROOT = path.join(ROOT, '.local', 'cad-auth-restricted-source-sets');
const OUTPUT_FILE = 'restricted-source-set.json';
const EXPECTED_FILES = expectedReceiptFiles();
const HEX64 = /^[a-f0-9]{64}$/;
const RUN_ID = /^[a-z0-9][a-z0-9-]{2,80}$/;

function sha(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

function utcRunId(now = new Date()) {
  return now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z').toLowerCase();
}

function under(child, parent) {
  const rel = path.relative(path.resolve(parent), path.resolve(child));
  return rel && !rel.startsWith('..') && !path.isAbsolute(rel);
}

function safeFailure(code, extra = {}) {
  return {
    ok: false,
    code,
    ...extra,
    ...ZERO_ACTIONS,
    executable: false,
    executableCommandCardIssued: false,
    liveCollectionAuthorized: false,
    runtimeActivationAuthorized: false,
    bodyAdmissionAuthorized: false,
    uploadSessionIssuanceEnabled: false,
    requestBodyAdmissionRead: false,
    conversionAuthorized: false,
    sandboxDispatchAuthorized: false,
    retryOrSecondRunAuthorized: false,
    commercialReadinessClaimed: false,
  };
}

function findKey(value, target, seen = new Set()) {
  if (value === null || typeof value !== 'object' || seen.has(value)) return false;
  seen.add(value);
  if (Array.isArray(value)) return value.some(item => findKey(item, target, seen));
  if (Object.prototype.hasOwnProperty.call(value, target)) return true;
  return Object.keys(value).some(key => findKey(value[key], target, seen));
}

function categoryProjection(category, bytes, parsed, runId) {
  const digest = sha(bytes);
  const fieldPresence = Object.fromEntries(RECEIPT_FIELDS[category].map(field => [
    field,
    findKey(parsed, field),
  ]));
  return {
    receiptRef: `rrb-local:cad-auth-restricted-source-set:${runId}:${category}:${digest.slice(0, 12)}`,
    receiptSha256: digest,
    byteLength: bytes.length,
    fieldPresence,
  };
}

function validateProjection(projection) {
  if (!plainData(projection)) return safeFailure('INVALID_PROJECTION_SHAPE');
  if (projection.schemaVersion !== 1
    || projection.sourceSet !== 'cad-auth-coherent-restricted-source-set-v1'
    || projection.status !== 'COHERENT_EIGHT_CATEGORY_SOURCE_SET_PROJECTED'
    || !RUN_ID.test(projection.runId || '')
    || projection.generatedAtUtc && !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(projection.generatedAtUtc)
    || !projection.categories || Object.keys(projection.categories).length !== REQUIRED_LIVE_BINDINGS.length) {
    return safeFailure('INVALID_PROJECTION_SHAPE');
  }
  if (/\/Users\/|\.local\/|PRIVATE_SENTINEL|ABSOLUTE_PRIVATE_SOURCE|cookie|token/i
    .test(JSON.stringify(projection))) {
    return safeFailure('PROJECTION_CONTAINS_FORBIDDEN_PRIVATE_MARKER');
  }
  const missingFields = {};
  for (const category of REQUIRED_LIVE_BINDINGS) {
    const entry = projection.categories[category];
    if (!entry || typeof entry !== 'object') return safeFailure('INVALID_PROJECTION_CATEGORY_SHAPE');
    if (typeof entry.receiptRef !== 'string'
      || !entry.receiptRef.startsWith(`rrb-local:cad-auth-restricted-source-set:${projection.runId}:${category}:`)
      || !HEX64.test(entry.receiptSha256)
      || !Number.isSafeInteger(entry.byteLength) || entry.byteLength <= 0
      || !entry.fieldPresence || Object.keys(entry.fieldPresence).length !== RECEIPT_FIELDS[category].length) {
      return safeFailure('INVALID_PROJECTION_CATEGORY_SHAPE');
    }
    missingFields[category] = RECEIPT_FIELDS[category].filter(field => entry.fieldPresence[field] !== true);
  }
  const incomplete = Object.fromEntries(Object.entries(missingFields).filter(([, fields]) => fields.length > 0));
  if (Object.keys(incomplete).length > 0) return safeFailure('MISSING_REQUIRED_FIELDS', { incompleteCategories: incomplete });
  if (projection.coverage.complete !== true || projection.coverage.categoryCount !== REQUIRED_LIVE_BINDINGS.length
    || Object.keys(projection.coverage.missingCategories || {}).length !== 0
    || Object.keys(projection.coverage.incompleteCategories || {}).length !== 0) {
    return safeFailure('INVALID_PROJECTION_COVERAGE');
  }
  return { ok: true, code: 'COHERENT_RESTRICTED_SOURCE_SET_PROJECTION_VALID' };
}

function buildProjectionFromSourceDir(sourceDir, { runId = utcRunId(), generatedAtUtc = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z') } = {}) {
  if (!RUN_ID.test(runId)) return safeFailure('INVALID_RUN_ID');
  let stat;
  try { stat = fs.lstatSync(sourceDir); } catch { return safeFailure('SOURCE_DIR_NOT_FOUND'); }
  if (!stat.isDirectory() || stat.isSymbolicLink()) return safeFailure('SOURCE_DIR_NOT_DIRECTORY');
  const categories = {};
  const missingCategories = {};
  const invalidCategories = {};
  const incompleteCategories = {};
  for (const category of REQUIRED_LIVE_BINDINGS) {
    const receiptFile = path.join(sourceDir, EXPECTED_FILES[category]);
    let fileStat;
    try { fileStat = fs.lstatSync(receiptFile); } catch {
      missingCategories[category] = EXPECTED_FILES[category];
      continue;
    }
    if (!fileStat.isFile() || fileStat.isSymbolicLink()) {
      invalidCategories[category] = 'NOT_A_REGULAR_FILE';
      continue;
    }
    let bytes;
    let parsed;
    try {
      bytes = fs.readFileSync(receiptFile);
      parsed = JSON.parse(bytes.toString('utf8'));
    } catch {
      invalidCategories[category] = 'INVALID_JSON';
      continue;
    }
    const entry = categoryProjection(category, bytes, parsed, runId);
    const missingFields = RECEIPT_FIELDS[category].filter(field => entry.fieldPresence[field] !== true);
    if (missingFields.length > 0) incompleteCategories[category] = missingFields;
    categories[category] = entry;
  }
  if (Object.keys(missingCategories).length > 0) return safeFailure('MISSING_CATEGORY_RECEIPTS', { missingCategories });
  if (Object.keys(invalidCategories).length > 0) return safeFailure('INVALID_CATEGORY_RECEIPTS', { invalidCategories });
  if (Object.keys(incompleteCategories).length > 0) return safeFailure('MISSING_REQUIRED_FIELDS', { incompleteCategories });
  const projection = {
    schemaVersion: 1,
    sourceSet: 'cad-auth-coherent-restricted-source-set-v1',
    status: 'COHERENT_EIGHT_CATEGORY_SOURCE_SET_PROJECTED',
    generatedAtUtc,
    runId,
    categories,
    coverage: {
      complete: true,
      categoryCount: REQUIRED_LIVE_BINDINGS.length,
      missingCategories: {},
      incompleteCategories: {},
    },
    controls: {
      executable: false,
      executableCommandCardIssued: false,
      liveCollectionAuthorized: false,
      runtimeActivationAuthorized: false,
      bodyAdmissionAuthorized: false,
      uploadSessionIssuanceEnabled: false,
      requestBodyAdmissionRead: false,
      conversionAuthorized: false,
      sandboxDispatchAuthorized: false,
      retryOrSecondRunAuthorized: false,
      commercialReadinessClaimed: false,
      authorizedRuns: 0,
      ...ZERO_ACTIONS,
    },
  };
  const check = validateProjection(projection);
  return check.ok ? { ok: true, code: 'COHERENT_RESTRICTED_SOURCE_SET_PROJECTED', projection } : check;
}

function writeProjection(projection, outFile) {
  const resolved = path.resolve(outFile);
  if (path.basename(resolved) !== OUTPUT_FILE || !under(resolved, OUTPUT_ROOT)) {
    return safeFailure('OUTPUT_OUTSIDE_IGNORED_SOURCE_SET_ROOT');
  }
  fs.mkdirSync(path.dirname(resolved), { recursive: true });
  fs.writeFileSync(resolved, JSON.stringify(projection, null, 2) + '\n');
  return { ok: true, code: 'RESTRICTED_SOURCE_SET_PROJECTION_WRITTEN',
    outputRef: `rrb-local:cad-auth-restricted-source-set-output:${projection.runId}` };
}

function parseArgs(argv) {
  const args = { mode: 'generate' };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--source-dir') args.sourceDir = argv[++i];
    else if (arg === '--out') args.out = argv[++i];
    else if (arg === '--run-id') args.runId = argv[++i];
    else if (arg === '--now-utc') args.generatedAtUtc = argv[++i];
    else if (arg === '--check') { args.mode = 'check'; args.check = argv[++i]; }
    else throw Error('INVALID_ARGUMENT');
  }
  return args;
}

function runCli(argv = process.argv.slice(2)) {
  let args;
  try { args = parseArgs(argv); } catch { return safeFailure('INVALID_ARGUMENT'); }
  if (args.mode === 'check') {
    if (!args.check) return safeFailure('MISSING_CHECK_FILE');
    try {
      const resolved = path.resolve(args.check);
      if (path.basename(resolved) !== OUTPUT_FILE || !under(resolved, OUTPUT_ROOT)) {
        return safeFailure('CHECK_FILE_OUTSIDE_IGNORED_SOURCE_SET_ROOT');
      }
      return validateProjection(JSON.parse(fs.readFileSync(resolved, 'utf8')));
    } catch { return safeFailure('INVALID_CHECK_FILE'); }
  }
  if (!args.sourceDir || !args.out) return safeFailure('MISSING_SOURCE_DIR_OR_OUTPUT');
  const built = buildProjectionFromSourceDir(args.sourceDir, {
    runId: args.runId || utcRunId(),
    generatedAtUtc: args.generatedAtUtc || new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
  });
  if (!built.ok) return built;
  return writeProjection(built.projection, args.out);
}

if (require.main === module) {
  const result = runCli();
  console.log(JSON.stringify(result, null, 2));
  process.exitCode = result.ok ? 0 : 1;
}

module.exports = {
  EXPECTED_FILES,
  OUTPUT_ROOT,
  OUTPUT_FILE,
  buildProjectionFromSourceDir,
  validateProjection,
  writeProjection,
  runCli,
};
