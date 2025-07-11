import type { NextApiRequest, NextApiResponse } from 'next';
import { syncAllDeviceStatuses } from '@/lib/api/network';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    await syncAllDeviceStatuses();
    return res.status(200).json({ message: 'Device statuses synced successfully' });
  } catch (error: any) {
    console.error('Error syncing device statuses:', error);
    return res.status(500).json({ error: error.message });
  }
}
