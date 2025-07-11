import type { NextApiRequest, NextApiResponse } from 'next';
import { getFirewallRules, updateFirewallRules } from '@/lib/api/network';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { networkId } = req.query;

  if (typeof networkId !== 'string') {
    return res.status(400).json({ error: 'Invalid network ID' });
  }

  if (req.method === 'GET') {
    try {
      const rules = await getFirewallRules(networkId);
      return res.status(200).json(rules);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  } else if (req.method === 'PUT') {
    try {
      const { rules } = req.body;
      const result = await updateFirewallRules(networkId, rules);
      return res.status(200).json(result);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
}
