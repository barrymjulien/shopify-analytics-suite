import { ProgressBar, BlockStack, InlineStack, Text } from "@shopify/polaris";

export function CustomerSegments({ segments }) {
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
  
  const segmentColors = {
    'VIP': 'primary',
    'Loyal': 'success',
    'Promising': 'info',
    'New Customer': 'attention',
    'Needs Attention': 'warning',
    'At Risk': 'critical'
  };
  
  return (
    <BlockStack gap="400">
      {validSegments.map((segment) => {
        const percentage = (segment.count / total) * 100;
        
        return (
          <BlockStack key={segment.name} gap="200">
            <InlineStack align="space-between">
              <Text variant="bodyMd">{segment.name}</Text>
              <Text variant="bodyMd" tone="subdued">
                {segment.count} ({percentage.toFixed(1)}%)
              </Text>
            </InlineStack>
            <ProgressBar
              progress={percentage}
              tone={segmentColors[segment.name] || 'default'}
              size="small"
            />
          </BlockStack>
        );
      })}
    </BlockStack>
  );
}
