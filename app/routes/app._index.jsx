import { json, redirect } from "@remix-run/node";
import { useLoaderData, Link } from "@remix-run/react"; // Added useNavigate
import { useState } from "react"; // Added useState
import ErrorBoundary from "../components/ErrorBoundary";
import {
  Page,
  Layout,
  Card,
  Text,
  BlockStack,
  Box,
  InlineGrid,
  InlineStack,
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
import { RevenueTrendChart } from "../components/RevenueTrendChart";
import { CustomerSegments as CustomerSegmentsComponent } from "../components/CustomerSegments";
import { DateSelector } from '../components/DateSelector';
import { format, subDays } from 'date-fns';
import { analyticsLogger } from "../services/loggerService";
import { handleApiError } from "../utils/errorHandling";
import { formatCurrency } from "../utils/formatters";

export const headers = ({ loaderHeaders }) => {
  return {
    // Preserve any headers set by the loader
    "Content-Security-Policy": loaderHeaders.get("Content-Security-Policy") || "",
    "X-Frame-Options": loaderHeaders.get("X-Frame-Options") || "",
    "X-Content-Type-Options": "nosniff",
  };
};

// Then create a wrapper function after the imports:
const CustomerSegments = ({ segments }) => <CustomerSegmentsComponent data={segments} />;

export const loader = async ({ request }) => {
  try {
    const { admin, session } = await authenticate.admin(request);
    const { shop, accessToken } = session;

    // Create response headers
    const responseHeaders = new Headers();
    
    // Set CSP headers
    const shopDomain = shop.includes('.myshopify.com') ? shop : `${shop}.myshopify.com`;
    responseHeaders.set("Content-Security-Policy", `frame-ancestors https://${shopDomain} https://admin.shopify.com`);
    responseHeaders.set("X-Frame-Options", `ALLOW-FROM https://${shopDomain}`);
    responseHeaders.set("X-Content-Type-Options", "nosniff");

    // Get URL parameters for date range
    const url = new URL(request.url);
    const startDateParam = url.searchParams.get("startDate");
    const endDateParam = url.searchParams.get("endDate");

    // Default to 30 days if no dates provided
    const endDate = endDateParam ? new Date(endDateParam) : new Date();
    
    analyticsLogger.debug("Session information", { shop, hasAccessToken: !!accessToken });
    
    // Load initial data in parallel to reduce wait time
    const [onboarding, subscription] = await Promise.all([
      // Check onboarding status
      getOnboardingState(shop).catch(error => {
        analyticsLogger.error("Critical error fetching onboarding state:", error, { shop });
        return { completed: false, currentStep: "welcome" };
      }),
      
      // Check subscription status
      // Pass the admin object which contains an authenticated graphql client
      checkSubscription(admin).catch(error => { 
        analyticsLogger.error("Error checking subscription:", error, { shop });
        // It seems the original code intended to catch this and return a default.
        // The error message from terminal indicates this catch IS working.
        return { hasSubscription: true, plan: "Development" }; 
      })
    ]);
    
    analyticsLogger.info("Onboarding state:", { shop, onboardingState: JSON.stringify(onboarding) });
    
    // For development, give option to skip onboarding
    if (!onboarding.completed) {
      return redirect("/app/onboarding", { headers: responseHeaders });
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
      // Add dummy data for previous period for comparison testing in dev
      previousPeriodRevenueByDay: Array.from({ length: 30 }, (_, i) => ({
        date: format(subDays(new Date(), 59 - i), 'yyyy-MM-dd'), // Shifted back 30 days
        revenue: 800 + Math.random() * 800 // Slightly different values for visual distinction
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
        
        // First try to get data from cache with stale-while-revalidate
        // This allows us to quickly return results even if the cache is stale
        const maxStaleness = 600; // Allow up to 10 minutes stale data for instant renders
        
        // Advanced cache options
        const cacheOptions = {
          maxStaleness: maxStaleness, 
          ignoreErrors: true
        };
        
        // Check cache first for both data types
        let cachedRevenue = await analytics.getCache("revenue_overview_30", cacheOptions);
        let cachedClv = await analytics.getCache("clv_all_customers", cacheOptions);
        
        // Extract data from enhanced cache format (with metadata)
        if (cachedRevenue && cachedRevenue.data) {
          cachedRevenue = cachedRevenue.data;
        }
        
        if (cachedClv && cachedClv.data) {
          cachedClv = cachedClv.data;
        }
        
        // If we have both cached values, return them immediately
        if (cachedRevenue && cachedClv) {
          analyticsLogger.info('Dashboard rendered from cache', { shop });
          
          // Schedule background cleanup of expired caches
          analytics.cleanupExpiredCaches().catch(err => 
            analyticsLogger.error('Cache cleanup error:', err, { shop })
          );
          
          return json({
            revenueData: cachedRevenue,
            clvData: cachedClv,
            subscription,
            error: null,
            cacheInfo: {
              fromCache: true,
              cacheTime: new Date().toISOString()
            }
          }, { headers: responseHeaders });
        }
        
        // If cache miss for any data, fetch both in parallel
        const [revenueData, clvData] = await Promise.all([
          analytics.getRevenueOverview(30),
          analytics.calculateCLV()
        ]);
        
        // Prefetch other commonly used caches in the background
        analytics.prefetchCommonCaches().catch(err => 
          analyticsLogger.error('Prefetch error:', err, { shop })
        );
        
        return json({
          revenueData,
          clvData,
          subscription,
          error: null,
          cacheInfo: {
            fromCache: false,
            cacheTime: new Date().toISOString()
          }
        }, { headers: responseHeaders });
      } else {
        // Use dummy data for development
        return json({
          revenueData: dummyRevenueData,
          clvData: dummyClvData,
          subscription: { hasSubscription: true, plan: "Development" },
          error: null,
          cacheInfo: {
            fromCache: false,
            isDummy: true
          }
        }, { headers: responseHeaders });
      }
    } catch (error) {
    analyticsLogger.error('Analytics error:', error, { shop });
      // Return dummy data with a warning
      return json(handleApiError(error, "dashboard.loader.analytics", { shop }), { headers: responseHeaders });
    }
  } catch (error) {
    // shop is not in scope here, so we can't log it.
    analyticsLogger.error("Loader error:", error);
    
    // Create fallback headers for error cases
    const fallbackHeaders = new Headers();
    fallbackHeaders.set("Content-Security-Policy", "frame-ancestors https://*.myshopify.com https://admin.shopify.com");
    fallbackHeaders.set("X-Content-Type-Options", "nosniff");
    
    // Return a structured error response
    return json(handleApiError(error, "dashboard.loader", {}), { headers: fallbackHeaders });
  }
};

function IndexContent() {
  const { revenueData, clvData, error } = useLoaderData();

  const [selectedDateRange, setSelectedDateRange] = useState({
    start: new Date(new Date().setDate(new Date().getDate() - 30)),
    end: new Date(),
  });
  const [comparisonEnabled, setComparisonEnabled] = useState(false);

  const handleToggleComparison = () => {
    setComparisonEnabled(prev => !prev);
    // Note: Data for comparison (revenueData.previousPeriodRevenueByDay)
    // is already loaded by the loader via AnalyticsService.
    // If it were fetched client-side, this handler would trigger that fetch.
  };
  
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
                <InlineStack align="space-between">
                  <Text variant="headingMd" as="h2">
                    Revenue Trend
                  </Text>
                  <DateSelector
                    onDateChange={(dates) => setSelectedDateRange(dates)}
                    initialStartDate={selectedDateRange.start}
                    initialEndDate={selectedDateRange.end}
                  />
                </InlineStack>
                <Box padding="400">
                  <RevenueTrendChart
                    data={revenueData.revenueByDay}
                    comparisonData={revenueData.previousPeriodRevenueByDay || []}
                    comparisonEnabled={comparisonEnabled}
                    onToggleComparison={handleToggleComparison}
                  />
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
              {/* Use direct Link components instead of mixing Link and Button for consistency */}
              <Link to="/app/analytics/export" style={{width: '100%'}}>
                <Button fullWidth>Export Analytics Report</Button>
              </Link>
              <Link to="/app/analytics/segments" style={{width: '100%'}}>
                <Button fullWidth>Manage Customer Segments</Button>
              </Link>
              <Link to="/app/analytics/forecast" style={{width: '100%'}}>
                <Button fullWidth>View Revenue Forecast</Button>
              </Link>
            </InlineGrid>
          </BlockStack>
        </Card>
      </BlockStack>
    </Page>
  );
}

export default function Index() {
  return (
    <ErrorBoundary componentName="Dashboard">
      <IndexContent />
    </ErrorBoundary>
  );
}
