# CAD Auth stop and rollback source runbook

Status: source runbook awaiting independent review. No executable rollback or live runner.

1. Before any future collection, bind the reviewed source commits, immutable deployment,
   provider/version policy, synthetic alias mapping, lifecycle setup receipts, custodian,
   independent reviewer, restricted store and retention/deletion receipt. Unresolved fields
   block collection. A plan's historical deployment and window do not fill these fields.
2. Review every stop condition in the generated packet. Stop on missing prerequisites,
   a window boundary, source/target drift, identity outside the cohort, credential/account
   leakage, any body access or parser invocation, issuance/write attempt, unexpected
   authority, cancellation/deadline failure, unknown outcome, case failure or retry request.
3. A future collector must abort pending reads, consume the one authorized attempt in a
   durable ledger, and suppress late grants. A settled observer must account for pending
   SDK/HTTP work and report unresolved cancellation as unknown, never success. The current
   rehearsal has no remote work and cannot provide this live evidence.
4. Retain only validated, allowlisted partial evidence in the restricted store. Sanitize
   before hashing. Never retain raw credentials, headers, exception payloads, account
   records or CAD. A partial result cannot become a passing complete receipt set.
5. The custodian and independent reviewer reconcile timestamps, coverage and counters,
   record disposition, and confirm deletion at the approved seven-day retention boundary.
   Public projection requires separate review; this packet publishes no live receipts.
6. Keep upload/session/body/conversion gates closed. Do not automatically revert a
   deployment, change a provider, rotate credentials, mutate an account or resend a run.
   Record the sanitized failure code and exact source/target reference in the Captain lane.
   Any remediation affecting provider, environment, resources or runtime requires separate
   explicit scope. No retry or second run follows from the original approval.

Required future references: `stopRunbookRef`, `lateGrantObserverRef`,
`partialEvidencePolicyRef`, `remediationEscalationRef`, and independent review receipt.
All remain unbound. This source document neither installs a stop controller nor supplies
rollback permission. Runtime is unchanged, so this slice has no runtime rollback action.
