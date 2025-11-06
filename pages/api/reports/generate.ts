import { NextApiRequest, NextApiResponse } from 'next';
import { 
  getAllNetworks,
  getNetwork,
  getNetworkDevices,
  getFirewallRules,
  getLayer7FirewallRules,
  getContentFilteringRules
} from '@/lib/api/network';
import { ReportConfig, ReportFilter } from '@/components/report-builder';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

// Initialize Meraki API client
let merakiClient: any = null;

async function getMerakiClient() {
  if (!merakiClient) {
    const { default: MerakiAPI } = await import('@/lib/meraki');
    const apiKey = process.env.MERAKI_API_KEY;
    if (!apiKey) {
      throw new Error('MERAKI_API_KEY environment variable is not set');
    }
    merakiClient = new MerakiAPI(apiKey);
  }
  return merakiClient;
}

// Helper function to store report in MongoDB
async function storeReportInMongoDB(reportConfig: ReportConfig, data: any[], metadata: any): Promise<string> {
  try {
    const client = await clientPromise;
    const db = client.db('meraki-dashboard');
    const collection = db.collection('reports');
    
    const reportDoc = {
      _id: new ObjectId(),
      reportConfig,
      data,
      metadata,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // Expire after 24 hours
      status: 'completed',
      size: JSON.stringify(data).length
    };
    
    await collection.insertOne(reportDoc);
    console.log(`Report stored in MongoDB with ID: ${reportDoc._id}`);
    
    return reportDoc._id.toString();
  } catch (error) {
    console.error('Error storing report in MongoDB:', error);
    throw error;
  }
}

// Helper function to get report from MongoDB
export async function getReportFromMongoDB(reportId: string): Promise<any> {
  try {
    const client = await clientPromise;
    const db = client.db('meraki-dashboard');
    const collection = db.collection('reports');
    
    const report = await collection.findOne({ _id: new ObjectId(reportId) });
    
    if (!report) {
      throw new Error('Report not found');
    }
    
    if (report.expiresAt < new Date()) {
      // Clean up expired report
      await collection.deleteOne({ _id: new ObjectId(reportId) });
      throw new Error('Report has expired');
    }
    
    return report;
  } catch (error) {
    console.error('Error retrieving report from MongoDB:', error);
    throw error;
  }
}

// Helper function to fetch organizations directly from Meraki API
async function fetchOrganizationsFromAPI(): Promise<any[]> {
  try {
    const meraki = await getMerakiClient();
    console.log('Fetching organizations directly from Meraki API...');
    const response = await meraki.getOrganizations();
    return Array.isArray(response) ? response : [];
  } catch (error) {
    console.error('Error fetching organizations from Meraki API:', error);
    return [];
  }
}

// Helper function to fetch organization details directly from Meraki API
async function fetchOrganizationDetailsFromAPI(orgId: string): Promise<any> {
  try {
    const meraki = await getMerakiClient();
    console.log(`Fetching organization details for ${orgId} directly from Meraki API...`);
    // Get all organizations and find the specific one
    const orgs = await meraki.getOrganizations();
    const orgList = Array.isArray(orgs) ? orgs : [];
    return orgList.find((org: any) => org.id === orgId) || null;
  } catch (error) {
    console.error(`Error fetching organization details for ${orgId} from Meraki API:`, error);
    return null;
  }
}

// Helper function to fetch organization inventory directly from Meraki API
async function fetchOrganizationInventoryFromAPI(orgId: string): Promise<any[]> {
  try {
    const meraki = await getMerakiClient();
    console.log(`Fetching inventory for ${orgId} directly from Meraki API...`);
    const response = await meraki.getOrganizationInventory(orgId);
    return Array.isArray(response) ? response : [];
  } catch (error) {
    console.error(`Error fetching inventory for ${orgId} from Meraki API:`, error);
    return [];
  }
}

