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
  type: 'application' | 'applicationCategory' | 'host' | 'port' | 'ipRange';
  value?: string;
  valueObj?: {
    id?: string;
    name?: string;
  };
}

export interface ContentFilteringRule {
  id?: string;
  name: string;
  categories: string[];
  blockedSites: string[];
  allowedSites: string[];
  safeSearch: {
    google: boolean;
    bing: boolean;
    youtube: boolean;
  };
  advancedOptions: {
    blockMalware: boolean;
    blockPhishing: boolean;
    httpsInspection: boolean;
  };
  schedule?: {
    timeRange?: {
      start: string;
      end: string;
      days: string[];
    };
  };
  enabled: boolean;
}
