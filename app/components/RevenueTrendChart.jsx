import { useState, useEffect } from 'react';
import { Card, ButtonGroup, Button, Select, DatePicker, InlineStack, Tabs } from '@shopify/polaris';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export function RevenueTrendChart({ data = [], title = "Revenue Trend" }) {
  const [selectedTab, setSelectedTab] = useState(0);
  const [dateRange, setDateRange] = useState('30d');
  const [chartData, setChartData] = useState(data);
  const [compareEnabled, setCompareEnabled] = useState(false);
  const [selectedDate, setSelectedDate] = useState({
    start: new Date(new Date().setDate(new Date().getDate() - 30)),
    end: new Date(),
  });
  
  // Function to format dates for the X axis
  const formatXAxis = (tickItem) => {
    const date = new Date(tickItem);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };
  
  // Handle tab changes (Daily, Weekly, Monthly)
  const handleTabChange = (selectedTabIndex) => {
    setSelectedTab(selectedTabIndex);
    
    // Recalculate data based on new aggregation
    if (selectedTabIndex === 0) { // Daily
      setChartData(data);
    } else if (selectedTabIndex === 1) { // Weekly
      // Aggregate data by week
      const weeklyData = aggregateDataByPeriod(data, 'week');
      setChartData(weeklyData);
    } else if (selectedTabIndex === 2) { // Monthly
      // Aggregate data by month
      const monthlyData = aggregateDataByPeriod(data, 'month');
      setChartData(monthlyData);
    }
  };
  
  // Function to aggregate data by period (week, month)
  const aggregateDataByPeriod = (rawData, period) => {
    // Implementation would depend on your data structure
    // This is a placeholder logic
    return rawData.filter((_, index) => index % (period === 'week' ? 7 : 30) === 0);
  };
  
  // Handle date range changes
  const handleDateRangeChange = (value) => {
    setDateRange(value);
    
    const end = new Date();
    let start = new Date();
    
    // Calculate start date based on selected range
    switch (value) {
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
        start = new Date(end.getFullYear(), 0, 1); // Jan 1 of current year
        break;
      case '1y':
        start.setFullYear(end.getFullYear() - 1);
        break;
      default:
        break;
    }
    
    setSelectedDate({ start, end });
    
    // Filter data based on new date range
    // This is a placeholder - update with your actual data filtering logic
    const filteredData = data.filter(item => {
      const itemDate = new Date(item.date);
      return itemDate >= start && itemDate <= end;
    });
    
    setChartData(filteredData);
  };
  
  // Custom tooltip for the chart
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const date = new Date(label);
      return (
        <div className="custom-tooltip" style={{ backgroundColor: 'white', padding: '10px', border: '1px solid #ccc' }}>
          <p><strong>{date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</strong></p>
          <p><span style={{ color: '#5C6AC4' }}>◼ </span>Revenue: ${payload[0].value.toFixed(2)}</p>
          {compareEnabled && <p><span style={{ color: '#47C1BF' }}>◼ </span>Previous period: ${payload[1]?.value.toFixed(2) || 0}</p>}
        </div>
      );
    }
    return null;
  };
  
  return (
    <Card title={title}>
      <Card.Section>
        <InlineStack align="space-between">
          <ButtonGroup segmented>
            <Button pressed={dateRange === '7d'} onClick={() => handleDateRangeChange('7d')}>7d</Button>
            <Button pressed={dateRange === '30d'} onClick={() => handleDateRangeChange('30d')}>30d</Button>
            <Button pressed={dateRange === '90d'} onClick={() => handleDateRangeChange('90d')}>90d</Button>
            <Button pressed={dateRange === 'ytd'} onClick={() => handleDateRangeChange('ytd')}>YTD</Button>
            <Button pressed={dateRange === '1y'} onClick={() => handleDateRangeChange('1y')}>1Y</Button>
          </ButtonGroup>
          
          <Button 
            onClick={() => setCompareEnabled(!compareEnabled)}
            pressed={compareEnabled}
          >
            Compare with previous period
          </Button>
        </InlineStack>
        
        <div style={{ marginTop: '1rem' }}>
          <Tabs
            tabs={[
              { id: 'daily', content: 'Daily' },
              { id: 'weekly', content: 'Weekly' },
              { id: 'monthly', content: 'Monthly' }
            ]}
            selected={selectedTab}
            onSelect={handleTabChange}
          />
        </div>
      </Card.Section>
      
      <Card.Section>
        <div style={{ width: '100%', height: 300 }}>
          <ResponsiveContainer>
            <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="date" 
                tickFormatter={formatXAxis}
                label={{ value: 'Date', position: 'insideBottomRight', offset: -5 }}
              />
              <YAxis 
                label={{ value: 'Revenue ($)', angle: -90, position: 'insideLeft' }}
                tickFormatter={(value) => `$${value}`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="revenue" 
                name="Revenue" 
                stroke="#5C6AC4" 
                activeDot={{ r: 8 }} 
                dot={{ r: 3 }}
                strokeWidth={2}
              />
              {compareEnabled && (
                <Line 
                  type="monotone" 
                  dataKey="previousRevenue" 
                  name="Previous Period" 
                  stroke="#47C1BF" 
                  strokeDasharray="5 5"
                  dot={{ r: 2 }}
                  strokeWidth={2}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card.Section>
    </Card>
  );
}
