// Deterministic SOURCE model only. No storage, network, credentials or host IO.
import { digest, exact, hash, keys, uint, validBinding } from '../cad-convex/controlledUploadHostModel';
import type { Binding } from '../cad-convex/controlledUploadHostModel';

const FIXED_LIMITS = Object.freeze({ durationMs: 3600000, callers: 2, serviceRequests: 1000,
  storageOperations: 1000, payloadBytes: 10485760, recoveryRequests: 200, recoveryOperations: 200, recoveryPayloadBytes: 49152,
  recordBytes: 16384, maxRecords: 64, readbackAgeMs: 1000, clockUncertaintyMs: 1000 });
export const LIMITS = FIXED_LIMITS;
const OPERATION_EVENTS = Object.freeze(['reserve','arm','open','consume','close','revoke','unknown'] as const);
export const EVENTS = OPERATION_EVENTS;
export type Event = typeof EVENTS[number];
type Usage = { serviceRequests: number; storageOperations: number; payloadBytes: number };
type Flags = { reserved: boolean; armed: boolean; opened: boolean; consumed: boolean; closed: boolean; revoked: boolean; unknown: boolean };
type Checkpoint = { resourceDigest: string; originDigest: string; originGeneration: string; epoch: number; epochDigest: string;
  sequence: number; payloadDigest: string; generation: string | null; policyDigest: string;
  startMs: number; deadlineMs: number; timeHighWaterMs: number; usage: Usage; namespaceStatus: 'active' | 'retired' };
type Readback = { resourceDigest: string; originDigest: string; originGeneration: string; epoch: number; epochDigest: string;
  sequence: number; payloadDigest: string; generation: string | null; policyDigest: string;
  requestNonceDigest: string; readerAuthorityDigest: string; writerAuthorityDigest: string;
  observedAtMs: number; expiresAtMs: number; usage: Usage };
export type Payload = { version: 1; resourceDigest: string; originDigest: string; epoch: number; epochDigest: string;
  sequence: number; priorDigest: string; binding: Binding; bindingDigest: string; scopeKey: string; runKey: string;
  sessionKey: string; policyDigest: string; nonceDigest: string; event: Event; evaluatedUpperMs: number; usageAfter: Usage };
type Record = { payload: Payload; payloadDigest: string; generation: string };
type Input = { binding: Binding; checkpoint: Checkpoint; history: Record[]; historyState: 'complete' | 'missing' | 'noncurrent' | 'conflict';
  readback: Readback; command: { event: Event; nonceDigest: string; bindingDigest: string; policyDigest: string; expectedSequence: number };
  clock: { lowerMs: number; upperMs: number; monotonicElapsedMs: number }; concurrentCallers: number };
const cpFields = ['resourceDigest','originDigest','originGeneration','epoch','epochDigest','sequence','payloadDigest','generation','policyDigest',
  'startMs','deadlineMs','timeHighWaterMs','usage','namespaceStatus'];
const rbFields = ['resourceDigest','originDigest','originGeneration','epoch','epochDigest','sequence','payloadDigest','generation','policyDigest',
  'requestNonceDigest','readerAuthorityDigest','writerAuthorityDigest','observedAtMs','expiresAtMs','usage'];
const payloadFields = ['version','resourceDigest','originDigest','epoch','epochDigest','sequence','priorDigest','binding','bindingDigest',
  'scopeKey','runKey','sessionKey','policyDigest','nonceDigest','event','evaluatedUpperMs','usageAfter'];
const usageFields = ['serviceRequests','storageOperations','payloadBytes'] as const;
const generation = (v: unknown): v is string => typeof v === 'string' && /^[1-9][0-9]{0,29}$/.test(v);
const usage = (v: unknown): v is Usage => exact(v, usageFields) && usageFields.every(k => uint(v[k]) && v[k] <= FIXED_LIMITS[k]);
const equalUsage = (a: Usage,b: Usage) => usageFields.every(k => a[k] === b[k]);
const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v));
function freeze<T>(v: T): T {
  if(v && typeof v==='object') { Object.values(v).forEach(freeze); Object.freeze(v); }
  return v;
}
const fixed = (code: string) => ({ code, sourceOnly: true as const, modeledAccepted: false,
  hostQualified: false as const, bodyAdmissionAuthorized: false as const, liveReady: false as const,
  authenticatedProvenance: false as const, forwardRetryAllowed: false as const, costs: 0 as const });
