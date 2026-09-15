# CAD Development Deploy Command Target Correction

This packet corrects the reviewed development deployment command before any
Convex mutation is retried.

The prior reviewed command used `convex deploy` with the approved local env file.
When tested, the pinned Convex CLI interpreted that as a production deploy
candidate for `wry-tapir-206` and stopped at a non-interactive confirmation
prompt. No production or development deployment mutation was observed.

The corrected command is:

```sh
npx --no-install convex dev --once --env-file .local/cad-convex/dev-auth-edt/convex-deployment.env --typecheck try --codegen enable
```

Why this command:

- `convex dev` pushes to the configured development deployment.
- `--once` runs the initial push path and exits instead of watching.
- `--env-file` uses the ignored selector file with only `CONVEX_DEPLOYMENT`.
- `--typecheck try` and `--codegen enable` preserve the reviewed validation
  posture.

Scope remains development-only. This packet does not authorize production
mutation, backend env mutation, secret generation, upload activation, conversion,
private CAD, real users, email/SMS/Slack, Sandbox dispatch, retry, second run or
live Auth/session execution.

After merge and production fail-closed smoke, the next safe action is exactly one
execution of the corrected development push command, followed by read-only
function/env verification and sanitized release evidence capture.
