// app/services/billing.server.js
import { authenticate } from "../shopify.server";
import { GraphqlClient } from '@shopify/shopify-api';

/**
 * Subscription plan definitions
 */
export const SUBSCRIPTION_PLANS = {
  STARTER: {
    name: "Starter",
    amount: 99,
    currencyCode: "USD",
    interval: "EVERY_30_DAYS",
    trialDays: 14,
    cappedAmount: { amount: 99, currencyCode: "USD" },
    features: ["Basic KPIs", "7-day forecasts", "Email reports", "1,000 customers"]
  },
  GROWTH: {
    name: "Growth",
    amount: 249,
    currencyCode: "USD",
    interval: "EVERY_30_DAYS",
    trialDays: 14,
    cappedAmount: { amount: 249, currencyCode: "USD" },
    features: ["Advanced analytics", "30-day forecasts", "Custom segments", "10,000 customers", "API access"]
  },
  ENTERPRISE: {
    name: "Enterprise",
    amount: 999,
    currencyCode: "USD",
    interval: "EVERY_30_DAYS",
    trialDays: 14,
    cappedAmount: { amount: 999, currencyCode: "USD" },
    features: ["All features", "90-day forecasts", "Custom models", "Unlimited customers", "White-label option", "Dedicated support"]
  }
};

/**
 * Check if the merchant has an active subscription
 */
export async function checkSubscription(session) {
  try {
    const client = new GraphqlClient({session});
    
    // Check if the merchant has an active subscription
    const response = await client.query({
      data: `{
        appInstallation {
          activeSubscriptions {
            name
            status
            currentPeriodEnd
          }
        }
      }`
    });
    
    const { activeSubscriptions } = response.body.data.appInstallation;
    
    if (activeSubscriptions && activeSubscriptions.length > 0) {
      const subscription = activeSubscriptions[0];
      if (subscription.status === "ACTIVE") {
        return {
          hasSubscription: true,
          plan: subscription.name,
          expiresAt: subscription.currentPeriodEnd
        };
      }
    }
    
    return { hasSubscription: false };
  } catch (error) {
    console.error("Failed to check subscription status:", error);
    // Return a default response instead of throwing
    return { hasSubscription: false, error: error.message };
  }
}

/**
 * Get the plan details from a plan key
 */
export function getPlanDetails(planKey) {
  return SUBSCRIPTION_PLANS[planKey] || null;
}
