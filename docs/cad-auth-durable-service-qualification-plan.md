# CAD Auth durable service qualification plan

This is a source-only plan. It neither qualifies a service nor supplies a production binding. The durable service source remains unresolved. Stop after local preparation and validation; do not discover private sources or contact a provider. A passing checker proves integrity of this plan, not durable behavior.

Base source: `6b7d6aa8ed8e17f1943feefbefbae2ecaa7c289a`.
Historical execution-gap closure packet: `62052cae429117761a772c2c97b020cc1c2624d0a34d94e2086aa7e63142248d`.
Historical deployment reference: `https://vercel.com/vsillahs-projects/reversr/2B55YRv9bQhvV8pr2SxMMSWtC2hM`. This has not been rechecked and is not current deployment evidence.

## Durable service reference contract

A later private evidence review must identify exactly one existing service using a secret-free descriptor with these required fields, no additional fields, no nulls, and no placeholders:

| Field | Required value / meaning |
| --- | --- |
| schemaVersion | Integer `1` |
| durableServiceReference | User-designated opaque `rrb-ref:` reference; immutable identity, not a URL, credential, or callable capability |
| ownerReference | Opaque reference to the accountable owner and authority record |
| implementationSourceReference | User-designated private source reference; no automatic discovery |
| implementationSourceSha256 | Lowercase SHA-256 of exact reviewed source archive bytes |
| implementationCommit | Full 40-character lowercase Git SHA |
| serviceRevisionReference | Immutable version/build reference of the existing deployed service |
| environmentReference | Opaque exact environment reference; staging and production must never be interchangeable |
| durableStoreReference | Opaque store identity, shared across all workers and restarts |
| ledgerNamespaceReference | Exact opaque ledger namespace identity |
| atomicityContractSha256 | Digest of the reviewed transaction/consistency contract |
| expiryRevocationContractSha256 | Digest of the reviewed independent expiry/revocation contract |
| receiptSchemaSha256 | Digest of the full reviewed receipt schema |

Opaque references match `^rrb-ref:[A-Za-z0-9][A-Za-z0-9._:-]{0,119}$`. They confer no access or authority. Digests match `^[a-f0-9]{64}$`. The descriptor binds identity and source; it does not instantiate `durableService`, configure a provider, or establish that the referenced service exists. Private custody retains the reference-to-source mapping. Repository projections contain only separately approved non-sensitive summaries and digests. A missing or conflicting mapping blocks review.

## Capabilities and evidence required

The later reviewer must map each method below to immutable implementation source, transaction semantics, and independently attributable existing receipts. Method presence, a resolved Promise, `ok: true`, in-memory Sets, and synthetic test success are insufficient. Each existing evidence item must carry an opaque evidence reference, exact-byte SHA-256, evidence kind (`source-review` or `existing-service-receipt`), immutable service revision, environment/store/namespace identity, observation UTC, observer/reviewer references, custody reference, and known outcome. Receipt provenance must be authenticated against the owner-designated source without reading secrets. Missing provenance blocks qualification.

Every runtime receipt must bind `operation`, `ok: true`, `commandCardSha256`, `deploymentReference`, `sessionId`, and `runFenceKey`. The runtime currently requires the following additional fields; qualification must also prove their semantics rather than copying these booleans into a fixture:

