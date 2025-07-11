import { NextApiRequest, NextApiResponse } from 'next';
import { getReportFromMongoDB } from './generate';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { reportId, format = 'json' } = req.query;

    if (!reportId || typeof reportId !== 'string') {
      return res.status(400).json({ error: 'Report ID is required' });
    }

    // Get report from MongoDB
    const report = await getReportFromMongoDB(reportId);

    if (format === 'csv') {
      // Convert to CSV
      const csvContent = convertToCSV(report.data, report.reportConfig.columns);
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="report-${reportId}.csv"`);
      res.status(200).send(csvContent);
    } else {
      // Return JSON
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="report-${reportId}.json"`);
      res.status(200).json({
        reportId,
        reportConfig: report.reportConfig,
        metadata: report.metadata,
        data: report.data,
        generatedAt: report.createdAt
      });
    }

  } catch (error) {
    console.error('Error downloading report:', error);
    res.status(500).json({ 
      error: 'Failed to download report', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
}

// Helper function to convert data to CSV
function convertToCSV(data: any[], columns: string[]): string {
  if (!data || data.length === 0) {
    return '';
  }

  // Use provided columns or extract from data
  const headers = columns && columns.length > 0 ? columns : Object.keys(data[0]);
  
  // Create header row
  const csvRows = [headers.join(',')];
  
  // Add data rows
  for (const row of data) {
    const values = headers.map(header => {
      const value = getNestedValue(row, header);
      
      // Handle different data types
      if (value === null || value === undefined) {
        return '';
      } else if (Array.isArray(value)) {
        return `"${value.join('; ')}"`;
      } else if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
        return `"${value.replace(/"/g, '""')}"`;
      } else {
        return String(value);
      }
    });
    
    csvRows.push(values.join(','));
  }
  
  return csvRows.join('\n');
}

// Helper function to get nested object values
function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((curr, prop) => curr?.[prop], obj);
}
