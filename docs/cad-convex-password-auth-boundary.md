# Local Password synthetic boundary candidate

Prepared 2026-09-12 from `5913641d200fe71c0a3b51f0d7c46de0f635bb39`.
Branch: `codex/cad-convex-password-auth-boundary`; worktree suffix:
`ReversR-Rebuild.worktrees/cad-convex-password-auth-boundary`.
Status: narrow offline source/test packet; incomplete live auth implementation.

The captain's delegation records Vambah's Password method selection for disposable
synthetic qualification in `reversr-cad-auth-dev`, development deployment
`majestic-alligator-31`, team `vambah-sillah` / `405220`. This lane did not verify
those dashboard facts. External Password provider-console configuration, OAuth
client/callback/logout configuration, and delivery-provider configuration are N/A.
No resource, env, deployment, live test, real-user enrollment or upload is authorized.
This receipt supersedes the pending P-selection wording in the
[live wiring packet](cad-convex-live-wiring-packet.md); its E/D/T gates remain closed.

## Implemented candidate

`offline/cad-convex/passwordPolicy.ts` provides a typed Password configuration
factory with an explicit test-only opt-in and a copied, host-owned cohort of 1–8
unique synthetic addresses under `auth-test.invalid`. The prefix and domain are
fixture constraints, not identity verification. Only existing-account signIn is
accepted. It accepts exactly flow/email/password, bounds password input to 12–128
characters, and rejects identity/permission claims and redirects. No passwords are
created, stored or printed by this source. Tests use a repeated-character fixture.
The minimum is an input constraint, not a production password-strength claim.

Signup, reset, reset verification and email verification always deny. No extra
provider, custom crypto, account linking, network client, env loader, route, or
registered function is added. Provisioning of even synthetic accounts is absent.
The factory is outside `convex/` and is not imported by runtime source. A test-only
boolean is an opt-in, not an authorization mechanism for a future deployment.

Tests run the pinned Password provider's actual authorize implementation with a
stubbed account mutation to prove denied flows stop before account operations.
They do not hash a password, create an account, mint a token or execute a session.
Policy errors are sanitized as `AUTH_UNAVAILABLE`; the SDK account-operation error
is deliberately observed in a local test to demonstrate the missing transport
sanitizer. This policy must not be exposed directly as a public auth endpoint.
Existing public CAD error sanitization remains unchanged.

## Exact-session findings and blockers

Inspected repository assembly/schema, CAD backend, gateway, adapters, preview and
admission harnesses, and pinned Auth 0.0.95 source under `src/providers/Password.ts`,
`src/server/implementation/index.ts`, `sessions.ts`, `types.ts`,
`mutations/signOut.ts` and `mutations/invalidateSessions.ts` in the installed package.
These are local pinned-source observations, not remote lifecycle proof.

- Auth helpers extract user/session IDs from an already authenticated identity's
  subject. They do not themselves check session existence or establish method.
- Library session rows contain userId and expirationTime, with no method receipt.
  Password selection, an email, or an authAccounts row does not prove the method
  used by a particular originating session. The generic pre-session callback only
  receives userId; this packet does not fabricate a session/method binding.
- Library signOut deletes the exact current session and its refresh tokens. A JWT
  can outlive that deletion; authority must point-read the session and owner in the
  same snapshot on every operation. Local synthetic tests model deletion; live
  logout, replay and two-client transaction behavior remain unqualified.
- The library's bulk invalidateSessions implementation uses an indexed collect.
  No custom bulk revocation or library patch was added. Review bounded cohort/session
  limits before any later live conformance run.
- Trusted service authentication, identity propagation into internal CAD functions,
  replay protection, safe error projection, authority provisioning, login rate limits,
  exact return/logout routes, unknown-commit reconciliation and rollback remain
  incomplete. Internal function arguments are not verified caller identity.

Therefore `convex/auth.ts` still has zero providers, `convex/auth.config.ts` zero
trusted issuers, and `convex/librarySession.ts` still throws `AUTH_UNAVAILABLE`.
Environment values cannot activate this candidate. Live preview mode still rejects
configuration; no real endpoint is placed in runtime configuration. All six CAD
registrations remain internal. No public CAD endpoint or upload admission changed.

## Preserved authority acceptance criteria

The new Password-specific synthetic test feeds the existing reader into actual CAD
source registrations through the test loader only. It checks method projection,
wrong exact-login denial, stale identity after session deletion, replacement login
isolation and zero upload-session writes. Existing focused tests cover owner
mismatch, missing owner, expiry, malformed evidence/outages, membership and permission
disable/regrant generation invalidation, immediate revocation, no positive cache,
CSRF/origin errors, sanitized CAD errors, and denial before request body access.
No test-supplied verified flag is cryptographic or live provider evidence.

## Next review and gates

1. Captain reviews this local commit as a narrow policy candidate and presents the
   exact publication phrase. Push and draft PR creation need that approval; no merge
   or cleanup follows from it.
2. The next source slice must choose and implement a reviewed exact-session method
   provenance design (or prove an isolated Password-only session history), trusted
   service transport and identity context, sanitizer, synthetic-only provisioning,
   rate/TTL bounds, replay/unknown-commit handling and disabled rollback release.
   Re-run snapshot, generation and denied-body tests. Until these pass, keep the
   production reader unavailable and provider/issuer arrays empty.
3. Before E, captain fills the destination/operator, name/scope, cost-cap and rollback
   manifests in the live wiring packet. Future requirements include deployment-only
   `JWT_PRIVATE_KEY` and `JWKS`, verified platform `CONVEX_SITE_URL`, source application
   ID `convex`, and an explicit `SITE_URL` requirement or N/A decision for the chosen
   flow. App/service consuming code and exact env names remain pending. No value is
   generated, installed, logged or guessed by this packet.
4. E, D and synthetic live T each require their own concrete approved manifest.
   Upload activation, private CAD, conversion, Sandbox dispatch, production changes,
   Supabase/other-store writes and branch/worktree cleanup remain separate closed gates.

## Validation receipt

Run from this worktree with the existing pinned dependencies through an ignored
sibling node_modules symlink; no install or env file is needed:

```sh
node --test scripts/cad-convex-*.test.js scripts/cad-provider-store-contract.test.js scripts/cad-upload-session*.test.js scripts/cad-user-upload-route.test.js
npm run typecheck
npm run cad:convex:codegen:check
node scripts/cad-convex-contract-manifest.js --write
node scripts/cad-convex-contract-manifest.js
node scripts/cad-convex-source-audit.js
git diff --check
```

Passed: 80/80 focused tests, TypeScript, five generated bindings, the 44-file
manifest, 30-file source audit and whitespace check. TypeScript initially found
a policy return-type narrowing error; the corrected denial helper and its four
focused tests passed again. Manifest version 8
covers the policy, test and this packet. Source audit covers the same additions and
recursively rejects runtime references to the offline policy. Staged changes receive
a separate count-only leak/path scan. No UI changes, browser QA, live auth, deployment,
remote concurrency or production proof are claimed. Expense incurred: $0.

Completed: restricted Password policy and executable offline regression packet.
Plan change: full live assembly remains deferred for the concrete blockers above.
Next safe action: captain source review; next human decision: exact public publication
approval. Keep this branch, worktree and task available.
