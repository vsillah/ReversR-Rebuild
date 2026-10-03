// Metadata comparison only. A matching projection is never authenticated evidence.
import { closed, digest, exact, hash, keys, uint, validBinding } from './controlledUploadHostModel';
import type { Binding, Generations } from './controlledUploadHostModel';

export type Identity = {
  bindingDigest: string; scopeKey: string; runKey: string; sessionKey: string;
  userId: string; loginSessionId: string; userAuthorityId: string; membershipId: string;
  uploadRowId: string; shopId: string; sessionId: string; credentialDigest: string; sessionRef: string;
};
export type Observation = { identity: Identity; rowDigest: string; active: boolean; expiresAtMs: number;
  userGeneration: number; membershipGeneration: number; principalGeneration: number; grantGeneration: number;
  principalRole: 'writer' | 'grant-custodian'; principalDigest: string };
export type ContinuityAnchor = { resourceBindingDigest: string; scopeKey: string; epoch: number;
  epochDigest: string; minimumSequence: number; minimumScopeRevision: number; lastTrustedTimeMs: number;
  authorityGenerations: Generations };
export type EvidenceEnvelope = { schemaVersion: 1; identity: Identity; rowDigest: string;
  authorityGenerations: Generations; epoch: number; epochDigest: string; sequence: number;
  scopeRevision: number; observedAtMs: number; expiresAtMs: number; approvalDigest: string;
  custodySubjectDigest: string; writerSubjectDigest: string; recoverySubjectDigest: string;
  custodianSubjectDigest: string; writerPrincipalDigest: string; custodianPrincipalDigest: string;
  requestNonceDigest: string; evidenceDigest: string };
export type VerifiedContinuityValue = { envelope: EvidenceEnvelope; anchor: ContinuityAnchor };
// Only the missing independent transport/custody implementation could create this type.
// There is intentionally no constructor, cast, signature parser or trust configuration here.
declare const authenticatedContinuity: unique symbol;
export type VerifiedContinuity = Readonly<VerifiedContinuityValue> & { readonly [authenticatedContinuity]: true };
const identityFields = ['bindingDigest','scopeKey','runKey','sessionKey','userId','loginSessionId',
  'userAuthorityId','membershipId','uploadRowId','shopId','sessionId','credentialDigest','sessionRef'];
const generationFields = ['login','user','membership','uploadSession','hostPrincipal','grant'];
const envelopeFields = ['schemaVersion','identity','rowDigest','authorityGenerations','epoch','epochDigest','sequence',
  'scopeRevision','observedAtMs','expiresAtMs','approvalDigest','custodySubjectDigest','writerSubjectDigest',
  'recoverySubjectDigest','custodianSubjectDigest','writerPrincipalDigest','custodianPrincipalDigest','requestNonceDigest','evidenceDigest'];
const anchorFields = ['resourceBindingDigest','scopeKey','epoch','epochDigest','minimumSequence',
  'minimumScopeRevision','lastTrustedTimeMs','authorityGenerations'];
const ref = (v: unknown) => typeof v === 'string' && /^[A-Za-z0-9][A-Za-z0-9._:/@-]{0,255}$/.test(v);
const generations = (g: unknown) => exact(g, generationFields) && Object.values(g).every(uint);
const identity = (i: unknown) => exact(i, identityFields) && Object.values(i).every(ref)
  && ['bindingDigest','scopeKey','runKey','sessionKey','credentialDigest'].every(k => digest(i[k]));
