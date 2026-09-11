// Static qualification status only. No runtime probes or environment activation.
// routeMounted refers to the hosted CAD processing route, not this status route.
function getCadReadiness() {
  return {
    schemaVersion: 1,
    enabled: false,
    routeMounted: false,
    mode: 'metadata-qualified-only',
    blocker: {
      code: 'IN_PROCESS_EXECUTION_LIMITS_UNENFORCEABLE',
      reason: 'Stock WASM conversion blocks timer and abort callbacks and ignores a supplied capped memory. Hosted execution limits remain unqualified.',
      qualification: 'Public package cube converted locally; no hosted import route is enabled.',
    },
    executor: {
      metadataQualified: true,
      implementationCommit: 'bf80b32777d22be822db0fca095af0e89ea515e5',
      evidenceCommit: '8ab9edfeb0825bd57091ecaf3c0acbf904596582',
      evidence: 'Recorded metadata-only diagnostic pass; see docs/cad-capabilities.md.',
    },
    proven: [
      'Pinned image metadata command started under the bounded Docker envelope.',
      'Guest UID/GID 65532, zero capabilities, NoNewPrivs=1 and seccomp=2 were observed.',
      'Guest temporary filesystem restrictions and size/inode limits were observed.',
      'Exact-ID cleanup and unchanged pre-existing container inventory were confirmed.',
    ],
    unproven: [
      'Hosted CAD processing route and real identity/store/executor adapters.',
      'Native CAD import in the container.',
      'Supplied CAD file processing.',
      'Provider integration.',
      'Failure-independent runtime expiry.',
      'Deployment and production activation.',
    ],
    nextGate: 'Explicit approval is required before any hosted CAD processing route, native/provider execution, CAD-file processing, deployment or production activation.',
  };
}

module.exports = { getCadReadiness };
