# CAD Auth sealed collection card preparation

This packet is source-only and non-executable. It proposes the later collection
approval text for `cad-auth-live-evidence-acceptance-v1`. A passing checker proves
local preparation integrity only. It never accepts live evidence or opens a gate.

The candidate is main commit `0d5ae30935f399c7f3e08b7fd05b8f12dc10489d`.
GitHub deployment 6623661776 maps that commit to the immutable Vercel deployment
`dpl_S2p5mUfjMnCHy9etD23Un4gNT4iy`. Read-only deployment and production alias
metadata observed on September 23, 2026 confirmed production/READY. This is a
metadata snapshot; it does not prove installed Auth or instrumentation behavior.
The historic verifier candidate remains transitively bound by the unchanged parent
packets; this preparation candidate identifies the newer full source snapshot.

The proposed September 24, 2026 window is 06:00–06:30 UTC. Expiry never rolls over
automatically. Recheck the target and window at Captain review and immediately
before any separately approved collection. Drift or an expired window requires a
new packet, digest, review and approval. The offline checker intentionally remains
deterministic after expiry; passing it is never freshness or execution authority.

## Hash boundaries

`payload.acceptancePacketSha256` hashes the exact acceptance JSON file bytes.
`seal.sha256` hashes the complete preparation payload using recursive sorted JSON
object keys, preserved array order, UTF-8 and no trailing newline. It excludes the
seal and approval envelope to avoid self-reference. That payload includes the
source file digests, schedule and limits digests, exact limits, target, proposed
references, window and stop controls. The checker compares the entire envelope
against the independently reconstructed expected packet, including the exact
phrase. The preparation file byte hash is a separate artifact transport digest;
it is not the semantic sealed payload hash named in the phrase.

## References and remaining gates

The cohort, custodian, independent reviewer and restricted store are exact opaque
PROPOSED references supplied for source preparation. No verified receipts or
person assignments exist in this packet. Distinct reference strings alone do not
prove reviewer independence. The Captain must verify actual synthetic ownership,
separate setup authority and receipts, custody acceptance, seven-day retention,
reviewer independence, and the restricted store before presenting approval.

Concrete provider policy, deployed source versions, installed earliest-boundary
body instrumentation, platform buffering, observer and durable run ledger reviews
remain blocked. Local source implementations and proposed names cannot satisfy
those prerequisites. Null receipts remain unobserved, never successful or zero.

`futureApproval.exactPhrase` is fully populated for review but NOT ACTIONABLE.
Neither this PR nor copying the phrase changes that. The Captain must first review
and accept every binding and the user must separately approve the exact packet.
This source checker has no executable, approved, accepted, live, retry or run mode.

Stop controls bind the existing unreviewed runbook and every plan stop condition,
plus budget exhaustion. Unknown results consume the run. Stop cancels pending
reads, invalidates authority, prevents later grants and retains only sanitized
partial evidence. Provider rollback, deployment rollback, deletion and remediation
require separate authority. Missing observer or consumed-run ledger proof blocks
collection; post-stop diagnostics and resumed attempts are forbidden.

No live Auth/provider tests, provider/environment/resource/billing changes, secrets
or secret reads, upload sessions, production upload activation, request body
admission/read, conversion, Sandbox dispatch, private CAD, real-user commercialization,
external messages, second run, retry, executable command-card issuance, runtime
activation or commercial-readiness claim is authorized. The packet includes no
command lines, credential values, account records or request data.

## Local validation

The preparation checker supports validation and local artifact regeneration only.
Its tests exercise every field mutation/deletion, source drift, nested private
fields, getter avoidance, digest reproducibility and forbidden CLI modes.
The CAD source audit and offline contract manifest govern all preparation files.
Adjacent CAD Auth evidence tests must also pass. No live or customer-data smoke
is part of this preparation gate. Draft PR review is the next step; merge,
deployment and cleanup remain Captain decisions outside this implementation lane.
