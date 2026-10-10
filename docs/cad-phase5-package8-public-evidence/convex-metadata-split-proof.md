# Phase 5 Package 8 Convex metadata split proof

Status: the deterministic checked-in source inventory is verified. Deployment
identity and source-to-deployment function equivalence remain unverified, so
Package 8 stays closed.

## Replaced design

The direct `_system/cli/modules:apiSpec` transport is removed from the Package 8
plan. Official Convex source types its result as `any[]`, its MCP output as
`z.any()`, and reaches it through an internal endpoint and admin-auth method.
Those contracts cannot support a complete fail-closed runtime parser.

## Split proof

The source half uses TypeScript's checker over the checked-in
`convex/_generated/api.d.ts` `api` and `internal` namespaces. The generated file
is already produced by the repository's pinned, offline-only Convex codegen
wrapper. The inventory contains only callable `FunctionReference` names exposed
by those namespaces. HTTP routes and HTTP actions are explicitly outside this
inventory. Source modules, generated bindings, the codegen wrapper, dependency
lock, function names, and aggregate digests are recorded in the JSON packet.

The deployment half is a separate identity-only contract. A future supported,
sanitized receipt must match the exact team, project, deployment, deployment
type, cloud URL, local function-inventory digest, and generated-API digest, and
must be no more than 15 minutes old. A matching receipt may identify the target.
It cannot prove that the checked-in functions are deployed, that runtime schemas
match local generated types, or that Package 8 is ready.

## Fail-closed outcome

The current packet records 50 checked-in callable names across 11 source modules:
9 public and 41 internal. The deployment observation remains absent. Therefore
source-to-deployment equivalence is `NOT_CLAIMED`, runtime schema equivalence is
`UNSUPPORTED`, and Package 8 activation readiness is false.

Offline tests cover source drift, duplicate names, contract-manifest mismatch,
stale evidence, target mismatch, source-binding mismatch, and attempted
equivalence or runtime-authority promotion. The consumed provider read remains
consumed, the 17-value unavailable list is unchanged, and the proposed UTC
window remains inactive.

No provider request, credential or environment read, configuration change,
deployment, function invocation, CAD, storage, conversion, payment, commit,
push, PR, merge, activation, or external message occurred.
