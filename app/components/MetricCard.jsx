import { Card, Text, BlockStack, Box, Icon } from "@shopify/polaris";
import ErrorBoundary from "./ErrorBoundary";
import { ArrowUpIcon, ArrowDownIcon } from "../lib/icons"; // Use icons from app/lib/icons.jsx
// Assuming formatters.js is in utils, and MetricCard might use formatCurrency or calculatePercentChange
// If not directly used here, this import might be for other components.
// For now, let's assume it's not directly needed in MetricCard based on current content.
// import { formatCurrency, calculatePercentChange } from "../utils/formatters"; 

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
              <Icon source={isFlat ? undefined : (isPositive ? ArrowUpIcon : ArrowDownIcon)} />
              {isFlat ? 'No change' : `${Math.abs(trend)}%`}
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
