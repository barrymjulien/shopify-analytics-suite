/**
 * Export Service for Analytics Suite
 * Provides methods to export data in various formats (CSV, PDF, JSON)
 */
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

export class ExportService {
  /**
   * Export data as CSV
   * @param {Array} data - Array of objects to export
   * @param {String} filename - Name of the file to download
   */
  static exportToCSV(data, filename = 'export.csv') {
    if (!data || !data.length) {
      console.error('No data to export');
      return null;
    }
    
    try {
      // Get headers from the first object
      const headers = Object.keys(data[0]);
      
      // Convert data to CSV format
      const csvContent = [
        headers.join(','), // Header row
        ...data.map(row => headers.map(field => {
          // Wrap fields containing commas in quotes
          const value = row[field]?.toString() || '';
          return value.includes(',') ? `"${value}"` : value;
        }).join(','))
      ].join('\n');
      
      // Create a Blob and generate download link
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      
      // Create virtual link and trigger download
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      return true;
    } catch (error) {
      console.error('CSV Export Error:', error);
      return null;
    }
  }
  
  /**
   * Export data as PDF
   * @param {Object} options - PDF export options
   * @param {Array} options.data - Data to export
   * @param {String} options.filename - Name of the file
   * @param {String} options.title - Title for the PDF
   * @param {Array} options.columns - Column definitions for the table
   * @param {Object} options.additionalInfo - Additional info to include
   */
  static exportToPDF(options) {
    const { 
      data, 
      filename = 'export.pdf', 
      title = 'Analytics Report',
      columns,
      additionalInfo = {}
    } = options;
    
    if (!data || !data.length) {
      console.error('No data to export');
      return null;
    }
    
    try {
      // Create new PDF document
      const doc = new jsPDF();
      
      // Add title
      doc.setFontSize(18);
      doc.text(title, 14, 22);
      
      // Add timestamp
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 30);
      
      // Add additional info
      let yPos = 38;
      Object.entries(additionalInfo).forEach(([key, value]) => {
        doc.text(`${key}: ${value}`, 14, yPos);
        yPos += 6;
      });
      
      // Prepare table data
      let tableData = [];
      
      // If columns provided, use them for formatting
      if (columns) {
        const headers = columns.map(col => col.header || col.field);
        const fields = columns.map(col => col.field);
        
        tableData = [
          headers,
          ...data.map(row => fields.map(field => row[field]?.toString() || ''))
        ];
      } else {
        // Use all fields from the data
        const headers = Object.keys(data[0]);
        tableData = [
          headers,
          ...data.map(row => headers.map(header => row[header]?.toString() || ''))
        ];
      }
      
      // Create table
      doc.autoTable({
        startY: yPos + 5,
        head: [tableData[0]],
        body: tableData.slice(1),
        headStyles: {
          fillColor: [66, 133, 244],
          textColor: 255
        },
        alternateRowStyles: {
          fillColor: [240, 240, 240]
        },
        margin: { top: 10 }
      });
      
      // Server-side approach
      if (typeof window === 'undefined') {
        // Return the PDF document for server-side handling
        return doc.output();
      }
      
      // Client-side: Try multiple approaches for download
      
      // Approach 1: Use jsPDF's built-in save method
      try {
        doc.save(filename);
        return true;
      } catch (e) {
        console.warn('Direct save failed, trying alternative approach', e);
      }
      
      // Approach 2: Blob URL approach (similar to CSV)
      try {
        const pdfBlob = doc.output('blob');
        const url = URL.createObjectURL(pdfBlob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        return true;
      } catch (e) {
        console.warn('Blob URL approach failed, trying data URI', e);
      }
      
      // Approach 3: Data URI approach
      try {
        const pdfData = doc.output('datauristring');
        const link = document.createElement('a');
        link.href = pdfData;
        link.download = filename;
        link.target = '_blank';
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        return true;
      } catch (e) {
        console.error('All PDF download approaches failed', e);
        return false;
      }
    } catch (error) {
      console.error('PDF Export Error:', error);
      return null;
    }
  }
  
  /**
   * Export data in JSON format for BI tools
   * @param {Array} data - Data to export
   * @param {String} filename - Name of the file
   * @param {Object} metadata - Additional metadata
   */
  static exportForBI(data, filename = 'export.json', metadata = {}) {
    if (!data) {
      console.error('No data to export');
      return null;
    }
    
    try {
      // Create enriched data with metadata
      const exportData = {
        metadata: {
          exportDate: new Date().toISOString(),
          recordCount: Array.isArray(data) ? data.length : 1,
          ...metadata
        },
        data: data
      };
      
      // Convert to JSON string with pretty formatting
      const jsonString = JSON.stringify(exportData, null, 2);
      
      // Create a Blob and trigger download
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      return true;
    } catch (error) {
      console.error('JSON Export Error:', error);
      return null;
    }
  }
}
