import type { NextApiRequest, NextApiResponse } from 'next';
import { cache } from '@/lib/cache';
import { stateManager, getUserId } from '@/lib/state-manager';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    switch (req.method) {
      case 'GET':
        await handleGet(req, res);
        break;
      case 'POST':
        await handlePost(req, res);
        break;
      case 'DELETE':
        await handleDelete(req, res);
        break;
      default:
        res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Cache management API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function handleGet(req: NextApiRequest, res: NextApiResponse) {
  const { action } = req.query;

  switch (action) {
    case 'stats':
      const cacheStats = await cache.getStats();
      res.status(200).json({
        cache: cacheStats,
        timestamp: new Date().toISOString()
      });
      break;

    case 'user-states':
      const userId = getUserId(req);
      const userStats = await stateManager.getUserStateStats(userId);
      res.status(200).json({
        userId,
        ...userStats,
        timestamp: new Date().toISOString()
      });
      break;

    default:
      // Return overall cache health
      const overallStats = await cache.getStats();
      res.status(200).json({
        cache: overallStats,
        status: 'healthy',
        timestamp: new Date().toISOString()
      });
  }
}

async function handlePost(req: NextApiRequest, res: NextApiResponse) {
  const { action } = req.query;
  const { key, data, type, ttl } = req.body;

  switch (action) {
    case 'set':
      if (!key || !type) {
        return res.status(400).json({ error: 'key and type are required' });
      }
      await cache.set(key, data, { type, ttl });
      res.status(200).json({ message: 'Cache entry set successfully' });
      break;

    case 'save-state':
      const userId = getUserId(req);
      const { component, state } = req.body;
      if (!component || !state) {
        return res.status(400).json({ error: 'component and state are required' });
      }
      await stateManager.saveAppState(userId, component, state);
      res.status(200).json({ message: 'State saved successfully' });
      break;

    case 'cleanup':
      // Clean up expired entries
      await stateManager.clearExpiredStates();
      res.status(200).json({ message: 'Cleanup completed' });
      break;

    default:
      res.status(400).json({ error: 'Invalid action' });
  }
}

async function handleDelete(req: NextApiRequest, res: NextApiResponse) {
  const { action } = req.query;

  switch (action) {
    case 'clear-cache':
      await cache.clear();
      res.status(200).json({ message: 'Cache cleared successfully' });
      break;

    case 'invalidate':
      const { key, type } = req.body;
      if (!key || !type) {
        return res.status(400).json({ error: 'key and type are required' });
      }
      await cache.invalidate(key, type);
      res.status(200).json({ message: 'Cache entry invalidated' });
      break;

    case 'invalidate-type':
      const { type: typeToInvalidate } = req.body;
      if (!typeToInvalidate) {
        return res.status(400).json({ error: 'type is required' });
      }
      await cache.invalidateByType(typeToInvalidate);
      res.status(200).json({ message: `All entries of type ${typeToInvalidate} invalidated` });
      break;

    case 'clear-user-states':
      const userId = getUserId(req);
      await stateManager.clearUserStates(userId);
      res.status(200).json({ message: 'User states cleared successfully' });
      break;

    default:
      res.status(400).json({ error: 'Invalid action' });
  }
}
