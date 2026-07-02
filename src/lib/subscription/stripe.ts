/**
 * Stripe billing · Checkout, Customer Portal, webhooks.
 * Env: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
 *      STRIPE_PRICE_PRO_MONTHLY, STRIPE_PRICE_PRO_PLUS_MONTHLY
 */

import Stripe from "stripe";
import { activateTierServer, setSubscriptionProfileServer } from "@/lib/subscription/subscription.server";
import type { SubscriptionTier } from "@/types/subscription";

export const STRIPE_PRICE_IDS: Partial<Record<"pro" | "pro_plus", string>> = {
  pro: process.env.STRIPE_PRICE_PRO_MONTHLY?.trim() ?? "",
  pro_plus: process.env.STRIPE_PRICE_PRO_PLUS_MONTHLY?.trim() ?? "",
};

let stripeClient: Stripe | null = null;

export function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) return null;
  if (!stripeClient) {
    stripeClient = new Stripe(key, { apiVersion: "2025-02-24.acacia" });
  }
  return stripeClient;
}

export function isStripeConfigured(): boolean {
  return Boolean(getStripe() && STRIPE_PRICE_IDS.pro && STRIPE_PRICE_IDS.pro_plus);
}

function siteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) return `https://${vercel.replace(/^https?:\/\//, "")}`;
  return "http://127.0.0.1:3000";
}

function tierFromPriceId(priceId: string): SubscriptionTier | null {
  if (priceId === STRIPE_PRICE_IDS.pro) return "pro";
  if (priceId === STRIPE_PRICE_IDS.pro_plus) return "pro_plus";
  return null;
}

export async function createCheckoutSession(opts: {
  userId: string;
  email: string;
  tier: "pro" | "pro_plus";
  locale?: string;
}): Promise<{ url: string } | null> {
  const stripe = getStripe();
  const priceId = STRIPE_PRICE_IDS[opts.tier];
  if (!stripe || !priceId) return null;

  const base = siteUrl().replace(/\/$/, "");
  const localePath = opts.locale?.trim() ? `/${opts.locale}` : "";

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer_email: opts.email,
    client_reference_id: opts.userId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${base}${localePath}/pricing?checkout=success`,
    cancel_url: `${base}${localePath}/pricing?checkout=cancel`,
    metadata: {
      userId: opts.userId,
      tier: opts.tier,
    },
    subscription_data: {
      metadata: {
        userId: opts.userId,
        tier: opts.tier,
      },
    },
  });

  if (!session.url) return null;
  return { url: session.url };
}

export async function createBillingPortalSession(opts: {
  customerId: string;
  locale?: string;
}): Promise<{ url: string } | null> {
  const stripe = getStripe();
  if (!stripe) return null;

  const base = siteUrl().replace(/\/$/, "");
  const localePath = opts.locale?.trim() ? `/${opts.locale}` : "";

  const session = await stripe.billingPortal.sessions.create({
    customer: opts.customerId,
    return_url: `${base}${localePath}/pricing`,
  });

  return { url: session.url };
}

async function syncSubscriptionFromStripe(
  userId: string,
  subscription: Stripe.Subscription,
): Promise<void> {
  const priceId = subscription.items.data[0]?.price?.id ?? "";
  const tier =
    tierFromPriceId(priceId) ??
    (subscription.metadata?.tier === "pro" || subscription.metadata?.tier === "pro_plus"
      ? subscription.metadata.tier
      : null);

  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer?.id;

  if (subscription.status === "active" || subscription.status === "trialing") {
    if (tier) {
      await activateTierServer(userId, tier, "stripe");
      await setSubscriptionProfileServer(userId, {
        stripeCustomerId: customerId ?? null,
        stripeSubscriptionId: subscription.id,
      });
    }
    return;
  }

  if (subscription.status === "canceled" || subscription.status === "unpaid") {
    await setSubscriptionProfileServer(userId, {
      tier: "expired",
      stripeSubscriptionId: subscription.id,
    });
  }
}

export async function handleStripeWebhook(
  payload: Buffer,
  signature: string,
): Promise<void> {
  const stripe = getStripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!stripe || !secret) return;

  const event = stripe.webhooks.constructEvent(payload, signature, secret);

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.userId ?? session.client_reference_id ?? "";
      const tier = session.metadata?.tier;
      if (!userId) break;
      if (tier === "pro" || tier === "pro_plus") {
        await activateTierServer(userId, tier, "stripe");
      }
      if (session.customer && typeof session.customer === "string") {
        await setSubscriptionProfileServer(userId, {
          stripeCustomerId: session.customer,
          stripeSubscriptionId:
            typeof session.subscription === "string" ? session.subscription : null,
        });
      }
      break;
    }
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      const userId = subscription.metadata?.userId ?? "";
      if (!userId) break;
      await syncSubscriptionFromStripe(userId, subscription);
      break;
    }
    default:
      break;
  }
}
