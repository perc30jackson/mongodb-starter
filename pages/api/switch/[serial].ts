import type { NextApiRequest, NextApiResponse } from 'next';
import { getSwitchPorts, updateSwitchPort } from '@/lib/api/network';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { serial, portId } = req.query;

  if (typeof serial !== 'string') {
    return res.status(400).json({ error: 'Invalid device serial' });
  }

  if (req.method === 'GET') {
    try {
      const ports = await getSwitchPorts(serial);
      return res.status(200).json(ports);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  } else if (req.method === 'PUT' && typeof portId === 'string') {
    try {
      const portConfig = req.body;
      const result = await updateSwitchPort(serial, portId, portConfig);
      return res.status(200).json(result);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
}
