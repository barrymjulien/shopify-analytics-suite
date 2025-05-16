import { format } from 'date-fns';

/**
 * Format currency value
 */
export function formatCurrency(value, currencyCode = "USD") {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currencyCode
  }).format(value);
}

/**
 * Format date for display
 */
export function formatDate(date, pattern = 'MMM d, yyyy') {
  return format(date, pattern);
}

/**
 * Calculate percentage change
 */
export function calculatePercentChange(current, previous) {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}
