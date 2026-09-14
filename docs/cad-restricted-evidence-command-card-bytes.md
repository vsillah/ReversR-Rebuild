# CAD restricted evidence and command-card byte assembly

Base: `b0cecf94debcaaa5717933b1fb7d421137f1f5af` after PR #211.
Branch: `codex/cad-restricted-evidence-command-card-bytes`.
Status: source-only restricted evidence and command-card byte assembly scaffolding;
live execution remains blocked. Expenses: USD 0.

## What this resolves

PR #211 defined the fill plan for the private evidence and command-card gaps. This
packet adds the public-safe assembly contract for the next restricted review step.
It can generate and validate a redacted projection that contains only public source
bindings, `rrb-ref` references, byte counts and SHA-256 digests. The exact restricted
command bytes, resource identity, command paths, credentials, run identity values,
provider output and private review records stay outside Git.

The packet binds the prior fill plan, command-card template, live-run dossier
template, envelope template and durable assembly digests. It also locks the inherited
inventory: 49 live-run approval fields, of which 4 are source-safe and 45 require
restricted evidence; 5 command cards; 9 top-level command-card digest fields; 14
per-card digest fields; and 12 operation rows.

## Public projection boundary

`offline/cad-convex/restrictedEvidenceCommandCardBytes.js` exposes two offline-only
helpers:

| Helper | Purpose |
| --- | --- |
| `createRestrictedProjectionTemplate()` | Builds the exact redacted projection shape for a future restricted register review. Missing fields stay null. |
| `inspectRestrictedProjection()` | Checks the redacted projection shape, refs, digests, byte counts, command-card syntax, source bindings and allocation integrity. |

Even a syntactically complete projection returns `LIVE_RUN_BLOCKED`. Completeness
means only that refs, digests and byte counts are shaped correctly. It does not prove
the hidden bytes exist, match their descriptions, have safe contents, identify the
right resource, were independently reviewed, or authorize a live run.

The public projection never accepts raw private paths, private keys, bearer/JWT-like
tokens, account IDs, command lines with secrets, CAD bytes, raw provider output or
free-text error dumps. Invalid values are rejected without echo. Command-card packet
digests hash exact UTF-8 JSON bytes; byte-count drift invalidates the projection.

## Restricted artifacts still required

The future restricted register must privately freeze and review:

| Category | Required restricted evidence |
| --- | --- |
| Command cards | Exact C0-C4 command records, executable identity, argv, cwd, artifacts, selector/effect/result/stop contracts, per-card byte counts and SHA-256 digests |
| Run identity | Run ID, namespace, ledger ID, window ID, fence and ledger/window binding reference |
| Resource binding | Exact existing non-production resource, alias mapping, engine/isolation evidence, schema/index compatibility and absence of real users/CAD |
| Custody | Primary, backup, escalation owner, recovery operator, evidence reviewer and retention acceptance refs |
| Time and cost | UTC start/expiry, trusted-clock evidence, stop procedure, dated pricing and enforceable all-in cap below USD 10 |
| Evidence destinations | Restricted destination, sanitized destination, sanitization review, disabled-route pre/post plan, reconciliation/rollback acceptance and recovery baseline |

The redacted projection may carry only refs, digests and byte counts for those
artifacts. A later approval can accept evidence completeness, but that still does
not run the qualification. The one-run approval remains a separate gate.

## Command-card assembly rules

C0-C4 retain the existing effects:

| Card | Effect |
| --- | --- |
| C0 | Offline preflight |
| C1 | Disabled-route precheck with no body |
| C2 | Synthetic metadata qualification |
| C3 | Bounded original-selector reconciliation |
| C4 | Disabled-route postcheck and closeout with no body |

The public projection fills the existing `runnerCommandCards.json` shape with refs
and digests only, then carries C0-C4 restricted byte counts and the restricted
command-set digest as separate redacted projection fields. It uses the PR #211
proposed C2/C3 allocation digest
`8cad4b01a7374c28b082549543384b38f478e954ea40ec6752834e8d006bec75`.
C3 remains limited to exact-selector reads, authority-dependency reads, unknown
marking, CAS claims, terminal-receipt settlement and bounded page scans. Revocation
belongs to C2; deletion remains excluded.

