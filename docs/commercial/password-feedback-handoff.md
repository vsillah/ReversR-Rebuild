# Account password feedback

2026-10-06. Branch: `codex/commercial-login-password-feedback`, based on fetched `origin/main` at `7a0985b35dbe06fc2431d98f1e1301da40a35efc`. Existing worktree and ignored local evidence were preserved.

The password field now has an always-visible helper directly underneath it: neutral minimum-length guidance when empty, remaining-character feedback for lengths 1–7, and minimum-met feedback at 8+. Editing or deleting updates it immediately. It describes the actual eight-character default in the installed Convex Auth Password provider; it makes no strength claim or extra composition requirement. Text accompanies theme neutral/error/success colors. The helper has a polite status/live region, web `aria-describedby` association and native accessibility hint. Password masking, email/length/busy gating and generic failure copy are preserved.

The signed-out Profile section explains that account creation happens above; existing users sign in. Name and Shop name can then be edited in that section and saved. Login email remains read-only. No parallel profile creation workflow was added.

Changed source/tests: `components/CommercialLogin.tsx`, `app/account.tsx`, `utils/commercialPasswordFeedback.ts`, `commercial-backend/tests/password-feedback.test.ts`, `qa/commercial/password-feedback-regression.mjs`. No backend policy, provider configuration, root Convex or commercial backend function changes.

## Validation

All commands below passed with `env -i PATH=/usr/local/bin:/usr/bin:/bin` before Node:

```sh
node node_modules/typescript/bin/tsc --noEmit --pretty false
node node_modules/vitest/vitest.mjs run --config commercial-backend/vitest.config.ts
node scripts/commercial-credit-gate-smoke.js
node --test scripts/cad-user-upload-route.test.js scripts/commercial-convex-transport.test.js scripts/inventory-api-harness.test.js
node scripts/commercial-convex-codegen.js --check
```

Results: 19 Vitest tests, 29 commercial tests, 14 CAD/transport/fixture tests (62 total), TypeScript and commercial codegen passed. The unchanged Vitest config still emits its existing non-failing future-loader warning.

Unit checks cover empty, 1, 7, 8 and 9 characters plus valid-to-invalid/replacement/deletion transitions, and the full email/length/busy gating combinations. The CUA-only regression ran against actual Account/CommercialLogin components in the local mock harness and verified the same input transitions, both buttons, missing-email denial, masked input, helper association and polite live-region markup. It never submitted either auth action. Only lengths and states are reported; input values are not logged or saved. Browser evidence is a masked screenshot at `/tmp/reversr-password-feedback-export.6kZhKT/password-feedback-mock.jpg`. The harness mocks auth, native bridges and icons; it is not a live-auth proof. Its server is port 5179, session `40345`.

## Fresh packaged export for Captain QA

The real Expo export passed with cache cleared:

```sh
env -i PATH=/usr/local/bin:/usr/bin:/bin HOME=/tmp/reversr-password-feedback-export.6kZhKT/home EXPO_HOME=/tmp/reversr-password-feedback-export.6kZhKT/home EXPO_OFFLINE=1 EXPO_NO_DOTENV=1 EXPO_NO_TELEMETRY=1 CI=1 EXPO_PUBLIC_COMMERCIAL_BACKEND=convex EXPO_PUBLIC_COMMERCIAL_CONVEX_URL=https://hip-elephant-705.convex.cloud EXPO_PUBLIC_COMMERCIAL_CONVEX_ISSUER=https://hip-elephant-705.convex.site node node_modules/expo/bin/cli export --platform web --clear --output-dir /tmp/reversr-password-feedback-export.6kZhKT/output
```

Export: `/tmp/reversr-password-feedback-export.6kZhKT/output`. Log: `/tmp/reversr-password-feedback-export.6kZhKT/export.log`. The home directory began empty, and only the specified public deployment values were supplied. No real or synthetic auth request was made. The existing user-owned `127.0.0.1:5181/account` tab and server were not changed or reloaded; browser viewport settings were not changed.

Next: Captain independently serves this new export and checks the actual `/account` route at 320/390/768/1440, then renewed Human QA. This local commit does not authorize push, PR creation, merge or deployment. Keep the lane open. The pre-existing root CAD codegen limitation remains unchanged and outside this UI scope.
