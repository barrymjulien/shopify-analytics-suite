import { useEffect, useRef } from 'react';
import { Text } from "@shopify/polaris";
import ErrorBoundary from "./ErrorBoundary";

function RevenueChartContent({ data }) {
  const chartRef = useRef(null);
  
  useEffect(() => {
    if (!data || data.length === 0) return;
    
    // Simple canvas chart (you can replace with Chart.js later)
    const canvas = chartRef.current;
    const ctx = canvas.getContext('2d');
    const width = canvas.width = canvas.offsetWidth;
    const height = canvas.height = 200;
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    // Find min/max values with safety checks
    const revenues = data.map(d => typeof d.revenue === 'number' ? d.revenue : 0);
    const maxRevenue = revenues.length > 0 ? Math.max(...revenues) : 0;
    const minRevenue = revenues.length > 0 ? Math.min(...revenues) : 0;
    
    // Prevent division by zero if all values are the same
    const revenueDiff = maxRevenue - minRevenue;
    
    // Draw chart
    const padding = 20;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;
    
    ctx.strokeStyle = '#2c6ecb';
    ctx.lineWidth = 2;
    ctx.beginPath();
    
    data.forEach((point, index) => {
      const x = padding + (index / (data.length - 1)) * chartWidth;
      // Safely calculate y-position with fallbacks
      let y;
      if (revenueDiff === 0) {
        // If all values are the same, draw a straight line in the middle
        y = padding + (chartHeight / 2);
      } else {
        const revenue = typeof point.revenue === 'number' ? point.revenue : 0;
        y = padding + (1 - (revenue - minRevenue) / revenueDiff) * chartHeight;
      }
      
      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
      
      // Draw point
      ctx.fillStyle = '#2c6ecb';
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fill();
    });
    
    ctx.stroke();
    
    // Draw axes
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, height - padding);
    ctx.lineTo(width - padding, height - padding);
    ctx.stroke();
    
  }, [data]);
  
  if (!data || data.length === 0) {
    return (
      <div style={{ height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Text tone="subdued">No data available</Text>
      </div>
    );
  }
  
  return (
    <div style={{ width: '100%', height: '200px' }}>
      <canvas 
        ref={chartRef} 
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  );
}

export function RevenueChart(props) {
  return (
    <ErrorBoundary componentName="Revenue Chart">
      <RevenueChartContent {...props} />
    </ErrorBoundary>
  );
}
