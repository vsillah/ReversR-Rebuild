# CAD runner and durable adapter source boundary

Branch: `codex/cad-live-runner-adapter-source`.
Base: `8c85eee6f9ac7344d2cd2bf49d3d0ba4f2c76792`.
Status: source skeleton implemented; live execution blocked. Expenses: USD 0.

This follows the [execution plan](cad-live-dev-run-execution-plan.md) and
[command cards](cad-runner-adapter-command-cards.md). It supplies a concrete
source interface and command entry point for review. It does not implement a
durable engine, real prerequisite verification, or live orchestration.

## Source contracts

`offline/cad-convex/durableAdapter.d.ts` defines scoped exact reads, authority
reads, atomic revision-CAS transactions, generation-CAS claims, independent-receipt
settlement, bounded cursor scans and stop. Every method currently returns a
blocked result. `durableAdapter.js` accepts no driver, transport or enable flag;
it never inspects operation arguments. The factory and results are frozen.
No application or provider runtime imports this source.

A future engine must enforce scope inside every transaction, atomically preserve
authority dependencies, accounting and receipts, and implement shared counters
across both clients. Unknown acknowledgements preserve holds and leases; retries
require explicit conflicts and fresh reads within the original time and row caps.
Claims require current generations and independent terminal evidence. Pagination
requires original scope and durable high-water progress. These remain unproved;
type declarations are not validation or engine guarantees. No real store is used.

`liveRunner.js` implements offline preflight and blocked C1-C4 dispatch.
`liveRunnerOutput.json` pins common output gates. The runner adds fixed diagnostic
codes and, for preflight, structural completeness, source-binding status and the
exact packet digest. It does not echo input fields, paths, argv or exception text.

## Local command path

```sh
node scripts/cad-live-runner.js --preflight < offline/cad-convex/runnerCommandCards.json
node scripts/cad-live-runner.js C1
node scripts/cad-live-runner.js C2
node scripts/cad-live-runner.js C3
node scripts/cad-live-runner.js C4
```

These are offline denial checks, never live command cards. Preflight consumes at
most 64 KiB from stdin and reads only the two fixed local source contracts. Exit 1
means invalid input/command or a local read failure. Exit 2 always means blocked,
including a complete syntactically valid packet with matching source bindings.
There is no exit-0 readiness result, execute flag, approval parser, provider SDK,
credential lookup, route probe, store write, recovery or automatic resume.

To bind a future private review projection, set `fields.adapterContractDigest` to
SHA-256 of exact `durableAdapter.d.ts` bytes and every card's `outputContractDigest`
to SHA-256 of exact `liveRunnerOutput.json` bytes. Bind adapter/runner full commits
separately using the existing command-card fields; changing either source requires
fresh review. Exact executable/version/hash, argv, cwd and restricted command-byte
digests still belong exclusively in the private packet. This preflight verifies
neither their authenticity nor that claimed commits match the worktree. Freeze
card bytes and bind their digest, dossier and envelope in the separate human
approval receipt as specified in the predecessor documents; no circular hash.

## Remaining gates and validation

Still required: engine implementation and independent qualification, reviewed live
runner, trusted clock and cancellation, unused-run enforcement, private resource
binding, actual shared budgets, enforceable all-in cost cap, disabled-route
pre/post proof, receipt verification, accepted evidence destinations and custody.
Backup/restore, store restart, rollover and recovery stay separately blocked.
Existing approval templates and all pending evidence remain unchanged.

Offline tests cover hostile adapter arguments, complete synthetic packets, digest
drift, altered gates, oversized/malformed input, CLI denial paths and sanitized
outputs. Synthetic fixtures remain in memory; child processes run only the local
Node CLI. No UI changed; no viewport, provider, live Auth or CAD test is claimed.

Publication-only approval template (replace the bracket after local commit):

> Approve pushing only commit [full reviewed SHA] from codex/cad-live-runner-adapter-source to public repository vsillah/ReversR-Rebuild and opening a draft PR against main for the source-only CAD runner and durable-adapter boundary. No merge, deployment, live tests, production/development env or provider/auth/resource changes, secrets, usage/billing changes, enrollment, email/SMS/Slack, store mutation, CAD uploads, conversion, private CAD, Sandbox dispatch or branch/worktree cleanup.

Completed: source interface, blocked command path and offline regression coverage.
Next: captain reviews the local commit and publication-only phrase. Live execution
remains blocked by the implementation and evidence gaps above.

Local validation receipt:

```sh
node --test scripts/cad-live-runner.test.js scripts/cad-runner-command-cards.test.js scripts/cad-live-run-approval-packet.test.js scripts/cad-shared-controls-adapter-qualification.test.js
node scripts/cad-convex-contract-manifest.js --write
node scripts/cad-convex-contract-manifest.js
node scripts/cad-convex-source-audit.js
git diff --check
```

Results: 29/29 tests passed; 151 integrity files verified; 137 source-audit files
passed with zero leak-pattern matches and runtime isolation intact; whitespace
check passed. No push, live run or expense occurred.