// Helper function to fetch networks directly from Meraki API
async function fetchNetworksFromAPI(orgId: string): Promise<any[]> {
  try {
    const meraki = await getMerakiClient();
    console.log(`Fetching networks for ${orgId} directly from Meraki API...`);
    const response = await meraki.getNetworks(orgId);
    return Array.isArray(response) ? response : [];
  } catch (error) {
    console.error(`Error fetching networks for ${orgId} from Meraki API:`, error);
    return [];
  }
}

// Helper function to apply translations to data
async function applyTranslations(data: any[], selectedOrgs: string[]): Promise<any[]> {
  if (!data || data.length === 0) return data;

  console.log('Applying translations to backend data...');

  // Caches for policy objects and groups
  let groupCache: Record<string, string> | null = null;
  let objectCache: Record<string, string> | null = null;

  // Helper: fetch all networks for mapping
  const fetchNetworkMap = async () => {
    const allNetworks: any[] = [];
    for (const orgId of selectedOrgs) {
      try {
        const networks = await fetchNetworksFromAPI(orgId);
        allNetworks.push(...networks);
      } catch (error) {
        console.log(`Failed to fetch networks for org ${orgId}:`, error);
      }
    }
    // Map: networkId -> networkName
    const map: Record<string, string> = {};
    allNetworks.forEach(net => {
      map[net.id] = net.name;
    });
    return map;
  };

  // Declare cache variables outside the translation function
  let organizationCaches: Map<string, { groups: Record<string, string>, objects: Record<string, string> }> = new Map();

  // Helper: Build caches for all organizations upfront
  const buildOrganizationCaches = async () => {
    console.log(`Backend: Building caches for organizations: ${selectedOrgs.join(', ')}`);
    
    for (const orgId of selectedOrgs) {
      if (organizationCaches.has(orgId)) {
        console.log(`Backend: Cache already exists for org ${orgId}, skipping`);
        continue;
      }

      const orgCache: { groups: Record<string, string>, objects: Record<string, string> } = { 
        groups: {}, 
        objects: {} 
      };
      
      try {
        // Fetch groups for this organization
        const meraki = await getMerakiClient();
        console.log(`Backend: Fetching groups for organization ${orgId}`);
        const groups = await meraki.getPolicyObjectGroups(orgId);
        if (Array.isArray(groups)) {
          console.log(`Backend: Loaded ${groups.length} groups for org ${orgId}`);
          groups.forEach((group: any) => {
            orgCache.groups[group.id] = group.name;
            console.log(`Backend: Cached group ${group.id} -> ${group.name}`);
          });
        } else {
          console.log(`Backend: No groups array returned for org ${orgId}`);
        }
      } catch (error) {
        console.log(`Backend: Failed to fetch groups for org ${orgId}:`, error);
      }

      try {
        // Fetch objects for this organization
        const meraki = await getMerakiClient();
        console.log(`Backend: Fetching objects for organization ${orgId}`);
        const objects = await meraki.getPolicyObjects(orgId);
        if (Array.isArray(objects)) {
          console.log(`Backend: Loaded ${objects.length} objects for org ${orgId}`);
          objects.forEach((obj: any) => {
            orgCache.objects[obj.id] = obj.name;
            console.log(`Backend: Cached object ${obj.id} -> ${obj.name}`);
          });
        } else {
          console.log(`Backend: No objects array returned for org ${orgId}`);
        }
      } catch (error) {
        console.log(`Backend: Failed to fetch objects for org ${orgId}:`, error);
      }

      organizationCaches.set(orgId, orgCache);
      console.log(`Backend: Completed cache for org ${orgId} - Groups: ${Object.keys(orgCache.groups).length}, Objects: ${Object.keys(orgCache.objects).length}`);
    }
    
    console.log(`Backend: Cache building complete for ${organizationCaches.size} organizations`);
  };

  // Helper: Look up value in all organization caches
  const lookupInCaches = (id: string, type: 'groups' | 'objects'): string | null => {
    for (const [orgId, cache] of organizationCaches.entries()) {
      if (cache[type][id]) {
        console.log(`Backend: Found ${type.slice(0, -1)} translation in org ${orgId}: ${id} -> ${cache[type][id]}`);
        return cache[type][id];
      }
    }
    return null;
  };

  // Helper: translate GRP/OBJ values
  const translateSpecialValue = async (value: string) => {
    if (typeof value !== 'string') return value;
    
    // Check if value contains comma-separated GRP/OBJ values
    if (value.includes(',') && (value.includes('GRP(') || value.includes('OBJ('))) {
      console.log(`Backend: Processing comma-separated values: ${value}`);
      
      // Split by comma and process each part
      const parts = value.split(',').map(part => part.trim());
      const translatedParts: string[] = [];
      
      for (const part of parts) {
        const translatedPart = await translateSpecialValue(part); // Recursive call for individual parts
        translatedParts.push(translatedPart);
      }
      
      const result = translatedParts.join(', ');
      console.log(`Backend: Comma-separated translation result: ${result}`);
      return result;
    }
    
    // Handle Group references (GRP(...))
    const grpMatch = value.match(/^GRP\(([^)]+)\)$/);
    if (grpMatch) {
      const groupId = grpMatch[1];
      console.log(`Backend: Extracting group ID from ${value}: ${groupId}`);
      
      const translatedName = lookupInCaches(groupId, 'groups');
      if (translatedName) {
        console.log(`Backend: Found group translation: ${value} -> ${translatedName}`);
        return translatedName;
      }
    }
    
    // Handle Object references (OBJ(...))
    const objMatch = value.match(/^OBJ\(([^)]+)\)$/);
    if (objMatch) {
      const objectId = objMatch[1];
      console.log(`Backend: Extracting object ID from ${value}: ${objectId}`);
      
      const translatedName = lookupInCaches(objectId, 'objects');
      if (translatedName) {
        console.log(`Backend: Found object translation: ${value} -> ${translatedName}`);
        return translatedName;
      }
    }
    
    return value; // Return original if no translation found
  };

  // Apply translations to the data
  try {
    // 1. Build organization caches upfront (only once per organization)
    await buildOrganizationCaches();
    
    // 2. Always fetch network map and add networkName if networkId exists
    const networkMap = await fetchNetworkMap();
    
    const translatedData = await Promise.all(
      data.map(async (row: any) => {
        const translatedRow = { ...row };
        
        // Add network name if networkId exists
        if (row.networkId && networkMap[row.networkId]) {
          translatedRow.networkName = networkMap[row.networkId];
        }
        
        // 3. Translate GRP/OBJ values in all string fields
        for (const [key, value] of Object.entries(translatedRow)) {
          if (typeof value === 'string' && (value.includes('GRP(') || value.includes('OBJ('))) {
            console.log(`Backend: Translating ${key}: ${value}`);
            translatedRow[key] = await translateSpecialValue(value);
            console.log(`Backend: Translated to: ${translatedRow[key]}`);
          }
        }
        
        return translatedRow;
      })
    );

    console.log(`Backend: Applied translations to ${translatedData.length} rows`);
    return translatedData;
  } catch (error) {
    console.error('Backend: Error applying translations:', error);
    return data; // Return original data if translation fails
  }
}

