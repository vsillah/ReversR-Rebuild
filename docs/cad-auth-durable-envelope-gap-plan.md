# CAD Auth durable-service evidence envelope gap-closure plan

Status: source-only preparation complete; evidence supply pending. This plan defines a missing evidence envelope. It does not supply that envelope, verify private evidence, qualify a service, or establish runtime authority. Production remains disabled and `productionExecutionBinding` remains null.

## Bound inputs and provenance

The manifest fixes qualification plan packet `74046ecfdbe962eac29bb55351cd38ca84b13838c3e543e6c2e803beac959378`, reference-prep packet `cfccd46e250dfb2dc09c98c70bd9f640654a566086ca692b3e4f5aacbaac093f`, and supplied reference-mapping disposition digest `242df18dc43556b4dbd1144104d90ce5a9bd8926733c891fc37d9592f1fbabdd`. The disposition digest is an unverified caller-supplied binding: this lane has neither read the disposition nor verified its bytes or conclusions. It must be verified within a later specifically approved private gate.

Only the fixed repository files named by the checker and its predecessor checkers may be read. The source-evidence reference `rrb-ref:cad-auth-durable-service-source-evidence-set-20260928T161754Z` and service reference `rrb-ref:cad-auth-durable-service-20260928T161754Z` are opaque labels, not paths, endpoints, capabilities, or proof of existence. No reference resolver is implemented.

## Required existing non-secret artifacts

A custodian must designate an explicit finite inventory in private custody. Each inventory entry needs a unique opaque artifact reference, artifact kind, exact-byte SHA-256, byte length, immutable version, custody reference, and owner authorization reference. Every file must already exist; missing receipts cannot be generated under the evidence-supply gate.

| Artifact | Required content and acceptance boundary |
| --- | --- |
| Service descriptor | Exactly the thirteen descriptor fields in the bound qualification plan, including source archive digest, full implementation commit, immutable service revision, environment, store, namespace and contract digests. No unresolved placeholders. |
| Implementation source archive | Existing non-secret source at the descriptor commit, sufficient to trace all thirteen durable-service methods to persistence operations. No secrets, dependency downloads or execution. |
| Atomicity contract and evidence | Existing transaction/conditional-write contract and attributable receipts for globally shared single-winner claims, commit across restart, committed mutation with lost response, concurrent workers, and namespace/revision mismatch. |
| Expiry and revocation contract and evidence | Independent trusted clock enforcement, inclusive start/exclusive expiry, exact boundary and last-await expiry, clock regression, stale lease, delayed grants, and revocation across workers/restarts. |
| Rollback and observer evidence | Caller death and owner lease expiry; each cleanup operation failing while all remaining cleanup operations are attempted; idempotent closure after expiry; independently attributable zero body-read/session-grant counters. |
| Receipt schema and capability receipts | Full schema plus existing source-review and service-receipt evidence for each of the thirteen methods and required receipt fields in the bound plan. A boolean or synthetic fixture cannot prove durable behavior. |
| Session binding evidence | Opaque references and digest of an existing custodian attestation mapping the exact bounded session, cohort, user/shop, store/namespace and ledger keys. Raw identity values stay in separately authorized custody; never issue a session. |
| Deployment evidence | Existing immutable deployment-to-commit/service-revision/environment binding. A URL, local checkout or historical smoke alone cannot establish current deployment. No live probe. |
| Custody and independent review records | Owner authority, authorized inventory, provenance authentication method and existing verification artifact, observation timestamps, custodian attestation, and reviewer identity/decision. No credentials needed to verify provenance. |

The capability set is exactly `verifyApproval`, `verifyDurableEvidence`, `recheckDeployment`, `verifyClosedBaseline`, `claimRun`, `armRollback`, `verifySession`, `claimAttempt`, `openFence`, `consumeAttempt`, `closeFence`, `revokeSessionAndLateGrants`, `postRollbackSmoke`. Evidence must satisfy the semantics and receipt fields of the immutable qualification plan; method presence is insufficient. Global run fence is `cad-production-internal-opening-v1`. One session, one attempt, zero retry, zero second run; unknown outcomes remain spent and closed.

## Envelope shape and semantic checks for the later reviewer

Use the bound plan's closed top-level schema without adding authority fields: `schemaVersion`, `reviewScope`, `planPacketSha256`, `executionGapClosurePacketSha256`, `reviewedSourceCommit`, `serviceDescriptor`, `capabilityEvidence`, `sessionBindingEvidence`, `atomicityEvidence`, `expiryRevocationEvidence`, `rollbackEvidence`, `deploymentEvidence`, `custody`, `reviewDecision`.

`schemaVersion` is 1; scope is `private-source-only-existing-evidence`; decisions are only `SOURCE_REVIEW_COMPLETE_LIVE_UNQUALIFIED` or `BLOCKED`. Source commit must match the descriptor's full implementation commit. The plan and execution-gap digests must exactly match the bound plan. All fields are required and all objects are closed. Nulls and placeholders are invalid. The service descriptor follows the exact thirteen-field contract in the bound plan.

