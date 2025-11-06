import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  BarChart3, 
  Download, 
  Filter, 
  Play, 
  Plus, 
  Settings, 
  X, 
  Calendar,
  Building,
  Wifi,
  Shield,
  Users,
  Database,
  Loader2,
  CheckCircle,
  Clock,
  RefreshCw,
  FileText,
  TrendingUp,
  Eye,
  MapPin,
  Globe
} from 'lucide-react';

// Report Builder Types
export interface ReportFilter {
  id: string;
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'greater_than' | 'less_than' | 'in' | 'not_in';
  value: string | string[];
  dataType: 'string' | 'number' | 'boolean' | 'date' | 'array';
}

export interface ReportConfig {
  id: string;
  name: string;
  description: string;
  dataSource: string;
  selectedOrgs: string[];
  selectedNetworks: string[];
  filters: ReportFilter[];
  columns: string[];
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  limit?: number;
  groupBy?: string[];
  aggregations?: { field: string; function: 'count' | 'sum' | 'avg' | 'min' | 'max' }[];
}

export interface ReportProgress {
  phase: 'validating' | 'fetching' | 'filtering' | 'processing' | 'completed' | 'error';
  message: string;
  percentage: number;
  startTime: Date;
  endTime?: Date;
  recordsProcessed?: number;
  totalRecords?: number;
  currentRequest?: string;
  totalRequests?: number;
  completedRequests?: number;
}

export interface ReportResults {
  data: any[];
  summary: {
    totalRecords: number;
    recordsReturned: number;
    executionTime: number;
    cacheHit: boolean;
    dataSource: string;
    filters: number;
    generatedAt: Date;
  };
  metadata: {
    columns: string[];
    types: { [key: string]: string };
    preview: any[];
  };
}

