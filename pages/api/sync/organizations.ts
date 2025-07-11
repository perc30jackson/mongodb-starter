import { NextApiRequest, NextApiResponse } from 'next';
import MerakiAPI from '@/lib/meraki';
import { cache, cacheKeys } from '@/lib/cache';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Set up SSE headers for streaming progress
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');

  const sendProgress = (data: any) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  try {
    const apiKey = process.env.MERAKI_API_KEY;
    if (!apiKey) {
      sendProgress({ error: 'MERAKI_API_KEY not configured' });
      res.end();
      return;
    }

    const meraki = new MerakiAPI(apiKey);
    
    sendProgress({ 
      status: 'starting', 
      message: 'Starting controlled sync...',
      rateLimiter: meraki.getRateLimiterStatus()
    });

    // Step 1: Fetch organizations
    sendProgress({ 
      status: 'progress', 
      step: 'organizations',
      message: 'Fetching organizations...',
      rateLimiter: meraki.getRateLimiterStatus()
    });

    const organizations = await meraki.getOrganizations();
    await cache.set(cacheKeys.organizations(), organizations, { type: 'organizations' });
    
    sendProgress({ 
      status: 'progress', 
      step: 'organizations',
      message: `Found ${organizations.length} organizations`,
      count: organizations.length,
      rateLimiter: meraki.getRateLimiterStatus()
    });

    // Step 2: Process each organization with rate limiting
    for (let i = 0; i < organizations.length; i++) {
      const org = organizations[i];
      
      sendProgress({ 
        status: 'progress', 
        step: 'organization-details',
        message: `Processing organization ${i + 1}/${organizations.length}: ${org.name}`,
        current: i + 1,
        total: organizations.length,
        organizationName: org.name,
        rateLimiter: meraki.getRateLimiterStatus()
      });

      try {
        // Fetch networks for this organization
        const networks = await meraki.getNetworks(org.id);
        
        // Store organization details with networks
        const orgDetails = {
          ...org,
          networks: networks || []
        };
        
        await cache.set(cacheKeys.organizationDetails(org.id), orgDetails, { type: 'organization-details' });
        
        sendProgress({ 
          status: 'progress', 
          step: 'organization-details',
          message: `Organization ${org.name}: ${networks?.length || 0} networks`,
          organizationName: org.name,
          networkCount: networks?.length || 0,
          rateLimiter: meraki.getRateLimiterStatus()
        });

        // Process networks for devices (limited to first 5 networks to avoid too many calls)
        const networksToProcess = (networks || []).slice(0, 5);
        for (let j = 0; j < networksToProcess.length; j++) {
          const network = networksToProcess[j];
          
          sendProgress({ 
            status: 'progress', 
            step: 'network-devices',
            message: `Processing network ${j + 1}/${networksToProcess.length} in ${org.name}: ${network.name}`,
            organizationName: org.name,
            networkName: network.name,
            rateLimiter: meraki.getRateLimiterStatus()
          });

          try {
            const devices = await meraki.getNetworkDevices(network.id);
            await cache.set(cacheKeys.networkDevices(network.id), devices || [], { type: 'network-devices' });
            
            sendProgress({ 
              status: 'progress', 
              step: 'network-devices',
              message: `Network ${network.name}: ${devices?.length || 0} devices`,
              networkName: network.name,
              deviceCount: devices?.length || 0,
              rateLimiter: meraki.getRateLimiterStatus()
            });
            
          } catch (error: any) {
            sendProgress({ 
              status: 'warning', 
              step: 'network-devices',
              message: `Failed to fetch devices for network ${network.name}: ${error.message}`,
              networkName: network.name,
              error: error.message,
              rateLimiter: meraki.getRateLimiterStatus()
            });
          }
        }

        if (networks && networks.length > 5) {
          sendProgress({ 
            status: 'info', 
            step: 'network-devices',
            message: `Skipped ${networks.length - 5} networks in ${org.name} to avoid rate limits`,
            organizationName: org.name,
            skippedCount: networks.length - 5,
            rateLimiter: meraki.getRateLimiterStatus()
          });
        }

      } catch (error: any) {
        sendProgress({ 
          status: 'error', 
          step: 'organization-details',
          message: `Failed to process organization ${org.name}: ${error.message}`,
          organizationName: org.name,
          error: error.message,
          rateLimiter: meraki.getRateLimiterStatus()
        });
      }
    }

    sendProgress({ 
      status: 'completed', 
      message: 'Sync completed successfully!',
      rateLimiter: meraki.getRateLimiterStatus()
    });

  } catch (error: any) {
    sendProgress({ 
      status: 'error', 
      message: `Sync failed: ${error.message}`,
      error: error.message
    });
  }

  res.end();
}
