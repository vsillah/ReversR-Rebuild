# CAD successor-register provenance acceptance prep

Status: restricted evidence acceptance prep. Branch:
`codex/cad-successor-register-provenance`. Baseline:
`bfd481fe2e5409c5cc384536543428c5627adb82`. Expense: USD 0.

## Result

The authentic fresh rollover restricted register from PR #216 remains absent.
The older accepted register digest
`0ed5be1773de1db4f7f9f6991a63f29473a530dfe53716ee1d955e61380c3c58`
was not substituted for the fresh rollover digest
`3bd0ec777a9f3f2ec748e17ff05591b78e22378a6ac63256b5682a7940320724`.

An ignored successor restricted register was prepared from reviewed local
successor artifacts. The tracked projection contains only refs, SHA-256
digests, byte counts and gate state. It does not contain restricted register
values, restricted command bytes, provider output, secrets, CAD bytes or local
machine paths.

## Source-safe bindings

| Artifact | Digest |
| --- | --- |
| PR #218 source-safe packet | `adadfc84badd892708744feeca885e5498582282e793b3fc1bc15e8a96fc984d` |
| Prior fresh rollover projection | `d6c36899e75ed925b5232add3e9c8144bb8f53a59c14dbdffb1a95c5492296f9` |
| Prior fresh rollover restricted register | `3bd0ec777a9f3f2ec748e17ff05591b78e22378a6ac63256b5682a7940320724` |
| Successor public projection | `9b05d00e9825cadc3c7aa1af561700ed8c00af22c0b1648530b68ae509d25026` |
| Successor restricted register | `419151192084ed42d347f2f4973511a3166e792325a197801a8586df017baa6c` |
| Successor command-card projection | `c916d8c869b354d55297ea5dc76cb2cf50db03ead73d7766a7d3c66d4371658c` |
| Successor restricted command set | `8decf5762fd50e0a8cb54d99101a4843e886f1082a6ee0f54be080ee406f2f8b` |
| Expired-run closeout receipt | `25006f0f0a79bd5ccd156c7f87c670c024b64f9745ea398d7ff5a64a768fc199` |

The ignored local artifact directory is Git-ignored and mode `0700`; local
restricted files are mode `0600`. The successor register byte count is `56204`.
The public projection byte count for command cards is `12416`.

## Successor window

The successor evidence is bound to `2026-09-15T17:00:00Z` through
`2026-09-15T17:05:00Z`, maximum 300 seconds. The window is not a live-run
approval, does not refresh automatically, and requires a new packet if it
expires before the later one-run approval gate.

## Review state

The source-safe projection covers all 45 restricted evidence fields and all five
C0-C4 command cards. It remains unaccepted until the explicit restricted
evidence acceptance gate is approved. Live execution remains
`BLOCKED_UNTIL_RESTRICTED_EVIDENCE_ACCEPTED_AND_EXECUTOR_REBIND_REVIEWED`.

No live run, provider/resource/env mutation, upload activation, conversion,
private CAD, Sandbox dispatch, deployment, merge, expired-run retry, second run
or cleanup is authorized by this packet.

## Exact restricted evidence acceptance phrase

> Approve accepting restricted successor evidence projection 9b05d00e9825cadc3c7aa1af561700ed8c00af22c0b1648530b68ae509d25026 for synthetic durable-adapter development run rrb-ref:successor-bounded-development-run with private successor restricted register 419151192084ed42d347f2f4973511a3166e792325a197801a8586df017baa6c, command cards C0-C4 byte-count/digest receipts 8decf5762fd50e0a8cb54d99101a4843e886f1082a6ee0f54be080ee406f2f8b/c916d8c869b354d55297ea5dc76cb2cf50db03ead73d7766a7d3c66d4371658c, resource alias rrb-ref:successor-resource-alias, namespace/ledger/window/fence rrb-ref:successor-namespace/rrb-ref:successor-ledger-window/rrb-ref:successor-fence, UTC/cost cap evidence 5fd1bf4f70ef6a4ebd617d20e3a564ab7ccc9485cb17476ca2ae0f4d2d207df0/84ae5de3cc62da2d7a6ac54a2156a47e97f9f7f04dc345ad97d4deb9954bd6dd, custody and reviewer acceptances cf219145a08fb0baa24a69e9abf9a6a8b9f37c8ee4d5e8011c4d4d42cbc2c94e/756bef52c8bafc912b0577e4832a1dc746945f9051619dc7c76814980b8f5418/rrb-ref:cad-successor-independent-review, disabled-route pre/post plan 1be4c97e91de4df210feb7521764ceb555b13aae4ca2622252e68acdc8e47dab, reconciliation/rollback acceptance 8909f264a64daba7980809f1f2d13f47fed05922f52c94d8298983b814cee210/1c41262b552698cd730652fa4640139c578691842012d484f31b7e0dad9062af and retained-state custody 1aad901b40ffe01acfd169a1a6c78659bbd4d0c411f29ec6e1c3a77c7cd898f8. This accepts evidence completeness only and authorizes no live run, provider/resource/env mutation, upload activation, conversion, private CAD, Sandbox dispatch, deployment, merge or cleanup.

## Next publication phrase

> Approve pushing only commit [full reviewed SHA] from codex/cad-successor-register-provenance to public repository vsillah/ReversR-Rebuild and opening a draft PR against main for the source-safe CAD successor-register provenance and evidence-acceptance prep packet. No merge, deployment, live tests, production/development env or provider/auth/resource changes, secrets outside ignored reviewed restricted evidence artifacts, usage/billing changes, enrollment, email/SMS/Slack, store mutation outside reviewed restricted evidence artifacts, CAD upload activation, CAD conversion, private CAD, Sandbox dispatch, expired-run retry, live run, or branch/worktree cleanup.

## Validation

Run the successor provenance test, prior fresh-replacement test, private
restricted-register review test, source audit, manifest verification and
`git diff --check`. No UI changed, so browser QA and production smoke are out
of scope for this source-local evidence slice.
