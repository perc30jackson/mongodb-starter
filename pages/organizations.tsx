import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Layout from '@/components/layout';
import BackgroundTaskMonitor from '@/components/background-task-monitor';
import OrganizationSync from '@/components/organization-sync';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { OrganizationTable } from '@/components/organization-table';
import { useOrganizations, useBatchOrganizationStats } from '@/lib/hooks/use-data-fetch';
import { 
  Building2, 
  Network, 
  Users, 
  Settings, 
  Shield,
  BarChart3,
  Router,
  Wifi,
  ExternalLink,
  ChevronRight,
  Globe,
  MapPin,
  Clock,
  Activity,
  Table
} from 'lucide-react';

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
  management?: {
    details: Array<{
      name: string;
      value: string;
    }>;
  };
}

interface OrganizationStats {
  networks: number;
  devices: number;
  clients: number;
}

export default function OrganizationsPage() {
  const router = useRouter();
  const [selectedOrganization, setSelectedOrganization] = useState<string | null>(null);
  
  // Use optimized data fetching hooks
  const { 
    data: organizations, 
    loading: organizationsLoading, 
    error: organizationsError,
    refetch: refetchOrganizations 
  } = useOrganizations();
  
  // Memoize organizationIds to prevent infinite re-renders
  const organizationIds = useMemo(() => 
    organizations?.map(org => org.id) || [], 
    [organizations]
  );
  
  // Temporarily disable batch stats to prevent API rate limiting
  // Instead, try to get basic stats from cache only
  const [organizationStats, setOrganizationStats] = useState<Record<string, { networks: number; devices: number; clients: number }>>({});
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsError, setStatsError] = useState<string | null>(null);
  
  useEffect(() => {
    const fetchOrganizationStats = async () => {
      if (organizationIds.length === 0) return;
      
      setStatsLoading(true);
      setStatsError(null);
      
      try {
        // Fetch stats for all organizations in parallel (much faster)
        const statsPromises = organizationIds.map(async (orgId) => {
          try {
            // Use the new lightweight stats endpoint
            const statsResponse = await fetch(`/api/organization/${orgId}/stats`);
            
            if (statsResponse.ok) {
              const orgStats = await statsResponse.json();
              return {
                orgId,
                stats: {
                  networks: orgStats.networks || 0,
                  devices: orgStats.devices || 0,
                  clients: orgStats.clients || 0
                }
              };
            } else {
              // If stats endpoint fails, try to get networks count only
              const networksResponse = await fetch(`/api/organization/${orgId}?action=networks`);
              
              if (networksResponse.ok) {
                const networks = await networksResponse.json();
                return {
                  orgId,
                  stats: {
                    networks: networks?.length || 0,
                    devices: 0,
                    clients: 0
                  }
                };
              } else {
                // Complete fallback
                return {
                  orgId,
                  stats: { networks: 0, devices: 0, clients: 0 }
                };
              }
            }
          } catch (error) {
            console.warn(`Failed to get stats for ${orgId}:`, error);
            return {
              orgId,
              stats: { networks: 0, devices: 0, clients: 0 }
            };
          }
        });
        
        // Wait for all requests to complete
        const results = await Promise.all(statsPromises);
        
        // Convert results to stats object
        const stats: Record<string, { networks: number; devices: number; clients: number }> = {};
        results.forEach(({ orgId, stats: orgStats }) => {
          stats[orgId] = orgStats;
        });
        
        setOrganizationStats(stats);
      } catch (error) {
        console.error('Error fetching organization stats:', error);
        setStatsError('Failed to load organization statistics');
      }
      
      setStatsLoading(false);
    };
    
    fetchOrganizationStats();
  }, [organizationIds]);
  
  const loading = organizationsLoading;
  const error = organizationsError || statsError;

  // Show progress indicator when loading stats
  const showStatsLoading = statsLoading && !organizationsLoading;

  const handleOrganizationSelect = (organizationId: string) => {
    setSelectedOrganization(organizationId);
    router.push(`/organization/${organizationId}`);
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return 'N/A';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-96">
          <CardHeader>
            <CardTitle className="text-destructive">Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p>{error}</p>
            <Button onClick={refetchOrganizations} className="mt-4">
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Safety check for organizations
  const safeOrganizations = organizations || [];

  return (
    <Layout>
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Building2 className="h-8 w-8" />
                <h1 className="text-4xl font-bold">Organizations</h1>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Badge variant="outline" className="text-sm">
                {safeOrganizations.length} organization{safeOrganizations.length !== 1 ? 's' : ''}
              </Badge>
              <Link href="/networks">
                <Button variant="outline">
                  <Network className="h-4 w-4 mr-2" />
                  View Networks
                </Button>
              </Link>
            </div>
          </div>

          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="overview" className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="table" className="flex items-center gap-2">
                <Table className="h-4 w-4" />
                Table View
              </TabsTrigger>
              <TabsTrigger value="sync" className="flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Sync Data
              </TabsTrigger>
              <TabsTrigger value="details" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Details
              </TabsTrigger>
              <TabsTrigger value="analytics" className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Analytics
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview">
              {showStatsLoading && (
                <div className="mb-4 p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                    Loading organization statistics...
                  </div>
                </div>
              )}
              
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {safeOrganizations.map((org) => {
                  const stats = organizationStats[org.id] || { networks: 0, devices: 0, clients: 0 };
                  const hasStats = organizationStats[org.id] !== undefined;
                  
                  return (
                    <Card 
                      key={org.id} 
                      className="hover:shadow-lg transition-shadow cursor-pointer"
                      onClick={() => handleOrganizationSelect(org.id)}
                    >
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-xl flex items-center gap-2">
                            <Building2 className="h-5 w-5" />
                            {org.name}
                          </CardTitle>
                          <ChevronRight className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <CardDescription className="flex items-center gap-2">
                          <Globe className="h-4 w-4" />
                          Organization ID: {org.id}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 gap-4 mb-4">
                          <div className="text-center">
                            <div className="text-2xl font-bold text-primary">
                              {hasStats ? stats.networks : (
                                <div className="animate-pulse bg-muted rounded w-8 h-8 mx-auto"></div>
                              )}
                            </div>
                            <div className="text-sm text-muted-foreground">Networks</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-primary">
                              {hasStats ? stats.devices : (
                                <div className="animate-pulse bg-muted rounded w-8 h-8 mx-auto"></div>
                              )}
                            </div>
                            <div className="text-sm text-muted-foreground">Devices</div>
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          {org.api?.enabled && (
                            <Badge variant="default" className="mr-2">
                              <Activity className="h-3 w-3 mr-1" />
                              API Enabled
                            </Badge>
                          )}
                          {org.cloud?.region?.name && (
                            <Badge variant="outline" className="mr-2">
                              <MapPin className="h-3 w-3 mr-1" />
                              {org.cloud.region.name}
                            </Badge>
                          )}
                          {org.licensing?.model && (
                            <Badge variant="secondary">
                              <Shield className="h-3 w-3 mr-1" />
                              {org.licensing.model}
                            </Badge>
                          )}
                        </div>
                        
                        <div className="mt-4 pt-4 border-t">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Total Clients</span>
                            <span className="font-medium">
                              {hasStats ? stats.clients : (
                                <div className="animate-pulse bg-muted rounded w-12 h-4"></div>
                              )}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {safeOrganizations.length === 0 && (
                <Card>
                  <CardContent className="pt-6 text-center">
                    <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No organizations found</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="table">
              <OrganizationTable
                organizations={safeOrganizations}
                organizationStats={organizationStats}
                loading={loading}
                onOrganizationClick={(org) => handleOrganizationSelect(org.id)}
              />
            </TabsContent>

            <TabsContent value="sync">
              <div className="max-w-2xl mx-auto">
                <OrganizationSync 
                  onSyncComplete={() => {
                    // Refetch organizations after sync completes
                    refetchOrganizations();
                  }}
                />
              </div>
            </TabsContent>

            <TabsContent value="details">
              <div className="space-y-6">
                {safeOrganizations.map((org) => (
                  <Card key={org.id}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2">
                          <Building2 className="h-5 w-5" />
                          {org.name}
                        </CardTitle>
                        <Link href={`/organization/${org.id}`}>
                          <Button variant="outline" size="sm">
                            <ExternalLink className="h-4 w-4 mr-2" />
                            Manage
                          </Button>
                        </Link>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                          <h4 className="font-semibold mb-2">Basic Information</h4>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">ID:</span>
                              <span className="font-mono">{org.id}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">URL:</span>
                              <a 
                                href={org.url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-primary hover:underline"
                              >
                                Dashboard
                              </a>
                            </div>
                          </div>
                        </div>
                        
                        <div>
                          <h4 className="font-semibold mb-2">Configuration</h4>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">API:</span>
                              <Badge variant={org.api?.enabled ? 'default' : 'secondary'}>
                                {org.api?.enabled ? 'Enabled' : 'Disabled'}
                              </Badge>
                            </div>
                            {org.licensing?.model && (
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Licensing:</span>
                                <span>{org.licensing.model}</span>
                              </div>
                            )}
                            {org.cloud?.region?.name && (
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Region:</span>
                                <span>{org.cloud.region.name}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div>
                          <h4 className="font-semibold mb-2">Statistics</h4>
                          <div className="space-y-2 text-sm">
                            {organizationStats[org.id] && (
                              <>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Networks:</span>
                                  <span>{organizationStats[org.id].networks}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Devices:</span>
                                  <span>{organizationStats[org.id].devices}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Clients:</span>
                                  <span>{organizationStats[org.id].clients}</span>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="analytics">
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">Total Organizations</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold">{safeOrganizations.length}</div>
                      <div className="text-sm text-muted-foreground">
                        Active organizations
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">Total Networks</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold">
                        {Object.values(organizationStats).reduce((sum, stats) => sum + stats.networks, 0)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Across all organizations
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">Total Devices</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold">
                        {Object.values(organizationStats).reduce((sum, stats) => sum + stats.devices, 0)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        All device types
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle>Organization Breakdown</CardTitle>
                    <CardDescription>Network and device distribution by organization</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {safeOrganizations.map((org) => {
                        const stats = organizationStats[org.id] || { networks: 0, devices: 0, clients: 0, licenses: 0 };
                        const totalNetworks = Object.values(organizationStats).reduce((sum, s) => sum + s.networks, 0);
                        const networkPercentage = totalNetworks > 0 ? (stats.networks / totalNetworks) * 100 : 0;
                        
                        return (
                          <div key={org.id} className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="font-medium">{org.name}</span>
                              <span className="text-sm text-muted-foreground">
                                {stats.networks} networks • {stats.devices} devices
                              </span>
                            </div>
                            <div className="w-full bg-secondary rounded-full h-2">
                              <div className="bg-primary h-2 rounded-full transition-all w-full" />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </Layout>
  );
}
