# CAD Auth durable-service qualification review plan

Status: source-only review plan prepared. This packet defines the later private durable-service qualification evidence review. It does not perform that review, qualify the durable service, activate uploads, issue sessions, bind production execution, or read new private evidence.

## Bound private inputs

The plan is bound to the accepted repaired inventory review `3e18bdf6c31901ea172997c0ea155ba101676af9a1c60a4db827c12d6c79f181` and review receipt `02657eeff430a73599fc4c2d74fe0f97f10bcb1d6b7c4e039535fe00f8cf44ff`. Those private records accepted nine repaired inventory entries as source-only qualification-review inputs, including the repaired `sessionBindingEvidence` replacement. This packet records only those digests and accepted-count facts; it does not read the private inventory again.

The preceding public source-only gap plan is `65c99719c70a688fd5a893c115c813b409e0277473c6d3b4a1b37f1f43d2b256`. The opaque references remain:

- Source evidence set: `rrb-ref:cad-auth-durable-service-source-evidence-set-20260928T161754Z`
- Durable service: `rrb-ref:cad-auth-durable-service-20260928T161754Z`

Opaque references are not paths, credentials, endpoints, provider values, runtime bindings, or proof that a service is qualified.

## Later semantic review scope

The later private review may examine only the exact repaired inventory artifacts already accepted as source-only review inputs. Its job is to determine whether existing non-secret source and evidence satisfy the durable-service qualification requirements. It must not create, collect, mutate, deploy, activate, or retry anything.

The semantic review must verify:

- Exact packet and receipt digests match the repaired inventory review bindings.
- Every artifact digest and byte count matches the accepted repaired inventory.
- Provenance, custody, and owner authorization are present and coherent.
- The repaired `sessionBindingEvidence` replacement is the accepted replacement, not the previously blocked entry.
- The durable service descriptor, implementation source, atomicity, expiry and revocation, rollback and observer, receipt schema and capability receipts, session binding, deployment evidence, and custody and independent review records are all present.
- All thirteen durable-service capabilities are covered: `verifyApproval`, `verifyDurableEvidence`, `recheckDeployment`, `verifyClosedBaseline`, `claimRun`, `armRollback`, `verifySession`, `claimAttempt`, `openFence`, `consumeAttempt`, `closeFence`, `revokeSessionAndLateGrants`, and `postRollbackSmoke`.
- One-session and one-attempt fences remain global, atomic, and durable.
- Expiry checks are independent and occur before every effect in the proposed later execution path.
- Rollback-first controls and post-rollback fail-closed smoke requirements remain mandatory.
- Any unknown, stale, missing, contradictory, unauthenticated, non-independent, or secret-bearing evidence blocks the whole review.

The review may produce only a private sanitized result with opaque refs, SHA-256 digests, counts, statuses, closed-control flags, blockers, and the next exact approval phrase. Public projection, branch push, PR, merge, deployment, and production smoke remain separate gates.

## Stop conditions

Stop if any evidence is missing, digest drift appears, provenance is unverifiable, the repaired session-binding replacement is not the accepted one, reviewer independence cannot be established, runtime credentials or provider configuration are needed, a file appears secret-bearing, the outcome is unknown, checks fail, or the requested operation would create live evidence or change provider/runtime state.

The only accepted private review terminal states are `PRIVATE_QUALIFICATION_REVIEW_ACCEPTED_SOURCE_ONLY_LIVE_UNQUALIFIED` and `BLOCKED_PRIVATE_QUALIFICATION_REVIEW`. The accepted state still leaves `liveDurableServiceQualified` false and `productionExecutionBinding` null. A separate source-only projection and later live gate would be required before any production-opening path could use this evidence.

## Prohibited effects

Provider, environment, resource, billing, and secret changes are prohibited. Upload-session issuance, production upload activation, request-body admission or reads, conversion, Sandbox dispatch, private CAD use, live evidence collection, runtime activation, executable command-card issuance, external messages, retry, second live run, deployment, production smoke, real-user commercialization, and commercial-readiness claims are prohibited.

## Validation

Run `node scripts/cad-auth-durable-service-qualification-review-plan-checker.js` and `node --test scripts/cad-auth-durable-service-qualification-review-plan.test.js scripts/cad-auth-durable-envelope-gap-plan.test.js scripts/cad-auth-durable-service-reference-prep.test.js scripts/cad-auth-durable-service-qualification-plan.test.js`.
