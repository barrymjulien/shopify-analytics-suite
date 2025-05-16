import { redirect } from "@remix-run/node";
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

  // Create a subscription using Shopify GraphQL Admin API
  const response = await admin.graphql(`
    mutation createSubscription($name: String!, $returnUrl: URL!, $trialDays: Int, $test: Boolean, $amount: MoneyInput!) {
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
        test: process.env.NODE_ENV !== "production", // Use test mode in development
        amount: {
          amount: plan.amount,
          currencyCode: plan.currencyCode
        }
      }
    }
  );
  
  const responseBody = await response.json();
  
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
}

// This component doesn't render anything on its own - form submissions post here
export default function SubscribeRoute() {
  return null;
}
