// app/services/billing.server.js
import { billingLogger } from "./loggerService";

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
export async function checkSubscription(admin) { // Changed parameter name from session to admin
  if (!admin || !admin.graphql) { // Check for admin object and its graphql property
    billingLogger.error("checkSubscription: Invalid admin object or missing graphql client.", null, { 
      hasAdmin: !!admin, 
      hasGraphql: !!admin?.graphql 
    });
    // If the admin context or its graphql client is invalid, we can't check.
    return { 
      hasSubscription: false, 
      error: "Invalid admin context for billing check." 
    };
  }

  try {
    // const client = admin.graphql; // admin.graphql is a function that makes the query
    
    // Check if the merchant has an active subscription
    // The admin.graphql function takes the query string directly.
    const response = await admin.graphql(`
      query {
        appInstallation {
          activeSubscriptions {
            name
            status
            currentPeriodEnd
          }
        }
      }
    `);
    
    // The response from admin.graphql() is typically already parsed JSON
    const responseData = await response.json(); // Ensure we get the JSON body
    const { activeSubscriptions } = responseData.data.appInstallation;
    
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
    billingLogger.error("Failed to check subscription status", error);
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
