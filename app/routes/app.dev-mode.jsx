import { json, redirect } from "@remix-run/node";
import { 
  Page, 
  Card, 
  Button, 
  Text, 
  BlockStack,
} from "@shopify/polaris";
import { Form } from "@remix-run/react";
import { authenticate } from "../shopify.server";
import { prisma } from "../db.server";

export async function loader({ request }) {
  const { session } = await authenticate.admin(request);
  const { shop } = session;
  
  return json({ shop });
}

export async function action({ request }) {
  const { session } = await authenticate.admin(request);
  const { shop } = session;
  
  // Create a fake completed onboarding state
  try {
    await prisma.onboardingState.upsert({
      where: { shop },
      update: {
        completed: true,
        currentStep: "completed",
        stepsData: JSON.stringify({
          welcome: { started: "true" },
          connect_data: { dataRange: "90days" },
          choose_plan: { selectedPlan: "GROWTH" },
          analytics_setup: { primaryKPI: "revenue_growth", weeklyReports: "on" }
        })
      },
      create: {
        shop,
        completed: true,
        currentStep: "completed",
        stepsData: JSON.stringify({
          welcome: { started: "true" },
          connect_data: { dataRange: "90days" },
          choose_plan: { selectedPlan: "GROWTH" },
          analytics_setup: { primaryKPI: "revenue_growth", weeklyReports: "on" }
        })
      }
    });
    
    return redirect("/app");
  } catch (error) {
    console.error("Error creating dev mode:", error);
    return json({ error: error.message });
  }
}

export default function DevModePage() {
  return (
    <Page title="Developer Mode">
      <Card>
        <BlockStack gap="400">
          <Text variant="headingMd">
            Developer Mode Setup
          </Text>
          <Text>
            This page will bypass the onboarding and subscription requirements, allowing
            you to access the app dashboard directly.
          </Text>
          <Form method="post">
            <Button primary submit>Enable Developer Mode</Button>
          </Form>
        </BlockStack>
      </Card>
    </Page>
  );
}