export async function compareContinuityMetadata(binding: unknown, observation: unknown, evidence: unknown, anchor: unknown, now: unknown) {
  try {
    if (!validBinding(binding) || !exact(observation, ['identity','rowDigest','active','expiresAtMs','userGeneration',
      'membershipGeneration','principalGeneration','grantGeneration','principalRole','principalDigest']) || !exact(evidence, envelopeFields)
      || !exact(anchor, anchorFields) || !uint(now)) return closed('EVIDENCE_METADATA_INVALID');
    // Capture every caller-owned structure before the first await.
    const b = JSON.parse(JSON.stringify(binding)) as Binding, o = JSON.parse(JSON.stringify(observation)) as Observation,
      e = JSON.parse(JSON.stringify(evidence)) as EvidenceEnvelope, a = JSON.parse(JSON.stringify(anchor)) as ContinuityAnchor;
    if (!identity(o.identity) || !identity(e.identity) || !generations(e.authorityGenerations) || !generations(a.authorityGenerations)
      || ![o.expiresAtMs,o.userGeneration,o.membershipGeneration,o.principalGeneration,o.grantGeneration,
        e.epoch,e.sequence,e.scopeRevision,e.observedAtMs,e.expiresAtMs,a.epoch,a.minimumSequence,a.minimumScopeRevision,a.lastTrustedTimeMs].every(uint)
      || ![o.rowDigest,e.rowDigest,e.epochDigest,e.approvalDigest,e.evidenceDigest,a.epochDigest,a.resourceBindingDigest,a.scopeKey,
        e.custodySubjectDigest,e.writerSubjectDigest,e.recoverySubjectDigest,e.custodianSubjectDigest,e.requestNonceDigest,
        e.writerPrincipalDigest,e.custodianPrincipalDigest,o.principalDigest].every(digest)
      || !['writer','grant-custodian'].includes(o.principalRole) || e.schemaVersion !== 1 || o.active !== true) return closed('EVIDENCE_METADATA_INVALID');
    const k = await keys(b);
    if (Object.entries(k).some(([key, value]) => key !== 'grantKey' && e.identity[key as keyof Identity] !== value)
      || identityFields.some(key => e.identity[key as keyof Identity] !== o.identity[key as keyof Identity])
      || (['userId','loginSessionId','shopId','sessionId','credentialDigest','sessionRef'] as const).some(key => e.identity[key] !== b[key])
      || e.rowDigest !== o.rowDigest || a.scopeKey !== k.scopeKey || a.resourceBindingDigest !== b.resourceBindingDigest
      || e.approvalDigest !== b.approvalRecordSha256
      || o.principalDigest !== (o.principalRole === 'writer' ? e.writerPrincipalDigest : e.custodianPrincipalDigest)) return closed('EVIDENCE_IDENTITY_MISMATCH');
    if (e.epoch !== a.epoch || e.epochDigest !== a.epochDigest || e.sequence < a.minimumSequence
      || e.scopeRevision < a.minimumScopeRevision || e.observedAtMs < a.lastTrustedTimeMs
      || now < a.lastTrustedTimeMs || now < e.observedAtMs || now >= e.expiresAtMs || now >= o.expiresAtMs
      || now < b.windowStartMs || now >= b.grantDeadlineMs || e.expiresAtMs > o.expiresAtMs
      || e.expiresAtMs > b.grantDeadlineMs) return closed('EVIDENCE_STALE_OR_REGRESSED');
    if (generationFields.some(key => e.authorityGenerations[key as keyof Generations] !== a.authorityGenerations[key as keyof Generations])
      || e.authorityGenerations.user !== o.userGeneration || e.authorityGenerations.membership !== o.membershipGeneration
      || e.authorityGenerations.hostPrincipal !== o.principalGeneration || e.authorityGenerations.grant !== o.grantGeneration
      || [e.writerSubjectDigest,e.recoverySubjectDigest,e.custodianSubjectDigest].includes(e.custodySubjectDigest)) return closed('EVIDENCE_GENERATION_OR_SEPARATION_REJECTED');
    const { evidenceDigest, ...payload } = e;
    if (evidenceDigest !== await hash(['controlled-continuity-envelope-v1',payload])) return closed('EVIDENCE_METADATA_DIGEST_MISMATCH');
    return { ...closed('METADATA_MATCH_PROVENANCE_UNAVAILABLE'), metadataMatches: true as const, provenanceAvailable: false as const };
  } catch { return closed('EVIDENCE_METADATA_INVALID'); }
}

// No callback, environment flag, caller boolean, hash, local row or empty database
// can create independent provenance. Old snapshots and forged epochs always deny.
export function verifyIndependentAuthorityContinuity(..._untrusted: unknown[]): VerifiedContinuity | null { return null; }
export function verifyIndependentRegistrationApproval(..._untrusted: unknown[]): VerifiedContinuity | null { return null; }
export function admissionFromContinuity(..._untrusted: unknown[]) { return closed('INDEPENDENT_CUSTODY_UNAVAILABLE'); }