export function deny(code = 'GCP_CUSTODY_UNQUALIFIED') { return freeze({ ...fixed(code), quarantineRequired: true as const, quarantinePersisted: false as const }); }
const blank = (): Flags => ({ reserved:false,armed:false,opened:false,consumed:false,closed:false,revoked:false,unknown:false });
const recovery = (event: Event) => ['close','revoke','unknown'].includes(event);
function step(before: Flags, event: Event): Flags | null {
  if (!OPERATION_EVENTS.includes(event)) return null;
  const s = { ...before };
  if (!recovery(event) && (s.closed || s.revoked || s.unknown || s.consumed)) return null;
  if (event === 'reserve') { if(s.reserved) return null; s.reserved=true; }
  else if (!s.reserved) return null;
  else if (event === 'arm') { if(s.armed) return null; s.armed=true; }
  else if (event === 'open') { if(!s.armed || s.opened) return null; s.opened=true; }
  else if (event === 'consume') { if(!s.armed || !s.opened) return null; s.consumed=true; }
  else if (event === 'close') s.closed=true;
  else if (event === 'revoke') {s.closed=true;s.revoked=true;}
  else if (event === 'unknown') {s.closed=true;s.unknown=true;}
  else return null;
  return s;
}
export async function payloadDigest(value: unknown): Promise<string> { return hash(['gcp-custody-payload-v1',value]); }
export function recordKey(resource: string,epoch: number,sequence: number) { return `anchors/${resource}/epoch-${epoch}/sequence-${sequence}.json`; }
function shape(raw: unknown): raw is Input {
  if (!exact(raw,['binding','checkpoint','history','historyState','readback','command','clock','concurrentCallers'])
    || !validBinding(raw.binding) || !exact(raw.checkpoint,cpFields) || !exact(raw.readback,rbFields)
    || !exact(raw.command,['event','nonceDigest','bindingDigest','policyDigest','expectedSequence'])
    || !exact(raw.clock,['lowerMs','upperMs','monotonicElapsedMs']) || !Array.isArray(raw.history)
    || raw.history.length > FIXED_LIMITS.maxRecords || !uint(raw.concurrentCallers) || raw.concurrentCallers < 1 || raw.concurrentCallers > FIXED_LIMITS.callers) return false;
  const i=raw as Input,c=i.checkpoint,r=i.readback;
  if(![c.resourceDigest,c.originDigest,c.epochDigest,c.payloadDigest,c.policyDigest,r.resourceDigest,r.originDigest,r.epochDigest,
    r.payloadDigest,r.policyDigest,r.requestNonceDigest,r.readerAuthorityDigest,r.writerAuthorityDigest,
    i.command.nonceDigest,i.command.bindingDigest,i.command.policyDigest].every(digest)
    || ![c.epoch,c.sequence,c.startMs,c.deadlineMs,c.timeHighWaterMs,r.epoch,r.sequence,r.observedAtMs,r.expiresAtMs,
      i.clock.lowerMs,i.clock.upperMs,i.clock.monotonicElapsedMs,i.command.expectedSequence].every(uint)
    || !usage(c.usage) || !usage(r.usage) || !OPERATION_EVENTS.includes(i.command.event)
    || !['active','retired'].includes(c.namespaceStatus) || !['complete','missing','noncurrent','conflict'].includes(i.historyState)
    || !generation(c.originGeneration) || !generation(r.originGeneration)
    || !(c.generation===null || generation(c.generation)) || !(r.generation===null || generation(r.generation))) return false;
  return i.history.every(row=>exact(row,['payload','payloadDigest','generation']) && digest(row.payloadDigest) && generation(row.generation)
    && exact(row.payload,payloadFields) && validBinding(row.payload.binding) && row.payload.version===1
    && [row.payload.resourceDigest,row.payload.originDigest,row.payload.epochDigest,row.payload.priorDigest,row.payload.bindingDigest,
      row.payload.scopeKey,row.payload.runKey,row.payload.sessionKey,row.payload.policyDigest,row.payload.nonceDigest].every(digest)
    && [row.payload.epoch,row.payload.sequence,row.payload.evaluatedUpperMs].every(uint)
    && OPERATION_EVENTS.includes(row.payload.event) && usage(row.payload.usageAfter));
}
export type AppendPlan = { payload: Payload; payloadDigest: string; flagsAfter: Flags; usageAfter: Usage;
  append: { objectKey: string; ifGenerationMatch: 0; payloadJson: string };
  requiredReads: { objectKey: string; ifGenerationMatch: string }[];
  reservationKeys: { scopeKey: string; runKey: string; sessionKey: string };
  accounting: { knownStorageOperations: number; versionReconciliationOperations: null; providerCostBoundQualified: false };
  mutableHeadAuthority: false; multiObjectAtomicityClaimed: false; executionEnabled: false };

