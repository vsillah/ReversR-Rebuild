# CAD Default-Closed Admission Switch

Status: runtime switch imported, default closed  
Base commit: `6d255a3f05c62ed533b4c6ca8ae2825ad6a959f9`

This slice imports a production admission switch into `POST /api/cad/user-import`, but the switch can only return `USER_UPLOADS_DISABLED`. It is consulted after upload-session verification and before request body parsing.

`BODY_ADMISSION_AUTHORIZED` remains `false`, so the route still cannot read a CAD body, persist files, dispatch conversion, dispatch Sandbox work, or create durable reconstruction history.

## What Changed

- Added `server/cadInternalProductionAdmissionSwitch.js`.
- Wired `server/cadUserUploadRouter.js` to consult the switch after a valid upload session.
- Preserved the existing literal route gate: `const BODY_ADMISSION_AUTHORIZED = false;`.
- Added tests proving the switch is default-closed, provider-free, store-free, and cannot open the route through factory options.

## Preserved Boundaries

No production upload activation, request body reads, conversion dispatch, Sandbox dispatch, provider/env/resource changes, store mutation, private CAD, real users, secrets, usage/billing changes, or external messages are authorized by this packet.

## Next Recommended Gate

Bind exact internal admission evidence for a future guarded switch opening, still excluding conversion and Sandbox authority.
