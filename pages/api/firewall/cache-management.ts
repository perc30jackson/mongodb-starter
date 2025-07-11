import { NextApiRequest, NextApiResponse } from 'next';
import { FirewallCache } from '@/lib/firewall-cache';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  }

  try {
    const { action, networkId } = req.body;

    switch (action) {
      case 'clear-network':
        if (!networkId) {
          return res.status(400).json({ error: 'Network ID is required for clear-network action' });
        }
        await FirewallCache.clearNetworkCache(networkId);
        res.status(200).json({ message: `Cache cleared for network ${networkId}` });
        break;

      case 'clear-expired':
        await FirewallCache.clearExpiredCache();
        res.status(200).json({ message: 'Expired cache entries cleared' });
        break;

      default:
        res.status(400).json({ error: 'Invalid action. Use "clear-network" or "clear-expired"' });
    }
  } catch (error) {
    console.error('Cache management error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
