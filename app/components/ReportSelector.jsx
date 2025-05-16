import React, { useState } from 'react';
import { 
  Card, 
  BlockStack, 
  InlineStack, 
  Text, 
  Select, 
  Checkbox, 
  Box,
  Button
} from "@shopify/polaris";
import { DateSelector } from './DateSelector';
import ErrorBoundary from "./ErrorBoundary";

function ReportSelectorContent({
  title = "Configure Report",
  onConfigChange,
  initialConfig = {}
}) {
  const [reportType, setReportType] = useState(initialConfig.reportType || 'summary');
  const [selectedMetrics, setSelectedMetrics] = useState(initialConfig.metrics || {
    revenue: true,
    orders: true,
    customers: true,
    products: true,
    segments: false
  });
  
  const [dateRange, setDateRange] = useState({
    start: initialConfig.startDate || new Date(new Date().setDate(new Date().getDate() - 30)),
    end: initialConfig.endDate || new Date()
  });
  
  const handleReportTypeChange = (value) => {
    setReportType(value);
    
    if (onConfigChange) {
      onConfigChange({
        reportType: value,
        metrics: selectedMetrics,
        startDate: dateRange.start,
        endDate: dateRange.end
      });
    }
  };
  
  const handleMetricToggle = (metric) => {
    const updatedMetrics = {
      ...selectedMetrics,
      [metric]: !selectedMetrics[metric]
    };
    
    setSelectedMetrics(updatedMetrics);
    
    if (onConfigChange) {
      onConfigChange({
        reportType,
        metrics: updatedMetrics,
        startDate: dateRange.start,
        endDate: dateRange.end
      });
    }
  };
  
  const handleDateChange = (dates) => {
    setDateRange(dates);
    
    if (onConfigChange) {
      onConfigChange({
        reportType,
        metrics: selectedMetrics,
        startDate: dates.start,
        endDate: dates.end
      });
    }
  };
  
  return (
    <Card>
      <BlockStack gap="500">
        <Text variant="headingMd" as="h2">{title}</Text>
        
        <BlockStack gap="300">
          <Select
            label="Report Type"
            options={[
              { label: 'Summary Report', value: 'summary' },
              { label: 'Detailed Analytics', value: 'detailed' },
              { label: 'Customer Segments', value: 'segments' },
              { label: 'Product Performance', value: 'products' }
            ]}
            value={reportType}
            onChange={handleReportTypeChange}
          />
          
          <DateSelector
            title="Date Range"
            onDateChange={handleDateChange}
            initialStartDate={dateRange.start}
            initialEndDate={dateRange.end}
          />
          
          <Box paddingBlockStart="300">
            <Text variant="headingSm">Metrics to Include</Text>
            <BlockStack gap="200" paddingBlockStart="200">
              <Checkbox
                label="Revenue & Sales"
                checked={selectedMetrics.revenue}
                onChange={() => handleMetricToggle('revenue')}
              />
              <Checkbox
                label="Order Analytics"
                checked={selectedMetrics.orders}
                onChange={() => handleMetricToggle('orders')}
              />
              <Checkbox
                label="Customer Data"
                checked={selectedMetrics.customers}
                onChange={() => handleMetricToggle('customers')}
              />
              <Checkbox
                label="Product Performance"
                checked={selectedMetrics.products}
                onChange={() => handleMetricToggle('products')}
              />
              <Checkbox
                label="Customer Segments"
                checked={selectedMetrics.segments}
                onChange={() => handleMetricToggle('segments')}
              />
            </BlockStack>
          </Box>
        </BlockStack>
        
        <InlineStack align="end">
          <Button primary>Generate Report</Button>
        </InlineStack>
      </BlockStack>
    </Card>
  );
}

export function ReportSelector(props) {
  return (
    <ErrorBoundary componentName="Report Selector">
      <ReportSelectorContent {...props} />
    </ErrorBoundary>
  );
}
