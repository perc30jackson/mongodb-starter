import { NextApiRequest, NextApiResponse } from 'next';
import MerakiAPI from '@/lib/meraki';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { organizationId, policyObjectId } = req.query;

  if (typeof organizationId !== 'string') {
    return res.status(400).json({ error: 'Organization ID is required' });
  }

  if (typeof policyObjectId !== 'string') {
    return res.status(400).json({ error: 'Policy Object ID is required' });
  }

  const apiKey = process.env.MERAKI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Meraki API key not configured' });
  }

  try {
    const meraki = new MerakiAPI(apiKey);
    
    switch (req.method) {
      case 'GET':
        const policyObject = await meraki.getPolicyObject(organizationId, policyObjectId);
        res.status(200).json(policyObject);
        break;
      
      default:
        res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Policy object API error:', error);
    res.status(500).json({ error: 'Failed to fetch policy object' });
  }
}
