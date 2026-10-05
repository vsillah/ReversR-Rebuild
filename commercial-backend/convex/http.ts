import { httpRouter } from 'convex/server';
import { httpAction } from './_generated/server';
import { internal } from './_generated/api';
import { auth } from './auth';

const http = httpRouter();
auth.addHttpRoutes(http);
http.route({ path: '/stripe', method: 'POST', handler: httpAction(async (ctx, request) => {
  try {
    await ctx.runAction(internal.billing.webhook, { body: await request.text(), signature: request.headers.get('stripe-signature') || '' });
    return new Response('received', { status: 200 });
  } catch { return new Response('Webhook not accepted; verify configuration and retry', { status: 503 }); }
}) });
export default http;
