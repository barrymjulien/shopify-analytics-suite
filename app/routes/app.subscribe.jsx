import { redirect, json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { SUBSCRIPTION_PLANS } from "../services/billing.server";

/**
 * Handle the subscription creation action
 */
export async function action({ request }) {
  const { admin, session } = await authenticate.admin(request);
  
  // Get the plan from form data
  const formData = await request.formData();
  const planKey = formData.get("plan");
  const plan = SUBSCRIPTION_PLANS[planKey];
  
  if (!plan) {
    throw new Error(`Invalid plan: ${planKey}`);
  }

  try {
    // Create a subscription using Shopify GraphQL Admin API
    const response = await admin.graphql(`
      mutation appSubscriptionCreate($name: String!, $returnUrl: URL!, $trialDays: Int, $test: Boolean, $amount: MoneyInput!) {
        appSubscriptionCreate(
          name: $name
          returnUrl: $returnUrl
          trialDays: $trialDays
          test: $test
          lineItems: [
            {
              plan: {
                appRecurringPricingDetails: {
                  price: $amount
                  interval: EVERY_30_DAYS
                }
              }
            }
          ]
        ) {
          userErrors {
            field
            message
          }
          confirmationUrl
          appSubscription {
            id
            status
          }
        }
      }`,
      {
        variables: {
          name: plan.name,
          returnUrl: `https://${session.shop}/apps/${process.env.SHOPIFY_API_KEY}`,
          trialDays: plan.trialDays,
          test: true, // Always use test mode for development
          amount: {
            amount: plan.amount.toString(), // Convert to string
            currencyCode: plan.currencyCode
          }
        }
      }
    );
    
    const responseBody = await response.json();
    console.log("Subscription creation response:", JSON.stringify(responseBody, null, 2));
    
    // Check for errors
    const errors = responseBody.data?.appSubscriptionCreate?.userErrors;
    if (errors && errors.length > 0) {
      console.error('Subscription creation errors:', errors);
      return { errors };
    }

    // Get the confirmation URL
    const confirmationUrl = responseBody.data?.appSubscriptionCreate?.confirmationUrl;
    
    if (!confirmationUrl) {
      console.error('No confirmation URL returned');
      return { errors: [{ message: 'Failed to create subscription' }] };
    }

    // Redirect to the confirmation URL
    return redirect(confirmationUrl);
  } catch (error) {
    console.error("Error creating subscription:", error.message);
    return json({ error: error.message });
  }
}

// This component doesn't render anything on its own - form submissions post here
export default function SubscribeRoute() {
  return null;
}
