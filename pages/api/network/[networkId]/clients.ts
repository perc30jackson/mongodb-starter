import type { NextApiRequest, NextApiResponse } from 'next';
import { getNetworkClients } from '@/lib/api/network';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { networkId } = req.query;

    if (!networkId || typeof networkId !== 'string') {
      return res.status(400).json({ message: 'Network ID is required' });
    }

    const clients = await getNetworkClients(networkId);
    return res.status(200).json(clients);
  } catch (error) {
    console.error('Error fetching network clients:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
