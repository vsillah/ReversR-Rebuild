# Production execution binding: source-only handoff

The production server now supplies `createCadProductionExecutionBinding()` to the existing executable runtime mount. Its checked-in binding is null, producing `{ enabled: false }`. No environment variable, request parameter, file loader, provider client, or public endpoint can replace this binding. Production admission stays closed before body parsing.

A later reviewed server-owned binding supplies canonical command-card bytes and SHA-256, the immutable current deployment reference, the exact bounded session ref and session ID, the durable evidence digest, and a durable service capability. Missing or mismatched fields return a disabled runtime. The service methods are captured once. The adapter passes the exact binding through every operation without manufacturing durable receipts.

The existing runtime verifies approval, independent durable evidence, deployment freshness before opening, the closed baseline, atomic global run and attempt claims, bounded session, rollback arming, fence opening, consumption, closure, revocation, and post-rollback smoke. The new adapter independently checks time before and after every forward effect, rejects clock regression, and burns local mutation attempts before dispatch. Unknown outcomes stop without retry. Runtime cleanup now starts after any attempted mutation, including a claim or rollback-arm whose response was lost. Cleanup remains possible after expiry and attempts all three operations even when one fails.

The durable service must implement the runtime's METHODS contract with an independently enforced expiry fence, globally atomic claims under `cad-production-internal-opening-v1`, persistent tombstones, crash-safe rollback, session-ref mapping, deployment observations, and authentic smoke receipts. This PR supplies the adapter and executable binding path; it does not provision or qualify that service. Synthetic test receipts and local Sets are test doubles only. A service capability that merely returns asserted booleans is not acceptable live evidence. Live service qualification and supplying the reviewed binding remain explicit later gates.

## Validation and provenance

Run `node --test scripts/cad-auth-live-opening-execution-gap-closure.test.js` and `node scripts/cad-auth-live-opening-execution-gap-closure-checker.js`. Dependencies may be resolved from the existing main checkout using NODE_PATH. Tests call the mount with a synthetic router capture and exercise gate decisions only; they do not issue sessions, send requests, parse bodies, or contact a provider.

The previous mount packet remains byte-identical at SHA-256 `87b9f0e23ac1b6017f7bc8cf5cff3ab6967220398ad33798f7ed6e81fab4ecae`. Its source hash check, together with the bootstrap-repair packet, is intentionally historical after index and runtime changes. The successor checker binds all current execution sources and refuses historical packet drift. Earlier source-bound packets are not current execution authority.

## Later approval

The complete exact approval phrase template is stored in `approvalPhraseTemplate` in the sibling JSON packet and produced by `approvalPhrase()` in the checker. Replace every placeholder only after the source commit is merged, the new production deployment is verified, the command-card and evidence digests are rebound, and the durable service is independently qualified. The template itself grants no authority. No live command card is produced here.

The source-only scope forbids provider/env/resource/billing changes, secret reads, session issuance, upload activation, request-body reads, conversion, Sandbox dispatch, private CAD, live evidence collection, runtime activation, external messages, retries, second live runs, commercialization, and readiness claims. Captain review, merge and deployment remain separate from live opening.

## Validation limitation

The legacy aggregate `node scripts/cad-convex-source-audit.js` fails at line 7, where the older production verifier acceptance packet is expected to validate. The same failure reproduces from a pristine archive of base main `8d33cae7d0f352954ae6c0ef4c8115dc633c8d9f`. This PR leaves that unrelated historical acceptance chain unchanged. The new packet checker and regenerated full manifest validate this change. TypeScript checking passes. No live workflow or customer-data smoke was run; no build or deployment is claimed.

Adjacent offline runner suites retain five pre-existing failures (durable adapter preparation: two; executable runner preparation: three). All five reproduce on the pristine base snapshot. Their behavioral tests pass; their failures concern older source-bound packets and a historical router hash. Bootstrap-repair packet coverage now expects historical rejection, matching its successor status; its original packet is preserved.

## Commands run

- `node --test scripts/cad-auth-live-opening-execution-gap-closure.test.js scripts/cad-auth-live-opening-executable-runtime-wiring.test.js scripts/cad-auth-prod-runtime-mount-completion.test.js scripts/cad-auth-executable-production-bootstrap-binding-repair.test.js` — 36 passed. The existing route rejection test uses only synthetic local sessions and asserts zero body reads; no production session is issued.
- `npm run typecheck` — passed.
- `node scripts/cad-auth-live-opening-execution-gap-closure-checker.js` — passed, production disabled.
- `node scripts/cad-convex-contract-manifest.js` — passed, 744 files.
- `node --check server/cadProductionExecutionBinding.js`, `node --check server/cadLiveOpeningExecutableRuntimeWiring.js`, `node --check server/index.js`, and `git diff --check` — passed.
- `node --test scripts/cad-auth-prod-durable-runner-adapter-prep.test.js scripts/cad-auth-prod-executable-runner.test.js scripts/cad-auth-executable-production-bootstrap-binding-repair.test.js` — initially six failures; one newly historical bootstrap expectation updated above. The other five reproduce on base main and remain outside this scope.
- `node scripts/cad-convex-source-audit.js` — existing baseline failure described above, reproduced using `git archive 8d33cae7d0f352954ae6c0ef4c8115dc633c8d9f` in a temporary directory.

No live workflow/customer-data smoke, web build, deployment, or viewport QA was run. This change has no UI surface. Both Portfolio Vercel contexts are inapplicable to this ReversR source-only lane.
