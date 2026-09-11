// Static qualification status only. No runtime probes or environment activation.
// routeMounted refers to the hosted CAD processing route, not this status route.
function getCadReadiness() {
  return {
    schemaVersion: 1,
    enabled: false,
    routeMounted: false,
    mode: 'worker-qualified-disabled',
    blocker: {
      code: 'WORKER_WASM_MEMORY_UNBOUNDED',
      reason: 'Worker termination is locally qualified, but JavaScript resource limits do not bound WASM memory. Production memory isolation remains unqualified.',
      qualification: 'Public package cube converted through the local Worker router. Timeout, cancellation and output checks passed; the production import route remains unmounted.',
    },
    workerQualification: {
      localOnly: true,
      output: 'triangle-mesh',
      timeoutMs: 5000,
      maxInputBytes: 65536,
      wasmMemoryCapped: false,
      sourceFidelityQualified: false,
      hostedPackagingQualified: false,
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
