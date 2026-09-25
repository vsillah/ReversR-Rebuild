# CAD Auth coherent restricted source-set projection

Status: source-only projection of the approved sanitized handoff for run
`20260925t182340z`, bound to private source-set output SHA-256
`2d437fd9e964dd1c346bb60d9d3de8d14bd845e1980a225ffeb4ca4c4b2216c4`.

The handoff reports coherent coverage of eight categories and 23 required
fields, complete `true`. This lane projects those supplied facts without
opening the private output or receipts. Receipt digests and byte counts are
supplied integrity metadata; this lane has not recomputed private digests or
verified receipt semantics, current target coherence, or live readiness.

## Category disposition

Every row has status `SUPPLIED_COVERAGE_COMPLETE_PROJECTED`.

| Category | Receipt SHA-256 | Bytes | Field coverage |
| --- | --- | ---: | ---: |
| concreteProviderRuntimeBinding | `a24d3cdca11913520dec27419897167592003bc15a9345047a87a661230c8985` | 5189 | 3/3 |
| executableCollectorCommand | `dbe9adfcfc09a061a38722f090b48c8fdabcc4dd2597218587a94ffbedc51470` | 6196 | 3/3 |
| restrictedSyntheticCohortReceipt | `04aa1e7e9a1e22d1384eec0b2a7e41c5a0abfa8ea50796f3ad585c2b6d82ddc2` | 4857 | 2/2 |
| custodyReviewerReceipt | `a9525ef592033a38c4b931783ae5b784f7b5fe1a81d5c71b9edf7e0d538fb830` | 6243 | 3/3 |
| durableConsumedRunLedger | `2b2998396fc0d60e326a2098e96f65b163d1c8545e9c682f0219a3185ab6f662` | 6247 | 3/3 |
| installedRouteBodyObserver | `a6422672df981f80baa776e13c784efded4ba2be65e6a1fedc31d08dc89fbdb6` | 6145 | 3/3 |
| lateGrantObserver | `e6efeb497c8662b549a436c5648a7cd8bf1aff2921477126fc1ba93999180c42` | 4840 | 2/2 |
| immutableTargetRecheckReceipt | `e7b725815d6e4ab8dc74b1b1023e49687f66a0c1de072d032e86afd883067add` | 7693 | 4/4 |

The manifest binds the existing public accepted-provenance and source-set
generator packets. Those historical packets remain unchanged. Their earlier
dispositions describe their own gates; this additive packet describes only the
supplied result above. The source baseline is
`3ab958f1216fa33323e1ed9b65d2408836788427`.

## Closed controls and stops

There is no executable command card, live collection, runtime activation, body
admission/read, upload-session issuance, production upload activation,
conversion, Sandbox dispatch, retry/second run, or commercial-readiness claim.
The category named `executableCollectorCommand` is a coverage label and grants
no execution authority. Authorized runtime runs remain zero.

No private receipt values, private paths, key listings, secrets, private CAD,
provider/env/resource/billing changes, external messages, or real-user
commercialization are allowed. Receipt creation and source-set generation are
also outside this projection gate.

Stop on a digest/run mismatch, byte-count or coverage mismatch, missing,
duplicate or unexpected category, changed public source binding, opened control,
missing evidence, failing check, unknown outcome, or any need for private reads
or runtime credentials/provider configuration. Expected rejection assertions in
the local tests exercise these boundaries using synthetic values only.

## Next gate requirements

The immediate handoff is a draft PR for captain review. This lane stops before
merge, deployment, private reads, or any runtime action.

A subsequent source-only readiness review requires separate approval bound to
this projection packet digest, its reviewed source commit, and the exact
source-set digest/run above. It must assess remaining target/source/time
coherence, reviewer independence, custody/retention/deletion disposition,
durable consumed-run ledger, route-body observer, late-grant observer, and
sealed-card prerequisites using committed sanitized sources only. Any missing
evidence stays pending. Coverage counts alone cannot satisfy those reviews.

The manifest's `nextGate.exactPhraseTemplate` carries that bounded approval
template. The captain must resolve `projectionPacketSha256` and
`reviewedSourceCommit` against the reviewed artifact before presenting it.
Unresolved placeholders are not approval. Private reads, executable-card
issuance, live collection and runtime activation each remain separate gates.

## Local validation

```sh
node scripts/cad-auth-coherent-source-set-projection-checker.js
node --test scripts/cad-auth-coherent-source-set-projection.test.js scripts/cad-auth-accepted-provenance-projection.test.js scripts/cad-auth-restricted-source-set-contract.test.js
git diff --check
```

The checker accepts no source path or runtime flags. Its optional `--write`
rebuilds only the public manifest from fixed public source files and these
sanitized constants. It never invokes the private source-set generator.
Local checks validate projection fidelity and closed controls. No live workflow,
customer-data smoke, UI, deployment, or private-source validation is performed.
