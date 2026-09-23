# CAD Auth live-evidence acceptance requirements

Status: source-only; live review and collection blocked. Parent PR #391 merged at
`b826e3c7572c914235e552dee2d76623ed107d13`. This packet defines the evidence and
independent review needed after the prerequisite completion packet. It records
no acceptance decision. Passing validation means exact source requirements match;
it cannot establish provider readiness, actual route safety or commercial readiness.

The [JSON packet](cad-auth-live-evidence-acceptance.json) carries eight exact
categories: provider policy, route/body installation, immutable target, synthetic
cohort lifecycle, custody/reviewer disposition, late-grant observer, stop/rollback,
and collection approval. Each lists required evidence with null references and
`NOT_COLLECTED` disposition. Every live authority and acceptance claim stays false.
The checker validates the parent transitively and binds this guide, tests and
checker by digest. Added fields, changed requirements, filled receipts, missing
sources and source drift fail closed. There is no promotion or live mode.

## Review order and evidence distinction

1. Captain reviews source requirements and the draft PR. This lane stops before
   merge, deployment or cleanup.
2. Separate implementation/setup review supplies concrete provider policy,
   collector/validator, installed route guard and observer, exact immutable target,
   restricted cohort mapping, distinct custody/reviewer roles and stop controls.
   Collection authority cannot authorize installation, credentials or setup changes.
3. Before collection, review setup receipts, scheduled before/after lifecycle
   observations, teardown plan and separate authority. Teardown and deletion
   completion receipts belong to post-run review; they cannot be fabricated as
   pre-run evidence. A dead credential alone cannot prove a lifecycle transition.
4. Only a separate reviewed artifact may seal the exact source, target, schedule,
   limits, custody and fresh UTC window. Its independent review must resolve all
   missing prerequisites before asking for live collection approval.
5. Future evidence must distinguish provider observations, injected composition
   faults, inspection and local replay. Every original production-verifier
   acceptance category needs independent disposition. Missing or unknown evidence
   blocks acceptance. Evidence acceptance cannot enable runtime or body admission.

The actual user-import route consumes upload-session credentials. Candidate login
bearer observations cannot establish that route's positive path. Keep body
admission false and classify unexercisable claims as blocked. Null body counters
mean unobserved; bodyless requests and client traces do not prove platform buffering
or nonempty-stream safety. No payload canary is authorized.

## Future human gate

The exact template below is review text, not a command or current approval request.
All placeholders must be replaced in a separate reviewed sealed card. The packet
hash refers to the final committed JSON bytes; it is deliberately not self-filled.
The template itself, historical phrases, and generic approval grant no authority.

> Approve one read-only synthetic CAD Auth evidence collection for acceptance packet cad-auth-live-evidence-acceptance-v1, reviewed packet SHA-256 <packetSha256>, sealed card SHA-256 <sealedCardSha256>, candidate <candidateCommit>, immutable deployment <deploymentId>, schedule SHA-256 <scheduleSha256>, restricted cohort <cohortRef>, custodian <custodianRef>, independent reviewer <reviewerRef>, during <startsAtUtc> through <expiresAtUtc>. Only the sealed observations and ceilings are authorized. No setup changes, upload sessions, request-body reads, activation, retries or second run.

When prerequisites exist, the Captain must open the sealed artifact for review,
show the exact source/deployment and schedule digests, restricted role references,
and fresh UTC start/end. Vambah checks those values and sends the fully populated
phrase in the Captain task. Unfilled placeholders, unknown references or stale
windows block collection even if an approval message exists. This packet includes
no command line, executable card, runtime binding or scheduled execution.

Stop on any missing prerequisite, drift, window violation, cohort mismatch,
sensitive capture, body/parser attempt, issuance/write, unexpected authority,
deadline/cancellation failure, case failure, interruption, unknown outcome, limit
exhaustion or retry request. Consume the run, prevent new dispatch and late grant,
cancel pending reads, discard ephemeral bindings and preserve sanitized partial
evidence only. Unconfirmed settlement remains UNKNOWN. Remediation involving
credentials, provider state, environment, deployment or external messages needs
separate authority. No second run, diagnostic call or automatic rollover.

## Local validation

```sh
node scripts/cad-auth-live-evidence-acceptance-checker.js
node --test scripts/cad-auth-live-evidence-acceptance.test.js scripts/cad-auth-live-evidence-prereq-completion.test.js scripts/cad-auth-live-evidence-prereq.test.js scripts/cad-auth-sealed-setup.test.js scripts/cad-auth-sealed-evidence-card.test.js scripts/cad-auth-live-evidence-plan.test.js scripts/cad-production-auth-verifier-acceptance.test.js scripts/cad-production-verifier-candidate.test.js scripts/cad-production-session-verifier-binding.test.js
node scripts/cad-convex-source-audit.js
node scripts/cad-convex-contract-manifest.js
git diff --check
```

The checker accepts only no arguments or `--write`, which regenerates this fixed
local source packet. No environment/secrets, Auth/provider calls, sessions,
uploads/body reads, conversion, Sandbox, private CAD, external messages,
resource/billing changes, activation, deployment or commercial claim. Build and
UI checks are outside this docs/checker-only scope. Expenses: US$0.
