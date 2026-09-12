import type { AuthConfig } from 'convex/server';
// Deliberately no trusted JWT issuer, even when deployment env values exist.
// Later source review must bind CONVEX_SITE_URL with applicationID: 'convex'.
export default { providers: [] } satisfies AuthConfig;
