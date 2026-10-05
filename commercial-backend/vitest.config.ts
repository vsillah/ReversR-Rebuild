import { defineConfig } from 'vitest/config';
export default defineConfig({ test: { include: ['commercial-backend/tests/**/*.test.ts'], environment: 'edge-runtime',
  setupFiles: ['commercial-backend/tests/no-network.ts'], fileParallelism: false } });
