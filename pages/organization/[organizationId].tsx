import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  ArrowLeft,
  RefreshCw,
  Zap,
  AlertTriangle,
  CheckCircle
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

interface NetworkSummary {
  id: string;
  name: string;
  productTypes: string[];
  organizationId: string;
  timeZone: string;
  tags: string[];
  enrollmentString?: string;
  deviceCount?: number;
  lastSeen?: string;
  status?: 'online' | 'offline' | 'alerting';
}

interface DeviceSummary {
  serial: string;
  name: string;
  model: string;
  networkId: string;
  networkName: string;
  productType: string;
  status: 'online' | 'offline' | 'alerting';
  lastReportedAt: string;
  publicIp?: string;
  lanIp?: string;
  mac: string;
}

interface OrganizationStats {
  networks: number;
  devices: number;
  onlineDevices: number;
  offlineDevices: number;
  alertingDevices: number;
  totalClients: number;
  totalTraffic: number;
}

export default function OrganizationDetail() {
  const router = useRouter();
  const { organizationId } = router.query;
  
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [networks, setNetworks] = useState<NetworkSummary[]>([]);
  const [devices, setDevices] = useState<DeviceSummary[]>([]);
  const [stats, setStats] = useState<OrganizationStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  const fetchOrganizationData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Fetch organization details
      const orgResponse = await fetch(`/api/organization/${organizationId}`);
      if (orgResponse.ok) {
        const orgData = await orgResponse.json();
        setOrganization(orgData.organization);
        setNetworks(orgData.networks || []);
        setDevices(orgData.devices || []);
        setStats(orgData.stats || null);
      }
    } catch (error) {
      console.error('Error fetching organization data:', error);
    } finally {
      setLoading(false);
    }
  }, [organizationId]);

  useEffect(() => {
    if (organizationId) {
      fetchOrganizationData();
    }
  }, [organizationId, fetchOrganizationData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchOrganizationData();
    setRefreshing(false);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'online':
        return <Badge variant="default" className="bg-status-online text-white"><CheckCircle className="h-3 w-3 mr-1" />Online</Badge>;
      case 'offline':
        return <Badge variant="destructive" className="bg-status-offline"><AlertTriangle className="h-3 w-3 mr-1" />Offline</Badge>;
      case 'alerting':
        return <Badge variant="secondary" className="bg-status-alerting text-black"><Zap className="h-3 w-3 mr-1" />Alerting</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const getDeviceIcon = (productType: string) => {
    switch (productType.toLowerCase()) {
      case 'appliance':
      case 'security appliance':
        return <Shield className="h-4 w-4" />;
      case 'switch':
        return <Network className="h-4 w-4" />;
      case 'wireless':
        return <Wifi className="h-4 w-4" />;
      default:
        return <Router className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!organization) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">Organization Not Found</h1>
          <Link href="/organizations">
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Organizations
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href="/organizations">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Organizations
              </Button>
            </Link>
            <div>
              <div className="flex items-center space-x-2">
                <Building2 className="h-6 w-6 text-primary" />
                <h1 className="text-3xl font-bold text-foreground">{organization.name}</h1>
              </div>
              <div className="flex items-center space-x-4 mt-2 text-sm text-muted-foreground">
                <div className="flex items-center space-x-1">
                  <Globe className="h-4 w-4" />
                  <span>{organization.cloud?.region?.name || 'Unknown Region'}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Shield className="h-4 w-4" />
                  <span>{organization.licensing?.model || 'Standard'}</span>
                </div>
              </div>
            </div>
          </div>
          <Button onClick={handleRefresh} disabled={refreshing} variant="outline">
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Stats Overview */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Networks</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">{stats.networks}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Devices</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">{stats.devices}</div>
                <div className="flex space-x-4 text-xs mt-1">
                  <span className="text-status-online">{stats.onlineDevices} online</span>
                  <span className="text-status-offline">{stats.offlineDevices} offline</span>
                  <span className="text-status-alerting">{stats.alertingDevices} alerting</span>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Clients</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">{stats.totalClients.toLocaleString()}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Traffic</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">{(stats.totalTraffic / 1024 / 1024 / 1024).toFixed(1)} GB</div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="networks">Networks ({networks.length})</TabsTrigger>
            <TabsTrigger value="devices">Devices ({devices.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Organization Details */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Building2 className="h-5 w-5" />
                    <span>Organization Details</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Organization ID:</span>
                    <span className="font-mono text-sm">{organization.id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">API Access:</span>
                    <Badge variant={organization.api?.enabled ? "default" : "secondary"}>
                      {organization.api?.enabled ? "Enabled" : "Disabled"}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">License Model:</span>
                    <span>{organization.licensing?.model || 'Standard'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Cloud Region:</span>
                    <span>{organization.cloud?.region?.name || 'Unknown'}</span>
                  </div>
                  {organization.url && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Dashboard:</span>
                      <a 
                        href={organization.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-primary hover:underline flex items-center space-x-1"
                      >
                        <span>Open</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Network Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Network className="h-5 w-5" />
                    <span>Network Summary</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {networks.length > 0 ? (
                    <div className="space-y-3">
                      {networks.slice(0, 5).map((network) => (
                        <div key={network.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                          <div>
                            <div className="font-medium">{network.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {network.productTypes.join(', ')} • {network.deviceCount || 0} devices
                            </div>
                          </div>
                          <Link href={`/${network.id}`}>
                            <Button variant="ghost" size="sm">
                              <ChevronRight className="h-4 w-4" />
                            </Button>
                          </Link>
                        </div>
                      ))}
                      {networks.length > 5 && (
                        <div className="text-center pt-2">
                          <Button variant="outline" size="sm" onClick={() => setActiveTab('networks')}>
                            View All Networks
                          </Button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      No networks found in this organization.
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="networks" className="space-y-4">
            <div className="grid gap-4">
              {networks.length > 0 ? (
                networks.map((network) => (
                  <Card key={network.id} className="hover:bg-muted/50 transition-colors">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="space-y-2">
                          <div className="flex items-center space-x-3">
                            <Network className="h-5 w-5 text-primary" />
                            <h3 className="text-lg font-semibold">{network.name}</h3>
                            {network.status && getStatusBadge(network.status)}
                          </div>
                          <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                            <span>{network.productTypes.join(', ')}</span>
                            <span>{network.deviceCount || 0} devices</span>
                            <span>{network.timeZone}</span>
                          </div>
                          {network.tags && network.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {network.tags.map((tag, index) => (
                                <Badge key={index} variant="outline" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="flex space-x-2">
                          <Link href={`/${network.id}`}>
                            <Button variant="outline" size="sm">
                              View Network
                            </Button>
                          </Link>
                          <Link href={`/firewall/${network.id}`}>
                            <Button variant="ghost" size="sm">
                              <Shield className="h-4 w-4" />
                            </Button>
                          </Link>
                          <Link href={`/switch/${network.id}`}>
                            <Button variant="ghost" size="sm">
                              <Network className="h-4 w-4" />
                            </Button>
                          </Link>
                          <Link href={`/wireless/${network.id}`}>
                            <Button variant="ghost" size="sm">
                              <Wifi className="h-4 w-4" />
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <Card>
                  <CardContent className="text-center py-8">
                    <Network className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Networks Found</h3>
                    <p className="text-muted-foreground">This organization doesn&apos;t have any networks yet.</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="devices" className="space-y-4">
            <div className="grid gap-4">
              {devices.length > 0 ? (
                devices.map((device) => (
                  <Card key={device.serial} className="hover:bg-muted/50 transition-colors">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="space-y-2">
                          <div className="flex items-center space-x-3">
                            {getDeviceIcon(device.productType)}
                            <h3 className="text-lg font-semibold">{device.name || device.model}</h3>
                            {getStatusBadge(device.status)}
                          </div>
                          <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                            <span>{device.model}</span>
                            <span className="font-mono">{device.serial}</span>
                            <span>{device.networkName}</span>
                          </div>
                          <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                            {device.publicIp && <span>Public: {device.publicIp}</span>}
                            {device.lanIp && <span>LAN: {device.lanIp}</span>}
                            <span>MAC: {device.mac}</span>
                          </div>
                          <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            <span>Last seen: {new Date(device.lastReportedAt).toLocaleString()}</span>
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <Link href={`/${device.networkId}`}>
                            <Button variant="outline" size="sm">
                              View Network
                            </Button>
                          </Link>
                          {device.productType.toLowerCase().includes('appliance') && (
                            <Link href={`/firewall/${device.networkId}`}>
                              <Button variant="ghost" size="sm">
                                <Shield className="h-4 w-4" />
                              </Button>
                            </Link>
                          )}
                          {device.productType.toLowerCase().includes('switch') && (
                            <Link href={`/switch/${device.networkId}`}>
                              <Button variant="ghost" size="sm">
                                <Network className="h-4 w-4" />
                              </Button>
                            </Link>
                          )}
                          {device.productType.toLowerCase().includes('wireless') && (
                            <Link href={`/wireless/${device.networkId}`}>
                              <Button variant="ghost" size="sm">
                                <Wifi className="h-4 w-4" />
                              </Button>
                            </Link>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <Card>
                  <CardContent className="text-center py-8">
                    <Router className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Devices Found</h3>
                    <p className="text-muted-foreground">This organization doesn&apos;t have any devices yet.</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
