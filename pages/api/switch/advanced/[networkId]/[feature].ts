import { NextApiRequest, NextApiResponse } from 'next';
import {
  getSwitchACLs,
  updateSwitchACLs,
  getSwitchStormControl,
  updateSwitchStormControl
} from '@/lib/api/network';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { networkId, feature } = req.query;

  if (typeof networkId !== 'string') {
    return res.status(400).json({ error: 'Network ID is required' });
  }

  if (typeof feature !== 'string') {
    return res.status(400).json({ error: 'Feature type is required' });
  }

  try {
    switch (req.method) {
      case 'GET':
        await handleGet(req, res, networkId, feature);
        break;
      case 'PUT':
        await handlePut(req, res, networkId, feature);
        break;
      default:
        res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Switch advanced API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function handleGet(req: NextApiRequest, res: NextApiResponse, networkId: string, feature: string) {
  switch (feature) {
    case 'acls':
      const acls = await getSwitchACLs(networkId);
      res.status(200).json(acls);
      break;

    case 'stormControl':
      const stormControl = await getSwitchStormControl(networkId);
      res.status(200).json(stormControl);
      break;

    default:
      res.status(400).json({ error: 'Invalid feature type' });
  }
}

async function handlePut(req: NextApiRequest, res: NextApiResponse, networkId: string, feature: string) {
  switch (feature) {
    case 'acls':
      const updatedACLs = await updateSwitchACLs(networkId, req.body.rules);
      res.status(200).json(updatedACLs);
      break;

    case 'stormControl':
      const updatedStormControl = await updateSwitchStormControl(networkId, req.body);
      res.status(200).json(updatedStormControl);
      break;

    default:
      res.status(400).json({ error: 'Invalid feature type' });
  }
}
