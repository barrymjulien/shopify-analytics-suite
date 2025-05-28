import { useState } from "react";
import { json } from "@remix-run/node";
import { useLoaderData, useNavigate } from "@remix-run/react";
import {
  Page,
  Card,
  BlockStack,
  Box,
  Button,
  Text,
  DataTable,
  Modal,
  TextField,
  RangeSlider,
  Select,
  Banner,
  LegacyCard,
  Tabs,
  Badge,
  InlineStack
} from "@shopify/polaris";
import { ArrowLeftIcon, EditIcon, DeleteIcon, PlusIcon } from '../lib/icons';
import { authenticate } from "../shopify.server";

export async function loader({ request }) {
  const { session } = await authenticate.admin(request);
  const { shop } = session;
  
  // In a production app, we'd fetch this from the database with efficient queries like:
  // const segments = await prisma.customerSegment.findMany({
  //   where: { shop },
  //   select: {
  //     id: true,
  //     name: true,
  //     criteria: true,
  //     status: true,
  //     _count: {
  //       select: { customers: true }
  //     }
  //   },
  //   orderBy: { name: 'asc' }
  // });
  
  // For this demo, use sample data
  const segments = [
    { 
      id: 'vip', 
      name: 'VIP', 
      criteria: { 
        minSpent: 1000, 
        minOrders: 5,
        recency: 90 
      },
      count: 18,
      automation: "Email campaign, Exclusive discounts",
      status: "active"
    },
    { 
      id: 'loyal', 
      name: 'Loyal', 
      criteria: { 
        minSpent: 500, 
        minOrders: 3,
        recency: 120 
      },
      count: 45,
      automation: "Loyalty rewards email",
      status: "active"
    },
    { 
      id: 'promising', 
      name: 'Promising', 
      criteria: { 
        minSpent: 200, 
        minOrders: 2,
        recency: 90 
      },
      count: 32,
      automation: "Engagement campaign",
      status: "active"
    },
    { 
      id: 'new', 
      name: 'New Customer', 
      criteria: { 
        minSpent: 0, 
        minOrders: 1,
        recency: 30 
      },
      count: 12,
      automation: "Welcome series",
      status: "active"
    },
    { 
      id: 'at-risk', 
      name: 'At Risk', 
      criteria: { 
        minSpent: 100, 
        minOrders: 1,
        recency: 180 
      },
      count: 5,
      automation: "Re-engagement campaign",
      status: "active"
    }
  ];
  
  // Sample customers for each segment
  const customers = {
    'vip': [
      { id: 'cust_1', name: 'John Smith', email: 'john.smith@example.com', spent: 2450, orders: 12, lastOrder: '2025-05-01' },
      { id: 'cust_2', name: 'Sarah Johnson', email: 'sarah.j@example.com', spent: 1895, orders: 9, lastOrder: '2025-04-28' },
      { id: 'cust_3', name: 'Michael Brown', email: 'mbrown@example.com', spent: 1760, orders: 7, lastOrder: '2025-05-05' },
    ],
    'loyal': [
      { id: 'cust_4', name: 'Emma Wilson', email: 'emma.w@example.com', spent: 780, orders: 4, lastOrder: '2025-04-15' },
      { id: 'cust_5', name: 'James Taylor', email: 'james.t@example.com', spent: 650, orders: 3, lastOrder: '2025-04-22' },
    ],
    'promising': [
      { id: 'cust_6', name: 'David Lee', email: 'david.l@example.com', spent: 320, orders: 2, lastOrder: '2025-04-10' },
      { id: 'cust_7', name: 'Jennifer Adams', email: 'j.adams@example.com', spent: 275, orders: 2, lastOrder: '2025-04-05' },
    ],
    'new': [
      { id: 'cust_8', name: 'Robert Garcia', email: 'r.garcia@example.com', spent: 125, orders: 1, lastOrder: '2025-05-08' },
      { id: 'cust_9', name: 'Lisa Wang', email: 'lisa.w@example.com', spent: 99, orders: 1, lastOrder: '2025-05-07' },
    ],
    'at-risk': [
      { id: 'cust_10', name: 'Thomas Wright', email: 't.wright@example.com', spent: 450, orders: 2, lastOrder: '2024-11-15' },
      { id: 'cust_11', name: 'Patricia Miller', email: 'p.miller@example.com', spent: 275, orders: 1, lastOrder: '2024-12-03' },
    ]
  };
  
  return json({ shop, segments, customers });
}

