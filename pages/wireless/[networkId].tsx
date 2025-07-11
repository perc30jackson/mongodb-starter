import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Wifi, 
  Radio, 
  Users, 
  Shield, 
  Activity, 
  Settings, 
  Plus, 
  Edit,
  Trash2,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  BarChart3,
  ExternalLink
} from 'lucide-react';
import Breadcrumb from '@/components/breadcrumb';

interface WirelessSSID {
  number: number;
  name: string;
  enabled: boolean;
  visible: boolean;
  authMode: string;
  encryptionMode: string;
  ipAssignmentMode: string;
  vlanId?: number;
  perClientBandwidthLimitUp?: number;
  perClientBandwidthLimitDown?: number;
}

interface WirelessClient {
  id: string;
  mac: string;
  description?: string;
  ip?: string;
  ssid?: string;
  status: string;
  usage: {
    sent: number;
    recv: number;
  };
}

interface RFProfile {
  id: string;
  name: string;
  clientBalancingEnabled?: boolean;
  minBitrateType?: string;
  bandSelectionType?: string;
}

interface AirMarshalRule {
  ruleId: string;
  type: 'allow' | 'block' | 'alert';
  match: {
    type: string;
    string: string;
  };
}

export default function WirelessPage() {
  const router = useRouter();
  const { networkId } = router.query;
  const [loading, setLoading] = useState(true);
  const [ssids, setSSIDs] = useState<WirelessSSID[]>([]);
  const [clients, setClients] = useState<WirelessClient[]>([]);
  const [rfProfiles, setRFProfiles] = useState<RFProfile[]>([]);
  const [airMarshalRules, setAirMarshalRules] = useState<AirMarshalRule[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (networkId) {
      fetchWirelessData();
    }
  }, [networkId]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchWirelessData = async () => {
    if (!networkId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const [ssidsRes, clientsRes, profilesRes, rulesRes] = await Promise.all([
        fetch(`/api/wireless/${networkId}?action=ssids`),
        fetch(`/api/wireless/${networkId}?action=clients`),
        fetch(`/api/wireless/${networkId}?action=rfProfiles`),
        fetch(`/api/wireless/${networkId}?action=airMarshalRules`)
      ]);

      if (ssidsRes.ok) {
        const ssidsData = await ssidsRes.json();
        setSSIDs(ssidsData);
      }

      if (clientsRes.ok) {
        const clientsData = await clientsRes.json();
        setClients(clientsData);
      }

      if (profilesRes.ok) {
        const profilesData = await profilesRes.json();
        setRFProfiles(profilesData);
      }

      if (rulesRes.ok) {
        const rulesData = await rulesRes.json();
        setAirMarshalRules(rulesData);
      }
    } catch (error) {
      console.error('Error fetching wireless data:', error);
      setError('Failed to load wireless data');
    } finally {
      setLoading(false);
    }
  };

  const toggleSSIDEnabled = async (ssidNumber: number, enabled: boolean) => {
    try {
      const response = await fetch(`/api/wireless/${networkId}?action=ssids&ssidNumber=${ssidNumber}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !enabled })
      });

      if (response.ok) {
        fetchWirelessData(); // Refresh data
      }
    } catch (error) {
      console.error('Error toggling SSID:', error);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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
            <Button onClick={fetchWirelessData} className="mt-4">
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <Breadcrumb />
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-muted-foreground hover:text-foreground">
              ← Back to Networks
            </Link>
            <div className="flex items-center gap-2">
              <Wifi className="h-6 w-6" />
              <h1 className="text-3xl font-bold">Wireless Management</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              onClick={() => window.open(`https://dashboard.meraki.com/n/${networkId}/manage/configure/overview`, '_blank')}
              variant="outline"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Manage in Meraki
            </Button>
            <Badge variant="outline" className="text-sm">
              Network: {networkId}
            </Badge>
          </div>
        </div>

        <Tabs defaultValue="ssids" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="ssids" className="flex items-center gap-2">
              <Wifi className="h-4 w-4" />
              SSIDs
            </TabsTrigger>
            <TabsTrigger value="clients" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Clients
            </TabsTrigger>
            <TabsTrigger value="rfProfiles" className="flex items-center gap-2">
              <Radio className="h-4 w-4" />
              RF Profiles
            </TabsTrigger>
            <TabsTrigger value="security" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Security
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Analytics
            </TabsTrigger>
          </TabsList>

          <TabsContent value="ssids">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-semibold">Wireless SSIDs</h2>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Configure SSID
                </Button>
              </div>

              <div className="grid gap-4">
                {ssids.map((ssid) => (
                  <Card key={ssid.number}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <CardTitle className="text-lg">{ssid.name}</CardTitle>
                          <Badge variant={ssid.enabled ? 'default' : 'secondary'}>
                            SSID {ssid.number}
                          </Badge>
                          {ssid.visible ? (
                            <Badge variant="outline" className="flex items-center gap-1">
                              <Eye className="h-3 w-3" />
                              Visible
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="flex items-center gap-1">
                              <EyeOff className="h-3 w-3" />
                              Hidden
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => toggleSSIDEnabled(ssid.number, ssid.enabled)}
                          >
                            {ssid.enabled ? (
                              <>
                                <Unlock className="h-4 w-4 mr-2" />
                                Disable
                              </>
                            ) : (
                              <>
                                <Lock className="h-4 w-4 mr-2" />
                                Enable
                              </>
                            )}
                          </Button>
                          <Button variant="outline" size="sm">
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </Button>
                        </div>
                      </div>
                      <CardDescription>
                        {ssid.authMode} • {ssid.encryptionMode} • {ssid.ipAssignmentMode}
                        {ssid.vlanId && ` • VLAN ${ssid.vlanId}`}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Status</p>
                          <Badge variant={ssid.enabled ? 'default' : 'secondary'}>
                            {ssid.enabled ? 'Enabled' : 'Disabled'}
                          </Badge>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Authentication</p>
                          <p className="font-medium">{ssid.authMode}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Encryption</p>
                          <p className="font-medium">{ssid.encryptionMode}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">IP Assignment</p>
                          <p className="font-medium">{ssid.ipAssignmentMode}</p>
                        </div>
                        {ssid.perClientBandwidthLimitUp && (
                          <div>
                            <p className="text-muted-foreground">Upload Limit</p>
                            <p className="font-medium">{ssid.perClientBandwidthLimitUp} Mbps</p>
                          </div>
                        )}
                        {ssid.perClientBandwidthLimitDown && (
                          <div>
                            <p className="text-muted-foreground">Download Limit</p>
                            <p className="font-medium">{ssid.perClientBandwidthLimitDown} Mbps</p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="clients">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-semibold">Connected Clients</h2>
                <Badge variant="outline">{clients.length} clients</Badge>
              </div>

              <div className="grid gap-4">
                {clients.map((client) => (
                  <Card key={client.id}>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="font-semibold">{client.description || 'Unknown Device'}</h3>
                          <p className="text-sm text-muted-foreground">{client.mac}</p>
                        </div>
                        <Badge variant={client.status === 'Online' ? 'default' : 'secondary'}>
                          {client.status}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">IP Address</p>
                          <p className="font-medium">{client.ip || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">SSID</p>
                          <p className="font-medium">{client.ssid || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Data Sent</p>
                          <p className="font-medium">{formatBytes(client.usage.sent)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Data Received</p>
                          <p className="font-medium">{formatBytes(client.usage.recv)}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {clients.length === 0 && (
                <Card>
                  <CardContent className="pt-6 text-center">
                    <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No clients currently connected</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="rfProfiles">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-semibold">RF Profiles</h2>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Profile
                </Button>
              </div>

              <div className="grid gap-4">
                {rfProfiles.map((profile) => (
                  <Card key={profile.id}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">{profile.name}</CardTitle>
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm">
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </Button>
                          <Button variant="outline" size="sm">
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Client Balancing</p>
                          <Badge variant={profile.clientBalancingEnabled ? 'default' : 'secondary'}>
                            {profile.clientBalancingEnabled ? 'Enabled' : 'Disabled'}
                          </Badge>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Min Bitrate</p>
                          <p className="font-medium">{profile.minBitrateType || 'Default'}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Band Selection</p>
                          <p className="font-medium">{profile.bandSelectionType || 'Default'}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {rfProfiles.length === 0 && (
                <Card>
                  <CardContent className="pt-6 text-center">
                    <Radio className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No RF profiles configured</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="security">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-semibold">Air Marshal Rules</h2>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Rule
                </Button>
              </div>

              <div className="grid gap-4">
                {airMarshalRules.map((rule) => (
                  <Card key={rule.ruleId}>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <Badge 
                            variant={
                              rule.type === 'allow' ? 'default' : 
                              rule.type === 'block' ? 'destructive' : 'secondary'
                            }
                          >
                            {rule.type.toUpperCase()}
                          </Badge>
                          <span className="font-medium">{rule.match.string}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm">
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </Button>
                          <Button variant="outline" size="sm">
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </Button>
                        </div>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Match type: {rule.match.type}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {airMarshalRules.length === 0 && (
                <Card>
                  <CardContent className="pt-6 text-center">
                    <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No Air Marshal rules configured</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="analytics">
            <div className="space-y-6">
              <h2 className="text-2xl font-semibold">Wireless Analytics</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Total SSIDs</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{ssids.length}</div>
                    <div className="text-sm text-muted-foreground">
                      {ssids.filter(s => s.enabled).length} enabled
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Connected Clients</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{clients.length}</div>
                    <div className="text-sm text-muted-foreground">
                      Across all SSIDs
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">RF Profiles</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{rfProfiles.length}</div>
                    <div className="text-sm text-muted-foreground">
                      Radio configurations
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Security Rules</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{airMarshalRules.length}</div>
                    <div className="text-sm text-muted-foreground">
                      Air Marshal rules
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Total Data Usage</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">
                      {formatBytes(
                        clients.reduce((total, client) => 
                          total + client.usage.sent + client.usage.recv, 0
                        )
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      All clients combined
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Network Health</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2">
                      <Activity className="h-4 w-4 text-green-500" />
                      <span className="text-lg font-semibold">Healthy</span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      All systems operational
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
