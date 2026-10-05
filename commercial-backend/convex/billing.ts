"use node";
import Stripe from 'stripe';
import { randomUUID } from 'node:crypto';
import { v, ConvexError } from 'convex/values';
import { action, internalAction } from './_generated/server';
import { internal } from './_generated/api';
import { configuration } from './configuration';
import { plan } from './schema';

function provider() {
  const returnUrl = process.env.COMMERCIAL_BILLING_RETURN_URL;
  if (!configuration() || !process.env.STRIPE_SECRET_KEY || !returnUrl || !/^https:\/\//.test(returnUrl)) throw new ConvexError('BILLING_UNAVAILABLE');
  // @ts-expect-error Stripe types describe the latest API; this assembly deliberately retains the reviewed Clover contract.
  return { stripe: new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2026-02-25.clover' }), returnUrl };
}
export const checkout = action({ args: { planId: plan }, returns: v.object({ url: v.string(), sessionId: v.string() }), handler: async (ctx, args) => {
  if (args.planId === 'team') throw new ConvexError('TEAM_PROVISIONING_PENDING');
  const price = args.planId === 'pro_shop' ? process.env.STRIPE_PRICE_PRO_SHOP : null;
  if (!price) throw new ConvexError('PRICE_UNAVAILABLE');
  const { stripe, returnUrl } = provider();
  const attempt = await ctx.runMutation(internal.billingState.prepare, { planId: args.planId, intent: randomUUID() });
  let customer = attempt.customerId;
  if (!customer) {
    customer = (await stripe.customers.create({ metadata: { reversrShopId: attempt.shopId } }, { idempotencyKey: `customer:${attempt.shopId}:${attempt.intent}` })).id;
    await ctx.runMutation(internal.billingState.bindCustomer, { customerId: customer, intent: attempt.intent });
  }
  const metadata = { reversrShopId: attempt.shopId, reversrCheckoutIntent: attempt.intent };
  const result = await stripe.checkout.sessions.create({ mode: 'subscription', customer, line_items: [{ price, quantity: 1 }],
    success_url: `${returnUrl}?checkout=success`, cancel_url: `${returnUrl}?checkout=cancelled`, metadata,
    subscription_data: { metadata } }, { idempotencyKey: `checkout:${attempt.shopId}:${attempt.intent}` });
  // Recheck current session/owner after provider work before returning its URL.
  await ctx.runMutation(internal.billingState.portalCustomer, {});
  if (!result.url) throw new ConvexError('CHECKOUT_UNAVAILABLE');
  return { url: result.url, sessionId: result.id };
} });
export const portal = action({ args: {}, returns: v.object({ url: v.string() }), handler: async ctx => {
  const customer = await ctx.runMutation(internal.billingState.portalCustomer, {});
  const { stripe, returnUrl } = provider();
  const result = await stripe.billingPortal.sessions.create({ customer, return_url: returnUrl });
  await ctx.runMutation(internal.billingState.portalCustomer, {});
  return { url: result.url };
} });
export const webhook = internalAction({ args: { body: v.string(), signature: v.string() }, returns: v.null(), handler: async (ctx, args) => {
  const { stripe } = provider();
  if (!process.env.STRIPE_WEBHOOK_SECRET) throw new ConvexError('WEBHOOK_UNAVAILABLE');
  const event = stripe.webhooks.constructEvent(args.body, args.signature, process.env.STRIPE_WEBHOOK_SECRET);
  const object = event.data.object as unknown as { id: string; customer?: string; subscription?: string; parent?: { subscription_details?: { subscription?: string } } };
  const subscriptionId = event.type.startsWith('customer.subscription.') ? object.id
    : event.type === 'checkout.session.completed' ? object.subscription
    : ['invoice.paid', 'invoice.payment_succeeded', 'invoice.payment_failed'].includes(event.type) ? object.parent?.subscription_details?.subscription : null;
  if (!subscriptionId) return null;
  if (!object.customer) throw new ConvexError('INVALID_CUSTOMER');
  const lease = await ctx.runMutation(internal.billingState.beginEvent, { eventId: event.id, customerId: object.customer });
  if (!lease) return null;
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const customerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id;
  if (subscription.id !== subscriptionId || customerId !== object.customer) throw new ConvexError('PROVIDER_BINDING_MISMATCH');
  const item = subscription.items.data[0];
  const planId = item?.price.id === process.env.STRIPE_PRICE_PRO_SHOP ? 'pro_shop'
    : item?.price.id === process.env.STRIPE_PRICE_TEAM ? 'team' : 'free';
  await ctx.runMutation(internal.billingState.applyEvent, { ...lease, eventId: event.id, customerId, subscriptionId,
    status: subscription.status, planId, periodEnd: (item?.current_period_end || 0) * 1000,
    intent: subscription.metadata.reversrCheckoutIntent || '', metadataShopId: subscription.metadata.reversrShopId || '' });
  return null;
} });
