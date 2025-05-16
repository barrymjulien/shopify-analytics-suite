import { json, redirect } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  Text,
  BlockStack,
  Box,
  InlineGrid,
  Button,
  Badge,
  DataTable,
  SkeletonBodyText,
  SkeletonDisplayText,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import { AnalyticsService } from "../services/analytics.server";
import { checkSubscription } from "../services/billing.server";
import { getOnboardingState } from "../services/onboarding.server";
import { MetricCard } from "../components/MetricCard";
import { RevenueChart } from "../components/RevenueChart";
import { CustomerSegments } from "../components/CustomerSegments";

export const loader = async ({ request }) => {
  try {
    const { admin, session } = await authenticate.admin(request);
    const { shop, accessToken } = session;
    
    // Check onboarding status - add error handling
    let onboarding;
    try {
      onboarding = await getOnboardingState(shop);
    } catch (error) {
      console.error("Error fetching onboarding state:", error);
      // Create a default onboarding state if it doesn't exist
      onboarding = { completed: false, currentStep: "welcome" };
    }
    
    // If onboarding not completed, redirect to onboarding flow
    if (!onboarding.completed) {
      return redirect("/app/onboarding");
    }
    
    // Check subscription after onboarding with error handling
    let subscription;
    try {
      subscription = await checkSubscription(session);
    } catch (error) {
      console.error("Error checking subscription:", error);
      subscription = { hasSubscription: false };
    }
    
    if (!subscription.hasSubscription) {
      return redirect("/app/pricing");
    }
    
    const analytics = new AnalyticsService(shop, accessToken);
    
    try {
      // Fetch both revenue overview and CLV data
      const [revenueData, clvData] = await Promise.all([
        analytics.getRevenueOverview(30),
        analytics.calculateCLV()
      ]);
      
      return json({
        revenueData,
        clvData,
        subscription,
        error: null
      });
    } catch (error) {
      console.error('Analytics error:', error);
      return json({
        revenueData: null,
        clvData: null,
        subscription,
        error: 'Failed to load analytics data'
      });
    }
  } catch (error) {
    console.error("Loader error:", error);
    // Return a structured error response
    return json({
      error: "Failed to load the application. Please try again.",
      technicalError: error.message
    });
  }
};

export default function Index() {
  const { revenueData, clvData, error } = useLoaderData();
  
  if (error) {
    return (
      <Page title="Analytics Dashboard">
        <Card>
          <BlockStack gap="300">
            <Text variant="headingMd" as="h2">
              Error Loading Analytics
            </Text>
            <Text tone="critical">{error}</Text>
            <Button onClick={() => window.location.reload()}>
              Retry
            </Button>
          </BlockStack>
        </Card>
      </Page>
    );
  }
  
  if (!revenueData || !clvData) {
    return (
      <Page title="Analytics Dashboard">
        <BlockStack gap="500">
          <Card>
            <SkeletonDisplayText size="small" />
            <SkeletonBodyText lines={3} />
          </Card>
          <Card>
            <SkeletonDisplayText size="small" />
            <SkeletonBodyText lines={5} />
          </Card>
        </BlockStack>
      </Page>
    );
  }
  
  // Format currency
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(value);
  };
  
  // Prepare top customers table
  const topCustomersRows = clvData.customers
    .slice(0, 10)
    .map(customer => [
      customer.customerName || customer.email || 'Anonymous',
      customer.orderCount.toString(),
      formatCurrency(customer.totalSpent),
      formatCurrency(customer.predictedCLV),
      <Badge 
        key={customer.customerId}
        status={
          customer.segment === 'VIP' ? 'success' :
          customer.segment === 'At Risk' ? 'warning' :
          'default'
        }
      >
        {customer.segment}
      </Badge>
    ]);
  
  return (
    <Page title="Analytics Dashboard">
      <BlockStack gap="500">
        {/* KPI Metrics */}
        <InlineGrid columns={{ xs: 1, sm: 2, md: 4 }} gap="400">
          <MetricCard
            title="Total Revenue (30d)"
            value={formatCurrency(revenueData.totalRevenue)}
            trend={revenueData.periodComparison.revenueTrend}
          />
          <MetricCard
            title="Average Order Value"
            value={formatCurrency(revenueData.averageOrderValue)}
            trend={revenueData.periodComparison.aovTrend}
          />
          <MetricCard
            title="Total Orders"
            value={revenueData.orderCount}
            trend={revenueData.periodComparison.orderTrend}
          />
          <MetricCard
            title="Average CLV"
            value={formatCurrency(clvData.summary.averageCLV)}
            subtitle="Per Customer"
          />
        </InlineGrid>
        
        {/* Revenue Chart */}
        <Layout>
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <Text variant="headingMd" as="h2">
                  Revenue Trend
                </Text>
                <Box padding="400">
                  <RevenueChart data={revenueData.revenueByDay} />
                </Box>
              </BlockStack>
            </Card>
          </Layout.Section>
          
          <Layout.Section secondary>
            <Card>
              <BlockStack gap="400">
                <Text variant="headingMd" as="h2">
                  Customer Segments
                </Text>
                <Box padding="400">
                  <CustomerSegments segments={clvData.summary.topSegments} />
                </Box>
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>
        
        {/* Top Customers Table */}
        <Card>
          <BlockStack gap="400">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text variant="headingMd" as="h2">
                Top Customers by CLV
              </Text>
              <Button url="/app/analytics/customers" plain>
                View All
              </Button>
            </div>
            
            <DataTable
              columnContentTypes={[
                'text',
                'numeric',
                'numeric',
                'numeric',
                'text',
              ]}
              headings={[
                'Customer',
                'Orders',
                'Total Spent',
                'Predicted CLV',
                'Segment',
              ]}
              rows={topCustomersRows}
              sortable={[false, true, true, true, false]}
            />
          </BlockStack>
        </Card>
        
        {/* Quick Actions */}
        <Card>
          <BlockStack gap="400">
            <Text variant="headingMd" as="h2">
              Quick Actions
            </Text>
            <InlineGrid columns={{ xs: 1, sm: 2, md: 3 }} gap="400">
              <Button url="/app/analytics/export" fullWidth>
                Export Analytics Report
              </Button>
              <Button url="/app/analytics/segments" fullWidth>
                Manage Customer Segments
              </Button>
              <Button url="/app/analytics/forecast" fullWidth>
                View Revenue Forecast
              </Button>
            </InlineGrid>
          </BlockStack>
        </Card>
      </BlockStack>
    </Page>
  );
}
