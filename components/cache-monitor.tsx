import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Database, 
  RefreshCw, 
  Trash2, 
  Clock, 
  Users, 
  BarChart3,
  AlertCircle,
  CheckCircle,
  Timer
} from 'lucide-react';

interface CacheStats {
  totalEntries: number;
  entriesByType: Record<string, number>;
  oldestEntry?: string;
  newestEntry?: string;
}

interface UserStateStats {
  totalStates: number;
  statesByComponent: Record<string, string>;
}

export function CacheMonitor() {
  const [cacheStats, setCacheStats] = useState<CacheStats | null>(null);
  const [userStats, setUserStats] = useState<UserStateStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const [cacheResponse, userResponse] = await Promise.all([
        fetch('/api/cache?action=stats'),
        fetch('/api/cache?action=user-states')
      ]);

      if (cacheResponse.ok) {
        const cacheData = await cacheResponse.json();
        setCacheStats(cacheData.cache);
      }

      if (userResponse.ok) {
        const userData = await userResponse.json();
        setUserStats({
          totalStates: userData.totalStates,
          statesByComponent: userData.statesByComponent
        });
      }

      setLastUpdated(new Date());
    } catch (error) {
      console.error('Failed to fetch cache stats:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  const clearCache = async () => {
    try {
      const response = await fetch('/api/cache?action=clear-cache', {
        method: 'DELETE'
      });
      if (response.ok) {
        await fetchStats();
      }
    } catch (error) {
      console.error('Failed to clear cache:', error);
    }
  };

  const clearUserStates = async () => {
    try {
      const response = await fetch('/api/cache?action=clear-user-states', {
        method: 'DELETE'
      });
      if (response.ok) {
        await fetchStats();
      }
    } catch (error) {
      console.error('Failed to clear user states:', error);
    }
  };

  const invalidateType = async (type: string) => {
    try {
      const response = await fetch('/api/cache?action=invalidate-type', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type })
      });
      if (response.ok) {
        await fetchStats();
      }
    } catch (error) {
      console.error('Failed to invalidate cache type:', error);
    }
  };

  if (loading && !cacheStats) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Cache Monitor
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-8">
            <RefreshCw className="h-6 w-6 animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Cache Monitor
            </CardTitle>
            <CardDescription>
              MongoDB cache and state management status
              {lastUpdated && (
                <span className="text-xs text-muted-foreground block mt-1">
                  Last updated: {lastUpdated.toLocaleTimeString()}
                </span>
              )}
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={fetchStats}
              size="sm"
              variant="outline"
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            <Button
              onClick={clearCache}
              size="sm"
              variant="destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <Tabs defaultValue="cache" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="cache">Cache Stats</TabsTrigger>
            <TabsTrigger value="states">User States</TabsTrigger>
          </TabsList>
          
          <TabsContent value="cache" className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <div className="text-2xl font-bold">{cacheStats?.totalEntries || 0}</div>
                <div className="text-sm text-muted-foreground">Total Entries</div>
              </div>
              
              <div className="space-y-2">
                <div className="text-2xl font-bold">
                  {Object.keys(cacheStats?.entriesByType || {}).length}
                </div>
                <div className="text-sm text-muted-foreground">Cache Types</div>
              </div>
              
              <div className="space-y-2">
                <div className="text-2xl font-bold text-green-600">
                  <CheckCircle className="h-5 w-5 inline" />
                </div>
                <div className="text-sm text-muted-foreground">Status</div>
              </div>
              
              <div className="space-y-2">
                <div className="text-2xl font-bold">
                  {cacheStats?.oldestEntry ? (
                    <Timer className="h-5 w-5 inline" />
                  ) : (
                    <Clock className="h-5 w-5 inline" />
                  )}
                </div>
                <div className="text-sm text-muted-foreground">Age</div>
              </div>
            </div>

            {cacheStats?.entriesByType && Object.keys(cacheStats.entriesByType).length > 0 && (
              <div className="space-y-3">
                <h4 className="text-sm font-medium">Cache by Type</h4>
                <div className="space-y-2">
                  {Object.entries(cacheStats.entriesByType).map(([type, count]) => (
                    <div key={type} className="flex items-center justify-between p-2 border rounded">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{type}</Badge>
                        <span className="text-sm">{count} entries</span>
                      </div>
                      <Button
                        onClick={() => invalidateType(type)}
                        size="sm"
                        variant="ghost"
                      >
                        Clear
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="states" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="text-2xl font-bold">{userStats?.totalStates || 0}</div>
                <div className="text-sm text-muted-foreground">User States</div>
              </div>
              
              <div className="space-y-2">
                <div className="text-2xl font-bold">
                  {Object.keys(userStats?.statesByComponent || {}).length}
                </div>
                <div className="text-sm text-muted-foreground">Components</div>
              </div>
            </div>

            {userStats?.statesByComponent && Object.keys(userStats.statesByComponent).length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium">States by Component</h4>
                  <Button
                    onClick={clearUserStates}
                    size="sm"
                    variant="outline"
                  >
                    Clear All
                  </Button>
                </div>
                <div className="space-y-2">
                  {Object.entries(userStats.statesByComponent).map(([component, lastUpdated]) => (
                    <div key={component} className="flex items-center justify-between p-2 border rounded">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">{component}</Badge>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {new Date(lastUpdated).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
