# Validation receipt

Date: October 11, 2026

Scope: documentation-only Mark pilot package. No source implementation,
private CAD access, external message, commit, push, PR, deployment, or provider
configuration change was performed.

## Result

The package is ready for Captain review with one inherited test-drift issue
recorded below.

- Branch, HEAD, and tree matched the required binding before authoring.
- The current manufacturer-tour, preview, and import regressions passed: 22 of
  22 tests.
- Every relative Markdown link in this package resolves to an existing file.
- The production tour entry and all seven referenced public fixture assets
  returned HTTP 200.
- The six production-hosted source, STL, and image assets matched the committed
  SHA-256 values byte for byte.
- Required limitation language, private-file boundaries, and the later-pilot
  gate passed a package claim/privacy scan.
- Secret, absolute user-path, email, private-key, and positive manufacturing
  certification patterns were absent.
- Trailing whitespace, duplicate final newlines, curly quotes, em dashes, and
  selected AI-writing patterns were absent.
- A read-only production browser check confirmed the Dispenser Input screen,
  the visible Tour action, and step 1 of 6. The URL did not auto-open the guide.

## Inherited test drift

Running the older `scripts/cad-public-material-preview-path.test.js` beside the
current focused suite produced 25 passes and two failures:

1. The test pins an older `utils/cadInternalTesterPreview.js` hash. It expected
   `fd5161b9cf966042bf3bdc36c2e08025f22f34bccf40b2544c16f5ca96a1e050`;
   the exact bound source produced
   `adcdb2477aa067f23cedc34d109b023c61d6f89079d359420d99bc1feb0b5b14`.
2. The test expects `reversr.vercel.app` to reject the Dispenser preview. The
   current source and observed production route allow it.

The companion document
[`docs/cad-public-material-preview-path.md`](../cad-public-material-preview-path.md)
also describes the older non-production-only route. This package treats that
source as authorization history, not current hosting evidence. The stale test
and document were not edited because this lane is limited to the pilot package.

## Commands and checks

```sh
node --test \
  scripts/cad-manufacturer-tour.test.js \
  scripts/cad-internal-tester-preview.test.js \
  scripts/igs-import-journey.test.js

node --test \
  scripts/cad-manufacturer-tour.test.js \
  scripts/cad-internal-tester-preview.test.js \
  scripts/cad-public-material-preview-path.test.js \
  scripts/igs-import-journey.test.js

shasum -a 256 \
  public/cad-fixtures/mark-dispenser-v1/Dispenser.IGS \
  public/cad-fixtures/mark-dispenser-v1/dispenser-derived.stl \
  public/cad-fixtures/mark-dispenser-v1/*.jpg
```

The package also received read-only URL, remote-hash, Markdown-link,
claim/privacy, whitespace, and humanizer scans. The exact one-line check scripts
remain in the task output rather than being added to product source.

## Intentionally not run

- No build or typecheck was needed for documentation-only additions.
- No local or production write-path smoke was run.
- No file chooser, private upload, conversion, Sandbox, provider, Auth, billing,
  or deletion path was exercised.
- No message was sent to Mark and no pilot session was scheduled.
