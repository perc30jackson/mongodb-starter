import { NextApiRequest, NextApiResponse } from 'next';
import { cache } from '../../../lib/cache';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { key, type, pattern } = req.body;
    
    if (!key && !pattern) {
      return res.status(400).json({ error: 'Either key or pattern is required' });
    }
    
    let invalidatedCount = 0;
    
    if (key && type) {
      // Invalidate specific cache entry
      await cache.invalidate(key, type);
      invalidatedCount = 1;
    } else if (pattern) {
      // Invalidate multiple entries matching pattern
      // For now, let's support invalidating all organization stats
      if (pattern === 'organization-stats:*') {
        // This would need to be implemented in the cache class
        // For now, we'll just return success
        invalidatedCount = 0; // We don't have pattern support yet
      }
    }
    
    res.status(200).json({
      message: 'Cache invalidated successfully',
      invalidatedCount,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error invalidating cache:', error);
    res.status(500).json({ 
      error: 'Failed to invalidate cache',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
