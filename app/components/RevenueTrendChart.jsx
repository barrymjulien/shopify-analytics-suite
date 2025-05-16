import { useState } from 'react';
import { Card, ButtonGroup, Button, InlineStack } from '@shopify/polaris';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

export function RevenueTrendChart({ data = [] }) {
  // Create a simple chart component
  const formatXAxis = (tickItem) => {
    const date = new Date(tickItem);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };
  
  return (
    <Card>
      <Card.Section>
        <InlineStack align="space-between">
          <ButtonGroup segmented>
            <Button>7d</Button>
            <Button pressed>30d</Button>
            <Button>90d</Button>
          </ButtonGroup>
        </InlineStack>
      </Card.Section>
      
      <Card.Section>
        <div style={{ width: '100%', height: 300 }}>
          <ResponsiveContainer>
            <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="date" 
                tickFormatter={formatXAxis}
              />
              <YAxis 
                tickFormatter={(value) => `$${value}`}
              />
              <Tooltip />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="revenue" 
                name="Revenue" 
                stroke="#5C6AC4" 
                activeDot={{ r: 8 }} 
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card.Section>
    </Card>
  );
}
