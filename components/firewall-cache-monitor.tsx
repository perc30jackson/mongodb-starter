import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Database, Trash2, RefreshCw } from 'lucide-react';

interface CacheStats {
  firewallRules: number;
  layer7Rules: number;
  contentFiltering: number;
  totalEntries: number;
  lastUpdated: string;
}

export function FirewallCacheMonitor({ networkId }: { networkId: string }) {
  const [stats, setStats] = useState<CacheStats | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchCacheStats = async () => {
    try {
      const response = await fetch('/api/firewall/cache-stats');
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Error fetching cache stats:', error);
    }
  };

  const clearNetworkCache = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/firewall/cache-management', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'clear-network', networkId }),
      });
      
      if (response.ok) {
        await fetchCacheStats();
        alert('Network cache cleared successfully');
      }
    } catch (error) {
      console.error('Error clearing cache:', error);
      alert('Failed to clear cache');
    } finally {
      setLoading(false);
    }
  };

  const clearExpiredCache = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/firewall/cache-management', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'clear-expired' }),
      });
      
      if (response.ok) {
        await fetchCacheStats();
        alert('Expired cache entries cleared');
      }
    } catch (error) {
      console.error('Error clearing expired cache:', error);
      alert('Failed to clear expired cache');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCacheStats();
    // Refresh stats every 30 seconds
    const interval = setInterval(fetchCacheStats, 30000);
    return () => clearInterval(interval);
  }, []);

  if (!stats) {
    return (
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="w-5 h-5" />
            Cache Status
          </CardTitle>
          <CardDescription>Loading cache statistics...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Database className="w-5 h-5" />
              Firewall Cache Monitor
            </CardTitle>
            <CardDescription>
              Monitor and manage firewall data caching
            </CardDescription>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={fetchCacheStats}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold">{stats.firewallRules}</div>
            <div className="text-sm text-muted-foreground">Firewall Rules</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">{stats.layer7Rules}</div>
            <div className="text-sm text-muted-foreground">Layer 7 Rules</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">{stats.contentFiltering}</div>
            <div className="text-sm text-muted-foreground">Content Filters</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">{stats.totalEntries}</div>
            <div className="text-sm text-muted-foreground">Total Cached</div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t">
          <div className="flex items-center gap-2">
            <Badge variant="secondary">
              Last Updated: {new Date(stats.lastUpdated).toLocaleTimeString()}
            </Badge>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={clearNetworkCache}
              disabled={loading}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Clear Network Cache
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={clearExpiredCache}
              disabled={loading}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Clear Expired
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
