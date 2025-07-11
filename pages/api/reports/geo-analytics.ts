import { NextApiRequest, NextApiResponse } from 'next';
import { cache, cacheKeys } from '../../../lib/cache';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { organizationIds, networkIds, limit = 1000 } = req.query;
    
    // Get cached organizations
    const organizationsData = await cache.get(cacheKeys.organizations(), 'organizations') || [];
    const organizations = Array.isArray(organizationsData) ? organizationsData : [];
    
    // Filter organizations if specified
    const filteredOrgs = organizationIds 
      ? organizations.filter((org: any) => (organizationIds as string).split(',').includes(org.id))
      : organizations;
    
    const analyticsData = [];
    
    for (const org of filteredOrgs) {
      try {
        // Get organization details to get networks
        const orgDetailsData = await cache.get(cacheKeys.organizationDetails(org.id), 'organization-details');
        const orgDetails = orgDetailsData && typeof orgDetailsData === 'object' ? orgDetailsData as any : {};
        const networks = Array.isArray(orgDetails.networks) ? orgDetails.networks : [];
        
        // Filter networks if specified
        const filteredNetworks = networkIds 
          ? networks.filter((net: any) => (networkIds as string).split(',').includes(net.id))
          : networks;
        
        for (const network of filteredNetworks) {
          try {
            // Get devices for this network
            const devicesData = await cache.get(cacheKeys.networkDevices(network.id), 'network-devices') || [];
            const devices = Array.isArray(devicesData) ? devicesData : [];
            
            // Calculate analytics by geographic location (mock data for demo)
            const locations = [
              { country: 'United States', region: 'California', city: 'San Francisco' },
              { country: 'United States', region: 'New York', city: 'New York' },
              { country: 'United Kingdom', region: 'England', city: 'London' },
              { country: 'Germany', region: 'Bavaria', city: 'Munich' },
              { country: 'Japan', region: 'Tokyo', city: 'Tokyo' }
            ];
            
            // Pick a random location for this network
            const location = locations[Math.floor(Math.random() * locations.length)];
            
            // Calculate analytics
            const totalDevices = devices.length;
            const activeDevices = devices.filter((d: any) => d.status === 'online').length;
            const offlineDevices = totalDevices - activeDevices;
            
            analyticsData.push({
              networkId: network.id,
              networkName: network.name,
              country: location.country,
              region: location.region,
              city: location.city,
              deviceCount: totalDevices,
              activeDevices: activeDevices,
              offlineDevices: offlineDevices,
              totalBandwidthMbps: Math.floor(Math.random() * 1000) + 100, // Mock data
              utilizationPercent: Math.floor(Math.random() * 80) + 10, // Mock data
              clientCount: Math.floor(Math.random() * 500) + 50, // Mock data
              uptime: Math.floor(Math.random() * 20) + 80, // Mock data (80-100%)
              latencyMs: Math.floor(Math.random() * 50) + 10, // Mock data (10-60ms)
              dataUsageGB: Math.floor(Math.random() * 1000) + 100, // Mock data
              securityAlerts: Math.floor(Math.random() * 10), // Mock data
              reportDate: new Date().toISOString()
            });
          } catch (error) {
            console.error(`Error processing network ${network.id}:`, error);
          }
        }
      } catch (error) {
        console.error(`Error processing organization ${org.id}:`, error);
      }
    }
    
    // Apply limit
    const limitedData = analyticsData.slice(0, parseInt(limit as string));
    
    res.status(200).json({
      results: limitedData,
      total: analyticsData.length,
      returned: limitedData.length,
      cached: true
    });
    
  } catch (error) {
    console.error('Error generating geo-analytics report:', error);
    res.status(500).json({ 
      message: 'Internal server error', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
}
