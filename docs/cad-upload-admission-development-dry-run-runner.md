# CAD upload admission development dry-run runner

Status: source-only local dry-run runner. No live run happened. Base:
`ad06d66430d45cc24bfd5fad7501e2a04e0e68a4`, after PR #270. Branch:
`codex/cad-upload-admission-development-dry-run-runner`. Expenses: USD 0.

This packet turns the upload-admission dry-run preview into a bounded local
runner for synthetic refs only. It keeps the mounted production route
fail-closed and does not read CAD bytes, open body admission, mutate Convex,
enable uploads, dispatch conversion, dispatch Sandbox work, read secrets, or
use private CAD.

The accepted runner window is `2026-09-16T04:45:00Z` through
`2026-09-16T05:00:00Z`. If merge and production smoke complete more than five
minutes before that window, schedule one active one-shot run. If the window is
missed, do not run it; prepare a fresh window instead.

## Validation

```sh
node --test scripts/cad-upload-admission-development-dry-run-runner.test.js scripts/cad-upload-admission-development-dry-run-acceptance.test.js scripts/cad-user-upload-route.test.js
node scripts/cad-convex-contract-manifest.js
node scripts/cad-convex-source-audit.js
npm run cad:convex:codegen:check
npm run typecheck
git diff --check
```

## Execution command

```sh
node scripts/run-cad-upload-admission-development-dry-run.js
```

The script writes ignored sanitized evidence under
`.local/cad-convex/upload-admission-development-dry-run-0445z` with directory
mode `700` and file mode `600`.
