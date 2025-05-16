import React, { useState } from 'react';
import polarisPkg from '@shopify/polaris';
import { FiDownload } from 'react-icons/fi';
import { ExportService } from '../services/exportService';
import logger from '../services/loggerService';

const { Button, Popover, ActionList, Icon, Stack, Banner } = polarisPkg;

export function ExportOptions({
  data, 
  filename = 'export', 
  title = 'Analytics Report',
  columns = [],
  disabled = false,
  additionalInfo = {},
  onExportStart,
  onExportComplete
}) {
  const [active, setActive] = useState(false);
  const [error, setError] = useState(null);
  const [exporting, setExporting] = useState(false);
  
  const toggleActive = () => setActive(!active);
  
  const handleExport = async (format) => {
    setActive(false);
    setError(null);
    
    if (!data || (Array.isArray(data) && data.length === 0)) {
      setError('No data available to export');
      return;
    }
    
    setExporting(true);
    if (onExportStart) onExportStart(format);
    
    logger.info('Starting export', { format, recordCount: Array.isArray(data) ? data.length : 1 });
    
    try {
      let result;
      const exportFilename = `${filename}-${new Date().toISOString().split('T')[0]}`;
      
      switch (format) {
        case 'csv':
          result = ExportService.exportToCSV(data, `${exportFilename}.csv`);
          break;
        case 'pdf':
          result = ExportService.exportToPDF({
            data,
            filename: `${exportFilename}.pdf`,
            title,
            columns,
            additionalInfo
          });
          break;
        case 'json':
          result = ExportService.exportForBI(data, `${exportFilename}.json`, {
            title,
            exportType: 'analytics'
          });
          break;
        default:
          throw new Error(`Unsupported export format: ${format}`);
      }
      
      if (!result) {
        throw new Error(`Export failed for format: ${format}`);
      }
      
      logger.info('Export completed successfully', { format });
    } catch (err) {
      logger.error('Export failed', err, { format });
      setError(`Export failed: ${err.message}`);
    } finally {
      setExporting(false);
      if (onExportComplete) onExportComplete();
    }
  };
  
  const exportActions = [
    {
      content: 'Export as CSV',
      onAction: () => handleExport('csv')
    },
    {
      content: 'Export as PDF',
      onAction: () => handleExport('pdf')
    },
    {
      content: 'Export as JSON',
      onAction: () => handleExport('json')
    }
  ];
  
  return (
    <div>
      <Popover
        active={active}
        activator={
          <Button 
            onClick={toggleActive}
            icon={FiDownload} 
            disabled={disabled || exporting}
            loading={exporting}
          >
            {exporting ? 'Exporting...' : 'Export'}
          </Button>
        }
        onClose={toggleActive}
      >
        <ActionList
          actionRole="menuitem"
          items={exportActions}
        />
      </Popover>
      
      {error && (
        <div style={{ marginTop: '10px' }}>
          <Banner status="critical">{error}</Banner>
        </div>
      )}
    </div>
  );
}
