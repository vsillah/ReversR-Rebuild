# CAD Auth restricted receipt-bundle preparation

Status: source-only, disabled, non-executable. PR #398 merged the command-card
preparation at `b3812cca0a1f67126fd8e6867b8fb77c0748a86f`. This packet binds that
parent and provides a public skeleton for a future restricted receipt bundle.
All refs, receipt digests, evidence values and review receipts remain null.
Source hashes establish local integrity only; they do not establish live readiness.

## Required receipt categories

The skeleton inherits the exact categories and evidence slots from PR #398:

| Category | Required evidence slots |
| --- | --- |
| Concrete provider runtime binding | Adapter source hash, installed runtime receipt, provider binding receipt |
| Executable collector command design | Reviewed collector source hash, disabled card digest, command review receipt |
| Restricted synthetic cohort | Restricted cohort receipt, synthetic ownership receipt |
| Custody and independent reviewer | Custodian receipt, independent reviewer receipt, restricted store receipt |
| Durable consumed-run ledger | Ledger receipt, atomic consumption receipt, stop/unknown consumption receipt |
| Installed route/body observer | Installed observer receipt, earliest boundary receipt, platform buffering receipt |
| Late-grant observer | Installed observer receipt, late-grant denial receipt |
| Immutable target recheck | Candidate commit, immutable deployment reference, source digest receipt, UTC recheck time |

Each category also reserves `receiptRef` and `receiptSha256`, and remains
`MISSING_PREREQUISITE`, unreviewed and unaccepted. The category's `boundMergeCommit`
retains the PR #397 collector-binding provenance inherited from PR #398; the
packet parent records the PR #398 merge. Neither is a runtime candidate receipt.
Bundle-level custody reserves distinct reviewer verification, retention-policy
and deletion-disposition receipt slots. These are future review requirements,
not completed custody or permission to create a restricted store.

## Handling and the next human gate

1. Review this source-only structure and its source bindings in the draft PR.
2. Separately scope the restricted binding work, custodian, independent reviewer,
   user-owned store, seven-day retention policy and separately authorized deletion
   disposition before providing any values. Keep concrete references, mappings
   and receipts outside Git and public artifacts. Never put tokens, cookies,
   headers, secrets, bodies, private CAD or raw exceptions in a bundle.
3. In that later scope, independently review all eight categories, provenance,
   receipt digests and immutable target/source freshness. Missing or unknown
   evidence stays blocked. Local tests cannot fill installed/provider receipts.
4. Only after restricted review, separately prepare and review a sealed card and
   a fresh exact approval gate. The previous stopped window is not reusable.

This checker accepts only the empty preparation contract. Populated refs/digests,
private fields, promoted flags, live commands, accessors, proxies and cycles are
rejected without evaluating hooks or echoing input. No ingestion, ref resolution,
restricted-file access, receipt persistence or automatic promotion is implemented.
`--write` regenerates only the fixed public skeleton, never a restricted bundle.
The SHA-256 bindings cover fixed repository source files and validated parent
packets; they are integrity checks, not signatures or independent review evidence.

## Local validation

```sh
node scripts/cad-auth-restricted-receipt-bundle-checker.js
node --test scripts/cad-auth-restricted-receipt-bundle.test.js scripts/cad-auth-command-card-source.test.js scripts/cad-auth-live-collector-binding.test.js scripts/cad-auth-live-evidence-acceptance.test.js scripts/cad-auth-live-evidence-sealed-card-prep.test.js
node scripts/cad-convex-source-audit.js
node scripts/cad-convex-contract-manifest.js
git diff --check
```

No live Auth/provider tests, provider/env/resource/billing changes, secret reads,
upload-session issuance, production upload activation, request-body admission or
read, conversion, Sandbox dispatch, private CAD, real-user commercialization,
external messages, retries, second run, runtime activation, executable command-card
issuance or commercial-readiness claim is authorized by this packet.
