import React from 'react';
import { DataTable, ColumnDef, FilterConfig } from '@/components/ui/data-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { organizationExportColumns } from '@/lib/csv-export';
import { Building2, Network, Users, MapPin, ExternalLink } from 'lucide-react';

interface Organization {
  id: string;
  name: string;
  url: string;
  api?: {
    enabled: boolean;
  };
  licensing?: {
    model: string;
  };
  cloud?: {
    region: {
      name: string;
    };
  };
}

interface OrganizationStats {
  networks: number;
  devices: number;
  clients: number;
}

interface OrganizationTableProps {
  organizations: Organization[];
  organizationStats: Record<string, OrganizationStats>;
  onOrganizationClick?: (organization: Organization) => void;
  loading?: boolean;
}

export function OrganizationTable({ 
  organizations, 
  organizationStats,
  onOrganizationClick,
  loading = false
}: OrganizationTableProps) {
  
  const columns: ColumnDef<Organization>[] = [
    {
      key: 'name',
      header: 'Organization',
      sortable: true,
      cell: (_, org: Organization) => (
        <div className="flex items-center gap-3">
          <Building2 className="w-5 h-5 text-muted-foreground" />
          <div>
            <div className="font-medium text-foreground">
              {org.name}
            </div>
            <div className="text-sm text-muted-foreground">
              ID: {org.id}
            </div>
          </div>
        </div>
      )
    },
    {
      key: 'cloud.region.name',
      header: 'Region',
      sortable: true,
      filterable: true,
      filterType: 'select',
      cell: (_, org: Organization) => (
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-muted-foreground" />
          <span>{org.cloud?.region?.name || 'N/A'}</span>
        </div>
      )
    },
    {
      key: 'api.enabled',
      header: 'API Access',
      sortable: true,
      filterable: true,
      filterType: 'select',
      cell: (_, org: Organization) => (
        <Badge variant={org.api?.enabled ? 'default' : 'secondary'}>
          {org.api?.enabled ? 'Enabled' : 'Disabled'}
        </Badge>
      )
    },
    {
      key: 'stats.networks',
      header: 'Networks',
      sortable: true,
      cell: (_, org: Organization) => (
        <div className="flex items-center gap-2">
          <Network className="w-4 h-4 text-muted-foreground" />
          <span className="font-medium">
            {organizationStats[org.id]?.networks || 0}
          </span>
        </div>
      )
    },
    {
      key: 'stats.devices',
      header: 'Devices',
      sortable: true,
      cell: (_, org: Organization) => (
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-blue-500" />
          <span className="font-medium">
            {organizationStats[org.id]?.devices || 0}
          </span>
        </div>
      )
    },
    {
      key: 'stats.clients',
      header: 'Clients',
      sortable: true,
      cell: (_, org: Organization) => (
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-muted-foreground" />
          <span className="font-medium">
            {organizationStats[org.id]?.clients || 0}
          </span>
        </div>
      )
    },
    {
      key: 'actions',
      header: 'Actions',
      cell: (_, org: Organization) => (
        <div className="flex gap-1">
          <Button 
            size="sm" 
            variant="outline"
            onClick={(e) => {
              e.stopPropagation();
              window.open(org.url, '_blank');
            }}
          >
            <ExternalLink className="w-4 h-4" />
          </Button>
        </div>
      )
    }
  ];

  // Create filter options from unique values in the data
  const regions = [...new Set(organizations.map(o => o.cloud?.region?.name).filter(Boolean))];
  const apiStatuses = ['Enabled', 'Disabled'];

  const filters: FilterConfig[] = [
    {
      key: 'cloud.region.name',
      type: 'select',
      placeholder: 'Region',
      options: regions.map(region => ({ label: region!, value: region! }))
    },
    {
      key: 'api.enabled',
      type: 'select',
      placeholder: 'API Access',
      options: apiStatuses.map(status => ({ 
        label: status, 
        value: status === 'Enabled' ? 'true' : 'false' 
      }))
    }
  ];

  // Transform data to include computed values for filtering/sorting
  const enhancedOrganizations = organizations.map(org => ({
    ...org,
    stats: organizationStats[org.id] || { networks: 0, devices: 0, clients: 0 }
  }));

  return (
    <DataTable
      data={enhancedOrganizations}
      columns={columns}
      searchKey="name"
      searchPlaceholder="Search organizations by name..."
      filters={filters}
      onRowClick={onOrganizationClick}
      loading={loading}
      emptyMessage="No organizations found"
      exportable={true}
      exportFilename="organizations"
      exportColumns={organizationExportColumns}
    />
  );
}