Each restricted command record remains capped at 65,536 bytes for this review
projection, and the full redacted projection must fit 65,536 bytes. These caps are
source-review caps only. They do not grant any CLI invocation, provider call, route
probe, store write or retry authority.

## Local validation

Use only local source checks:

```sh
node --test scripts/cad-restricted-evidence-command-card-bytes.test.js scripts/cad-private-evidence-command-card-fill.test.js scripts/cad-runner-command-cards.test.js scripts/cad-live-run-approval-packet.test.js scripts/cad-live-durable-run-packet-assembly.test.js scripts/cad-durable-engine.test.js scripts/cad-live-runner.test.js
node scripts/cad-convex-contract-manifest.js --write
node scripts/cad-convex-contract-manifest.js
node scripts/cad-convex-source-audit.js
node scripts/cad-convex-codegen.js --check
npm run typecheck
git diff --check
```

No provider call, live Convex/Auth test, env change, resource mutation, upload body,
CAD bytes, conversion, Sandbox dispatch, deployment, external message or expense
belongs to this validation.

## Future approval phrases

Publication only:

> Approve pushing only commit [full reviewed SHA] from codex/cad-restricted-evidence-command-card-bytes to public repository vsillah/ReversR-Rebuild and opening a draft PR against main for the source-only CAD restricted evidence and command-card byte assembly packet. No merge, deployment, live tests, production/development env or provider/auth/resource changes, secrets, usage/billing changes, enrollment, email/SMS/Slack, store mutation, CAD upload activation, CAD conversion, private CAD, Sandbox dispatch or branch/worktree cleanup.

Restricted evidence acceptance only, after the private register exists and has been
independently reviewed:

> Approve accepting restricted evidence projection [projection SHA-256] for synthetic durable-adapter development run [run ID] with private restricted register [binding digest], command cards C0-C4 byte-count/digest receipts [digest set], resource alias [alias], namespace/ledger/window/fence [restricted references], UTC/cost cap evidence [digests], custody and reviewer acceptances [digests], disabled-route pre/post plan [digest], reconciliation/rollback acceptance [digests] and retained-state custody [digest]. This accepts evidence completeness only and authorizes no live run, provider/resource/env mutation, upload activation, conversion, private CAD, Sandbox dispatch, deployment, merge or cleanup.

One bounded live development qualification run, after restricted evidence acceptance:

> Approve one synthetic durable-adapter development qualification run [run ID] at adapter commit a07f97aaa34913ba5e622d05e92cd22722fe6d55 and runner commit a07f97aaa34913ba5e622d05e92cd22722fe6d55, command-card fill plan [SHA-256], exact command cards C0-C4 [SHA-256], final dossier [SHA-256], final envelope [SHA-256], private existing resource [exact identity and binding digest], alias [alias], namespace [namespace], ledger/window/fence [values], operation/counter matrix b71156a06e5716fd32094cbe7dcba1bc615b7d1f689f9341765c89e026356e98 and accepted per-row allocations [SHA-256], primary and backup custodians [accepted references and digests], independent reviewer [acceptance digest], UTC interval [start to expiry, at most 1800 seconds], enforceable all-in cap [at most USD 9 and evidence digest], restricted/sanitized evidence destinations [accepted references and digests], disabled-route pre/post plan [digest], reconciliation/rollback acceptance [digests] and retained-state custody [digest]. Permit only enumerated synthetic metadata reads/writes and non-production no-body verification within the reviewed shared counters, including revocation but no deletion. Keep uploads disabled and stop on unknown outcomes under the bounded reconciliation plan. No production access/smokes, live Auth tests, private CAD, conversion, Sandbox, enrollment, email/SMS/Slack, env/provider/auth/resource or usage/billing changes, secrets, backup/restore, store restart, rollover, retention/deletion, merge, deployment or lane cleanup. No automatic retry after expiry, resume or second run.

The next practical phase after this source packet is not the live run. It is the
private restricted-register fill and independent evidence review, producing only
safe refs, byte counts and digests for human acceptance.
