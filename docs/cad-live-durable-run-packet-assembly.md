# CAD live durable run packet assembly

Base: `a07f97aaa34913ba5e622d05e92cd22722fe6d55` after PR #209.
Branch: `codex/cad-live-durable-run-packet-assembly`.
Status: source-only packet assembly complete; live execution remains blocked.
Expenses: USD 0.

## What this resolves

PR #209 merged the real source candidate for the bounded durable metadata engine.
This packet reconciles that source with the earlier bounded live development run
templates. The source-derived fields now pin the main merge commit, the original
implementation commit, every durable engine source file, the unfilled command-card
template, the unfilled dossier/envelope templates, the schema/index source, the
synthetic evidence boundary and the disabled upload-route baseline.

The packet records the operation/counter template digest
`b71156a06e5716fd32094cbe7dcba1bc615b7d1f689f9341765c89e026356e98`. Future
run approval can use the PR #209 merge commit as both adapter and runner commit,
but only as source identity. It does not prove a live resource, provider transport,
independent evidence authenticity, custody acceptance, trusted time or cost
enforcement.

## What remains blocked

The following categories cannot be derived from committed source and remain hard
gates before any live development qualification run:

- Private resource binding: exact existing non-production resource, isolation,
  absence of real data and private binding digest.
- Run identity: unused run ID, resource alias, namespace, ledger, window and fence.
- Command cards: exact restricted command bytes, executable/version hashes, argv,
  cwd, selector allowlist, side-effect allowlist, expected result codes and stop
  plans for C0-C4.
- Evidence verifier: the committed source still rejects caller-supplied synthetic
  evidence and has no qualified independent private verifier binding.
- Custody: primary, backup, escalation owner, recovery operator, evidence reviewer
  and retention acceptance.
- Time and cost: UTC start/expiry, trusted-clock evidence, stop procedure and a
  hard all-in cap below USD 10 covering retained state.
- Evidence destinations: restricted and sanitized receipt destinations, disabled
  route pre/post plan, reconciliation acceptance and rollback acceptance.

Backup/restore, isolated-store restart, window rollover, resource retirement and
retention/deletion stay blocked and require separate operation-specific approval.
CAD uploads remain disabled.

## Validation

Use only local source checks:

```sh
node --test scripts/cad-live-durable-run-packet-assembly.test.js scripts/cad-durable-engine.test.js scripts/cad-durable-engine-source.test.js scripts/cad-live-runner.test.js scripts/cad-live-run-approval-packet.test.js
npm run typecheck
node scripts/cad-convex-codegen.js --check
node scripts/cad-convex-contract-manifest.js --write
node scripts/cad-convex-contract-manifest.js
node scripts/cad-convex-source-audit.js
git diff --check
```

No provider call, live Convex/Auth test, environment change, upload body, CAD bytes,
conversion, Sandbox dispatch, UI exposure, deployment or expense belongs to this
validation.

## Future approval phrases

Publication only:

> Approve pushing only commit [full reviewed SHA] from codex/cad-live-durable-run-packet-assembly to public repository vsillah/ReversR-Rebuild and opening a draft PR against main for the source-only CAD live durable run packet assembly. No merge, deployment, live tests, production/development env or provider/auth/resource changes, secrets, usage/billing changes, enrollment, email/SMS/Slack, store mutation, CAD upload activation, CAD conversion, private CAD, Sandbox dispatch or branch/worktree cleanup.

One bounded live development qualification run, after all private evidence is
filled and independently reviewed:

> Approve one synthetic durable-adapter development qualification run [run ID] at adapter commit a07f97aaa34913ba5e622d05e92cd22722fe6d55 and runner commit a07f97aaa34913ba5e622d05e92cd22722fe6d55, exact command cards [SHA-256], final dossier [SHA-256], final envelope [SHA-256], private existing resource [exact identity and binding digest], alias [alias], namespace [namespace], ledger/window/fence [values], operation/counter matrix b71156a06e5716fd32094cbe7dcba1bc615b7d1f689f9341765c89e026356e98 and accepted per-row allocations, primary and backup custodians [accepted references and digests], independent reviewer [acceptance digest], UTC interval [start to expiry, at most 1800 seconds], enforceable all-in cap [at most USD 9 and evidence digest], restricted/sanitized evidence destinations [accepted references and digests], disabled-route pre/post plan [digest], reconciliation/rollback acceptance [digests] and retained-state custody [digest]. Permit only enumerated synthetic metadata reads/writes and non-production no-body verification within the reviewed shared counters, including revocation but no deletion. Keep uploads disabled and stop on unknown outcomes under the bounded reconciliation plan. No production access/smokes, live Auth tests, private CAD, conversion, Sandbox, enrollment, email/SMS/Slack, env/provider/auth/resource or usage/billing changes, secrets, backup/restore, store restart, rollover, retention/deletion, merge, deployment or lane cleanup. No automatic retry after expiry, resume or second run.

This live-run wording is still a template. The next practical phase is to prepare
the private evidence and command-card fill plan, not to execute a run.
