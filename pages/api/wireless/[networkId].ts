import { NextApiRequest, NextApiResponse } from 'next';
import {
  getWirelessSSIDs,
  getWirelessSSID,
  updateWirelessSSID,
  getWirelessSettings,
  updateWirelessSettings,
  getWirelessRFProfiles,
  createWirelessRFProfile,
  updateWirelessRFProfile,
  deleteWirelessRFProfile,
  getWirelessClients,
  getWirelessAirMarshal,
  getWirelessAirMarshalRules,
  createWirelessAirMarshalRule,
  updateWirelessAirMarshalRule,
  deleteWirelessAirMarshalRule
} from '@/lib/api/network';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { networkId, action } = req.query;

  if (typeof networkId !== 'string') {
    return res.status(400).json({ error: 'Network ID is required' });
  }

  try {
    switch (req.method) {
      case 'GET':
        await handleGet(req, res, networkId, action as string);
        break;
      case 'POST':
        await handlePost(req, res, networkId, action as string);
        break;
      case 'PUT':
        await handlePut(req, res, networkId, action as string);
        break;
      case 'DELETE':
        await handleDelete(req, res, networkId, action as string);
        break;
      default:
        res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Wireless API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function handleGet(req: NextApiRequest, res: NextApiResponse, networkId: string, action: string) {
  const { ssidNumber, timespan, ruleId, profileId } = req.query;

  switch (action) {
    case 'ssids':
      if (ssidNumber) {
        const ssid = await getWirelessSSID(networkId, parseInt(ssidNumber as string));
        res.status(200).json(ssid);
      } else {
        const ssids = await getWirelessSSIDs(networkId);
        res.status(200).json(ssids);
      }
      break;

    case 'settings':
      const settings = await getWirelessSettings(networkId);
      res.status(200).json(settings);
      break;

    case 'rfProfiles':
      const profiles = await getWirelessRFProfiles(networkId);
      res.status(200).json(profiles);
      break;

    case 'clients':
      const clients = await getWirelessClients(networkId, parseInt(timespan as string) || 86400);
      res.status(200).json(clients);
      break;

    case 'airMarshal':
      const airMarshal = await getWirelessAirMarshal(networkId, parseInt(timespan as string) || 86400);
      res.status(200).json(airMarshal);
      break;

    case 'airMarshalRules':
      const rules = await getWirelessAirMarshalRules(networkId);
      res.status(200).json(rules);
      break;

    default:
      res.status(400).json({ error: 'Invalid action' });
  }
}

async function handlePost(req: NextApiRequest, res: NextApiResponse, networkId: string, action: string) {
  switch (action) {
    case 'rfProfiles':
      const newProfile = await createWirelessRFProfile(networkId, req.body);
      res.status(201).json(newProfile);
      break;

    case 'airMarshalRules':
      const newRule = await createWirelessAirMarshalRule(networkId, req.body);
      res.status(201).json(newRule);
      break;

    default:
      res.status(400).json({ error: 'Invalid action for POST' });
  }
}

async function handlePut(req: NextApiRequest, res: NextApiResponse, networkId: string, action: string) {
  const { ssidNumber, profileId, ruleId } = req.query;

  switch (action) {
    case 'ssids':
      if (!ssidNumber) {
        return res.status(400).json({ error: 'SSID number is required' });
      }
      const updatedSSID = await updateWirelessSSID(networkId, parseInt(ssidNumber as string), req.body);
      res.status(200).json(updatedSSID);
      break;

    case 'settings':
      const updatedSettings = await updateWirelessSettings(networkId, req.body);
      res.status(200).json(updatedSettings);
      break;

    case 'rfProfiles':
      if (!profileId) {
        return res.status(400).json({ error: 'Profile ID is required' });
      }
      const updatedProfile = await updateWirelessRFProfile(networkId, profileId as string, req.body);
      res.status(200).json(updatedProfile);
      break;

    case 'airMarshalRules':
      if (!ruleId) {
        return res.status(400).json({ error: 'Rule ID is required' });
      }
      const updatedRule = await updateWirelessAirMarshalRule(networkId, ruleId as string, req.body);
      res.status(200).json(updatedRule);
      break;

    default:
      res.status(400).json({ error: 'Invalid action for PUT' });
  }
}

async function handleDelete(req: NextApiRequest, res: NextApiResponse, networkId: string, action: string) {
  const { profileId, ruleId } = req.query;

  switch (action) {
    case 'rfProfiles':
      if (!profileId) {
        return res.status(400).json({ error: 'Profile ID is required' });
      }
      await deleteWirelessRFProfile(networkId, profileId as string);
      res.status(204).end();
      break;

    case 'airMarshalRules':
      if (!ruleId) {
        return res.status(400).json({ error: 'Rule ID is required' });
      }
      await deleteWirelessAirMarshalRule(networkId, ruleId as string);
      res.status(204).end();
      break;

    default:
      res.status(400).json({ error: 'Invalid action for DELETE' });
  }
}
