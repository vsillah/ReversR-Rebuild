# CAD private restricted-register review

Base: `882ebfe1b1aeccc11825843981ff1e569c8350e5` after PR #212.
Branch: `codex/cad-private-restricted-register-review`.
Status: source-safe private restricted-register review packet; live execution
remains blocked. Expenses: USD 0.

## What this resolves

PR #212 created the public-safe assembly contract for restricted evidence and
command-card bytes. This packet adds the next source boundary: a private register
can be filled outside Git, and `offline/cad-convex/privateRestrictedRegisterReview.js`
can derive a public projection that contains only `rrb-ref` references, SHA-256
digests and byte counts.

The source module never reads files, providers, environment variables or secrets.
It accepts a caller-supplied private register object, derives the redacted
projection in memory and validates that the projection still returns
`LIVE_RUN_BLOCKED`. A complete projection means syntax and digest binding only.
It does not prove that hidden evidence is authentic, reviewed by the right person,
safe to execute or sufficient for a live run.

## Private register boundary

The private register draft must stay in an ignored local directory or another
restricted destination. It is not a public source artifact. The public projection
may carry only:

| Item | Public form |
| --- | --- |
| Restricted field values | `rrb-ref`, value digest, evidence digest, reviewer ref, reviewed UTC and byte count |
| C0-C4 command bytes | per-card byte counts plus command byte digests |
| Command-card projection | exact JSON projection digest and byte count |
| Register binding | restricted register digest and byte count |
| Destinations and review | sanitized destination ref, restricted destination ref and independent review ref |

The projection rejects private-looking local paths, private-key markers, GitHub or
live API token shapes and JWT-like values without echoing supplied content. The
validator also refuses provider-read authority, provider mutation, secret generation,
live-run authority, upload activation and conversion authority.

## Still blocked

The following remain hard gates:

| Gate | Why it is still blocked |
| --- | --- |
| Independent evidence acceptance | The projection carries a review ref, but human acceptance of the restricted register remains separate. |
| Live development run | A syntactically complete projection does not authorize any command execution, store mutation, route probe or live Auth test. |
| Upload activation | CAD upload routes stay disabled until a later source, live qualification, production and rollback gate. |
| Conversion dispatch | Sandbox and conversion dispatch remain entirely outside this packet. |
| Cleanup | Branch/worktree cleanup remains separate after PR closeout. |

## Local validation

Use only local source checks:

```sh
node --test scripts/cad-private-restricted-register-review.test.js scripts/cad-restricted-evidence-command-card-bytes.test.js scripts/cad-private-evidence-command-card-fill.test.js scripts/cad-runner-command-cards.test.js scripts/cad-live-run-approval-packet.test.js scripts/cad-live-durable-run-packet-assembly.test.js scripts/cad-durable-engine.test.js scripts/cad-live-runner.test.js
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

> Approve pushing only commit [full reviewed SHA] from codex/cad-private-restricted-register-review to public repository vsillah/ReversR-Rebuild and opening a draft PR against main for the source-safe CAD private restricted-register review packet. No merge, deployment, live tests, production/development env or provider/auth/resource changes, secrets, usage/billing changes, enrollment, email/SMS/Slack, store mutation outside reviewed restricted evidence artifacts, CAD upload activation, CAD conversion, private CAD, Sandbox dispatch or branch/worktree cleanup.

Restricted evidence acceptance only, after the private register and independent
review artifacts exist outside Git:

> Approve accepting restricted evidence projection [projection SHA-256] for synthetic durable-adapter development run [run ID] with private restricted register [binding digest], command cards C0-C4 byte-count/digest receipts [digest set], resource alias [alias], namespace/ledger/window/fence [restricted references], UTC/cost cap evidence [digests], custody and reviewer acceptances [digests], disabled-route pre/post plan [digest], reconciliation/rollback acceptance [digests] and retained-state custody [digest]. This accepts evidence completeness only and authorizes no live run, provider/resource/env mutation, upload activation, conversion, private CAD, Sandbox dispatch, deployment, merge or cleanup.

One bounded live development qualification run, after restricted evidence acceptance:

> Approve one synthetic durable-adapter development qualification run [run ID] at adapter commit a07f97aaa34913ba5e622d05e92cd22722fe6d55 and runner commit a07f97aaa34913ba5e622d05e92cd22722fe6d55, accepted restricted evidence projection [SHA-256], exact command cards C0-C4 [SHA-256], private existing resource [exact identity and binding digest], alias [alias], namespace [namespace], ledger/window/fence [values], operation/counter matrix b71156a06e5716fd32094cbe7dcba1bc615b7d1f689f9341765c89e026356e98 and accepted per-row allocations [SHA-256], primary and backup custodians [accepted references and digests], independent reviewer [acceptance digest], UTC interval [start to expiry, at most 1800 seconds], enforceable all-in cap [at most USD 9 and evidence digest], restricted/sanitized evidence destinations [accepted references and digests], disabled-route pre/post plan [digest], reconciliation/rollback acceptance [digests] and retained-state custody [digest]. Permit only enumerated synthetic metadata reads/writes and non-production no-body verification within the reviewed shared counters, including revocation but no deletion. Keep uploads disabled and stop on unknown outcomes under the bounded reconciliation plan. No production access/smokes, live Auth tests, private CAD, conversion, Sandbox, enrollment, email/SMS/Slack, env/provider/auth/resource or usage/billing changes, secrets, backup/restore, store restart, rollover, retention/deletion, merge, deployment or lane cleanup. No automatic retry after expiry, resume or second run.

The next practical step after this source packet is to fill and review the private
register outside Git, then publish only the projection digest and acceptance phrase
for human approval. That approval still will not run the qualification.
