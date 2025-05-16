import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

/**
 * Render a component with test providers
 */
export function renderWithProviders(ui, options = {}) {
  return render(
    <MemoryRouter>
      {ui}
    </MemoryRouter>,
    options
  );
}

/**
 * Mock analytics service
 */
export const mockAnalyticsService = {
  getRevenueOverview: jest.fn().mockResolvedValue({
    totalRevenue: 10000,
    averageOrderValue: 85,
    orderCount: 120,
    revenueByDay: Array(30).fill().map((_, i) => ({
      date: `2025-04-${i + 1}`,
      revenue: 300 + Math.random() * 500
    })),
    periodComparison: {
      revenueTrend: 12,
      orderTrend: 8,
      aovTrend: 4
    }
  }),
  calculateCLV: jest.fn().mockResolvedValue({
    customers: [],
    summary: {
      averageCLV: 2450,
      topSegments: []
    }
  })
};