| Method | Required receipt fields and evidence |
| --- | --- |
| verifyApproval | `explicitLiveGateApproved: true`, exact `startUtc`, `expiresUtc`, `cohortRef`; later explicit live authority only, never this plan's phrase |
| verifyDurableEvidence | `evidenceSha256`, `independentExpiryEnforced: true`, `atomicClaims: true`, `durableRollbackEnforced: true`; must match the reviewed digest |
| recheckDeployment | `immutableCurrent: true`; immutable target and source commit agree before opening and again before fence opening |
| verifyClosedBaseline | `failClosed: true`; attributable baseline and zero-effect observer evidence |
| claimRun | `claimed: true`, `durable: true`, `expiryCheckedAtomically: true`; atomic globally shared single-winner claim |
| armRollback | `armed: true`, exact `expiresUtc`, `durable: true`, `expiryCheckedAtomically: true`; cleanup survives caller death |
| verifySession | `bounded: true`, exact `boundedSessionRef`, `cohortRef`, `expiresUtc`, `concurrentSessions: 1`; private identity mapping attested by service |
| claimAttempt | `claimed: true`, `durable: true`, `expiryCheckedAtomically: true`; one globally shared attempt |
| openFence | `open: true`, exact `expiresUtc`, `durable: true`, `expiryCheckedAtomically: true`; no opening with stale/revoked/unknown state |
| consumeAttempt | `consumed: true`, `durable: true`, `expiryCheckedAtomically: true`; irreversible consumption before any body permission |
| closeFence | `closed: true`, `durable: true`; idempotent closure remains possible after expiry |
| revokeSessionAndLateGrants | `revoked: true`, `durable: true`; rejects delayed grants across workers/restarts |
| postRollbackSmoke | `failClosed: true`, `bodyReads: 0`, `sessionGrants: 0`, `fenceClosed: true`; independent observer counters, not HTTP responses alone |

Required evidence cases: concurrent independent workers with at most one winner; process restart after committed claim; response loss after committed mutation; expiry at the exact boundary and during the last await; clock regression/untrusted clock; owner lease expiry and caller crash; stale revisions; namespace changes; wrong session/cohort/user/shop; deployment drift; delayed grant after revocation; each cleanup failure with all cleanup operations attempted. Unknown outcomes remain spent and closed with no retry. Globally scoped `runFenceKey` is `cad-production-internal-opening-v1`; changing deployment, card, process, or session cannot reset that global fence. Attempt and session ledger keys must be bound to this run and the exact private identity, with maximum one session and one attempt. Evidence must prove durable commits and conditional writes/transactions, not a local proposal model.

The private/source-only gate may inspect only already-existing, specifically authorized non-secret source/evidence bytes. It must not run these cases against a service or create missing receipts. If existing evidence is insufficient, return BLOCKED with the missing evidence categories. Even a complete source/evidence review leaves `liveDurableServiceQualified: false` until a separately authorized live qualification gate establishes current service behavior. Existing historical smoke does not satisfy a future opening's baseline or post-rollback smoke.

## Bounded session binding

Use `rrb-ref:cad-upload-internal-mark-test-session-v1` and cohort `rrb-ref:cad-upload-internal-mark-test-cohort-v1`. Private evidence maps the session reference to exactly one existing session ID, user ID, shop ID, cohort, immutable service revision, environment, and durable ledger keys. Bind the reviewed source commit, service descriptor digest, evidence digest, immutable deployment reference, production origin `https://reversr.vercel.app`, route `POST /api/cad/user-import`, and later command-card digest. No session is issued by either this plan or the private review gate.

A later live window must use canonical UTC timestamps, start inclusive and expiry exclusive, with positive duration at most 30 minutes. Session expiry and owner lease cannot exceed window expiry. Trusted independent expiry checks and atomic store checks precede every forward effect; recheck after each await including final consumption. Cleanup must still work when the clock is invalid or the window has expired. Forward limits: one session, one attempt, zero retries, zero second runs. All context mismatch, revocation, drift, or unknown outcome closes admission. The production wrapper's local guards support this contract but cannot substitute for globally durable service enforcement.

## Durable evidence digest inputs

The future private evidence envelope is a closed schema with these exact top-level keys:
`schemaVersion`, `reviewScope`, `planPacketSha256`, `executionGapClosurePacketSha256`, `reviewedSourceCommit`, `serviceDescriptor`, `capabilityEvidence`, `sessionBindingEvidence`, `atomicityEvidence`, `expiryRevocationEvidence`, `rollbackEvidence`, `deploymentEvidence`, `custody`, `reviewDecision`.

