import { json, redirect } from "@remix-run/node";
import { useLoaderData, Form } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  ProgressBar,
  Button,
  Text,
  Banner,
  BlockStack,
  FormLayout,
  TextField,
  Select,
  Checkbox,
  InlineStack,
  Box
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import { 
  getOnboardingState, 
  updateOnboardingStep, 
  ONBOARDING_STEPS,
  calculateProgress
} from "../services/onboarding.server";

/**
 * Welcome step component
 */
const WelcomeStep = () => {
  return (
    <BlockStack gap="400">
      <Banner title="Welcome to Analytics Suite">
        <p>Let's set up your analytics dashboard in just a few steps.</p>
      </Banner>
      
      <Text as="p" variant="bodyMd">
        The Analytics Suite provides powerful insights into your store's performance, 
        customer behavior, and revenue trends. This setup wizard will guide you through 
        configuring your dashboard and connecting your data.
      </Text>
      
      <Form method="post">
        <input type="hidden" name="step" value="welcome" />
        <input type="hidden" name="started" value="true" />
        
        <BlockStack gap="400" align="end">
          <Button primary submit>
            Get Started
          </Button>
        </BlockStack>
      </Form>
    </BlockStack>
  );
};

/**
 * Loader for the onboarding page
 */
export async function loader({ request }) {
  const { admin, session } = await authenticate.admin(request);
  const { shop } = session;
  
  // Get current onboarding state
  const onboarding = await getOnboardingState(shop);
  
  // If onboarding is completed, redirect to main app
  if (onboarding.completed) {
    return redirect("/app");
  }
  
  // Calculate progress percentage
  const progress = calculateProgress(onboarding.currentStep);
  
  return json({ 
    shop,
    currentStep: onboarding.currentStep,
    stepsData: onboarding.stepsData,
    progress,
    stepIndex: ONBOARDING_STEPS.indexOf(onboarding.currentStep) + 1
  });
}

/**
 * Action for the onboarding page
 */
export async function action({ request }) {
  const { admin, session } = await authenticate.admin(request);
  const { shop } = session;
  
  // Process form submission
  const formData = await request.formData();
  const step = formData.get("step");
  
  // Extract data from form
  const stepData = {};
  for (const [key, value] of formData.entries()) {
    if (key !== "step") {
      stepData[key] = value;
    }
  }
  
  // Update onboarding progress
  await updateOnboardingStep(shop, step, stepData);
  
  // Redirect to the same page to load the next step
  return redirect("/app/onboarding");
}

/**
 * Main onboarding component
 */
export default function Onboarding() {
  const { currentStep, progress, stepIndex, stepsData } = useLoaderData();
  
  return (
    <Page fullWidth>
      <BlockStack gap="500">
        <Layout>
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <BlockStack gap="200">
                  <Text variant="headingXl" as="h1">Set up your Analytics Suite</Text>
                  <Text variant="bodyMd" as="p">Complete these steps to get started with your analytics dashboard</Text>
                  
                  <Box paddingBlockEnd="300" paddingBlockStart="300">
                    <ProgressBar progress={progress} />
                    <Box paddingBlockStart="200">
                      <Text variant="bodyMd" as="p">
                        Step {stepIndex} of {ONBOARDING_STEPS.length}
                      </Text>
                    </Box>
                  </Box>
                </BlockStack>
                
                <Card.Section>
                  {currentStep === "welcome" && (
                    <WelcomeStep />
                  )}
                  {currentStep === "connect_data" && (
                    <ConnectDataStep previousSelections={stepsData.welcome} />
                  )}
                  {currentStep === "choose_plan" && (
                    <ChoosePlanStep previousSelections={stepsData.connect_data} />
                  )}
                  {currentStep === "analytics_setup" && (
                    <AnalyticsSetupStep previousSelections={stepsData} />
                  )}
                </Card.Section>
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>
      </BlockStack>
    </Page>
  );
}

/**
 * Connect data step component
 */