export default function ManageCustomerSegments() {
  const { segments, customers } = useLoaderData();
  const navigate = useNavigate();
  
  // State
  const [selectedSegmentId, setSelectedSegmentId] = useState(segments[0].id);
  const [selectedTabIndex, setSelectedTabIndex] = useState(0);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showNewModal, setShowNewModal] = useState(false);
  const [currentSegment, setCurrentSegment] = useState(null);
  
  // Get the currently selected segment
  const selectedSegment = segments.find(segment => segment.id === selectedSegmentId);
  
  // Tabs for the details view
  const tabs = [
    { id: 'customers', content: 'Customers' },
    { id: 'criteria', content: 'Segment Criteria' },
    { id: 'automation', content: 'Automations' },
  ];
  
  // Handle segment selection
  const handleSegmentSelect = (segmentId) => {
    setSelectedSegmentId(segmentId);
    setSelectedTabIndex(0); // Reset to first tab when switching segments
  };
  
  // Handle segment edit
  const handleEditSegment = (segment) => {
    setCurrentSegment({...segment});
    setShowEditModal(true);
  };
  
  // Handle segment delete
  const handleDeleteSegment = (segment) => {
    setCurrentSegment({...segment});
    setShowDeleteModal(true);
  };
  
  // Handle new segment
  const handleNewSegment = () => {
    setCurrentSegment({
      name: '',
      criteria: {
        minSpent: 0,
        minOrders: 1,
        recency: 30
      },
      automation: ''
    });
    setShowNewModal(true);
  };
  
  // Format currency
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(value);
  };
  
  // Prepare data for segments table
  const segmentRows = segments.map(segment => [
    <Text 
      key={segment.id} 
      variant="bodyMd" 
      fontWeight={segment.id === selectedSegmentId ? "bold" : "regular"}
    >
      {segment.name}
    </Text>,
    <Badge key={`count-${segment.id}`} tone={segment.count > 20 ? "success" : "info"}>
      {segment.count} customers
    </Badge>,
    <Text key={`status-${segment.id}`} tone={segment.status === "active" ? "success" : "subdued"}>
      {segment.status.charAt(0).toUpperCase() + segment.status.slice(1)}
    </Text>,
    <InlineStack key={`actions-${segment.id}`} align="end" gap="200">
      <Button 
        icon={EditIcon} 
        onClick={() => handleEditSegment(segment)}
        size="slim"
        plain
        accessibilityLabel={`Edit ${segment.name} segment`}
      />
      <Button 
        icon={DeleteIcon} 
        tone="critical"
        onClick={() => handleDeleteSegment(segment)}
        size="slim"
        plain
        accessibilityLabel={`Delete ${segment.name} segment`}
      />
    </InlineStack>
  ]);
  
  // Prepare data for customers table
  const customerRows = (customers[selectedSegmentId] || []).map(customer => [
    customer.name,
    customer.email,
    formatCurrency(customer.spent),
    customer.orders.toString(),
    customer.lastOrder
  ]);
  
  // Render customer details tab
  const renderCustomersTab = () => {
    return (
      <Card>
        <BlockStack gap="400">
          <Text variant="headingMd" as="h3">
            Customers in {selectedSegment.name} Segment
          </Text>
          
          {customerRows.length > 0 ? (
            <DataTable
              columnContentTypes={['text', 'text', 'numeric', 'numeric', 'text']}
              headings={['Customer', 'Email', 'Total Spent', 'Orders', 'Last Order']}
              rows={customerRows}
              sortable={[false, false, true, true, true]}
            />
          ) : (
            <Banner tone="info">
              <p>No customers found in this segment.</p>
            </Banner>
          )}
          
          <Box>
            <Button>Export Customer List</Button>
          </Box>
        </BlockStack>
      </Card>
    );
  };
  
  // Render criteria tab
  const renderCriteriaTab = () => {
    return (
      <Card>
        <BlockStack gap="400">
          <Text variant="headingMd" as="h3">
            Segment Criteria
          </Text>
          
          <BlockStack gap="300">
            <InlineStack align="space-between">
              <Text variant="bodyMd">Minimum Total Spent:</Text>
              <Text variant="bodyMd" fontWeight="semibold">
                {formatCurrency(selectedSegment.criteria.minSpent)}
              </Text>
            </InlineStack>
            
            <InlineStack align="space-between">
              <Text variant="bodyMd">Minimum Order Count:</Text>
              <Text variant="bodyMd" fontWeight="semibold">
                {selectedSegment.criteria.minOrders}
              </Text>
            </InlineStack>
            
            <InlineStack align="space-between">
              <Text variant="bodyMd">Order Recency (days):</Text>
              <Text variant="bodyMd" fontWeight="semibold">
                {selectedSegment.criteria.recency}
              </Text>
            </InlineStack>
            
            <Box paddingBlockStart="300">
              <Button onClick={() => handleEditSegment(selectedSegment)}>
                Edit Criteria
              </Button>
            </Box>
          </BlockStack>
        </BlockStack>
      </Card>
    );
  };
  
  // Render automation tab
  const renderAutomationTab = () => {
    return (
      <Card>
        <BlockStack gap="400">
          <Text variant="headingMd" as="h3">
            Automations
          </Text>
          
          <Banner tone="info">
            <p>Automations let you trigger actions when customers enter or leave this segment.</p>
          </Banner>
          
          <BlockStack gap="300">
            <Text variant="bodyMd" fontWeight="semibold">Current Automations:</Text>
            <Text variant="bodyMd">{selectedSegment.automation || "No automations configured"}</Text>
            
            <Box paddingBlockStart="400">
              <Button>Configure Automations</Button>
            </Box>
          </BlockStack>
        </BlockStack>
      </Card>
    );
  };
  
  return (
    <Page
      title="Customer Segments"
      backAction={{ content: 'Back', icon: ArrowLeftIcon, onAction: () => navigate('/app') }}
      primaryAction={{ 
        content: 'Create New Segment', 
        icon: PlusIcon,
        onAction: handleNewSegment
      }}
    >
      <BlockStack gap="500">
        <LegacyCard>
          <LegacyCard.Section title="Segments">
            <DataTable
              columnContentTypes={['text', 'text', 'text', 'text']}
              headings={['Segment Name', 'Size', 'Status', 'Actions']}
              rows={segmentRows}
              onRowClick={(index) => handleSegmentSelect(segments[index].id)}
            />
          </LegacyCard.Section>
        </LegacyCard>
        
        <Text variant="headingMd" as="h2">
          {selectedSegment.name} Segment Details
        </Text>
        
        <Tabs
          tabs={tabs}
          selected={selectedTabIndex}
          onSelect={setSelectedTabIndex}
        />
        
        {selectedTabIndex === 0 && renderCustomersTab()}
        {selectedTabIndex === 1 && renderCriteriaTab()}
        {selectedTabIndex === 2 && renderAutomationTab()}
      </BlockStack>
      
      {/* Edit Segment Modal */}
      {currentSegment && (
        <Modal
          open={showEditModal}
          onClose={() => setShowEditModal(false)}
          title={`Edit ${currentSegment.name} Segment`}
          primaryAction={{
            content: 'Save Changes',
            // onAction: () => setShowEditModal(false) // Will be handled by a save function
            onAction: () => {
              // Placeholder for actual save logic
              console.log("Saving segment:", currentSegment);
              setShowEditModal(false);
            }
          }}
          secondaryActions={[
            {
              content: 'Cancel',
              onAction: () => setShowEditModal(false)
            }
          ]}
        >
          <Modal.Section>
            <BlockStack gap="400">
              <TextField
                label="Segment Name"
                value={currentSegment.name}
                onChange={(newValue) => setCurrentSegment(prev => ({ ...prev, name: newValue }))}
                autoComplete="off"
              />
              
              <Box paddingBlockStart="300">
                <InlineStack align="space-between">
                  <Text variant="bodyMd">Minimum Total Spent:</Text>
                  <Text variant="bodyMd">{formatCurrency(currentSegment.criteria.minSpent)}</Text>
                </InlineStack>
                <RangeSlider
                  output
                  min={0}
                  max={5000} // Increased max for more flexibility
                  step={50}
                  value={currentSegment.criteria.minSpent}
                  onChange={(newValue) => setCurrentSegment(prev => ({ ...prev, criteria: { ...prev.criteria, minSpent: newValue } }))}
                  prefix="$"
                />
              </Box>
              
              <Box>
                <InlineStack align="space-between">
                  <Text variant="bodyMd">Minimum Order Count:</Text>
                  <Text variant="bodyMd">{currentSegment.criteria.minOrders}</Text>
                </InlineStack>
                <RangeSlider
                  output
                  min={1}
                  max={20} // Increased max
                  step={1}
                  value={currentSegment.criteria.minOrders}
                  onChange={(newValue) => setCurrentSegment(prev => ({ ...prev, criteria: { ...prev.criteria, minOrders: newValue } }))}
                />
              </Box>
              
              <Box>
                <InlineStack align="space-between">
                  <Text variant="bodyMd">Order Recency (days ago max):</Text>
                  <Text variant="bodyMd">{currentSegment.criteria.recency}</Text>
                </InlineStack>
                <RangeSlider
                  output
                  min={7} // Min recency
                  max={365}
                  step={7}
                  value={currentSegment.criteria.recency}
                  onChange={(newValue) => setCurrentSegment(prev => ({ ...prev, criteria: { ...prev.criteria, recency: newValue } }))}
                  suffix="days"
                />
              </Box>
              
              <TextField
                label="Automation Settings"
                value={currentSegment.automation || ""}
                onChange={(newValue) => setCurrentSegment(prev => ({ ...prev, automation: newValue }))}
                multiline={3}
                autoComplete="off"
              />
            </BlockStack>
          </Modal.Section>
        </Modal>
      )}
      
      {/* Delete Segment Modal */}
      {currentSegment && (
        <Modal
          open={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          title={`Delete ${currentSegment.name} Segment`}
          primaryAction={{
            content: 'Delete Segment',
            tone: 'critical',
            // onAction: () => setShowDeleteModal(false) // Placeholder for actual delete
            onAction: () => {
              console.log("Deleting segment:", currentSegment.id);
              setShowDeleteModal(false);
            }
          }}
          secondaryActions={[
            {
              content: 'Cancel',
              onAction: () => setShowDeleteModal(false)
            }
          ]}
        >
          <Modal.Section>
            <BlockStack gap="400">
              <Banner tone="critical">
                <p>Are you sure you want to delete this segment? This action cannot be undone.</p>
              </Banner>
              
              <Text variant="bodyMd">
                This will delete the segment definition, but will not delete any customer data.
                Any automations associated with this segment will be disabled.
              </Text>
            </BlockStack>
          </Modal.Section>
        </Modal>
      )}
      
      {/* New Segment Modal */}
      {currentSegment && (
        <Modal
          open={showNewModal}
          onClose={() => setShowNewModal(false)}
          title="Create New Segment"
          primaryAction={{
            content: 'Create Segment',
            // onAction: () => setShowNewModal(false) // Placeholder for actual create
            onAction: () => {
              console.log("Creating new segment:", currentSegment);
              setShowNewModal(false);
            }
          }}
          secondaryActions={[
            {
              content: 'Cancel',
              onAction: () => setShowNewModal(false)
            }
          ]}
        >
          <Modal.Section>
            <BlockStack gap="400">
              <TextField
                label="Segment Name"
                placeholder="e.g., High Value Customers"
                value={currentSegment.name}
                onChange={(newValue) => setCurrentSegment(prev => ({ ...prev, name: newValue }))}
                autoComplete="off"
              />
              
              <Box paddingBlockStart="300">
                <InlineStack align="space-between">
                  <Text variant="bodyMd">Minimum Total Spent:</Text>
                  <Text variant="bodyMd">{formatCurrency(currentSegment.criteria.minSpent)}</Text>
                </InlineStack>
                <RangeSlider
                  output
                  min={0}
                  max={5000}
                  step={50}
                  value={currentSegment.criteria.minSpent}
                  onChange={(newValue) => setCurrentSegment(prev => ({ ...prev, criteria: { ...prev.criteria, minSpent: newValue } }))}
                  prefix="$"
                />
              </Box>
              
              <Box>
                <InlineStack align="space-between">
                  <Text variant="bodyMd">Minimum Order Count:</Text>
                  <Text variant="bodyMd">{currentSegment.criteria.minOrders}</Text>
                </InlineStack>
                <RangeSlider
                  output
                  min={1}
                  max={20}
                  step={1}
                  value={currentSegment.criteria.minOrders}
                  onChange={(newValue) => setCurrentSegment(prev => ({ ...prev, criteria: { ...prev.criteria, minOrders: newValue } }))}
                />
              </Box>
              
              <Box>
                <InlineStack align="space-between">
                  <Text variant="bodyMd">Order Recency (days ago max):</Text>
                  <Text variant="bodyMd">{currentSegment.criteria.recency}</Text>
                </InlineStack>
                <RangeSlider
                  output
                  min={7}
                  max={365}
                  step={7}
                  value={currentSegment.criteria.recency}
                  onChange={(newValue) => setCurrentSegment(prev => ({ ...prev, criteria: { ...prev.criteria, recency: newValue } }))}
                  suffix="days"
                />
              </Box>
              
              <Select
                label="Segment Type (Preset)"
                options={[
                  {label: 'Custom (define below)', value: 'custom'},
                  {label: 'High Value Customers', value: 'high-value'},
                  {label: 'Frequent Buyers', value: 'frequent'},
                  {label: 'New Customers (Last 30 days)', value: 'new'},
                  {label: 'At Risk (No purchase in 90 days)', value: 'at-risk'}
                ]}
                value={currentSegment.type || 'custom'} // Assuming a 'type' field for presets
                onChange={(newValue) => {
                  // Placeholder: Apply preset criteria if a type is selected
                  setCurrentSegment(prev => ({ ...prev, type: newValue }));
                  if (newValue === 'high-value') {
                    setCurrentSegment(prev => ({ ...prev, criteria: { minSpent: 1000, minOrders: 5, recency: 90 } }));
                  } else if (newValue === 'new') {
                     setCurrentSegment(prev => ({ ...prev, criteria: { minSpent: 0, minOrders: 1, recency: 30 } }));
                  }
                  // Add other presets as needed
                }}
                helpText="Select a template or define custom criteria below."
              />
              
              <TextField
                label="Automation Settings (Optional)"
                placeholder="e.g., Send email when customer enters segment"
                value={currentSegment.automation || ""}
                onChange={(newValue) => setCurrentSegment(prev => ({ ...prev, automation: newValue }))}
                multiline={3}
                autoComplete="off"
              />
            </BlockStack>
          </Modal.Section>
        </Modal>
      )}
    </Page>
  );
}
