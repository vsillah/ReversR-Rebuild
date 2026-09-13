# Mark handoff: evidence and local receipt

Companion to [Mark handoff](cad-mark-handoff.md). Source-only; expenses USD 0.
Branch: `codex/cad-mark-handoff-packet`.
Worktree suffix: `ReversR-Rebuild.worktrees/cad-mark-handoff-packet`.
Baseline: `ce8265f60f3ee7350c0515d49fa9b8d60dfc9cad` (PR #204).

## Production evidence and its limits

The existing RRb Integration Captain record reports:

- September 13, 2026, 23:41:19 UTC: #204 merged; production deployment metadata
  successful for the baseline above. Exact deployment:
  [PR #204 deployment](https://reversr-q5sp6sjy3-vsillahs-projects.vercel.app).
- September 13, 2026, 23:42:01 UTC: separately approved denial smoke passed on
  `https://reversr.vercel.app` using cache-busting query `qa=ce8265f`.

| Recorded request | Recorded result |
| --- | --- |
| GET / | 200 |
| GET /api/cad/capabilities | 200 |
| POST /api/cad/user-import, empty JSON | 401 USER_SESSION_REQUIRED |
| POST /api/cad/import, empty JSON | 401 UNAUTHORIZED |
| GET /api/cad/import-source-record | 404 |

This is a sanitized summary of the Captain's existing receipt, read locally for
this handoff. It is not a new endpoint check or an independent reconstruction of
raw response bytes. The summary does not record response headers, so this packet
makes no fresh production no-store assertion. A 200 capabilities response is not
user-upload authority; an operator capability can be enabled while user uploads
remain disabled. The 404 observation applies only to the named route.

Current [router source](../server/cadUserUploadRouter.js) sets no-store, verifies
session authority, and uses literal `BODY_ADMISSION_AUTHORIZED = false` before
body admission. Verified sessions terminate with `503 USER_UPLOADS_DISABLED`.
The [admission review](cad-disabled-upload-admission.md) records earlier synthetic
route tests; this lane did not rerun HTTP tests or conversion suites.

The [historical activation receipt](cad-production-activation-smoke-evidence.json)
is dated September 11 and binds an earlier commit. It proves a narrowly scoped
public cube operator run at that time. It is not #204 deployment evidence, a
customer upload qualification, or manufacturing/export acceptance. Existing private
pilot details and local source paths are deliberately omitted from this packet.

## Merged source progression

The local first-parent Git history confirms the following progression through
#204. Merge status means the source landed; it does not confer execution authority.

| PRs | Delivered scope |
| --- | --- |
| #164–#172 | Gated Import UX, upload/session/store foundations and provider decision contracts |
| #173–#178 | Convex-first offline store, gateway/schema and guarded synthetic Auth assembly/setup packet |
| #179–#188 | Disabled Auth boundary, wiring and development qualification/configuration preparation |
| #189 | Execution-blocker resolution packet |
| #190 | Development Auth execution readiness and rollback compatibility |
| #191–#192 | Positive synthetic sessions and transport/run register |
| #193–#194 | Removal/retention review and bounded retention policy |
| #195–#196 | Retained terminal state and private-register adapter contracts |
| #197 | Closed user-upload activation readiness inventory |
| #198 | Disabled admission scaffolding; mounted body gate stays false |
| #199–#200 | Offline shared controls and synthetic adapter qualification contract |
| #201 | Closed live-adapter qualification packet |
| #202 | Bounded live-run dossier with missing prerequisites and pending proofs |
| #203 | Fillable approval/envelope templates and permanently blocked offline checker |
| #204 | Development execution plan that exposes absent live runner/adapter and unresolved command cards |

The latest merge chain is #201 `d09a982`, #202 `fcc3539`, #203 `b96cec8`,
#204 `ce8265f`. The baseline was verified clean on the assigned branch before edits.

## Governing source and unresolved gates

- [Upload readiness](cad-live-upload-activation-readiness.md): nine separate gates;
  [readiness manifest](../offline/cad-convex/userUploadActivationReadiness.json)
  retains false approvals and null references.
- [Adapter qualification](cad-shared-controls-adapter-qualification.md): twelve
  live proof requirements. Synthetic adapter-double results cannot fill them.
- [Bounded dossier](cad-bounded-live-run-dossier.md) and
  [approval packet](cad-live-run-approval-packet.md): immutable limits, receipt
  bindings, private identity resolution and independent acceptance.
- [Execution plan](cad-live-dev-run-execution-plan.md): no reviewed live runner or
  concrete argv; resource binding, owners, cost enforcement, command cards,
  non-production pre/post denial evidence and recovery custody remain unresolved.

The adapter proposal allows at most 1,800 seconds, two clients, one ledger/window,
64 synthetic metadata records, 256 logical commands and 768 total transaction
attempts. The scenario matrix allocates 762 attempts; six remain unallocated.
Row limits still stop first. The proposed USD 9 total cap is unverified. No new
resource, store restart, backup/restore, rollover, retention/deletion or Auth test
is authorized. Actual crash/recovery and rollover gaps cannot be labeled passed.
Use #204 for the full limits and future one-run wording after every prerequisite
has been reviewed; this handoff grants no runtime authority.

## Local validation

Commands run from the assigned worktree:

```sh
git status --short
git branch --show-current
git log --first-parent -44 --oneline
node --test scripts/cad-live-run-approval-packet.test.js scripts/cad-bounded-live-run-dossier.test.js scripts/cad-live-adapter-run-packet.test.js
node scripts/cad-convex-contract-manifest.js --write
node scripts/cad-convex-contract-manifest.js
node scripts/cad-convex-source-audit.js
git diff --check
```

Results: 15/15 offline regressions passed; 139 integrity files verified; 125
source-audit files passed with zero leak-pattern matches and runtime isolation
intact. All 11 relative Markdown links resolve; merge ancestry and whitespace
checks passed. Humanizer review kept claims concrete and removed launch implications. No dependency installation, build, typecheck, UI/viewport QA,
live Auth, provider probe, HTTP smoke, conversion or private CAD processing is
needed for these documentation and audit-index changes. No deployment is created.

Files changed: `docs/cad-mark-handoff.md`, this appendix,
`scripts/cad-convex-contract-manifest.js`, `scripts/cad-convex-source-audit.js`,
and `offline/cad-convex/manifest.json`. The two docs join the existing integrity and
leak-audit lists. Runtime source and closed approval templates remain unchanged.

## Publication gate

Captain substitutes the full reviewed local commit reported at closeout. The SHA
cannot be embedded in its own committed bytes. This is future approval wording:

> Approve pushing only commit [full reviewed local SHA] from codex/cad-mark-handoff-packet to public repository vsillah/ReversR-Rebuild and opening a draft PR against main for the source-only Mark CAD Import handoff packet and offline audit indexes. Allow only normal automatic repository PR checks and their preview deployment. No merge, production deployment, manual deployment, live tests, env/provider/auth/resource or usage/billing changes, secrets, enrollment, email/SMS or external delivery to Mark, store mutation, CAD uploads, conversion, private CAD, Sandbox dispatch or branch/worktree/task cleanup.

Publication is not authorized by creating this packet. The future wording explicitly
separates automatic PR preview checks from production or manual deployment. Mark delivery
is a separate action and has not occurred. The current task stops at local commit.
