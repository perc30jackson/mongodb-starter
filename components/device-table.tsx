import React from 'react';
import { useRouter } from 'next/router';
import { DataTable, ColumnDef, FilterConfig } from '@/components/ui/data-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DeviceProps } from '@/lib/api/network';
import { deviceExportColumns } from '@/lib/csv-export';
import { Router, Wifi, Shield, Activity } from 'lucide-react';

interface DeviceTableProps {
  devices: DeviceProps[];
  onDeviceClick?: (device: DeviceProps) => void;
  onDeviceAction?: (action: string, deviceSerial: string) => void;
  loading?: boolean;
  selectedDevices?: Set<string>;
  onSelectionChange?: (selected: Set<string>) => void;
}

export function DeviceTable({ 
  devices, 
  onDeviceClick, 
  onDeviceAction,
  loading = false,
  selectedDevices = new Set(),
  onSelectionChange
}: DeviceTableProps) {
  const router = useRouter();
  
  const getDeviceTypeDisplay = (productType: string) => {
    const typeMap: { [key: string]: string } = {
      'appliance': 'Security Appliance',
      'switch': 'Switch',
      'wireless': 'Wireless AP',
      'sensor': 'Environmental Sensor',
      'camera': 'Security Camera',
      'cellular_gateway': 'Cellular Gateway',
      'unknown': 'Unknown'
    };
    
    return typeMap[productType] || productType;
  };

  const getDeviceIcon = (device: DeviceProps) => {
    if (device.model.startsWith('MX') || device.productType === 'appliance') {
      return <Shield className="w-4 h-4" />;
    } else if (device.model.startsWith('MS') || device.productType === 'switch') {
      return <Router className="w-4 h-4" />;
    } else if (device.model.startsWith('MR') || device.productType === 'wireless') {
      return <Wifi className="w-4 h-4" />;
    }
    return <Activity className="w-4 h-4" />;
  };

  const getStatusBadge = (status: string) => {
    const statusMap = {
      online: { variant: 'default' as const, className: 'bg-green-100 text-green-800' },
      offline: { variant: 'destructive' as const, className: 'bg-red-100 text-red-800' },
      alerting: { variant: 'secondary' as const, className: 'bg-yellow-100 text-yellow-800' },
      dormant: { variant: 'outline' as const, className: 'bg-gray-100 text-gray-800' }
    };
    
    const config = statusMap[status as keyof typeof statusMap] || statusMap.offline;
    
    return (
      <Badge variant={config.variant} className={config.className}>
        {status?.toUpperCase() || 'UNKNOWN'}
      </Badge>
    );
  };

  const columns: ColumnDef<DeviceProps>[] = [
    {
      key: 'select',
      header: '',
      width: 'w-12',
      cell: (_, device: DeviceProps) => (
        <input
          type="checkbox"
          className="rounded border-border"
          checked={selectedDevices.has(device.serial)}
          onChange={(e) => {
            if (onSelectionChange) {
              const newSelected = new Set(selectedDevices);
              if (e.target.checked) {
                newSelected.add(device.serial);
              } else {
                newSelected.delete(device.serial);
              }
              onSelectionChange(newSelected);
            }
          }}
          onClick={(e) => e.stopPropagation()}
          aria-label={`Select device ${device.name || device.serial}`}
        />
      )
    },
    {
      key: 'name',
      header: 'Device',
      sortable: true,
      cell: (_, device: DeviceProps) => (
        <div className="flex items-center gap-3">
          {getDeviceIcon(device)}
          <div>
            <div className="font-medium text-foreground">
              {device.name || device.serial}
            </div>
            <div className="text-sm text-muted-foreground font-mono">
              {device.serial}
            </div>
          </div>
        </div>
      )
    },
    {
      key: 'model',
      header: 'Model',
      sortable: true,
      filterable: true,
      filterType: 'text'
    },
    {
      key: 'productType',
      header: 'Type',
      sortable: true,
      filterable: true,
      filterType: 'select',
      cell: (value: string) => (
        <Badge variant="outline" className="capitalize">
          {getDeviceTypeDisplay(value || 'unknown')}
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
      key: 'firmware',
      header: 'Firmware',
      sortable: true,
      cell: (value: string) => (
        <span className="font-mono text-sm">
          {value || 'N/A'}
        </span>
      )
    },
    {
      key: 'lanIp',
      header: 'LAN IP',
      sortable: true,
      cell: (value: string) => (
        <span className="font-mono text-sm">
          {value || 'N/A'}
        </span>
      )
    },
    {
      key: 'actions',
      header: 'Actions',
      cell: (_, device: DeviceProps) => (
        <div className="flex gap-1">
          <Button 
            size="sm" 
            variant="outline"
            onClick={(e) => {
              e.stopPropagation();
              router.push(`/device/${device.serial}`);
            }}
          >
            View
          </Button>
          <Button 
            size="sm" 
            variant="outline"
            onClick={(e) => {
              e.stopPropagation();
              onDeviceAction?.('blink', device.serial);
            }}
          >
            Blink
          </Button>
          <Button 
            size="sm" 
            variant="outline"
            onClick={(e) => {
              e.stopPropagation();
              onDeviceAction?.('reboot', device.serial);
            }}
          >
            Reboot
          </Button>
        </div>
      )
    }
  ];

  // Create filter options from unique values in the data
  const productTypes = [...new Set(devices.map(d => d.productType).filter(Boolean))];
  const statuses = [...new Set(devices.map(d => d.status).filter(Boolean))];

  const filters: FilterConfig[] = [
    {
      key: 'productType',
      type: 'select',
      placeholder: 'Product Type',
      options: productTypes.map(type => ({ label: type, value: type }))
    },
    {
      key: 'status',
      type: 'select',
      placeholder: 'Status',
      options: statuses.map(status => ({ label: status!.toUpperCase(), value: status! }))
    },
    {
      key: 'model',
      type: 'text',
      placeholder: 'Model'
    }
  ];

  return (
    <DataTable
      data={devices}
      columns={columns}
      searchKey="name"
      searchPlaceholder="Search devices by name or serial..."
      filters={filters}
      onRowClick={onDeviceClick}
      loading={loading}
      emptyMessage="No devices found"
      exportable={true}
      exportFilename="devices"
      exportColumns={deviceExportColumns}
    />
  );
}
