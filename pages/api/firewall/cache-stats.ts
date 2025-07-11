import { NextApiRequest, NextApiResponse } from 'next';
import clientPromise from '@/lib/mongodb';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  }

  try {
    const client = await clientPromise;
    const db = client.db('meraki-dashboard');

    // Get counts from each collection
    const [firewallRules, layer7Rules, contentFiltering] = await Promise.all([
      db.collection('firewall_rules_cache').countDocuments(),
      db.collection('layer7_rules_cache').countDocuments(),
      db.collection('content_filtering_cache').countDocuments()
    ]);

    const totalEntries = firewallRules + layer7Rules + contentFiltering;

    const stats = {
      firewallRules,
      layer7Rules,
      contentFiltering,
      totalEntries,
      lastUpdated: new Date().toISOString()
    };

    res.status(200).json(stats);
  } catch (error) {
    console.error('Error getting cache stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
