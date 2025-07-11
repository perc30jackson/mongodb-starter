import type { NextApiRequest, NextApiResponse } from 'next';
import { getNetworkDevices, syncDevicesFromMeraki } from '@/lib/api/network';

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

    // Try to sync devices from Meraki API first
    try {
      if (process.env.MERAKI_API_KEY) {
        await syncDevicesFromMeraki(networkId);
      }
    } catch (error) {
      console.log('Could not sync devices from Meraki API, using cached data');
    }

    const devices = await getNetworkDevices(networkId);
    return res.status(200).json(devices);
  } catch (error) {
    console.error('Error fetching network devices:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
