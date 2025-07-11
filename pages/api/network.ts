import type { NextApiRequest, NextApiResponse } from 'next';
import { searchNetworks, getAllNetworks, getNetworkCount } from '@/lib/api/network';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { query } = req.query;

    if (query && typeof query === 'string') {
      const networks = await searchNetworks(query);
      return res.status(200).json(networks);
    } else {
      const results = await getAllNetworks();
      const totalNetworks = await getNetworkCount();
      return res.status(200).json({ results, totalNetworks });
    }
  } catch (error) {
    console.error('Error in network API:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
