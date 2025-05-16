import { ProgressBar, BlockStack, InlineStack, Text } from "@shopify/polaris";
import ErrorBoundary from "./ErrorBoundary";

function CustomerSegmentsContent({ segments }) {
  if (!segments || segments.length === 0) {
    return (
      <Text tone="subdued">No segment data available</Text>
    );
  }
  
  // Ensure segment counts are valid numbers
  const validSegments = segments.map(segment => ({
    ...segment,
    count: typeof segment.count === 'number' && !isNaN(segment.count) ? segment.count : 0
  }));
  
  const total = validSegments.reduce((sum, segment) => sum + segment.count, 0);
  // Prevent division by zero
  if (total === 0) {
    return (
      <Text tone="subdued">No customer data available</Text>
    );
  }
  
  // Custom style for all segments to ensure consistent appearance
  const customStyles = {
    'VIP': {
      backgroundColor: '#000000'  // Black
    },
    'Loyal': {
      backgroundColor: '#008060'  // Green
    },
    'Promising': {
      backgroundColor: '#8c5e58'  // Brown
    },
    'New Customer': {
      backgroundColor: '#9c6ade'  // Purple
    },
    'At Risk': {
      backgroundColor: '#d82c0d'  // Red
    },
    'Needs Attention': {
      backgroundColor: '#f49342'  // Orange
    },
    'default': {
      backgroundColor: '#637381'  // Gray
    }
  };
  
  return (
    <BlockStack gap="400">
      {validSegments.map((segment) => {
        const percentage = (segment.count / total) * 100;
        const style = customStyles[segment.name] || customStyles.default;
        
        return (
          <BlockStack key={segment.name} gap="200">
            <InlineStack align="space-between">
              <Text variant="bodyMd">{segment.name}</Text>
              <Text variant="bodyMd" tone="subdued">
                {segment.count} ({percentage.toFixed(1)}%)
              </Text>
            </InlineStack>
            <div style={{
              width: '100%',
              height: '4px',
              backgroundColor: '#e1e3e5',
              borderRadius: '2px',
              overflow: 'hidden'
            }}>
              <div style={{
                width: `${percentage}%`,
                height: '100%',
                backgroundColor: style.backgroundColor,
                borderRadius: '2px'
              }} />
            </div>
          </BlockStack>
        );
      })}
    </BlockStack>
  );
}

export function CustomerSegments(props) {
  return (
    <ErrorBoundary componentName="Customer Segments">
      <CustomerSegmentsContent {...props} />
    </ErrorBoundary>
  );
}
