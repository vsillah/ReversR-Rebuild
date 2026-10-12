# ReversR Desktop Blueprint V2

V2 extends the released desktop workspace without changing CAD authority, live-provider access, or manufacturing decisions.

## Roadmap

1. **Complete desktop coverage — implemented in this change.** Use the released rail, workspace header, phase rail, bounded canvas, and inspector rules across Home, Build, Projects/History, Account, and Settings. Preserve the existing 390px and 768px experiences. Cover ordinary loading, empty, unavailable, locked, recoverable-error, and populated states with explicit next actions.
2. **Workstation ergonomics — implemented in Phase 2.** Desktop web now provides focus-safe `G`-sequence navigation, a concise shortcut reference, direct canvas/inspector focus targets, and a bounded resizable inspector with keyboard controls, reset, local presentation preference restoration, and narrow-desktop collapse. Compact mobile/tablet behavior remains unchanged.
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

## Phase 2 boundaries and validation gate

- Desktop shortcuts are inactive while an editable field or modal owns focus. `Escape` closes only the shortcut reference and never discards reconstruction work. Browser and operating-system modifier shortcuts remain untouched.
- Inspector resizing is available only where the released shell already supplies an inspector. Width stays between 260px and 480px, arrow/Home/End/0 keyboard controls are supported, and narrower desktop widths start collapsed.
- Inspector width and wide-desktop visibility are stored only in the local `reversr-desktop-presentation:v1` presentation preference. No account, CAD, provider, upload, conversion, custody, billing, or production record is created.
- Rendered interaction review covers 390, 768, 1024, 1280, 1440, and 1920 widths, including editable/modal suppression, `Escape` safety, keyboard and pointer resizing, bounds, reset, restoration, collapse, focus preservation, overflow, and zero external writes.
- Phase 2 ends at a draft pull request and Human QA evidence. Mark-specific manufacturer feedback remains exclusively in Phase 3; pilot hardening remains Phase 4.
