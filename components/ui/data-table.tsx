import React, { useState, useMemo } from 'react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Search, Filter, SortAsc, SortDesc, X, Download } from 'lucide-react';
import { exportToCSV, ExportColumn } from '@/lib/csv-export';

export interface ColumnDef<T> {
  key: keyof T | string;
  header: string;
  cell?: (value: any, row: T, index?: number) => React.ReactNode;
  sortable?: boolean;
  filterable?: boolean;
  filterType?: 'text' | 'select' | 'badge';
  filterOptions?: Array<{ label: string; value: string }>;
  width?: string;
}

export interface FilterConfig {
  key: string;
  type: 'text' | 'select' | 'badge';
  options?: Array<{ label: string; value: string }>;
  placeholder?: string;
}

interface DataTableProps<T> {
  data: T[];
  columns: ColumnDef<T>[];
  searchKey?: keyof T;
  searchPlaceholder?: string;
  filters?: FilterConfig[];
  onRowClick?: (row: T) => void;
  loading?: boolean;
  emptyMessage?: string;
  className?: string;
  // Export functionality
  exportable?: boolean;
  exportFilename?: string;
  exportColumns?: ExportColumn[];
}

type SortDirection = 'asc' | 'desc' | null;

export function DataTable<T extends Record<string, any>>({
  data,
  columns,
  searchKey,
  searchPlaceholder = "Search...",
  filters = [],
  onRowClick,
  loading = false,
  emptyMessage = "No data available",
  className,
  exportable = false,
  exportFilename = "export",
  exportColumns
}: DataTableProps<T>) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({});
  const [showFilters, setShowFilters] = useState(false);

  // Get value from nested object path
  const getNestedValue = React.useCallback((obj: T, path: string): any => {
    return path.split('.').reduce((value, key) => value?.[key], obj);
  }, []);

  // Apply search, filters, and sorting
  const filteredAndSortedData = useMemo(() => {
    let filtered = [...data];

    // Apply search
    if (searchTerm && searchKey) {
      filtered = filtered.filter(item => {
        const value = getNestedValue(item, searchKey as string);
        return String(value).toLowerCase().includes(searchTerm.toLowerCase());
      });
    }

    // Apply filters
    Object.entries(activeFilters).forEach(([key, value]) => {
      if (value && value !== 'all') {
        filtered = filtered.filter(item => {
          const itemValue = getNestedValue(item, key);
          return String(itemValue).toLowerCase() === value.toLowerCase();
        });
      }
    });

    // Apply sorting
    if (sortColumn && sortDirection) {
      filtered.sort((a, b) => {
        const aValue = getNestedValue(a, sortColumn);
        const bValue = getNestedValue(b, sortColumn);
        
        if (aValue === bValue) return 0;
        
        const comparison = aValue < bValue ? -1 : 1;
        return sortDirection === 'asc' ? comparison : -comparison;
      });
    }

    return filtered;
  }, [data, searchTerm, searchKey, activeFilters, sortColumn, sortDirection, getNestedValue]);

  const handleSort = (columnKey: string) => {
    const column = columns.find(col => col.key === columnKey);
    if (!column?.sortable) return;

    if (sortColumn === columnKey) {
      setSortDirection(prev => 
        prev === 'asc' ? 'desc' : prev === 'desc' ? null : 'asc'
      );
      if (sortDirection === 'desc') {
        setSortColumn(null);
      }
    } else {
      setSortColumn(columnKey);
      setSortDirection('asc');
    }
  };

  const handleFilterChange = (filterKey: string, value: string) => {
    setActiveFilters(prev => ({
      ...prev,
      [filterKey]: value
    }));
  };

  const clearFilters = () => {
    setActiveFilters({});
    setSearchTerm('');
  };

  const handleExport = () => {
    if (!exportable) return;
    
    exportToCSV(filteredAndSortedData, {
      filename: exportFilename,
      columns: exportColumns,
      includeTimestamp: true
    });
  };

  const activeFilterCount = Object.values(activeFilters).filter(value => value && value !== 'all').length;

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-4">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold">
              Data ({filteredAndSortedData.length} of {data.length})
            </CardTitle>
            <div className="flex items-center gap-2">
              {exportable && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExport}
                  className="flex items-center gap-2"
                  disabled={filteredAndSortedData.length === 0}
                >
                  <Download className="w-4 h-4" />
                  Export CSV
                </Button>
              )}
              {filters.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowFilters(!showFilters)}
                  className="flex items-center gap-2"
                >
                  <Filter className="w-4 h-4" />
                  Filters
                  {activeFilterCount > 0 && (
                    <Badge variant="secondary" className="ml-1">
                      {activeFilterCount}
                    </Badge>
                  )}
                </Button>
              )}
              {(activeFilterCount > 0 || searchTerm) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="flex items-center gap-2"
                >
                  <X className="w-4 h-4" />
                  Clear
                </Button>
              )}
            </div>
          </div>

          {/* Search */}
          {searchKey && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder={searchPlaceholder}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          )}

          {/* Filters */}
          {showFilters && filters.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 p-4 bg-muted/20 rounded-lg">
              {filters.map((filter) => (
                <div key={filter.key} className="space-y-2">
                  <label className="text-sm font-medium">
                    {filter.placeholder || filter.key}
                  </label>
                  {filter.type === 'select' && filter.options ? (
                    <Select
                      value={activeFilters[filter.key] || 'all'}
                      onValueChange={(value) => handleFilterChange(filter.key, value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        {filter.options.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      placeholder={`Filter by ${filter.key}`}
                      value={activeFilters[filter.key] || ''}
                      onChange={(e) => handleFilterChange(filter.key, e.target.value)}
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                {columns.map((column) => (
                  <TableHead 
                    key={String(column.key)} 
                    className={`${column.width || ''} ${column.sortable ? 'cursor-pointer hover:bg-muted/50' : ''}`}
                    onClick={() => column.sortable && handleSort(String(column.key))}
                  >
                    <div className="flex items-center gap-2">
                      {column.header}
                      {column.sortable && (
                        <div className="flex flex-col">
                          {sortColumn === column.key && sortDirection === 'asc' && (
                            <SortAsc className="w-4 h-4" />
                          )}
                          {sortColumn === column.key && sortDirection === 'desc' && (
                            <SortDesc className="w-4 h-4" />
                          )}
                          {sortColumn !== column.key && (
                            <div className="w-4 h-4 opacity-30">
                              <SortAsc className="w-4 h-4" />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAndSortedData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={columns.length} className="text-center py-8 text-muted-foreground">
                    {emptyMessage}
                  </TableCell>
                </TableRow>
              ) : (
                filteredAndSortedData.map((row, index) => (
                  <TableRow 
                    key={index}
                    className={onRowClick ? 'cursor-pointer hover:bg-muted/50' : ''}
                    onClick={() => onRowClick?.(row)}
                  >
                    {columns.map((column) => (
                      <TableCell key={String(column.key)}>
                        {column.cell 
                          ? column.cell(getNestedValue(row, String(column.key)), row, index)
                          : String(getNestedValue(row, String(column.key)) || '-')
                        }
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
