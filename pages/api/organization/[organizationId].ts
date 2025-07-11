import { NextApiRequest, NextApiResponse } from 'next';
import connectToDatabase from '@/lib/mongodb';
import CircuitBreaker from '@/lib/circuit-breaker';
import {
  getOrganizationInventory,
  getOrganizationAdmins,
  createOrganizationAdmin,
  updateOrganizationAdmin,
  deleteOrganizationAdmin,
  getOrganizationAlertsProfiles,
  createOrganizationAlertsProfile,
  getOrganizationClientsOverview,
  getOrganizationTopClientsReport,
  getOrganizationTopApplicationsReport
} from '@/lib/api/network';
import MerakiAPI from '@/lib/meraki';
import { cache, cacheKeys, cacheTTL } from '@/lib/cache';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { organizationId, action } = req.query;

  if (typeof organizationId !== 'string') {
    return res.status(400).json({ error: 'Organization ID is required' });
  }

  try {
    switch (req.method) {
      case 'GET':
        await handleGet(req, res, organizationId, action as string);
        break;
      case 'POST':
        await handlePost(req, res, organizationId, action as string);
        break;
      case 'PUT':
        await handlePut(req, res, organizationId, action as string);
        break;
      case 'DELETE':
        await handleDelete(req, res, organizationId, action as string);
        break;
      default:
        res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Organization API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function handleGet(req: NextApiRequest, res: NextApiResponse, organizationId: string, action: string) {
  const { timespan } = req.query;

  // If no action specified, return complete organization data
  if (!action) {
    return await handleGetOrganizationData(req, res, organizationId);
  }

  switch (action) {
    case 'networks':
      const apiKey = process.env.MERAKI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: 'Meraki API key not configured' });
      }
      const meraki = new MerakiAPI(apiKey);
      const networks = await meraki.getNetworks(organizationId);
      res.status(200).json(networks);
      break;

    case 'inventory':
      const inventoryCacheKey = cacheKeys.organizationInventory(organizationId);
      const cachedInventory = await cache.get(inventoryCacheKey, 'inventory');
      if (cachedInventory) {
        console.log(`Serving inventory for ${organizationId} from cache`);
        res.status(200).json(cachedInventory);
      } else {
        console.log(`Fetching inventory for ${organizationId} from API (cache miss)`);
        const inventory = await getOrganizationInventory(organizationId);
        await cache.set(inventoryCacheKey, inventory, {
          type: 'inventory',
          ttl: cacheTTL.inventory
        });
        res.status(200).json(inventory);
      }
      break;

    case 'admins':
      const admins = await getOrganizationAdmins(organizationId);
      res.status(200).json(admins);
      break;

    case 'alertsProfiles':
      const alertsProfiles = await getOrganizationAlertsProfiles(organizationId);
      res.status(200).json(alertsProfiles);
      break;

    case 'clientsOverview':
      const clientsOverview = await getOrganizationClientsOverview(
        organizationId, 
        parseInt(timespan as string) || 86400
      );
      res.status(200).json(clientsOverview);
      break;

    case 'topClients':
      const topClients = await getOrganizationTopClientsReport(
        organizationId, 
        parseInt(timespan as string) || 86400
      );
      res.status(200).json(topClients);
      break;

    case 'topApplications':
      const topApplications = await getOrganizationTopApplicationsReport(
        organizationId, 
        parseInt(timespan as string) || 86400
      );
      res.status(200).json(topApplications);
      break;

    default:
      res.status(400).json({ error: 'Invalid action' });
  }
}

async function handlePost(req: NextApiRequest, res: NextApiResponse, organizationId: string, action: string) {
  switch (action) {
    case 'admins':
      const newAdmin = await createOrganizationAdmin(organizationId, req.body);
      res.status(201).json(newAdmin);
      break;

    case 'alertsProfiles':
      const newProfile = await createOrganizationAlertsProfile(organizationId, req.body);
      res.status(201).json(newProfile);
      break;

    default:
      res.status(400).json({ error: 'Invalid action for POST' });
  }
}

async function handlePut(req: NextApiRequest, res: NextApiResponse, organizationId: string, action: string) {
  const { adminId } = req.query;

  switch (action) {
    case 'admins':
      if (!adminId) {
        return res.status(400).json({ error: 'Admin ID is required' });
      }
      const updatedAdmin = await updateOrganizationAdmin(organizationId, adminId as string, req.body);
      res.status(200).json(updatedAdmin);
      break;

    default:
      res.status(400).json({ error: 'Invalid action for PUT' });
  }
}

async function handleDelete(req: NextApiRequest, res: NextApiResponse, organizationId: string, action: string) {
  const { adminId } = req.query;

  switch (action) {
    case 'admins':
      if (!adminId) {
        return res.status(400).json({ error: 'Admin ID is required' });
      }
      await deleteOrganizationAdmin(organizationId, adminId as string);
      res.status(204).end();
      break;

    default:
      res.status(400).json({ error: 'Invalid action for DELETE' });
  }
}

