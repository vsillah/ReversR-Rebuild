# CAD Auth live-evidence prerequisite completion — source review only

This packet completes the current source-only prerequisite description that was
opened by `cad-auth-live-evidence-prerequisites-v1`. It binds the provider-policy,
route/body, target, cohort, custody and late-grant observer details to exact source
bytes. It does not collect live provider evidence, install runtime guards, issue an
upload session, authorize body admission or emit an executable command card.

The packet uses `source-only:` references throughout. A passing checker result means
the source and review schema are internally consistent; it is not proof that any
deployed route, Auth provider, cohort, custodian or reviewer has accepted the work.
Every live reference, review receipt, command line, approval window and provider
runtime value remains null or false.

## Completed source detail areas

| Area | What is bound now | Still required before any live evidence |
| --- | --- | --- |
| Provider policy adapter | Disabled adapter/interface, production verifier candidate, exact-session binding, pinned package versions and the no-fallback policy | Concrete provider implementation, cryptographic issuer/audience/algorithm/signing-key policy, SDK retry controls and deployed SDK receipt |
| Route/body installation review | API entrypoint, Express app order, user-import route order, unmounted body guard and forbidden access counters | Live route counter receipt, platform buffering review and installed guard review |
| Immutable deployment target | Exact reviewed source commit, reviewed source binding digest and immutable target policy | Deployment URL/id, provider deployment ref, commit/source-map digest and independent target attestation |
| Restricted synthetic cohort | Internal Mark-test cohort label, U1/L1, U1/L2, U2/L3 aliases and lifecycle cases | Restricted alias map, synthetic ownership receipt, before/after lifecycle receipts and teardown evidence |
| Custody/reviewer disposition | Retention, sanitized/restricted/forbidden fields and independent-role requirement | Named custodian, independent reviewer, access-controlled store, deletion receipt and reviewer disposition |
| Late-grant observer design | Stop runbook, candidate boundary, terminal consumed-state design and no-diagnostic/no-retry policy | Installed observer, durable consumed-run ledger, partial-evidence policy and reviewed escalation path |

## Hard boundaries

No live Auth/provider call, environment read, provider configuration, secret read,
request body read, upload-session issuance, upload activation, conversion, Sandbox
dispatch, private CAD, external message, retry, second run or commercial-readiness
claim is authorized by this packet. It also does not make the current production
alias an immutable evidence target; that remains a separate reviewed binding.

Unknown outcome, source drift, missing files, filled live receipts, runtime-looking
references, private fields and accessor-bearing input all fail closed. A future
live evidence collection gate must provide fresh explicit approval, immutable target
identity, restricted cohort setup/teardown receipts, named custody/reviewer controls
and a non-executable-to-executable command-card transition that this packet does not
perform.

## Local validation

```sh
node scripts/cad-auth-live-evidence-prereq-completion-checker.js --write
node scripts/cad-auth-live-evidence-prereq-completion-checker.js
node --test scripts/cad-auth-live-evidence-prereq-completion.test.js scripts/cad-auth-live-evidence-prereq.test.js scripts/cad-auth-sealed-setup.test.js scripts/cad-auth-sealed-evidence-card.test.js scripts/cad-auth-live-evidence-plan.test.js scripts/cad-production-verifier-candidate.test.js scripts/cad-production-session-verifier-binding.test.js
node scripts/cad-convex-source-audit.js
node scripts/cad-convex-contract-manifest.js
git diff --check
```

`--write` regenerates only the fixed local JSON packet. The command never accepts
an input path, live flag, seal flag, retry flag or command-card flag.