const ConnectDataStep = ({ previousSelections = {} }) => {
  const dataSources = [
    { label: "Orders and products", value: "orders" },
    { label: "Customer information", value: "customers" },
    { label: "Marketing campaigns", value: "marketing" },
    { label: "Inventory and fulfillment", value: "inventory" }
  ];
  
  const dataRangeOptions = [
    { label: "Last 30 days", value: "30days" },
    { label: "Last 90 days", value: "90days" },
    { label: "Last 12 months", value: "12months" },
    { label: "All available data", value: "all" }
  ];

  return (
    <BlockStack gap="400">
      <Text as="h2" variant="headingLg">
        Connect Your Data
      </Text>
      
      <Text as="p" variant="bodyMd">
        Choose what data you'd like to analyze and the historical range to include.
      </Text>
      
      <Form method="post">
        <input type="hidden" name="step" value="connect_data" />
        
        <FormLayout>
          <BlockStack gap="400">
            <Text variant="headingMd" as="h3">
              Data Sources
            </Text>
            
            {dataSources.map((source) => (
              <Checkbox
                key={source.value}
                label={source.label}
                name={`dataSources.${source.value}`}
                checked={true}
                disabled
                helpText={source.value === 'orders' ? 'Required for analytics' : ''}
              />
            ))}
            
            <Select
              label="Historical Data Range"
              name="dataRange"
              options={dataRangeOptions}
              defaultValue="90days"
              helpText="Choose how far back to analyze your data"
            />
            
            <TextField
              label="Data Refresh Frequency"
              name="refreshFrequency"
              defaultValue="Daily"
              disabled
              helpText="Data will be automatically refreshed daily"
            />
            
            <BlockStack gap="400" align="end">
              <Button primary submit>
                Next Step
              </Button>
            </BlockStack>
          </BlockStack>
        </FormLayout>
      </Form>
    </BlockStack>
  );
};

/**
 * Choose plan step component
 */
const ChoosePlanStep = ({ previousSelections = {} }) => {
  const plans = [
    { 
      name: "Starter", 
      description: "For new stores just getting started",
      value: "STARTER"
    },
    { 
      name: "Growth", 
      description: "For established stores looking to scale",
      value: "GROWTH"
    },
    { 
      name: "Enterprise", 
      description: "For high-volume merchants with advanced needs",
      value: "ENTERPRISE"
    }
  ];

  return (
    <BlockStack gap="400">
      <Text as="h2" variant="headingLg">
        Choose Your Subscription Plan
      </Text>
      
      <Text as="p" variant="bodyMd">
        Select a plan that best fits your business needs. You can upgrade or downgrade at any time.
      </Text>
      
      <Form method="post">
        <input type="hidden" name="step" value="choose_plan" />
        
        <FormLayout>
          <BlockStack gap="400">
            <Select
              label="Subscription Plan"
              name="selectedPlan"
              options={plans.map(plan => ({ label: plan.name, value: plan.value }))}
              defaultValue="GROWTH"
              helpText="You'll be able to complete your subscription after onboarding"
            />
            
            <Banner>
              <p>You will be directed to the pricing page after completing the onboarding process.</p>
            </Banner>
            
            <BlockStack gap="400" align="end">
              <Button primary submit>
                Next Step
              </Button>
            </BlockStack>
          </BlockStack>
        </FormLayout>
      </Form>
    </BlockStack>
  );
};

/**
 * Analytics setup step component
 */
const AnalyticsSetupStep = ({ previousSelections = {} }) => {
  const metricOptions = [
    { label: "Revenue growth", value: "revenue_growth" },
    { label: "Average order value", value: "aov" },
    { label: "Customer lifetime value", value: "clv" },
    { label: "Conversion rate", value: "conversion" },
    { label: "Return rate", value: "return_rate" }
  ];

  return (
    <BlockStack gap="400">
      <Text as="h2" variant="headingLg">
        Analytics Preferences
      </Text>
      
      <Text as="p" variant="bodyMd">
        Customize your analytics dashboard to focus on the metrics that matter most to your business.
      </Text>
      
      <Form method="post">
        <input type="hidden" name="step" value="analytics_setup" />
        
        <FormLayout>
          <BlockStack gap="400">
            <Select
              label="Primary KPI"
              name="primaryKPI"
              options={metricOptions}
              defaultValue="revenue_growth"
              helpText="This metric will be highlighted on your dashboard"
            />
            
            <TextField
              label="Report Email"
              type="email"
              name="reportEmail"
              placeholder="your@email.com"
              helpText="Where to send automated analytics reports"
            />
            
            <Checkbox
              label="Enable automatic weekly reports"
              name="weeklyReports"
              checked={true}
            />
            
            <Checkbox
              label="Send alerts for unusual activity"
              name="unusualActivityAlerts"
              checked={true}
            />
            
            <BlockStack gap="400" align="end">
              <Button primary submit>
                Complete Setup
              </Button>
            </BlockStack>
          </BlockStack>
        </FormLayout>
      </Form>
    </BlockStack>
  );
};
