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
import { ArrowLeftIcon, QuestionIcon } from '../lib/icons';
import { authenticate } from "../../shopify.server";
import { addDays, addMonths, format, startOfMonth, endOfMonth } from 'date-fns';

export async function loader({ request }) {
  const { admin, session } = await authenticate.admin(request);
  const { shop } = session;
  
  // Sample forecast data
  const today = new Date();
  
  // Daily forecast for the next 30 days
  const dailyForecast = Array.from({ length: 30 }, (_, i) => {
    const date = addDays(today, i);
    const baseSales = 1000 + Math.random() * 500;
    
    // Add some weekly patterns - weekends higher
    const dayOfWeek = date.getDay();
    const weekendBoost = (dayOfWeek === 0 || dayOfWeek === 6) ? 1.3 : 1.0;
    
    // Add some randomness
    const randomFactor = 0.9 + Math.random() * 0.2;
    
    const forecasted = baseSales * weekendBoost * randomFactor;
    
    return {
      date: format(date, 'yyyy-MM-dd'),
      forecasted: Math.round(forecasted),
      lower: Math.round(forecasted * 0.85),
      upper: Math.round(forecasted * 1.15),
    };
  });
  
  // Monthly forecast for the next 6 months
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
      forecasted: Math.round(forecasted),
      lower: Math.round(forecasted * 0.9),
      upper: Math.round(forecasted * 1.1),
      orders: Math.round(forecasted / 85)
    };
  });
  
  return json({ 
    shop,
    dailyForecast,
    monthlyForecast,
    summary: {
      nextMonthRevenue: monthlyForecast[0].forecasted,
      nextMonthGrowth: 12, // percentage
      q4Total: monthlyForecast.slice(3, 6).reduce((sum, month) => sum + month.forecasted, 0),
      confidenceScore: 85 // percentage
    }
  });
}

export default function RevenueForecast() {
  const { dailyForecast, monthlyForecast, summary } = useLoaderData();
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
    return forecastPeriod === 'daily' ? dailyForecast : monthlyForecast;
  };
  
  // Prepare forecast table rows
  const getForecastTableRows = () => {
    const data = getForecastData();
    
    if (forecastPeriod === 'daily') {
      return data.map(day => [
        day.date,
        formatCurrency(day.forecasted),
        formatCurrency(day.lower),
        formatCurrency(day.upper),
      ]);
    } else {
      return data.map(month => [
        month.month,
        formatCurrency(month.forecasted),
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
  const renderForecastChart = () => {
    return (
      <Card>
        <BlockStack gap="400">
          <Text variant="headingMd" as="h3">
            Revenue Forecast Visualization
          </Text>
          
          <div style={{ height: '300px', position: 'relative' }}>
            <canvas id="forecastChart" width="100%" height="100%" style={{ width: '100%', height: '100%' }}></canvas>
            
            {/* Fallback message for real chart (would be drawn with useEffect + canvas/recharts in a real implementation) */}
            <Box style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Text variant="bodyMd" tone="subdued">
                [Revenue Forecast Chart - Would display a line chart with forecast and confidence intervals]
              </Text>
            </Box>
          </div>
        </BlockStack>
      </Card>
    );
  };
  
  // Render forecast tab
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
                    <Icon source={QuestionIcon} color="subdued" />
                  </Tooltip>
                </InlineStack>
                <Text variant="bodyMd" fontWeight="semibold">+8%</Text>
              </InlineStack>
              
              <InlineStack align="space-between">
                <InlineStack gap="200">
                  <Text variant="bodyMd">Seasonal trends</Text>
                  <Tooltip content="Based on your industry's seasonal patterns">
                    <Icon source={QuestionIcon} color="subdued" />
                  </Tooltip>
                </InlineStack>
                <Text variant="bodyMd" fontWeight="semibold">Q4 boost expected</Text>
              </InlineStack>
              
              <InlineStack align="space-between">
                <InlineStack gap="200">
                  <Text variant="bodyMd">Customer retention rate</Text>
                  <Tooltip content="Percentage of customers who make repeat purchases">
                    <Icon source={QuestionIcon} color="subdued" />
                  </Tooltip>
                </InlineStack>
                <Text variant="bodyMd" fontWeight="semibold">42%</Text>
              </InlineStack>
              
              <InlineStack align="space-between">
                <InlineStack gap="200">
                  <Text variant="bodyMd">Average order frequency</Text>
                  <Tooltip content="How often customers make repeat purchases">
                    <Icon source={QuestionIcon} color="subdued" />
                  </Tooltip>
                </InlineStack>
                <Text variant="bodyMd" fontWeight="semibold">68 days</Text>
              </InlineStack>
              
              <InlineStack align="space-between">
                <InlineStack gap="200">
                  <Text variant="bodyMd">Market trend adjustment</Text>
                  <Tooltip content="Based on industry benchmarks and trends">
                    <Icon source={QuestionIcon} color="subdued" />
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
  const renderScenariosTab = () => {
    return (
      <BlockStack gap="500">
        <Card>
          <BlockStack gap="400">
            <Text variant="headingMd" as="h3">
              Alternative Forecast Scenarios
            </Text>
            
            <Banner tone="info">
              <p>Forecast scenarios help you plan for different possible outcomes based on market conditions and business decisions.</p>
            </Banner>
            
            <DataTable
              columnContentTypes={['text', 'text', 'numeric', 'text']}
              headings={['Scenario', 'Description', 'Q4 Forecast', 'Actions']}
              rows={[
                [
                  <Text key="base" variant="bodyMd" fontWeight="bold">Base Case</Text>,
                  'Current forecast based on historical data',
                  formatCurrency(summary.q4Total),
                  <Button key="base-view" plain>View Details</Button>
                ],
                [
                  <Text key="optimistic" variant="bodyMd">Optimistic</Text>,
                  'Assumes 15% higher growth than baseline',
                  formatCurrency(summary.q4Total * 1.15),
                  <Button key="opt-view" plain>View Details</Button>
                ],
                [
                  <Text key="conservative" variant="bodyMd">Conservative</Text>,
                  'Assumes 10% lower growth than baseline',
                  formatCurrency(summary.q4Total * 0.9),
                  <Button key="cons-view" plain>View Details</Button>
                ],
                [
                  <Text key="marketing" variant="bodyMd">Marketing Push</Text>,
                  'Includes planned Q4 marketing campaign',
                  formatCurrency(summary.q4Total * 1.25),
                  <Button key="mkt-view" plain>View Details</Button>
                ]
              ]}
            />
          </BlockStack>
        </Card>
        
        <Card>
          <BlockStack gap="400">
            <Text variant="headingMd" as="h3">
              Forecast Scenario Comparison
            </Text>
            
            <div style={{ height: '300px', position: 'relative' }}>
              <canvas id="scenariosChart" width="100%" height="100%" style={{ width: '100%', height: '100%' }}></canvas>
              
              {/* Fallback message for real chart */}
              <Box style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Text variant="bodyMd" tone="subdued">
                  [Scenario Comparison Chart - Would display multiple forecast lines for different scenarios]
                </Text>
              </Box>
            </div>
            
            <Box paddingBlockStart="300">
              <Button>Create Custom Scenario</Button>
            </Box>
          </BlockStack>
        </Card>
      </BlockStack>
    );
  };
  
  return (
    <Page
      title="Revenue Forecast"
      backAction={{ content: 'Back', icon: ArrowLeftIcon, onAction: () => navigate('/app') }}
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
