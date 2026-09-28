# CAD Auth durable service reference prep

This source-only packet prepares the opaque references that the durable-service
qualification plan needs before any private evidence review can be requested.
It does not read private evidence, discover provider resources, create a
service, issue upload sessions, activate upload admission, or prove production
durability.

## Prepared references

| Reference | Value | Meaning |
| --- | --- | --- |
| Durable service | `rrb-ref:cad-auth-durable-service-20260928T161754Z` | Opaque label for exactly one later-designated durable service identity. It is not a URL, credential, callable capability, runtime binding, or proof that the service exists. |
| Private source/evidence set | `rrb-ref:cad-auth-durable-service-source-evidence-set-20260928T161754Z` | Opaque label for a later private custodian mapping to existing non-secret source/evidence bytes. It is not a local path, secret, provider value, or authorization to read private evidence. |

These labels exist so the next approval phrase can be concrete without asking
the operator to invent reference names. They confer no access and carry no
private values.

## Boundaries

- `liveDurableServiceQualified` remains `false`.
- `productionExecutionBinding` remains `null`.
- No private evidence read is authorized.
- No provider, environment, resource, billing, or secret access is authorized.
- No upload-session issuance, upload activation, request-body admission/read,
  conversion, Sandbox dispatch, private CAD use, runtime activation, live
  evidence collection, external message, PR, merge, deployment, or production
  smoke is authorized.

## Next gate

The checker prints a fully populated private/source-only durable-service
qualification evidence review phrase. That later gate may only review existing
non-secret source/evidence designated by the prepared opaque source/evidence
reference, and it must stop if the private mapping cannot be resolved inside
the approved scope.
