# CAD Auth sealed evidence setup source

This packet implements the source setup requested by `cad-auth-sealed-evidence-card-v1`.
The original card remains the immutable prerequisite record. `cad-auth-sealed-setup.json`
is its source-bound, non-executable review projection. It records source availability
separately from live evidence and approval. No route, runtime gate, SDK or environment
configuration changes in this slice.

## Source components

- `providerAdapter.d.ts` specifies the exact-session and fresh-membership reader contract
  used by the existing production verifier candidate. The JavaScript implementation
  rejects every read with `PROVIDER_ADAPTER_UNBOUND`. A concrete provider implementation,
  deployed policy/version receipts, HTTP request accounting and cancellation proof remain required.
- `collector.js` constructs all 65 cases on resolve/refresh, with correlated before/after
  slots for lifecycle cases: 148 logical operations. The local collector accepts only
  synthetic, closed-schema receipt data. It never invokes provider or executor callbacks.
  Unknown fields, missing/duplicated/reordered slots, malformed counters, nonzero body or
  side-effect counters, exceeded deadlines, and repeated collection on one instance stop it.
  A rehearsal instance is not a durable live one-run lock. A future live collector requires
  independently reviewed durable attempt consumption, cancellation and settled observers.
- `bodyInstrumentation.js` provides an inert request facade and parser guard. Attempts to
  read a body, use stream methods, or invoke a parser increment counters and throw before
  accessing any stream. The guard is not an Express request wrapper and is not installed.
  Actual entrypoint instrumentation must cover aliases/references before parsers; tests
  of this facade cannot establish that coverage or hosted platform buffering behavior.
- Binding templates enumerate provider policy, immutable deployment, cohort lifecycle,
  custody/reviewer, and fresh approval fields. Every value requiring external evidence is
  null. Raw identities, tokens and account data have no place in these files.
- The generator binds source bytes, schedule and limits into a review card. It cannot
  issue a command, accept an approval, set a window, or seal a card. Even a valid output
  keeps all inherited authority claims false.

`SIMULATED_EXPECTATION_MET` is a fixture marker for validator tests, not an Auth outcome.
Fixture hashes cover allowlisted synthetic data after validation. They do not prove
provider behavior, actual-route coverage, independent review or eligibility for publication.
Real receipts need exact immutable source/deployment binding, fresh UTC window validation,
reviewed outcome expectations per case, restricted custody and independent review before
any future acceptance. These remain blocked, rather than fabricated by the generator.

## Local validation

```sh
node scripts/cad-auth-sealed-setup-checker.js --write-review-card
node --test scripts/cad-auth-sealed-setup.test.js
node scripts/cad-auth-sealed-setup-checker.js
node scripts/cad-convex-source-audit.js
node scripts/cad-convex-contract-manifest.js
```

The write flag writes only the tracked local review JSON. There is no live execution,
dry-run network, provider setup, secret read, upload session, body admission, conversion,
Sandbox dispatch, private CAD, external message, retry or commercialization authority.
The historical plan window and approval phrase cannot be reused. Next: Captain source
review and existing integration gates, then a separately scoped decision on still-unbound
provider/instrumentation and evidence prerequisites. Stop before live evidence collection,
runtime activation, environment installation, credentials or executable command issuance.
