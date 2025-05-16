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

import { format, subDays } from 'date-fns';

export const loader = async ({ request }) => {
  try {
    const { admin, session } = await authenticate.admin(request);
    const { shop, accessToken } = session;
    
    console.log("Session shop:", shop);
    console.log("Session token available:", !!accessToken);
    
    // Check onboarding status - with improved error handling
    let onboarding;
    try {
      onboarding = await getOnboardingState(shop);
      console.log("Onboarding state:", JSON.stringify(onboarding));
    } catch (error) {
      console.error("Critical error fetching onboarding state:", error);
      // Create a default onboarding state
      return redirect("/app/dev-mode");
    }
    
    // For development, give option to skip onboarding
    if (!onboarding.completed) {
      return redirect("/app/onboarding");
    }
    
    // Check subscription after onboarding with error handling
    let subscription;
    try {
      subscription = await checkSubscription(session);
    } catch (error) {
      console.error("Error checking subscription:", error);
      subscription = { hasSubscription: true, plan: "Development" };
    }
    
    // Use dummy data for development
    const dummyRevenueData = {
      totalRevenue: 42680.75,
      averageOrderValue: 85.36,
      orderCount: 500,
      revenueByDay: Array.from({ length: 30 }, (_, i) => ({
        date: format(subDays(new Date(), 29 - i), 'yyyy-MM-dd'),
        revenue: 1000 + Math.random() * 1000
      })),
      periodComparison: {
        revenueTrend: 12,
        orderTrend: 8,
        aovTrend: 4
      }
    };
    
    const dummyClvData = {
      customers: Array.from({ length: 10 }, (_, i) => ({
        customerId: `cust_${i+1}`,
        customerName: `Customer ${i+1}`,
        email: `customer${i+1}@example.com`,
        totalSpent: 500 + Math.random() * 2000,
        orderCount: Math.floor(3 + Math.random() * 10),
        predictedCLV: 1200 + Math.random() * 4000,
        segment: ['VIP', 'Loyal', 'Promising', 'New Customer', 'At Risk'][Math.floor(Math.random() * 5)]
      })),
      summary: {
        averageCLV: 2450.75,
        topSegments: [
          { name: 'Loyal', count: 45 },
          { name: 'Promising', count: 32 },
          { name: 'VIP', count: 18 },
          { name: 'New Customer', count: 12 },
          { name: 'At Risk', count: 5 }
        ]
      }
    };
    
    try {
      // For production, use actual data
      if (process.env.NODE_ENV === "production") {
        const analytics = new AnalyticsService(shop, accessToken);
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
      } else {
        // Use dummy data for development
        return json({
          revenueData: dummyRevenueData,
          clvData: dummyClvData,
          subscription: { hasSubscription: true, plan: "Development" },
          error: null
        });
      }
    } catch (error) {
      console.error('Analytics error:', error);
      // Return dummy data with a warning
      return json({
        revenueData: dummyRevenueData,
        clvData: dummyClvData,
        subscription: { hasSubscription: true, plan: "Development" },
        error: 'Using dummy data: ' + error.message
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
