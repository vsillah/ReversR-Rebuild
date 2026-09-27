# CAD Auth current-deployment command-card rebind preparation

This successor packet binds approved base e5e23453852720532b09fcfc1b5c603a1265c816,
runtime mount packet 24d3a96fc431f2a23e14724f4b8c061e8fefaa3cbbb97c4832b6a8d570f10346,
and prior digest packet 53aab3bab61f99b8d995236096440ae838f706c25e5e9cf4bb30639faf5bad81.
Both parent packets remain byte-for-byte unchanged. All live controls remain false.

The supplied deployment is https://vercel.com/vsillahs-projects/reversr/CyBjkXRmZsWuw3q4LS3gcnCweMRL.
Its successful GitHub Vercel status matches the approved base. This is source
provenance, not independent proof of the current production alias or durable
adapter runtime evidence. No production endpoint is probed by this preparation.

The proposed window is **2026-09-27 16:00:00–16:30:00 UTC**, start inclusive and
expiry exclusive. It grants no authority. A missed window requires a new digest
and approval. Merge or redeployment can invalidate the target: independently
recheck the immutable production deployment before later use and before every
effect. Stop and rebind if it differs; never silently substitute a deployment.

## Digest and approval semantics

The checker computes SHA-256 over the exact UTF-8 JSON.stringify draft, without
a trailing newline. The draft is non-executable, unissued, and contains no command
material. Its digest cannot be presented as an executable card's byte digest.
Any later executable card needs its own exact digest and separate approval before
issuance or use. The exact later approval phrase is generated deterministically
in the packet at `preparation.nextLiveOpeningGate.exactPhrase`. It binds both
parents, the approved base, deployment, proposed UTC window and draft digest.
The phrase is review text only; runtime activation, session issuance and body
admission/read remain separately gated. No production readiness is claimed.

## Required later evidence and stop conditions

Before opening, require fresh approval, immutable-target and closed-baseline
receipts, durable adapter evidence, independent expiry evidence, atomic durable
run/attempt ledger claims, session admission and rollback smoke plan. In-memory
test receipts cannot replace durable evidence. One session and one attempt must
remain fenced across restarts and competing workers; consume the attempt before
body read. There is no retry or second run, including after unknown outcomes.

Prepare rollback before opening. On expiry, failed checks, failed smoke, unknown
outcome, stale target, missing durable evidence, unavailable observer, or any need
for credentials/provider configuration, stop. Close admission and revoke the
session and late grants before post-rollback smoke. Missing, invalid, revoked,
expired sessions and consumed attempts must be denied with zero body-read,
conversion and Sandbox observer deltas. Failed or unknown smoke blocks cleanup.

## Validation

Run the new checker and test file, the runtime-mount checker and tests, existing
user-upload/default-closed admission tests, and the CAD contract manifest checker.
The inherited full source audit has a known older verifier-acceptance packet
blocker; it is not an acceptance check for this bounded successor. All validation
is local and synthetic; no live evidence, secrets, private payloads or provider
configuration are used. Runtime sources are unchanged and do not import this packet.
