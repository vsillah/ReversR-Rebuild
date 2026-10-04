# Phase 7: sole-operator pilot policy disposition and control source

Baseline: `cdca94233bdb724cd9253ee93c14cf339830faa1`. The existing uncommitted [setup plan](cad-auth-controlled-upload-google-setup-decision.md) is preserved byte-for-byte by this addition. No preceding source, resource manifest, packet, checker, route, schema or authentication verifier is modified.

## Policy disposition

Sole-operator control can be represented for internal synthetic testing. It is not independent provenance, accepted operational risk, a qualified host, or approval to spend. There is **no authorized admission exception**. The existing independent-custody gate and its proof requirements remain unchanged and unmet. Separate workload identities, protected approval/recovery paths, least privilege and auditability can reduce accidental or workload-originated misuse; they cannot establish independent administration against the same Owner.

The implementation is an unmounted pure control contract, not a provider executor. All public production authorizers and adapter constructors deny unconditionally, without inspecting their arguments. No enable flag, callback, supplied digest or test outcome grants authority. Every decision keeps independent provenance, risk acceptance, spending authorization, host qualification, body admission, live readiness and effect dispatch false. Actual participant, epoch and run identifiers remain null/empty in the separate non-secret proposed manifest. Opaque test references are not enrollment or real provider bindings.

## What the source enforces on supplied synthetic inputs

`offline/cad-pilot/control.ts` accepts an exact synthetic-only policy, complete history, exact checkpoint projection and command. It captures validated plain data, rejects unknown fields/accessors/custom prototypes/sparse arrays/hostile reflection, uses bounded canonical SHA256 records and returns recursively frozen plans. Internal helpers and limits use private lexical references. No IO, environment access, provider metadata, tokens, billing module import or runtime mounting occurs.

Policy fixes one 30-day start/end and epoch, one immutable binding/plan/deployment reference, one roster of at most five opaque participants, and **one** fixed qualification run of at most 60 minutes. Policy drift invalidates the history/checkpoint binding; there is no rollover, new-run or renewal operation. A reservation immediately consumes one of ten lifetime participant attempts/fifty total and permanently sets the single run's spent fence. Scenario and command IDs remain spent. Acknowledgement, close, replay/restart, a different scenario/participant/command, or a changed plan/deployment cannot acquire a second effect-bearing attempt under the same bound run. Offline tier QA scenarios are separate fixture checks, not additional effect reservations or upload-session issuance. Admission remains disabled.

Global ceilings: 5,000 requests, 5,000 storage operations, 50 MiB payloads and 25,000,000 integer micro-USD (US$25). Forward work cannot use the global restrictive reserves of 1,000 requests, 1,000 operations, 240 KiB and 5,000,000 micro-USD. Separate single-run ceilings are 1,000 requests, 1,000 operations and 10 MiB, with 200/200/48 KiB reserved. Every command costs at least one modeled request, `sequence + 3` known storage operations and 16 KiB. A caller can reserve larger known costs, including cost encumbrances, but cannot reduce/refund prior charges. All money is safe-integer micro-USD; no floating monetary comparisons.

The global envelope is an additional check, not available capacity in this first implementation: the one-run limits are tighter. History is capped at 64 records, with three final slots withheld from nonrestrictive commands. Growing history-read costs may stop work earlier. Ten/fifty scenarios are ceilings, not guaranteed throughput. This contract deliberately cannot execute the setup plan's possible multiple-run aggregate without separately reviewed source, retained accounting and authorization; it never infers permission for a second run.

Reservation precedes the proposed effect. Acknowledgement must identify the exact reservation digest, participant, scenario, policy, pilot, epoch, binding, run and expected head/sequence. Success clears the pending slot but never refunds attempts, counters or the permanent run-spent fence. Unknown acknowledgement or an explicit unknown marker prevents all forward work. Close stops the modeled scope; revoke requires close first. Restrictive commands must target the exact bound reservation, including the pending scenario when present; an unrelated old scenario cannot clear that fence or produce a cleanup plan. They continue to consume quotas and can remain modeled after run/pilot expiry when time is nonregressed and reserves permit, but cannot restore or retry forward authority. No recovery is manufactured for an unused scope.