async function handleGetOrganizationData(req: NextApiRequest, res: NextApiResponse, organizationId: string) {
  try {
    const cacheKey = cacheKeys.organizationDetails(organizationId);
    
    // Try to get from cache first
    const cachedData = await cache.get(cacheKey, 'organization-details');
    if (cachedData) {
      console.log(`Serving organization ${organizationId} from cache`);
      return res.status(200).json(cachedData);
    }

    console.log(`Fetching organization ${organizationId} from Meraki API (cache miss)`);
    
    const apiKey = process.env.MERAKI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'Meraki API key not configured' });
    }
    
    const meraki = new MerakiAPI(apiKey);
    
    // Get all organizations to find the current one
    const organizations = await meraki.getOrganizations();
    const organization = organizations.find((org: any) => org.id === organizationId);
    
    if (!organization) {
      return res.status(404).json({ error: 'Organization not found' });
    }
    
    // Get networks
    const networks = await meraki.getNetworks(organizationId);
    
    // Get devices from all networks with rate limiting and circuit breaker
    let devices: any[] = [];
    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
    const circuitBreaker = CircuitBreaker.getInstance();
    
    for (let i = 0; i < networks.length; i++) {
      const network = networks[i];
      const circuitKey = `getNetworkDevices-${network.id}`;
      
      try {
        // Check if circuit breaker allows this request
        if (!circuitBreaker.canExecute(circuitKey)) {
          console.log(`Circuit breaker is open for network ${network.id}, skipping...`);
          continue;
        }
        
        // Add delay between requests to avoid rate limiting
        if (i > 0) {
          await delay(2000); // Increased to 2 seconds delay between requests
        }
        
        console.log(`Fetching devices for network ${network.id} (${i + 1}/${networks.length})`);
        
        const networkDevices = await circuitBreaker.execute(circuitKey, () => 
          meraki.getNetworkDevices(network.id)
        );
        
        devices.push(...networkDevices.map((device: any) => ({ ...device, networkId: network.id })));
      } catch (error: any) {
        console.warn(`Could not fetch devices for network ${network.id}:`, error?.message || error);
        
        // If we get a rate limit error, increase the delay for subsequent requests
        if (error?.message?.includes('Rate limit') || error?.response?.status === 429) {
          console.log('Rate limit detected, increasing delay for remaining requests...');
          await delay(30000); // Wait 30 seconds before continuing
        }
      }
    }
    
    let deviceStatuses: any[] = [];
    const statusCircuitKey = `getDeviceStatuses-${organizationId}`;
    
    try {
      if (circuitBreaker.canExecute(statusCircuitKey)) {
        // Add delay before fetching device statuses
        await delay(3000); // Increased delay
        console.log('Fetching device statuses...');
        
        deviceStatuses = await circuitBreaker.execute(statusCircuitKey, () =>
          meraki.getOrganizationDevicesStatuses(organizationId)
        );
      } else {
        console.log('Circuit breaker is open for device statuses, skipping...');
      }
    } catch (error: any) {
      console.warn('Could not fetch device statuses:', error?.message || error);
    }
    
    // Create status map
    const statusMap = new Map();
    deviceStatuses.forEach((statusDevice: any) => {
      statusMap.set(statusDevice.serial, {
        status: statusDevice.status,
        lastReportedAt: statusDevice.lastReportedAt,
        lanIp: statusDevice.lanIp,
        publicIp: statusDevice.publicIp
      });
    });
    
    // Enhance devices with status and network info
    const enhancedDevices = devices.map((device: any) => {
      const statusInfo = statusMap.get(device.serial) || {};
      const network = networks.find((n: any) => n.id === device.networkId);
      
      // Fix: Use device.productType directly (single value)
      let productType = device.productType;
      if (!productType) {
        // Fallback to determining from model prefix
        if (device.model?.startsWith('MX')) {
          productType = 'appliance';
        } else if (device.model?.startsWith('MS')) {
          productType = 'switch';
        } else if (device.model?.startsWith('MR')) {
          productType = 'wireless';
        } else {
          productType = 'unknown';
        }
      }
      
      return {
        ...device,
        ...statusInfo,
        networkName: network?.name || 'Unknown Network',
        productType
      };
    });
    
    // Calculate stats
    const stats = {
      networks: networks.length,
      devices: devices.length,
      onlineDevices: enhancedDevices.filter((d: any) => d.status === 'online').length,
      offlineDevices: enhancedDevices.filter((d: any) => d.status === 'offline').length,
      alertingDevices: enhancedDevices.filter((d: any) => d.status === 'alerting').length,
      totalClients: 0, // Would need to fetch from individual networks
      totalTraffic: 0 // Would need to fetch from analytics
    };
    
    // Add device count to networks
    const enhancedNetworks = networks.map((network: any) => ({
      ...network,
      deviceCount: devices.filter((d: any) => d.networkId === network.id).length,
      status: getNetworkStatus(devices.filter((d: any) => d.networkId === network.id), statusMap)
    }));
    
    const responseData = {
      organization,
      networks: enhancedNetworks,
      devices: enhancedDevices,
      stats
    };

    // Cache the result
    await cache.set(cacheKey, responseData, {
      type: 'organization-details',
      ttl: cacheTTL.organizationDetails
    });

    res.status(200).json(responseData);
  } catch (error) {
    console.error('Error fetching organization data:', error);
    res.status(500).json({ error: 'Failed to fetch organization data' });
  }
}

function getNetworkStatus(networkDevices: any[], statusMap: Map<string, any>): 'online' | 'offline' | 'alerting' {
  if (networkDevices.length === 0) return 'offline';
  
  let hasOnline = false;
  let hasAlerting = false;
  
  for (const device of networkDevices) {
    const status = statusMap.get(device.serial)?.status;
    if (status === 'alerting') hasAlerting = true;
    if (status === 'online') hasOnline = true;
  }
  
  if (hasAlerting) return 'alerting';
  if (hasOnline) return 'online';
  return 'offline';
}
