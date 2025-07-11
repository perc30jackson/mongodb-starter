import React from 'react';
import { DataTable, ColumnDef, FilterConfig } from '@/components/ui/data-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FirewallRule } from '@/lib/api/network';
import { firewallRuleExportColumns } from '@/lib/csv-export';
import { Edit, Trash2, Shield, Ban } from 'lucide-react';

interface FirewallRuleTableProps {
  rules: FirewallRule[];
  onRuleEdit?: (rule: FirewallRule, index: number) => void;
  onRuleDelete?: (index: number) => void;
  loading?: boolean;
  isEditing?: boolean;
}

export function FirewallRuleTable({ 
  rules, 
  onRuleEdit,
  onRuleDelete,
  loading = false,
  isEditing = false
}: FirewallRuleTableProps) {
  
  const getPolicyBadge = (policy: string) => {
    return policy === 'allow' ? (
      <Badge variant="default" className="bg-green-100 text-green-800">
        <Shield className="w-3 h-3 mr-1" />
        ALLOW
      </Badge>
    ) : (
      <Badge variant="destructive" className="bg-red-100 text-red-800">
        <Ban className="w-3 h-3 mr-1" />
        DENY
      </Badge>
    );
  };

  const columns: ColumnDef<FirewallRule>[] = [
    {
      key: 'comment',
      header: 'Comment',
      sortable: true,
      cell: (_, rule: FirewallRule, index?: number) => (
        <div className="font-medium">
          {rule.comment || `Rule ${(index || 0) + 1}`}
        </div>
      )
    },
    {
      key: 'policy',
      header: 'Policy',
      sortable: true,
      filterable: true,
      filterType: 'select',
      cell: (value: string) => getPolicyBadge(value)
    },
    {
      key: 'protocol',
      header: 'Protocol',
      sortable: true,
      filterable: true,
      filterType: 'select',
      cell: (value: string) => (
        <Badge variant="outline">
          {value?.toUpperCase() || 'ANY'}
        </Badge>
      )
    },
    {
      key: 'srcCidr',
      header: 'Source',
      sortable: true,
      cell: (value: string) => (
        <span className="font-mono text-sm">
          {value || 'Any'}
        </span>
      )
    },
    {
      key: 'srcPort',
      header: 'Src Port',
      sortable: true,
      cell: (value: string) => (
        <span className="font-mono text-sm">
          {value || 'Any'}
        </span>
      )
    },
    {
      key: 'destCidr',
      header: 'Destination',
      sortable: true,
      cell: (value: string) => (
        <span className="font-mono text-sm">
          {value || 'Any'}
        </span>
      )
    },
    {
      key: 'destPort',
      header: 'Dest Port',
      sortable: true,
      cell: (value: string) => (
        <span className="font-mono text-sm">
          {value || 'Any'}
        </span>
      )
    }
  ];

  // Add actions column if editing is enabled
  if (isEditing) {
    columns.push({
      key: 'actions',
      header: 'Actions',
      cell: (_, rule: FirewallRule, index?: number) => (
        <div className="flex gap-1">
          <Button 
            size="sm" 
            variant="ghost" 
            className="h-8 w-8 p-0"
            onClick={(e) => {
              e.stopPropagation();
              onRuleEdit?.(rule, index || 0);
            }}
          >
            <Edit className="w-3 h-3" />
          </Button>
          <Button 
            size="sm" 
            variant="ghost" 
            className="h-8 w-8 p-0 text-destructive"
            onClick={(e) => {
              e.stopPropagation();
              onRuleDelete?.(index || 0);
            }}
          >
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      )
    });
  }

  // Create filter options from unique values in the data
  const policies = [...new Set(rules.map(r => r.policy).filter(Boolean))];
  const protocols = [...new Set(rules.map(r => r.protocol).filter(Boolean))];

  const filters: FilterConfig[] = [
    {
      key: 'policy',
      type: 'select',
      placeholder: 'Policy',
      options: policies.map(policy => ({ 
        label: policy!.toUpperCase(), 
        value: policy! 
      }))
    },
    {
      key: 'protocol',
      type: 'select',
      placeholder: 'Protocol',
      options: protocols.map(protocol => ({ 
        label: protocol!.toUpperCase(), 
        value: protocol! 
      }))
    },
    {
      key: 'srcCidr',
      type: 'text',
      placeholder: 'Source CIDR'
    },
    {
      key: 'destCidr',
      type: 'text',
      placeholder: 'Destination CIDR'
    }
  ];

  // Add index to rules for proper handling
  const rulesWithIndex = rules.map((rule, index) => ({ ...rule, index }));

  return (
    <DataTable
      data={rulesWithIndex}
      columns={columns}
      searchKey="comment"
      searchPlaceholder="Search firewall rules by comment..."
      filters={filters}
      loading={loading}
      emptyMessage="No firewall rules found"
      exportable={true}
      exportFilename="firewall-rules"
      exportColumns={firewallRuleExportColumns}
    />
  );
}
