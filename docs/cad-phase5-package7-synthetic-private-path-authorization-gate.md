# Phase 5 Package 7 synthetic private-path authorization gate

Status: approved source-only revision. Package 7 may qualify the control path offline with the exact project-owned synthetic fixture below. Runtime activation remains unauthorized.

This gate replaces the unavailable proprietary-file qualification. It authorizes no proprietary file discovery, customer data, credential or account action, request body, provider access, storage write, conversion, download route, deployment, payment, release, or Package 8 work.

## Exact synthetic input

| Field | Required value |
| --- | --- |
| Fixture ID | `reversr-phase5-synthetic-private-line-v1` |
| Filename | `reversr-phase5-synthetic-private-path.igs` |
| Owner | ReversR test project |
| Classification | `RESTRICTED_SYNTHETIC_TEST` |
| Provenance | Deterministically generated in `server/cadPhase5SyntheticPrivatePathQualification.js`; project-owned, nonproprietary, and free of customer data |
| Byte count | `486` |
| SHA-256 | `0bdb42a7c58f4d51eee7eec2befae6ba590e43e0ecce34350cef9db4345c4c70` |
| Processing boundary | Private-path controls only; the bytes are checked-in synthetic test material, not a private customer artifact |

Any byte, length, digest, descriptor-shape, classification, ownership, or provenance mismatch stops before durable mutation. Substitution with another generated fixture, public fixture, proprietary file, attachment, local path, or customer input is not permitted.

## Fixed limits

- One exact synthetic upload-session identity.
- One synthetic `.igs` file.
- One qualification attempt.
- Zero automatic retries and no second run after the independent intent is consumed, regardless of whether application closure completes.
- One independent qualification-intent ledger commitment, consumed before fixture validation or durable-adapter activity and replay-fenced across process restarts.
- Enforced all-in ceiling of `9000000` micros, exactly US$9.
- Zero route mounting, session issuance, request-body admission, storage dispatch, Sandbox/conversion dispatch, download routing, deployment, or Package 8 authority.
- Only the existing internal Package 7 durable operations for close-first rollback, read-only reconciliation, state transition, confirmed deletion, and grant-denial verification may be called.

## Automated recovery replaces the backup operator

No human backup operator is required for this exact offline synthetic qualification. That exception does not apply to proprietary data, customer data, live accounts, providers, deployments, production, or any later qualification.

The source-only controller must enforce this order:

1. Atomically consume one sanitized independent commitment containing only fixed run, protocol, target, owner and overall commitment digests. This ledger is qualification evidence, not application or runtime state.
2. Refuse a duplicate commitment before fixture validation, durable-adapter calls, or session mutation, including after a process restart.
3. Validate the exact fixture descriptor and bytes offline.
4. Read the existing application control state without mutation. A closed state also confirms the attempt is already consumed.
5. Make close-first rollback the first application/durable-adapter mutation: close admission and conversion, revoke exact-session grants, and quarantine uncertain attempts, jobs, and artifacts.
6. Revoke the exact synthetic upload session through the injected exact-session revoker. Broad cohort or account revocation is forbidden.
7. Reconcile the closed control, quarantined attempt/job, and denied grant through read-only durable queries.
8. Move only the three exact synthetic artifact records to deleting, confirm deletion with deterministic tombstones, and reconcile each tombstone read-only.
9. Return only a sanitized boolean/count receipt. Any exception, mismatch, missing receipt, or ambiguous transition returns one fixed unknown code and remains consumed without retry.

The controller cannot recover by opening admission, issuing another session or grant, retrying a mutation, dispatching compute, or substituting a human operator. A fresh process must be refused by the independent intent ledger even when initial application-state reconciliation failed before close-first rollback could create a durable closed state.

## Acceptance criteria

- Exact fixture bytes and metadata pass the shared offline IGES admission check; any drift produces zero durable and session mutations.
- One atomic digest-only intent is consumed successfully; duplicate use, process restart, and restart after initial reconciliation failure refuse replay before a second durable-adapter or session mutation.
- Close-first rollback is the first mutation, and it durably closes admission/conversion, revokes exact-session grants, and quarantines the exact synthetic attempt, job, and artifacts.
- The injected revoker confirms only the bound synthetic upload session was revoked.
- Another owner, shop, session, grant, or artifact remains unchanged.
- Read-only reconciliation confirms closure, quarantine, grant denial, and three deletion tombstones.
- Deletion returns the synthetic quota ledger to zero stored bytes and zero objects.
- Restart and every ambiguity remain independently ledger-fenced, single-use, stopped, sanitized, and zero-retry.
- Runtime imports and all route/provider/storage/conversion/download flags remain absent or false.

## Meaning of success

Passing this gate proves only that checked-in source can validate one deterministic ReversR-owned synthetic IGES payload and exercise the reviewed private-path control lifecycle against offline durable test doubles.

It does not prove proprietary-file ownership or consent, customer-data handling, provider custody, real conversion, real downloads, a mounted authenticated path, live cleanup, deployment correctness, production readiness, general availability, or commercial readiness. It does not authorize Package 8.

Any future proprietary-file, customer-data, provider, deployment, or Package 8 proposal requires a new exact authorization packet with its own owners, evidence destinations, retention, incident response, access, cost, and rollback boundaries. This synthetic exception cannot be reused as that authority.