// Helper function to fetch network devices directly from Meraki API
async function fetchNetworkDevicesFromAPI(networkId: string): Promise<any[]> {
  try {
    const meraki = await getMerakiClient();
    console.log(`Fetching devices for network ${networkId} directly from Meraki API...`);
    const response = await meraki.getNetworkDevices(networkId);
    return Array.isArray(response) ? response : [];
  } catch (error) {
    console.error(`Error fetching devices for network ${networkId} from Meraki API:`, error);
    return [];
  }
}

// Helper function to fetch firewall rules directly from Meraki API
async function fetchFirewallRulesFromAPI(networkId: string): Promise<any[]> {
  try {
    const meraki = await getMerakiClient();
    console.log(`Fetching firewall rules for network ${networkId} directly from Meraki API...`);
    const response = await meraki.getFirewallRules(networkId);
    
    // Handle different response formats
    if (Array.isArray(response)) {
      return response;
    } else if (response && Array.isArray(response.rules)) {
      return response.rules;
    } else {
      console.log(`No firewall rules found for network ${networkId}`);
      return [];
    }
  } catch (error) {
    console.error(`Error fetching firewall rules for network ${networkId} from Meraki API:`, error);
    return [];
  }
}

// Helper function to fetch Layer 7 firewall rules directly from Meraki API
async function fetchLayer7FirewallRulesFromAPI(networkId: string): Promise<any[]> {
  try {
    const meraki = await getMerakiClient();
    console.log(`Fetching Layer 7 firewall rules for network ${networkId} directly from Meraki API...`);
    const response = await meraki.getFirewallL7Rules(networkId);
    
    console.log(`Layer 7 response type: ${typeof response}, isArray: ${Array.isArray(response)}`);
    console.log(`Layer 7 response:`, JSON.stringify(response, null, 2));
    
    // Handle different response formats
    if (Array.isArray(response)) {
      return response;
    } else if (response && Array.isArray(response.rules)) {
      return response.rules;
    } else if (response && response.rules) {
      // If rules is not an array, wrap it in an array
      return [response.rules];
    } else {
      console.log(`No Layer 7 rules found for network ${networkId}`);
      return [];
    }
  } catch (error) {
    console.error(`Error fetching Layer 7 firewall rules for network ${networkId} from Meraki API:`, error);
    return [];
  }
}

