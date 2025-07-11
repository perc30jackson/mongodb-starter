import type { NextApiRequest, NextApiResponse } from 'next';
import { updateNetworkSelection } from '@/lib/api/network';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { networkId, selected } = req.body;

    if (!networkId || typeof selected !== 'boolean') {
      return res.status(400).json({ message: 'Invalid request body' });
    }

    await updateNetworkSelection(networkId, selected);
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error updating network selection:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
