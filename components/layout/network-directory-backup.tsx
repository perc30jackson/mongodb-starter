import { NetworkProps } from '@/lib/api/network';
import Link from 'next/link';
import useSWR from 'swr';
import fetcher from '@/lib/fetcher';
import { useDebounce } from '@/lib/hooks/use-debounce';
import { useState, useMemo } from 'react';
import { DirectoryIcon, SearchIcon } from '@/components/icons';
import { Network, Filter, SortAsc, SortDesc, X } from 'lucide-react';
import NetworkDirectoryResults from '@/components/layout/network-directory-results';

export default function NetworkDirectory({
  results,
  totalNetworks,
  onNetworkSelect,
  selectedNetworkId
}: {
  results: any[];
  totalNetworks: number;
  onNetworkSelect: (network: NetworkProps) => void;
  selectedNetworkId?: string;
}) {
  const [query, setQuery] = useState('');
  const [filterTag, setFilterTag] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'type' | 'tag'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [showFilters, setShowFilters] = useState(false);
  
  const debouncedQuery = useDebounce(query, 200);
  const { data: searchedNetworks } = useSWR<NetworkProps[] | null>(
    debouncedQuery.length > 0 && `api/network?query=${debouncedQuery}`,
    fetcher,
    {
      keepPreviousData: true
    }
  );

  // Get all unique tags from all networks for filter dropdown
  const allTags = useMemo(() => {
    const tags = new Set<string>();
    results.forEach(({ networks }) => {
      networks.forEach((network: NetworkProps) => {
        network.tags.forEach(tag => tags.add(tag));
      });
    });
    return Array.from(tags).sort();
  }, [results]);

  // Filter and sort networks
  const processedResults = useMemo(() => {
    if (debouncedQuery.length > 0) return null; // Don't process when searching
    
    return results.map(({ _id: letter, networks }) => {
      let filteredNetworks = networks;
      
      // Apply tag filter
      if (filterTag) {
        filteredNetworks = networks.filter((network: NetworkProps) =>
          network.tags.some(tag => tag.toLowerCase().includes(filterTag.toLowerCase()))
        );
      }
      
      // Apply sorting
      filteredNetworks.sort((a: NetworkProps, b: NetworkProps) => {
        let aValue: string, bValue: string;
        
        switch (sortBy) {
          case 'name':
            aValue = a.name.toLowerCase();
            bValue = b.name.toLowerCase();
            break;
          case 'type':
            aValue = a.productTypes.join(', ').toLowerCase();
            bValue = b.productTypes.join(', ').toLowerCase();
            break;
          case 'tag':
            aValue = a.tags.join(', ').toLowerCase();
            bValue = b.tags.join(', ').toLowerCase();
            break;
          default:
            aValue = a.name.toLowerCase();
            bValue = b.name.toLowerCase();
        }
        
        const comparison = aValue.localeCompare(bValue);
        return sortOrder === 'asc' ? comparison : -comparison;
      });
      
      return { _id: letter, networks: filteredNetworks };
    }).filter(({ networks }) => networks.length > 0); // Remove empty groups
  }, [results, filterTag, sortBy, sortOrder, debouncedQuery]);

  // Calculate filtered network count
  const filteredNetworkCount = useMemo(() => {
    if (debouncedQuery.length > 0) {
      return searchedNetworks?.length || 0;
    }
    return (processedResults || results).reduce((count, { networks }) => count + networks.length, 0);
  }, [processedResults, results, searchedNetworks, debouncedQuery]);

  const handleSortToggle = () => {
    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
  };

  const clearFilters = () => {
    setFilterTag('');
    setSortBy('name');
    setSortOrder('asc');
  };

  return (
    <aside className="flex-shrink-0 w-full bg-background sm:w-96 h-screen overflow-hidden border-r border-border flex flex-col">
      <div className="px-6 pt-6 pb-0 bg-background z-20 flex-shrink-0">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center space-x-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <Filter className="h-4 w-4" />
            <span>Filters</span>
          </button>
          {(filterTag || sortBy !== 'name' || sortOrder !== 'asc') && (
            <button
              onClick={clearFilters}
              className="flex items-center space-x-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <X className="h-3 w-3" />
              <span>Clear</span>
            </button>
          )}
        </div>
        
        {showFilters && (
          <div className="mb-4 p-3 bg-muted rounded-md space-y-3">
            {/* Tag Filter */}
            <div>
              <label htmlFor="tag-filter" className="block text-xs font-medium text-foreground mb-1">
                Filter by Tag
              </label>
              <select
                id="tag-filter"
                value={filterTag}
                onChange={(e) => setFilterTag(e.target.value)}
                className="w-full text-sm border border-border rounded px-2 py-1 bg-background text-foreground"
              >
                <option value="">All tags</option>
                {allTags.map(tag => (
                  <option key={tag} value={tag}>{tag}</option>
                ))}
              </select>
            </div>
            
            {/* Sort Options */}
            <div className="flex space-x-3">
              <div className="flex-1">
                <label htmlFor="sort-by" className="block text-xs font-medium text-foreground mb-1">
                  Sort by
                </label>
                <select
                  id="sort-by"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as 'name' | 'type' | 'tag')}
                  className="w-full text-sm border border-border rounded px-2 py-1 bg-background text-foreground"
                >
                  <option value="name">Name</option>
                  <option value="type">Product Type</option>
                  <option value="tag">Tags</option>
                </select>
              </div>
              <div className="flex items-end">
                <button
                  onClick={handleSortToggle}
                  className="p-1 border border-border rounded bg-background hover:bg-accent"
                  title={`Sort ${sortOrder === 'asc' ? 'descending' : 'ascending'}`}
                >
                  {sortOrder === 'asc' ? 
                    <SortAsc className="h-4 w-4 text-foreground" /> : 
                    <SortDesc className="h-4 w-4 text-foreground" />
                  }
                </button>
              </div>
            </div>
          </div>
        )}
        
        <div className="flex items-center space-x-2 mb-4">
          <Network className="h-6 w-6 text-primary" />
          <p className="text-2xl text-foreground font-bold">Networks</p>
        </div>
        
        <p className="mt-2 text-sm text-muted-foreground">
          {filteredNetworkCount < totalNetworks ? (
            <>
              Showing {Intl.NumberFormat('en-us').format(filteredNetworkCount)} of{' '}
              {Intl.NumberFormat('en-us').format(totalNetworks)} Meraki networks
            </>
          ) : (
            <>
              Manage {Intl.NumberFormat('en-us').format(totalNetworks)} Meraki networks
            </>
          )}
        </p>
        <form className="py-8 flex space-x-4" action="#">
          <div className="flex-1 min-w-0">
            <label htmlFor="search" className="sr-only">
              Search
            </label>
            <div className="relative shadow-sm border-0 border-b-border rounded-none border-b-[1px] ">
              <div className="absolute bg-background inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <SearchIcon className="h-4 w-4 text-muted-foreground" />
              </div>
              <input
                type="search"
                name="search"
                id="search"
                className="text-foreground placeholder:text-muted-foreground focus:ring-transparent border-none bg-background focus:border-transparent block w-full pl-10 sm:text-sm rounded-md"
                placeholder="Search networks"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
          </div>
        </form>
      </div>
      {/* Network list */}
      <nav
        className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar"
        aria-label="Network Directory"
      >
        {debouncedQuery.length === 0 ? (
          (processedResults || results).map(({ _id: letter, networks }) => (
            <div key={letter} className="relative">
              <div className="bg-card px-6 py-1 text-sm font-bold text-foreground uppercase">
                <h3>{letter}</h3>
              </div>
              <NetworkDirectoryResults 
                networks={networks} 
                onNetworkSelect={onNetworkSelect}
                selectedNetworkId={selectedNetworkId}
              />
            </div>
          ))
        ) : searchedNetworks && searchedNetworks.length > 0 ? (
          <NetworkDirectoryResults 
            networks={searchedNetworks} 
            onNetworkSelect={onNetworkSelect}
            selectedNetworkId={selectedNetworkId}
          />
        ) : (
          <div className="px-6 py-6">
            <p className="text-center text-muted-foreground">No networks found</p>
          </div>
        )}
      </nav>
    </aside>
  );
}
