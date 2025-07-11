import { useState, useEffect, useCallback, useMemo } from 'react';

interface UseDataFetchOptions<T> {
  url: string;
  dependencies?: any[];
  enabled?: boolean;
  cacheTTL?: number; // Client-side cache TTL in milliseconds
  refetchOnWindowFocus?: boolean;
  staleTime?: number; // How long data is considered fresh (milliseconds)
}

interface DataState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  lastFetched: number | null;
}

// Simple client-side cache
const clientCache = new Map<string, {
  data: any;
  timestamp: number;
  staleTime: number;
}>();

export function useDataFetch<T>(options: UseDataFetchOptions<T>) {
  const {
    url,
    dependencies = [],
    enabled = true,
    cacheTTL = 5 * 60 * 1000, // 5 minutes default
    refetchOnWindowFocus = false,
    staleTime = 30 * 1000 // 30 seconds default
  } = options;

  const [state, setState] = useState<DataState<T>>({
    data: null,
    loading: true,
    error: null,
    lastFetched: null
  });

  const fetchData = useCallback(async (forceRefresh = false) => {
    if (!enabled) return;

    const cacheKey = url;
    const now = Date.now();
    
    // Check client-side cache first
    const cached = clientCache.get(cacheKey);
    if (!forceRefresh && cached && (now - cached.timestamp) < cached.staleTime) {
      console.log(`Client cache HIT: ${url}`);
      setState(prev => ({
        ...prev,
        data: cached.data,
        loading: false,
        error: null,
        lastFetched: cached.timestamp
      }));
      return;
    }

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      console.log(`Fetching: ${url}`);
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Update client-side cache
      clientCache.set(cacheKey, {
        data,
        timestamp: now,
        staleTime
      });

      setState({
        data,
        loading: false,
        error: null,
        lastFetched: now
      });
    } catch (error) {
      console.error(`Error fetching ${url}:`, error);
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }));
    }
  }, [url, enabled, staleTime]);

  const refetch = useCallback(() => {
    return fetchData(true);
  }, [fetchData]);

  const invalidateCache = useCallback(() => {
    clientCache.delete(url);
  }, [url]);

  // Initial fetch
  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchData, ...dependencies]);

  // Window focus refetch
  useEffect(() => {
    if (!refetchOnWindowFocus) return;

    const handleFocus = () => {
      const cached = clientCache.get(url);
      const now = Date.now();
      
      // Only refetch if data is stale
      if (!cached || (now - cached.timestamp) > staleTime) {
        fetchData();
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [fetchData, refetchOnWindowFocus, staleTime, url]);

  return {
    ...state,
    refetch,
    invalidateCache,
    isStale: state.lastFetched ? (Date.now() - state.lastFetched) > staleTime : true
  };
}

// Hook for organizations with optimized caching
export function useOrganizations() {
  return useDataFetch<any[]>({
    url: '/api/organizations',
    cacheTTL: 5 * 60 * 1000, // 5 minutes
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchOnWindowFocus: true
  });
}

// Hook for organization details with caching
export function useOrganizationDetails(organizationId: string, enabled = true) {
  return useDataFetch<any>({
    url: `/api/organization/${organizationId}`,
    dependencies: [organizationId],
    enabled: enabled && !!organizationId,
    cacheTTL: 3 * 60 * 1000, // 3 minutes
    staleTime: 60 * 1000, // 1 minute
    refetchOnWindowFocus: true
  });
}

// Hook for organization stats with reduced frequency
export function useOrganizationStats(organizationId: string, enabled = true) {
  const inventoryQuery = useDataFetch<any[]>({
    url: `/api/organization/${organizationId}?action=inventory`,
    dependencies: [organizationId],
    enabled: enabled && !!organizationId,
    cacheTTL: 10 * 60 * 1000, // 10 minutes (longer for inventory)
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  return inventoryQuery;
}

// Hook for batch organization stats (reduces API calls)
export function useBatchOrganizationStats(organizationIds: string[]) {
  const [batchStats, setBatchStats] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Use useMemo to prevent array recreation on every render
  const orgIdsString = useMemo(() => organizationIds.join(','), [organizationIds]);

  useEffect(() => {
    if (organizationIds.length === 0) {
      setLoading(false);
      return;
    }

    const fetchBatchStats = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // Process organizations in smaller batches to avoid rate limiting
        const batchSize = 3; // Reduced batch size
        const batches = [];
        for (let i = 0; i < organizationIds.length; i += batchSize) {
          batches.push(organizationIds.slice(i, i + batchSize));
        }

        const allStats: Record<string, any> = {};

        // Process batches sequentially with delays
        for (const batch of batches) {
          try {
            const promises = batch.map(async (orgId) => {
              try {
                // Add delay between requests to prevent rate limiting
                await new Promise(resolve => setTimeout(resolve, 100 * Math.random()));
                
                const [orgResponse, inventoryResponse] = await Promise.all([
                  fetch(`/api/organization/${orgId}`),
                  fetch(`/api/organization/${orgId}?action=inventory`)
                ]);

                const [orgData, inventory] = await Promise.all([
                  orgResponse.ok ? orgResponse.json() : null,
                  inventoryResponse.ok ? inventoryResponse.json() : []
                ]);

                return {
                  [orgId]: {
                    networks: orgData?.networks?.length || 0,
                    devices: orgData?.devices?.length || (Array.isArray(inventory) ? inventory.length : 0),
                    clients: orgData?.stats?.totalClients || 0
                  }
                };
              } catch (error) {
                console.warn(`Failed to fetch stats for organization ${orgId}:`, error);
                return {
                  [orgId]: { networks: 0, devices: 0, clients: 0 }
                };
              }
            });

            const results = await Promise.allSettled(promises);
            
            results.forEach((result) => {
              if (result.status === 'fulfilled') {
                Object.assign(allStats, result.value);
              }
            });

            // Add delay between batches
            if (batches.indexOf(batch) < batches.length - 1) {
              await new Promise(resolve => setTimeout(resolve, 1000));
            }
          } catch (batchError) {
            console.warn('Error processing batch:', batchError);
          }
        }

        setBatchStats(allStats);
      } catch (error) {
        console.error('Error in batch stats fetch:', error);
        setError(error instanceof Error ? error.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchBatchStats();
  }, [orgIdsString]); // Use string instead of array to prevent infinite re-renders

  return { batchStats, loading, error };
}

// Clear all client caches
export function clearClientCache() {
  clientCache.clear();
  console.log('Client cache cleared');
}

// Get client cache stats
export function getClientCacheStats() {
  const entries = Array.from(clientCache.entries());
  const now = Date.now();
  
  return {
    totalEntries: entries.length,
    staleEntries: entries.filter(([_, cache]) => 
      (now - cache.timestamp) > cache.staleTime
    ).length,
    cacheByUrl: entries.reduce((acc, [url, cache]) => {
      acc[url] = {
        age: now - cache.timestamp,
        isStale: (now - cache.timestamp) > cache.staleTime
      };
      return acc;
    }, {} as Record<string, { age: number; isStale: boolean }>)
  };
}
