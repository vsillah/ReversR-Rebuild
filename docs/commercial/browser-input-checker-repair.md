# Offline profile-input checker repair

Base: `f8a99e93e1c9e195bbee62fc3e0c09871a491a8a`.
Branch: `codex/commercial-browser-input-checker-repair`.
Worktree: `/Users/vambahsillah/.codex/worktrees/d93b/ReversR-Rebuild`.

The stopped run reported a target-token mismatch on its first profile-name fill. Save was not dispatched. That evidence does not establish a product save defect or the driver failure's cause. Reviewed `focusVisibility.ts` schedules scroll operations; it does not establish that a delay or a fill retry would repair the browser target.

## Helper contract

`scripts/commercial-browser-input-checker.mjs` exports `createSyntheticProfileInputChecker(tab)`. Each returned function permits one attempt, including failed validation. It accepts exactly `{ account, field, phase }`:

- `account`: `A` or `B`.
- `field`: `name` or `shop`, targeting exact labels `Profile name` or `Shop name`.
- `phase`: `edit` or `restore`. Values are generated internally from the existing synthetic naming convention; edit appends ` UI Check`, restore uses the original synthetic profile value. Arbitrary input values and credential fields are rejected.

The sequence is: initial full silent observation and target checks; semantic input click to focus; full silent observation; fresh exact locator; unique/visible/enabled/editable/focus checks; one fill dispatch; full silent observation; fresh target and boolean equality check. Browser evaluation reads DOM state only. It never performs focus, fill, Save, navigation or other mutation through evaluation.

Full state uses `{ emit: false, disableDiffing: true }`. Trees are discarded, and evaluation returns only a boolean. Results contain only `ok` and a fixed `reason`. Tool exceptions, field values, account email and credentials are never returned or logged.

Any failed/unknown operation stops immediately. A fill that throws after a partial effect remains `FILL_UNCONFIRMED`; no post-failure observation, retry, fallback or Save follows. The same checker cannot be reused. Recreating it to retry an uncertain operation would violate this contract.

## Safe integration

Captain should review and integrate these source files separately; the shared `/tmp` helpers are unchanged. Under a separately authorized browser run:

1. Keep the existing exact API identity/shop gates, signed-in profile checks, protected read-only email presence check, Free/credit state checks and rollback ownership gates. Do not replace them with this input helper. The helper proves no account identity or authorization.
2. For one approved synthetic profile-field operation, create one checker and invoke it once. The input click is the explicit focus action. Do not cache a locator across that action.
3. Only `ok: true` confirms the rendered input value at the last observation. It proves neither persistence nor Save completion. This helper never authorizes or dispatches Save.
4. On any other result, stop the browser workflow and hand control to the existing approved cleanup/rollback policy. Do not automatically restore by filling, repeat the call, or proceed to another field.

## Offline evidence and limits

The fixture deliberately invalidates a captured locator on focus. The unsafe cached-locator sequence fails, while the fresh-observation/reacquisition sequence passes. Tests cover both accounts, both fields, both phases, absent/duplicate/invisible/disabled/read-only targets, focus changes, disconnected nodes, stale references, observation failures, fill failure before/after partial effect, mismatch and consumed-attempt refusal. Tests forbid fetch and socket connections. They exercise the actual read-only evaluation function against a fake DOM.

Commands from this worktree, each prefixed with `env -i PATH=/usr/local/bin:/usr/bin:/bin`:

```sh
node --test scripts/commercial-browser-input-checker.test.mjs
node --test /tmp/reversr-commercial-qualification-f8a99e93/browser-ui-contract.test.mjs
node --check scripts/commercial-browser-input-checker.mjs
```

No browser or provider-connected server was opened. No runtime source, dependencies, credentials, custody, configuration, historical receipts or shared temporary helpers were changed. Fake fixtures prove the helper's ordering and stop behavior, not the actual integrated browser driver's repair. A future bounded live run remains a separate authorization and validation gate.

Results: 24 new checker tests and six existing browser-contract regressions pass. Syntax and `git diff --check` pass. No live verification was performed.
