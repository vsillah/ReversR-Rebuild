import type { AuthConfig } from 'convex/server';
import { developmentConfiguration } from './developmentAuth';
const configuration = developmentConfiguration(process.env);
export default { providers: configuration
  ? [{ domain: configuration.issuer, applicationID: 'convex' }] : [] } satisfies AuthConfig;
