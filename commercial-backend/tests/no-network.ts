import { beforeEach, vi } from 'vitest';
beforeEach(() => {
  vi.stubGlobal('fetch', () => { throw new Error('Provider network forbidden'); });
  vi.stubEnv('COMMERCIAL_ASSEMBLY', 'ordinary-customers-v1');
  vi.stubEnv('COMMERCIAL_AUTH_ISSUER', 'https://commercial-synthetic.convex.site');
  vi.stubEnv('CONVEX_SITE_URL', 'https://commercial-synthetic.convex.site');
});
