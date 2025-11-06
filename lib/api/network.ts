import clientPromise from '@/lib/mongodb';
import MerakiAPI from '@/lib/meraki';

export interface NetworkProps {
  id: string;
  organizationId: string;
  name: string;
  productTypes: string[];
  timeZone: string;
  tags: string[];
  enrollmentString?: string;
  url: string;
  notes?: string;
  isBoundToConfigTemplate?: boolean;
  selected?: boolean;
}

export interface DeviceProps {
  serial: string;
  mac: string;
  name?: string;
  model: string;
  networkId: string;
  productType: string;
  firmware: string;
  lanIp?: string;
  wan1Ip?: string;
  publicIp?: string;
  address?: string;
  lat?: number;
  lng?: number;
  tags: string[];
  url: string;
  status?: 'online' | 'offline' | 'alerting' | 'dormant';
  lastReportedAt?: string;
  lastStatusUpdate?: string; // Changed from Date to string for JSON serialization
}

export interface FirewallRule {
  comment?: string;
  policy: 'allow' | 'deny';
  protocol: 'tcp' | 'udp' | 'icmp' | 'icmp6' | 'any';
  destPort?: string;
  destCidr?: string;
  srcPort?: string;
  srcCidr?: string;
  syslogEnabled?: boolean;
}

export interface FirewallRulesResponse {
  rules: FirewallRule[];
}

export interface ResultProps {
  _id: string;
  networks: NetworkProps[];
}

// Note: MerakiAPI instance should be created per-request with proper API key validation
// This global instance is only used for cached data retrieval functions
// For API operations, use functions that create MerakiAPI with validated API key
let meraki: MerakiAPI | null = null;

function getMerakiInstance(): MerakiAPI {
  if (!meraki) {
    const apiKey = process.env.MERAKI_API_KEY;
    if (!apiKey) {
      throw new Error('MERAKI_API_KEY environment variable is not set');
    }
    meraki = new MerakiAPI(apiKey);
  }
  return meraki;
}

export async function getNetwork(networkId: string): Promise<NetworkProps | null> {
  try {
    // Try to get from cache first
    const { getNetworkCache, setNetworkCache } = await import('@/lib/cache');
    const cached = await getNetworkCache(networkId) as NetworkProps | null;
    if (cached) {
      console.log(`Cache HIT: network:${networkId}`);
      return cached;
    }

    console.log(`Cache MISS: network:${networkId}`);
    console.log(`Fetching network ${networkId} from database (cache miss)`);

    const client = await clientPromise;
    const collection = client.db('meraki-dashboard').collection('networks');
    const result = await collection.findOne<NetworkProps>(
      { id: networkId },
      { projection: { _id: 0 } }
    );

    if (result) {
      // Cache the result for 15 minutes
      await setNetworkCache(networkId, result, 900);
      console.log(`Cache SET: network:${networkId} (TTL: 900s)`);
    }

    return result;
  } catch (error) {
    console.error('Error fetching network:', error);
    throw error;
  }
}

