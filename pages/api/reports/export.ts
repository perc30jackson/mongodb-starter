import { NextApiRequest, NextApiResponse } from 'next';
import { MongoClient, ObjectId } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DATABASE_NAME = process.env.MONGODB_DB || 'meraki-dashboard';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { reportId, format } = req.body;
    
    console.log('Export request received:', { reportId, format });
    
    if (!reportId || !format) {
      console.error('Missing required fields:', { reportId: !!reportId, format: !!format });
      return res.status(400).json({ error: 'Report ID and format are required' });
    }

    // Validate ObjectId format
    if (!ObjectId.isValid(reportId)) {
      console.error('Invalid ObjectId format:', reportId);
      return res.status(400).json({ error: 'Invalid report ID format' });
    }

    console.log('Attempting to retrieve report from MongoDB...');
    // Get report from MongoDB
    const report = await getReportFromMongoDB(reportId);
    console.log('Report retrieved successfully, data length:', report?.data?.length || 0);
    console.log('Report structure keys:', Object.keys(report || {}));

    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    if (format === 'csv') {
      // Convert to CSV
      const csvContent = convertToCSV(report.data, report.reportConfig?.columns);
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="report-${reportId}.csv"`);
      res.status(200).send(csvContent);
    } else if (format === 'json') {
      // Return JSON
      const jsonContent = JSON.stringify({
        reportId,
        reportConfig: report.reportConfig,
        metadata: report.metadata,
        data: report.data,
        generatedAt: report.createdAt
      }, null, 2);
      
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="report-${reportId}.json"`);
      res.status(200).send(jsonContent);
    } else {
      return res.status(400).json({ error: 'Invalid format. Use csv or json' });
    }

  } catch (error) {
    console.error('Error exporting report:', error);
    res.status(500).json({ 
      error: 'Failed to export report', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
}

export async function getReportFromMongoDB(reportId: string) {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    const db = client.db(DATABASE_NAME);
    const reportsCollection = db.collection('reports');
    
    console.log(`Looking for report with ID: ${reportId} in database: ${DATABASE_NAME}`);
    
    // Convert reportId string to ObjectId for MongoDB query
    const report = await reportsCollection.findOne({ _id: new ObjectId(reportId) });
    
    console.log('Found report:', !!report);
    
    if (!report) {
      throw new Error('Report not found');
    }
    
    return report;
  } finally {
    await client.close();
  }
}

function convertToCSV(data: any[], columns?: string[]): string {
  if (!data || data.length === 0) {
    return '';
  }

  // Use provided columns or extract from first data item
  const headers = columns && columns.length > 0 
    ? columns 
    : Object.keys(data[0]);

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
      } else if (typeof value === 'object') {
        // Convert objects to JSON string and escape for CSV
        const jsonStr = JSON.stringify(value);
        return `"${jsonStr.replace(/"/g, '""')}"`;
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