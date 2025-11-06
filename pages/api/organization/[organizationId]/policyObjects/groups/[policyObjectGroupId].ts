import { NextApiRequest, NextApiResponse } from 'next';
import MerakiAPI from '@/lib/meraki';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { organizationId, policyObjectGroupId } = req.query;

  if (typeof organizationId !== 'string') {
    return res.status(400).json({ error: 'Organization ID is required' });
  }

  if (typeof policyObjectGroupId !== 'string') {
    return res.status(400).json({ error: 'Policy Object Group ID is required' });
  }

  const apiKey = process.env.MERAKI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Meraki API key not configured' });
  }

  try {
    const meraki = new MerakiAPI(apiKey);
    
    switch (req.method) {
      case 'GET':
        const policyObjectGroup = await meraki.getPolicyObjectGroup(organizationId, policyObjectGroupId);
        res.status(200).json(policyObjectGroup);
        break;
      
      default:
        res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Policy object group API error:', error);
    res.status(500).json({ error: 'Failed to fetch policy object group' });
  }
}