export async function getAllNetworks(): Promise<ResultProps[]> {
  const client = await clientPromise;
  const collection = client.db('meraki-dashboard').collection('networks');
  return await collection
    .aggregate<ResultProps>([
      {
        $sort: {
          name: 1
        }
      },
      {
        $limit: 200 // Increased limit for better user experience
      },
      {
        $group: {
          _id: {
            $toLower: { $substrCP: ['$name', 0, 1] }
          },
          networks: {
            $push: {
              id: '$id',
              organizationId: '$organizationId',
              name: '$name',
              productTypes: '$productTypes',
              timeZone: '$timeZone',
              tags: '$tags',
              url: '$url',
              selected: { $ifNull: ['$selected', false] }
            }
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: {
          _id: 1
        }
      }
    ])
    .toArray();
}

export async function searchNetworks(query: string): Promise<NetworkProps[]> {
  const client = await clientPromise;
  const collection = client.db('meraki-dashboard').collection('networks');
  return await collection
    .find<NetworkProps>(
      {
        $or: [
          { name: { $regex: query, $options: 'i' } },
          { tags: { $in: [new RegExp(query, 'i')] } }
        ]
      },
      { projection: { _id: 0 } }
    )
    .limit(10)
    .toArray();
}

export async function getNetworkCount(): Promise<number> {
  const client = await clientPromise;
  const collection = client.db('meraki-dashboard').collection('networks');
  return await collection.countDocuments();
}

export async function updateNetworkSelection(networkId: string, selected: boolean) {
  const client = await clientPromise;
  const collection = client.db('meraki-dashboard').collection('networks');
  return await collection.updateOne(
    { id: networkId },
    { $set: { selected } }
  );
}

export async function getSelectedNetworks(): Promise<NetworkProps[]> {
  const client = await clientPromise;
  const collection = client.db('meraki-dashboard').collection('networks');
  return await collection
    .find<NetworkProps>(
      { selected: true },
      { projection: { _id: 0 } }
    )
    .toArray();
}

export async function getNetworkDevices(networkId: string): Promise<DeviceProps[]> {
  try {
    // Try to get from cache first
    const { cache } = await import('@/lib/cache');
    const cacheKey = `network-devices:${networkId}`;
    const cached = await cache.get(cacheKey, 'network-devices') as DeviceProps[] | null;
    if (cached) {
      console.log(`Cache HIT: ${cacheKey}`);
      // Ensure cached data is properly serialized
      return cached.map(device => serializeDeviceForJSON(device));
    }

    console.log(`Cache MISS: ${cacheKey}`);
    console.log(`Fetching devices for network ${networkId} from database (cache miss)`);

    const client = await clientPromise;
    const collection = client.db('meraki-dashboard').collection('devices');
    const devices = await collection
      .find<DeviceProps>(
        { networkId },
        { projection: { _id: 0 } }
      )
      .toArray();
      
    // Fix any devices with missing or incorrect productType and serialize dates
    const fixedDevices = devices.map(device => serializeDeviceForJSON({
      ...device,
      productType: device.productType && device.productType !== 'unknown' 
        ? device.productType 
        : getProductTypeFromModel(device.model)
    }));
    
    // Update any devices that were fixed
    const devicesNeedingUpdate = fixedDevices.filter((device, index) => 
      device.productType !== devices[index].productType
    );
    
    if (devicesNeedingUpdate.length > 0) {
      const updatePromises = devicesNeedingUpdate.map(device =>
        collection.updateOne(
          { serial: device.serial },
          { $set: { productType: device.productType } }
        )
      );
      await Promise.all(updatePromises);
      console.log(`Fixed productType for ${devicesNeedingUpdate.length} devices`);
    }

    // Cache the result for 5 minutes
    await cache.set(cacheKey, fixedDevices, { ttl: 300, type: 'network-devices' });
    console.log(`Cache SET: ${cacheKey} (TTL: 300s)`);

    return fixedDevices;
  } catch (error) {
    console.error('Error fetching network devices:', error);
    throw error;
  }
}

export async function syncNetworksFromMeraki(): Promise<void> {
  try {
    // Check if we've synced recently to avoid unnecessary API calls
    const { cache } = await import('@/lib/cache');
    const syncCacheKey = 'network-sync:last-sync';
    const lastSync = await cache.get(syncCacheKey, 'sync-status') as string | null;
    
    // Only sync if we haven't synced in the last 10 minutes
    if (lastSync && Date.now() - new Date(lastSync).getTime() < 10 * 60 * 1000) {
      console.log('Skipping network sync - recently synced');
      return;
    }

    console.log('Starting network sync from Meraki API...');
    const organizations = await getMerakiInstance().getOrganizations();
    const client = await clientPromise;
    const networksCollection = client.db('meraki-dashboard').collection('networks');
    
    for (const org of organizations) {
      const networks = await getMerakiInstance().getNetworks(org.id);
      
      for (const network of networks) {
        await networksCollection.updateOne(
          { id: network.id },
          { $set: { ...network, organizationId: org.id } },
          { upsert: true }
        );
      }
    }
    
    // Update sync timestamp
    await cache.set(syncCacheKey, new Date().toISOString(), { type: 'sync-status', ttl: 600 }); // 10 minutes TTL
    console.log('Network sync completed successfully');
  } catch (error) {
    console.error('Error syncing networks from Meraki:', error);
    throw error;
  }
}

export async function syncDevicesFromMeraki(networkId: string): Promise<void> {
  try {
    const devices = await getMerakiInstance().getNetworkDevices(networkId);
    const client = await clientPromise;
    const devicesCollection = client.db('meraki-dashboard').collection('devices');
    
    // Get the organization ID for this network to fetch device statuses
    const network = await getNetwork(networkId);
    if (!network) {
      throw new Error('Network not found');
    }
    
    // Fetch device statuses for this network
    let deviceStatuses: any[] = [];
    try {
      deviceStatuses = await getMerakiInstance().getOrganizationDevicesStatuses(network.organizationId, [networkId]);
    } catch (error) {
      console.warn('Could not fetch device statuses, proceeding without status info:', error);
    }
    
    // Create a map of serial to status for quick lookup
    const statusMap = new Map();
    deviceStatuses.forEach(statusDevice => {
      statusMap.set(statusDevice.serial, {
        status: statusDevice.status,
        lastReportedAt: statusDevice.lastReportedAt,
        lanIp: statusDevice.lanIp,
        publicIp: statusDevice.publicIp
      });
    });
    
    // Update devices with status information
    for (const device of devices) {
      const statusInfo = statusMap.get(device.serial);
      const deviceData = {
        ...device,
        networkId,
        productType: device.productType || getProductTypeFromModel(device.model),
        ...(statusInfo && {
          status: statusInfo.status,
          lastReportedAt: statusInfo.lastReportedAt,
          lanIp: statusInfo.lanIp || device.lanIp,
          publicIp: statusInfo.publicIp
        })
      };
      
      await devicesCollection.updateOne(
        { serial: device.serial },
        { $set: deviceData },
        { upsert: true }
      );
    }
  } catch (error) {
    console.error('Error syncing devices from Meraki:', error);
    throw error;
  }
}

// Firewall management functions
export async function getFirewallRules(networkId: string): Promise<FirewallRule[]> {
  try {
    const { FirewallCache } = await import('@/lib/firewall-cache');
    
    // Try to get from cache first
    const cachedRules = await FirewallCache.getFirewallRules(networkId);
    if (cachedRules) {
      return cachedRules;
    }

    console.log(`Fetching firewall rules for ${networkId} from Meraki API (cache miss)`);
    
    const response: FirewallRulesResponse = await getMerakiInstance().getFirewallRules(networkId);
    const rules = response.rules || [];
    
    // Cache the results
    await FirewallCache.setFirewallRules(networkId, rules);
    
    return rules;
  } catch (error) {
    console.error('Error fetching firewall rules:', error);
    return [];
  }
}

export async function updateFirewallRules(networkId: string, rules: FirewallRule[]): Promise<FirewallRulesResponse> {
  try {
    const { FirewallCache } = await import('@/lib/firewall-cache');
    
    const result = await getMerakiInstance().updateFirewallRules(networkId, rules);
    
    // Update cache with new rules
    await FirewallCache.setFirewallRules(networkId, rules);
    
    return result;
  } catch (error) {
    console.error('Error updating firewall rules:', error);
    throw error;
  }
}

// Extended firewall management functions
export async function getFirewallL7Rules(networkId: string) {
  const merakiApi = new MerakiAPI(process.env.MERAKI_API_KEY!);
  return await merakiApi.getFirewallL7Rules(networkId);
}

export async function updateFirewallL7Rules(networkId: string, rules: any[]) {
  const merakiApi = new MerakiAPI(process.env.MERAKI_API_KEY!);
  return await merakiApi.updateFirewallL7Rules(networkId, rules);
}

export async function getFirewallPortForwardingRules(networkId: string) {
  const merakiApi = new MerakiAPI(process.env.MERAKI_API_KEY!);
  return await merakiApi.getFirewallPortForwardingRules(networkId);
}

export async function updateFirewallPortForwardingRules(networkId: string, rules: any[]) {
  const merakiApi = new MerakiAPI(process.env.MERAKI_API_KEY!);
  return await merakiApi.updateFirewallPortForwardingRules(networkId, rules);
}

export async function getFirewallOneToOneNatRules(networkId: string) {
  const merakiApi = new MerakiAPI(process.env.MERAKI_API_KEY!);
  return await merakiApi.getFirewallOneToOneNatRules(networkId);
}

export async function updateFirewallOneToOneNatRules(networkId: string, rules: any[]) {
  const merakiApi = new MerakiAPI(process.env.MERAKI_API_KEY!);
  return await merakiApi.updateFirewallOneToOneNatRules(networkId, rules);
}

export async function getFirewallOneToManyNatRules(networkId: string) {
  const merakiApi = new MerakiAPI(process.env.MERAKI_API_KEY!);
  return await merakiApi.getFirewallOneToManyNatRules(networkId);
}

// Legacy content filtering functions (will be replaced by new implementation)
export async function getContentFilteringRulesLegacy(networkId: string) {
  const merakiApi = new MerakiAPI(process.env.MERAKI_API_KEY!);
  return await merakiApi.getContentFilteringRules(networkId);
}

export async function updateContentFilteringRulesLegacy(networkId: string, rules: any) {
  const merakiApi = new MerakiAPI(process.env.MERAKI_API_KEY!);
  return await merakiApi.updateContentFilteringRules(networkId, rules);
}

// Security and intrusion detection
export async function getSecurityIntrusion(networkId: string) {
  const merakiApi = new MerakiAPI(process.env.MERAKI_API_KEY!);
  return await merakiApi.getSecurityIntrusion(networkId);
}

export async function getSecurityMalware(networkId: string) {
  const merakiApi = new MerakiAPI(process.env.MERAKI_API_KEY!);
  return await merakiApi.getSecurityMalware(networkId);
}

export async function getFirewalledServices(networkId: string) {
  const merakiApi = new MerakiAPI(process.env.MERAKI_API_KEY!);
  return await merakiApi.getFirewalledServices(networkId);
}

export async function getFirewalledService(networkId: string, service: string) {
  const merakiApi = new MerakiAPI(process.env.MERAKI_API_KEY!);
  return await merakiApi.getFirewalledService(networkId, service);
}

export async function updateFirewalledService(networkId: string, service: string, config: any) {
  const merakiApi = new MerakiAPI(process.env.MERAKI_API_KEY!);
  return await merakiApi.updateFirewalledService(networkId, service, config);
}

// Appliance configuration
export async function getAppliancePorts(networkId: string) {
  const merakiApi = new MerakiAPI(process.env.MERAKI_API_KEY!);
  return await merakiApi.getAppliancePorts(networkId);
}

export async function updateAppliancePort(networkId: string, portId: string, config: any) {
  const merakiApi = new MerakiAPI(process.env.MERAKI_API_KEY!);
  return await merakiApi.updateAppliancePort(networkId, portId, config);
}

// Group policies
export async function getGroupPolicies(networkId: string) {
  const merakiApi = new MerakiAPI(process.env.MERAKI_API_KEY!);
  return await merakiApi.getGroupPolicies(networkId);
}

export async function createGroupPolicy(networkId: string, policy: any) {
  const merakiApi = new MerakiAPI(process.env.MERAKI_API_KEY!);
  return await merakiApi.createGroupPolicy(networkId, policy);
}

export async function updateGroupPolicy(networkId: string, groupPolicyId: string, policy: any) {
  const merakiApi = new MerakiAPI(process.env.MERAKI_API_KEY!);
  return await merakiApi.updateGroupPolicy(networkId, groupPolicyId, policy);
}

export async function deleteGroupPolicy(networkId: string, groupPolicyId: string) {
  const merakiApi = new MerakiAPI(process.env.MERAKI_API_KEY!);
  return await merakiApi.deleteGroupPolicy(networkId, groupPolicyId);
}

// Policy objects (organization level)
export async function getPolicyObjects(organizationId: string) {
  const merakiApi = new MerakiAPI(process.env.MERAKI_API_KEY!);
  return await merakiApi.getPolicyObjects(organizationId);
}

export async function createPolicyObject(organizationId: string, policyObject: any) {
  const merakiApi = new MerakiAPI(process.env.MERAKI_API_KEY!);
  return await merakiApi.createPolicyObject(organizationId, policyObject);
}

export async function updatePolicyObject(organizationId: string, policyObjectId: string, policyObject: any) {
  const merakiApi = new MerakiAPI(process.env.MERAKI_API_KEY!);
  return await merakiApi.updatePolicyObject(organizationId, policyObjectId, policyObject);
}

export async function deletePolicyObject(organizationId: string, policyObjectId: string) {
  const merakiApi = new MerakiAPI(process.env.MERAKI_API_KEY!);
  return await merakiApi.deletePolicyObject(organizationId, policyObjectId);
}

// Policy object groups
export async function getPolicyObjectGroups(organizationId: string) {
  const merakiApi = new MerakiAPI(process.env.MERAKI_API_KEY!);
  return await merakiApi.getPolicyObjectGroups(organizationId);
}

export async function createPolicyObjectGroup(organizationId: string, policyObjectGroup: any) {
  const merakiApi = new MerakiAPI(process.env.MERAKI_API_KEY!);
  return await merakiApi.createPolicyObjectGroup(organizationId, policyObjectGroup);
}

export async function updatePolicyObjectGroup(organizationId: string, policyObjectGroupId: string, policyObjectGroup: any) {
  const merakiApi = new MerakiAPI(process.env.MERAKI_API_KEY!);
  return await merakiApi.updatePolicyObjectGroup(organizationId, policyObjectGroupId, policyObjectGroup);
}

export async function deletePolicyObjectGroup(organizationId: string, policyObjectGroupId: string) {
  const merakiApi = new MerakiAPI(process.env.MERAKI_API_KEY!);
  return await merakiApi.deletePolicyObjectGroup(organizationId, policyObjectGroupId);
}

// Network configuration
export async function getNetworkDetails(networkId: string) {
  const merakiApi = new MerakiAPI(process.env.MERAKI_API_KEY!);
  return await merakiApi.getNetworkDetails(networkId);
}

export async function updateNetworkDetails(networkId: string, config: any) {
  const merakiApi = new MerakiAPI(process.env.MERAKI_API_KEY!);
  return await merakiApi.updateNetworkDetails(networkId, config);
}

// VLAN management
export async function getVlanDetails(networkId: string, vlanId: string) {
  const merakiApi = new MerakiAPI(process.env.MERAKI_API_KEY!);
  return await merakiApi.getVlanDetails(networkId, vlanId);
}

export async function createVlan(networkId: string, vlan: any) {
  const merakiApi = new MerakiAPI(process.env.MERAKI_API_KEY!);
  return await merakiApi.createVlan(networkId, vlan);
}

export async function updateVlan(networkId: string, vlanId: string, vlan: any) {
  const merakiApi = new MerakiAPI(process.env.MERAKI_API_KEY!);
  return await merakiApi.updateVlan(networkId, vlanId, vlan);
}

export async function deleteVlan(networkId: string, vlanId: string) {
  const merakiApi = new MerakiAPI(process.env.MERAKI_API_KEY!);
  return await merakiApi.deleteVlan(networkId, vlanId);
}

// Network monitoring
export async function getNetworkEvents(networkId: string, productType?: string, timespan = 86400) {
  const merakiApi = new MerakiAPI(process.env.MERAKI_API_KEY!);
  return await merakiApi.getNetworkEvents(networkId, productType, timespan);
}

export async function getNetworkTrafficAnalysis(networkId: string, timespan = 86400) {
  const merakiApi = new MerakiAPI(process.env.MERAKI_API_KEY!);
  return await merakiApi.getNetworkTrafficAnalysis(networkId, timespan);
}

// Device monitoring
export async function getDeviceUplinks(serial: string) {
  const merakiApi = new MerakiAPI(process.env.MERAKI_API_KEY!);
  return await merakiApi.getDeviceUplinks(serial);
}

export async function getDeviceLossAndLatency(networkId: string, serial: string, timespan = 86400) {
  const merakiApi = new MerakiAPI(process.env.MERAKI_API_KEY!);
  return await merakiApi.getDeviceLossAndLatency(networkId, serial, timespan);
}

// Configuration templates
export async function getConfigTemplates(organizationId: string) {
  const merakiApi = new MerakiAPI(process.env.MERAKI_API_KEY!);
  return await merakiApi.getConfigTemplates(organizationId);
}

// Interface definitions for new types
export interface L7FirewallRule {
  policy: 'deny' | 'allow';
  type: 'application' | 'applicationCategory' | 'host' | 'port' | 'ipRange';
  value: string | { id: string; name: string };
}

export interface PortForwardingRule {
  name: string;
  protocol: 'tcp' | 'udp';
  publicPort: string;
  localIp: string;
  localPort: string;
  allowedIps: string[];
}

export interface OneToOneNatRule {
  name: string;
  publicIp: string;
  lanIp: string;
  allowedInbound: Array<{
    protocol: 'any' | 'tcp' | 'udp' | 'icmp';
    allowedIps: string[];
    destinationPorts: string[];
  }>;
}

export interface OneToManyNatRule {
  protocol: 'tcp' | 'udp';
  publicPort: string;
  localIp: string;
  localPort: string;
  allowedIps: string[];
}

export interface ContentFilteringRuleLegacy {
  policy: 'allow' | 'block';
  type: 'url' | 'domain' | 'ipAddress' | 'ipRange';
  value: string;
}

export interface SecurityIntrusionSettings {
  mode: 'disabled' | 'detection' | 'prevention';
  idsRulesets: 'connectivity' | 'balanced' | 'security';
  protectedNetworks: {
    useDefault: boolean;
    includedCidr: string[];
    excludedCidr: string[];
  };
}

export interface GroupPolicy {
  groupPolicyId?: string;
  name: string;
  scheduling?: {
    enabled: boolean;
    monday?: { active: boolean; from: string; to: string };
    tuesday?: { active: boolean; from: string; to: string };
    wednesday?: { active: boolean; from: string; to: string };
    thursday?: { active: boolean; from: string; to: string };
    friday?: { active: boolean; from: string; to: string };
    saturday?: { active: boolean; from: string; to: string };
    sunday?: { active: boolean; from: string; to: string };
  };
  bandwidth?: {
    settings: 'network default' | 'ignore' | 'custom';
    bandwidthLimits?: {
      limitUp?: number;
      limitDown?: number;
    };
  };
  firewallAndTrafficShaping?: {
    settings: 'network default' | 'ignore' | 'custom';
    trafficShapingRules?: any[];
    l3FirewallRules?: any[];
    l7FirewallRules?: any[];
  };
  contentFiltering?: {
    allowedUrlPatterns?: {
      settings: 'network default' | 'ignore' | 'custom';
      patterns?: string[];
    };
    blockedUrlPatterns?: {
      settings: 'network default' | 'ignore' | 'custom';
      patterns?: string[];
    };
    blockedUrlCategories?: {
      settings: 'network default' | 'ignore' | 'custom';
      categories?: string[];
    };
  };
  splashAuthSettings?: 'network default' | 'bypass';
  vlanTagging?: {
    settings: 'network default' | 'ignore' | 'custom';
    vlanId?: string;
  };
  bonjourForwarding?: {
    settings: 'network default' | 'ignore' | 'custom';
    rules?: Array<{
      description: string;
      vlanId: string;
      services: string[];
    }>;
  };
}

export interface PolicyObject {
  id?: string;
  name: string;
  category: 'network' | 'adaptivePolicy' | 'application';
  type: 'cidr' | 'fqdn' | 'ipAndMask';
  cidr?: string;
  fqdn?: string;
  mask?: string;
  ip?: string;
  groupIds?: string[];
  networkId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface PolicyObjectGroup {
  id?: string;
  name: string;
  category: 'network' | 'adaptivePolicy' | 'application';
  objectIds: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface VlanConfig {
  id: string;
  name: string;
  subnet: string;
  applianceIp: string;
  groupPolicyId?: string;
  templateVlanType?: 'same' | 'unique';
  cidr?: string;
  mask?: number;
  dhcpHandling?: 'Run a DHCP server' | 'Relay DHCP to another server' | 'Do not respond to DHCP requests';
  dhcpLeaseTime?: '30 minutes' | '1 hour' | '4 hours' | '12 hours' | '1 day' | '1 week';
  dhcpBootOptionsEnabled?: boolean;
  dhcpOptions?: Array<{
    code: string;
    type: 'text' | 'ip' | 'hex' | 'integer';
    value: string;
  }>;
  reservedIpRanges?: Array<{
    start: string;
    end: string;
    comment: string;
  }>;
  dnsNameservers?: 'upstream_dns' | 'google_dns' | 'opendns' | 'custom';
  customDnsNameservers?: string[];
  vpnNatSubnet?: string;
  mandatoryDhcp?: {
    enabled: boolean;
  };
}

// Device action functions
export async function blinkDeviceLeds(serial: string, duration: number = 20) {
  try {
    // Need to get networkId for this device first
    const client = await clientPromise;
    const db = client.db();
    const device = await db.collection('devices').findOne({ serial });
    if (!device) {
      throw new Error('Device not found');
    }
    return await getMerakiInstance().blinkDeviceLeds(device.networkId, serial, duration);
  } catch (error) {
    console.error('Error blinking device LEDs:', error);
    throw error;
  }
}

export async function rebootDevice(serial: string) {
  try {
    // Need to get networkId for this device first
    const client = await clientPromise;
    const db = client.db();
    const device = await db.collection('devices').findOne({ serial });
    if (!device) {
      throw new Error('Device not found');
    }
    return await getMerakiInstance().rebootDevice(device.networkId, serial);
  } catch (error) {
    console.error('Error rebooting device:', error);
    throw error;
  }
}

export async function getNetworkClients(networkId: string, timespan = 2592000) {
  try {
    if (!process.env.MERAKI_API_KEY) {
      throw new Error('Meraki API key not configured');
    }
    
    const meraki = new MerakiAPI(process.env.MERAKI_API_KEY);
    return await getMerakiInstance().getNetworkClients(networkId, timespan);
  } catch (error) {
    console.error('Error getting network clients:', error);
    throw error;
  }
}

export async function getDeviceStatus(networkId: string, serial: string) {
  try {
    if (!process.env.MERAKI_API_KEY) {
      throw new Error('Meraki API key not configured');
    }
    
    const meraki = new MerakiAPI(process.env.MERAKI_API_KEY);
    return await getMerakiInstance().getDeviceStatus(networkId, serial);
  } catch (error) {
    console.error('Error getting device status:', error);
    throw error;
  }
}

export async function syncAllDeviceStatuses(): Promise<void> {
  try {
    const organizations = await getMerakiInstance().getOrganizations();
    const client = await clientPromise;
    const devicesCollection = client.db('meraki-dashboard').collection('devices');
    
    for (const org of organizations) {
      try {
        // Get all device statuses for this organization
        const deviceStatuses = await getMerakiInstance().getOrganizationDevicesStatuses(org.id);
        
        // Update each device with its current status
        for (const statusDevice of deviceStatuses) {
          await devicesCollection.updateOne(
            { serial: statusDevice.serial },
            { 
              $set: {
                status: statusDevice.status,
                lastReportedAt: statusDevice.lastReportedAt,
                lanIp: statusDevice.lanIp || null,
                publicIp: statusDevice.publicIp || null,
                lastStatusUpdate: new Date().toISOString()
              }
            }
          );
        }
        
        console.log(`Updated statuses for ${deviceStatuses.length} devices in organization ${org.name}`);
      } catch (error) {
        console.error(`Error syncing statuses for organization ${org.name}:`, error);
        // Continue with next organization
      }
    }
  } catch (error) {
    console.error('Error syncing device statuses:', error);
    throw error;
  }
}

// Wireless management API functions
export interface WirelessSSID {
  number: number;
  name: string;
  enabled: boolean;
  ssidAdminAccessible: boolean;
  authMode: string;
  encryptionMode: string;
  wpaEncryptionMode?: string;
  radiusServers?: any[];
  ipAssignmentMode: string;
  useVlanTagging?: boolean;
  vlanId?: number;
  defaultVlanId?: number;
  visible: boolean;
  availableOnAllAps: boolean;
  availabilityTags?: string[];
  perClientBandwidthLimitUp?: number;
  perClientBandwidthLimitDown?: number;
  perSsidBandwidthLimitUp?: number;
  perSsidBandwidthLimitDown?: number;
  mandatoryDhcpEnabled?: boolean;
}

export interface WirelessRFProfile {
  id?: string;
  name: string;
  clientBalancingEnabled?: boolean;
  minBitrateType?: string;
  bandSelectionType?: string;
  apBandSettings?: any;
  twoFourGhzSettings?: any;
  fiveGhzSettings?: any;
  sixGhzSettings?: any;
  perSsidSettings?: any;
  transmission?: any;
}

export interface WirelessClient {
  id: string;
  mac: string;
  description?: string;
  ip?: string;
  user?: string;
  vlan?: number;
  namedVlan?: string;
  ssid?: string;
  status: string;
  usage: {
    sent: number;
    recv: number;
  };
  switchport?: string;
  adaptivePolicyGroup?: string;
}

export interface AirMarshalRule {
  ruleId?: string;
  type: 'allow' | 'block' | 'alert';
  match: {
    type: 'bssid' | 'contains' | 'exact';
    string: string;
  };
}

export async function getWirelessSSIDs(networkId: string): Promise<WirelessSSID[]> {
  try {
    if (!process.env.MERAKI_API_KEY) {
      throw new Error('Meraki API key not configured');
    }
    
    const meraki = new MerakiAPI(process.env.MERAKI_API_KEY);
    return await getMerakiInstance().getWirelessSSIDs(networkId);
  } catch (error) {
    console.error('Error getting wireless SSIDs:', error);
    throw error;
  }
}

export async function getWirelessSSID(networkId: string, ssidNumber: number): Promise<WirelessSSID> {
  try {
    if (!process.env.MERAKI_API_KEY) {
      throw new Error('Meraki API key not configured');
    }
    
    const meraki = new MerakiAPI(process.env.MERAKI_API_KEY);
    return await getMerakiInstance().getWirelessSSID(networkId, ssidNumber);
  } catch (error) {
    console.error('Error getting wireless SSID:', error);
    throw error;
  }
}

export async function updateWirelessSSID(networkId: string, ssidNumber: number, config: Partial<WirelessSSID>): Promise<WirelessSSID> {
  try {
    if (!process.env.MERAKI_API_KEY) {
      throw new Error('Meraki API key not configured');
    }
    
    const meraki = new MerakiAPI(process.env.MERAKI_API_KEY);
    return await getMerakiInstance().updateWirelessSSID(networkId, ssidNumber, config);
  } catch (error) {
    console.error('Error updating wireless SSID:', error);
    throw error;
  }
}

export async function getWirelessSettings(networkId: string) {
  try {
    if (!process.env.MERAKI_API_KEY) {
      throw new Error('Meraki API key not configured');
    }
    
    const meraki = new MerakiAPI(process.env.MERAKI_API_KEY);
    return await getMerakiInstance().getWirelessSettings(networkId);
  } catch (error) {
    console.error('Error getting wireless settings:', error);
    throw error;
  }
}

export async function updateWirelessSettings(networkId: string, settings: any) {
  try {
    if (!process.env.MERAKI_API_KEY) {
      throw new Error('Meraki API key not configured');
    }
    
    const meraki = new MerakiAPI(process.env.MERAKI_API_KEY);
    return await getMerakiInstance().updateWirelessSettings(networkId, settings);
  } catch (error) {
    console.error('Error updating wireless settings:', error);
    throw error;
  }
}

export async function getWirelessRFProfiles(networkId: string): Promise<WirelessRFProfile[]> {
  try {
    if (!process.env.MERAKI_API_KEY) {
      throw new Error('Meraki API key not configured');
    }
    
    const meraki = new MerakiAPI(process.env.MERAKI_API_KEY);
    return await getMerakiInstance().getWirelessRFProfiles(networkId);
  } catch (error) {
    console.error('Error getting wireless RF profiles:', error);
    throw error;
  }
}

export async function createWirelessRFProfile(networkId: string, profile: Omit<WirelessRFProfile, 'id'>): Promise<WirelessRFProfile> {
  try {
    if (!process.env.MERAKI_API_KEY) {
      throw new Error('Meraki API key not configured');
    }
    
    const meraki = new MerakiAPI(process.env.MERAKI_API_KEY);
    return await getMerakiInstance().createWirelessRFProfile(networkId, profile);
  } catch (error) {
    console.error('Error creating wireless RF profile:', error);
    throw error;
  }
}

export async function updateWirelessRFProfile(networkId: string, profileId: string, profile: Partial<WirelessRFProfile>): Promise<WirelessRFProfile> {
  try {
    if (!process.env.MERAKI_API_KEY) {
      throw new Error('Meraki API key not configured');
    }
    
    const meraki = new MerakiAPI(process.env.MERAKI_API_KEY);
    return await getMerakiInstance().updateWirelessRFProfile(networkId, profileId, profile);
  } catch (error) {
    console.error('Error updating wireless RF profile:', error);
    throw error;
  }
}

export async function deleteWirelessRFProfile(networkId: string, profileId: string): Promise<void> {
  try {
    await getMerakiInstance().deleteWirelessRFProfile(networkId, profileId);
  } catch (error) {
    console.error('Error deleting wireless RF profile:', error);
    throw error;
  }
}

export async function getWirelessClients(networkId: string, timespan = 86400): Promise<WirelessClient[]> {
  try {
    if (!process.env.MERAKI_API_KEY) {
      throw new Error('Meraki API key not configured');
    }
    
    const meraki = new MerakiAPI(process.env.MERAKI_API_KEY);
    return await getMerakiInstance().getWirelessClients(networkId, timespan);
  } catch (error) {
    console.error('Error getting wireless clients:', error);
    throw error;
  }
}

export async function getWirelessAirMarshal(networkId: string, timespan = 86400) {
  try {
    if (!process.env.MERAKI_API_KEY) {
      throw new Error('Meraki API key not configured');
    }
    
    const meraki = new MerakiAPI(process.env.MERAKI_API_KEY);
    return await getMerakiInstance().getWirelessAirMarshal(networkId, timespan);
  } catch (error) {
    console.error('Error getting wireless Air Marshal data:', error);
    throw error;
  }
}

export async function getWirelessAirMarshalRules(networkId: string): Promise<AirMarshalRule[]> {
  try {
    if (!process.env.MERAKI_API_KEY) {
      throw new Error('Meraki API key not configured');
    }
    
    const meraki = new MerakiAPI(process.env.MERAKI_API_KEY);
    return await getMerakiInstance().getWirelessAirMarshalRules(networkId);
  } catch (error) {
    console.error('Error getting wireless Air Marshal rules:', error);
    throw error;
  }
}

export async function createWirelessAirMarshalRule(networkId: string, rule: Omit<AirMarshalRule, 'ruleId'>): Promise<AirMarshalRule> {
  try {
    if (!process.env.MERAKI_API_KEY) {
      throw new Error('Meraki API key not configured');
    }
    
    const meraki = new MerakiAPI(process.env.MERAKI_API_KEY);
    return await getMerakiInstance().createWirelessAirMarshalRule(networkId, rule);
  } catch (error) {
    console.error('Error creating wireless Air Marshal rule:', error);
    throw error;
  }
}

export async function updateWirelessAirMarshalRule(networkId: string, ruleId: string, rule: Partial<AirMarshalRule>): Promise<AirMarshalRule> {
  try {
    if (!process.env.MERAKI_API_KEY) {
      throw new Error('Meraki API key not configured');
    }
    
    const meraki = new MerakiAPI(process.env.MERAKI_API_KEY);
    return await getMerakiInstance().updateWirelessAirMarshalRule(networkId, ruleId, rule);
  } catch (error) {
    console.error('Error updating wireless Air Marshal rule:', error);
    throw error;
  }
}

export async function deleteWirelessAirMarshalRule(networkId: string, ruleId: string): Promise<void> {
  try {
    await getMerakiInstance().deleteWirelessAirMarshalRule(networkId, ruleId);
  } catch (error) {
    console.error('Error deleting wireless Air Marshal rule:', error);
    throw error;
  }
}

// Switch management enhancements
export interface SwitchACL {
  rules: Array<{
    comment?: string;
    policy: 'allow' | 'deny';
    ipVersion: 'ipv4' | 'ipv6' | 'any';
    protocol: 'tcp' | 'udp' | 'icmp' | 'any';
    srcCidr?: string;
    srcPort?: string;
    dstCidr?: string;
    dstPort?: string;
    vlan?: string;
  }>;
}

export async function getSwitchACLs(networkId: string): Promise<SwitchACL> {
  try {
    if (!process.env.MERAKI_API_KEY) {
      throw new Error('Meraki API key not configured');
    }
    
    const meraki = new MerakiAPI(process.env.MERAKI_API_KEY);
    return await getMerakiInstance().getSwitchACLs(networkId);
  } catch (error) {
    console.error('Error getting switch ACLs:', error);
    throw error;
  }
}

export async function updateSwitchACLs(networkId: string, rules: SwitchACL['rules']): Promise<SwitchACL> {
  try {
    if (!process.env.MERAKI_API_KEY) {
      throw new Error('Meraki API key not configured');
    }
    
    const meraki = new MerakiAPI(process.env.MERAKI_API_KEY);
    return await getMerakiInstance().updateSwitchACLs(networkId, rules);
  } catch (error) {
    console.error('Error updating switch ACLs:', error);
    throw error;
  }
}

export async function getSwitchStormControl(networkId: string) {
  try {
    if (!process.env.MERAKI_API_KEY) {
      throw new Error('Meraki API key not configured');
    }
    
    const meraki = new MerakiAPI(process.env.MERAKI_API_KEY);
    return await getMerakiInstance().getSwitchStormControl(networkId);
  } catch (error) {
    console.error('Error getting switch storm control:', error);
    throw error;
  }
}

export async function updateSwitchStormControl(networkId: string, config: any) {
  try {
    if (!process.env.MERAKI_API_KEY) {
      throw new Error('Meraki API key not configured');
    }
    
    const meraki = new MerakiAPI(process.env.MERAKI_API_KEY);
    return await getMerakiInstance().updateSwitchStormControl(networkId, config);
  } catch (error) {
    console.error('Error updating switch storm control:', error);
    throw error;
  }
}

// Organization management
export interface OrganizationAdmin {
  id?: string;
  name: string;
  email: string;
  orgAccess: 'full' | 'read-only' | 'none';
  accountStatus?: 'ok' | 'pending' | 'deactivated';
  twoFactorAuthEnabled?: boolean;
  hasApiKey?: boolean;
  networks?: Array<{
    id: string;
    access: 'full' | 'read-only' | 'monitor-only' | 'guest-ambassador';
  }>;
  tags?: Array<{
    tag: string;
    access: 'full' | 'read-only' | 'monitor-only' | 'guest-ambassador';
  }>;
}

export interface AlertProfile {
  profileId?: string;
  type: string;
  networkTags: string[];
  description?: string;
  alertCondition: any;
  recipients: {
    emails?: string[];
    httpServerIds?: string[];
  };
}

export async function getOrganizationInventory(organizationId: string) {
  try {
    if (!process.env.MERAKI_API_KEY) {
      throw new Error('Meraki API key not configured');
    }
    
    const meraki = new MerakiAPI(process.env.MERAKI_API_KEY);
    return await getMerakiInstance().getOrganizationInventory(organizationId);
  } catch (error) {
    console.error('Error getting organization inventory:', error);
    throw error;
  }
}

export async function getOrganizationAdmins(organizationId: string): Promise<OrganizationAdmin[]> {
  try {
    if (!process.env.MERAKI_API_KEY) {
      throw new Error('Meraki API key not configured');
    }
    
    const meraki = new MerakiAPI(process.env.MERAKI_API_KEY);
    return await getMerakiInstance().getOrganizationAdmins(organizationId);
  } catch (error) {
    console.error('Error getting organization admins:', error);
    throw error;
  }
}

export async function createOrganizationAdmin(organizationId: string, admin: Omit<OrganizationAdmin, 'id'>): Promise<OrganizationAdmin> {
  try {
    if (!process.env.MERAKI_API_KEY) {
      throw new Error('Meraki API key not configured');
    }
    
    const meraki = new MerakiAPI(process.env.MERAKI_API_KEY);
    return await getMerakiInstance().createOrganizationAdmin(organizationId, admin);
  } catch (error) {
    console.error('Error creating organization admin:', error);
    throw error;
  }
}

export async function updateOrganizationAdmin(organizationId: string, adminId: string, admin: Partial<OrganizationAdmin>): Promise<OrganizationAdmin> {
  try {
    if (!process.env.MERAKI_API_KEY) {
      throw new Error('Meraki API key not configured');
    }
    
    const meraki = new MerakiAPI(process.env.MERAKI_API_KEY);
    return await getMerakiInstance().updateOrganizationAdmin(organizationId, adminId, admin);
  } catch (error) {
    console.error('Error updating organization admin:', error);
    throw error;
  }
}

export async function deleteOrganizationAdmin(organizationId: string, adminId: string): Promise<void> {
  try {
    await getMerakiInstance().deleteOrganizationAdmin(organizationId, adminId);
  } catch (error) {
    console.error('Error deleting organization admin:', error);
    throw error;
  }
}

export async function getOrganizationAlertsProfiles(organizationId: string): Promise<AlertProfile[]> {
  try {
    if (!process.env.MERAKI_API_KEY) {
      throw new Error('Meraki API key not configured');
    }
    
    const meraki = new MerakiAPI(process.env.MERAKI_API_KEY);
    return await getMerakiInstance().getOrganizationAlertsProfiles(organizationId);
  } catch (error) {
    console.error('Error getting organization alerts profiles:', error);
    throw error;
  }
}

export async function createOrganizationAlertsProfile(organizationId: string, profile: Omit<AlertProfile, 'profileId'>): Promise<AlertProfile> {
  try {
    if (!process.env.MERAKI_API_KEY) {
      throw new Error('Meraki API key not configured');
    }
    
    const meraki = new MerakiAPI(process.env.MERAKI_API_KEY);
    return await getMerakiInstance().createOrganizationAlertsProfile(organizationId, profile);
  } catch (error) {
    console.error('Error creating organization alerts profile:', error);
    throw error;
  }
}

// Device live tools
export interface PingTest {
  pingId?: string;
  target: string;
  count?: number;
  status?: string;
  results?: any;
}

export interface ArpTableEntry {
  ip: string;
  mac: string;
  updatedAt: string;
  interface?: string;
}

export interface CableTestResult {
  ports: Array<{
    port: string;
    status: string;
    speedMbps?: number;
    error?: string;
  }>;
}

export async function createDevicePingTest(serial: string, target: string, count = 5): Promise<PingTest> {
  try {
    if (!process.env.MERAKI_API_KEY) {
      throw new Error('Meraki API key not configured');
    }
    
    const meraki = new MerakiAPI(process.env.MERAKI_API_KEY);
    return await getMerakiInstance().createDeviceLiveToolsPing(serial, target, count);
  } catch (error) {
    console.error('Error creating device ping test:', error);
    throw error;
  }
}

export async function getDevicePingTest(serial: string, pingId: string): Promise<PingTest> {
  try {
    if (!process.env.MERAKI_API_KEY) {
      throw new Error('Meraki API key not configured');
    }
    
    const meraki = new MerakiAPI(process.env.MERAKI_API_KEY);
    return await getMerakiInstance().getDeviceLiveToolsPing(serial, pingId);
  } catch (error) {
    console.error('Error getting device ping test:', error);
    throw error;
  }
}

export async function createDeviceArpTableRequest(serial: string) {
  try {
    if (!process.env.MERAKI_API_KEY) {
      throw new Error('Meraki API key not configured');
    }
    
    const meraki = new MerakiAPI(process.env.MERAKI_API_KEY);
    return await getMerakiInstance().createDeviceLiveToolsArpTable(serial);
  } catch (error) {
    console.error('Error creating device ARP table request:', error);
    throw error;
  }
}

export async function getDeviceArpTable(serial: string, requestId: string): Promise<ArpTableEntry[]> {
  try {
    if (!process.env.MERAKI_API_KEY) {
      throw new Error('Meraki API key not configured');
    }
    
    const meraki = new MerakiAPI(process.env.MERAKI_API_KEY);
    return await getMerakiInstance().getDeviceLiveToolsArpTable(serial, requestId);
  } catch (error) {
    console.error('Error getting device ARP table:', error);
    throw error;
  }
}

export async function createDeviceCableTest(serial: string, ports: string[]): Promise<any> {
  try {
    if (!process.env.MERAKI_API_KEY) {
      throw new Error('Meraki API key not configured');
    }
    
    const meraki = new MerakiAPI(process.env.MERAKI_API_KEY);
    return await getMerakiInstance().createDeviceLiveToolsCableTest(serial, ports);
  } catch (error) {
    console.error('Error creating device cable test:', error);
    throw error;
  }
}

export async function getDeviceCableTest(serial: string, testId: string): Promise<CableTestResult> {
  try {
    if (!process.env.MERAKI_API_KEY) {
      throw new Error('Meraki API key not configured');
    }
    
    const meraki = new MerakiAPI(process.env.MERAKI_API_KEY);
    return await getMerakiInstance().getDeviceLiveToolsCableTest(serial, testId);
  } catch (error) {
    console.error('Error getting device cable test:', error);
    throw error;
  }
}

// Analytics and reporting
export async function getOrganizationClientsOverview(organizationId: string, timespan = 86400) {
  try {
    if (!process.env.MERAKI_API_KEY) {
      throw new Error('Meraki API key not configured');
    }
    
    const meraki = new MerakiAPI(process.env.MERAKI_API_KEY);
    return await getMerakiInstance().getOrganizationClientsOverview(organizationId, timespan);
  } catch (error) {
    console.error('Error getting organization clients overview:', error);
    throw error;
  }
}

export async function getOrganizationTopClientsReport(organizationId: string, timespan = 86400) {
  try {
    if (!process.env.MERAKI_API_KEY) {
      throw new Error('Meraki API key not configured');
    }
    
    const meraki = new MerakiAPI(process.env.MERAKI_API_KEY);
    return await getMerakiInstance().getOrganizationTopClientsReport(organizationId, timespan);
  } catch (error) {
    console.error('Error getting organization top clients report:', error);
    throw error;
  }
}

export async function getOrganizationTopApplicationsReport(organizationId: string, timespan = 86400) {
  try {
    if (!process.env.MERAKI_API_KEY) {
      throw new Error('Meraki API key not configured');
    }
    
    const meraki = new MerakiAPI(process.env.MERAKI_API_KEY);
    return await getMerakiInstance().getOrganizationTopApplicationsReport(organizationId, timespan);
  } catch (error) {
    console.error('Error getting organization top applications report:', error);
    throw error;
  }
}

// Traffic shaping
export async function getWirelessSSIDTrafficShaping(networkId: string, ssidNumber: number) {
  try {
    if (!process.env.MERAKI_API_KEY) {
      throw new Error('Meraki API key not configured');
    }
    
    const meraki = new MerakiAPI(process.env.MERAKI_API_KEY);
    return await getMerakiInstance().getWirelessSSIDTrafficShaping(networkId, ssidNumber);
  } catch (error) {
    console.error('Error getting wireless SSID traffic shaping:', error);
    throw error;
  }
}

export async function updateWirelessSSIDTrafficShaping(networkId: string, ssidNumber: number, rules: any) {
  try {
    if (!process.env.MERAKI_API_KEY) {
      throw new Error('Meraki API key not configured');
    }
    
    const meraki = new MerakiAPI(process.env.MERAKI_API_KEY);
    return await getMerakiInstance().updateWirelessSSIDTrafficShaping(networkId, ssidNumber, rules);
  } catch (error) {
    console.error('Error updating wireless SSID traffic shaping:', error);
    throw error;
  }
}

export async function getApplianceTrafficShaping(networkId: string) {
  try {
    if (!process.env.MERAKI_API_KEY) {
      throw new Error('Meraki API key not configured');
    }
    
    const meraki = new MerakiAPI(process.env.MERAKI_API_KEY);
    return await getMerakiInstance().getApplianceTrafficShaping(networkId);
  } catch (error) {
    console.error('Error getting appliance traffic shaping:', error);
    throw error;
  }
}

export async function updateApplianceTrafficShaping(networkId: string, rules: any) {
  try {
    if (!process.env.MERAKI_API_KEY) {
      throw new Error('Meraki API key not configured');
    }
    
    const meraki = new MerakiAPI(process.env.MERAKI_API_KEY);
    return await getMerakiInstance().updateApplianceTrafficShaping(networkId, rules);
  } catch (error) {
    console.error('Error updating appliance traffic shaping:', error);
    throw error;
  }
}

// Switch port management
export interface SwitchPort {
  portId: string;
  name?: string;
  tags?: string[];
  enabled: boolean;
  poeEnabled?: boolean;
  type: string;
  vlan?: number;
  voiceVlan?: number;
  accessPolicyType?: string;
  allowedVlans?: string;
  rstp?: boolean;
  stpGuard?: string;
  linkNegotiation?: string;
  portScheduleId?: string;
  udld?: string;
  profile?: any;
}

export interface SwitchPortStatus {
  portId: string;
  enabled: boolean;
  status: string;
  isUplink?: boolean;
  errors?: string[];
  warnings?: string[];
  speed?: string;
  duplex?: string;
  usageInKb?: {
    total: number;
    sent: number;
    recv: number;
  };
  cdp?: any;
  lldp?: any;
}

export async function getSwitchPorts(serial: string): Promise<SwitchPort[]> {
  try {
    if (!process.env.MERAKI_API_KEY) {
      throw new Error('Meraki API key not configured');
    }
    
    const meraki = new MerakiAPI(process.env.MERAKI_API_KEY);
    return await getMerakiInstance().getSwitchPorts(serial);
  } catch (error) {
    console.error('Error getting switch ports:', error);
    throw error;
  }
}

export async function getSwitchPort(serial: string, portId: string): Promise<SwitchPort> {
  try {
    if (!process.env.MERAKI_API_KEY) {
      throw new Error('Meraki API key not configured');
    }
    
    const meraki = new MerakiAPI(process.env.MERAKI_API_KEY);
    return await getMerakiInstance().getSwitchPort(serial, portId);
  } catch (error) {
    console.error('Error getting switch port:', error);
    throw error;
  }
}

export async function updateSwitchPort(serial: string, portId: string, config: Partial<SwitchPort>): Promise<SwitchPort> {
  try {
    if (!process.env.MERAKI_API_KEY) {
      throw new Error('Meraki API key not configured');
    }
    
    const meraki = new MerakiAPI(process.env.MERAKI_API_KEY);
    return await getMerakiInstance().updateSwitchPort(serial, portId, config);
  } catch (error) {
    console.error('Error updating switch port:', error);
    throw error;
  }
}

export async function getSwitchPortStatuses(serial: string): Promise<SwitchPortStatus[]> {
  try {
    if (!process.env.MERAKI_API_KEY) {
      throw new Error('Meraki API key not configured');
    }
    
    const meraki = new MerakiAPI(process.env.MERAKI_API_KEY);
    return await getMerakiInstance().getSwitchPortStatuses(serial);
  } catch (error) {
    console.error('Error getting switch port statuses:', error);
    throw error;
  }
}

// New Layer 7 firewall rule and content filtering types
// Meraki Layer 7 Firewall Rule interface based on official API
export interface Layer7FirewallRule {
  policy: 'deny' | 'allow';
  type: 'application' | 'applicationCategory' | 'host' | 'port' | 'ipRange';
  value?: string;
  valueObj?: {
    id?: string;
    name?: string;
  };
}

export interface ContentFilteringRule {
  allowedUrlPatterns: string[];
  blockedUrlPatterns: string[];
  blockedUrlCategories: Array<{
    id: string;
    name: string;
  }>;
  urlCategoryListSize: 'topSites' | 'fullList';
}

// Layer 7 Firewall Rules functions
export async function getLayer7FirewallRules(networkId: string): Promise<Layer7FirewallRule[]> {
  try {
    const { FirewallCache } = await import('@/lib/firewall-cache');
    
    // Try to get from cache first
    const cachedRules = await FirewallCache.getLayer7Rules(networkId);
    if (cachedRules) {
      return cachedRules;
    }

    console.log(`Fetching Layer 7 firewall rules for ${networkId} from Meraki API (cache miss)`);
    
    // Check if we have Meraki API access
    if (process.env.MERAKI_API_KEY) {
      try {
        const merakiApi = new MerakiAPI(process.env.MERAKI_API_KEY);
        const response = await merakiApi.getFirewallL7Rules(networkId);
        
        // The Meraki API returns { rules: [...] }, so extract the rules array
        const rules = Array.isArray(response) ? response : (response?.rules || []);
        
        // Cache the results
        await FirewallCache.setLayer7Rules(networkId, rules);
        
        return rules;
      } catch (apiError) {
        console.error('Error fetching from Meraki API, falling back to mock data:', apiError);
      }
    }
    
    // Fallback to mock data if API is not available or fails
    console.log('Using mock Layer 7 firewall rules data');
    const rules = [
      {
        policy: 'deny',
        type: 'applicationCategory',
        value: 'Social Networking'
      },
      {
        policy: 'deny',
        type: 'application',
        valueObj: {
          id: '47',
          name: 'Facebook'
        }
      },
      {
        policy: 'allow',
        type: 'application',
        valueObj: {
          id: '65',
          name: 'Office 365'
        }
      },
      {
        policy: 'deny',
        type: 'application',
        valueObj: {
          id: '123',
          name: 'YouTube'
        }
      },
      {
        policy: 'allow',
        type: 'applicationCategory',
        value: 'Business & Economy'
      },
      {
        policy: 'deny',
        type: 'applicationCategory',
        value: 'Gaming'
      },
      {
        policy: 'deny',
        type: 'host',
        value: 'gaming.example.com'
      },
      {
        policy: 'allow',
        type: 'host',
        value: 'corporate.company.com'
      },
      {
        policy: 'deny',
        type: 'port',
        value: '23'
      },
      {
        policy: 'allow',
        type: 'port',
        value: '443'
      },
      {
        policy: 'deny',
        type: 'ipRange',
        value: '10.11.12.00/24'
      },
      {
        policy: 'allow',
        type: 'ipRange',
        value: '192.168.1.0/24'
      }
    ] as Layer7FirewallRule[];

    // Cache the results
    await FirewallCache.setLayer7Rules(networkId, rules);
    
    return rules;
  } catch (error) {
    console.error('Error getting Layer 7 firewall rules:', error);
    throw error;
  }
}

export async function updateLayer7FirewallRules(networkId: string, rules: Layer7FirewallRule[]): Promise<Layer7FirewallRule[]> {
  try {
    const { FirewallCache } = await import('@/lib/firewall-cache');
    
    console.log(`Updating Layer 7 firewall rules for network ${networkId}:`, rules);
    
    // Check if we have Meraki API access
    if (process.env.MERAKI_API_KEY) {
      try {
        const merakiApi = new MerakiAPI(process.env.MERAKI_API_KEY);
        const updatedRules = await merakiApi.updateFirewallL7Rules(networkId, rules);
        
        // Update cache with new rules
        await FirewallCache.setLayer7Rules(networkId, updatedRules);
        
        return updatedRules;
      } catch (apiError) {
        console.error('Error updating via Meraki API, updating cache only:', apiError);
      }
    }
    
    // Fallback: update cache only if API is not available
    console.log('Updating Layer 7 firewall rules cache only (no live API)');
    await FirewallCache.setLayer7Rules(networkId, rules);
    
    return rules;
  } catch (error) {
    console.error('Error updating Layer 7 firewall rules:', error);
    throw error;
  }
}

// Content Filtering functions
export async function getContentFilteringRules(networkId: string): Promise<ContentFilteringRule> {
  try {
    const { FirewallCache } = await import('@/lib/firewall-cache');
    
    // Try to get from cache first
    const cachedRules = await FirewallCache.getContentFiltering(networkId);
    if (cachedRules) {
      return cachedRules;
    }

    console.log(`Fetching content filtering rules for ${networkId} from Meraki API (cache miss)`);
    
    // Check if we have Meraki API access
    if (process.env.MERAKI_API_KEY) {
      try {
        const merakiApi = new MerakiAPI(process.env.MERAKI_API_KEY);
        const response = await merakiApi.getContentFilteringRules(networkId);
        
        // The Meraki API should return the content filtering object directly
        const rules = response as ContentFilteringRule;
        
        // Cache the results
        await FirewallCache.setContentFiltering(networkId, rules);
        
        return rules;
      } catch (apiError) {
        console.error('Error fetching from Meraki API, falling back to mock data:', apiError);
      }
    }
    
    // Fallback to mock data if API is not available or fails
    console.log('Using mock content filtering rules data');
    const rules = {
      allowedUrlPatterns: [
        "http://www.example.org",
        "http://help.com.au"
      ],
      blockedUrlPatterns: [
        "http://www.example.com",
        "http://www.betting.com",
        "facebook.com",
        "twitter.com",
        "youtube.com"
      ],
      blockedUrlCategories: [
        {
          id: "meraki:contentFiltering/category/1",
          name: "Real Estate"
        },
        {
          id: "meraki:contentFiltering/category/7", 
          name: "Shopping"
        },
        {
          id: "meraki:contentFiltering/category/14",
          name: "Social Networking"
        },
        {
          id: "meraki:contentFiltering/category/23",
          name: "Adult Content"
        }
      ],
      urlCategoryListSize: "topSites"
    } as ContentFilteringRule;

    // Cache the results
    await FirewallCache.setContentFiltering(networkId, rules);
    
    return rules;
  } catch (error) {
    console.error('Error getting content filtering rules:', error);
    throw error;
  }
}

export async function updateContentFilteringRules(networkId: string, rules: ContentFilteringRule): Promise<ContentFilteringRule> {
  try {
    const { FirewallCache } = await import('@/lib/firewall-cache');
    
    console.log(`Updating content filtering rules for network ${networkId}:`, rules);
    
    // Check if we have Meraki API access
    if (process.env.MERAKI_API_KEY) {
      try {
        const merakiApi = new MerakiAPI(process.env.MERAKI_API_KEY);
        const updatedRules = await merakiApi.updateContentFilteringRules(networkId, rules);
        
        // Update cache with new rules
        await FirewallCache.setContentFiltering(networkId, updatedRules);
        
        return updatedRules;
      } catch (apiError) {
        console.error('Error updating via Meraki API, updating cache only:', apiError);
      }
    }
    
    // Fallback: update cache only if API is not available
    console.log('Updating content filtering rules cache only (no live API)');
    await FirewallCache.setContentFiltering(networkId, rules);
    
    return rules;
  } catch (error) {
    console.error('Error updating content filtering rules:', error);
    throw error;
  }
}

// Migration function to fix existing devices with missing or incorrect productType
export async function fixDeviceProductTypes(): Promise<void> {
  try {
    const client = await clientPromise;
    const devicesCollection = client.db('meraki-dashboard').collection('devices');
    
    // Get all devices with missing or unknown productType
    const devicesNeedingFix = await devicesCollection.find({
      $or: [
        { productType: { $exists: false } },
        { productType: null },
        { productType: '' },
        { productType: 'unknown' }
      ]
    }).toArray();
    
    console.log(`Found ${devicesNeedingFix.length} devices needing productType fix`);
    
    // Update each device with the correct productType
    const updatePromises = devicesNeedingFix.map(device => {
      const correctProductType = getProductTypeFromModel(device.model);
      return devicesCollection.updateOne(
        { serial: device.serial },
        { $set: { productType: correctProductType } }
      );
    });
    
    await Promise.all(updatePromises);
    console.log(`Fixed productType for ${devicesNeedingFix.length} devices`);
  } catch (error) {
    console.error('Error fixing device product types:', error);
    throw error;
  }
}

// Helper function to determine device product type from model
function getProductTypeFromModel(model: string): string {
  if (!model) return 'unknown';
  
  const modelUpper = model.toUpperCase();
  
  if (modelUpper.startsWith('MX')) {
    return 'appliance';
  } else if (modelUpper.startsWith('MS')) {
    return 'switch';
  } else if (modelUpper.startsWith('MR')) {
    return 'wireless';
  } else if (modelUpper.startsWith('MT')) {
    return 'sensor';
  } else if (modelUpper.startsWith('MV')) {
    return 'camera';
  } else if (modelUpper.startsWith('MG')) {
    return 'cellular_gateway';
  } else if (modelUpper.startsWith('Z')) {
    return 'appliance'; // Z series teleworker gateways
  }
  
  return 'unknown';
}

// Helper function to serialize Date objects for JSON serialization
function serializeDeviceForJSON(device: any): DeviceProps {
  return {
    ...device,
    lastStatusUpdate: device.lastStatusUpdate instanceof Date 
      ? device.lastStatusUpdate.toISOString() 
      : device.lastStatusUpdate
  };
}