// Available data sources based on our API endpoints
const DATA_SOURCES = [
  {
    id: 'organizations',
    name: 'Organizations',
    icon: Building,
    description: 'Organization data and configuration',
    endpoint: '/api/organizations',
    fields: [
      { name: 'id', type: 'string', label: 'Organization ID' },
      { name: 'name', type: 'string', label: 'Organization Name' },
      { name: 'url', type: 'string', label: 'Dashboard URL' },
      { name: 'api.enabled', type: 'boolean', label: 'API Enabled' },
      { name: 'licensing.model', type: 'string', label: 'Licensing Model' },
      { name: 'cloud.region.name', type: 'string', label: 'Cloud Region' }
    ]
  },
  {
    id: 'organization-details',
    name: 'Organization Details',
    icon: Building,
    description: 'Detailed organization information',
    endpoint: '/api/organization/[organizationId]',
    fields: [
      { name: 'id', type: 'string', label: 'Organization ID' },
      { name: 'name', type: 'string', label: 'Name' },
      { name: 'url', type: 'string', label: 'URL' },
      { name: 'api.enabled', type: 'boolean', label: 'API Enabled' },
      { name: 'licensing.model', type: 'string', label: 'Licensing Model' },
      { name: 'management.details', type: 'array', label: 'Management Details' }
    ]
  },
  {
    id: 'inventory',
    name: 'Device Inventory',
    icon: Database,
    description: 'Device inventory across organizations',
    endpoint: '/api/organization/[organizationId]?action=inventory',
    fields: [
      { name: 'serial', type: 'string', label: 'Serial Number' },
      { name: 'mac', type: 'string', label: 'MAC Address' },
      { name: 'name', type: 'string', label: 'Device Name' },
      { name: 'model', type: 'string', label: 'Model' },
      { name: 'productType', type: 'string', label: 'Product Type' },
      { name: 'networkId', type: 'string', label: 'Network ID' },
      { name: 'networkName', type: 'string', label: 'Network Name' },
      { name: 'status', type: 'string', label: 'Status' },
      { name: 'firmware', type: 'string', label: 'Firmware Version' },
      { name: 'lanIp', type: 'string', label: 'LAN IP' },
      { name: 'publicIp', type: 'string', label: 'Public IP' },
      { name: 'lastReportedAt', type: 'date', label: 'Last Reported' }
    ]
  },
  {
    id: 'networks',
    name: 'Networks',
    icon: Wifi,
    description: 'Network configuration and details',
    endpoint: '/api/networks',
    fields: [
      { name: 'id', type: 'string', label: 'Network ID' },
      { name: 'organizationId', type: 'string', label: 'Organization ID' },
      { name: 'name', type: 'string', label: 'Network Name' },
      { name: 'productTypes', type: 'array', label: 'Product Types' },
      { name: 'timeZone', type: 'string', label: 'Time Zone' },
      { name: 'tags', type: 'array', label: 'Tags' },
      { name: 'url', type: 'string', label: 'Dashboard URL' }
    ]
  },
  {
    id: 'network-devices',
    name: 'Network Devices',
    icon: Database,
    description: 'Devices within specific networks',
    endpoint: '/api/network/[networkId]/devices',
    fields: [
      { name: 'serial', type: 'string', label: 'Serial Number' },
      { name: 'mac', type: 'string', label: 'MAC Address' },
      { name: 'name', type: 'string', label: 'Device Name' },
      { name: 'model', type: 'string', label: 'Model' },
      { name: 'productType', type: 'string', label: 'Product Type' },
      { name: 'networkId', type: 'string', label: 'Network ID' },
      { name: 'networkName', type: 'string', label: 'Network Name' },
      { name: 'firmware', type: 'string', label: 'Firmware' },
      { name: 'lanIp', type: 'string', label: 'LAN IP' },
      { name: 'wan1Ip', type: 'string', label: 'WAN IP' },
      { name: 'status', type: 'string', label: 'Status' },
      { name: 'lastReportedAt', type: 'date', label: 'Last Reported' }
    ]
  },
  {
    id: 'firewall-rules',
    name: 'Firewall Rules',
    icon: Shield,
    description: 'Layer 3 firewall rules',
    endpoint: '/api/firewall/[networkId]',
    fields: [
      { name: 'networkId', type: 'string', label: 'Network ID' },
      { name: 'networkName', type: 'string', label: 'Network Name' },
      { name: 'comment', type: 'string', label: 'Rule Comment' },
      { name: 'policy', type: 'string', label: 'Policy' },
      { name: 'protocol', type: 'string', label: 'Protocol' },
      { name: 'srcCidr', type: 'string', label: 'Source CIDR' },
      { name: 'destCidr', type: 'string', label: 'Destination CIDR' },
      { name: 'srcPort', type: 'string', label: 'Source Port' },
      { name: 'destPort', type: 'string', label: 'Destination Port' },
      { name: 'syslogEnabled', type: 'boolean', label: 'Syslog Enabled' }
    ]
  },
  {
    id: 'layer7-firewall',
    name: 'Layer 7 Firewall',
    icon: Shield,
    description: 'Application-based firewall rules',
    endpoint: '/api/firewall/layer7/[networkId]',
    fields: [
      { name: 'networkId', type: 'string', label: 'Network ID' },
      { name: 'networkName', type: 'string', label: 'Network Name' },
      { name: 'comment', type: 'string', label: 'Rule Comment' },
      { name: 'policy', type: 'string', label: 'Policy' },
      { name: 'applications', type: 'array', label: 'Applications' },
      { name: 'srcCidr', type: 'string', label: 'Source CIDR' },
      { name: 'priority', type: 'string', label: 'Priority' },
      { name: 'enabled', type: 'boolean', label: 'Enabled' }
    ]
  },
  {
    id: 'content-filtering',
    name: 'Content Filtering',
    icon: Filter,
    description: 'Content filtering rules and settings',
    endpoint: '/api/firewall/content-filtering/[networkId]',
    fields: [
      { name: 'networkId', type: 'string', label: 'Network ID' },
      { name: 'networkName', type: 'string', label: 'Network Name' },
      { name: 'name', type: 'string', label: 'Filter Name' },
      { name: 'categories', type: 'array', label: 'Blocked Categories' },
      { name: 'blockedSites', type: 'array', label: 'Blocked Sites' },
      { name: 'allowedSites', type: 'array', label: 'Allowed Sites' },
      { name: 'safeSearch.google', type: 'boolean', label: 'Google Safe Search' },
      { name: 'safeSearch.bing', type: 'boolean', label: 'Bing Safe Search' },
      { name: 'enabled', type: 'boolean', label: 'Enabled' }
    ]
  },
  {
    id: 'geo-locations',
    name: 'Geographic Locations',
    icon: MapPin,
    description: 'Device and network geographical information',
    endpoint: '/api/reports/geo-locations',
    fields: [
      { name: 'networkId', type: 'string', label: 'Network ID' },
      { name: 'networkName', type: 'string', label: 'Network Name' },
      { name: 'organizationId', type: 'string', label: 'Organization ID' },
      { name: 'organizationName', type: 'string', label: 'Organization Name' },
      { name: 'deviceSerial', type: 'string', label: 'Device Serial' },
      { name: 'deviceName', type: 'string', label: 'Device Name' },
      { name: 'deviceModel', type: 'string', label: 'Device Model' },
      { name: 'deviceType', type: 'string', label: 'Device Type' },
      { name: 'publicIp', type: 'string', label: 'Public IP Address' },
      { name: 'country', type: 'string', label: 'Country' },
      { name: 'countryCode', type: 'string', label: 'Country Code' },
      { name: 'region', type: 'string', label: 'Region/State' },
      { name: 'city', type: 'string', label: 'City' },
      { name: 'latitude', type: 'number', label: 'Latitude' },
      { name: 'longitude', type: 'number', label: 'Longitude' },
      { name: 'timezone', type: 'string', label: 'Time Zone' },
      { name: 'isp', type: 'string', label: 'Internet Service Provider' },
      { name: 'asn', type: 'string', label: 'ASN (Autonomous System Number)' },
      { name: 'lastUpdated', type: 'date', label: 'Last Updated' },
      { name: 'status', type: 'string', label: 'Device Status' }
    ]
  },
  {
    id: 'geo-analytics',
    name: 'Geographic Analytics',
    icon: Globe,
    description: 'Network traffic and usage analytics by geographic location',
    endpoint: '/api/reports/geo-analytics',
    fields: [
      { name: 'networkId', type: 'string', label: 'Network ID' },
      { name: 'networkName', type: 'string', label: 'Network Name' },
      { name: 'country', type: 'string', label: 'Country' },
      { name: 'region', type: 'string', label: 'Region/State' },
      { name: 'city', type: 'string', label: 'City' },
      { name: 'deviceCount', type: 'number', label: 'Device Count' },
      { name: 'activeDevices', type: 'number', label: 'Active Devices' },
      { name: 'offlineDevices', type: 'number', label: 'Offline Devices' },
      { name: 'totalBandwidthMbps', type: 'number', label: 'Total Bandwidth (Mbps)' },
      { name: 'utilizationPercent', type: 'number', label: 'Bandwidth Utilization (%)' },
      { name: 'clientCount', type: 'number', label: 'Connected Clients' },
      { name: 'uptime', type: 'number', label: 'Average Uptime (%)' },
      { name: 'latencyMs', type: 'number', label: 'Average Latency (ms)' },
      { name: 'dataUsageGB', type: 'number', label: 'Data Usage (GB)' },
      { name: 'securityAlerts', type: 'number', label: 'Security Alerts' },
      { name: 'reportDate', type: 'date', label: 'Report Date' }
    ]
  },
  {
    id: 'clients',
    name: 'Network Clients',
    icon: Users,
    description: 'Connected clients and usage data',
    endpoint: '/api/network/[networkId]/clients',
    fields: [
      { name: 'networkId', type: 'string', label: 'Network ID' },
      { name: 'networkName', type: 'string', label: 'Network Name' },
      { name: 'id', type: 'string', label: 'Client ID' },
      { name: 'mac', type: 'string', label: 'MAC Address' },
      { name: 'description', type: 'string', label: 'Description' },
      { name: 'ip', type: 'string', label: 'IP Address' },
      { name: 'vlan', type: 'number', label: 'VLAN' },
      { name: 'usage.sent', type: 'number', label: 'Data Sent (MB)' },
      { name: 'usage.recv', type: 'number', label: 'Data Received (MB)' },
      { name: 'status', type: 'string', label: 'Status' },
      { name: 'firstSeen', type: 'date', label: 'First Seen' },
      { name: 'lastSeen', type: 'date', label: 'Last Seen' }
    ]
  },
  {
    id: 'policy-objects',
    name: 'Policy Objects',
    icon: Shield,
    description: 'Organization-level policy objects (IPs, FQDNs, ports, etc.)',
    endpoint: '/api/organization/[organizationId]/policyObjects',
    fields: [
      { name: 'organizationId', type: 'string', label: 'Organization ID' },
      { name: 'id', type: 'string', label: 'Policy Object ID' },
      { name: 'name', type: 'string', label: 'Name' },
      { name: 'category', type: 'string', label: 'Category' },
      { name: 'type', type: 'string', label: 'Type' },
      { name: 'cidr', type: 'string', label: 'CIDR' },
      { name: 'fqdn', type: 'string', label: 'FQDN' },
      { name: 'mask', type: 'string', label: 'Mask' },
      { name: 'groupIds', type: 'array', label: 'Group IDs' }
    ]
  },
  {
    id: 'policy-object-groups',
    name: 'Policy Object Groups',
    icon: Shield,
    description: 'Organization-level policy object groups',
    endpoint: '/api/organization/[organizationId]/policyObjects/groups',
    fields: [
      { name: 'organizationId', type: 'string', label: 'Organization ID' },
      { name: 'id', type: 'string', label: 'Group ID' },
      { name: 'name', type: 'string', label: 'Name' },
      { name: 'category', type: 'string', label: 'Category' },
      { name: 'objectIds', type: 'array', label: 'Object IDs' }
    ]
  },
  {
    id: 'lockdown-report',
    name: 'Lockdown Report',
    icon: Shield,
    description: 'Analyze firewall rules to identify networks with deny-all rules',
    endpoint: '/api/reports/lockdown',
    fields: [
      { name: 'organizationId', type: 'string', label: 'Organization ID' },
      { name: 'organizationName', type: 'string', label: 'Organization Name' },
      { name: 'networkId', type: 'string', label: 'Network ID' },
      { name: 'networkName', type: 'string', label: 'Network Name' },
      { name: 'hasDenyAllRule', type: 'boolean', label: 'Has Deny-All Rule' },
      { name: 'lastRulePolicy', type: 'string', label: 'Last Rule Policy' },
      { name: 'lastRuleComment', type: 'string', label: 'Last Rule Comment' }
    ]
  }
];