// Helper function to fetch content filtering rules directly from Meraki API
async function fetchContentFilteringRulesFromAPI(networkId: string): Promise<any> {
  try {
    const meraki = await getMerakiClient();
    console.log(`Fetching content filtering rules for network ${networkId} directly from Meraki API...`);
    const response = await meraki.getContentFilteringRules(networkId);
    return response || {};
  } catch (error) {
    console.error(`Error fetching content filtering rules for network ${networkId} from Meraki API:`, error);
    return {};
  }
}

// Helper function to get all network IDs for given organizations
async function getAllNetworkIdsFromAPI(orgIds: string[]): Promise<string[]> {
  const networkIds: string[] = [];
  for (const orgId of orgIds) {
    try {
      const networks = await fetchNetworksFromAPI(orgId);
      networkIds.push(...networks.map((net: any) => net.id));
    } catch (error) {
      console.error(`Error fetching networks for org ${orgId}:`, error);
    }
  }
  return networkIds;
}

// Helper function to fetch network clients directly from Meraki API
async function fetchNetworkClientsFromAPI(networkId: string): Promise<any[]> {
  try {
    const meraki = await getMerakiClient();
    console.log(`Fetching clients for network ${networkId} directly from Meraki API...`);
    const response = await meraki.getNetworkClients(networkId);
    return Array.isArray(response) ? response : [];
  } catch (error) {
    console.error(`Error fetching clients for ${networkId} from Meraki API:`, error);
    return [];
  }
}

// Helper function to apply filters to data
function applyFilters(data: any[], filters: ReportFilter[]): any[] {
  return data.filter(item => {
    return filters.every(filter => {
      const value = getNestedValue(item, filter.field);
      const filterValue = filter.value;
      
      switch (filter.operator) {
        case 'equals':
          return String(value) === String(filterValue);
        case 'not_equals':
          return String(value) !== String(filterValue);
        case 'contains':
          if (Array.isArray(value)) {
            return value.some(v => String(v).toLowerCase().includes(String(filterValue).toLowerCase()));
          }
          return String(value).toLowerCase().includes(String(filterValue).toLowerCase());
        case 'not_contains':
          if (Array.isArray(value)) {
            return !value.some(v => String(v).toLowerCase().includes(String(filterValue).toLowerCase()));
          }
          return !String(value).toLowerCase().includes(String(filterValue).toLowerCase());
        case 'greater_than':
          return Number(value) > Number(filterValue);
        case 'less_than':
          return Number(value) < Number(filterValue);
        case 'in':
          const inValues = Array.isArray(filterValue) ? filterValue : [filterValue];
          return inValues.includes(String(value));
        case 'not_in':
          const notInValues = Array.isArray(filterValue) ? filterValue : [filterValue];
          return !notInValues.includes(String(value));
        default:
          return true;
      }
    });
  });
}

