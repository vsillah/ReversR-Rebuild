#!/usr/bin/env node
'use strict';
// Fixed-source, read-only design integrity checker. No runtime/host imports.
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const ROOT = path.resolve(__dirname, '..');
const MANIFEST = 'docs/cad-auth-controlled-upload-durable-host-integration-design.json';
const MANIFEST_SHA256 = 'f818308624803ffcff63aec1c387ee9e60d7ce913249110e8f203ea1eb464ae8';
const SOURCES = Object.freeze([
  "offline/cad-convex/durableEngine.js",
  "offline/cad-convex/durableEngineAdapter.js",
  "offline/cad-convex/uploadAdmissionDurableAdapter.js",
  "offline/cad-convex/sharedUploadControls.js",
  "convex/schema.ts",
  "convex/cadDurableEngine.ts",
  "server/cadControlledInternalUploadActivation.js",
  "server/cadControlledUploadDigestDriftRepair.js",
  "server/cadControlledUploadObservableGateWiringRepair.js",
  "server/cadProductionExecutableRuntimeMountCompletion.js",
  "server/cadUserUploadRouter.js",
  "server/index.js",
  "docs/cad-auth-controlled-upload-durable-host-integration-design.md",
  "package.json"
]);
const MAX_BYTES = 1024 * 1024;
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const result = ok => Object.freeze({
  ok, code: ok ? 'DESIGN_SOURCE_ASSERTIONS_PASS' : 'DESIGN_SOURCE_ASSERTIONS_BLOCKED',
  assertionLevel: 'source-assertions-only', hostQualified: false,
  bodyAdmissionAuthorized: false, liveReady: false, costs: 0,
  providerCalls: 0, runtimeEffects: 0,
});

// Pure byte comparison hook for synthetic tests. Never interprets an input path.
function checkDesign(manifestBytes, sourceBytes) {
  try {
    if (!Buffer.isBuffer(manifestBytes) || manifestBytes.length > MAX_BYTES
      || hash(manifestBytes) !== MANIFEST_SHA256
      || !sourceBytes || Object.getPrototypeOf(sourceBytes) !== Object.prototype) return result(false);
    const descriptors = Object.getOwnPropertyDescriptors(sourceBytes);
    if (Reflect.ownKeys(descriptors).length !== SOURCES.length) return result(false);
    const manifest = JSON.parse(manifestBytes.toString('utf8'));
    if (manifest.assertionLevel !== 'source-assertions-only' || manifest.sourceOnly !== true
      || manifest.hostQualified !== false || manifest.bodyAdmissionAuthorized !== false
      || manifest.liveReady !== false || manifest.costs !== 0
      || Object.values(manifest.authorizes).some(value => value !== false)
      || Object.keys(manifest.sourceBindings).length !== SOURCES.length) return result(false);
    for (const file of SOURCES) {
      const entry = descriptors[file];
      if (!entry || !Object.hasOwn(entry, 'value') || !Buffer.isBuffer(entry.value)
        || entry.value.length > MAX_BYTES || hash(entry.value) !== manifest.sourceBindings[file]) return result(false);
    }
    return result(true);
  } catch { return result(false); }
}

function readFixed(file) {
  // Reject symlink substitutions, including directory components, before reading.
  // Paths originate exclusively in the literal allowlist, never CLI/manifest input.
  if (file !== MANIFEST && !SOURCES.includes(file)) throw Error('FIXED_SOURCE_ONLY');
  let current = ROOT;
  if (!fs.lstatSync(current).isDirectory() || fs.lstatSync(current).isSymbolicLink()) throw Error('ROOT_INVALID');
  const parts = file.split('/');
  for (let i = 0; i < parts.length; i++) {
    current = path.join(current, parts[i]);
    const stat = fs.lstatSync(current);
    if (stat.isSymbolicLink() || (i < parts.length - 1 ? !stat.isDirectory() : !stat.isFile())) throw Error('SOURCE_INVALID');
    if (i === parts.length - 1 && stat.size > MAX_BYTES) throw Error('SOURCE_TOO_LARGE');
  }
  return fs.readFileSync(current);
}

function checkFixedSources() {
  try {
    return checkDesign(readFixed(MANIFEST), Object.fromEntries(SOURCES.map(file => [file, readFixed(file)])));
  } catch { return result(false); }
}

if (require.main === module) {
  // No execution, rewrite, arbitrary-path or live modes. Reject before any read.
  const checked = process.argv.length === 2 ? checkFixedSources() : result(false);
  console.log(JSON.stringify(checked));
  process.exitCode = checked.ok ? 0 : 1;
}
module.exports = { MANIFEST, SOURCES, checkDesign, checkFixedSources };
