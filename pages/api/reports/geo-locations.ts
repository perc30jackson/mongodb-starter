import { NextApiRequest, NextApiResponse } from 'next';
import { cache, cacheKeys } from '../../../lib/cache';

// IP Geolocation service (you might want to use a real service like ipinfo.io, ipapi.com, etc.)
const getLocationFromIP = async (ip: string) => {
  // For demo purposes, return mock data
  // In production, you'd call a real geolocation API
  const mockLocations = [
    { country: 'United States', countryCode: 'US', region: 'California', city: 'San Francisco', latitude: 37.7749, longitude: -122.4194, timezone: 'America/Los_Angeles', isp: 'Cloudflare', asn: 'AS13335' },
    { country: 'United States', countryCode: 'US', region: 'New York', city: 'New York', latitude: 40.7128, longitude: -74.0060, timezone: 'America/New_York', isp: 'Verizon', asn: 'AS701' },
    { country: 'United Kingdom', countryCode: 'GB', region: 'England', city: 'London', latitude: 51.5074, longitude: -0.1278, timezone: 'Europe/London', isp: 'BT Group', asn: 'AS2856' },
    { country: 'Germany', countryCode: 'DE', region: 'Bavaria', city: 'Munich', latitude: 48.1351, longitude: 11.5820, timezone: 'Europe/Berlin', isp: 'Deutsche Telekom', asn: 'AS3320' },
    { country: 'Japan', countryCode: 'JP', region: 'Tokyo', city: 'Tokyo', latitude: 35.6762, longitude: 139.6503, timezone: 'Asia/Tokyo', isp: 'NTT Communications', asn: 'AS2914' },
    { country: 'Australia', countryCode: 'AU', region: 'New South Wales', city: 'Sydney', latitude: -33.8688, longitude: 151.2093, timezone: 'Australia/Sydney', isp: 'Telstra', asn: 'AS1221' },
    { country: 'Canada', countryCode: 'CA', region: 'Ontario', city: 'Toronto', latitude: 43.6532, longitude: -79.3832, timezone: 'America/Toronto', isp: 'Rogers Communications', asn: 'AS812' },
    { country: 'France', countryCode: 'FR', region: 'Île-de-France', city: 'Paris', latitude: 48.8566, longitude: 2.3522, timezone: 'Europe/Paris', isp: 'Orange', asn: 'AS3215' },
    { country: 'Singapore', countryCode: 'SG', region: 'Singapore', city: 'Singapore', latitude: 1.3521, longitude: 103.8198, timezone: 'Asia/Singapore', isp: 'Singtel', asn: 'AS7473' },
    { country: 'Brazil', countryCode: 'BR', region: 'São Paulo', city: 'São Paulo', latitude: -23.5505, longitude: -46.6333, timezone: 'America/Sao_Paulo', isp: 'Vivo', asn: 'AS15169' }
  ];
  
  // Return a random location for demo
  return mockLocations[Math.floor(Math.random() * mockLocations.length)];
};

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
    
    const geoData = [];
    
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
            
            for (const device of devices) {
              // Skip devices without public IP
              if (!device.wan1Ip && !device.publicIp && !device.lanIp) continue;
              
              const publicIp = device.wan1Ip || device.publicIp || device.lanIp;
              
              // Get location data for the IP
              const location = await getLocationFromIP(publicIp);
              
              geoData.push({
                networkId: network.id,
                networkName: network.name,
                organizationId: org.id,
                organizationName: org.name,
                deviceSerial: device.serial,
                deviceName: device.name || `${device.model} (${device.serial})`,
                deviceModel: device.model,
                deviceType: device.productType,
                publicIp: publicIp,
                country: location.country,
                countryCode: location.countryCode,
                region: location.region,
                city: location.city,
                latitude: location.latitude,
                longitude: location.longitude,
                timezone: location.timezone,
                isp: location.isp,
                asn: location.asn,
                lastUpdated: new Date().toISOString(),
                status: device.status
              });
            }
          } catch (error) {
            console.error(`Error processing network ${network.id}:`, error);
          }
        }
      } catch (error) {
        console.error(`Error processing organization ${org.id}:`, error);
      }
    }
    
    // Apply limit
    const limitedData = geoData.slice(0, parseInt(limit as string));
    
    res.status(200).json({
      results: limitedData,
      total: geoData.length,
      returned: limitedData.length,
      cached: true
    });
    
  } catch (error) {
    console.error('Error generating geo-location report:', error);
    res.status(500).json({ 
      message: 'Internal server error', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
}
