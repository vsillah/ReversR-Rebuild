import { httpRouter } from 'convex/server';
import { auth } from './auth';
import { CAD_UPLOAD_SESSION_GATEWAY_PATH, cadUploadSessionGateway } from './cadUploadSessionGateway';

// Library discovery/JWKS routes plus one fail-closed CAD gateway scaffold.
const http = httpRouter();
auth.addHttpRoutes(http);
http.route({ path: CAD_UPLOAD_SESSION_GATEWAY_PATH, method: 'POST', handler: cadUploadSessionGateway });
export default http;