export async function planAppend(raw: unknown): Promise<ReturnType<typeof deny> | (ReturnType<typeof fixed> & { plan: AppendPlan })> {
  try {
    if(!shape(raw)) return deny('GCP_INPUT_INVALID');
    const i=clone(raw); // All caller metadata captured before FIRST await.
    const c=i.checkpoint,r=i.readback,cmd=i.command,clock=i.clock;
    if(i.historyState!=='complete' || c.namespaceStatus!=='active' || c.sequence!==i.history.length
      || c.sequence>=FIXED_LIMITS.maxRecords || c.deadlineMs<=c.startMs || c.deadlineMs-c.startMs>FIXED_LIMITS.durationMs
      || c.timeHighWaterMs<c.startMs || c.timeHighWaterMs>=c.deadlineMs) return deny('GCP_HISTORY_OR_NAMESPACE_UNRESOLVED');
    if(c.resourceDigest!==i.binding.resourceBindingDigest || cmd.expectedSequence!==c.sequence || cmd.policyDigest!==c.policyDigest
      || ['resourceDigest','originDigest','originGeneration','epoch','epochDigest','sequence','payloadDigest','generation','policyDigest'].some(k=>
        c[k as keyof Checkpoint]!==r[k as keyof Readback]) || !equalUsage(c.usage,r.usage)
      || r.requestNonceDigest!==cmd.nonceDigest || r.readerAuthorityDigest===r.writerAuthorityDigest) return deny('GCP_CHECKPOINT_READBACK_MISMATCH');
    if(clock.lowerMs>clock.upperMs || clock.upperMs-clock.lowerMs>FIXED_LIMITS.clockUncertaintyMs
      || clock.lowerMs<c.timeHighWaterMs || r.observedAtMs<c.timeHighWaterMs || clock.lowerMs<r.observedAtMs || clock.upperMs>=r.expiresAtMs
      || clock.upperMs-r.observedAtMs>FIXED_LIMITS.readbackAgeMs || clock.upperMs>=c.deadlineMs
      || clock.monotonicElapsedMs>=c.deadlineMs-c.startMs || !uint(c.startMs+clock.monotonicElapsedMs)
      || c.startMs+clock.monotonicElapsedMs<clock.lowerMs || c.startMs+clock.monotonicElapsedMs>clock.upperMs
      || (!recovery(cmd.event) && (clock.lowerMs<i.binding.windowStartMs || clock.upperMs>=i.binding.grantDeadlineMs))) return deny('GCP_TIME_UNCERTAIN_OR_EXPIRED');
    const k=await keys(i.binding);
    if(cmd.bindingDigest!==k.bindingDigest) return deny('GCP_BINDING_MISMATCH');
    let prior=c.originDigest, flags=blank(), previousTime=c.startMs;
    let priorUsage: Usage={serviceRequests:0,storageOperations:0,payloadBytes:0};
    const nonces=new Set<string>();
    for(let index=0;index<i.history.length;index++) {
      const row=i.history[index],p=row.payload,pk=await keys(p.binding);
      if(p.sequence!==index+1 || p.priorDigest!==prior || p.resourceDigest!==c.resourceDigest || p.originDigest!==c.originDigest
        || p.epoch!==c.epoch || p.epochDigest!==c.epochDigest || p.policyDigest!==c.policyDigest
        || p.bindingDigest!==k.bindingDigest || p.bindingDigest!==pk.bindingDigest || p.scopeKey!==pk.scopeKey
        || p.runKey!==pk.runKey || p.sessionKey!==pk.sessionKey || p.evaluatedUpperMs<previousTime || p.evaluatedUpperMs>c.timeHighWaterMs
        || (!recovery(p.event) && (p.evaluatedUpperMs<p.binding.windowStartMs || p.evaluatedUpperMs>=p.binding.grantDeadlineMs))
        || p.usageAfter.serviceRequests<priorUsage.serviceRequests+2 || p.usageAfter.storageOperations<priorUsage.storageOperations+index+3
        || p.usageAfter.payloadBytes<priorUsage.payloadBytes+FIXED_LIMITS.recordBytes || nonces.has(p.nonceDigest)
        || await payloadDigest(p)!==row.payloadDigest || new TextEncoder().encode(JSON.stringify(p)).length>FIXED_LIMITS.recordBytes) return deny('GCP_HISTORY_INVALID');
      const next=step(flags,p.event); if(!next)return deny('GCP_HISTORY_SEQUENCE_INVALID');
      flags=next;prior=row.payloadDigest;previousTime=p.evaluatedUpperMs;priorUsage=p.usageAfter;nonces.add(p.nonceDigest);
    }
    if(prior!==c.payloadDigest || (i.history.length===0 ? c.generation!==null : c.generation!==i.history.at(-1)!.generation)
      || usageFields.some(key=>c.usage[key]<priorUsage[key]) || nonces.has(cmd.nonceDigest)) return deny('GCP_REPLAY_OR_HIGH_WATER_REGRESSION');
    const next=step(flags,cmd.event); if(!next)return deny('GCP_RESERVATION_OR_ATTEMPT_SPENT');
    // Known plan: origin + every history read + append + fresh readback.
    // Version-history reconciliation has UNKNOWN cost, so this is not a provider
    // upper bound or permission to dispatch. Durable admission remains absent.
    const knownStorageOperations=i.history.length+3;
    const after: Usage={serviceRequests:c.usage.serviceRequests+2,storageOperations:c.usage.storageOperations+knownStorageOperations,
      payloadBytes:c.usage.payloadBytes+FIXED_LIMITS.recordBytes};
    if(!usage(after) || (!recovery(cmd.event) && (after.serviceRequests>FIXED_LIMITS.serviceRequests-FIXED_LIMITS.recoveryRequests
      || after.storageOperations>FIXED_LIMITS.storageOperations-FIXED_LIMITS.recoveryOperations
      || after.payloadBytes>FIXED_LIMITS.payloadBytes-FIXED_LIMITS.recoveryPayloadBytes))) return deny('GCP_BUDGET_RESERVED_OR_EXHAUSTED');
    const payload: Payload={version:1,resourceDigest:c.resourceDigest,originDigest:c.originDigest,epoch:c.epoch,epochDigest:c.epochDigest,
      sequence:c.sequence+1,priorDigest:prior,binding:clone(i.binding),bindingDigest:k.bindingDigest,scopeKey:k.scopeKey,
      runKey:k.runKey,sessionKey:k.sessionKey,policyDigest:c.policyDigest,nonceDigest:cmd.nonceDigest,event:cmd.event,
      evaluatedUpperMs:clock.upperMs,usageAfter:after};
    const encoded=JSON.stringify(payload);
    if(new TextEncoder().encode(encoded).length>FIXED_LIMITS.recordBytes)return deny('GCP_PAYLOAD_TOO_LARGE');
    return freeze({...fixed('GCP_MODELED_APPEND_ONLY'),modeledAccepted:true,plan:{payload,payloadDigest:await payloadDigest(payload),flagsAfter:next,usageAfter:after,
      append:{objectKey:recordKey(c.resourceDigest,c.epoch,payload.sequence),ifGenerationMatch:0,payloadJson:encoded},
      requiredReads:[{objectKey:`namespaces/${c.resourceDigest}/origin.json`,ifGenerationMatch:c.originGeneration},
        ...i.history.map(row=>({objectKey:recordKey(c.resourceDigest,c.epoch,row.payload.sequence),ifGenerationMatch:row.generation}))],
      reservationKeys:{scopeKey:k.scopeKey,runKey:k.runKey,sessionKey:k.sessionKey},
      accounting:{knownStorageOperations,versionReconciliationOperations:null,providerCostBoundQualified:false},
      mutableHeadAuthority:false,multiObjectAtomicityClaimed:false,executionEnabled:false}});
  } catch { return deny('GCP_MODEL_REJECTED'); }
}

// Outcomes never acknowledge an authenticated commit. Unknown/conflicting writes
// require independent reconciliation and persistent quarantine; no slot release.
export function classifyWriteOutcome(outcome: unknown) {
  try {
    if(!exact(outcome,['status']) || !['response-received','lost-response','precondition-failed','missing','conflict'].includes(outcome.status as string)) return deny('GCP_OUTCOME_INVALID');
    return deny(outcome.status==='response-received'?'GCP_INDEPENDENT_READBACK_REQUIRED':'GCP_WRITE_AMBIGUOUS_QUARANTINE');
  } catch { return deny('GCP_OUTCOME_INVALID'); }
}
// No proof callback/boolean/receipt hash can construct authenticated continuity.
export function authorizeProductionCustody(..._untrusted: unknown[]) { return deny(); }
