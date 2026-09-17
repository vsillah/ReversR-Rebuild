# CAD upload conversion Sandbox auth correction

## Outcome

The first public-cube conversion qualification stopped before a Sandbox session
was observed. Its sanitized evidence records `RUNTIME_UNAVAILABLE`, no
`sandbox_created` stage, `unknownOutcome: true`, no automatic retry and no
second run. The evidence and receipt hashes are respectively
`757e99107654db5cc355131b7fe94e46048cc464db6239e1518e0360c2e49ad3`
and `7a466d0af3d96bb1d40b78ed075d4ce735aee9d7a0b05f5b0962b49fd3cfeaac`.
That run remains stopped and must not be retried.

Read-only reconciliation used the Vercel dashboard, `vercel sandbox list`, and
the Sandbox SDK list operation. No new Sandbox session was present; every
listed session was already stopped. No provider, resource, environment, store,
upload-route or billing mutation was made during diagnosis.

## Correction

The runner no longer reads or forwards the raw generic Vercel CLI token. It
verifies the checked-in local link metadata for the `reversr` project, then lets
the Sandbox SDK infer and refresh credentials for that linked project. Before
the one-attempt conversion boundary, a ten-second read-only `Sandbox.list`
preflight verifies authorization.

If that preflight fails, the runner records only
`SANDBOX_AUTHORIZATION_FAILED`. Because dispatch has not started, the outcome
is known, cleanup is not blocked, and no provider error details or credentials
are written. A failure after the preflight retains the existing conservative
unknown-outcome and no-retry behavior.

## Preserved boundary

The mounted user route still contains
`const BODY_ADMISSION_AUTHORIZED = false;`. This source-only correction does
not authorize a live run, a retry of the stopped run, a second run, production
body admission, production upload activation, private CAD, real users, store
mutation, provider/resource/environment changes, usage or billing changes, or
external delivery.

After merge, deployment and production fail-closed smoke, the next distinct
gate is a fresh public-cube-only qualification with a new run reference, new
ignored evidence root and new bounded UTC window. It remains one attempt with
no automatic retry and a US$50 all-in planning ceiling.
