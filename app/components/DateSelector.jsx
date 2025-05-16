import React, { useState, useCallback } from 'react';
import { 
  Card, 
  BlockStack, 
  InlineStack, 
  Text, 
  Button, 
  DatePicker, 
  Popover, 
  FormLayout, 
  TextField, 
  Box 
} from "@shopify/polaris";
import ErrorBoundary from "./ErrorBoundary";
import { format, subDays, startOfMonth, endOfMonth, isValid, parse } from 'date-fns';

function DateSelectorContent({
  title,
  onDateChange,
  initialStartDate = subDays(new Date(), 30),
  initialEndDate = new Date(),
  presets = true
}) {
  const [selectedDates, setSelectedDates] = useState({
    start: initialStartDate,
    end: initialEndDate
  });
  
  const [{ month, year }, setDate] = useState({
    month: initialEndDate.getMonth(),
    year: initialEndDate.getFullYear()
  });
  
  const [popoverActive, setPopoverActive] = useState(false);
  const [startDateText, setStartDateText] = useState(format(initialStartDate, 'yyyy-MM-dd'));
  const [endDateText, setEndDateText] = useState(format(initialEndDate, 'yyyy-MM-dd'));
  
  const togglePopover = useCallback(() => {
    setPopoverActive(!popoverActive);
  }, [popoverActive]);
  
  const handleMonthChange = useCallback((month, year) => {
    setDate({ month, year });
  }, []);
  
  const handleDatePickerChange = useCallback((dateRange) => {
    setSelectedDates(dateRange);
    setStartDateText(format(dateRange.start, 'yyyy-MM-dd'));
    setEndDateText(format(dateRange.end, 'yyyy-MM-dd'));
    
    if (onDateChange) {
      onDateChange(dateRange);
    }
  }, [onDateChange]);
  
  const handleManualDateChange = useCallback(() => {
    // Parse manually entered dates
    const startDate = parse(startDateText, 'yyyy-MM-dd', new Date());
    const endDate = parse(endDateText, 'yyyy-MM-dd', new Date());
    
    if (isValid(startDate) && isValid(endDate)) {
      const newDateRange = { start: startDate, end: endDate };
      setSelectedDates(newDateRange);
      
      if (onDateChange) {
        onDateChange(newDateRange);
      }
      
      setPopoverActive(false);
    }
  }, [startDateText, endDateText, onDateChange]);
  
  const handlePresetClick = useCallback((preset) => {
    const today = new Date();
    let start = today;
    let end = today;
    
    switch (preset) {
      case 'last7':
        start = subDays(today, 7);
        break;
      case 'last30':
        start = subDays(today, 30);
        break;
      case 'last90':
        start = subDays(today, 90);
        break;
      case 'thisMonth':
        start = startOfMonth(today);
        break;
      case 'lastMonth':
        const lastMonth = subDays(startOfMonth(today), 1);
        start = startOfMonth(lastMonth);
        end = endOfMonth(lastMonth);
        break;
      default:
        break;
    }
    
    const newDateRange = { start, end };
    setSelectedDates(newDateRange);
    setStartDateText(format(start, 'yyyy-MM-dd'));
    setEndDateText(format(end, 'yyyy-MM-dd'));
    
    if (onDateChange) {
      onDateChange(newDateRange);
    }
  }, [onDateChange]);
  
  return (
    <BlockStack gap="300">
      {title && (
        <Text variant="headingSm">{title}</Text>
      )}
      
      <InlineStack align="space-between" gap="200">
        <Popover
          active={popoverActive}
          activator={
            <Button onClick={togglePopover} variant="tertiary">
              {format(selectedDates.start, 'MMM d, yyyy')} – {format(selectedDates.end, 'MMM d, yyyy')}
            </Button>
          }
          onClose={togglePopover}
        >
          <Popover.Pane>
            <BlockStack gap="400">
              <Box padding="300">
                {presets && (
                  <BlockStack gap="200">
                    <Text variant="headingSm">Presets</Text>
                    <InlineStack gap="200" wrap={false}>
                      <Button size="slim" onClick={() => handlePresetClick('last7')}>Last 7 days</Button>
                      <Button size="slim" onClick={() => handlePresetClick('last30')}>Last 30 days</Button>
                      <Button size="slim" onClick={() => handlePresetClick('last90')}>Last 90 days</Button>
                    </InlineStack>
                    <InlineStack gap="200" wrap={false}>
                      <Button size="slim" onClick={() => handlePresetClick('thisMonth')}>This month</Button>
                      <Button size="slim" onClick={() => handlePresetClick('lastMonth')}>Last month</Button>
                    </InlineStack>
                  </BlockStack>
                )}
                
                <Box paddingBlockStart="400">
                  <DatePicker
                    month={month}
                    year={year}
                    onChange={handleDatePickerChange}
                    onMonthChange={handleMonthChange}
                    selected={selectedDates}
                    allowRange
                  />
                </Box>
                
                <Box paddingBlockStart="400">
                  <FormLayout>
                    <FormLayout.Group>
                      <TextField
                        label="Start date"
                        value={startDateText}
                        onChange={setStartDateText}
                        autoComplete="off"
                        placeholder="YYYY-MM-DD"
                      />
                      <TextField
                        label="End date"
                        value={endDateText}
                        onChange={setEndDateText}
                        autoComplete="off"
                        placeholder="YYYY-MM-DD"
                      />
                    </FormLayout.Group>
                    <InlineStack align="end">
                      <Button onClick={handleManualDateChange} primary>
                        Apply
                      </Button>
                    </InlineStack>
                  </FormLayout>
                </Box>
              </Box>
            </BlockStack>
          </Popover.Pane>
        </Popover>
      </InlineStack>
    </BlockStack>
  );
}

export function DateSelector(props) {
  return (
    <ErrorBoundary componentName="Date Selector">
      <DateSelectorContent {...props} />
    </ErrorBoundary>
  );
}