const OPERATORS = {
  string: [
    { value: 'equals', label: 'Equals' },
    { value: 'not_equals', label: 'Not Equals' },
    { value: 'contains', label: 'Contains' },
    { value: 'not_contains', label: 'Does Not Contain' }
  ],
  number: [
    { value: 'equals', label: 'Equals' },
    { value: 'not_equals', label: 'Not Equals' },
    { value: 'greater_than', label: 'Greater Than' },
    { value: 'less_than', label: 'Less Than' }
  ],
  boolean: [
    { value: 'equals', label: 'Equals' }
  ],
  date: [
    { value: 'equals', label: 'On Date' },
    { value: 'greater_than', label: 'After' },
    { value: 'less_than', label: 'Before' }
  ],
  array: [
    { value: 'contains', label: 'Contains' },
    { value: 'not_contains', label: 'Does Not Contain' },
    { value: 'in', label: 'In List' },
    { value: 'not_in', label: 'Not In List' }
  ]
};

export default function ReportBuilder() {
  const [reportConfig, setReportConfig] = useState<ReportConfig>({
    id: '',
    name: '',
    description: '',
    dataSource: '',
    selectedOrgs: [],
    selectedNetworks: [],
    filters: [],
    columns: [],
    sortBy: '',
    sortOrder: 'asc'
  });

  const [organizations, setOrganizations] = useState<any[]>([]);
  const [networks, setNetworks] = useState<any[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [reportResults, setReportResults] = useState<ReportResults | null>(null);
  const [reportProgress, setReportProgress] = useState<ReportProgress | null>(null);
  const [reportError, setReportError] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<'builder' | 'loading' | 'results'>('builder');
  const [reportId, setReportId] = useState<string | null>(null);

  // Fetch organizations on mount
  useEffect(() => {
    fetchOrganizations();
  }, []);

  const fetchOrganizations = async () => {
    try {
      const response = await fetch('/api/organizations');
      const data = await response.json();
      setOrganizations(data);
    } catch (error) {
      console.error('Error fetching organizations:', error);
    }
  };

  const fetchNetworks = useCallback(async () => {
    try {
      // Fetch networks for selected organizations
      const allNetworks: any[] = [];
      for (const orgId of reportConfig.selectedOrgs) {
        const response = await fetch(`/api/organization/${orgId}?action=networks`);
        const data = await response.json();
        allNetworks.push(...data);
      }
      setNetworks(allNetworks);
    } catch (error) {
      console.error('Error fetching networks:', error);
    }
  }, [reportConfig.selectedOrgs]);

  // Fetch networks when organizations are selected
  useEffect(() => {
    if (reportConfig.selectedOrgs.length > 0) {
      fetchNetworks();
    }
  }, [reportConfig.selectedOrgs, fetchNetworks]);

  const selectedDataSource = DATA_SOURCES.find(ds => ds.id === reportConfig.dataSource);

  const addFilter = () => {
    const newFilter: ReportFilter = {
      id: Date.now().toString(),
      field: '',
      operator: 'equals',
      value: '',
      dataType: 'string'
    };
    setReportConfig(prev => ({
      ...prev,
      filters: [...prev.filters, newFilter]
    }));
  };

  const updateFilter = (filterId: string, updates: Partial<ReportFilter>) => {
    setReportConfig(prev => ({
      ...prev,
      filters: prev.filters.map(filter =>
        filter.id === filterId ? { ...filter, ...updates } : filter
      )
    }));
  };

  const removeFilter = (filterId: string) => {
    setReportConfig(prev => ({
      ...prev,
      filters: prev.filters.filter(filter => filter.id !== filterId)
    }));
  };

  const generateReport = async () => {
    setIsGenerating(true);
    setReportError(null);
    setCurrentView('loading');

    const startTime = new Date();

    try {
      // Phase 1: Validating configuration
      setReportProgress({
        phase: 'validating',
        message: 'Validating report configuration...',
        percentage: 10,
        startTime
      });

      await new Promise(resolve => setTimeout(resolve, 500)); // Simulate validation time

      // Phase 2: Fetching data
      const estimatedRequests = reportConfig.selectedOrgs.length * 3; // Estimate: org details + networks + devices per org
      setReportProgress({
        phase: 'fetching',
        message: 'Fetching data from selected sources...',
        percentage: 30,
        startTime,
        totalRequests: estimatedRequests,
        completedRequests: 0,
        currentRequest: 'Organizations'
      });

      // Simulate progressive request updates
      const updateRequestProgress = (current: string, completed: number) => {
        setReportProgress({
          phase: 'fetching',
          message: 'Fetching data from selected sources...',
          percentage: 30 + (completed / estimatedRequests) * 30, // 30% to 60%
          startTime,
          totalRequests: estimatedRequests,
          completedRequests: completed,
          currentRequest: current
        });
      };

      // Simulate some request updates
      await new Promise(resolve => setTimeout(resolve, 200));
      updateRequestProgress('Organization details', Math.floor(estimatedRequests * 0.3));

      await new Promise(resolve => setTimeout(resolve, 200));
      updateRequestProgress('Network configurations', Math.floor(estimatedRequests * 0.6));

      await new Promise(resolve => setTimeout(resolve, 200));
      updateRequestProgress('Device inventories', Math.floor(estimatedRequests * 0.9));

      console.log('Sending report config to backend:', JSON.stringify(reportConfig, null, 2));

      const response = await fetch('/api/reports/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(reportConfig),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Phase 3: Processing data
      setReportProgress({
        phase: 'filtering',
        message: 'Applying filters and conditions...',
        percentage: 60,
        startTime
      });

      await new Promise(resolve => setTimeout(resolve, 300)); // Simulate processing time

      setReportProgress({
        phase: 'processing',
        message: 'Processing and formatting results...',
        percentage: 80,
        startTime
      });

      let data = await response.json();

      // --- BEGIN: Translate networkId and GRP/OBJ values ---
      // Helper: fetch all networks for mapping
      const fetchNetworkMap = async () => {
        const allNetworks: any[] = [];
        for (const orgId of reportConfig.selectedOrgs) {
          const resp = await fetch(`/api/organization/${orgId}?action=networks`);
          if (resp.ok) {
            const nets = await resp.json();
            allNetworks.push(...nets);
          }
        }
        // Map: networkId -> networkName
        const map: Record<string, string> = {};
        allNetworks.forEach(net => {
          map[net.id] = net.name;
        });
        return map;
      };

      // Organization caches to ensure single API call per org
      let organizationCaches: Map<string, { groups: Record<string, string>, objects: Record<string, string> }> = new Map();

      // Helper: Build caches for all organizations upfront
      const buildOrganizationCaches = async () => {
        console.log(`Frontend: Building caches for organizations: ${reportConfig.selectedOrgs.join(', ')}`);
        
        for (const orgId of reportConfig.selectedOrgs) {
          if (organizationCaches.has(orgId)) {
            console.log(`Frontend: Cache already exists for org ${orgId}, skipping`);
            continue;
          }

          const orgCache: { groups: Record<string, string>, objects: Record<string, string> } = { 
            groups: {}, 
            objects: {} 
          };
          
          try {
            // Fetch groups for this organization
            console.log(`Frontend: Fetching groups for organization ${orgId}`);
            const groupResp = await fetch(`/api/organization/${orgId}/policyObjects/groups`);
            if (groupResp.ok) {
              const groups = await groupResp.json();
              if (Array.isArray(groups)) {
                console.log(`Frontend: Loaded ${groups.length} groups for org ${orgId}`);
                groups.forEach((group: any) => {
                  orgCache.groups[group.id] = group.name;
                });
              }
            }
          } catch (error) {
            console.log(`Frontend: Failed to fetch groups for org ${orgId}:`, error);
          }

          try {
            // Fetch objects for this organization
            console.log(`Frontend: Fetching objects for organization ${orgId}`);
            const objectResp = await fetch(`/api/organization/${orgId}/policyObjects`);
            if (objectResp.ok) {
              const objects = await objectResp.json();
              if (Array.isArray(objects)) {
                console.log(`Frontend: Loaded ${objects.length} objects for org ${orgId}`);
                objects.forEach((obj: any) => {
                  orgCache.objects[obj.id] = obj.name;
                });
              }
            }
          } catch (error) {
            console.log(`Frontend: Failed to fetch objects for org ${orgId}:`, error);
          }

          organizationCaches.set(orgId, orgCache);
          console.log(`Frontend: Completed cache for org ${orgId} - Groups: ${Object.keys(orgCache.groups).length}, Objects: ${Object.keys(orgCache.objects).length}`);
        }
        
        console.log(`Frontend: Cache building complete for ${organizationCaches.size} organizations`);
      };

      // Helper: Look up value in all organization caches
      const lookupInCaches = (id: string, type: 'groups' | 'objects'): string | null => {
        for (const [orgId, cache] of organizationCaches.entries()) {
          if (cache[type][id]) {
            console.log(`Frontend: Found ${type.slice(0, -1)} translation in org ${orgId}: ${id} -> ${cache[type][id]}`);
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
          console.log(`Frontend: Processing comma-separated values: ${value}`);
          
          // Split by comma and process each part
          const parts = value.split(',').map(part => part.trim());
          const translatedParts: string[] = [];
          
          for (const part of parts) {
            const translatedPart = await translateSpecialValue(part); // Recursive call for individual parts
            translatedParts.push(translatedPart);
          }
          
          const result = translatedParts.join(', ');
          console.log(`Frontend: Comma-separated translation result: ${result}`);
          return result;
        }
        
        // Handle Group references (GRP(...))
        const grpMatch = value.match(/^GRP\(([^)]+)\)$/);
        if (grpMatch) {
          const groupId = grpMatch[1];
          console.log(`Frontend: Extracting group ID from ${value}: ${groupId}`);
          
          const translatedName = lookupInCaches(groupId, 'groups');
          if (translatedName) {
            console.log(`Frontend: Found group translation: ${value} -> ${translatedName}`);
            return translatedName;
          }
        }
        
        // Handle Object references (OBJ(...))
        const objMatch = value.match(/^OBJ\(([^)]+)\)$/);
        if (objMatch) {
          const objectId = objMatch[1];
          console.log(`Frontend: Extracting object ID from ${value}: ${objectId}`);
          
          const translatedName = lookupInCaches(objectId, 'objects');
          if (translatedName) {
            console.log(`Frontend: Found object translation: ${value} -> ${translatedName}`);
            return translatedName;
          }
        }
        
        return value; // Return original if no translation found
      };

      // Build caches upfront
      await buildOrganizationCaches();

      // Only process if preview/data exists
      if (Array.isArray(data.preview)) {
        // Always fetch network map for any report
        const networkMap = await fetchNetworkMap();
        
        data.preview = await Promise.all(
          data.preview.map(async (row: any) => {
            // 1. Translate networkId to networkName (if networkId exists)
            if (row.networkId && !row.networkName) {
              row.networkName = networkMap[row.networkId] || row.networkId;
            }
            
            // 2. Translate GRP/OBJ values in all fields
            for (const key of Object.keys(row)) {
              if (typeof row[key] === 'string' && (row[key].startsWith('GRP') || row[key].startsWith('OBJ'))) {
                console.log(`Translating ${key}: ${row[key]}`);
                row[key] = await translateSpecialValue(row[key]);
                console.log(`Translated to: ${row[key]}`);
              }
            }
            return row;
          })
        );

        // Auto-add networkName to columns if networkId is present but networkName is not
        if (data.preview.some((row: any) => row.networkId) && 
            reportConfig.columns.includes('networkId') && 
            !reportConfig.columns.includes('networkName')) {
          setReportConfig(prev => ({
            ...prev,
            columns: [...prev.columns, 'networkName']
          }));
        }
      }
      // --- END: Translate networkId and GRP/OBJ values ---

      // Phase 4: Completed
      const endTime = new Date();
      setReportProgress({
        phase: 'completed',
        message: 'Report generated successfully!',
        percentage: 100,
        startTime,
        endTime,
        recordsProcessed: data.metadata?.returnedRecords || 0,
        totalRecords: data.metadata?.totalRecords || 0,
        totalRequests: estimatedRequests,
        completedRequests: estimatedRequests,
        currentRequest: 'All requests completed'
      });

      // Store the reportId for later use
      setReportId(data.reportId);

      console.log('Report data received:', data);
      console.log('Preview data:', data.preview);

      // Transform the preview to match our structure
      const reportResults: ReportResults = {
        data: data.preview || [],
        summary: {
          totalRecords: data.metadata?.totalRecords || 0,
          recordsReturned: data.metadata?.returnedRecords || 0,
          executionTime: endTime.getTime() - startTime.getTime(),
          cacheHit: false,
          dataSource: reportConfig.dataSource,
          filters: reportConfig.filters.length,
          generatedAt: new Date()
        },
        metadata: {
          columns: reportConfig.columns,
          types: {},
          preview: data.preview || []
        }
      };

      console.log('Report results set:', reportResults);
      setReportResults(reportResults);

      // Auto-transition to results after a short delay
      setTimeout(() => {
        setCurrentView('results');
      }, 1500);

    } catch (error) {
      console.error('Error generating report:', error);
      const endTime = new Date();
      setReportProgress({
        phase: 'error',
        message: `Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`,
        percentage: 0,
        startTime,
        endTime
      });
      setReportError(error instanceof Error ? error.message : 'Unknown error occurred');
    } finally {
      setIsGenerating(false);
    }
  };

  const exportReport = async (format: 'csv' | 'json') => {
    console.log('Export report called with format:', format);
    console.log('Current reportId:', reportId);
    
    if (!reportId) {
      console.error('No report ID available for export');
      alert('No report ID available. Please generate a report first.');
      return;
    }
    
    try {
      console.log('Sending export request...');
      const response = await fetch('/api/reports/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          reportId,
          format 
        }),
      });
      
      console.log('Export response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Export error:', errorText);
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }
      
      const blob = await response.blob();
      console.log('Blob size:', blob.size);
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${reportConfig.name || 'report'}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      console.log('Export completed successfully');
    } catch (error) {
      console.error('Error exporting report:', error);
      alert(`Error exporting report: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Loading Page Component
  const LoadingPage = () => {
    const progressBarRef = React.useRef<HTMLDivElement>(null);
    const percentage = reportProgress ? Math.min(100, Math.max(0, reportProgress.percentage || 0)) : 0;

    React.useEffect(() => {
      if (progressBarRef.current) {
        progressBarRef.current.style.setProperty('--progress-width', `${percentage}%`);
      }
    }, [percentage]);

    return (
      <div className="container mx-auto p-6">
        <Card className="max-w-2xl mx-auto">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2">
              <Loader2 className="w-6 h-6 animate-spin" />
              Generating Report
            </CardTitle>
            <CardDescription>
              Please wait while we process your request...
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {reportProgress && (
              <>
                {/* Progress Bar */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="capitalize font-medium">{reportProgress.phase}</span>
                    <span>{reportProgress.percentage}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      ref={progressBarRef}
                      className="bg-blue-600 h-2 rounded-full progress-bar transition-all duration-300"
                    />
                  </div>
                </div>

              {/* Progress Message */}
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                {reportProgress.phase === 'validating' && <CheckCircle className="w-4 h-4" />}
                {reportProgress.phase === 'fetching' && <Database className="w-4 h-4" />}
                {reportProgress.phase === 'filtering' && <Filter className="w-4 h-4" />}
                {reportProgress.phase === 'processing' && <Settings className="w-4 h-4" />}
                {reportProgress.phase === 'completed' && <CheckCircle className="w-4 h-4 text-green-600" />}
                {reportProgress.phase === 'error' && <X className="w-4 h-4 text-red-600" />}
                <span>{reportProgress.message}</span>
              </div>

              {/* Timing Information */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <span>Started: {reportProgress.startTime.toLocaleTimeString()}</span>
                </div>
                {reportProgress.endTime && (
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span>
                      Completed in {((reportProgress.endTime.getTime() - reportProgress.startTime.getTime()) / 1000).toFixed(1)}s
                    </span>
                  </div>
                )}
              </div>

              {/* Records Information */}
              {reportProgress.recordsProcessed !== undefined && (
                <div className="flex items-center gap-2 text-sm">
                  <FileText className="w-4 h-4 text-muted-foreground" />
                  <span>
                    Processed {reportProgress.recordsProcessed} of {reportProgress.totalRecords || reportProgress.recordsProcessed} records
                  </span>
                </div>
              )}

              {/* Request Progress Information */}
              {reportProgress.totalRequests !== undefined && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Database className="w-4 h-4 text-muted-foreground" />
                    <span>
                      API Requests: {reportProgress.completedRequests || 0} of {reportProgress.totalRequests}
                    </span>
                  </div>
                  {reportProgress.currentRequest && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Current: {reportProgress.currentRequest}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Error Display */}
              {reportProgress.phase === 'error' && reportError && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center gap-2 text-red-800 font-medium mb-2">
                    <X className="w-4 h-4" />
                    Error occurred
                  </div>
                  <p className="text-red-700 text-sm">{reportError}</p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="mt-3"
                    onClick={() => setCurrentView('builder')}
                  >
                    Back to Report Builder
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
    );
  };

  // Results Page Component
  const ResultsPage = () => {
    if (!reportResults) return null;

    const loadFullData = async () => {
      if (!reportId) return;
      
      try {
        const response = await fetch(`/api/reports/download?reportId=${reportId}`);
        const fullReport = await response.json();
        
        if (fullReport.success) {
          let fullData = fullReport.data;

          // Organization caches to ensure single API call per org
          let organizationCaches: Map<string, { groups: Record<string, string>, objects: Record<string, string> }> = new Map();

          // Helper: Build caches for all organizations upfront
          const buildOrganizationCaches = async () => {
            console.log(`LoadData: Building caches for organizations: ${reportConfig.selectedOrgs.join(', ')}`);
            
            for (const orgId of reportConfig.selectedOrgs) {
              if (organizationCaches.has(orgId)) {
                console.log(`LoadData: Cache already exists for org ${orgId}, skipping`);
                continue;
              }

              const orgCache: { groups: Record<string, string>, objects: Record<string, string> } = { 
                groups: {}, 
                objects: {} 
              };
              
              try {
                // Fetch groups for this organization
                console.log(`LoadData: Fetching groups for organization ${orgId}`);
                const groupResp = await fetch(`/api/organization/${orgId}/policyObjects/groups`);
                if (groupResp.ok) {
                  const groups = await groupResp.json();
                  if (Array.isArray(groups)) {
                    console.log(`LoadData: Loaded ${groups.length} groups for org ${orgId}`);
                    groups.forEach((group: any) => {
                      orgCache.groups[group.id] = group.name;
                    });
                  }
                }
              } catch (error) {
                console.log(`LoadData: Failed to fetch groups for org ${orgId}:`, error);
              }

              try {
                // Fetch objects for this organization
                console.log(`LoadData: Fetching objects for organization ${orgId}`);
                const objectResp = await fetch(`/api/organization/${orgId}/policyObjects`);
                if (objectResp.ok) {
                  const objects = await objectResp.json();
                  if (Array.isArray(objects)) {
                    console.log(`LoadData: Loaded ${objects.length} objects for org ${orgId}`);
                    objects.forEach((obj: any) => {
                      orgCache.objects[obj.id] = obj.name;
                    });
                  }
                }
              } catch (error) {
                console.log(`LoadData: Failed to fetch objects for org ${orgId}:`, error);
              }

              organizationCaches.set(orgId, orgCache);
              console.log(`LoadData: Completed cache for org ${orgId} - Groups: ${Object.keys(orgCache.groups).length}, Objects: ${Object.keys(orgCache.objects).length}`);
            }
            
            console.log(`LoadData: Cache building complete for ${organizationCaches.size} organizations`);
          };

          // Helper: Look up value in all organization caches
          const lookupInCaches = (id: string, type: 'groups' | 'objects'): string | null => {
            for (const [orgId, cache] of organizationCaches.entries()) {
              if (cache[type][id]) {
                console.log(`LoadData: Found ${type.slice(0, -1)} translation in org ${orgId}: ${id} -> ${cache[type][id]}`);
                return cache[type][id];
              }
            }
            return null;
          };

          // Apply the same translations to full data
          // Helper: fetch all networks for mapping
          const fetchNetworkMap = async () => {
            const allNetworks: any[] = [];
            for (const orgId of reportConfig.selectedOrgs) {
              const resp = await fetch(`/api/organization/${orgId}?action=networks`);
              if (resp.ok) {
                const nets = await resp.json();
                allNetworks.push(...nets);
              }
            }
            // Map: networkId -> networkName
            const map: Record<string, string> = {};
            allNetworks.forEach(net => {
              map[net.id] = net.name;
            });
            return map;
          };

          // Helper: translate GRP/OBJ values
          const translateSpecialValue = async (value: string) => {
            if (typeof value !== 'string') return value;
            
            // Check if value contains comma-separated GRP/OBJ values
            if (value.includes(',') && (value.includes('GRP(') || value.includes('OBJ('))) {
              console.log(`LoadData: Processing comma-separated values: ${value}`);
              
              // Split by comma and process each part
              const parts = value.split(',').map(part => part.trim());
              const translatedParts: string[] = [];
              
              for (const part of parts) {
                const translatedPart = await translateSpecialValue(part); // Recursive call for individual parts
                translatedParts.push(translatedPart);
              }
              
              const result = translatedParts.join(', ');
              console.log(`LoadData: Comma-separated translation result: ${result}`);
              return result;
            }
            
            // Handle Group references (GRP(...))
            const grpMatch = value.match(/^GRP\(([^)]+)\)$/);
            if (grpMatch) {
              const groupId = grpMatch[1];
              console.log(`LoadData: Extracting group ID from ${value}: ${groupId}`);
              
              const translatedName = lookupInCaches(groupId, 'groups');
              if (translatedName) {
                console.log(`LoadData: Found group translation: ${value} -> ${translatedName}`);
                return translatedName;
              }
            }
            
            // Handle Object references (OBJ(...))
            const objMatch = value.match(/^OBJ\(([^)]+)\)$/);
            if (objMatch) {
              const objectId = objMatch[1];
              console.log(`LoadData: Extracting object ID from ${value}: ${objectId}`);
              
              const translatedName = lookupInCaches(objectId, 'objects');
              if (translatedName) {
                console.log(`LoadData: Found object translation: ${value} -> ${translatedName}`);
                return translatedName;
              }
            }
            
            return value; // Return original if no translation found
          };

          // Build caches upfront
          await buildOrganizationCaches();

          // Apply translations to full data
          if (Array.isArray(fullData)) {
            // 1. Translate networkId to networkName
            if (fullData.some((row: any) => row.networkId)) {
              const networkMap = await fetchNetworkMap();
              fullData = await Promise.all(
                fullData.map(async (row: any) => {
                  if (row.networkId && !row.networkName) {
                    row.networkName = networkMap[row.networkId] || row.networkId;
                  }
                  // 2. Translate GRP/OBJ values in all fields
                  for (const key of Object.keys(row)) {
                    if (typeof row[key] === 'string' && (row[key].startsWith('GRP') || row[key].startsWith('OBJ'))) {
                      row[key] = await translateSpecialValue(row[key]);
                    }
                  }
                  return row;
                })
              );
            } else {
              // Even if no networkId, still translate GRP/OBJ values
              fullData = await Promise.all(
                fullData.map(async (row: any) => {
                  for (const key of Object.keys(row)) {
                    if (typeof row[key] === 'string' && (row[key].startsWith('GRP') || row[key].startsWith('OBJ'))) {
                      row[key] = await translateSpecialValue(row[key]);
                    }
                  }
                  return row;
                })
              );
            }
          }

          // Update with full data
          const fullResults: ReportResults = {
            data: fullData,
            summary: {
              ...reportResults.summary,
              recordsReturned: fullData.length
            },
            metadata: {
              ...reportResults.metadata,
              preview: fullData.slice(0, 3)
            }
          };
          setReportResults(fullResults);
        }
      } catch (error) {
        console.error('Error loading full data:', error);
      }
    };

    return (
      <div className="container mx-auto p-6 space-y-6">
        {/* Header with navigation and actions */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Report Results</h1>
            <p className="text-muted-foreground">
              {reportConfig.name || 'Custom Report'} - Generated {reportResults.summary.generatedAt.toLocaleString()}
            </p>
            {reportResults.data.length < reportResults.summary.totalRecords && (
              <p className="text-sm text-yellow-600 mt-1">
                Showing preview of {reportResults.data.length} records. 
                Total: {reportResults.summary.totalRecords.toLocaleString()} records available.
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setCurrentView('builder')}>
              <Settings className="w-4 h-4 mr-2" />
              Edit Report
            </Button>
            <Button variant="outline" onClick={() => generateReport()}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            {reportResults.data.length < reportResults.summary.totalRecords && (
              <Button variant="outline" onClick={loadFullData}>
                <Eye className="w-4 h-4 mr-2" />
                Load Full Data
              </Button>
            )}
            <Button variant="outline" onClick={() => exportReport('csv')}>
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
            <Button variant="outline" onClick={() => exportReport('json')}>
              <Download className="w-4 h-4 mr-2" />
              Export JSON
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="text-sm text-muted-foreground">Total Records</p>
                  <p className="text-2xl font-bold">{reportResults.summary.totalRecords.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-green-600" />
                <div>
                  <p className="text-sm text-muted-foreground">Returned</p>
                  <p className="text-2xl font-bold">{reportResults.summary.recordsReturned.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-yellow-600" />
                <div>
                  <p className="text-sm text-muted-foreground">Execution Time</p>
                  <p className="text-2xl font-bold">{(reportResults.summary.executionTime / 1000).toFixed(1)}s</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-purple-600" />
                <div>
                  <p className="text-sm text-muted-foreground">Cache</p>
                  <p className="text-2xl font-bold">{reportResults.summary.cacheHit ? 'Hit' : 'Miss'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Lockdown Report Summary */}
        {reportConfig.dataSource === 'lockdown-report' && reportResults.data.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="border-green-200 bg-green-50">
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <div>
                    <p className="text-sm text-muted-foreground">Networks with Deny-All Rule</p>
                    <p className="text-2xl font-bold text-green-700">
                      {reportResults.data.filter((row: any) => row.hasDenyAllRule === true).length}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {reportResults.data.length > 0 
                        ? Math.round((reportResults.data.filter((row: any) => row.hasDenyAllRule === true).length / reportResults.data.length) * 100)
                        : 0}% of networks
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="border-red-200 bg-red-50">
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-red-600" />
                  <div>
                    <p className="text-sm text-muted-foreground">Networks Without Deny-All</p>
                    <p className="text-2xl font-bold text-red-700">
                      {reportResults.data.filter((row: any) => row.hasDenyAllRule === false).length}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Needs attention
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="border-yellow-200 bg-yellow-50">
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <X className="w-5 h-5 text-yellow-600" />
                  <div>
                    <p className="text-sm text-muted-foreground">Errors</p>
                    <p className="text-2xl font-bold text-yellow-700">
                      {reportResults.data.filter((row: any) => row.lastRulePolicy === 'ERROR').length}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Failed to fetch rules
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Limit Notice */}
        {reportConfig.limit && reportResults.summary.recordsReturned >= reportConfig.limit && (
          <Card className="border-yellow-200 bg-yellow-50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-yellow-800">
                <Settings className="w-5 h-5" />
                <div>
                  <p className="font-medium">Results Limited</p>
                  <p className="text-sm">
                    Showing {reportConfig.limit.toLocaleString()} of potentially more records. 
                    To see all results, remove the limit in the report settings and regenerate.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Data Preview */}
        {(reportResults.metadata.preview.length > 0 || reportResults.data.length > 0) && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="w-5 h-5" />
                Data Preview
              </CardTitle>
              <CardDescription>
                Showing first 3 records from your results
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border border-color-border-200 rounded-md overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-muted">
                      <tr>
                        {reportConfig.columns.map((column) => {
                          const field = selectedDataSource?.fields.find(f => f.name === column);
                          return (
                            <th key={column} className="px-4 py-3 text-left text-sm font-medium">
                              {field?.label || column}
                            </th>
                          );
                        })}
                      </tr>
                    </thead>
                    <tbody>
                      {(reportResults.metadata.preview.length > 0 ? reportResults.metadata.preview : reportResults.data.slice(0, 3)).map((row, index) => (
                        <tr key={index} className="border-t">
                          {reportConfig.columns.map((column) => {
                            const value = row[column];
                            let displayValue: React.ReactNode = value || '-';
                            
                            // Special formatting for lockdown report
                            if (reportConfig.dataSource === 'lockdown-report') {
                              if (column === 'hasDenyAllRule') {
                                displayValue = (
                                  <Badge variant={value ? 'default' : 'destructive'} className={value ? 'bg-green-600' : 'bg-red-600'}>
                                    {value ? 'Yes' : 'No'}
                                  </Badge>
                                );
                              } else if (column === 'lastRulePolicy') {
                                const policyColor = value === 'deny' ? 'bg-green-600' : value === 'allow' ? 'bg-yellow-600' : value === 'ERROR' ? 'bg-red-600' : 'bg-gray-600';
                                displayValue = (
                                  <Badge variant="outline" className={policyColor + ' text-white'}>
                                    {value?.toUpperCase() || 'UNKNOWN'}
                                  </Badge>
                                );
                              } else if (column === 'lastRuleComment' && value && value.length > 50) {
                                displayValue = (
                                  <span title={value} className="truncate block max-w-xs">
                                    {value.substring(0, 50)}...
                                  </span>
                                );
                              }
                            }
                            
                            // Default formatting for other types
                            if (displayValue === (value || '-')) {
                              if (Array.isArray(value)) {
                                displayValue = value.join(', ');
                              } else if (typeof value === 'boolean') {
                                displayValue = value ? 'Yes' : 'No';
                              } else {
                                displayValue = value || '-';
                              }
                            }
                            
                            return (
                              <td key={column} className="px-4 py-3 text-sm">
                                {displayValue}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Full Results Table */}
        <Card>
          <CardHeader>
            <CardTitle>Full Results</CardTitle>
            <CardDescription>
              Complete dataset with {reportResults.summary.recordsReturned} records
            </CardDescription>
          </CardHeader>
          <CardContent>
            {reportResults.data.length > 0 ? (
              <div className="border border-color-border-200 rounded-md overflow-hidden">
                <div className="overflow-x-auto max-h-96">
                  <table className="w-full">
                    <thead className="bg-muted sticky top-0">
                      <tr>
                        {reportConfig.columns.map((column) => {
                          const field = selectedDataSource?.fields.find(f => f.name === column);
                          return (
                            <th key={column} className="px-4 py-3 text-left text-sm font-medium">
                              {field?.label || column}
                            </th>
                          );
                        })}
                      </tr>
                    </thead>
                    <tbody>
                      {reportResults.data.map((row, index) => (
                        <tr key={index} className="border-t hover:bg-muted/50">
                          {reportConfig.columns.map((column) => {
                            const value = row[column];
                            let displayValue: React.ReactNode = value || '-';
                            
                            // Special formatting for lockdown report
                            if (reportConfig.dataSource === 'lockdown-report') {
                              if (column === 'hasDenyAllRule') {
                                displayValue = (
                                  <Badge variant={value ? 'default' : 'destructive'} className={value ? 'bg-green-600' : 'bg-red-600'}>
                                    {value ? 'Yes' : 'No'}
                                  </Badge>
                                );
                              } else if (column === 'lastRulePolicy') {
                                const policyColor = value === 'deny' ? 'bg-green-600' : value === 'allow' ? 'bg-yellow-600' : value === 'ERROR' ? 'bg-red-600' : 'bg-gray-600';
                                displayValue = (
                                  <Badge variant="outline" className={policyColor + ' text-white'}>
                                    {value?.toUpperCase() || 'UNKNOWN'}
                                  </Badge>
                                );
                              } else if (column === 'lastRuleComment' && value && value.length > 50) {
                                displayValue = (
                                  <span title={value} className="truncate block max-w-xs">
                                    {value.substring(0, 50)}...
                                  </span>
                                );
                              }
                            }
                            
                            // Default formatting for other types
                            if (displayValue === (value || '-')) {
                              if (Array.isArray(value)) {
                                displayValue = value.join(', ');
                              } else if (typeof value === 'boolean') {
                                displayValue = value ? 'Yes' : 'No';
                              } else {
                                displayValue = value || '-';
                              }
                            }
                            
                            return (
                              <td key={column} className="px-4 py-3 text-sm">
                                {displayValue}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No data found matching your criteria</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  };

  // Render based on current view
  if (currentView === 'loading') {
    return <LoadingPage />;
  }
  
  if (currentView === 'results') {
    return <ResultsPage />;
  }

  return (
    <div className="container mx-auto p-6 space-y-6 bg-color-background-100">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-color-text-100">Report Builder</h1>
          <p className="text-color-text-300">
            Create custom reports from your Meraki data with filters and conditions
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={generateReport} 
            disabled={!reportConfig.dataSource || reportConfig.selectedOrgs.length === 0 || isGenerating}
            className="flex items-center gap-2"
          >
            <Play className="w-4 h-4" />
            {isGenerating ? 'Generating...' : 'Generate Report'}
          </Button>
          {(!reportConfig.dataSource || reportConfig.selectedOrgs.length === 0) && (
            <div className="text-sm text-red-600 mt-2">
              {!reportConfig.dataSource && 'Please select a data source. '}
              {reportConfig.selectedOrgs.length === 0 && 'Please select at least one organization.'}
            </div>
          )}
          {reportId && (
            <>
              <Button variant="outline" onClick={() => exportReport('csv')}>
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
              <Button variant="outline" onClick={() => exportReport('json')}>
                <Download className="w-4 h-4 mr-2" />
                Export JSON
              </Button>
            </>
          )}
        </div>
      </div>

      <Tabs defaultValue="configuration" className="space-y-4">
        <TabsList>
          <TabsTrigger value="configuration">Configuration</TabsTrigger>
          <TabsTrigger value="filters">Filters & Conditions</TabsTrigger>
          <TabsTrigger value="columns">Columns & Sorting</TabsTrigger>
        </TabsList>

        <TabsContent value="configuration" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Report Configuration</CardTitle>
              <CardDescription>
                Configure your report settings and data sources
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="report-name">Report Name</Label>
                  <Input
                    id="report-name"
                    placeholder="Enter report name..."
                    value={reportConfig.name}
                    onChange={(e) => setReportConfig(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="report-description">Description</Label>
                  <Input
                    id="report-description"
                    placeholder="Report description..."
                    value={reportConfig.description}
                    onChange={(e) => setReportConfig(prev => ({ ...prev, description: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Data Source</Label>
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                  {DATA_SOURCES.map((source) => {
                    const Icon = source.icon;
                    return (
                      <Card 
                        key={source.id}
                        className={`cursor-pointer transition-colors ${
                          reportConfig.dataSource === source.id 
                            ? 'ring-2 ring-primary bg-primary/5' 
                            : 'hover:bg-muted/50'
                        }`}
                        onClick={() => setReportConfig(prev => ({ ...prev, dataSource: source.id }))}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center space-x-3">
                            <Icon className="w-5 h-5 text-primary" />
                            <div>
                              <h4 className="font-medium">{source.name}</h4>
                              <p className="text-sm text-muted-foreground">{source.description}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Organizations ({reportConfig.selectedOrgs.length} selected)</Label>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setReportConfig(prev => ({
                            ...prev,
                            selectedOrgs: organizations.map(org => org.id)
                          }));
                        }}
                        disabled={organizations.length === 0}
                      >
                        Select All
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setReportConfig(prev => ({
                            ...prev,
                            selectedOrgs: []
                          }));
                        }}
                        disabled={reportConfig.selectedOrgs.length === 0}
                      >
                        Clear All
                      </Button>
                    </div>
                  </div>
                  <div className="border border-color-border-200 rounded-md p-3 max-h-48 overflow-y-auto">
                    {organizations.map((org) => (
                      <div key={org.id} className="flex items-center space-x-2 mb-2">
                        <Checkbox
                          id={`org-${org.id}`}
                          checked={reportConfig.selectedOrgs.includes(org.id)}
                          onCheckedChange={(checked: boolean) => {
                            if (checked) {
                              setReportConfig(prev => ({
                                ...prev,
                                selectedOrgs: [...prev.selectedOrgs, org.id]
                              }));
                            } else {
                              setReportConfig(prev => ({
                                ...prev,
                                selectedOrgs: prev.selectedOrgs.filter(id => id !== org.id)
                              }));
                            }
                          }}
                        />
                        <Label htmlFor={`org-${org.id}`} className="text-sm">
                          {org.name}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Networks ({reportConfig.selectedNetworks.length} selected) - Optional</Label>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setReportConfig(prev => ({
                            ...prev,
                            selectedNetworks: networks.map(network => network.id)
                          }));
                        }}
                        disabled={networks.length === 0}
                      >
                        Select All
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setReportConfig(prev => ({
                            ...prev,
                            selectedNetworks: []
                          }));
                        }}
                        disabled={reportConfig.selectedNetworks.length === 0}
                      >
                        Clear All
                      </Button>
                    </div>
                  </div>
                  <div className="border border-color-border-200 rounded-md p-3 max-h-48 overflow-y-auto">
                    {networks.map((network) => (
                      <div key={network.id} className="flex items-center space-x-2 mb-2">
                        <Checkbox
                          id={`network-${network.id}`}
                          checked={reportConfig.selectedNetworks.includes(network.id)}
                          onCheckedChange={(checked: boolean) => {
                            if (checked) {
                              setReportConfig(prev => ({
                                ...prev,
                                selectedNetworks: [...prev.selectedNetworks, network.id]
                              }));
                            } else {
                              setReportConfig(prev => ({
                                ...prev,
                                selectedNetworks: prev.selectedNetworks.filter(id => id !== network.id)
                              }));
                            }
                          }}
                        />
                        <Label htmlFor={`network-${network.id}`} className="text-sm">
                          {network.name}
                        </Label>
                      </div>
                    ))}
                    {networks.length === 0 && reportConfig.selectedOrgs.length > 0 && (
                      <p className="text-sm text-muted-foreground">
                        No networks found for selected organizations
                      </p>
                    )}
                    {networks.length === 0 && reportConfig.selectedOrgs.length === 0 && (
                      <p className="text-sm text-muted-foreground">
                        Select organizations first to see networks
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Status Summary */}
              {(reportConfig.selectedOrgs.length > 0 || reportConfig.selectedNetworks.length > 0) && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-medium text-blue-900 mb-2">Current Selection</h4>
                  <div className="text-sm text-blue-700">
                    <p>✓ {reportConfig.selectedOrgs.length} organization(s) selected</p>
                    {reportConfig.selectedNetworks.length > 0 && (
                      <p>✓ {reportConfig.selectedNetworks.length} network(s) selected</p>
                    )}
                    {reportConfig.selectedNetworks.length === 0 && reportConfig.selectedOrgs.length > 0 && (
                      <p>• All networks from selected organizations will be included</p>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="filters" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Filters & Conditions</CardTitle>
                  <CardDescription>
                    Add filters to refine your report data
                  </CardDescription>
                </div>
                <Button onClick={addFilter} disabled={!selectedDataSource}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Filter
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {reportConfig.filters.length === 0 ? (
                <div className="text-center py-8">
                  <Filter className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No filters added yet</p>
                  <p className="text-sm text-muted-foreground">Add filters to refine your report data</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {reportConfig.filters.map((filter, index) => (
                    <Card key={filter.id} className="p-4">
                      <div className="grid grid-cols-12 gap-4 items-end">
                        <div className="col-span-3">
                          <Label>Field</Label>
                          <Select
                            value={filter.field}
                            onValueChange={(value) => {
                              const field = selectedDataSource?.fields.find(f => f.name === value);
                              updateFilter(filter.id, { 
                                field: value, 
                                dataType: field?.type as any || 'string' 
                              });
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select field" />
                            </SelectTrigger>
                            <SelectContent>
                              {selectedDataSource?.fields.map((field) => (
                                <SelectItem key={field.name} value={field.name}>
                                  {field.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="col-span-2">
                          <Label>Operator</Label>
                          <Select
                            value={filter.operator}
                            onValueChange={(value: any) => updateFilter(filter.id, { operator: value })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {OPERATORS[filter.dataType]?.map((op) => (
                                <SelectItem key={op.value} value={op.value}>
                                  {op.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="col-span-6">
                          <Label>Value</Label>
                          {filter.dataType === 'boolean' ? (
                            <Select
                              value={filter.value as string}
                              onValueChange={(value) => updateFilter(filter.id, { value })}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="true">True</SelectItem>
                                <SelectItem value="false">False</SelectItem>
                              </SelectContent>
                            </Select>
                          ) : filter.dataType === 'date' ? (
                            <Input
                              type="date"
                              value={filter.value as string}
                              onChange={(e) => updateFilter(filter.id, { value: e.target.value })}
                            />
                          ) : (
                            <Input
                              type={filter.dataType === 'number' ? 'number' : 'text'}
                              placeholder="Enter value..."
                              value={filter.value as string}
                              onChange={(e) => updateFilter(filter.id, { value: e.target.value })}
                            />
                          )}
                        </div>

                        <div className="col-span-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => removeFilter(filter.id)}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="columns" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Columns & Sorting</CardTitle>
              <CardDescription>
                Select which columns to include and configure sorting
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Select Columns</Label>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setReportConfig(prev => ({
                          ...prev,
                          columns: selectedDataSource?.fields.map(field => field.name) || []
                        }));
                      }}
                      disabled={!selectedDataSource || selectedDataSource.fields.length === 0}
                    >
                      Select All
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setReportConfig(prev => ({
                          ...prev,
                          columns: []
                        }));
                      }}
                      disabled={reportConfig.columns.length === 0}
                    >
                      Clear All
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 max-h-48 overflow-y-auto border border-color-border-200 rounded-md p-3">
                  {selectedDataSource?.fields.map((field) => (
                    <div key={field.name} className="flex items-center space-x-2">
                      <Checkbox
                        id={`col-${field.name}`}
                        checked={reportConfig.columns.includes(field.name)}
                        onCheckedChange={(checked: boolean) => {
                          if (checked) {
                            setReportConfig(prev => ({
                              ...prev,
                              columns: [...prev.columns, field.name]
                            }));
                          } else {
                            setReportConfig(prev => ({
                              ...prev,
                              columns: prev.columns.filter(col => col !== field.name)
                            }));
                          }
                        }}
                      />
                      <Label htmlFor={`col-${field.name}`} className="text-sm">
                        {field.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Sort By</Label>
                  <Select
                    value={reportConfig.sortBy}
                    onValueChange={(value) => setReportConfig(prev => ({ ...prev, sortBy: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select sort field" />
                    </SelectTrigger>
                    <SelectContent>
                      {selectedDataSource?.fields.map((field) => (
                        <SelectItem key={field.name} value={field.name}>
                          {field.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Sort Order</Label>
                  <Select
                    value={reportConfig.sortOrder}
                    onValueChange={(value: 'asc' | 'desc') => setReportConfig(prev => ({ ...prev, sortOrder: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="asc">Ascending</SelectItem>
                      <SelectItem value="desc">Descending</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-base font-semibold">Result Limit</Label>
                  <Input
                    type="number"
                    placeholder="Leave empty for all records"
                    value={reportConfig.limit || ''}
                    onChange={(e) => setReportConfig(prev => ({ 
                      ...prev, 
                      limit: e.target.value ? parseInt(e.target.value) : undefined 
                    }))}
                  />
                  <p className="text-sm text-muted-foreground">
                    {reportConfig.limit 
                      ? `Will return maximum ${reportConfig.limit.toLocaleString()} records`
                      : 'No limit - will return all matching records (may take longer for large datasets)'
                    }
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
