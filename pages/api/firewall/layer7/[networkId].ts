import { NextApiRequest, NextApiResponse } from 'next';
import { getLayer7FirewallRules, updateLayer7FirewallRules } from '@/lib/api/network';
import { FirewallCache } from '@/lib/firewall-cache';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { networkId } = req.query;

  if (!networkId || typeof networkId !== 'string') {
    return res.status(400).json({ error: 'Network ID is required' });
  }

  try {
    switch (req.method) {
      case 'GET':
        const rules = await getLayer7FirewallRules(networkId);
        res.status(200).json(rules);
        break;

      case 'PUT':
        const { rules: updatedRules } = req.body;
        if (!updatedRules || !Array.isArray(updatedRules)) {
          return res.status(400).json({ error: 'Rules array is required' });
        }
        
        const result = await updateLayer7FirewallRules(networkId, updatedRules);
        
        // Clear cache to force fresh data on next request
        await FirewallCache.clearNetworkCache(networkId);
        
        res.status(200).json(result);
        break;

      default:
        res.setHeader('Allow', ['GET', 'PUT']);
        res.status(405).json({ error: `Method ${req.method} not allowed` });
    }
  } catch (error) {
    console.error('Layer 7 firewall API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
