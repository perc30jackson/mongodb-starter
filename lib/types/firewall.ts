// Shared types for firewall and network components
// This file contains only type definitions and no server-side imports

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

// Meraki Layer 7 Firewall Rule interface based on official API
export interface Layer7FirewallRule {
  policy: 'deny' | 'allow';
  type: 'application' | 'applicationCategory' | 'host' | 'port' | 'ipRange' | 'blockedCountries';
  value?: string | string[]; // Allow array for blockedCountries
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
