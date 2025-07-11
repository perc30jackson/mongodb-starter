import { NextApiRequest, NextApiResponse } from 'next';
import { cache } from '../../../lib/cache';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Get cache statistics
    const stats = await cache.getStats();
    
    res.status(200).json({
      stats,
      timestamp: new Date().toISOString(),
      message: 'Cache debug info retrieved successfully'
    });
    
  } catch (error) {
    console.error('Error getting cache debug info:', error);
    res.status(500).json({ 
      error: 'Failed to get cache debug info',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
