import { GetServerSideProps } from 'next';
import { useRouter } from 'next/router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Network, Settings, Activity, Zap } from 'lucide-react';
import { getNetworkDevices, getSwitchPorts, NetworkProps } from '@/lib/api/network';
import Breadcrumb from '@/components/breadcrumb';

interface SwitchPageProps {
  network: NetworkProps;
  devices: any[];
  switchPorts: any[];
}

export default function SwitchPage({ network, devices, switchPorts }: SwitchPageProps) {
  const router = useRouter();
  const { networkId } = router.query;

  const msDevices = devices.filter(device => device.productType === 'switch');

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Breadcrumb />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Switch Management</h1>
          <p className="text-muted-foreground">
            Configure and monitor MS switches for {network.name}
          </p>
        </div>
        <Button onClick={() => router.back()} variant="outline">
          Back to Network
        </Button>
      </div>

      <Tabs defaultValue="devices" className="space-y-4">
        <TabsList>
          <TabsTrigger value="devices">
            <Network className="w-4 h-4 mr-2" />
            Switches
          </TabsTrigger>
          <TabsTrigger value="ports">
            <Zap className="w-4 h-4 mr-2" />
            Port Configuration
          </TabsTrigger>
          <TabsTrigger value="vlans">
            <Settings className="w-4 h-4 mr-2" />
            VLANs
          </TabsTrigger>
          <TabsTrigger value="monitoring">
            <Activity className="w-4 h-4 mr-2" />
            Port Status
          </TabsTrigger>
        </TabsList>

        <TabsContent value="devices" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {msDevices.map((device) => (
              <Card key={device.serial}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{device.name || 'Unnamed Switch'}</CardTitle>
                    <Badge 
                      variant={device.status === 'online' ? 'default' : 'destructive'}
                    >
                      {device.status}
                    </Badge>
                  </div>
                  <CardDescription>
                    {device.model} • {device.serial}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Firmware:</span>
                    <span>{device.firmware}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Management IP:</span>
                    <span>{device.lanIp || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Ports:</span>
                    <span>{device.portCount || 'Unknown'}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">PoE:</span>
                    <Badge variant={device.hasPoe ? 'default' : 'secondary'} className="text-xs">
                      {device.hasPoe ? 'Enabled' : 'Disabled'}
                    </Badge>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button size="sm" variant="outline" className="flex-1">
                      Blink LEDs
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1">
                      Reboot
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="ports" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Port Configuration</CardTitle>
              <CardDescription>
                Configure individual switch ports and their settings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {switchPorts && switchPorts.length > 0 ? (
                  <div className="grid gap-4">
                    {switchPorts.map((port, index) => (
                      <div key={index} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium">Port {port.portId}</h4>
                          <div className="flex gap-2">
                            <Badge variant={port.enabled ? 'default' : 'secondary'}>
                              {port.enabled ? 'Enabled' : 'Disabled'}
                            </Badge>
                            <Badge variant={port.linkStatus === 'up' ? 'default' : 'destructive'}>
                              {port.linkStatus || 'Unknown'}
                            </Badge>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Type:</span>
                            <p>{port.type || 'Access'}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">VLAN:</span>
                            <p>{port.vlan || '1'}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Speed:</span>
                            <p>{port.speed || 'Auto'}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">PoE:</span>
                            <p>{port.poeEnabled ? 'Enabled' : 'Disabled'}</p>
                          </div>
                        </div>
                        {port.name && (
                          <div className="mt-2">
                            <span className="text-muted-foreground text-sm">Description:</span>
                            <p className="text-sm">{port.name}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">No port configuration data available</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="vlans" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>VLAN Configuration</CardTitle>
              <CardDescription>
                Manage virtual LANs and network segmentation
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">Default VLAN</h4>
                    <Badge>VLAN 1</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Default untagged VLAN for access ports
                  </p>
                </div>
                <p className="text-muted-foreground text-sm">
                  Additional VLAN configuration features coming soon...
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="monitoring" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Port Status & Monitoring</CardTitle>
              <CardDescription>
                Real-time port utilization and performance metrics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Port monitoring dashboard coming soon...</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export const getServerSideProps: GetServerSideProps = async ({ params }) => {
  const networkId = params?.networkId as string;
  
  try {
    const { getNetwork } = await import('@/lib/api/network');
    
    // Get network information
    const network = await getNetwork(networkId);
    if (!network) {
      return { notFound: true };
    }

    // Get devices for this network
    const devices = await getNetworkDevices(networkId);
    
    // Get switch ports data (for the first switch found)
    const switches = devices.filter(device => device.productType === 'switch');
    let switchPorts: any[] = [];
    if (switches.length > 0) {
      switchPorts = await getSwitchPorts(switches[0].serial);
    }
    
    return {
      props: {
        network,
        devices,
        switchPorts,
      },
    };
  } catch (error) {
    console.error('Error fetching switch data:', error);
    return {
      notFound: true,
    };
  }
};
