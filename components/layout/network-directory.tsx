import { NetworkProps } from '@/lib/api/network';
import Link from 'next/link';
import useSWR from 'swr';
import fetcher from '@/lib/fetcher';
import { useDebounce } from '@/lib/hooks/use-debounce';
import { useState } from 'react';
import { DirectoryIcon, SearchIcon } from '@/components/icons';
import { Network } from 'lucide-react';
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
  const debouncedQuery = useDebounce(query, 200);
  const { data: searchedNetworks } = useSWR<NetworkProps[] | null>(
    debouncedQuery.length > 0 && `api/network?query=${debouncedQuery}`,
    fetcher,
    {
      keepPreviousData: true
    }
  );

  return (
    <aside className="flex-shrink-0 w-full bg-background sm:w-96 h-screen overflow-hidden border-r border-border flex flex-col">
      <div className="px-6 pt-6 pb-0 bg-background z-20 flex-shrink-0">
        <div className="flex items-center justify-between mb-4">
        </div>
        
        <div className="flex items-center space-x-2 mb-4">
          <Network className="h-6 w-6 text-primary" />
          <p className="text-2xl text-foreground font-bold">Networks</p>
        </div>
        
        <p className="mt-2 text-sm text-muted-foreground">
          Manage {Intl.NumberFormat('en-us').format(totalNetworks)}{' '}
          Meraki networks
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
          results.map(({ _id: letter, networks }) => (
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