Each evidence item has exactly: `evidenceReference`, `sha256`, `kind`, `serviceRevisionReference`, `environmentReference`, `durableStoreReference`, `ledgerNamespaceReference`, `observedAtUtc`, `observerReference`, `reviewerReference`, `custodyReference`, `outcome`, `caseReferences`. References use the bound plan's opaque-reference syntax. SHA-256 is lowercase 64 hex. Kind is `source-review` or `existing-service-receipt`; outcome is `PASS`, `FAIL`, or `UNKNOWN`. Timestamp is a real canonical UTC instant in `YYYY-MM-DDTHH:mm:ss.sssZ` format. Case references are a nonempty unique array of opaque references to the inventory's semantic case mapping. Each capability value and each other evidence category is a nonempty evidence-item array. References must be unique within an array; reuse across categories is allowed only for identical item content and does not create independent evidence.

Custody has exactly: `ownerReference`, `custodianReference`, `observerReferences`, `reviewerReference`, `authorizedSourceEvidenceSetReference`, `inventorySha256`, `ownerAuthorizationSha256`, `custodianAttestationSha256`, `provenanceVerificationSha256`, `referenceMappingDispositionSha256`, `referencePrepPacketSha256`, `gapPlanPacketSha256`. Observer references are a nonempty unique array; reference and digest fields obey the formats above. Source-set/service references and the three predecessor/gap bindings must match this plan. Every referenced artifact must resolve within the owner-authorized inventory and every digest must match existing bytes. Independent reviewer must differ from owner, custodian and evidence observers; private custody establishes these are distinct accountable people, not merely differently spelled aliases.

A complete decision requires all items PASS, all required capability and adverse-case coverage, identity consistency across revision/environment/store/namespace, verified provenance, exact receipt semantics, and a signed or otherwise authenticated existing custodian/reviewer record. FAIL, UNKNOWN, missing evidence, unresolved mapping, missing permission or contradictory identity means BLOCKED. If the full envelope cannot be formed, produce a separate sanitized gap report with categories and reasons; never insert fabricated PASS records to satisfy the schema. A blocked envelope digest is never accepted as completed evidence. Reviewer tooling/schema implementation and any eventual live qualification remain separate gates.

## Digest construction

Before parsing, reject duplicate JSON keys. Reject missing/unknown fields, non-JSON/non-plain values, non-finite or non-integer numbers, invalid Unicode surrogate sequences, invalid timestamp/reference/digest formats and unresolved references. Normalize no text or source bytes. Sort object keys recursively by Unicode code point. Sort every evidence-item array by unique `evidenceReference`; sort unique observer/case reference arrays lexically by Unicode code point. Preserve any other array order. Serialize JSON without whitespace; encode UTF-8 without BOM or trailing newline; hash SHA-256. Preserve exact canonical envelope bytes privately. Source archives, receipts and custody records have independent exact-original-byte digests, not reserialized digests.

Inventory entries are sorted by artifact reference before canonicalization under the same rules. The inventory and existing attestations precede the envelope; none may bind the final envelope digest, preventing a cycle. The envelope binds the final gap-plan packet digest through custody; it never binds its own digest or a future executable card. A later separately authorized card may bind the envelope digest. Digests establish byte identity only, never truth, authority or live qualification.

## Custodian handoff and next gate

1. Owner designates an existing non-secret inventory under the exact opaque source-set reference, retaining private paths outside Git and public reports.
2. Custodian checks that the artifacts already exist, are non-secret, and can be authenticated without credentials or live calls. Report missing categories instead of collecting replacements.
3. Vambah reviews the final packet digest and exact evidence-supply approval phrase emitted by the local checker. Merely printing that phrase is not approval.
4. Only after that explicit approval, accept the custodian-designated existing evidence in private custody. The supply gate does not authorize Codex to inspect the supplied contents; a subsequent exact-inventory/digest-bound private-review approval is required before reading them.
5. If supplied, prepare only a non-sensitive inventory receipt and proposed bounded review scope. Keep raw files, private mappings, identifying data and envelope bytes out of the repository, PR and public tools. Any repository projection needs separate explicit approval.

Stop on unresolved ownership/mapping, missing source or receipt, provenance failure, digest/source/target drift, FAIL/UNKNOWN outcome, inconsistent identity, failing checks, or a need for credentials, secrets, provider access, new evidence collection, or runtime execution. Do not expand scope or retry live work. Changed plan bytes require a regenerated phrase and renewed approval. Historical packets remain immutable.

All provider/env/resource/billing changes, secret reads, upload-session issuance, production upload activation, request-body admission/read, conversion, Sandbox dispatch, private CAD use, live evidence collection, runtime activation, executable command-card issuance, external messages, live retry, second live run, real-user commercialization and commercial-readiness claims are prohibited. Current authorization permits only these source-only artifacts, local validation, a scoped branch push and draft PR; no merge, deployment, production smoke or cleanup.

## Validation and limits

Run `node scripts/cad-auth-durable-envelope-gap-plan-checker.js` and `node --test scripts/cad-auth-durable-envelope-gap-plan.test.js scripts/cad-auth-durable-service-reference-prep.test.js scripts/cad-auth-durable-service-qualification-plan.test.js`. The checker validates the static plan and fixed repository-source bindings only. It accepts no evidence path, endpoint, or execution mode. Its success is never envelope acceptance or evidence qualification. No runtime, UI, production or live-service testing is part of this lane.
