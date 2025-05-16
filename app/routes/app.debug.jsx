import { useState } from "react";
import { json } from "@remix-run/node";
import { useLoaderData, Form } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  Banner,
  BlockStack,
  Button,
  Text,
  Box,
  List,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import { prisma } from "../db.server";

export async function loader({ request }) {
  try {
    const { admin, session } = await authenticate.admin(request);
    const { shop, accessToken } = session;
    
    // Get onboarding state if exists
    let onboardingState = null;
    try {
      onboardingState = await prisma.onboardingState.findUnique({
        where: { shop }
      });
    } catch (e) {
      console.error("Error fetching onboarding state:", e);
    }
    
    // Get database tables info
    let databaseInfo = {};
    try {
      databaseInfo = {
        sessionCount: await prisma.session.count(),
        onboardingStateCount: await prisma.onboardingState.count(),
        analyticsCacheCount: await prisma.analyticsCache.count(),
        customerProfileCount: await prisma.customerProfile.count(),
      };
    } catch (e) {
      console.error("Error fetching database info:", e);
      databaseInfo = { error: e.message };
    }
    
    return json({
      shop,
      accessToken: accessToken?.substring(0, 5) + '...' + accessToken?.slice(-5),
      onboardingState,
      databaseInfo,
    });
  } catch (error) {
    console.error("Loader error:", error);
    return json({ error: error.message });
  }
}

export async function action({ request }) {
  const { admin, session } = await authenticate.admin(request);
  const { shop } = session;
  
  const formData = await request.formData();
  const action = formData.get("action");
  
  if (action === "reset_onboarding") {
    await prisma.onboardingState.upsert({
      where: { shop },
      update: {
        currentStep: "welcome",
        completed: false,
        stepsData: "{}"
      },
      create: {
        shop,
        currentStep: "welcome",
        completed: false,
        stepsData: "{}"
      }
    });
  }
  
  if (action === "complete_onboarding") {
    await prisma.onboardingState.upsert({
      where: { shop },
      update: {
        currentStep: "completed",
        completed: true,
        stepsData: JSON.stringify({
          welcome: { started: "true" },
          connect_data: { dataRange: "90days" },
          choose_plan: { selectedPlan: "GROWTH" },
          analytics_setup: { primaryKPI: "revenue_growth", weeklyReports: "on" }
        })
      },
      create: {
        shop,
        currentStep: "completed",
        completed: true,
        stepsData: JSON.stringify({
          welcome: { started: "true" },
          connect_data: { dataRange: "90days" },
          choose_plan: { selectedPlan: "GROWTH" },
          analytics_setup: { primaryKPI: "revenue_growth", weeklyReports: "on" }
        })
      }
    });
  }
  
  return json({ success: true });
}

export default function DebugPage() {
  const { shop, accessToken, onboardingState, databaseInfo, error } = useLoaderData();
  
  return (
    <Page title="App Debug">
      <BlockStack gap="500">
        {error && (
          <Banner tone="critical">
            <p>Error: {error}</p>
          </Banner>
        )}
        
        <Card>
          <BlockStack gap="400">
            <Text variant="headingMd">Session Information</Text>
            <List>
              <List.Item>Shop: {shop}</List.Item>
              <List.Item>Access Token: {accessToken}</List.Item>
            </List>
          </BlockStack>
        </Card>
        
        <Card>
          <BlockStack gap="400">
            <Text variant="headingMd">Onboarding State</Text>
            {onboardingState ? (
              <Box padding="400" background="bg-surface-secondary">
                <pre>{JSON.stringify(onboardingState, null, 2)}</pre>
              </Box>
            ) : (
              <Banner tone="warning">
                <p>No onboarding state found for this shop</p>
              </Banner>
            )}
            
            <BlockStack gap="300">
              <Form method="post">
                <input type="hidden" name="action" value="reset_onboarding" />
                <Button submit destructive>Reset Onboarding</Button>
              </Form>
              
              <Form method="post">
                <input type="hidden" name="action" value="complete_onboarding" />
                <Button submit primary>Complete Onboarding</Button>
              </Form>
            </BlockStack>
          </BlockStack>
        </Card>
        
        <Card>
          <BlockStack gap="400">
            <Text variant="headingMd">Database Information</Text>
            <Box padding="400" background="bg-surface-secondary">
              <pre>{JSON.stringify(databaseInfo, null, 2)}</pre>
            </Box>
          </BlockStack>
        </Card>
      </BlockStack>
    </Page>
  );
}
