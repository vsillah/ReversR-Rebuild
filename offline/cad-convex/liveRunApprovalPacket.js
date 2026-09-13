// Offline data inspection only. No runner, approval parser, clock, I/O or provider SDK.
const { createHash } = require('node:crypto');
const template = require('./liveRunApprovalPacket.json');
const envelopeTemplate = require('./liveRunApprovalEnvelope.json');
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const keys = (a, b) => a && typeof a === 'object' && !Array.isArray(a) &&
  same(Object.keys(a).sort(), Object.keys(b).sort());
const sha = s => typeof s === 'string' && /^[a-f0-9]{64}$/.test(s);
const ref = s => typeof s === 'string' && /^rrb-ref:[a-z0-9-]{1,80}$/.test(s);
const id = s => typeof s === 'string' && /^[a-z0-9-]{1,64}$/.test(s);
const utc = s => typeof s === 'string' && /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ$/.test(s) &&
  Number.isFinite(Date.parse(s)) && new Date(s).toISOString() === s.replace('Z', '.000Z');
const hash = s => createHash('sha256').update(s, 'utf8').digest('hex');
function valueValid(key, value) {
  if (/Commit$/.test(key)) return typeof value === 'string' && /^[a-f0-9]{40}$/.test(value);
  if (/Digest$/.test(key)) return sha(value);
  if (/Micros$/.test(key)) return Number.isSafeInteger(value) && value >= 0 && value <= 9000000;
  if (/Utc$/.test(key)) return utc(value);
  if (key === 'identity.resourceAlias') return typeof value === 'string' && /^rrb-synthetic-[a-z0-9-]{1,40}$/.test(value);
  if (key === 'identity.namespace') return typeof value === 'string' && /^rrb\/qualification\/[a-z0-9-]{1,64}\/[a-f0-9]{32}$/.test(value);
  if (['identity.runId', 'identity.ledgerId', 'identity.windowId', 'identity.fence'].includes(key)) return id(value);
  return ref(value);
}
function inspectLiveRunApprovalPacket(dossierBytes, envelope) {
  const errors = [], missing = [];
  const result = () => ({ structureValid: errors.length === 0, fieldsComplete: errors.length === 0 && missing.length === 0,
    executable: false, liveQualified: false, publicationAuthorized: false, liveRunAuthorized: false,
    recoveryAuthorized: false, decision: 'LIVE_RUN_BLOCKED', errors: [...new Set(errors)], missing: [...new Set(missing)],
    blockers: ['INDEPENDENT_EVIDENCE_VERIFICATION_REQUIRED', 'REVIEWED_RUNNER_REQUIRED', 'SEPARATE_EXPLICIT_LIVE_APPROVAL_REQUIRED'] });
  let packet;
  try {
    if (typeof dossierBytes !== 'string' || Buffer.byteLength(dossierBytes, 'utf8') > 1048576) throw new Error();
    packet = JSON.parse(dossierBytes);
  } catch { errors.push('DOSSIER_BYTES_INVALID'); return result(); }
  if (!keys(packet, template) || !keys(envelope, envelopeTemplate)) {
    errors.push('PACKET_SHAPE_INVALID'); return result();
  }
  for (const k of Object.keys(template).filter(k => !['fields', 'evidence'].includes(k)))
    if (!same(packet[k], template[k])) errors.push('IMMUTABLE_CONTRACT_CHANGED');
  if (!keys(packet.fields, template.fields) || !keys(packet.evidence, template.evidence) || !keys(envelope.bindings, template.fields)) {
    errors.push('FIELD_INVENTORY_CHANGED'); return result();
  }
  function receipt(value, label) {
    const expected = envelopeTemplate.privateIdentityEvidence;
    if (!keys(value, expected)) { errors.push('EVIDENCE_SHAPE_INVALID'); return; }
    for (const k of Object.keys(expected)) {
      if (value[k] === null) missing.push(label + '.' + k);
      else if (!(k === 'sha256' ? sha(value[k]) : k === 'reviewedUtc' ? utc(value[k]) : ref(value[k]))) errors.push('EVIDENCE_VALUE_INVALID');
    }
  }
  for (const [k, value] of Object.entries(packet.fields)) {
    if (value === null) missing.push(k);
    else if (!valueValid(k, value)) errors.push('FIELD_VALUE_INVALID');
    if (!same(value, envelope.bindings[k])) errors.push('ENVELOPE_BINDING_MISMATCH');
    receipt(packet.evidence[k], k);
  }
  for (const k of ['schemaVersion', 'mode', 'executable', 'liveRunAuthorized', 'publicationAuthorized'])
    if (!same(envelope[k], envelopeTemplate[k])) errors.push('ENVELOPE_AUTHORITY_OR_MODE_INVALID');
  for (const [key, bytes] of [['dossierSha256', dossierBytes], ['operationCounterSha256', JSON.stringify({ limits: packet.limits, operationMatrix: packet.operationMatrix })]]) {
    if (envelope[key] === null) missing.push(key);
    else if (!sha(envelope[key]) || envelope[key] !== hash(bytes)) errors.push('DIGEST_MISMATCH');
  }
  receipt(envelope.privateIdentityEvidence, 'privateIdentityEvidence');
  receipt(envelope.independentEnvelopeReview, 'independentEnvelopeReview');
  const f = packet.fields;
  if (typeof f['identity.namespace'] === 'string' && f['identity.runId'] !== null &&
      !f['identity.namespace'].startsWith('rrb/qualification/' + f['identity.runId'] + '/')) errors.push('NAMESPACE_RUN_MISMATCH');
  const start = f['window.startUtc'], end = f['window.expiresUtc'];
  if (utc(start) && utc(end) && !(Date.parse(end) > Date.parse(start) && Date.parse(end) - Date.parse(start) <= 1800000)) errors.push('UTC_WINDOW_INVALID');
  const costKeys = ['compute', 'storage', 'operations', 'backup', 'egress', 'taxFeesFx', 'contingency'].map(k => 'cost.' + k + 'Micros');
  if (costKeys.every(k => Number.isSafeInteger(f[k])) && Number.isSafeInteger(f['cost.enforcedCapMicros']) &&
      costKeys.reduce((sum, k) => sum + f[k], 0) > f['cost.enforcedCapMicros']) errors.push('ALL_IN_CAP_EXCEEDED');
  const owners = ['custody.primaryRef', 'custody.backupRef', 'custody.evidenceReviewerRef'].map(k => f[k]).filter(v => v !== null);
  if (new Set(owners).size !== owners.length) errors.push('CUSTODY_NOT_INDEPENDENT');
  if (utc(start)) {
    const receipts = [...Object.values(packet.evidence), envelope.privateIdentityEvidence, envelope.independentEnvelopeReview];
    if (receipts.some(r => r && utc(r.reviewedUtc) && Date.parse(r.reviewedUtc) > Date.parse(start))) errors.push('REVIEW_AFTER_RUN_START');
  }
  // Completeness describes syntax and binding only; never evidence authenticity or approval.
  return result();
}
module.exports = { inspectLiveRunApprovalPacket };
