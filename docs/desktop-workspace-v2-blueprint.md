# ReversR Desktop Blueprint V2

V2 extends the released desktop workspace without changing CAD authority, live-provider access, or manufacturing decisions.

## Roadmap

1. **Complete desktop coverage — implemented in this change.** Use the released rail, workspace header, phase rail, bounded canvas, and inspector rules across Home, Build, Projects/History, Account, and Settings. Preserve the existing 390px and 768px experiences. Cover ordinary loading, empty, unavailable, locked, recoverable-error, and populated states with explicit next actions.
2. **Workstation ergonomics — planned, not implemented.** Evaluate denser keyboard-first operation, workstation shortcuts, resizable work regions, and long-session ergonomics after Phase 1 visual and interaction QA.
3. **Manufacturer feedback — gated, not implemented.** Apply Mark's manufacturing decisions only after they are recorded and approved. Phase 1 makes no Mark-specific product or fabrication claims.
4. **Pilot hardening — planned, not implemented.** Run installed-browser/device qualification, accessibility and persistence regression, pilot telemetry review, and release evidence after Phases 1–3 are accepted.

## Phase 1 boundaries

- `cadAuthenticatedIgs*` remains the sole private authenticated IGS authority.
- The public Dispenser fixture and guided tour remain review fixtures; neither proves private upload, conversion, fabrication readiness, or production activation.
- No provider, credential, environment, Convex, R2, Sandbox, upload, conversion, payment, billing-plan, deployment, or production change is included.
- Existing loading, signed-out, unavailable, locked, and error copy remains truthful. Desktop presentation does not grant capabilities.
- Phase 1 ends at a draft pull request and Human QA evidence. Merge, deployment, and pilot activation are separate gates.

## Phase 1 validation gate

- Focused tests, TypeScript, static export, and `git diff --check` pass.
- Rendered interaction review covers 390, 768, 1024, 1280, 1440, and 1920 widths.
- Home, new reconstruction/Build, Projects/History and review queue, Account, Settings, tour, and the public Dispenser fixture are exercised without external writes.
- Navigation, keyboard focus, loading/empty/locked/error recovery, and mounted-state persistence are checked.
- A privacy-safe H.264 walkthrough is decoded successfully before Human QA is requested.
