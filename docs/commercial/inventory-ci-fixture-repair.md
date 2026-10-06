# PR #484 inventory CI fixture repair

The local release run `37381591987`, job `112004664539`, stopped at inventory-preflight with `Inventory match failed: Commercial credit storage unavailable.` The fixture launched the default server with neither an explicit isolated commercial store nor a synthetic session adapter. The earlier missing-credentialRef response was the intended negative test.

This repair changes test/CI code only. `scripts/fixtures/inventory-api-harness.js` imports the unchanged real server, supplies an in-memory exact synthetic bearer lookup through its existing local test adapter, and listens on loopback. Its own HTTP boundary requires that exact synthetic session, including for legacy zero-cost local routes. This proves fixture isolation, not hosted production identity acceptance or authenticated operational qualification. Default and hosted denial tests still exercise the unmodified runtime with a valid synthetic session.

The fixture creates a fresh temporary commercial store and empty HOME/EXPO_HOME for each child. The environment is constructed explicitly, without inherited provider/auth values, NODE_OPTIONS or dotenv loading. The child allows outbound sockets only to the assigned loopback inventory fixture port and denies TLS. Public provider/CAD links in the fixture remain metadata; assets are not fetched. No credentials were read or minted.

Both fixture and API ports default to OS-assigned ports. The parent waits for an IPC message from its own child after successful bind before checking health. Occupied explicit ports reject startup instead of accepting an unrelated listener. Closing or failed startup terminates the child and removes temporary storage. Existing missing-credentialRef, inventory record, source-backed 3D metadata and six-item BOM assertions are preserved.

Four tests cover exact-session/header-spoof rejection, default/hosted denial, occupied-listener ownership plus failed-start cleanup, and separate stores/inherited synthetic poison rejection/cleanup. `.github/workflows/commercial-source-ci.yml` now runs these tests. The protected release workflow and runtime sources are unchanged.

## Validation

Validated 2026-10-05 from reviewed source HEAD `95a48f4c95c5564d628e3ef042c1af3253eff5b0` plus this scoped fixture repair:

```sh
env -i PATH=/usr/local/bin:/usr/bin:/bin node scripts/inventory-connector-preflight.js
env -i PATH=/usr/local/bin:/usr/bin:/bin node --test scripts/inventory-api-harness.test.js
env -i PATH=/usr/local/bin:/usr/bin:/bin node scripts/commercial-credit-gate-smoke.js
env -i PATH=/usr/local/bin:/usr/bin:/bin node --test scripts/cad-user-upload-route.test.js scripts/commercial-convex-transport.test.js scripts/inventory-api-harness.test.js
env -i PATH=/usr/local/bin:/usr/bin:/bin node node_modules/vitest/vitest.mjs run --config commercial-backend/vitest.config.ts
env -i PATH=/usr/local/bin:/usr/bin:/bin node node_modules/typescript/bin/tsc --noEmit --pretty false
env -i PATH=/usr/local/bin:/usr/bin:/bin node scripts/commercial-convex-codegen.js --check
```

Results: inventory preflight passed; all existing 56 tests and four new harness tests passed (60 total); TypeScript and commercial codegen passed. All ten existing default-closed CAD source guards listed in `convex-source-handoff.md` passed, without `--write`. Production directories and the protected release workflow compare unchanged to the reviewed HEAD. The root CAD generator and root Convex tree remain byte-equivalent to the original base; the pre-existing root `cad-convex-codegen.js --check` stale `api.d.ts` limitation remains separate and unrepaired.

## Full release evidence

Disposable validation root:

`/var/folders/q2/spyh50y9083bsnp9059ttv400000gn/T/reversr-pr484-validation-2gepkgm9`

The snapshot was extracted from `git archive HEAD` with the scoped fixture files overlaid. No `.env*`, `.local`, `.vercel` or `.npmrc` custody entered it (`.env.example` was also excluded). Dependencies were cloned into the snapshot, rather than sharing a writable node_modules directory. All generated release documents remain in this disposable source snapshot, not the reviewed checkout.

The unchanged `npm run release:local-ci` ran all 16 commands with no skips and passed 16/16. It used `env -i`, an isolated PATH exposing only node/npm/npx plus system utilities, empty temporary HOME/EXPO_HOME, fresh offline npm cache and empty npm config paths, `EXPO_OFFLINE=1 EXPO_NO_DOTENV=1 EXPO_NO_TELEMETRY=1 CI=1 NPM_CONFIG_OFFLINE=true`. A local Node preload denied non-loopback sockets and all TLS throughout the parent pipeline. The inventory child uses its own stricter fixture-port boundary. No provider, hosted URL, CAD asset, login or deployment operation ran.

Evidence under the validation root:

- `source/docs/local-release-ci-evidence.json`: actual 16-command results, 16 passed, zero failed or skipped.
- `release-local-ci.log`: actual npm release-run output.
- `commercial.log`, `cad-transport.log`, `convex.log`, `typecheck.log`, `commercial-codegen.log`: focused results.
- `guard-*.log`: ten unchanged CAD guard results.
- `source/docs/native-release-config-evidence.json`: honest EAS CLI/login pending state. Global EAS was absent from the isolated PATH and pinned npx returned `ENOTCACHED` under offline mode; no CLI or login success was mocked.
- `snapshot-exclusions.txt` and `deny-external.cjs`: snapshot exclusion and network-boundary evidence.

The source-only candidate is ready for Captain's independent review and push. No push, merge, deployment or activation was performed here. Existing human-review lane and local servers remain open. No expense was incurred.
