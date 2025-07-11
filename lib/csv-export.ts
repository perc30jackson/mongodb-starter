// CSV Export Utilities

export interface ExportColumn {
  key: string;
  header: string;
  formatter?: (value: any, row: any) => string;
}

export interface ExportOptions {
  filename?: string;
  columns?: ExportColumn[];
  includeTimestamp?: boolean;
  delimiter?: string;
}

/**
 * Converts data to CSV format and triggers download
 */
export function exportToCSV<T>(
  data: T[],
  options: ExportOptions = {}
): void {
  const {
    filename = 'export',
    columns,
    includeTimestamp = true,
    delimiter = ','
  } = options;

  if (!data || data.length === 0) {
    console.warn('No data to export');
    return;
  }

  // If no columns specified, use all keys from first object
  const exportColumns = columns || generateColumnsFromData(data[0]);
  
  // Generate CSV content
  const csvContent = generateCSVContent(data, exportColumns, delimiter);
  
  // Create filename with timestamp if requested
  const timestamp = includeTimestamp 
    ? `_${new Date().toISOString().slice(0, 19).replace(/[T:]/g, '-')}`
    : '';
  const fullFilename = `${filename}${timestamp}.csv`;
  
  // Trigger download
  downloadCSV(csvContent, fullFilename);
}

/**
 * Generate columns from data object keys
 */
function generateColumnsFromData(sampleRow: any): ExportColumn[] {
  if (!sampleRow || typeof sampleRow !== 'object') {
    return [];
  }

  return Object.keys(sampleRow)
    .filter(key => {
      const value = sampleRow[key];
      // Exclude complex objects and functions, keep primitives and simple objects
      return value === null || 
             value === undefined || 
             typeof value === 'string' || 
             typeof value === 'number' || 
             typeof value === 'boolean' ||
             (typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length < 5);
    })
    .map(key => ({
      key,
      header: formatHeader(key)
    }));
}

/**
 * Format object key as readable header
 */
function formatHeader(key: string): string {
  return key
    .replace(/([A-Z])/g, ' $1') // Add space before capital letters
    .replace(/^./, str => str.toUpperCase()) // Capitalize first letter
    .replace(/_/g, ' ') // Replace underscores with spaces
    .trim();
}

/**
 * Generate CSV content from data and columns
 */
function generateCSVContent<T>(
  data: T[],
  columns: ExportColumn[],
  delimiter: string
): string {
  // Create header row
  const headers = columns.map(col => escapeCSVField(col.header));
  const csvRows = [headers.join(delimiter)];

  // Create data rows
  data.forEach(row => {
    const csvRow = columns.map(col => {
      const value = getNestedValue(row, col.key);
      const formattedValue = col.formatter 
        ? col.formatter(value, row)
        : formatValue(value);
      return escapeCSVField(formattedValue);
    });
    csvRows.push(csvRow.join(delimiter));
  });

  return csvRows.join('\n');
}

/**
 * Get nested object value by key path (supports dot notation)
 */
function getNestedValue(obj: any, key: string): any {
  return key.split('.').reduce((current, prop) => {
    return current && typeof current === 'object' ? current[prop] : undefined;
  }, obj);
}

/**
 * Format value for CSV output
 */
function formatValue(value: any): string {
  if (value === null || value === undefined) {
    return '';
  }
  
  if (typeof value === 'object') {
    if (Array.isArray(value)) {
      return value.join('; ');
    }
    // For simple objects, create a readable string
    if (Object.keys(value).length < 5) {
      return Object.entries(value)
        .map(([k, v]) => `${k}: ${v}`)
        .join('; ');
    }
    return '[Object]';
  }
  
  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }
  
  return String(value);
}

/**
 * Escape CSV field (handle quotes and delimiters)
 */
function escapeCSVField(field: string): string {
  if (typeof field !== 'string') {
    field = String(field);
  }
  
  // If field contains comma, quote, or newline, wrap in quotes and escape quotes
  if (field.includes(',') || field.includes('"') || field.includes('\n')) {
    return `"${field.replace(/"/g, '""')}"`;
  }
  
  return field;
}

/**
 * Trigger CSV file download
 */
function downloadCSV(csvContent: string, filename: string): void {
  // Create blob with BOM for proper Excel opening
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csvContent], { 
    type: 'text/csv;charset=utf-8;' 
  });
  
  // Create download link
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  
  // Trigger download
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  // Clean up
  URL.revokeObjectURL(url);
}

// Pre-defined column configurations for common data types

export const organizationExportColumns: ExportColumn[] = [
  { key: 'name', header: 'Organization Name' },
  { key: 'id', header: 'Organization ID' },
  { key: 'url', header: 'Dashboard URL' },
  { key: 'api.enabled', header: 'API Enabled', formatter: (value) => value ? 'Yes' : 'No' },
  { key: 'cloud.region.name', header: 'Cloud Region' },
  { key: 'licensing.model', header: 'License Model' },
  { key: 'stats.networks', header: 'Networks' },
  { key: 'stats.devices', header: 'Devices' },
  { key: 'stats.clients', header: 'Clients' }
];

export const deviceExportColumns: ExportColumn[] = [
  { key: 'name', header: 'Device Name' },
  { key: 'serial', header: 'Serial Number' },
  { key: 'model', header: 'Model' },
  { key: 'productType', header: 'Product Type' },
  { key: 'networkName', header: 'Network' },
  { key: 'status', header: 'Status' },
  { key: 'lanIp', header: 'LAN IP' },
  { key: 'publicIp', header: 'Public IP' },
  { key: 'firmware', header: 'Firmware' },
  { key: 'lastReportedAt', header: 'Last Seen', formatter: (value) => value ? new Date(value).toLocaleString() : 'Never' }
];

export const clientExportColumns: ExportColumn[] = [
  { key: 'description', header: 'Client Name' },
  { key: 'mac', header: 'MAC Address' },
  { key: 'ip', header: 'IP Address' },
  { key: 'vlan', header: 'VLAN' },
  { key: 'switchport', header: 'Switch Port' },
  { key: 'status', header: 'Status' },
  { key: 'usage.sent', header: 'Data Sent (MB)', formatter: (value) => value ? Math.round(value / 1024 / 1024).toString() : '0' },
  { key: 'usage.recv', header: 'Data Received (MB)', formatter: (value) => value ? Math.round(value / 1024 / 1024).toString() : '0' },
  { key: 'firstSeen', header: 'First Seen', formatter: (value) => value ? new Date(value).toLocaleString() : 'Unknown' },
  { key: 'lastSeen', header: 'Last Seen', formatter: (value) => value ? new Date(value).toLocaleString() : 'Unknown' }
];

export const firewallRuleExportColumns: ExportColumn[] = [
  { key: 'comment', header: 'Rule Comment' },
  { key: 'policy', header: 'Policy' },
  { key: 'protocol', header: 'Protocol' },
  { key: 'srcCidr', header: 'Source CIDR' },
  { key: 'srcPort', header: 'Source Port' },
  { key: 'destCidr', header: 'Destination CIDR' },
  { key: 'destPort', header: 'Destination Port' },
  { key: 'syslogEnabled', header: 'Syslog Enabled', formatter: (value) => value ? 'Yes' : 'No' }
];
