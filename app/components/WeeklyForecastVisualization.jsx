import React, { useState, useEffect, useRef } from 'react';
import polarisPkg from "@shopify/polaris"; // Import the whole package once
import ErrorBoundary from "./ErrorBoundary"; // Group all import statements
import styles from '../styles/charts.module.css';

// Destructure after all import statements
const {
  Card,
  BlockStack,
  Text,
  Select,
  InlineStack,
  SegmentedControl,
  Box
} = polarisPkg;

function WeeklyForecastVisualizationContent({
  data,
  title = "Weekly Forecast",
  currencyCode = "USD"
}) {
  const chartRef = useRef(null);
  const [visualizationType, setVisualizationType] = useState('bar');
  const [metricType, setMetricType] = useState('revenue');
  
  // Format currency
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode
    }).format(value);
  };
  
  useEffect(() => {
    if (!data || data.length === 0 || !chartRef.current) return;
    
    const canvas = chartRef.current;
    const ctx = canvas.getContext('2d');
    const width = canvas.width = canvas.offsetWidth;
    const height = canvas.height = 300;
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    // Calculate data points based on selected metric
    const dataPoints = data.map(item => {
      if (metricType === 'revenue') {
        return item.revenue;
      } else if (metricType === 'orders') {
        return item.orders;
      } else if (metricType === 'aov') {
        return item.revenue / item.orders;
      }
      return item.revenue;
    });
    
    // Calculate min and max values
    const maxValue = Math.max(...dataPoints) * 1.1; // Add 10% headroom
    const minValue = 0; // Start from zero for better visualization
    
    // Chart dimensions
    const padding = 40;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;
    
    // Draw axes
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, height - padding);
    ctx.lineTo(width - padding, height - padding);
    ctx.stroke();
    
    // Draw y-axis labels
    ctx.fillStyle = '#637381';
    ctx.font = '10px Arial';
    ctx.textAlign = 'right';
    
    const numYLabels = 5;
    for (let i = 0; i <= numYLabels; i++) {
      const y = padding + (i / numYLabels) * chartHeight;
      const value = maxValue - (i / numYLabels) * (maxValue - minValue);
      
      let formattedValue;
      if (metricType === 'revenue') {
        formattedValue = formatCurrency(value).replace('.00', '');
      } else if (metricType === 'orders') {
        formattedValue = Math.round(value).toString();
      } else if (metricType === 'aov') {
        formattedValue = formatCurrency(value).replace('.00', '');
      }
      
      ctx.fillText(formattedValue, padding - 5, y + 3);
    }
    
    // Draw x-axis labels
    ctx.textAlign = 'center';
    const barWidth = chartWidth / data.length;
    
    data.forEach((item, index) => {
      const x = padding + (index + 0.5) * barWidth;
      let dateLabel;
      
      if (typeof item.date === 'string') {
        // For a date string like "2025-05-15"
        dateLabel = item.date.substring(5); // Just "05-15"
      } else if (typeof item.week === 'string') {
        dateLabel = `W${item.week}`;
      } else {
        dateLabel = `Week ${index + 1}`;
      }
      
      ctx.fillText(dateLabel, x, height - padding + 15);
    });
    
    // Draw data based on visualization type
    if (visualizationType === 'bar') {
      // Draw bars
      data.forEach((item, index) => {
        const value = dataPoints[index];
        const barHeight = (value / maxValue) * chartHeight;
        const x = padding + index * barWidth;
        const y = height - padding - barHeight;
        
        // Draw bar with gradient
        const gradient = ctx.createLinearGradient(x, y, x, height - padding);
        gradient.addColorStop(0, '#2c6ecb');
        gradient.addColorStop(1, '#2c6ecb55');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(x + 5, y, barWidth - 10, barHeight);
        
        // Draw confidence interval (upper and lower bounds)
        if (item.lower !== undefined && item.upper !== undefined) {
          const lowerY = height - padding - (item.lower / maxValue) * chartHeight;
          const upperY = height - padding - (item.upper / maxValue) * chartHeight;
          
          // Draw interval line
          ctx.strokeStyle = '#637381';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(x + barWidth / 2, upperY);
          ctx.lineTo(x + barWidth / 2, lowerY);
          ctx.stroke();
          
          // Draw end caps
          ctx.beginPath();
          ctx.moveTo(x + barWidth / 2 - 4, upperY);
          ctx.lineTo(x + barWidth / 2 + 4, upperY);
          ctx.stroke();
          
          ctx.beginPath();
          ctx.moveTo(x + barWidth / 2 - 4, lowerY);
          ctx.lineTo(x + barWidth / 2 + 4, lowerY);
          ctx.stroke();
        }
      });
    } else if (visualizationType === 'line') {
      // Draw line chart
      ctx.strokeStyle = '#2c6ecb';
      ctx.lineWidth = 2;
      ctx.beginPath();
      
      data.forEach((item, index) => {
        const value = dataPoints[index];
        const x = padding + (index + 0.5) * barWidth;
        const y = height - padding - (value / maxValue) * chartHeight;
        
        if (index === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
        
        // Draw points
        ctx.fillStyle = '#2c6ecb';
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fill();
      });
      
      ctx.stroke();
      
      // Draw area under the line
      ctx.beginPath();
      data.forEach((item, index) => {
        const value = dataPoints[index];
        const x = padding + (index + 0.5) * barWidth;
        const y = height - padding - (value / maxValue) * chartHeight;
        
        if (index === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });
      
      ctx.lineTo(padding + chartWidth, height - padding);
      ctx.lineTo(padding, height - padding);
      ctx.closePath();
      ctx.fillStyle = 'rgba(44, 110, 203, 0.1)';
      ctx.fill();
      
      // Draw confidence intervals for line chart
      data.forEach((item, index) => {
        if (item.lower !== undefined && item.upper !== undefined) {
          const x = padding + (index + 0.5) * barWidth;
          const lowerY = height - padding - (item.lower / maxValue) * chartHeight;
          const upperY = height - padding - (item.upper / maxValue) * chartHeight;
          
          // Draw vertical line for interval
          ctx.strokeStyle = 'rgba(99, 115, 129, 0.4)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(x, upperY);
          ctx.lineTo(x, lowerY);
          ctx.stroke();
          
          // Draw end caps
          ctx.beginPath();
          ctx.moveTo(x - 4, upperY);
          ctx.lineTo(x + 4, upperY);
          ctx.stroke();
          
          ctx.beginPath();
          ctx.moveTo(x - 4, lowerY);
          ctx.lineTo(x + 4, lowerY);
          ctx.stroke();
        }
      });
    }
    
    // Add interactive tooltips
    if (canvas.parentElement) {
      canvas.onmousemove = (e) => {
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        // Check if mouse is over any bar/point
        data.forEach((item, index) => {
          const barX = padding + index * barWidth;
          const value = dataPoints[index];
          const barHeight = (value / maxValue) * chartHeight;
          const barY = height - padding - barHeight;
          
          if (visualizationType === 'bar') {
            if (x >= barX && x <= barX + barWidth && y >= barY && y <= height - padding) {
              // Show tooltip
              showTooltip(e, item, dataPoints[index]);
              return;
            }
          } else if (visualizationType === 'line') {
            const pointX = padding + (index + 0.5) * barWidth;
            const pointY = height - padding - (value / maxValue) * chartHeight;
            
            // Check if mouse is near any point
            const distance = Math.sqrt(Math.pow(x - pointX, 2) + Math.pow(y - pointY, 2));
            if (distance <= 10) {
              // Show tooltip
              showTooltip(e, item, dataPoints[index]);
              return;
            }
          }
        });
      };
    }
    
    // Function to show tooltip
    function showTooltip(event, item, value) {
      // This would be implemented with a dedicated tooltip component
      // For simplicity, we're not implementing the full tooltip here
      // Replace console.log with analyticsLogger.debug
      // Note: We're not importing analyticsLogger here since this is client-side
      // In a real implementation, we would use a client-side logger
    }
    
  }, [data, visualizationType, metricType]);
  
  if (!data || data.length === 0) {
    return (
      <Card>
        <BlockStack gap="400">
          <Text variant="headingMd" as="h2">{title}</Text>
          <Box padding="500" align="center">
            <Text tone="subdued">No forecast data available</Text>
          </Box>
        </BlockStack>
      </Card>
    );
  }
  
  return (
    <Card>
      <BlockStack gap="400">
        <InlineStack align="space-between">
          <Text variant="headingMd" as="h2">{title}</Text>
          
          <InlineStack gap="200">
            <Select
              label="Metric"
              labelHidden
              options={[
                {label: 'Revenue', value: 'revenue'},
                {label: 'Orders', value: 'orders'},
                {label: 'Average Order Value', value: 'aov'}
              ]}
              value={metricType}
              onChange={setMetricType}
            />
            
            <SegmentedControl
              label="Visualization"
              labelHidden
              options={[
                {label: 'Bar', value: 'bar'},
                {label: 'Line', value: 'line'}
              ]}
              selected={visualizationType}
              onChange={setVisualizationType}
            />
          </InlineStack>
        </InlineStack>
        
        <div className={styles.tallChartContainer}>
          <canvas
            ref={chartRef}
            className={styles.canvasElement}
          />
        </div>
      </BlockStack>
    </Card>
  );
}

export function WeeklyForecastVisualization(props) {
  return (
    <ErrorBoundary componentName="Weekly Forecast Visualization">
      <WeeklyForecastVisualizationContent {...props} />
    </ErrorBoundary>
  );
}