Clock inputs use a conservative interval at most one second wide and a supplied elapsed-time correspondence to pilot start. Forward time must lie inside both windows; history time is nonregressed. Missing/uncertain accounting, incomplete/conflicting history, replay, unsafe integers, mismatched acknowledgements or exhausted reserves deny with sanitized quarantine-required diagnostics. A denial does not claim that quarantine persisted. A close marker does not certify that a remote effect stopped.

Tier fixtures reproduce source defaults only: Free 4/5/6 weekly usage, Pro 99/100/101 monthly, Team 499/500/501 and 2/3/4 seats. Tester unlimited entitlement does not bypass pilot denial. Entitlement availability is a separate fixture result, never a live permit. Neither product plan changes nor fixture period changes reset pilot reservations. No AI/conversion requests or billing behavior are tested.

## Adapter assumptions and missing capabilities

The kernel replays all supplied records and compares the complete reconstructed checkpoint. It detects inconsistent/lower counters or altered history relative to those inputs. It cannot detect a mutually consistent forged/restored history, policy and origin. `snapshotForSyntheticHistory` is an explicitly unauthenticated test projection, not an initialization, approval or reset authority. Outcomes and cost certainty are supplied test assertions. No production proof type is constructed.

A future adapter must independently authenticate policy, origin, current head and every role; read an independently fresh checkpoint; and atomically compare-and-swap the expected policy/head/sequence while durably reserving counters, scenario identity and immutable receipt **before** any effect. Competing plans from the same snapshot require one durable winner. A loser cannot re-dispatch or silently rerun. Exact independent effect readback/reconciliation and persistent quarantine are required after lost responses. Acknowledgement/counter changes must survive crashes and restore. The pure function performs none of those transactions.

Actual setup/build/image/network/logging/compute charges and persistent storage liability need authoritative accounting and prior encumbrances. A caller's `known` label or integer estimate is not provider billing evidence. The control contract does not install an all-in monetary cap or account for unreported provider overhead. Missing opening costs, reconciliation costs or retained obligations must stop a future executor, not default to zero. No actual executor/admission integration is supplied.

Still absent: provider identities/trust, authenticated current reader and namespace/epoch origin outside rollback control, permanent anti-replay guarantees, trusted UTC/monotonic clocks across restarts, current user/login/membership/upload-session generations, restrictive rollback, independent recovery evidence, and revocation-to-stream linearization including buffering. Historical rollback stays `SCHEMA_FORMAT_UNSUPPORTED`, `fixtureCompatible=false`.

## Budget, retention and next gate

US$25 remains a proposed first-30-day Google custody allowance with no spending authority, enforceable provider cap or renewal. US$5 is modeled as a restrictive money reserve. AI/conversion, Vercel/Convex and other subscriptions are outside that proposal. Sanitized evidence is proposed for 30 days; origin/spent/revoked/unknown anchors remain until safe restore-surviving namespace retirement. No CAD, body or credential bytes belong in these receipts. Fixed refs, hashes, counters and operation tags are the only modeled receipt content.

After day 30, new forward work denies. Restrictive cleanup can still consume remaining modeled limits on an already-bound scope; this grants no spending permission. Late evidence and retained anchors can remain payable. Their funding and safe retirement must be explicitly resolved before provider use. Budget alerts and source counters do not remove recurring obligations.

Next: Captain code review of this additive policy/kernel and its limitations. Review must distinguish source consistency checks from assumed adapter inputs and decide whether to authorize missing adapter/policy implementation. Actual resource setup, spending, synthetic qualification and enrollment each still require bounded authorization and resolution of applicable proof gates. No proposal here changes the live gate or supplies a live approval phrase.

Validation commands:

```sh
node node_modules/typescript/bin/tsc -p scripts/tsconfig.cad-pilot-control.json
node --test scripts/cad-pilot-control.test.js scripts/cad-pilot-control-source-checker.test.js
node scripts/cad-pilot-control-source-checker.js
git diff --exit-code cdca94233bdb724cd9253ee93c14cf339830faa1
```

The independent source checker imports only Node built-ins, verifies a pinned packet and literal allowlisted files, rejects symlinks/oversize inputs and malformed arguments, and never executes local source or predecessor checkers. Existing five source guards remain required. Tests use offline synthetic values only. Costs and provider calls incurred: zero.
