import React, { useState } from 'react';
import { 
  Card, 
  DataTable, 
  Modal, 
  Text, 
  BlockStack, 
  Button, 
  InlineStack,
  Box
} from "@shopify/polaris";
import { ExportOptions } from './ExportOptions';
import ErrorBoundary from "./ErrorBoundary";

function ForecastScenarioTableContent({ 
  scenarios, 
  title = "Forecast Scenarios",
  currencyCode = "USD"
}) {
  const [selectedScenario, setSelectedScenario] = useState(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  
  // Format currency
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode
    }).format(value);
  };
  
  // Prepare table rows
  const rows = scenarios.map(scenario => [
    <Text key={`${scenario.id}-name`} variant="bodyMd" fontWeight={scenario.isBase ? "bold" : "regular"}>
      {scenario.name}
      {scenario.isBase && ' (Base Case)'}
    </Text>,
    scenario.description,
    formatCurrency(scenario.forecast),
    <Button 
      key={`view-${scenario.id}`} 
      onClick={() => {
        setSelectedScenario(scenario);
        setDetailsModalOpen(true);
      }}
      plain
    >
      View Details
    </Button>
  ]);
  
  // Handle modal close
  const handleModalClose = () => {
    setDetailsModalOpen(false);
  };
  
  // Render empty state
  if (!scenarios || scenarios.length === 0) {
    return (
      <Card>
        <BlockStack gap="400">
          <Text variant="headingMd" as="h2">{title}</Text>
          <Box padding="500">
            <BlockStack align="center" gap="200">
              <Text tone="subdued">No forecast scenarios available</Text>
              <Button>Create Scenario</Button>
            </BlockStack>
          </Box>
        </BlockStack>
      </Card>
    );
  }
  
  return (
    <>
      <Card>
        <BlockStack gap="400">
          <InlineStack align="space-between">
            <Text variant="headingMd" as="h2">{title}</Text>
            <ExportOptions 
              data={scenarios.map(s => ({
                name: s.name,
                description: s.description,
                forecast: s.forecast,
                change: s.change,
                dateGenerated: s.dateGenerated
              }))}
              filename="forecast-scenarios"
              title="Forecast Scenarios"
              columns={[
                { field: 'name', header: 'Scenario' },
                { field: 'description', header: 'Description' },
                { field: 'forecast', header: 'Forecast Value' },
                { field: 'change', header: 'Change %' },
                { field: 'dateGenerated', header: 'Date Generated' }
              ]}
            />
          </InlineStack>
          
          <DataTable
            columnContentTypes={['text', 'text', 'numeric', 'text']}
            headings={['Scenario', 'Description', 'Forecast', 'Actions']}
            rows={rows}
          />
        </BlockStack>
      </Card>
      
      {selectedScenario && (
        <Modal
          open={detailsModalOpen}
          onClose={handleModalClose}
          title={`${selectedScenario.name} Scenario Details`}
          primaryAction={{
            content: 'Close',
            onAction: handleModalClose
          }}
          secondaryActions={[
            {
              content: 'Export Details',
              onAction: () => {
                // Add export logic here
              }
            }
          ]}
        >
          <Modal.Section>
            <BlockStack gap="400">
              <InlineStack align="space-between">
                <Text variant="bodyMd">Forecast:</Text>
                <Text variant="bodyMd" fontWeight="bold">
                  {formatCurrency(selectedScenario.forecast)}
                </Text>
              </InlineStack>
              
              <InlineStack align="space-between">
                <Text variant="bodyMd">Change from Base Case:</Text>
                <Text 
                  variant="bodyMd"
                  tone={selectedScenario.change > 0 ? 'success' : selectedScenario.change < 0 ? 'critical' : 'subdued'}
                >
                  {selectedScenario.change > 0 ? '+' : ''}{selectedScenario.change}%
                </Text>
              </InlineStack>
              
              <InlineStack align="space-between">
                <Text variant="bodyMd">Date Generated:</Text>
                <Text variant="bodyMd">{selectedScenario.dateGenerated}</Text>
              </InlineStack>
              
              <BlockStack gap="200">
                <Text variant="headingSm">Description:</Text>
                <Text variant="bodyMd">{selectedScenario.description}</Text>
              </BlockStack>
              
              <BlockStack gap="200">
                <Text variant="headingSm">Assumptions:</Text>
                <BlockStack gap="200">
                  {selectedScenario.assumptions.map((assumption, index) => (
                    <InlineStack key={index} align="space-between">
                      <Text variant="bodyMd">{assumption.name}:</Text>
                      <Text variant="bodyMd">{assumption.value}</Text>
                    </InlineStack>
                  ))}
                </BlockStack>
              </BlockStack>
              
              {selectedScenario.recommendations && (
                <BlockStack gap="200">
                  <Text variant="headingSm">Recommendations:</Text>
                  <Text variant="bodyMd">{selectedScenario.recommendations}</Text>
                </BlockStack>
              )}
            </BlockStack>
          </Modal.Section>
        </Modal>
      )}
    </>
  );
}

export function ForecastScenarioTable(props) {
  return (
    <ErrorBoundary componentName="Forecast Scenario Table">
      <ForecastScenarioTableContent {...props} />
    </ErrorBoundary>
  );
}
