# Phase 5 Package 8 direct Convex metadata transport stop

Status: stopped before implementation because the authoritative response schema
and authentication ownership contract are incomplete.

## Verified boundary

Installed Convex `1.45.0` source defines a direct one-call mechanism using
`POST /api/function`, the `_system/cli/modules:apiSpec` system function,
`convex_encoded_json`, and `Authorization: Convex <admin-key>`. The same source
defines `success` and `error` response discriminators. A separately written
transport could therefore enforce one invocation, manual redirect rejection,
and fixed time and response-size bounds without inheriting the CLI retry loop.

## Stop reason

The public function-spec implementation casts the result to `any[]`. Its MCP
tool declares the output as `z.any()` and describes fields without defining
their required keys, optional keys, validator encoding, recursive bounds,
HTTP-action form, component form, or unknown-field policy. Those sources are
not sufficient for the approved complete response-shape validation.

The direct call also requires an admin key. No reviewed Package 8 interface
currently binds ownership and custody of that credential to the disabled
transport. Adding an assumed schema or ad hoc credential interface would create
runtime guarantees that the source does not establish.

No transport, sanitizer, runtime import, or test harness was implemented. No
provider request, credential read, environment-value read, function invocation,
configuration change, deployment, storage or conversion dispatch, CAD access,
payment, commit, push, PR, merge, activation, or external message occurred.

The consumed read remains consumed. The 17 unavailable values, inactive UTC
window, and every disabled runtime authority remain unchanged.
