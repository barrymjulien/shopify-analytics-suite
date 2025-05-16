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
  Modal
} from "@shopify/polaris";
// At the top of the file, add these imports
import { ReportSelector } from "../components/ReportSelector";
import { ExportOptions } from "../components/ExportOptions";
import { authenticate } from "../shopify.server";
import { FiArrowLeft } from 'react-icons/fi';
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

  // Add a helper function to generate the report data
  function generateReportData() {
    // This would normally come from the backend
    return previewData.metrics.map(metric => ({
      metric: metric.name,
      value: metric.value
    }));
  }
  
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
  
  // Prepare report data from selected metrics
  const prepareReportData = () => {
    // This would normally come from your API or server
    // For now, we'll generate sample data based on the selected metrics
    const reportData = [];
    
    // Generate 10 sample records
    for (let i = 1; i <= 10; i++) {
      const record = {
        date: format(subDays(new Date(), i), 'yyyy-MM-dd'),
        orderId: `#${1000 + i}`,
        revenue: (Math.random() * 500 + 50).toFixed(2),
        customer: `customer${i}@example.com`,
        orderCount: Math.floor(Math.random() * 5) + 1,
        products: Math.floor(Math.random() * 10) + 1
      };
      
      // Only include fields for selected metrics
      const filteredRecord = {};
      if (selectedMetrics.revenue) {
        filteredRecord.date = record.date;
        filteredRecord.revenue = record.revenue;
      }
      if (selectedMetrics.orders) {
        filteredRecord.orderId = record.orderId;
        filteredRecord.orderCount = record.orderCount;
      }
      if (selectedMetrics.customers) {
        filteredRecord.customer = record.customer;
      }
      if (selectedMetrics.products) {
        filteredRecord.products = record.products;
      }
      
      reportData.push(filteredRecord);
    }
    
    return reportData;
  };
  
  const handleGenerateReport = () => {
    setShowModal(true);
    setGenerating(true);
    
    // Simulate report generation
    setTimeout(() => {
      setGenerating(false);
      
      const reportData = prepareReportData();
      
      // For non-PDF formats, create a download URL
      if (fileFormat !== 'pdf') {
        let content = '';
        let type = '';
        
        if (fileFormat === 'csv') {
          content = `${Object.keys(reportData[0]).join(',')}\n` + 
            reportData.map(row => Object.values(row).join(',')).join('\n');
          type = 'text/csv;charset=utf-8;';
        } else if (fileFormat === 'xlsx') {
          // In a real implementation, you would use a library to generate Excel files
          // For demo purposes, we'll just use JSON
          content = JSON.stringify(reportData);
          type = 'application/json;charset=utf-8;';
        }
        
        const blob = new Blob([content], { type });
        const url = window.URL.createObjectURL(blob);
        setDownloadUrl(url);
      } else {
        // For PDF, we'll rely on our ExportService via the modal's actions
        // We'll store the data in state to be used by the PDF export
        window.reportDataForPDF = reportData;
        setDownloadUrl('pdf-ready');
      }
    }, 2000);
  };
  
  const handleDownload = () => {
    if (fileFormat === 'pdf' && downloadUrl === 'pdf-ready') {
      console.log('Initializing PDF download via ExportService...');
      
      // Use our ExportService for PDF generation
      const reportTitle = `${reportType.charAt(0).toUpperCase() + reportType.slice(1)} Analytics Report`;
      const reportFilename = `analytics-report-${format(selectedDates.start, 'yyyy-MM-dd')}-to-${format(selectedDates.end, 'yyyy-MM-dd')}.pdf`;
      
      // Get the data we prepared earlier
      const reportData = window.reportDataForPDF || [];
      
      if (!reportData.length) {
        console.error('No report data available for PDF export');
        alert('No data available to generate PDF. Please try again.');
        return;
      }
      
      console.log('Report data for PDF:', reportData);
      
      // Directly use the ExportService without dynamic import
      try {
        const { ExportService } = require('../services/exportService');
        console.log('Using ExportService directly');
        
        ExportService.exportToPDF(reportData, {
          filename: reportFilename,
          title: reportTitle,
          subtitle: `Data from ${format(selectedDates.start, 'MMM d, yyyy')} to ${format(selectedDates.end, 'MMM d, yyyy')}`,
          shopInfo: {
            name: window.shopifyData?.shop?.name || 'Shopify Store',
            domain: window.shopifyData?.shop?.domain || 'example.myshopify.com'
          }
        });
      } catch (directError) {
        console.error('Direct ExportService usage failed:', directError);
        
        // Fallback to dynamic import
        console.log('Falling back to dynamic import of ExportService');
        import('../services/exportService').then(({ ExportService }) => {
          ExportService.exportToPDF(reportData, {
            filename: reportFilename,
            title: reportTitle,
            subtitle: `Data from ${format(selectedDates.start, 'MMM d, yyyy')} to ${format(selectedDates.end, 'MMM d, yyyy')}`,
            shopInfo: {
              name: window.shopifyData?.shop?.name || 'Shopify Store',
              domain: window.shopifyData?.shop?.domain || 'example.myshopify.com'
            }
          });
        }).catch(importError => {
          console.error('Dynamic import of ExportService failed:', importError);
          alert('Failed to generate PDF. Please try a different format.');
        });
      }
    } else {
      // For non-PDF formats, use the blob URL
      console.log('Downloading non-PDF format using blob URL:', downloadUrl);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `analytics-report-${format(selectedDates.start, 'yyyy-MM-dd')}-to-${format(selectedDates.end, 'yyyy-MM-dd')}.${fileFormat}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
    
    // Close modal and navigate back to dashboard
    setShowModal(false);
  };
  
  return (
    <Page
      title="Export Analytics Report"
      backAction={{ content: 'Back', icon: FiArrowLeft, onAction: () => navigate('/app') }}
    >
      <BlockStack gap="500">
        {/* Replace the form with the ReportSelector component */}
        <ReportSelector 
          initialConfig={{
            reportType,
            metrics: selectedMetrics,
            startDate: selectedDates.start,
            endDate: selectedDates.end
          }}
          onConfigChange={(config) => {
            setReportType(config.reportType);
            setSelectedMetrics(config.metrics);
            setSelectedDates({
              start: config.startDate,
              end: config.endDate
            });
          }}
        />
        
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
            
            {/* Replace the Generate Report button with ExportOptions */}
            <Box>
              <ExportOptions
                data={generateReportData()}
                filename={`analytics-report-${format(selectedDates.start, 'yyyy-MM-dd')}-to-${format(selectedDates.end, 'yyyy-MM-dd')}`}
                title={`Analytics Report: ${format(selectedDates.start, 'MMM d, yyyy')} to ${format(selectedDates.end, 'MMM d, yyyy')}`}
                columns={[
                  { field: 'metric', header: 'Metric' },
                  { field: 'value', header: 'Value' }
                ]}
                additionalInfo={{
                  'Date Range': `${format(selectedDates.start, 'MMM d, yyyy')} to ${format(selectedDates.end, 'MMM d, yyyy')}`,
                  'Report Type': reportTypes.find(t => t.value === reportType)?.label || reportType
                }}
                onExportStart={() => setGenerating(true)}
                onExportComplete={() => {
                  setGenerating(false);
                  setShowModal(true);
                }}
              />
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
