import { useState } from "react";
import { json } from "@remix-run/node";
import { useLoaderData, useNavigate } from "@remix-run/react";
import {
  Page,
  Card,
  BlockStack,
  Box,
  Text,
  Select,
  Banner,
  Button,
  Tabs,
  LegacyCard,
  DataTable,
  Tooltip,
  Icon,
  InlineStack
} from "@shopify/polaris";
// At the top of the file, add these imports
import { WeeklyForecastVisualization } from "../components/WeeklyForecastVisualization";
import { ForecastScenarioTable } from "../components/ForecastScenarioTable";
import { FiArrowLeft, FiHelpCircle } from 'react-icons/fi';
import { authenticate } from "../shopify.server";
import { addDays, addMonths, format, startOfMonth, endOfMonth, parseISO, differenceInDays, eachDayOfInterval } from 'date-fns';

export async function loader({ request }) {
  const { admin, session } = await authenticate.admin(request);
  const { shop } = session;

  const url = new URL(request.url);
  const startDateParam = url.searchParams.get("start");
  const endDateParam = url.searchParams.get("end");

  let startDate = startDateParam ? parseISO(startDateParam) : new Date();
  let endDate = endDateParam ? parseISO(endDateParam) : new Date();
  
  if (differenceInDays(endDate, startDate) < 0) {
    // Swap if start is after end
    [startDate, endDate] = [endDate, startDate];
  }

  // Ensure we are generating historical-like data for the chart
  // For this example, we'll generate data within the selected range.
  // In a real app, this would query a database.
  const dateInterval = eachDayOfInterval({ start: startDate, end: endDate });

  const dailyRevenueData = dateInterval.map(date => {
    const baseSales = 800 + Math.random() * 600; // Simulate historical sales
    
    const dayOfWeek = date.getDay();
    const weekendBoost = (dayOfWeek === 0 || dayOfWeek === 6) ? 1.2 : 1.0;
    const randomFactor = 0.85 + Math.random() * 0.3;
    
    const revenue = baseSales * weekendBoost * randomFactor;
    
    return {
      date: format(date, 'yyyy-MM-dd'),
      revenue: Math.round(revenue), // Changed 'forecasted' to 'revenue'
      // For simplicity, lower/upper bounds are not critical for RevenueTrendChart
      // but could be added if needed by other components.
      // lower: Math.round(revenue * 0.85), 
      // upper: Math.round(revenue * 1.15),
    };
  });
  
  // Monthly forecast can remain future-looking for the dedicated forecast page,
  // but the dashboard needs historical daily data.
  // For now, we'll keep the existing monthly forecast logic as it's for a different view.
  const today = new Date(); // Keep this for the separate monthly forecast view
  const monthlyForecast = Array.from({ length: 6 }, (_, i) => {
    const date = addMonths(today, i);
    const startDate = startOfMonth(date);
    const endDate = endOfMonth(date);
    const daysInMonth = endDate.getDate();
    
    // Base monthly value with some seasonality
    let monthValue = 30000 + (i * 2000);
    
    // Add seasonality - Q4 boost for example
    const month = date.getMonth();
    if (month >= 9 && month <= 11) { // Q4: Oct, Nov, Dec
      monthValue *= 1.3;
    }
    
    // Add some randomness
    const randomFactor = 0.95 + Math.random() * 0.1;
    const forecasted = monthValue * randomFactor;
    
    return {
      month: format(date, 'MMMM yyyy'),
      startDate: format(startDate, 'yyyy-MM-dd'),
      endDate: format(endDate, 'yyyy-MM-dd'),
      revenue: Math.round(forecasted), // Changed 'forecasted' to 'revenue' for consistency
      lower: Math.round(forecasted * 0.9),
      upper: Math.round(forecasted * 1.1),
      orders: Math.round(forecasted / 85) // Assuming 'forecasted' was intended for order calc
    };
  });
  
  // The AnalyticsDashboard expects a structure like { dailyRevenue: [...] }
  // The RevenueForecast page itself uses dailyForecast directly.
  // We will return dailyRevenue for the dashboard, and keep dailyForecast for this page's own use.
  return json({ 
    shop,
    dailyRevenue: dailyRevenueData, // This is what AnalyticsDashboard will use
    dailyForecast: dailyRevenueData, // For this page's own "daily" view if needed
    monthlyForecast, // For this page's "monthly" view
    summary: {
      nextMonthRevenue: monthlyForecast.length > 0 ? monthlyForecast[0].revenue : 0,
      nextMonthGrowth: 12, // percentage
      q4Total: monthlyForecast.slice(3, 6).reduce((sum, month) => sum + month.revenue, 0),
      confidenceScore: 85 // percentage
    }
  });
}

