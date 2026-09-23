# CAD Auth sealed evidence setup — source implementation

This packet implements an offline provider interface, synthetic receipt collector,
receipt validator, unmounted route instrumentation, binding manifest templates,
stop runbook and deterministic review-card generator. It extends the archived
`cad-auth-sealed-evidence-card-v1` prerequisite packet without rewriting that
historical packet or claiming its missing live bindings have been supplied.

The generated `cad-auth-sealed-setup.json` identifies the same card and binds this
implementation's exact source bytes. Source hashes are integrity checks, not
approval signatures. The card remains unsealed and non-executable. All live
references remain null; edits to them fail validation and require a future review.
The generator accepts only fixed repository sources. It never emits approval
phrases, live commands, dry-run commands, credentials or runtime configuration.

## Implemented boundaries

- Provider adapter: typed read-only interface matching the existing exact-session
  binding identity and authorization fields. The shipped implementation always
  throws `AUTH_UNAVAILABLE`, even if arguments or callbacks are supplied. A future
  provider implementation must enforce cryptographic policy, fresh exact-session
  reads, request-local credentials, cancellation, and accounting before every HTTP
  request, including metadata/key requests. The reservation hook requires a future
  reviewed transport wrapper; the current candidate does not supply one.
- Collector: replay of allowlisted **local synthetic receipts** only. No provider
  callback, request object, filesystem store, network client, token input or live
  run entrypoint exists. The 65 cases expand to 150 ordered slots, including
  before/after phases for lifecycle setup and paired identity slots. Paired replay
  slots do not prove concurrent execution or live lifecycle transitions.
- Validator: exact case/path/phase/type and candidate/schedule/limit binding;
  fixed synthetic target and alias allowlist; bounded timestamps and duration;
  counter ceilings; rejection of extra fields, accessors, duplicate slots,
  out-of-order slots and unknown outcomes. Failure permanently stops that collector
  instance. Reconstructing an instance is useful for local tests and grants no
  authority to retry a live run. Live durable single-run enforcement remains a
  separate implementation gate.
- Evidence semantics: an accepted receipt means structurally valid synthetic data,
  never a passing Auth case. Expected natural-language behavior stays in the
  schedule; observations remain unreviewed. No PASS/reviewer approval input is
  accepted. Sanitized synthetic receipt hashes are computed locally. There is no
  live receipt import, restricted-store fetch, public projection or publication.
- Instrumentation: pre-access counters for body getters, read/parser calls,
  stream subscriptions, pipes and iterators; every attempted access throws before
  any underlying read. Entry ordering and terminal stop are checked. This module
  is unmounted and cannot prove that actual middleware or platform buffering is
  safe. Its zero byte count describes its own lack of reads only.
- Manifests: immutable target, provider policy/version, synthetic mapping,
  independent reviewer/custody, instrumentation, rollback and fresh approval
  slots. Historical deployments and historical approval windows are unusable.

## Local validation

```sh
node scripts/cad-auth-sealed-setup-checker.js --write
node scripts/cad-auth-sealed-setup-checker.js
node --test scripts/cad-auth-sealed-setup.test.js scripts/cad-auth-sealed-evidence-card.test.js scripts/cad-auth-live-evidence-plan.test.js scripts/cad-production-verifier-candidate.test.js scripts/cad-production-session-verifier-binding.test.js
node scripts/cad-convex-source-audit.js
node scripts/cad-convex-contract-manifest.js
git diff --check
```

`--write` only regenerates the source review JSON. It is not a collection command.
The broad manifest write option similarly only refreshes local source digests.
No application/runtime source, dependencies, environment or provider resources
change. No UI changes, deployment, live Auth, customer-data smoke, secrets,
upload sessions, body reads, conversion, Sandbox, private CAD, billing or external
messages are involved. Build/typecheck are outside this source-only scope.

## Next gate

Captain reviews the draft PR and source validation. Actual provider integration,
live transport and receipt validation, route installation/platform review,
immutable deployment selection, restricted cohort lifecycle receipts, custody,
reviewer and late-grant observer remain blocked. Source availability does not
satisfy those evidence gates. A future reviewed implementation and fresh exact
approval must precede any collection, installation or executable command card.
This lane stops at draft PR; merge, deployment and cleanup belong to the captain.
