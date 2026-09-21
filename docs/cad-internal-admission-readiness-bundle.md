# CAD Internal Admission Readiness Bundle

This bundle consolidates the next source-only readiness work for internal CAD upload admission. It does not open `POST /api/cad/user-import`, accept an opening bundle, or authorize request body reads.

## What Changed

- The opening-bundle checker now requires explicit references for concurrent revocation fence, browser cookie transport, native bearer transport, private-register lockout, environment/deployment/test approval split, and conversion/Sandbox approval split.
- The checked-in opening template remains intentionally incomplete and must still fail readiness.
- Retained-state disposition, private-register lockout, and environment/test split are documented as unaccepted future evidence.

## Current State

- `BODY_ADMISSION_AUTHORIZED` remains `false`.
- The production route remains fail-closed with `USER_UPLOADS_DISABLED`.
- Transport, rollback, retention, private-register, environment/test split, runtime commit, deployment, cohort/window, and explicit activation evidence remain unaccepted upstream.
- Normal source-only PR merge and production fail-closed smoke do not satisfy production upload activation evidence.

## Still Needed

- accepted supported deletion or bounded retention disposition
- accepted private-register lockout receipt
- accepted exact deployment and route receipt
- accepted exact internal cohort and UTC window
- accepted explicit production upload activation phrase
- accepted post-rollback fail-closed smoke receipt for that exact opening

## Boundary

This bundle does not authorize request body reads, production upload activation, conversion, Sandbox dispatch, store mutation, private CAD, real users, provider/env/resource changes, secrets, external messages, or commercial-readiness claims.

The next useful gate is a sanitized candidate opening bundle for human approval review only.
