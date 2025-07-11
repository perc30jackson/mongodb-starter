import { NextApiRequest, NextApiResponse } from 'next';
import { fixDeviceProductTypes } from '@/lib/api/network';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  }

  try {
    await fixDeviceProductTypes();
    res.status(200).json({ 
      message: 'Device product types fixed successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fixing device product types:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
