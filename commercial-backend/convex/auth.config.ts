import type { AuthConfig } from 'convex/server';
import { configuration } from './configuration';
const config = configuration();
export default { providers: config ? [{ domain: config.issuer, applicationID: 'convex' }] : [] } satisfies AuthConfig;
