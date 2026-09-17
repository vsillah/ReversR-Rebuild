# CAD upload conversion Sandbox run closeout

## Result

The fresh public-synthetic qualification run completed successfully on
September 17, 2026. The fixed 11,562-byte public IGES cube produced one mesh,
24 vertices and 12 triangles through one Vercel Sandbox command. The command
exited zero and the remote session was subsequently observed in `stopped`
state with no snapshot.

The run used 1 vCPU, 2,048 MB, a 60-second lifetime, deny-all networking and a
non-persistent Sandbox. The recorded session used about 2.157 CPU-seconds. Its
estimated cost ceiling is under US$0.01, well below the US$50 planning cap;
the final invoice attribution remains a separate cost-telemetry fast follow.

## Evidence

The ignored local evidence and receipt hashes are:

- evidence: `732797a9e0dd8f6799b728dba9123f13ec75da72a1da881b5f3c7edf5eb102a2`
- receipt: `d248ad6da41b60f0c5967150b6eb300c3dbaf147093d8be1e3ed447a578d579a`

The evidence directory is mode `700`; both files are mode `600`. The packet
records no raw credential, upload body, private CAD or raw mesh payload. It
also records no automatic retry, second run, store mutation or production
route change.

## Scope boundary

This proves one development-only public fixture traversed the reviewed
upload-to-conversion runner and produced bounded mesh output with confirmed
Sandbox cleanup. It does not qualify arbitrary-model fidelity, private CAD,
render or STL output, dimensional/manufacturing use, real users, or production
upload activation. The mounted route remains fail-closed.

The next source-only review should bind the already completed synthetic
auth/session and upload-path evidence to this conversion closeout. It should
avoid another provider run unless that review identifies a concrete missing
execution edge.
