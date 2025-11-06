import { ResultProps, UserProps } from '@/lib/api/user';
import Link from 'next/link';
import useSWR from 'swr';
import fetcher from '@/lib/fetcher';
import { useDebounce } from '@/lib/hooks/use-debounce';
import { useState } from 'react';
import { DirectoryIcon, SearchIcon } from '@/components/icons';
import DirectoryResults from './directory-results';

export default function Directory({
  results,
  totalUsers
}: {
  results: ResultProps[];
  totalUsers: number;
}) {
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 200);
  const { data: searchedUsers } = useSWR<UserProps[] | null>(
    debouncedQuery.length > 0 && `api/user?query=${debouncedQuery}`,
    fetcher,
    {
      keepPreviousData: true
    }
  );

  return (
    <aside 
      className="flex-shrink-0 w-full sm:w-96 h-screen overflow-hidden border-r border-color-border-200 flex flex-col bg-color-background-90"
    >
      <div 
        className="px-6 pt-6 pb-0 z-20 flex-shrink-0 bg-color-background-90"
      >
        <Link 
          href="/" 
          className="transition-all rounded-2xl h-12 w-12 flex justify-center items-center bg-color-primary-100 hover:bg-color-primary-200"
        >
          <DirectoryIcon className="text-color-background-100" />
        </Link>
        <p className="mt-8 text-2xl font-bold text-color-text-100">Directory</p>
        <p className="mt-2 text-sm text-color-text-300">
          Search directory of {Intl.NumberFormat('en-us').format(totalUsers)}{' '}
          developers
        </p>
        <form className="py-8 flex space-x-4" action="#">
          <div className="flex-1 min-w-0">
            <label htmlFor="search" className="sr-only">
              Search
            </label>
            <div 
              className="relative shadow-sm border-0 border-b rounded-none border-b-[1px]"
            >
              <div 
                className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none bg-color-background-90"
              >
                <SearchIcon className="h-4 w-4 text-color-text-400" />
              </div>
              <input
                type="search"
                name="search"
                id="search"
                className="focus:ring-transparent border-none focus:border-transparent block w-full pl-10 sm:text-sm rounded-md text-color-text-100 bg-color-background-90"
                placeholder="Search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
          </div>
        </form>
      </div>
      {/* Directory list */}
      <nav
        className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar"
        aria-label="Directory"
      >
        {debouncedQuery.length === 0 ? (
          results.map(({ _id: letter, users }) => (
            <div key={letter} className="relative">
              <div 
                className="px-6 py-1 text-sm font-bold uppercase bg-color-background-80 text-color-text-100"
              >
                <h3>{letter}</h3>
              </div>
              <DirectoryResults users={users} />
            </div>
          ))
        ) : searchedUsers && searchedUsers.length > 0 ? (
          <DirectoryResults users={searchedUsers} />
        ) : (
          <div className="px-6 py-6">
            <p className="text-center text-color-text-300">No results found</p>
          </div>
        )}
      </nav>
    </aside>
  );
}
