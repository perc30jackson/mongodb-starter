import React from 'react';
import { DataTable, ColumnDef, FilterConfig } from '@/components/ui/data-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { clientExportColumns } from '@/lib/csv-export';
import { Users, Wifi, Monitor, Smartphone, Laptop } from 'lucide-react';

interface NetworkClient {
  id: string;
  description: string;
  mac: string;
  ip: string;
  user?: string;
  vlan?: number;
  switchport?: string;
  usage: {
    sent: number;
    recv: number;
  };
  ssid?: string;
  status: 'Online' | 'Offline';
  firstSeen: string;
  lastSeen: string;
  manufacturer?: string;
  os?: string;
  deviceType?: string;
}

interface ClientTableProps {
  clients: NetworkClient[];
  onClientClick?: (client: NetworkClient) => void;
  loading?: boolean;
}

export function ClientTable({ 
  clients, 
  onClientClick,
  loading = false
}: ClientTableProps) {
  
  const getDeviceIcon = (deviceType?: string) => {
    if (!deviceType) return <Monitor className="w-4 h-4" />;
    
    const type = deviceType.toLowerCase();
    if (type.includes('phone') || type.includes('mobile')) {
      return <Smartphone className="w-4 h-4" />;
    } else if (type.includes('laptop') || type.includes('computer')) {
      return <Laptop className="w-4 h-4" />;
    } else if (type.includes('wireless') || type.includes('wifi')) {
      return <Wifi className="w-4 h-4" />;
    }
    return <Monitor className="w-4 h-4" />;
  };

  const getStatusBadge = (status: string) => {
    return status === 'Online' ? (
      <Badge variant="default" className="bg-green-100 text-green-800">
        Online
      </Badge>
    ) : (
      <Badge variant="secondary" className="bg-gray-100 text-gray-800">
        Offline
      </Badge>
    );
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const columns: ColumnDef<NetworkClient>[] = [
    {
      key: 'description',
      header: 'Client',
      sortable: true,
      cell: (_, client: NetworkClient) => (
        <div className="flex items-center gap-3">
          {getDeviceIcon(client.deviceType)}
          <div>
            <div className="font-medium text-foreground">
              {client.description || client.mac}
            </div>
            <div className="text-sm text-muted-foreground font-mono">
              {client.mac}
            </div>
          </div>
        </div>
      )
    },
    {
      key: 'ip',
      header: 'IP Address',
      sortable: true,
      cell: (value: string) => (
        <span className="font-mono text-sm">
          {value || 'N/A'}
        </span>
      )
    },
    {
      key: 'user',
      header: 'User',
      sortable: true,
      filterable: true,
      filterType: 'text',
      cell: (value: string) => value || 'Unknown'
    },
    {
      key: 'deviceType',
      header: 'Device Type',
      sortable: true,
      filterable: true,
      filterType: 'select',
      cell: (value: string) => (
        <Badge variant="outline" className="capitalize">
          {value || 'Unknown'}
        </Badge>
      )
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      filterable: true,
      filterType: 'select',
      cell: (value: string) => getStatusBadge(value)
    },
    {
      key: 'ssid',
      header: 'SSID',
      sortable: true,
      filterable: true,
      filterType: 'text',
      cell: (value: string) => value || 'Wired'
    },
    {
      key: 'vlan',
      header: 'VLAN',
      sortable: true,
      cell: (value: number) => value ? `VLAN ${value}` : 'Default'
    },
    {
      key: 'usage',
      header: 'Usage (Up/Down)',
      sortable: false,
      cell: (_, client: NetworkClient) => (
        <div className="text-sm">
          <div>↑ {formatBytes(client.usage.sent)}</div>
          <div>↓ {formatBytes(client.usage.recv)}</div>
        </div>
      )
    },
    {
      key: 'manufacturer',
      header: 'Manufacturer',
      sortable: true,
      filterable: true,
      filterType: 'text',
      cell: (value: string) => value || 'Unknown'
    },
    {
      key: 'lastSeen',
      header: 'Last Seen',
      sortable: true,
      cell: (value: string) => (
        <span className="text-sm">
          {value ? new Date(value).toLocaleString() : 'Never'}
        </span>
      )
    }
  ];

  // Create filter options from unique values in the data
  const deviceTypes = [...new Set(clients.map(c => c.deviceType).filter(Boolean))];
  const statuses = [...new Set(clients.map(c => c.status).filter(Boolean))];
  const ssids = [...new Set(clients.map(c => c.ssid).filter(Boolean))];
  const manufacturers = [...new Set(clients.map(c => c.manufacturer).filter(Boolean))];

  const filters: FilterConfig[] = [
    {
      key: 'status',
      type: 'select',
      placeholder: 'Status',
      options: statuses.map(status => ({ label: status!, value: status! }))
    },
    {
      key: 'deviceType',
      type: 'select',
      placeholder: 'Device Type',
      options: deviceTypes.map(type => ({ label: type!, value: type! }))
    },
    {
      key: 'ssid',
      type: 'text',
      placeholder: 'SSID'
    },
    {
      key: 'manufacturer',
      type: 'select',
      placeholder: 'Manufacturer',
      options: manufacturers.slice(0, 10).map(mfg => ({ label: mfg!, value: mfg! })) // Limit to top 10
    },
    {
      key: 'user',
      type: 'text',
      placeholder: 'User'
    }
  ];

  return (
    <DataTable
      data={clients}
      columns={columns}
      searchKey="description"
      searchPlaceholder="Search clients by name, MAC, or IP..."
      filters={filters}
      onRowClick={onClientClick}
      loading={loading}
      emptyMessage="No clients found"
      exportable={true}
      exportFilename="network-clients"
      exportColumns={clientExportColumns}
    />
  );
}