export default function RevenueForecast() {
  // Note: useLoaderData() will now provide dailyRevenue, dailyForecast, monthlyForecast
  const { dailyRevenue, dailyForecast, monthlyForecast, summary } = useLoaderData();
  const navigate = useNavigate();
  
  // State
  const [forecastPeriod, setForecastPeriod] = useState('monthly');
  const [selectedTabIndex, setSelectedTabIndex] = useState(0);
  
  // Tabs
  const tabs = [
    { id: 'forecast', content: 'Revenue Forecast' },
    { id: 'factors', content: 'Influencing Factors' },
    { id: 'scenarios', content: 'Forecast Scenarios' },
  ];
  
  // Format currency
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(value);
  };
  
  // Get forecast data based on selected period
  const getForecastData = () => {
    // The RevenueForecast page itself might use dailyForecast or monthlyForecast
    return forecastPeriod === 'daily' ? (dailyForecast || []) : (monthlyForecast || []);
  };
  
  // Prepare forecast table rows
  const getForecastTableRows = () => {
    const data = getForecastData();
    
    if (forecastPeriod === 'daily') {
      return data.map(day => [
        day.date,
        formatCurrency(day.revenue), // Use 'revenue' key
        formatCurrency(day.lower),
        formatCurrency(day.upper),
      ]);
    } else {
      return data.map(month => [
        month.month,
        formatCurrency(month.revenue), // Use 'revenue' key
        formatCurrency(month.lower),
        formatCurrency(month.upper),
        month.orders.toString()
      ]);
    }
  };
  
  // Render forecast table
  const renderForecastTable = () => {
    const headings = forecastPeriod === 'daily' 
      ? ['Date', 'Forecast', 'Lower Bound', 'Upper Bound']
      : ['Month', 'Forecast', 'Lower Bound', 'Upper Bound', 'Est. Orders'];
    
    const columnTypes = forecastPeriod === 'daily'
      ? ['text', 'numeric', 'numeric', 'numeric']
      : ['text', 'numeric', 'numeric', 'numeric', 'numeric'];
    
    return (
      <LegacyCard>
        <DataTable
          columnContentTypes={columnTypes}
          headings={headings}
          rows={getForecastTableRows()}
          truncate={false}
        />
      </LegacyCard>
    );
  };
  
  // Render forecast canvas chart
  // Replace the renderForecastChart function with:
  const renderForecastChart = () => {
    return (
      <WeeklyForecastVisualization
        data={getForecastData()}
        title="Revenue Forecast Visualization"
      />
    );
  };
  
  // Render forecast tab
  // Replace the renderForecastTab function with:
  const renderForecastTab = () => {
    return (
      <BlockStack gap="500">
        <InlineStack gap="300" align="space-between">
          <Select
            label="Forecast Period"
            options={[
              {label: 'Daily (30 days)', value: 'daily'},
              {label: 'Monthly (6 months)', value: 'monthly'}
            ]}
            value={forecastPeriod}
            onChange={setForecastPeriod}
          />
          
          <Box>
            <Button>Export Forecast</Button>
          </Box>
        </InlineStack>
        
        {renderForecastChart()}
        
        {renderForecastTable()}
      </BlockStack>
    );
  };
  
  // Render influencing factors tab
  const renderFactorsTab = () => {
    return (
      <BlockStack gap="500">
        <Card>
          <BlockStack gap="400">
            <Text variant="headingMd" as="h3">
              Key Factors Influencing Forecast
            </Text>
            
            <BlockStack gap="300">
              <InlineStack align="space-between">
                <InlineStack gap="200">
                  <Text variant="bodyMd">Historical growth rate</Text>
                  <Tooltip content="Based on your store's growth over the past 12 months">
                    <Icon source={FiHelpCircle} color="subdued" />
                  </Tooltip>
                </InlineStack>
                <Text variant="bodyMd" fontWeight="semibold">+8%</Text>
              </InlineStack>
              
              <InlineStack align="space-between">
                <InlineStack gap="200">
                  <Text variant="bodyMd">Seasonal trends</Text>
                  <Tooltip content="Based on your industry's seasonal patterns">
                    <Icon source={FiHelpCircle} color="subdued" />
                  </Tooltip>
                </InlineStack>
                <Text variant="bodyMd" fontWeight="semibold">Q4 boost expected</Text>
              </InlineStack>
              
              <InlineStack align="space-between">
                <InlineStack gap="200">
                  <Text variant="bodyMd">Customer retention rate</Text>
                  <Tooltip content="Percentage of customers who make repeat purchases">
                    <Icon source={FiHelpCircle} color="subdued" />
                  </Tooltip>
                </InlineStack>
                <Text variant="bodyMd" fontWeight="semibold">42%</Text>
              </InlineStack>
              
              <InlineStack align="space-between">
                <InlineStack gap="200">
                  <Text variant="bodyMd">Average order frequency</Text>
                  <Tooltip content="How often customers make repeat purchases">
                    <Icon source={FiHelpCircle} color="subdued" />
                  </Tooltip>
                </InlineStack>
                <Text variant="bodyMd" fontWeight="semibold">68 days</Text>
              </InlineStack>
              
              <InlineStack align="space-between">
                <InlineStack gap="200">
                  <Text variant="bodyMd">Market trend adjustment</Text>
                  <Tooltip content="Based on industry benchmarks and trends">
                    <Icon source={FiHelpCircle} color="subdued" />
                  </Tooltip>
                </InlineStack>
                <Text variant="bodyMd" fontWeight="semibold">+2%</Text>
              </InlineStack>
            </BlockStack>
          </BlockStack>
        </Card>
        
        <Card>
          <BlockStack gap="400">
            <Text variant="headingMd" as="h3">
              Forecast Model Quality
            </Text>
            
            <BlockStack gap="300">
              <InlineStack align="space-between">
                <Text variant="bodyMd">Model confidence score</Text>
                <Text variant="bodyMd" fontWeight="semibold">{summary.confidenceScore}%</Text>
              </InlineStack>
              
              <InlineStack align="space-between">
                <Text variant="bodyMd">Forecast accuracy (last 3 months)</Text>
                <Text variant="bodyMd" fontWeight="semibold">92%</Text>
              </InlineStack>
              
              <InlineStack align="space-between">
                <Text variant="bodyMd">Data points analyzed</Text>
                <Text variant="bodyMd" fontWeight="semibold">548 orders</Text>
              </InlineStack>
              
              <Box paddingBlockStart="300">
                <Text variant="headingSm">Actions to Improve Forecast</Text>
                <BlockStack gap="200" paddingBlockStart="200">
                  <Text variant="bodyMd">• Add more historical data for better predictions</Text>
                  <Text variant="bodyMd">• Integrate marketing campaign plans</Text>
                  <Text variant="bodyMd">• Add planned product launches</Text>
                </BlockStack>
              </Box>
            </BlockStack>
          </BlockStack>
        </Card>
      </BlockStack>
    );
  };
  
  // Render scenarios tab
  // Replace the renderScenariosTab function with:
  const renderScenariosTab = () => {
    // Convert the scenario data to the format expected by ForecastScenarioTable
    const scenariosData = [
      {
        id: 'base',
        name: 'Base Case',
        description: 'Current forecast based on historical data',
        forecast: summary.q4Total,
        change: 0,
        isBase: true,
        dateGenerated: new Date().toLocaleDateString(),
        assumptions: [
          { name: 'Growth Rate', value: '8%' },
          { name: 'Seasonal Factor', value: 'Q4 Boost' },
          { name: 'Market Trend', value: '+2%' }
        ]
      },
      {
        id: 'optimistic',
        name: 'Optimistic',
        description: 'Assumes 15% higher growth than baseline',
        forecast: summary.q4Total * 1.15,
        change: 15,
        dateGenerated: new Date().toLocaleDateString(),
        assumptions: [
          { name: 'Growth Rate', value: '12%' },
          { name: 'Seasonal Factor', value: 'Strong Q4 Boost' },
          { name: 'Market Trend', value: '+5%' }
        ],
        recommendations: 'Increase inventory levels to prepare for higher demand. Consider expanded marketing campaigns to capitalize on growth.'
      },
      {
        id: 'conservative',
        name: 'Conservative',
        description: 'Assumes 10% lower growth than baseline',
        forecast: summary.q4Total * 0.9,
        change: -10,
        dateGenerated: new Date().toLocaleDateString(),
        assumptions: [
          { name: 'Growth Rate', value: '6%' },
          { name: 'Seasonal Factor', value: 'Mild Q4 Boost' },
          { name: 'Market Trend', value: '-1%' }
        ],
        recommendations: 'Maintain current inventory levels. Focus on customer retention over acquisition.'
      },
      {
        id: 'marketing',
        name: 'Marketing Push',
        description: 'Includes planned Q4 marketing campaign',
        forecast: summary.q4Total * 1.25,
        change: 25,
        dateGenerated: new Date().toLocaleDateString(),
        assumptions: [
          { name: 'Growth Rate', value: '8%' },
          { name: 'Seasonal Factor', value: 'Q4 Boost' },
          { name: 'Marketing ROI', value: '2.5x' },
          { name: 'Campaign Budget', value: '$25,000' }
        ],
        recommendations: 'Implement the planned marketing campaign with focus on high-value customer segments. Prepare for increased customer support needs.'
      }
    ];
    
    return (
      <BlockStack gap="500">
        <ForecastScenarioTable
          scenarios={scenariosData}
          title="Alternative Forecast Scenarios"
        />
      </BlockStack>
    );
  };
  
  return (
    <Page
      title="Revenue Forecast"
      backAction={{ content: 'Back', icon: FiArrowLeft, onAction: () => navigate('/app') }}
    >
      <BlockStack gap="500">
        <Card>
          <BlockStack gap="400">
            <Text variant="headingMd" as="h2">
              Forecast Summary
            </Text>
            
            <BlockStack gap="300">
              <InlineStack align="space-between">
                <Text variant="bodyMd">Next month forecasted revenue:</Text>
                <Text variant="headingMd" fontWeight="bold" tone="success">
                  {formatCurrency(summary.nextMonthRevenue)}
                </Text>
              </InlineStack>
              
              <InlineStack align="space-between">
                <Text variant="bodyMd">Monthly growth rate:</Text>
                <Text variant="bodyMd" fontWeight="semibold" tone={summary.nextMonthGrowth > 0 ? "success" : "critical"}>
                  {summary.nextMonthGrowth > 0 ? '+' : ''}{summary.nextMonthGrowth}%
                </Text>
              </InlineStack>
              
              <InlineStack align="space-between">
                <Text variant="bodyMd">Forecast confidence:</Text>
                <Text variant="bodyMd" fontWeight="semibold">
                  {summary.confidenceScore}%
                </Text>
              </InlineStack>
              
              <InlineStack align="space-between">
                <Text variant="bodyMd">Q4 total forecasted revenue:</Text>
                <Text variant="bodyMd" fontWeight="semibold">
                  {formatCurrency(summary.q4Total)}
                </Text>
              </InlineStack>
            </BlockStack>
          </BlockStack>
        </Card>
        
        <Tabs
          tabs={tabs}
          selected={selectedTabIndex}
          onSelect={setSelectedTabIndex}
        />
        
        {selectedTabIndex === 0 && renderForecastTab()}
        {selectedTabIndex === 1 && renderFactorsTab()}
        {selectedTabIndex === 2 && renderScenariosTab()}
      </BlockStack>
    </Page>
  );
}
