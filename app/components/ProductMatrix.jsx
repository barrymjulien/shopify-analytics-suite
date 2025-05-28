import { Card, Text, BlockStack, Box } from "@shopify/polaris";
import ErrorBoundary from "./ErrorBoundary";

function ProductMatrixContent({ products = [] }) {
  if (!products || products.length === 0) {
    return (
      <Text tone="subdued">No product data available</Text>
    );
  }

  // Simple product display for now
  return (
    <BlockStack gap="400">
      {products.slice(0, 5).map((product, index) => (
        <Box key={product.id || index} padding="200">
          <Text variant="bodyMd">{product.title || `Product ${index + 1}`}</Text>
          <Text variant="bodySm" tone="subdued">
            Revenue: ${product.revenue?.toFixed(2) || '0.00'}
          </Text>
        </Box>
      ))}
    </BlockStack>
  );
}

export function ProductMatrix(props) {
  return (
    <ErrorBoundary componentName="Product Matrix">
      <ProductMatrixContent {...props} />
    </ErrorBoundary>
  );
}
