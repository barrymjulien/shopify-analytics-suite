import { useState } from "react";
import { json } from "@remix-run/node";
import { useLoaderData, useNavigate } from "@remix-run/react";
import {
  Page,
  Card,
  BlockStack,
  InlineStack,
  Button,
  Text,
  Box,
  Checkbox,
  DatePicker,
  Select,
  Banner,
  Divider,
  Modal,
  Frame
} from "@shopify/polaris";
import { authenticate } from "../../shopify.server";
import { ArrowLeftIcon } from '../lib/icons';
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns';

export async function loader({ request }) {
  const { admin, session } = await authenticate.admin(request);
  const { shop } = session;
  
  // Get some basic stats to populate the preview
  const today = new Date();
  const thirtyDaysAgo = subDays(today, 30);
  
  // Sample data for preview
  const previewData = {
    dateRange: `${format(thirtyDaysAgo, 'MMM d, yyyy')} - ${format(today, 'MMM d, yyyy')}`,
    metrics: [
      { name: "Total Revenue", value: "$42,680.75" },
      { name: "Order Count", value: "500" },
      { name: "Average Order Value", value: "$85.36" },
      { name: "Conversion Rate", value: "3.2%" }
    ]
  };
  
  return json({ shop, previewData });
}

export default function ExportAnalyticsReport() {
  const { previewData } = useLoaderData();
  const navigate = useNavigate();
  
  // Date selection state
  const [{ month, year }, setDate] = useState({ month: new Date().getMonth(), year: new Date().getFullYear() });
  const [selectedDates, setSelectedDates] = useState({
    start: new Date(new Date().setDate(new Date().getDate() - 30)),
    end: new Date(),
  });
  
  // Report options
  const [reportType, setReportType] = useState('summary');
  const [fileFormat, setFileFormat] = useState('csv');
  const [selectedMetrics, setSelectedMetrics] = useState({
    revenue: true,
    orders: true,
    customers: true,
    products: true,
    segments: true
  });
  
  // Generate report modal
  const [showModal, setShowModal] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState(null);
  
  const reportTypes = [
    { label: 'Summary Report', value: 'summary' },
    { label: 'Detailed Analytics', value: 'detailed' },
    { label: 'Customer Segments', value: 'segments' },
    { label: 'Product Performance', value: 'products' },
  ];
  
  const fileFormats = [
    { label: 'CSV', value: 'csv' },
    { label: 'Excel', value: 'xlsx' },
    { label: 'PDF', value: 'pdf' },
  ];
  
  const handleMetricToggle = (metric) => {
    setSelectedMetrics({
      ...selectedMetrics,
      [metric]: !selectedMetrics[metric]
    });
  };
  
  const handleMonthChange = (month, year) => {
    setDate({ month, year });
  };
  
  const handleGenerateReport = () => {
    setShowModal(true);
    setGenerating(true);
    
    // Simulate report generation
    setTimeout(() => {
      setGenerating(false);
      
      // Create downloadable content (this would normally be from your backend)
      const reportData = `Date,Order ID,Revenue,Customer\n` +
        `2025-04-15,#1001,249.99,john.doe@example.com\n` +
        `2025-04-16,#1002,129.50,jane.smith@example.com\n` +
        `2025-04-17,#1003,349.75,robert.jones@example.com\n`;
      
      // Create a blob and download URL
      const blob = new Blob([reportData], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      setDownloadUrl(url);
    }, 2000);
  };
  
  const handleDownload = () => {
    // Create an anchor element and trigger download
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = `analytics-report-${format(selectedDates.start, 'yyyy-MM-dd')}-to-${format(selectedDates.end, 'yyyy-MM-dd')}.${fileFormat}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    // Close modal and navigate back to dashboard
    setShowModal(false);
    // Optional: navigate back to dashboard after download
    // navigate('/app');
  };
  
  return (
    <Page
      title="Export Analytics Report"
      backAction={{ content: 'Back', icon: ArrowLeftIcon, onAction: () => navigate('/app') }}
    >
      <BlockStack gap="500">
        <Card>
          <BlockStack gap="400">
            <Text variant="headingMd" as="h2">
              Report Options
            </Text>
            
            <BlockStack gap="300">
              <Select
                label="Report Type"
                options={reportTypes}
                value={reportType}
                onChange={setReportType}
                helpText="Select the type of report you want to generate"
              />
              
              <Box paddingBlockStart="300">
                <Text variant="headingSm">Date Range</Text>
                <DatePicker
                  month={month}
                  year={year}
                  onChange={setSelectedDates}
                  onMonthChange={handleMonthChange}
                  selected={selectedDates}
                  allowRange
                />
              </Box>
              
              <Box paddingBlockStart="300">
                <Text variant="headingSm">Include Metrics</Text>
                <BlockStack gap="200">
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
              
              <Select
                label="File Format"
                options={fileFormats}
                value={fileFormat}
                onChange={setFileFormat}
              />
            </BlockStack>
          </BlockStack>
        </Card>
        
        <Card>
          <BlockStack gap="400">
            <Text variant="headingMd" as="h2">
              Report Preview
            </Text>
            
            <Banner tone="info">
              <p>This report will include data from {format(selectedDates.start, 'MMM d, yyyy')} to {format(selectedDates.end, 'MMM d, yyyy')}</p>
            </Banner>
            
            <Divider />
            
            <Box padding="400" background="bg-surface-secondary">
              <BlockStack gap="300">
                <Text variant="headingSm">Report will include:</Text>
                <BlockStack gap="200">
                  {Object.entries(selectedMetrics).map(([key, value]) => {
                    if (!value) return null;
                    return (
                      <Box key={key} paddingBlockStart="100" paddingBlockEnd="100">
                        <Text variant="bodyMd">✓ {key.charAt(0).toUpperCase() + key.slice(1)} Analytics</Text>
                      </Box>
                    );
                  })}
                </BlockStack>
                
                <Divider />
                
                <Text variant="headingSm">Sample Metrics</Text>
                <BlockStack gap="200">
                  {previewData.metrics.map((metric, index) => (
                    <InlineStack key={index} align="space-between">
                      <Text variant="bodyMd">{metric.name}:</Text>
                      <Text variant="bodyMd" fontWeight="semibold">{metric.value}</Text>
                    </InlineStack>
                  ))}
                </BlockStack>
              </BlockStack>
            </Box>
            
            <Box>
              <Button primary fullWidth onClick={handleGenerateReport}>
                Generate Report
              </Button>
            </Box>
          </BlockStack>
        </Card>
      </BlockStack>
      
      <Modal
        open={showModal}
        onClose={() => !generating && setShowModal(false)}
        title="Report Generation"
        primaryAction={downloadUrl 
          ? { content: "Download Report", onAction: handleDownload } 
          : undefined
        }
        secondaryActions={downloadUrl
          ? [{ content: "Close", onAction: () => setShowModal(false) }]
          : undefined
        }
      >
        <Modal.Section>
          {generating ? (
            <BlockStack gap="400" alignment="center">
              <Text variant="bodyMd">
                Generating your analytics report...
              </Text>
              {/* Replace with actual spinner */}
              <Box paddingBlockStart="400" paddingBlockEnd="400" alignment="center">
                <Text variant="bodyLg">⟳</Text>
              </Box>
              <Text variant="bodySm" tone="subdued">
                This may take a few moments depending on the date range and metrics selected.
              </Text>
            </BlockStack>
          ) : (
            <BlockStack gap="400">
              <Banner tone="success">
                <p>Your report has been successfully generated!</p>
              </Banner>
              <Text variant="bodyMd">
                Your report for {format(selectedDates.start, 'MMM d, yyyy')} to {format(selectedDates.end, 'MMM d, yyyy')} is ready to download.
              </Text>
            </BlockStack>
          )}
        </Modal.Section>
      </Modal>
    </Page>
  );
}
