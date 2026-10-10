const crypto = require('node:crypto');

const TARGET = 'https://majestic-alligator-31.convex.cloud';
const IDENTIFIER = /^[A-Za-z0-9_./-]+:[A-Za-z0-9_$-]+$/;

function digest(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function classifyCapture({ cliExitStatus, stdout, stderr = '' }) {
  const stderrClassification = stderr.length === 0 ? 'NONE' : 'PRESENT_NOT_RETAINED';
  if (!Number.isInteger(cliExitStatus)) {
    return { classification: 'CLI_EXIT_UNKNOWN', stderrClassification };
  }
  if (cliExitStatus !== 0) {
    return { classification: 'CLI_EXIT_NONZERO', stderrClassification };
  }
  if (typeof stdout !== 'string' || stdout.length === 0) {
    return { classification: 'STDOUT_EMPTY', stderrClassification };
  }

  let parsed;
  try {
    parsed = JSON.parse(stdout);
  } catch {
    return { classification: 'STDOUT_JSON_INVALID', stderrClassification };
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)
      || typeof parsed.url !== 'string' || !Array.isArray(parsed.functions)) {
    return { classification: 'RESPONSE_SHAPE_INVALID', stderrClassification };
  }
  if (parsed.url !== TARGET) {
    return { classification: 'TARGET_MISMATCH', stderrClassification };
  }

  const names = [];
  for (const entry of parsed.functions) {
    if (!entry || typeof entry !== 'object' || typeof entry.identifier !== 'string') {
      return { classification: 'IDENTIFIER_MISSING', stderrClassification };
    }
    if (!IDENTIFIER.test(entry.identifier)) {
      return { classification: 'IDENTIFIER_GRAMMAR_UNSUPPORTED', stderrClassification };
    }
    names.push(entry.identifier);
  }
  if (new Set(names).size !== names.length) {
    return { classification: 'IDENTIFIER_DUPLICATE', stderrClassification };
  }
  names.sort();
  return {
    classification: 'SANITIZED_METADATA_AVAILABLE',
    stderrClassification,
    targetMatched: true,
    functionCount: names.length,
    functionNamesDigest: digest(JSON.stringify(names)),
  };
}

function classifyConsumedRun({ parserExitStatusRecorded, sanitizedOutputPresent,
  sanitizedArtifactPresent }) {
  if (parserExitStatusRecorded !== true && sanitizedOutputPresent !== true
      && sanitizedArtifactPresent !== true) {
    return 'WRAPPER_SILENT_EXIT_UNOBSERVABLE';
  }
  return 'CONSUMED_EVIDENCE_PRESENT';
}

function inspectInstalledSource({ functionSpecSource, logSource, bundleSource }) {
  const start = functionSpecSource.indexOf('async function functionSpecForDeployment');
  const end = functionSpecSource.indexOf('//# sourceMappingURL=', start);
  const functionBlock = start >= 0 && end > start ? functionSpecSource.slice(start, end) : '';
  const systemQueryCount = (functionBlock.match(/import_run\.runSystemQuery/g) || []).length;
  const maxRetries = Number(bundleSource.match(/MAX_RETRIES = (\d+);/)?.[1]);
  return {
    functionSpecWritesStdout: /console\.log\(\.\.\.logged\)/.test(logSource)
      && /import_log\.logOutput\)\(output\)/.test(functionBlock),
    systemQueryCount,
    transportMaxRetries: Number.isInteger(maxRetries) ? maxRetries : null,
    functionSpecNoRetryFlagFound: !/retry/i.test(functionBlock),
  };
}

module.exports = { TARGET, classifyCapture, classifyConsumedRun, inspectInstalledSource };
