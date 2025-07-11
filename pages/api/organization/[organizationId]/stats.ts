import { NextApiRequest, NextApiResponse } from 'next';
import MerakiAPI from '@/lib/meraki';
import { cache, cacheKeys, cacheTTL } from '@/lib/cache';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { organizationId } = req.query;

  if (typeof organizationId !== 'string') {
    return res.status(400).json({ error: 'Organization ID is required' });
  }

  try {
    const cacheKey = cacheKeys.organizationStats(organizationId);
    
    // Try to get from cache first
    const cachedStats = await cache.get(cacheKey, 'organization-stats');
    if (cachedStats) {
      console.log(`Serving stats for organization ${organizationId} from cache`);
      return res.status(200).json(cachedStats);
    }

    console.log(`Fetching stats for organization ${organizationId} from Meraki API (cache miss)`);
    
    const apiKey = process.env.MERAKI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'Meraki API key not configured' });
    }
    
    const meraki = new MerakiAPI(apiKey);
    
    // Get networks count (lightweight call)
    const networks = await meraki.getNetworks(organizationId);
    
    // Try to get device count from inventory API (more efficient than individual network calls)
    let deviceCount = 0;
    try {
      const inventory = await meraki.getOrganizationInventory(organizationId);
      deviceCount = inventory ? inventory.length : 0;
    } catch (error) {
      console.warn(`Could not fetch inventory for organization ${organizationId}:`, error);
      // Fallback: we'll leave device count as 0 for now
    }
    
    // Try to get client count from organization clients overview
    let clientCount = 0;
    try {
      const clientsOverview = await meraki.getOrganizationClientsOverview(organizationId, 86400); // 24 hours
      
      // The clients overview should contain total count or we can count the clients array
      if (clientsOverview) {
        if (typeof clientsOverview.total === 'number') {
          clientCount = clientsOverview.total;
        } else if (Array.isArray(clientsOverview.clients)) {
          clientCount = clientsOverview.clients.length;
        } else if (Array.isArray(clientsOverview)) {
          clientCount = clientsOverview.length;
        } else if (clientsOverview.counts && typeof clientsOverview.counts.total === 'number') {
          clientCount = clientsOverview.counts.total;
        }
      }
    } catch (error) {
      console.warn(`Could not fetch clients overview for organization ${organizationId}:`, error);
      // Fallback: we'll leave client count as 0
    }
    
    const stats = {
      organizationId,
      networks: networks.length,
      devices: deviceCount,
      clients: clientCount,
      timestamp: new Date().toISOString()
    };

    // Cache the result for a shorter time since stats can change more frequently
    await cache.set(cacheKey, stats, {
      type: 'organization-stats',
      ttl: cacheTTL.organizationStats
    });

    res.status(200).json(stats);
  } catch (error) {
    console.error(`Error fetching stats for organization ${organizationId}:`, error);
    
    // Return basic error response but don't crash
    res.status(500).json({ 
      error: 'Failed to fetch organization stats',
      organizationId,
      networks: 0,
      devices: 0,
      clients: 0,
      timestamp: new Date().toISOString()
    });
  }
}
