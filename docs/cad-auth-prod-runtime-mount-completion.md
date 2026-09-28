# CAD Auth production runtime mount completion

Source-only gate based on main `9197f09e3d9966672f362ae17dcbf6439e6e232a`.

The hosted entry point delegates to `server/index.js`. That server now creates the reviewed executable bootstrap explicitly and passes the same runtime object into `createCadUserUploadRouter` before general CORS and every body parser. The bootstrap retains exact command-card bytes and SHA-256, deployment reference, adapter interface and independent clock. Runtime code continues to enforce exact session ID, durable evidence receipts, immutable deployment rechecks, one-session/one-attempt claims, rollback before opening, and post-rollback fail-closed smoke.

Production supplies no executable inputs. The default remains disabled; there is no environment switch, session issuer, credential source, provider configuration, live command card or body admission added by this change. Synthetic tests exercise enabled control flow only through in-memory adapters; they never read a CAD body or issue an upload session. Synthetic receipts do not establish durable adapter readiness.

## Validation

Run `node scripts/cad-auth-prod-runtime-mount-completion-checker.js` and `node --test scripts/cad-auth-prod-runtime-mount-completion.test.js`. The checker hashes fixed public sources, pins the preceding bootstrap repair packet as historical evidence, and rejects source drift, extra fields, arbitrary paths and live execution flags. Use `--write` only to regenerate this source manifest after reviewed source changes. Historical packets remain unmodified.

The mount-block test executes the production block without starting provider integrations, confirms object identity at the router boundary, then tests binding failures, per-effect expiry, shared atomic claim fencing, rollback and unknown smoke disposition. Local HTTP smoke uses an inert synthetic lookup record and verifies the actual router denies admission without body listeners. No live workflow, deployment smoke, private/customer data, provider or environment tests run in this gate.

## Remaining gate

Stop before merge, deployment and live opening. After approved integration, obtain a fresh immutable deployment rebind and source-only digest refresh. Exact command-card digest, bounded session ID, durable adapter evidence digest and a bounded UTC window remain unresolved. Review those concrete values before requesting the exact live-opening approval phrase in `nextLiveOpeningApprovalPhrase` of the companion JSON manifest. Its placeholders are intentional: this gate cannot issue a live card or invent evidence.

Failed checks, stale deployment/session/evidence binding, missing durable evidence, unknown outcomes and failed rollback smoke block advancement. No retry or second live run is authorized. No commercial-readiness claim is made.
