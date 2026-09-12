import { httpRouter } from 'convex/server';
import { auth } from './auth';
// Library discovery/JWKS routes only with the empty provider list. No CAD route.
const http = httpRouter();
auth.addHttpRoutes(http);
export default http;
