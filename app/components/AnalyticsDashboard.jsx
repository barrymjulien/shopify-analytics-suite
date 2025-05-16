import { useState, useEffect } from 'react';
import { 
  Page, 
  Layout, 
  Card, 
  Grid, 
  DatePicker, 
  Button, 
  ButtonGroup, 
  Text, 
  Stack,
  SkeletonBodyText,
  SkeletonDisplayText
} from '@shopify/polaris';
import { MetricCard } from './MetricCard';
import { RevenueTrendChart } from './RevenueTrendChart';
import { CustomerSegments } from './CustomerSegments';
import { ProductMatrix } from './ProductMatrix';
import { ExportOptions } from './ExportOptions';

export function AnalyticsDashboard() {
  const [metrics, setMetrics] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedDateRange, setSelectedDateRange] = useState({
    start: new Date(new Date().setDate(new Date().getDate() - 30)),
    end: new Date(),
  });
  const [selectedFilter, setSelectedFilter] = useState('30d');
  const [comparisonEnabled, setComparisonEnabled] = useState(false);
  const [comparisonDateRange, setComparisonDateRange] = useState(null);
  
  useEffect(() => {
    fetchAnalytics();
  }, [selectedDateRange, comparisonEnabled]); // Add comparisonEnabled to dependencies

  const calculatePreviousPeriod = (currentStart, currentEnd) => {
    const diff = currentEnd.getTime() - currentStart.getTime();
    const prevEnd = new Date(currentStart.getTime() - 1); // One day before current start
    const prevStart = new Date(prevEnd.getTime() - diff);
    return { start: prevStart, end: prevEnd };
  };
  
  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const startDate = selectedDateRange.start.toISOString().split('T')[0];
      const endDate = selectedDateRange.end.toISOString().split('T')[0];
      
      const apiCalls = [
        fetch(`/api/analytics/kpis?start=${startDate}&end=${endDate}`).then(r => r.json()),
        fetch(`/api/analytics/forecast?start=${startDate}&end=${endDate}`).then(r => r.json()), // Main period forecast
        fetch(`/api/analytics/segments`).then(r => r.json()),
        fetch(`/api/analytics/products?start=${startDate}&end=${endDate}`).then(r => r.json())
      ];

      let comparisonForecastData = null;
      if (comparisonEnabled) {
        const prevPeriod = calculatePreviousPeriod(selectedDateRange.start, selectedDateRange.end);
        setComparisonDateRange(prevPeriod); // Store for potential display
        const prevStartDate = prevPeriod.start.toISOString().split('T')[0];
        const prevEndDate = prevPeriod.end.toISOString().split('T')[0];
        apiCalls.push(
          fetch(`/api/analytics/forecast?start=${prevStartDate}&end=${prevEndDate}`).then(r => r.json())
        );
      }
      
      const data = await Promise.all(apiCalls);
      
      if (comparisonEnabled && data.length > 4) {
        comparisonForecastData = data[4];
      }

      setMetrics({
        kpis: data[0],
        forecast: data[1], // This is the main period data { dailyRevenue: [...] }
        segments: data[2],
        products: data[3],
        comparisonForecast: comparisonForecastData // { dailyRevenue: [...] } for comparison
      });
    } catch (error) {
      console.error('Error fetching analytics data:', error);
      setMetrics(prev => ({ ...prev, forecast: { dailyRevenue: [] }, comparisonForecast: null })); // Clear data on error
    } finally {
      setLoading(false);
    }
  };
  
  // Handle quick filter changes (7d, 30d, etc.)
  const handleFilterChange = (filter) => {
    setSelectedFilter(filter);
    
    const end = new Date();
    let start = new Date();
    
    switch (filter) {
      case '7d':
        start.setDate(end.getDate() - 7);
        break;
      case '30d':
        start.setDate(end.getDate() - 30);
        break;
      case '90d':
        start.setDate(end.getDate() - 90);
        break;
      case 'ytd':
        start = new Date(end.getFullYear(), 0, 1);
        break;
      case '1y':
        start.setFullYear(end.getFullYear() - 1);
        break;
      default:
        break;
    }
    
    setSelectedDateRange({ start, end });
  };
  
  // Create skeleton loaders
  const renderSkeletonCard = () => (
    <Card sectioned>
      <SkeletonDisplayText size="small" />
      <div style={{ paddingTop: '12px' }}>
        <SkeletonBodyText lines={3} />
      </div>
    </Card>
  );
  
  return (
    <Page 
      title="Analytics Dashboard"
      subtitle="Track your store's performance metrics and customer insights"
      primaryAction={
        <ExportOptions 
          data={metrics.kpis?.data || []} 
          title="Analytics Report"
          filename="analytics-report"
        />
      }
    >
      <div style={{ marginBottom: '1rem' }}>
        <Stack distribution="equalSpacing" alignment="center">
          <ButtonGroup segmented>
            <Button pressed={selectedFilter === '7d'} onClick={() => handleFilterChange('7d')}>Last 7 days</Button>
            <Button pressed={selectedFilter === '30d'} onClick={() => handleFilterChange('30d')}>Last 30 days</Button>
            <Button pressed={selectedFilter === '90d'} onClick={() => handleFilterChange('90d')}>Last 90 days</Button>
            <Button pressed={selectedFilter === 'ytd'} onClick={() => handleFilterChange('ytd')}>Year to date</Button>
            <Button pressed={selectedFilter === '1y'} onClick={() => handleFilterChange('1y')}>Last year</Button>
          </ButtonGroup>
          
          <Stack>
            <Text>Custom range:</Text>
            <DatePicker
              month={selectedDateRange.start.getMonth()}
              year={selectedDateRange.start.getFullYear()}
              selected={{
                start: selectedDateRange.start,
                end: selectedDateRange.end,
              }}
              onChange={({ start, end }) => {
                setSelectedDateRange({ start, end });
                setSelectedFilter('custom');
              }}
              allowRange
            />
          </Stack>
        </Stack>
      </div>
      
      <Grid>
        <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3, lg: 3, xl: 3 }}>
          {loading ? renderSkeletonCard() : (
            <MetricCard 
              title="Total Revenue" 
              value={metrics.kpis?.revenue || 0} 
              trend={metrics.kpis?.revenueTrend || 0}
              format="currency"
            />
          )}
        </Grid.Cell>
        
        <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3, lg: 3, xl: 3 }}>
          {loading ? renderSkeletonCard() : (
            <MetricCard 
              title="Average Order Value" 
              value={metrics.kpis?.aov || 0} 
              trend={metrics.kpis?.aovTrend || 0}
              format="currency"
            />
          )}
        </Grid.Cell>
        
        <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3, lg: 3, xl: 3 }}>
          {loading ? renderSkeletonCard() : (
            <MetricCard 
              title="Orders" 
              value={metrics.kpis?.orders || 0} 
              trend={metrics.kpis?.ordersTrend || 0}
              format="number"
            />
          )}
        </Grid.Cell>
        
        <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3, lg: 3, xl: 3 }}>
          {loading ? renderSkeletonCard() : (
            <MetricCard 
              title="Conversion Rate" 
              value={metrics.kpis?.conversionRate || 0} 
              trend={metrics.kpis?.conversionRateTrend || 0}
              format="percentage"
            />
          )}
        </Grid.Cell>
        
        <Grid.Cell columnSpan={{ xs: 12, sm: 12, md: 12, lg: 12, xl: 12 }}>
          {loading ? renderSkeletonCard() : (
            <RevenueTrendChart 
              data={metrics.forecast?.dailyRevenue || []} 
              comparisonData={metrics.comparisonForecast?.dailyRevenue || null}
              comparisonEnabled={comparisonEnabled}
              onToggleComparison={() => setComparisonEnabled(!comparisonEnabled)} // Pass toggle handler
            />
          )}
        </Grid.Cell>
        
        <Grid.Cell columnSpan={{ xs: 12, sm: 12, md: 6, lg: 6, xl: 6 }}>
          {loading ? renderSkeletonCard() : (
            <CustomerSegments data={metrics.segments?.data || []} />
          )}
        </Grid.Cell>
        
        <Grid.Cell columnSpan={{ xs: 12, sm: 12, md: 6, lg: 6, xl: 6 }}>
          {loading ? renderSkeletonCard() : (
            <ProductMatrix products={metrics.products?.data || []} />
          )}
        </Grid.Cell>
      </Grid>
    </Page>
  );
}
