import axios from 'axios';
import { RateLimiter } from './rate-limiter';

const MERAKI_BASE_URL = 'https://api.meraki.com/api/v1';

class MerakiAPI {
  private apiKey: string;
  private axiosInstance;
  private rateLimiter: RateLimiter;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    this.rateLimiter = new RateLimiter();
    this.axiosInstance = axios.create({
      baseURL: MERAKI_BASE_URL,
      headers: {
        'X-Cisco-Meraki-API-Key': this.apiKey,
        'Content-Type': 'application/json',
      },
    });
  }

  // Get rate limiter status
  getRateLimiterStatus() {
    return this.rateLimiter.getStatus();
  }

  // Private helper method for rate-limited GET requests
  private async rateLimitedGet(url: string, params?: any) {
    return this.rateLimiter.execute(async () => {
      const response = await this.axiosInstance.get(url, params ? { params } : undefined);
      return response.data;
    });
  }

  // Private helper method for rate-limited PUT requests
  private async rateLimitedPut(url: string, data?: any) {
    return this.rateLimiter.execute(async () => {
      const response = await this.axiosInstance.put(url, data);
      return response.data;
    });
  }

  // Private helper method for rate-limited POST requests
  private async rateLimitedPost(url: string, data?: any) {
    return this.rateLimiter.execute(async () => {
      const response = await this.axiosInstance.post(url, data);
      return response.data;
    });
  }

  // Get all organizations
  async getOrganizations() {
    return this.rateLimiter.execute(async () => {
      try {
        const response = await this.axiosInstance.get('/organizations');
        return response.data;
      } catch (error) {
        console.error('Error fetching organizations:', error);
        throw error;
      }
    });
  }

  // Get networks for an organization
  async getNetworks(organizationId: string) {
    return this.rateLimiter.execute(async () => {
      try {
        const response = await this.axiosInstance.get(`/organizations/${organizationId}/networks`);
        return response.data;
      } catch (error) {
        console.error('Error fetching networks:', error);
        throw error;
      }
    });
  }

  // Get devices for a network
  async getNetworkDevices(networkId: string) {
    return this.rateLimiter.execute(async () => {
      try {
        const response = await this.axiosInstance.get(`/networks/${networkId}/devices`);
        return response.data;
      } catch (error) {
        console.error('Error fetching network devices:', error);
        throw error;
      }
    });
  }

  // Get network clients
  async getNetworkClients(networkId: string, timespan = 2592000) { // 30 days default
    return this.rateLimiter.execute(async () => {
      try {
        const response = await this.axiosInstance.get(`/networks/${networkId}/clients`, {
          params: { timespan }
        });
        return response.data;
      } catch (error) {
        console.error('Error fetching network clients:', error);
        throw error;
      }
    });
  }

  // Get network traffic
  async getNetworkTraffic(networkId: string, timespan = 2592000) {
    return this.rateLimiter.execute(async () => {
      try {
        const response = await this.axiosInstance.get(`/networks/${networkId}/traffic`, {
          params: { timespan }
        });
        return response.data;
      } catch (error) {
        console.error('Error fetching network traffic:', error);
        throw error;
      }
    });
  }

  // Update network settings
  async updateNetwork(networkId: string, data: any) {
    try {
      const response = await this.axiosInstance.put(`/networks/${networkId}`, data);
      return response.data;
    } catch (error) {
      console.error('Error updating network:', error);
      throw error;
    }
  }

  // Blink device LEDs
  async blinkDeviceLeds(networkId: string, serial: string, duration = 20) {
    try {
      const response = await this.axiosInstance.post(`/networks/${networkId}/devices/${serial}/blinkLeds`, {
        duration
      });
      return response.data;
    } catch (error) {
      console.error('Error blinking device LEDs:', error);
      throw error;
    }
  }

  // Reboot device
  async rebootDevice(networkId: string, serial: string) {
    try {
      const response = await this.axiosInstance.post(`/networks/${networkId}/devices/${serial}/reboot`);
      return response.data;
    } catch (error) {
      console.error('Error rebooting device:', error);
      throw error;
    }
  }

  // Get device status
  async getDeviceStatus(networkId: string, serial: string) {
    try {
      const response = await this.axiosInstance.get(`/networks/${networkId}/devices/${serial}/status`);
      return response.data;
    } catch (error) {
      console.error('Error fetching device status:', error);
      throw error;
    }
  }

  // Get organization devices statuses (bulk status fetch)
  async getOrganizationDevicesStatuses(organizationId: string, networkIds?: string[]) {
    try {
      let url = `/organizations/${organizationId}/devices/statuses`;
      const params = new URLSearchParams();
      
      if (networkIds && networkIds.length > 0) {
        networkIds.forEach(id => params.append('networkIds[]', id));
      }
      
      if (params.toString()) {
        url += '?' + params.toString();
      }
      
      const response = await this.axiosInstance.get(url);
      return response.data;
    } catch (error) {
      console.error('Error fetching organization devices statuses:', error);
      throw error;
    }
  }

  // Firewall management methods
  async getFirewallRules(networkId: string) {
    return this.rateLimitedGet(`/networks/${networkId}/appliance/firewall/l3FirewallRules`);
  }

  async updateFirewallRules(networkId: string, rules: any[]) {
    try {
      const response = await this.axiosInstance.put(`/networks/${networkId}/appliance/firewall/l3FirewallRules`, {
        rules
      });
      return response.data;
    } catch (error) {
      console.error('Error updating firewall rules:', error);
      throw error;
    }
  }

  // Additional firewall management methods
  async getFirewallL7Rules(networkId: string) {
    try {
      const response = await this.axiosInstance.get(`/networks/${networkId}/appliance/firewall/l7FirewallRules`);
      return response.data;
    } catch (error) {
      console.error('Error fetching L7 firewall rules:', error);
      throw error;
    }
  }

  async updateFirewallL7Rules(networkId: string, rules: any[]) {
    try {
      const response = await this.axiosInstance.put(`/networks/${networkId}/appliance/firewall/l7FirewallRules`, {
        rules
      });
      return response.data;
    } catch (error) {
      console.error('Error updating L7 firewall rules:', error);
      throw error;
    }
  }

  async getFirewallPortForwardingRules(networkId: string) {
    try {
      const response = await this.axiosInstance.get(`/networks/${networkId}/appliance/firewall/portForwardingRules`);
      return response.data;
    } catch (error) {
      console.error('Error fetching port forwarding rules:', error);
      throw error;
    }
  }

  async updateFirewallPortForwardingRules(networkId: string, rules: any[]) {
    try {
      const response = await this.axiosInstance.put(`/networks/${networkId}/appliance/firewall/portForwardingRules`, {
        rules
      });
      return response.data;
    } catch (error) {
      console.error('Error updating port forwarding rules:', error);
      throw error;
    }
  }

  async getFirewallOneToOneNatRules(networkId: string) {
    try {
      const response = await this.axiosInstance.get(`/networks/${networkId}/appliance/firewall/oneToOneNatRules`);
      return response.data;
    } catch (error) {
      console.error('Error fetching one-to-one NAT rules:', error);
      throw error;
    }
  }

  async updateFirewallOneToOneNatRules(networkId: string, rules: any[]) {
    try {
      const response = await this.axiosInstance.put(`/networks/${networkId}/appliance/firewall/oneToOneNatRules`, {
        rules
      });
      return response.data;
    } catch (error) {
      console.error('Error updating one-to-one NAT rules:', error);
      throw error;
    }
  }

  async getFirewallOneToManyNatRules(networkId: string) {
    try {
      const response = await this.axiosInstance.get(`/networks/${networkId}/appliance/firewall/oneToManyNatRules`);
      return response.data;
    } catch (error) {
      console.error('Error fetching one-to-many NAT rules:', error);
      throw error;
    }
  }

  async getContentFilteringRules(networkId: string) {
    try {
      const response = await this.axiosInstance.get(`/networks/${networkId}/appliance/contentFiltering`);
      return response.data;
    } catch (error) {
      console.error('Error fetching content filtering rules:', error);
      throw error;
    }
  }

  async updateContentFilteringRules(networkId: string, rules: any) {
    try {
      const response = await this.axiosInstance.put(`/networks/${networkId}/appliance/contentFiltering`, rules);
      return response.data;
    } catch (error) {
      console.error('Error updating content filtering rules:', error);
      throw error;
    }
  }

  // Security and intrusion detection methods
  async getSecurityIntrusion(networkId: string) {
    try {
      const response = await this.axiosInstance.get(`/networks/${networkId}/appliance/security/intrusion`);
      return response.data;
    } catch (error) {
      console.error('Error fetching security intrusion settings:', error);
      throw error;
    }
  }

  async getSecurityMalware(networkId: string) {
    try {
      const response = await this.axiosInstance.get(`/networks/${networkId}/appliance/security/malware`);
      return response.data;
    } catch (error) {
      console.error('Error fetching security malware settings:', error);
      throw error;
    }
  }

  async getFirewalledServices(networkId: string) {
    try {
      const response = await this.axiosInstance.get(`/networks/${networkId}/appliance/firewall/firewalledServices`);
      return response.data;
    } catch (error) {
      console.error('Error fetching firewalled services:', error);
      throw error;
    }
  }

  async getFirewalledService(networkId: string, service: string) {
    try {
      const response = await this.axiosInstance.get(`/networks/${networkId}/appliance/firewall/firewalledServices/${service}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching firewalled service:', error);
      throw error;
    }
  }

  async updateFirewalledService(networkId: string, service: string, config: any) {
    try {
      const response = await this.axiosInstance.put(`/networks/${networkId}/appliance/firewall/firewalledServices/${service}`, config);
      return response.data;
    } catch (error) {
      console.error('Error updating firewalled service:', error);
      throw error;
    }
  }

  // Appliance configuration methods
  async getAppliancePorts(networkId: string) {
    try {
      const response = await this.axiosInstance.get(`/networks/${networkId}/appliance/ports`);
      return response.data;
    } catch (error) {
      console.error('Error fetching appliance ports:', error);
      throw error;
    }
  }

  async updateAppliancePort(networkId: string, portId: string, config: any) {
    try {
      const response = await this.axiosInstance.put(`/networks/${networkId}/appliance/ports/${portId}`, config);
      return response.data;
    } catch (error) {
      console.error('Error updating appliance port:', error);
      throw error;
    }
  }

  // Network policy and group management
  async getGroupPolicies(networkId: string) {
    try {
      const response = await this.axiosInstance.get(`/networks/${networkId}/groupPolicies`);
      return response.data;
    } catch (error) {
      console.error('Error fetching group policies:', error);
      throw error;
    }
  }

  async createGroupPolicy(networkId: string, policy: any) {
    try {
      const response = await this.axiosInstance.post(`/networks/${networkId}/groupPolicies`, policy);
      return response.data;
    } catch (error) {
      console.error('Error creating group policy:', error);
      throw error;
    }
  }

  async updateGroupPolicy(networkId: string, groupPolicyId: string, policy: any) {
    try {
      const response = await this.axiosInstance.put(`/networks/${networkId}/groupPolicies/${groupPolicyId}`, policy);
      return response.data;
    } catch (error) {
      console.error('Error updating group policy:', error);
      throw error;
    }
  }

  async deleteGroupPolicy(networkId: string, groupPolicyId: string) {
    try {
      const response = await this.axiosInstance.delete(`/networks/${networkId}/groupPolicies/${groupPolicyId}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting group policy:', error);
      throw error;
    }
  }

  // Organization-level policy objects
  async getPolicyObjects(organizationId: string) {
    try {
      const response = await this.axiosInstance.get(`/organizations/${organizationId}/policyObjects`);
      return response.data;
    } catch (error) {
      console.error('Error fetching policy objects:', error);
      throw error;
    }
  }

  async getPolicyObject(organizationId: string, policyObjectId: string) {
    try {
      const response = await this.axiosInstance.get(`/organizations/${organizationId}/policyObjects/${policyObjectId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching policy object:', error);
      throw error;
    }
  }

  async createPolicyObject(organizationId: string, policyObject: any) {
    try {
      const response = await this.axiosInstance.post(`/organizations/${organizationId}/policyObjects`, policyObject);
      return response.data;
    } catch (error) {
      console.error('Error creating policy object:', error);
      throw error;
    }
  }

  async updatePolicyObject(organizationId: string, policyObjectId: string, policyObject: any) {
    try {
      const response = await this.axiosInstance.put(`/organizations/${organizationId}/policyObjects/${policyObjectId}`, policyObject);
      return response.data;
    } catch (error) {
      console.error('Error updating policy object:', error);
      throw error;
    }
  }

  async deletePolicyObject(organizationId: string, policyObjectId: string) {
    try {
      const response = await this.axiosInstance.delete(`/organizations/${organizationId}/policyObjects/${policyObjectId}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting policy object:', error);
      throw error;
    }
  }

  // Policy object groups
  async getPolicyObjectGroups(organizationId: string) {
    try {
      const response = await this.axiosInstance.get(`/organizations/${organizationId}/policyObjects/groups`);
      return response.data;
    } catch (error) {
      console.error('Error fetching policy object groups:', error);
      throw error;
    }
  }

  async getPolicyObjectGroup(organizationId: string, policyObjectGroupId: string) {
    try {
      const response = await this.axiosInstance.get(`/organizations/${organizationId}/policyObjects/groups/${policyObjectGroupId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching policy object group:', error);
      throw error;
    }
  }

  async createPolicyObjectGroup(organizationId: string, policyObjectGroup: any) {
    try {
      const response = await this.axiosInstance.post(`/organizations/${organizationId}/policyObjects/groups`, policyObjectGroup);
      return response.data;
    } catch (error) {
      console.error('Error creating policy object group:', error);
      throw error;
    }
  }

  async updatePolicyObjectGroup(organizationId: string, policyObjectGroupId: string, policyObjectGroup: any) {
    try {
      const response = await this.axiosInstance.put(`/organizations/${organizationId}/policyObjects/groups/${policyObjectGroupId}`, policyObjectGroup);
      return response.data;
    } catch (error) {
      console.error('Error updating policy object group:', error);
      throw error;
    }
  }

  async deletePolicyObjectGroup(organizationId: string, policyObjectGroupId: string) {
    try {
      const response = await this.axiosInstance.delete(`/organizations/${organizationId}/policyObjects/groups/${policyObjectGroupId}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting policy object group:', error);
      throw error;
    }
  }

  // Configuration template methods
  async getConfigTemplates(organizationId: string) {
    try {
      const response = await this.axiosInstance.get(`/organizations/${organizationId}/configTemplates`);
      return response.data;
    } catch (error) {
      console.error('Error fetching config templates:', error);
      throw error;
    }
  }

  async getConfigTemplate(organizationId: string, configTemplateId: string) {
    try {
      const response = await this.axiosInstance.get(`/organizations/${organizationId}/configTemplates/${configTemplateId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching config template:', error);
      throw error;
    }
  }

  // Network configuration methods
  async getNetworkDetails(networkId: string) {
    try {
      const response = await this.axiosInstance.get(`/networks/${networkId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching network details:', error);
      throw error;
    }
  }

  async updateNetworkDetails(networkId: string, config: any) {
    try {
      const response = await this.axiosInstance.put(`/networks/${networkId}`, config);
      return response.data;
    } catch (error) {
      console.error('Error updating network details:', error);
      throw error;
    }
  }

  // Advanced VLAN management
  async getVlanDetails(networkId: string, vlanId: string) {
    try {
      const response = await this.axiosInstance.get(`/networks/${networkId}/appliance/vlans/${vlanId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching VLAN details:', error);
      throw error;
    }
  }

  async createVlan(networkId: string, vlan: any) {
    try {
      const response = await this.axiosInstance.post(`/networks/${networkId}/appliance/vlans`, vlan);
      return response.data;
    } catch (error) {
      console.error('Error creating VLAN:', error);
      throw error;
    }
  }

  async updateVlan(networkId: string, vlanId: string, vlan: any) {
    try {
      const response = await this.axiosInstance.put(`/networks/${networkId}/appliance/vlans/${vlanId}`, vlan);
      return response.data;
    } catch (error) {
      console.error('Error updating VLAN:', error);
      throw error;
    }
  }

  async deleteVlan(networkId: string, vlanId: string) {
    try {
      const response = await this.axiosInstance.delete(`/networks/${networkId}/appliance/vlans/${vlanId}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting VLAN:', error);
      throw error;
    }
  }

  // Device management enhancements
  async getDeviceUplinks(serial: string) {
    try {
      const response = await this.axiosInstance.get(`/devices/${serial}/uplinks`);
      return response.data;
    } catch (error) {
      console.error('Error fetching device uplinks:', error);
      throw error;
    }
  }

  async getDeviceLossAndLatency(networkId: string, serial: string, timespan = 86400) {
    try {
      const response = await this.axiosInstance.get(`/networks/${networkId}/devices/${serial}/lossAndLatencyHistory`, {
        params: { timespan }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching device loss and latency:', error);
      throw error;
    }
  }

  // Network monitoring and analytics
  async getNetworkEvents(networkId: string, productType?: string, timespan = 86400) {
    try {
      const params: any = { timespan };
      if (productType) params.productType = productType;
      
      const response = await this.axiosInstance.get(`/networks/${networkId}/events`, {
        params
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching network events:', error);
      throw error;
    }
  }

  async getNetworkTrafficAnalysis(networkId: string, timespan = 86400) {
    try {
      const response = await this.axiosInstance.get(`/networks/${networkId}/traffic/analysis`, {
        params: { timespan }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching network traffic analysis:', error);
      throw error;
    }
  }

  // Bulk operations for efficiency
  async bulkUpdateFirewallRules(updates: Array<{networkId: string, rules: any[]}>) {
    const results = [];
    for (const update of updates) {
      try {
        const result = await this.updateFirewallRules(update.networkId, update.rules);
        results.push({ networkId: update.networkId, success: true, data: result });
      } catch (error) {
        results.push({ networkId: update.networkId, success: false, error });
      }
    }
    return results;
  }

  // Network health and diagnostics
  async getNetworkHealthAlerts(networkId: string) {
    try {
      const response = await this.axiosInstance.get(`/networks/${networkId}/health/alerts`);
      return response.data;
    } catch (error) {
      console.error('Error fetching network health alerts:', error);
      throw error;
    }
  }

  // Wireless management
  async getWirelessSSIDs(networkId: string) {
    try {
      const response = await this.axiosInstance.get(`/networks/${networkId}/wireless/ssids`);
      return response.data;
    } catch (error) {
      console.error('Error fetching wireless SSIDs:', error);
      throw error;
    }
  }

  async getWirelessSSID(networkId: string, ssidNumber: number) {
    try {
      const response = await this.axiosInstance.get(`/networks/${networkId}/wireless/ssids/${ssidNumber}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching wireless SSID:', error);
      throw error;
    }
  }

  async updateWirelessSSID(networkId: string, ssidNumber: number, config: any) {
    try {
      const response = await this.axiosInstance.put(`/networks/${networkId}/wireless/ssids/${ssidNumber}`, config);
      return response.data;
    } catch (error) {
      console.error('Error updating wireless SSID:', error);
      throw error;
    }
  }

  async getWirelessSettings(networkId: string) {
    try {
      const response = await this.axiosInstance.get(`/networks/${networkId}/wireless/settings`);
      return response.data;
    } catch (error) {
      console.error('Error fetching wireless settings:', error);
      throw error;
    }
  }

  async updateWirelessSettings(networkId: string, settings: any) {
    try {
      const response = await this.axiosInstance.put(`/networks/${networkId}/wireless/settings`, settings);
      return response.data;
    } catch (error) {
      console.error('Error updating wireless settings:', error);
      throw error;
    }
  }

  // Wireless RF Profiles
  async getWirelessRFProfiles(networkId: string) {
    try {
      const response = await this.axiosInstance.get(`/networks/${networkId}/wireless/rfProfiles`);
      return response.data;
    } catch (error) {
      console.error('Error fetching wireless RF profiles:', error);
      throw error;
    }
  }

  async createWirelessRFProfile(networkId: string, profile: any) {
    try {
      const response = await this.axiosInstance.post(`/networks/${networkId}/wireless/rfProfiles`, profile);
      return response.data;
    } catch (error) {
      console.error('Error creating wireless RF profile:', error);
      throw error;
    }
  }

  async updateWirelessRFProfile(networkId: string, profileId: string, profile: any) {
    try {
      const response = await this.axiosInstance.put(`/networks/${networkId}/wireless/rfProfiles/${profileId}`, profile);
      return response.data;
    } catch (error) {
      console.error('Error updating wireless RF profile:', error);
      throw error;
    }
  }

  async deleteWirelessRFProfile(networkId: string, profileId: string) {
    try {
      const response = await this.axiosInstance.delete(`/networks/${networkId}/wireless/rfProfiles/${profileId}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting wireless RF profile:', error);
      throw error;
    }
  }

  // Wireless client management
  async getWirelessClients(networkId: string, timespan = 86400) {
    try {
      const response = await this.axiosInstance.get(`/networks/${networkId}/wireless/clients`, {
        params: { timespan }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching wireless clients:', error);
      throw error;
    }
  }

  async getWirelessClientConnections(networkId: string, clientId: string, timespan = 86400) {
    try {
      const response = await this.axiosInstance.get(`/networks/${networkId}/wireless/clients/${clientId}/connectionHistory`, {
        params: { timespan }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching wireless client connections:', error);
      throw error;
    }
  }

  // Wireless Air Marshal (security)
  async getWirelessAirMarshal(networkId: string, timespan = 86400) {
    try {
      const response = await this.axiosInstance.get(`/networks/${networkId}/wireless/airMarshal`, {
        params: { timespan }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching wireless Air Marshal data:', error);
      throw error;
    }
  }

  async getWirelessAirMarshalRules(networkId: string) {
    try {
      const response = await this.axiosInstance.get(`/networks/${networkId}/wireless/airMarshal/rules`);
      return response.data;
    } catch (error) {
      console.error('Error fetching wireless Air Marshal rules:', error);
      throw error;
    }
  }

  async createWirelessAirMarshalRule(networkId: string, rule: any) {
    try {
      const response = await this.axiosInstance.post(`/networks/${networkId}/wireless/airMarshal/rules`, rule);
      return response.data;
    } catch (error) {
      console.error('Error creating wireless Air Marshal rule:', error);
      throw error;
    }
  }

  async updateWirelessAirMarshalRule(networkId: string, ruleId: string, rule: any) {
    try {
      const response = await this.axiosInstance.put(`/networks/${networkId}/wireless/airMarshal/rules/${ruleId}`, rule);
      return response.data;
    } catch (error) {
      console.error('Error updating wireless Air Marshal rule:', error);
      throw error;
    }
  }

  async deleteWirelessAirMarshalRule(networkId: string, ruleId: string) {
    try {
      const response = await this.axiosInstance.delete(`/networks/${networkId}/wireless/airMarshal/rules/${ruleId}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting wireless Air Marshal rule:', error);
      throw error;
    }
  }

  // Switch management enhancements
  async getSwitchACLs(networkId: string) {
    try {
      const response = await this.axiosInstance.get(`/networks/${networkId}/switch/accessControlLists`);
      return response.data;
    } catch (error) {
      console.error('Error fetching switch ACLs:', error);
      throw error;
    }
  }

  async updateSwitchACLs(networkId: string, rules: any[]) {
    try {
      const response = await this.axiosInstance.put(`/networks/${networkId}/switch/accessControlLists`, { rules });
      return response.data;
    } catch (error) {
      console.error('Error updating switch ACLs:', error);
      throw error;
    }
  }

  async getSwitchStormControl(networkId: string) {
    try {
      const response = await this.axiosInstance.get(`/networks/${networkId}/switch/stormControl`);
      return response.data;
    } catch (error) {
      console.error('Error fetching switch storm control:', error);
      throw error;
    }
  }

  async updateSwitchStormControl(networkId: string, config: any) {
    try {
      const response = await this.axiosInstance.put(`/networks/${networkId}/switch/stormControl`, config);
      return response.data;
    } catch (error) {
      console.error('Error updating switch storm control:', error);
      throw error;
    }
  }

  async getSwitchMTU(networkId: string) {
    try {
      const response = await this.axiosInstance.get(`/networks/${networkId}/switch/mtu`);
      return response.data;
    } catch (error) {
      console.error('Error fetching switch MTU:', error);
      throw error;
    }
  }

  async updateSwitchMTU(networkId: string, config: any) {
    try {
      const response = await this.axiosInstance.put(`/networks/${networkId}/switch/mtu`, config);
      return response.data;
    } catch (error) {
      console.error('Error updating switch MTU:', error);
      throw error;
    }
  }

  // Organization-wide management
  async getOrganizationInventory(organizationId: string) {
    try {
      const response = await this.axiosInstance.get(`/organizations/${organizationId}/inventory/devices`);
      return response.data;
    } catch (error) {
      console.error('Error fetching organization inventory:', error);
      throw error;
    }
  }

  async getOrganizationAdmins(organizationId: string) {
    try {
      const response = await this.axiosInstance.get(`/organizations/${organizationId}/admins`);
      return response.data;
    } catch (error) {
      console.error('Error fetching organization admins:', error);
      throw error;
    }
  }

  async createOrganizationAdmin(organizationId: string, admin: any) {
    try {
      const response = await this.axiosInstance.post(`/organizations/${organizationId}/admins`, admin);
      return response.data;
    } catch (error) {
      console.error('Error creating organization admin:', error);
      throw error;
    }
  }

  async updateOrganizationAdmin(organizationId: string, adminId: string, admin: any) {
    try {
      const response = await this.axiosInstance.put(`/organizations/${organizationId}/admins/${adminId}`, admin);
      return response.data;
    } catch (error) {
      console.error('Error updating organization admin:', error);
      throw error;
    }
  }

  async deleteOrganizationAdmin(organizationId: string, adminId: string) {
    try {
      const response = await this.axiosInstance.delete(`/organizations/${organizationId}/admins/${adminId}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting organization admin:', error);
      throw error;
    }
  }

  // Network alerts and monitoring
  async getOrganizationAlertsProfiles(organizationId: string) {
    try {
      const response = await this.axiosInstance.get(`/organizations/${organizationId}/alerts/profiles`);
      return response.data;
    } catch (error) {
      console.error('Error fetching organization alerts profiles:', error);
      throw error;
    }
  }

  async createOrganizationAlertsProfile(organizationId: string, profile: any) {
    try {
      const response = await this.axiosInstance.post(`/organizations/${organizationId}/alerts/profiles`, profile);
      return response.data;
    } catch (error) {
      console.error('Error creating organization alerts profile:', error);
      throw error;
    }
  }

  async updateOrganizationAlertsProfile(organizationId: string, profileId: string, profile: any) {
    try {
      const response = await this.axiosInstance.put(`/organizations/${organizationId}/alerts/profiles/${profileId}`, profile);
      return response.data;
    } catch (error) {
      console.error('Error updating organization alerts profile:', error);
      throw error;
    }
  }

  async deleteOrganizationAlertsProfile(organizationId: string, profileId: string) {
    try {
      const response = await this.axiosInstance.delete(`/organizations/${organizationId}/alerts/profiles/${profileId}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting organization alerts profile:', error);
      throw error;
    }
  }

  // Configuration templates
  async getOrganizationConfigTemplates(organizationId: string) {
    try {
      const response = await this.axiosInstance.get(`/organizations/${organizationId}/configTemplates`);
      return response.data;
    } catch (error) {
      console.error('Error fetching organization config templates:', error);
      throw error;
    }
  }

  async createOrganizationConfigTemplate(organizationId: string, template: any) {
    try {
      const response = await this.axiosInstance.post(`/organizations/${organizationId}/configTemplates`, template);
      return response.data;
    } catch (error) {
      console.error('Error creating organization config template:', error);
      throw error;
    }
  }

  async updateOrganizationConfigTemplate(organizationId: string, templateId: string, template: any) {
    try {
      const response = await this.axiosInstance.put(`/organizations/${organizationId}/configTemplates/${templateId}`, template);
      return response.data;
    } catch (error) {
      console.error('Error updating organization config template:', error);
      throw error;
    }
  }

  async deleteOrganizationConfigTemplate(organizationId: string, templateId: string) {
    try {
      const response = await this.axiosInstance.delete(`/organizations/${organizationId}/configTemplates/${templateId}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting organization config template:', error);
      throw error;
    }
  }

  // Device live tools
  async createDeviceLiveToolsPing(serial: string, target: string, count = 5) {
    try {
      const response = await this.axiosInstance.post(`/devices/${serial}/liveTools/ping`, {
        target,
        count
      });
      return response.data;
    } catch (error) {
      console.error('Error creating device ping test:', error);
      throw error;
    }
  }

  async getDeviceLiveToolsPing(serial: string, id: string) {
    try {
      const response = await this.axiosInstance.get(`/devices/${serial}/liveTools/ping/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching device ping test:', error);
      throw error;
    }
  }

  async createDeviceLiveToolsArpTable(serial: string) {
    try {
      const response = await this.axiosInstance.post(`/devices/${serial}/liveTools/arpTable`);
      return response.data;
    } catch (error) {
      console.error('Error creating device ARP table request:', error);
      throw error;
    }
  }

  async getDeviceLiveToolsArpTable(serial: string, id: string) {
    try {
      const response = await this.axiosInstance.get(`/devices/${serial}/liveTools/arpTable/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching device ARP table:', error);
      throw error;
    }
  }

  async createDeviceLiveToolsCableTest(serial: string, ports: string[]) {
    try {
      const response = await this.axiosInstance.post(`/devices/${serial}/liveTools/cableTest`, {
        ports
      });
      return response.data;
    } catch (error) {
      console.error('Error creating device cable test:', error);
      throw error;
    }
  }

  async getDeviceLiveToolsCableTest(serial: string, id: string) {
    try {
      const response = await this.axiosInstance.get(`/devices/${serial}/liveTools/cableTest/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching device cable test:', error);
      throw error;
    }
  }

  // Advanced monitoring and analytics
  async getOrganizationClientsOverview(organizationId: string, timespan = 86400) {
    try {
      const response = await this.axiosInstance.get(`/organizations/${organizationId}/clients/overview`, {
        params: { timespan }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching organization clients overview:', error);
      throw error;
    }
  }

  async getOrganizationTopClientsReport(organizationId: string, timespan = 86400) {
    try {
      const response = await this.axiosInstance.get(`/organizations/${organizationId}/clients/topUsage`, {
        params: { timespan }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching organization top clients report:', error);
      throw error;
    }
  }

  async getOrganizationTopApplicationsReport(organizationId: string, timespan = 86400) {
    try {
      const response = await this.axiosInstance.get(`/organizations/${organizationId}/summary/top/applications`, {
        params: { timespan }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching organization top applications report:', error);
      throw error;
    }
  }

  async getOrganizationAPIRequests(organizationId: string, timespan = 86400) {
    try {
      const response = await this.axiosInstance.get(`/organizations/${organizationId}/apiRequests`, {
        params: { timespan }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching organization API requests:', error);
      throw error;
    }
  }

  // SSID splash page and hotspot management
  async getWirelessSSIDSplashSettings(networkId: string, ssidNumber: number) {
    try {
      const response = await this.axiosInstance.get(`/networks/${networkId}/wireless/ssids/${ssidNumber}/splash/settings`);
      return response.data;
    } catch (error) {
      console.error('Error fetching wireless SSID splash settings:', error);
      throw error;
    }
  }

  async updateWirelessSSIDSplashSettings(networkId: string, ssidNumber: number, settings: any) {
    try {
      const response = await this.axiosInstance.put(`/networks/${networkId}/wireless/ssids/${ssidNumber}/splash/settings`, settings);
      return response.data;
    } catch (error) {
      console.error('Error updating wireless SSID splash settings:', error);
      throw error;
    }
  }

  async getWirelessSSIDHotspot20(networkId: string, ssidNumber: number) {
    try {
      const response = await this.axiosInstance.get(`/networks/${networkId}/wireless/ssids/${ssidNumber}/hotspot20`);
      return response.data;
    } catch (error) {
      console.error('Error fetching wireless SSID Hotspot 2.0 settings:', error);
      throw error;
    }
  }

  async updateWirelessSSIDHotspot20(networkId: string, ssidNumber: number, settings: any) {
    try {
      const response = await this.axiosInstance.put(`/networks/${networkId}/wireless/ssids/${ssidNumber}/hotspot20`, settings);
      return response.data;
    } catch (error) {
      console.error('Error updating wireless SSID Hotspot 2.0 settings:', error);
      throw error;
    }
  }

  // Traffic shaping and QoS
  async getWirelessSSIDTrafficShaping(networkId: string, ssidNumber: number) {
    try {
      const response = await this.axiosInstance.get(`/networks/${networkId}/wireless/ssids/${ssidNumber}/trafficShaping/rules`);
      return response.data;
    } catch (error) {
      console.error('Error fetching wireless SSID traffic shaping:', error);
      throw error;
    }
  }

  async updateWirelessSSIDTrafficShaping(networkId: string, ssidNumber: number, rules: any) {
    try {
      const response = await this.axiosInstance.put(`/networks/${networkId}/wireless/ssids/${ssidNumber}/trafficShaping/rules`, rules);
      return response.data;
    } catch (error) {
      console.error('Error updating wireless SSID traffic shaping:', error);
      throw error;
    }
  }

  async getApplianceTrafficShaping(networkId: string) {
    try {
      const response = await this.axiosInstance.get(`/networks/${networkId}/appliance/trafficShaping/rules`);
      return response.data;
    } catch (error) {
      console.error('Error fetching appliance traffic shaping:', error);
      throw error;
    }
  }

  async updateApplianceTrafficShaping(networkId: string, rules: any) {
    try {
      const response = await this.axiosInstance.put(`/networks/${networkId}/appliance/trafficShaping/rules`, rules);
      return response.data;
    } catch (error) {
      console.error('Error updating appliance traffic shaping:', error);
      throw error;
    }
  }

  async getApplianceTrafficShapingUplinkBandwidth(networkId: string) {
    try {
      const response = await this.axiosInstance.get(`/networks/${networkId}/appliance/trafficShaping/uplinkBandwidth`);
      return response.data;
    } catch (error) {
      console.error('Error fetching appliance uplink bandwidth:', error);
      throw error;
    }
  }

  async updateApplianceTrafficShapingUplinkBandwidth(networkId: string, bandwidth: any) {
    try {
      const response = await this.axiosInstance.put(`/networks/${networkId}/appliance/trafficShaping/uplinkBandwidth`, bandwidth);
      return response.data;
    } catch (error) {
      console.error('Error updating appliance uplink bandwidth:', error);
      throw error;
    }
  }

  // Switch port management
  async getSwitchPortStatuses(serial: string) {
    try {
      const response = await this.axiosInstance.get(`/devices/${serial}/switch/ports/statuses`);
      return response.data;
    } catch (error) {
      console.error('Error fetching switch port statuses:', error);
      throw error;
    }
  }

  async getSwitchPort(serial: string, portId: string) {
    try {
      const response = await this.axiosInstance.get(`/devices/${serial}/switch/ports/${portId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching switch port:', error);
      throw error;
    }
  }

  async updateSwitchPort(serial: string, portId: string, config: any) {
    try {
      const response = await this.axiosInstance.put(`/devices/${serial}/switch/ports/${portId}`, config);
      return response.data;
    } catch (error) {
      console.error('Error updating switch port:', error);
      throw error;
    }
  }

  async getSwitchPortsStatuses(serial: string) {
    try {
      const response = await this.axiosInstance.get(`/devices/${serial}/switch/ports/statuses`);
      return response.data;
    } catch (error) {
      console.error('Error fetching switch ports statuses:', error);
      throw error;
    }
  }

  async getSwitchPorts(serial: string) {
    try {
      const response = await this.axiosInstance.get(`/devices/${serial}/switch/ports`);
      return response.data;
    } catch (error) {
      console.error('Error fetching switch ports:', error);
      throw error;
    }
  }
}

export default MerakiAPI;