`schemaVersion` is 1; `reviewScope` is `private-source-only-existing-evidence`; `reviewDecision` can only be `SOURCE_REVIEW_COMPLETE_LIVE_UNQUALIFIED` or `BLOCKED`. The descriptor follows the table above. `capabilityEvidence` maps exactly the thirteen methods above to nonempty arrays of evidence items with the provenance fields defined above. Each other evidence category is a nonempty array of those evidence items; custody binds the owner, observer, reviewer, and authorized private source references. No synthetic receipt is accepted as an existing-service receipt. Do not include tokens, cookies, credentials, CAD payloads, raw personal identity values, private paths, or executable commands in a projection.

Digest construction: reject duplicate JSON keys, non-plain JSON values, unknown schema fields, missing fields, unresolved references, non-integer numeric fields, and non-finite numbers. Recursively sort object keys by Unicode code point; retain array order (sort evidence arrays by unique evidence reference before serialization); encode JSON with no whitespace and UTF-8 without BOM or trailing newline. Compute SHA-256 of these bytes. Hash source archives and receipts separately as exact original bytes; include their digests in the envelope. Archive the exact canonical envelope bytes privately so the digest is reproducible. A digest proves byte identity, not truth or authorization. This plan does not implement the private envelope reviewer or read evidence. Its checker validates only the plan and source bindings.

Avoid a digest cycle: the envelope binds this plan and closure packet, not a future executable card or its own digest. A future card binds the completed evidence digest, and a separate session/card binding record binds both. A later live-qualified evidence envelope needs a separately reviewed schema and fresh authority; the private review digest cannot be represented as live qualification.

## Post-merge refresh and stop rules

There is no merge authorization in this gate. After a separately approved merge, produce a new source-only refresh record containing the exact merged commit, this plan's exact-byte packet digest, historical closure digest, every bound file's new exact-byte digest, and prior/new evidence digests with reasons for any change. Re-run this plan checker and the closure checker/tests. Preserve immutable historical packets; do not rewrite them to manufacture continuity. Changed contract/runtime/source bindings require a reviewed successor packet and refreshed approval before proceeding. No self-commit digest cycle: the packet records its inspected base; the later refresh records the commit containing the packet.

Any future deployment binding must be refreshed from separately authorized evidence tying immutable deployment ID to merged commit. The historical URL above is not enough. A local refresh cannot prove deployment state. Stale private receipts require renewed private review; missing current live evidence requires a separately authorized live gate. Neither is silently recollected. The source-only phrase must be regenerated from the exact final plan bytes after any plan change.

Stop on a failing local check; unknown outcome; unresolved service source/ownership; missing or unverifiable provenance; source/receipt/digest/target drift; unbound session or namespace; absent independent expiry, atomicity, crash cleanup, revocation, or observer evidence; or any need for credentials, secret reads, runtime access, provider configuration, new live evidence, or executable command-card issuance. Report the missing item and leave production closed. Do not retry a live operation or infer success.

All provider/env/resource/billing changes, secret reads, upload-session issuance, production upload activation, body admission/read, conversion, Sandbox dispatch, private CAD use, live evidence collection, runtime activation, live command-card issuance, external messages, retry, second live runs, commercialization and readiness claims remain prohibited. Public push, PR creation, merge, deployment, and production smoke are outside this gate.

## Next approval

The local checker prints the exact next phrase using the final plan packet SHA-256. Only the two user-owned private references remain placeholders. Replace them with opaque references to one service and its explicitly designated existing non-secret source/evidence set. An unresolved placeholder is not approval. Review remains blocked if those references cannot be resolved within the granted source-only scope. This phrase grants no live qualification, command execution, private CAD access, or runtime authority.

## Local validation provenance

The adapter packet is historical: its bound router differs from the current source. The repaired adapter tests validate the unchanged packet against Git revision `00fd71d76430123c220af25e85d37ecba802b7b0`, inject drift into every historical bound source, and require the current-checkout checker/CLI to reject the stale packet with zero effects. This requires that revision in local Git history; no history is fetched automatically. Historical acceptance is not current service qualification. The qualification plan binds the repaired test separately without rewriting historical packets.
