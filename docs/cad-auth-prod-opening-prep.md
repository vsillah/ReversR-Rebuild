# CAD Auth production opening preparation

This is a source-only design and validation packet, not an executable opening.
It binds readiness rollup SHA-256
`9c85cdef9841a16f8400e1ba960c16cbbc3e83e6d63130324287266733dc204b`
at baseline commit `4e3f2cd74ca20cddb9badc8203b5fb4fb3245120`.
The packet checker pins the unchanged production router, disabled admission
switch, and unmounted source-only bridge by digest. No runtime files change.

## Preparation validation

Run `node scripts/cad-auth-prod-opening-prep-checker.js` to check the fixed public
packet and source bindings. `--write` regenerates only that public preparation
JSON. Neither mode accepts receipt paths, runtime options or execution flags.
A successful result means the preparation contract is intact; it always reports
`liveExecutionReady: false`. The source audit also validates this packet.

## Future exact-window runner design

The JSON contains the ordered runner design, required preflight/session checks,
rollback contract and post-rollback smoke matrix. These are requirements for a
future reviewed implementation. No production runner or adapter is supplied.
The old `scripts/run-cad-upload-activation-exact-window.js` and its development
window JSON are not production opening authority and must not be invoked or
repurposed by this gate. The existing restricted-source run id is provenance,
not a fresh production run reservation.

A future runner must bind the reviewed source, packet digest, immutable deployed
target, fresh run, exact cohort and finite UTC window to explicit approval.
It must enforce start <= trusted now < expiry before every effect. The approved
maximum duration is mandatory, and cannot be inferred from an old window.
Before any effect, an atomic durable claim must permanently consume the unique
run. Duplicate/concurrent requests and unknown claim outcomes stop; failed runs
are not released. An independent server-side expiry fence must survive runner
crash, network loss or process termination. Local timers alone are insufficient.

Preflight must prove the closed baseline, target-bound observers, existing
provider readiness, rollback ability and session/admission fences. Approval,
missing receipts or a successful source check cannot substitute for these
proofs. Stop if credentials, provider configuration or environment changes are
needed. Session issuance, runtime activation and body reads each need separate
explicit live authority; this preparation authorizes none of them.

## Rollback and smoke acceptance

Close the admission fence before revoking the bounded session and late grants.
Preserve run and attempt tombstones, including after timeout or unknown outcome.
Rollback must be idempotent and independently enforced on expiry. Completion,
failure or uncertainty all end the window; they never authorize retry.

A later authorized smoke must use the exact immutable target and separately
authorized synthetic fixtures. It must demonstrate authenticated denial as well
as invalid-session and permission/origin denial. Do not mint a session or reopen
the gate to satisfy smoke. Require zero observer deltas for body reads, session
issuance, conversion and Sandbox dispatch; HTTP status alone is insufficient.
Missing fixture, unavailable observer, late grant, failed smoke or unknown
closure blocks cleanup and requires a new decision. It is never a success.

## Future human decision

The packet contains an unresolved exact approval phrase template extending the
readiness rollup template. A reviewer must bind all placeholders, revalidate
freshness and separately approve the live capabilities after reviewing a future
runtime implementation. There is no phrase renderer, command-card generator,
live command or live evidence in this change. Filling the template cannot open
the current literal-false route.

Private receipt bytes, private paths, key listings, secrets, session values,
request bodies and private CAD remain outside source control. Only sanitized
refs, digests, counts, statuses, controls and templates belong in the packet.
Conversion, Sandbox dispatch, provider/env/resource/billing changes, external
messages, retry, second run and commercialization remain excluded.
