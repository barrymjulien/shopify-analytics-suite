import { Card, Text, BlockStack, Box } from "@shopify/polaris";
import ErrorBoundary from "./ErrorBoundary";

function MetricCardContent({ title, value, trend, subtitle }) {
  // Handle case when trend is 0 (flat) or undefined
  const hasValidTrend = trend !== undefined && trend !== null;
  const isPositive = hasValidTrend && trend > 0;
  const isFlat = hasValidTrend && trend === 0;
  
  return (
    <Card>
      <BlockStack gap="200">
        <Text variant="headingSm" as="h3" tone="subdued">
          {title}
        </Text>
        <Box>
          <Text variant="heading2xl" as="p">
            {value}
          </Text>
        </Box>
        {subtitle && (
          <Text variant="bodySm" tone="subdued">
            {subtitle}
          </Text>
        )}
        {hasValidTrend && (
          <Box>
            <Text
              variant="bodySm"
              tone={isFlat ? 'subdued' : (isPositive ? 'success' : 'critical')}
            >
              {isFlat ? '→' : (isPositive ? '↑' : '↓')} {Math.abs(trend)}%
            </Text>
          </Box>
        )}
      </BlockStack>
    </Card>
  );
}

export function MetricCard(props) {
  return (
    <ErrorBoundary componentName="Metric Card">
      <MetricCardContent {...props} />
    </ErrorBoundary>
  );
}
