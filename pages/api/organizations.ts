import type { NextApiRequest, NextApiResponse } from 'next';
import MerakiAPI from '@/lib/meraki';
import { cache, cacheKeys, cacheTTL } from '@/lib/cache';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const cacheKey = cacheKeys.organizations();
    
    // Try to get from cache first
    const cachedOrganizations = await cache.get(cacheKey, 'organizations');
    if (cachedOrganizations) {
      console.log('Serving organizations from cache');
      return res.status(200).json(cachedOrganizations);
    }

    const apiKey = process.env.MERAKI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'Meraki API key not configured' });
    }

    console.log('Fetching organizations from Meraki API (cache miss)');
    
    const meraki = new MerakiAPI(apiKey);
    const organizations = await meraki.getOrganizations();
    
    console.log('Organizations fetched successfully:', organizations?.length || 0, 'items');
    
    if (!organizations) {
      return res.status(500).json({ error: 'Failed to fetch organizations from Meraki API' });
    }

    // Cache the result
    await cache.set(cacheKey, organizations, {
      type: 'organizations',
      ttl: cacheTTL.organizations
    });

    res.status(200).json(organizations);
  } catch (error) {
    console.error('Error fetching organizations:', error);
    
    // Check if it's an axios error with response details
    if (error && typeof error === 'object' && 'response' in error) {
      const axiosError = error as any;
      console.error('Axios error details:', {
        status: axiosError.response?.status,
        statusText: axiosError.response?.statusText,
        data: axiosError.response?.data
      });
      
      return res.status(500).json({ 
        error: 'Failed to fetch organizations from Meraki API',
        details: axiosError.response?.data || axiosError.message,
        status: axiosError.response?.status
      });
    }
    
    res.status(500).json({ 
      error: 'Failed to fetch organizations',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
