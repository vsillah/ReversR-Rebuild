# Commercial sign-in rejection contract

This source-only repair makes expected commercial sign-in rejection observable through production error redaction. It does not establish live authentication qualification, exact internal rejection cause, or commercial readiness.

Base: `8e6c269f5557787d111b776039ef3c36512a4c10`. Local branch: `codex/commercial-authentication-rejection-repair`.

## Contract

Sign-in uses provider `commercial-password-signin` with exactly `email`, `password`, and `flow: signIn`. Signup continues using official `password` with `flow: signUp`. The assembly gate controls both providers; the adapter checks configuration again before delegation. No schema, account migration, billing, CAD, deployment or environment change is included.

Expected rejection returns `ConvexError.data` with exactly:

```json
{"kind":"commercial-auth","version":1,"code":"SIGN_IN_REJECTED"}
```

Wrong secret, unknown account and account-specific throttling have the same public payload. It identifies explicit sign-in rejection, not which branch ran. Unknown errors are rethrown. Invalid parameters, unavailable configuration, network failures, generic Server Error, strings containing codes, other versions, missing/extra fields and resolved-null tokens cannot establish this contract. This reduces error-code enumeration; it does not claim constant-time authentication or remove existing provider timing differences.

The frontend uses a fixed rejection message and a separate fixed inconclusive message. It never displays the raw SDK message. A resolved SDK result with `signingIn: false` remains inconclusive.

## Public provider composition

The adapter uses public `ConvexCredentials` and `signInViaProvider(ctx, Password(), { params })`. The installed helper requires the constructed provider object: passing the Password factory directly failed the initial offline probe. No installed package was changed.

The credentials branch delegates account lookup and verification to official Password. Its original `password` account namespace, Scrypt hashing, failed-attempt accounting and reset-on-success behavior remain in use. The optional helper `accountId` belongs to email/phone flows; the adapter neither supplies it nor accepts client account/session IDs.

The inner public helper creates the official session without generating tokens and returns `userId` and `sessionId`. Returning both unchanged lets the outer credentials flow reuse that session. The offline fixture executes both official store mutations and verifies exactly one new session and the same user. It exercises the public helper with token generation disabled; actual signed-token issuance remains untested because no signing keys were generated or read.

Production code has no `.options`, `._handler`, direct `auth:store`, custom hashing, custom sessions or direct auth-table writes. Translation of the exact ordinary Error messages is a pinned dependency compatibility assumption. The real-provider tests must pass on any dependency upgrade. Future email verification or recovery changes need a fresh review of this composition.

## Qualification checker handoff

`utils/commercialAuthRejection.ts` exports `inspectCommercialSignInRejection(action, onResolution)`. A later authorized checker should call the new provider and accept only `confirmed_sign_in_rejection`. The required resolution callback retains any unexpected tokens privately for cleanup; the diagnostic returns no tokens, messages or account values. Every result explicitly records `exactInternalCauseEstablished: false`.

Do not reuse the old message-regex `wrong_password_denied` pass criterion, rename old failed receipts, or treat throttling as proved mismatch. Existing private operational scripts and historical receipts were not changed. A later live checker needs fresh source/deployment bindings and authorization; this commit authorizes no execution.

## Offline validation

All Node commands below use the prefix `env -i PATH=/usr/local/bin:/usr/bin:/bin` from the worktree:

```sh
node node_modules/vitest/vitest.mjs run --config commercial-backend/vitest.config.ts
node scripts/commercial-credit-gate-smoke.js
node --test scripts/cad-user-upload-route.test.js scripts/commercial-convex-transport.test.js scripts/inventory-api-harness.test.js
node node_modules/typescript/bin/tsc --noEmit --pretty false
node scripts/commercial-convex-codegen.js --check
```

Results: 30 Vitest tests (including eight new contract/composition tests), 29 commercial regressions and 14 route/transport/fixture tests pass. TypeScript and commercial generated bindings pass. Fixtures use synthetic accounts in ephemeral local Convex-test storage, forbidden provider fetch or explicitly supplied fake SDK fetch. No live account, customer data, credential custody, signing keys or provider was used. Installed dependencies are unchanged.

Source review covered strict inputs, error translation, unchanged assembly gating, official provider/session reuse, safe frontend feedback, exact checker matching and generated API scope. The test-only fixture uses a synthetic typed context and public helper to avoid token generation. Captain's separate private compatibility probe remains separate from production code.

Not tested: live redaction, token minting, cloud durability, production session revocation, rendered UI, or a frontend export. The existing unrelated root CAD generated-binding limitation remains outside scope. Next is Captain source review; runtime remains outside this task.
