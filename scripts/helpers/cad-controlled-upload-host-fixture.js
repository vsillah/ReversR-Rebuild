// Synthetic source fixtures only; no provider, private credential or durable host.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const root = path.resolve(__dirname, '../..');
const files = [
  'offline/cad-convex/controlledUploadHostModel.ts', 'offline/cad-convex/controlledUploadHostBridge.ts',
  'convex/cadControlledUploadStore.ts', 'convex/cadControlledUploadHost.ts', 'convex/cadControlledUploadSchema.ts',
];
const cache = new Map();
function load(file) {
  if (!files.includes(file)) throw Error('SOURCE_IMPORT_NOT_ALLOWED');
  if (cache.has(file)) return cache.get(file);
  const compiled = ts.transpileModule(fs.readFileSync(path.join(root, file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports = {};
  cache.set(file, exports);
  const requireFixed = name => {
    if (name === 'convex/values' || name === 'convex/server') return require(name);
    if (name === './_generated/server') return { internalMutation: config => config, internalQuery: config => config };
    return load(path.posix.normalize(path.posix.join(path.posix.dirname(file), name)) + '.ts');
  };
  vm.runInThisContext(`(function(exports,require){${compiled}\n})`, { filename: file })(exports, requireFixed);
  return exports;
}
const model = load(files[0]);
async function fixture() {
  const bindingTypes = require('../../docs/cad-auth-controlled-upload-durable-host-integration-design.json').typeDefinitions.immutableGrantBinding;
  const binding = Object.fromEntries(Object.entries(bindingTypes).map(([key, type]) => [key,
    type === 'digest' ? 'a'.repeat(64) : type === 'sha1' ? 'b'.repeat(40)
      : type === 'https-origin' ? 'https://synthetic.example' : type === 'uint' ? 1000
        : type === 'literal:1' ? 1 : type === 'literal:0' ? 0 : type === 'literal:false' ? false
          : type.startsWith('literal:') ? type.slice(8) : `synthetic-${key}`]));
  binding.windowStartMs = 1000; binding.windowEndMs = 2000; binding.grantDeadlineMs = 2000;
  const k = await model.keys(binding);
  const state = { grantId: 'synthetic-grant', scopeId: 'synthetic-scope', attemptId: null,
    grant: { grantKey: k.grantKey, scopeKey: k.scopeKey, runKey: k.runKey, bindingDigest: k.bindingDigest,
      binding, installedByPrincipalId: 'synthetic-custodian', installedAtMs: 900 },
    scope: { scopeKey: k.scopeKey, approvedRunId: binding.approvedRunId, runKey: k.runKey,
      grantId: 'synthetic-grant', sessionKey: k.sessionKey, currentBindingDigest: k.bindingDigest,
      revision: 0, authorityGeneration: 0, lastHostTimeMs: 900, custodyEpochDigest: 'c'.repeat(64),
      runSpent: false, revoked: false, permanentStop: false, stopReason: null, grantHistoryDigests: [k.bindingDigest] },
    attempt: null, tombstone: null };
  async function principal(role = 'writer') {
    const p = { verifiedIssuer: 'synthetic-issuer', verifiedAudience: 'synthetic-audience',
      verifiedSubjectDigest: (role === 'writer' ? 'd' : 'e').repeat(64), role,
      resourceBindingDigest: binding.resourceBindingDigest, active: true, generation: 1,
      expiresAtMs: 5000, approvedPolicyDigest: 'f'.repeat(64) };
    p.principalKey = await model.hash(['controlled-principal-v1', p.verifiedIssuer, p.verifiedAudience,
      p.verifiedSubjectDigest, role, p.resourceBindingDigest]);
    return p;
  }
  const auth = { active: true, expiresAtMs: 2000, generationsComplete: true,
    generations: { login: 1, user: 1, membership: 1, uploadSession: 1, hostPrincipal: 1, grant: 0 } };
  const command = operation => ({ operation, bindingDigest: k.bindingDigest, expectedRevision: state.scope.revision,
    requestNonceDigest: '1'.repeat(64), expectedPrincipalGeneration: 1, custodyEpochDigest: state.scope.custodyEpochDigest });
  const receipts = [];
  async function advance(operation, now = 1100, override = {}) {
    const p = await principal(['markUnknown','closeBodyAdmissionFence','revokeSessionAndLateGrants'].includes(operation) ? 'recovery' : 'writer');
    const result = await model.transition(state, { ...command(operation), ...override }, p, auth, now);
    if (result.plan) {
      state.scope = result.plan.scope; state.attempt = result.plan.attempt; state.tombstone = result.plan.tombstone;
      state.attemptId = 'synthetic-attempt'; receipts.push({ ...result.plan.receipt, attemptId: state.attemptId });
    }
    return result;
  }
  return { binding, state, auth, command, advance, principal, receipts };
}
function syntheticDb(initial, failReceipt = false) {
  let tables = structuredClone(initial), writes = 0;
  const db = {
    query(table) { const terms = []; return {
      withIndex(_name, callback) { const q = { eq(k, v) { terms.push([k, v]); return q; } }; callback(q); return this; },
      async take(n) { if (n !== 2) throw Error('UNBOUNDED'); return (tables[table] || []).filter(row => terms.every(([k, v]) => row[k] === v)).slice(0, n); },
    }; },
    async get(id) { return Object.values(tables).flat().find(row => row._id === id) || null; },
    async patch(id, patch) { const row = await db.get(id); if (!row) throw Error('MISSING'); Object.assign(row, structuredClone(patch)); writes++; },
    async insert(table, row) { if (failReceipt && table === 'cadControlledUploadReceipts') throw Error('SYNTHETIC_PRIVATE_SENTINEL');
      const id = `synthetic-${table}-${(tables[table] || []).length}`;
      (tables[table] ||= []).push({ _id: id, _creationTime: 900, ...structuredClone(row) }); writes++; return id; },
  };
  return { db, tables: () => tables, writes: () => writes,
    async transaction(fn) { const before = structuredClone(tables); try { return await fn(db); } catch (e) { tables = before; throw e; } },
  };
}
async function databaseRows(f) {
  const doc = (id, row) => ({ _id: id, _creationTime: 900, ...structuredClone(row) });
  const b = f.binding;
  return {
    cadControlledUploadGrants: [doc(f.state.grantId, f.state.grant)],
    cadControlledUploadScopes: [doc(f.state.scopeId, f.state.scope)],
    cadControlledUploadAttempts: f.state.attempt ? [doc(f.state.attemptId, f.state.attempt)] : [],
    cadControlledUploadSessionTombstones: f.state.tombstone ? [doc('synthetic-tomb', f.state.tombstone)] : [],
    cadControlledUploadReceipts: f.receipts.map((r, i) => doc(`synthetic-receipt-${i}`, r)),
    cadControlledUploadHostPrincipals: [doc('synthetic-writer', await f.principal()), doc('synthetic-recovery', await f.principal('recovery'))],
    users: [doc(b.userId, {})], authSessions: [doc(b.loginSessionId, { userId: b.userId, expirationTime: 2000 })],
    cadUserAuthority: [doc('synthetic-user-auth', { userId: b.userId, enabled: true, generation: 1 })],
    cadMemberships: [doc('synthetic-membership', { userId: b.userId, shopId: b.shopId, active: true, cadUploadAllowed: true, generation: 1 })],
    cadUploadSessions: [doc('synthetic-upload', { schemaVersion: 2, userId: b.userId, shopId: b.shopId,
      loginSessionId: b.loginSessionId, sessionId: b.sessionId, credentialDigest: b.credentialDigest,
      authMethod: 'password', transport: 'bearer', issuedAt: 900, expiresAt: 2000, cadUploadAllowed: true,
      status: 'active', userGeneration: 1, membershipGeneration: 1 })],
  };
}
module.exports = { model, load, fixture, syntheticDb, databaseRows };