// Helper function to get nested object values
function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((curr, prop) => curr?.[prop], obj);
}

// Helper function to apply sorting
function applySorting(data: any[], sortBy: string, sortOrder: 'asc' | 'desc'): any[] {
  if (!sortBy) return data;
  
  return [...data].sort((a, b) => {
    const aVal = getNestedValue(a, sortBy);
    const bVal = getNestedValue(b, sortBy);
    
    let comparison = 0;
    
    if (aVal < bVal) comparison = -1;
    else if (aVal > bVal) comparison = 1;
    
    return sortOrder === 'desc' ? -comparison : comparison;
  });
}

// Helper function to select columns
function selectColumns(data: any[], columns: string[]): any[] {
  if (columns.length === 0) return data;
  
  return data.map(item => {
    const selectedItem: any = {};
    columns.forEach(column => {
      selectedItem[column] = getNestedValue(item, column);
    });
    return selectedItem;
  });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const reportConfig: ReportConfig = req.body;
    
    console.log('Received report config:', JSON.stringify(reportConfig, null, 2));
    console.log('Selected organizations:', reportConfig.selectedOrgs);
    console.log('Selected networks:', reportConfig.selectedNetworks);
    
    if (!reportConfig.dataSource) {
      return res.status(400).json({ error: 'Data source is required' });
    }

    if (reportConfig.selectedOrgs.length === 0) {
      return res.status(400).json({ error: 'At least one organization must be selected' });
    }

    let rawData: any[] = [];

    // Fetch data based on the selected data source
    switch (reportConfig.dataSource) {
      case 'organizations':
        const orgs = await fetchOrganizationsFromAPI();
        console.log(`Fetched ${orgs.length} total organizations from API`);
        console.log(`Filtering organizations by selectedOrgs: ${reportConfig.selectedOrgs.join(', ')}`);
        rawData = orgs.filter((org: any) => reportConfig.selectedOrgs.includes(org.id));
        console.log(`After filtering: ${rawData.length} organizations remain`);
        break;

      case 'organization-details':
        for (const orgId of reportConfig.selectedOrgs) {
          try {
            const orgDetails = await fetchOrganizationDetailsFromAPI(orgId);
            if (orgDetails) {
              rawData.push(orgDetails);
            }
          } catch (error) {
            console.error(`Error fetching details for org ${orgId}:`, error);
          }
        }
        break;

      case 'inventory':
        console.log(`Fetching inventory for organizations: ${reportConfig.selectedOrgs.join(', ')}`);
        for (const orgId of reportConfig.selectedOrgs) {
          try {
            console.log(`Fetching inventory for organization: ${orgId}`);
            const inventory = await fetchOrganizationInventoryFromAPI(orgId);
            console.log(`Found ${inventory.length} inventory items for org ${orgId}`);
            rawData.push(...inventory);
          } catch (error) {
            console.error(`Error fetching inventory for org ${orgId}:`, error);
          }
        }
        console.log(`Total inventory items collected: ${rawData.length}`);
        break;

      case 'networks':
        for (const orgId of reportConfig.selectedOrgs) {
          try {
            const networks = await fetchNetworksFromAPI(orgId);
            const filteredNetworks = reportConfig.selectedNetworks.length > 0
              ? networks.filter((net: any) => reportConfig.selectedNetworks.includes(net.id))
              : networks;
            rawData.push(...filteredNetworks);
          } catch (error) {
            console.error(`Error fetching networks for org ${orgId}:`, error);
          }
        }
        break;

      case 'network-devices':
        const networkIds = reportConfig.selectedNetworks.length > 0 
          ? reportConfig.selectedNetworks 
          : await getAllNetworkIdsFromAPI(reportConfig.selectedOrgs);
        
        for (const networkId of networkIds) {
          try {
            const devices = await fetchNetworkDevicesFromAPI(networkId);
            const devicesWithNetwork = devices.map((device: any) => ({ ...device, networkId }));
            rawData.push(...devicesWithNetwork);
          } catch (error) {
            console.error(`Error fetching devices for network ${networkId}:`, error);
          }
        }
        break;

      case 'firewall-rules':
        const firewallNetworkIds = reportConfig.selectedNetworks.length > 0 
          ? reportConfig.selectedNetworks 
          : await getAllNetworkIdsFromAPI(reportConfig.selectedOrgs);
        
        for (const networkId of firewallNetworkIds) {
          try {
            const rules = await fetchFirewallRulesFromAPI(networkId);
            const rulesWithNetwork = rules.map((rule: any) => ({ ...rule, networkId }));
            rawData.push(...rulesWithNetwork);
          } catch (error) {
            console.error(`Error fetching firewall rules for network ${networkId}:`, error);
          }
        }
        break;

      case 'layer7-firewall':
        const layer7NetworkIds = reportConfig.selectedNetworks.length > 0 
          ? reportConfig.selectedNetworks 
          : await getAllNetworkIdsFromAPI(reportConfig.selectedOrgs);
        
        for (const networkId of layer7NetworkIds) {
          try {
            const rules = await fetchLayer7FirewallRulesFromAPI(networkId);
            const rulesWithNetwork = rules.map((rule: any) => ({ ...rule, networkId }));
            rawData.push(...rulesWithNetwork);
          } catch (error) {
            console.error(`Error fetching Layer 7 rules for network ${networkId}:`, error);
          }
        }
        break;

      case 'content-filtering':
        const contentNetworkIds = reportConfig.selectedNetworks.length > 0 
          ? reportConfig.selectedNetworks 
          : await getAllNetworkIds(reportConfig.selectedOrgs);
        
        for (const networkId of contentNetworkIds) {
          try {
            const rules = await getContentFilteringRules(networkId);
            rawData.push({ ...rules, networkId });
          } catch (error) {
            console.error(`Error fetching content filtering for network ${networkId}:`, error);
          }
        }
        break;

      case 'clients':
        const clientNetworkIds = reportConfig.selectedNetworks.length > 0 
          ? reportConfig.selectedNetworks 
          : await getAllNetworkIdsFromAPI(reportConfig.selectedOrgs);
        
        for (const networkId of clientNetworkIds) {
          try {
            const clients = await fetchNetworkClientsFromAPI(networkId);
            const clientsWithNetwork = clients.map((client: any) => ({ ...client, networkId }));
            rawData.push(...clientsWithNetwork);
          } catch (error) {
            console.error(`Error fetching clients for network ${networkId}:`, error);
          }
        }
        break;

      case 'geo-locations':
        try {
          const orgIds = reportConfig.selectedOrgs.join(',');
          const netIds = reportConfig.selectedNetworks.length > 0 ? reportConfig.selectedNetworks.join(',') : '';
          const url = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/reports/geo-locations?organizationIds=${orgIds}${netIds ? `&networkIds=${netIds}` : ''}`;
          const response = await fetch(url);
          const geoData = await response.json();
          rawData = geoData.results || [];
        } catch (error) {
          console.error('Error fetching geo-location data:', error);
        }
        break;

      case 'geo-analytics':
        try {
          const orgIds = reportConfig.selectedOrgs.join(',');
          const netIds = reportConfig.selectedNetworks.length > 0 ? reportConfig.selectedNetworks.join(',') : '';
          const url = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/reports/geo-analytics?organizationIds=${orgIds}${netIds ? `&networkIds=${netIds}` : ''}`;
          const response = await fetch(url);
          const analyticsData = await response.json();
          rawData = analyticsData.results || [];
        } catch (error) {
          console.error('Error fetching geo-analytics data:', error);
        }
        break;

      case 'policy-objects':
        console.log(`Fetching policy objects for organizations: ${reportConfig.selectedOrgs.join(', ')}`);
        for (const orgId of reportConfig.selectedOrgs) {
          try {
            console.log(`Fetching policy objects for organization: ${orgId}`);
            const meraki = await getMerakiClient();
            const policyObjects = await meraki.getPolicyObjects(orgId);
            console.log(`Found ${policyObjects.length} policy objects for org ${orgId}`);
            const objectsWithOrg = Array.isArray(policyObjects) 
              ? policyObjects.map((obj: any) => ({ ...obj, organizationId: orgId }))
              : [];
            rawData.push(...objectsWithOrg);
          } catch (error) {
            console.error(`Error fetching policy objects for org ${orgId}:`, error);
          }
        }
        console.log(`Total policy objects collected: ${rawData.length}`);
        break;

      case 'policy-object-groups':
        console.log(`Fetching policy object groups for organizations: ${reportConfig.selectedOrgs.join(', ')}`);
        for (const orgId of reportConfig.selectedOrgs) {
          try {
            console.log(`Fetching policy object groups for organization: ${orgId}`);
            const meraki = await getMerakiClient();
            const policyObjectGroups = await meraki.getPolicyObjectGroups(orgId);
            console.log(`Found ${policyObjectGroups.length} policy object groups for org ${orgId}`);
            const groupsWithOrg = Array.isArray(policyObjectGroups) 
              ? policyObjectGroups.map((group: any) => ({ ...group, organizationId: orgId }))
              : [];
            rawData.push(...groupsWithOrg);
          } catch (error) {
            console.error(`Error fetching policy object groups for org ${orgId}:`, error);
          }
        }
        console.log(`Total policy object groups collected: ${rawData.length}`);
        break;

      case 'lockdown-report':
        console.log(`Generating lockdown report for organizations: ${reportConfig.selectedOrgs.join(', ')}`);
        
        // Get organization names
        const lockdownOrgs = await fetchOrganizationsFromAPI();
        const orgMap = new Map(lockdownOrgs.map((org: any) => [org.id, org]));
        
        // Get network names and track which org they belong to
        const allNetworks: any[] = [];
        const networkToOrgMap = new Map<string, string>(); // networkId -> organizationId
        
        for (const orgId of reportConfig.selectedOrgs) {
          try {
            const networks = await fetchNetworksFromAPI(orgId);
            networks.forEach((net: any) => {
              allNetworks.push(net);
              networkToOrgMap.set(net.id, orgId);
            });
          } catch (error) {
            console.error(`Error fetching networks for org ${orgId}:`, error);
          }
        }
        
        const networkMap = new Map(allNetworks.map((net: any) => [net.id, net]));
        
        // Determine which networks to process
        const lockdownNetworkIds = reportConfig.selectedNetworks.length > 0 
          ? reportConfig.selectedNetworks.filter((netId: string) => networkMap.has(netId))
          : allNetworks.map((net: any) => net.id);
        
        // Process each network
        for (const networkId of lockdownNetworkIds) {
          try {
            const network = networkMap.get(networkId);
            const orgId = networkToOrgMap.get(networkId) || network?.organizationId || '';
            const org = orgMap.get(orgId);
            
            // Fetch firewall rules for this network
            const rules = await fetchFirewallRulesFromAPI(networkId);
            
            // Filter out "Default rule" entries
            const firewallRules = Array.isArray(rules) 
              ? rules.filter((rule: any) => 
                  !rule.comment || rule.comment.toLowerCase() !== 'default rule'
                )
              : [];
            
            let hasDenyAllRule = false;
            let lastRulePolicy = 'unknown';
            let lastRuleComment = '';
            
            if (firewallRules.length > 0) {
              const lastRule = firewallRules[firewallRules.length - 1];
              lastRulePolicy = lastRule.policy || 'unknown';
              lastRuleComment = lastRule.comment || '';
              
              // Check if the last rule is a deny-all rule
              if (lastRule.policy === 'deny') {
                const srcCidr = (lastRule.srcCidr || '').toLowerCase();
                const destCidr = (lastRule.destCidr || '').toLowerCase();
                const protocol = (lastRule.protocol || '').toLowerCase();
                
                if ((srcCidr === 'any' || srcCidr === '0.0.0.0/0' || srcCidr === '::/0') &&
                    (destCidr === 'any' || destCidr === '0.0.0.0/0' || destCidr === '::/0') &&
                    (protocol === 'any' || protocol === '')) {
                  hasDenyAllRule = true;
                }
              }
            }
            
            rawData.push({
              networkId,
              networkName: network?.name || networkId,
              organizationId: orgId,
              organizationName: org?.name || orgId,
              hasDenyAllRule,
              lastRulePolicy,
              lastRuleComment
            });
          } catch (error) {
            console.error(`Error processing lockdown report for network ${networkId}:`, error);
            // Add error entry
            const network = networkMap.get(networkId);
            const orgId = networkToOrgMap.get(networkId) || network?.organizationId || reportConfig.selectedOrgs[0] || '';
            const org = orgMap.get(orgId);
            
            rawData.push({
              networkId,
              networkName: network?.name || networkId,
              organizationId: orgId,
              organizationName: org?.name || orgId,
              hasDenyAllRule: false,
              lastRulePolicy: 'ERROR',
              lastRuleComment: error instanceof Error ? error.message : 'Unknown error'
            });
          }
        }
        console.log(`Total lockdown report entries: ${rawData.length}`);
        break;

      default:
        return res.status(400).json({ error: 'Invalid data source' });
    }

    // Apply filters
    let filteredData = applyFilters(rawData, reportConfig.filters);

    // Apply sorting
    filteredData = applySorting(filteredData, reportConfig.sortBy, reportConfig.sortOrder);

    // Apply limit
    if (reportConfig.limit && reportConfig.limit > 0) {
      filteredData = filteredData.slice(0, reportConfig.limit);
    }

    // Select columns
    let finalData = selectColumns(filteredData, reportConfig.columns);

    // Apply translations to the final data
    finalData = await applyTranslations(finalData, reportConfig.selectedOrgs);

    // Create metadata
    const metadata = {
      totalRecords: rawData.length,
      filteredRecords: filteredData.length,
      returnedRecords: finalData.length,
      appliedFilters: reportConfig.filters.length,
      dataSource: reportConfig.dataSource,
      selectedOrgs: reportConfig.selectedOrgs.length,
      selectedNetworks: reportConfig.selectedNetworks.length,
      generatedAt: new Date().toISOString(),
      dataSize: JSON.stringify(finalData).length
    };

    // Store report in MongoDB and return report ID
    const reportId = await storeReportInMongoDB(reportConfig, finalData, metadata);

    // Return success with report ID and summary (not the full data)
    res.status(200).json({
      success: true,
      reportId,
      metadata,
      message: 'Report generated and stored successfully. Use the reportId to download the full data.',
      preview: finalData.slice(0, 3) // Return first 3 records as preview
    });

  } catch (error) {
    console.error('Error generating report:', error);
    res.status(500).json({ 
      error: 'Failed to generate report', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
}

// Helper function to get all network IDs for selected organizations (using cached data)
async function getAllNetworkIds(orgIds: string[]): Promise<string[]> {
  const networkIds: string[] = [];
  
  for (const orgId of orgIds) {
    try {
      const networks = await fetchNetworksFromAPI(orgId);
      networkIds.push(...networks.map((net: any) => net.id));
    } catch (error) {
      console.error(`Error fetching networks for org ${orgId}:`, error);
    }
  }
  
  return networkIds;
}
