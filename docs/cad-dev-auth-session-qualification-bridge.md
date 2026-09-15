# CAD development Auth/session qualification bridge

Base: `e02f168d85c4bf11e7a2ccf802252659c0fb66b1`, after PR #241.
Branch: `codex/cad-dev-auth-session-qualification-bridge`.
Status: source-only bridge, disabled by default. No live Auth/session run, store
mutation, deployment, upload activation, conversion, private CAD or real-user
enrollment is performed by this packet.

## What This Adds

This packet adds a reviewed Convex development bridge for one future synthetic
Auth/session qualification run. The bridge is inert until a later source rebind
sets all of these fields in `convex/cadDevAuthQualificationBinding.ts`:

- enabled flag
- ignored local run-key SHA-256
- accepted evidence projection SHA-256
- acceptance receipt SHA-256
- exact UTC start and end, at most fifteen minutes

The bridge targets only `reversr-cad-auth-dev` development deployment
`majestic-alligator-31`. It also requires the already-reviewed development Auth
environment rows to match the exact issuer `https://majestic-alligator-31.convex.site`
and app origin `http://localhost:5001`.

## Future Rebound Run Shape

Once a separate rebind is merged and deployed to development, the local runner can
execute this bounded synthetic sequence:

1. Provision exactly two reserved `auth-test.invalid` Password identities through
   the Convex Auth `createAccount` helper.
2. Sign in both synthetic users through `auth.signIn`.
3. Read the exact current session through `readExactLibrarySession`, using the
   server-verified Convex Auth identity. The runner never decodes JWT claims as
   authority.
4. Sign out one session and verify the exact session read returns `null`.
5. Revoke sessions for both run-owned users with `invalidateSessions`.
6. Write sanitized local evidence and receipt under ignored `.local/` paths.

Users and accounts are retained under the no-delete custody model. The bridge
does not delete users or accounts. Session and refresh-token invalidation are permitted
only in the future rebound run and only for the two run-owned synthetic users.

## Guardrails

The public write actions are disabled by source until the rebind packet installs a
run-key digest and window. The run key itself belongs only in ignored local
artifacts. Source contains only digests.

The exact-session query is also source-bound. It requires the run-key digest and
uses Convex Auth's server identity to discover the current session before calling
the existing exact reader.

Selector-limited inventory uses existing indexed paths for `users`, `authAccounts`,
`authSessions`, `authRefreshTokens`, `authVerificationCodes` and `authRateLimits`.
`authVerifiers` and `cadUploadSessions` have no exact owner index suitable for a
bounded per-run scan, so the bridge does not claim full-table absence for those
tables. The Password-only sequence does not exercise verifier or CAD upload-session
paths.

## Preserved Boundaries

All of the following remain false:

- production mutation
- CAD upload activation
- CAD conversion or Sandbox dispatch
- private CAD handling
- real-user enrollment
- email, SMS or Slack delivery
- provider, resource, usage or billing changes
- automatic retry or second run

## Validation

```sh
node --test scripts/cad-dev-auth-session-qualification-bridge.test.js
node scripts/cad-convex-contract-manifest.js
node scripts/cad-convex-source-audit.js
npm run cad:convex:codegen:check
npm run typecheck
git diff --check
```

## Next

After this bridge is merged, the next autopilot slice is a source-only rebind for
one fresh UTC window and an ignored local run register. That rebind still does not
authorize production, CAD uploads, conversion, private CAD, real users, external
messages, retry or a second run.
