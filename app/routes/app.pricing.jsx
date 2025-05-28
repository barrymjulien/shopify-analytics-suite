import { Form, useLoaderData, useNavigation } from "@remix-run/react";
import { json } from "@remix-run/node";
import { 
  Page, 
  Layout, 
  Card, 
  Button, 
  Text, 
  List,
  Banner,
  BlockStack,
  InlineStack,
  Badge
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import { SUBSCRIPTION_PLANS, checkSubscription } from "../services/billing.server";

/**
 * Loader for the pricing page
 */
export async function loader({ request }) {
  const { session } = await authenticate.admin(request);
  
  // Check subscription status
  const subscription = await checkSubscription(session);
  
  return json({ subscription });
}

/**
 * Component for the pricing page
 */
export default function PricingPage() {
  const { subscription } = useLoaderData();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";
  
  return (
    <Page title="Choose Your Plan">
      {subscription.hasSubscription && (
        <Banner
          title="You already have an active subscription"
          tone="success"
        >
          <p>Your current plan: {subscription.plan}</p>
        </Banner>
      )}
      
      <BlockStack gap="500">
        <Layout>
          {Object.entries(SUBSCRIPTION_PLANS).map(([key, plan]) => (
            <Layout.Section oneThird key={key}>
              <Card>
                <BlockStack gap="400">
                  <BlockStack gap="200">
                    <Text variant="headingLg" as="h3">{plan.name}</Text>
                    <InlineStack align="center">
                      <Text variant="headingXl" as="p">${plan.amount}</Text>
                      <Text variant="bodyMd" as="p">/month</Text>
                    </InlineStack>
                    {plan.trialDays > 0 && (
                      <Badge tone="info">{plan.trialDays}-day free trial</Badge>
                    )}
                  </BlockStack>
                  
                  <Card.Section>
                    <BlockStack gap="300">
                      <Text variant="bodyMd" fontWeight="bold">Features:</Text>
                      <List type="bullet">
                        {plan.features.map((feature, index) => (
                          <List.Item key={index}>{feature}</List.Item>
                        ))}
                      </List>
                    </BlockStack>
                  </Card.Section>
                  
                  <Card.Section>
                    <Form method="post" action="/app/subscribe">
                      <input type="hidden" name="plan" value={key} />
                      <Button
                        primary
                        submit
                        loading={isSubmitting && navigation.formData?.get("plan") === key}
                        disabled={subscription.hasSubscription}
                        fullWidth
                      >
                        {subscription.hasSubscription 
                          ? "Current Plan" 
                          : `Select ${plan.name}`}
                      </Button>
                    </Form>
                  </Card.Section>
                </BlockStack>
              </Card>
            </Layout.Section>
          ))}
        </Layout>
      </BlockStack>
    </Page>
  );
}
