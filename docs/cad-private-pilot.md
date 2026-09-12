# Private CAD pilot gate

This gate is for one operator-controlled private IGES/IGS source run after the
public hosted fixture matrix has already passed. It does not change production
environment variables, app UI, upload UX, source-fidelity claims, render/STL
claims, or manufacturing-readiness claims.

## Runner

Use `scripts/cad-private-pilot-runner.js`.

It is intentionally blocked unless all of the following are true:

- the command includes `--live`
- `CAD_PRIVATE_PILOT_APPROVED=true`
- `CAD_PRIVATE_SOURCE_PATH` points to the operator-approved source file
- the file is IGES/IGS, nonempty, and within the current hosted route input cap
- Vercel Sandbox credentials resolve through explicit `VERCEL_*` values or the
  local Vercel CLI auth plus `.vercel/project.json`

The runner mounts the existing `/api/cad` router locally with a fresh synthetic
operator token and calls the same hosted Sandbox executor used by production.

## Evidence policy

The evidence packet may include:

- source byte count, SHA-256, and normalized format
- HTTP status and public error code
- mesh, vertex, triangle counts and bounds
- source-confidence status returned by the route
- execution limits, runtime metadata, and cleanup state
- sanitized stage names and stage metadata

The evidence packet must not include:

- the private source path
- the private source file name
- raw source bytes
- base64 source content
- raw mesh payloads
- operator tokens or route tokens
- production environment values

## Boundary

A passing private pilot proves only that one approved private source file can be
accepted by the current hosted route and converted into bounded mesh output.

It still does not prove arbitrary-model source fidelity, render/STL behavior,
dimensional accuracy, manufacturing suitability, or user-facing CAD readiness.
Those remain separate gates.

## Example

Do not paste private paths into public reports. Run locally from an operator
shell:

```sh
CAD_PRIVATE_PILOT_APPROVED=true \
CAD_PRIVATE_SOURCE_PATH="$APPROVED_PRIVATE_SOURCE" \
node scripts/cad-private-pilot-runner.js --live --write=/private/tmp/reversr-private-cad-pilot-evidence.json
```

Review the evidence file before sharing. If the file is over the current route
input cap, the runner exits blocked with source hash and byte count only; do not
raise limits without a separate approval and resource-bound validation.
