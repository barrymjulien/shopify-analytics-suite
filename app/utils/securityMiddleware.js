import { json, redirect } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { billingLogger } from "../services/loggerService";
import { checkSubscription } from "../services/billing.server"; // Added import

/**
 * Combined middleware for authentication and security
 */
export async function secureLoader({ request, requireSubscription = false }) {
  try {
    // Authenticate user
    const { admin, session } = await authenticate.admin(request);
    const { shop, accessToken } = session;
    
    // Additional security checks can be added here
    
    // Check for subscription if required
    if (requireSubscription) {
      const subscription = await checkSubscription(admin);
      if (!subscription.hasSubscription) {
        return redirect("/app/pricing");
      }
    }
    
    // Return authenticated context
    return { admin, session, shop, accessToken };
  } catch (error) {
    billingLogger.error("Authentication error", error);
    
    // Only show generic error message to user
    throw json(
      { error: "Authentication failed" },
      { status: 401 }
    );
  }
}
