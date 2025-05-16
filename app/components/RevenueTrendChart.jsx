import React, { useEffect, useRef, useState } from 'react';
import { 
  Card, 
  BlockStack, 
  Text, 
  ChoiceList, 
  Box, 
  InlineStack,
  Button
} from "@shopify/polaris";
import ErrorBoundary from "./ErrorBoundary";

function RevenueTrendChartContent({ 
  data,
  comparisonData, // New prop
  comparisonEnabled, // New prop (controls visibility)
  onToggleComparison, // New prop
  title = "Revenue Trend", 
  currencyCode = "USD",
  showControls = true
}) {
  const chartRef = useRef(null);
  const [periodType, setPeriodType] = useState('daily');
  // Removed internal comparisonEnabled state, now controlled by prop
  
  // Process data based on period type (for a single dataset)
  const processSingleDataSet = (dataSet) => {
    if (!dataSet || dataSet.length === 0) return [];
    
    if (periodType === 'daily') {
      return dataSet;
    } else if (periodType === 'weekly') {
      const weeklyData = {};
      dataSet.forEach(day => {
        const date = new Date(day.date);
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        const weekKey = weekStart.toISOString().split('T')[0];
        if (!weeklyData[weekKey]) {
          weeklyData[weekKey] = { date: weekKey, revenue: 0, days: 0 };
        }
        weeklyData[weekKey].revenue += day.revenue;
        weeklyData[weekKey].days += 1;
      });
      return Object.values(weeklyData).map(week => ({
        date: week.date, revenue: week.revenue, tooltip: `Week of ${week.date} (${week.days} days)`
      }));
    } else if (periodType === 'monthly') {
      const monthlyData = {};
      dataSet.forEach(day => {
        const monthKey = day.date.substring(0, 7);
        if (!monthlyData[monthKey]) {
          monthlyData[monthKey] = { date: monthKey, revenue: 0, days: 0 };
        }
        monthlyData[monthKey].revenue += day.revenue;
        monthlyData[monthKey].days += 1;
      });
      return Object.values(monthlyData).map(month => ({
        date: month.date, revenue: month.revenue, tooltip: `${month.date} (${month.days} days)`
      }));
    }
    return dataSet;
  };
  
  // Format currency
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode
    }).format(value);
  };
  
  useEffect(() => {
    const mainProcessedData = processSingleDataSet(data);
    let comparisonProcessedData = [];
    if (comparisonEnabled && comparisonData) {
      comparisonProcessedData = processSingleDataSet(comparisonData);
    }

    if (!chartRef.current) return; 

    const canvas = chartRef.current;
    const ctx = canvas.getContext('2d');

    // Set canvas drawing surface size based on its display size
    // This helps prevent blurry rendering if CSS size and canvas resolution differ.
    const displayWidth = canvas.offsetWidth;
    const displayHeight = canvas.offsetHeight; // Use the actual height of the canvas element

    if (displayWidth === 0 || displayHeight === 0) {
      // If canvas has no size, don't attempt to draw
      return;
    }

    canvas.width = displayWidth;
    canvas.height = displayHeight;
    
    // Clear canvas
    ctx.clearRect(0, 0, displayWidth, displayHeight);

    if ((!mainProcessedData || mainProcessedData.length === 0) && (!comparisonEnabled || !comparisonProcessedData || comparisonProcessedData.length === 0)) {
      ctx.fillStyle = '#637381';
      ctx.font = '14px Arial';
      ctx.textAlign = 'center';
      ctx.fillText("No data for selected period(s)", displayWidth / 2, displayHeight / 2);
      return;
    }
    
    let allRevenues = mainProcessedData.map(d => typeof d.revenue === 'number' ? d.revenue : 0);
    if (comparisonEnabled && comparisonProcessedData.length > 0) {
      allRevenues = allRevenues.concat(comparisonProcessedData.map(d => typeof d.revenue === 'number' ? d.revenue : 0));
    }

    const maxRevenue = allRevenues.length > 0 ? Math.max(...allRevenues) : 0;
    const minRevenue = allRevenues.length > 0 ? Math.min(...allRevenues) : 0;
    const revenueDiff = maxRevenue - minRevenue || 1;
    
    const padding = 30;
    const chartWidth = displayWidth - padding * 2;
    const chartHeight = displayHeight - padding * 2;
    
    // Draw axes (common for both lines)
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, displayHeight - padding);
    ctx.lineTo(displayWidth - padding, displayHeight - padding);
    ctx.stroke();
    
    ctx.fillStyle = '#637381';
    ctx.font = '10px Arial';
    ctx.textAlign = 'right';
    const numYLabels = 5;
    for (let i = 0; i <= numYLabels; i++) {
      const yPos = padding + (i / numYLabels) * chartHeight;
      const value = maxRevenue - (i / numYLabels) * revenueDiff;
      ctx.fillText(formatCurrency(value).replace('.00', ''), padding - 5, yPos + 3);
    }
    
    // X-axis labels (based on main data, assuming comparison data aligns or is shorter)
    ctx.textAlign = 'center';
    const numMainDataPoints = mainProcessedData.length;
    const mainDivisor = numMainDataPoints > 1 ? numMainDataPoints - 1 : 1;
    const mainLabelInterval = Math.max(1, Math.ceil(numMainDataPoints / (chartWidth / 60))); // Wider spacing for labels

    mainProcessedData.forEach((point, index) => {
      if (index % mainLabelInterval === 0 || numMainDataPoints <= 10) {
        const x = padding + (numMainDataPoints === 1 ? chartWidth / 2 : (index / mainDivisor) * chartWidth);
        const labelText = periodType === 'monthly' ? point.date.substring(5)
                        : periodType === 'weekly' ? `W${Math.floor(index / 7) + 1}`
                        : point.date.substring(5);
        ctx.fillText(labelText, x, displayHeight - padding + 15);
      }
    });

    // Function to draw a single line series
    const drawLineSeries = (dataSet, color, fillStyle) => {
      if (!dataSet || dataSet.length === 0) return;

      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      
      const numPoints = dataSet.length;
      const divisor = numPoints > 1 ? numPoints - 1 : 1;

      dataSet.forEach((point, index) => {
        const x = padding + (numPoints === 1 ? chartWidth / 2 : (index / divisor) * chartWidth);
        let y;
        if (revenueDiff === 0) {
          y = padding + (chartHeight / 2);
        } else {
          const revenueVal = typeof point.revenue === 'number' ? point.revenue : 0;
          y = padding + (1 - (revenueVal - minRevenue) / revenueDiff) * chartHeight;
        }
        
        if (index === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
        
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.stroke(); // Stroke the path for the line

      // Fill area under the line
      if (numPoints > 1 && fillStyle) {
        // Need to complete the path for filling
        const lastX = padding + ( (numPoints -1) / divisor) * chartWidth;
        ctx.lineTo(lastX, displayHeight - padding); // Line to bottom-right of data
        ctx.lineTo(padding, displayHeight - padding); // Line to bottom-left of chart
        const firstX = padding + (0 / divisor) * chartWidth;
        // ctx.lineTo(firstX, displayHeight - padding); // This was an error, should go to start of line's y on x-axis
        ctx.closePath();
        ctx.fillStyle = fillStyle;
        ctx.fill();
      }
    };

    // Draw main data series
    drawLineSeries(mainProcessedData, '#2c6ecb', 'rgba(44, 110, 203, 0.1)');

    // Draw comparison data series if enabled
    if (comparisonEnabled && comparisonProcessedData.length > 0) {
      drawLineSeries(comparisonProcessedData, '#ff7043', 'rgba(255, 112, 67, 0.1)'); // Orange color for comparison
    }
    
  }, [data, comparisonData, periodType, comparisonEnabled, currencyCode]);
  

  return (
    <BlockStack gap="400">
      {title && (
        <Text variant="headingMd" as="h2">{title}</Text>
      )}
      
      {showControls && (
        <InlineStack align="space-between" gap="200">
          <ChoiceList
            title="View"
            titleHidden
            choices={[
              {label: 'Daily', value: 'daily'},
              {label: 'Weekly', value: 'weekly'},
              {label: 'Monthly', value: 'monthly'}
            ]}
            selected={[periodType]}
            onChange={value => setPeriodType(value[0])}
            horizontal
          />
          
          {/* Use the onToggleComparison prop from AnalyticsDashboard */}
          <Button 
            plain 
            monochrome 
            onClick={onToggleComparison} 
          >
            {comparisonEnabled ? 'Hide Comparison' : 'Compare Periods'}
          </Button>
        </InlineStack>
      )}
      
      <div style={{ width: '100%', height: '250px', position: 'relative' }}>
        <canvas 
          ref={chartRef} 
          style={{ width: '100%', height: '100%' }} // Canvas display size fills the div
        />
      </div>
      
      <InlineStack distribute="center" align="center">
        <Text variant="bodySm" tone="subdued">
          {periodType === 'daily' 
            ? 'Daily revenue' 
            : periodType === 'weekly' 
            ? 'Weekly revenue' 
            : 'Monthly revenue'}
        </Text>
      </InlineStack>
    </BlockStack>
  );
}

export function RevenueTrendChart(props) {
  return (
    <ErrorBoundary componentName="Revenue Trend Chart">
      <RevenueTrendChartContent {...props} />
    </ErrorBoundary>
  );
}
