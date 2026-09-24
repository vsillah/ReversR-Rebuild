# CAD Auth restricted receipt and custody binding requirements

Status: source-only, unbound and non-executable. Parent: PR #399 merge
`598ad5785c89e1b350312fba60d8052bc090c111`. This packet defines requirements
and empty slots before any future command-card proposal. It creates no restricted
receipts and grants no authority to obtain or use them.

## Roles and independent review

The inherited bundle retains all eight categories and their evidence slots.
Concrete references, receipt digests, identities, timestamps and runtime targets
remain null. Public source hashes and historical merge commits establish source
integrity only, never installed-runtime evidence.

| Role | Future responsibility | Separation |
| --- | --- | --- |
| Custodian | Account for user-owned restricted storage and access | Separate from reviewer |
| Preparer | Prepare separately authorized evidence and provenance | Separate from reviewer |
| Independent reviewer | Verify each category, digest, custody and target | No self-review; resolve conflicts |
| Deletion owner | Document separately authorized disposition | Assignment and disposition evidence required |

No identity is assigned here. Future review must substantiate assignments and
identity separation in the restricted store. Self-attestation and passing source
checks cannot establish independence. Missing or unknown evidence blocks review.
Concrete refs and mappings belong outside Git and public artifacts.

## Retention and disposition

The inherited seven-day retention requirement starts at first restricted receipt
creation under future separate authority. Start and expiry remain unbound. Future
policy must identify the deletion owner, scope, approval and disposition receipt,
including completion time and digest. Expired evidence or unresolved disposition
blocks use. Expiry is not deletion authority; deletion requires separate approval.
This packet creates no store, timer or deletion job.

## Receipt digests and immutable target

Future restricted review must independently recompute SHA-256 over exact stored
receipt bytes, encoded as 64 lowercase hexadecimal characters. Each category and
the bundle require paired refs and digests with matching provenance and category.
Missing refs, mismatches, unknown byte scope or unverifiable provenance block
review. A digest alone does not establish authenticity. Repository source hashes
cannot substitute for receipt digests or installed-runtime evidence. This checker
implements no receipt ingestion or receipt hashing; it checks the empty contract.

Before a future command-card proposal, separately verify the exact candidate
commit, immutable deployment and source-digest receipt; record recheck receipt and
time. Repeat before any separately authorized future run. Mutable aliases are
insufficient; drift invalidates prior review. Historical merge commits are not
future executable targets.

## Gate and validation

Review this public packet first. Later restricted-value creation, collection,
installation or use requires separately scoped authority. A reviewed restricted
bundle still requires a separately reviewed sealed card and fresh exact approval.
The consumed window, retries and second run remain unavailable.

The checker accepts only the exact unbound contract. Populated values, extra
fields, promoted flags, commands, proxies, accessors and cycles fail without input
disclosure. Only fixed repository sources are read. No reference resolution,
receipt loading or persistence exists. `--write` regenerates the public template.
Source hashes are not signatures or independent review evidence. Runtime code
must not import this offline preparation module.

```sh
node scripts/cad-auth-receipt-custody-binding-checker.js
node --test scripts/cad-auth-receipt-custody-binding.test.js scripts/cad-auth-restricted-receipt-bundle.test.js scripts/cad-auth-command-card-source.test.js
node scripts/cad-convex-source-audit.js
node scripts/cad-convex-contract-manifest.js
git diff --check
```

No live Auth/provider tests, provider/env/resource/billing changes, secrets or
secret reads, upload sessions, production uploads, body admission/read, conversion,
Sandbox dispatch, private CAD, real-user commercialization, external messages,
runtime activation, executable card issuance, retries, second run or readiness
claim is authorized.
