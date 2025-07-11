import { useState, useEffect } from 'react';
import { NetworkProps, DeviceProps, getNetworkDevices } from '@/lib/api/network';
import useSWR from 'swr';
import fetcher from '@/lib/fetcher';
import { LoadingDots } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { Shield, Router, Wifi, ExternalLink } from 'lucide-react';
import Breadcrumb from '@/components/breadcrumb';
import { DeviceTable } from '@/components/device-table';
import { ClientTable } from '@/components/client-table';

export default function NetworkDetails({ network }: { network: NetworkProps }) {
  const [activeTab, setActiveTab] = useState<'overview' | 'devices' | 'clients' | 'functions'>('overview');
  const [selectedDevices, setSelectedDevices] = useState<Set<string>>(new Set());

  const { data: devices, error: devicesError } = useSWR<DeviceProps[]>(
    `api/network/${network.id}/devices`,
    fetcher
  );

  const { data: clients } = useSWR(
    activeTab === 'clients' ? `api/network/${network.id}/clients` : null,
    fetcher
  );

  // Helper function to categorize devices
  const getDevicesByType = (devices: DeviceProps[]) => {
    const firewalls = devices.filter(d => d.model.startsWith('MX') || d.productType === 'appliance');
    const switches = devices.filter(d => d.model.startsWith('MS') || d.productType === 'switch');
    const accessPoints = devices.filter(d => d.model.startsWith('MR') || d.productType === 'wireless');
    return { firewalls, switches, accessPoints };
  };

  const handleDeviceAction = async (action: string, deviceSerial?: string) => {
    if (action === 'sync-status') {
      try {
        const response = await fetch('/api/sync-device-statuses', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          alert('Device statuses synced successfully! Please refresh the page to see updates.');
          // Optionally reload the page or refetch data
          window.location.reload();
        } else {
          throw new Error('Status sync failed');
        }
      } catch (error) {
        console.error('Error syncing device statuses:', error);
        alert('Error syncing device statuses');
      }
      return;
    }

    const targetDevices = deviceSerial ? [deviceSerial] : Array.from(selectedDevices);
    
    if (targetDevices.length === 0) {
      alert('Please select at least one device');
      return;
    }

    try {
      const response = await fetch(`/api/network/${network.id}/action`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action,
          devices: targetDevices,
        }),
      });

      if (response.ok) {
        alert(`${action} action completed successfully!`);
      } else {
        throw new Error('Action failed');
      }
    } catch (error) {
      console.error('Error performing action:', error);
      alert(`Error performing ${action} action`);
    }
  };

  const tabs = [
    { id: 'overview', name: 'Overview' },
    { id: 'devices', name: 'Devices' },
    { id: 'clients', name: 'Clients' },
    { id: 'functions', name: 'Functions' },
  ];

  return (
    <div className="h-full bg-background text-foreground">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary/80 to-primary px-6 py-8">
        <div className="max-w-7xl mx-auto">
          <Breadcrumb />
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-primary-foreground">{network.name}</h1>
              <p className="text-primary-foreground/80 mt-2">Network ID: {network.id}</p>
              <div className="flex flex-wrap gap-2 mt-4">
                {network.productTypes.map((type, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-white/20 text-primary-foreground"
                  >
                    {type}
                  </span>
                ))}
              </div>
            </div>
            <div className="flex-shrink-0">
              <Button
                variant="secondary"
                className="bg-white/10 hover:bg-white/20 text-primary-foreground border-white/20"
                onClick={() => window.open(network.url, '_blank')}
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Manage in Meraki
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-border">
        <div className="max-w-7xl mx-auto">
          <nav className="-mb-px flex space-x-8 px-6">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                }`}
              >
                {tab.name}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* Network Information Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="bg-card rounded-lg p-6 border border-border">
                <h3 className="text-lg font-semibold mb-4 text-foreground">Network Information</h3>
                <dl className="space-y-2">
                  <div>
                    <dt className="text-muted-foreground">Time Zone:</dt>
                    <dd className="text-foreground">{network.timeZone}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Organization ID:</dt>
                    <dd className="font-mono text-sm text-foreground">{network.organizationId}</dd>
                  </div>
                  {network.notes && (
                    <div>
                      <dt className="text-muted-foreground">Notes:</dt>
                      <dd className="text-foreground">{network.notes}</dd>
                    </div>
                  )}
                </dl>
              </div>
              
              <div className="bg-card rounded-lg p-6 border border-border">
                <h3 className="text-lg font-semibold mb-4 text-foreground">Tags</h3>
                {network.tags && network.tags.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {network.tags.map((tag, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-secondary text-secondary-foreground"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">No tags assigned</p>
                )}
              </div>

              <div className="bg-card rounded-lg p-6 border border-border">
                <h3 className="text-lg font-semibold mb-4 text-foreground">Quick Stats</h3>
                <dl className="space-y-2">
                  <div>
                    <dt className="text-muted-foreground">Total Devices:</dt>
                    <dd className="text-2xl font-bold text-primary">
                      {devices ? devices.length : <LoadingDots color="hsl(var(--primary))" />}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Product Types:</dt>
                    <dd className="text-foreground">{network.productTypes.length}</dd>
                  </div>
                </dl>
              </div>
            </div>

            {/* Device Management Section */}
            {devices && (
              <div>
                <h3 className="text-xl font-semibold mb-6">Device Management</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {(() => {
                    const { firewalls, switches, accessPoints } = getDevicesByType(devices);
                    return (
                      <>
                        {firewalls.length > 0 && (
                          <Card className="bg-card border-border">
                            <CardHeader>
                              <CardTitle className="text-foreground flex items-center gap-2">
                                <Shield className="w-5 h-5 text-red-500" />
                                Firewall Management
                              </CardTitle>
                              <CardDescription className="text-muted-foreground">
                                Manage firewall rules and security policies
                              </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                              <div className="text-sm text-foreground">
                                <p><strong>{firewalls.length}</strong> firewall{firewalls.length !== 1 ? 's' : ''} detected</p>
                                <p className="text-muted-foreground">Models: {[...new Set(firewalls.map(f => f.model))].join(', ')}</p>
                              </div>
                              <Link href={`/firewall/${network.id}`}>
                                <Button className="w-full bg-red-600 hover:bg-red-700 text-white">
                                  Manage Firewalls
                                </Button>
                              </Link>
                            </CardContent>
                          </Card>
                        )}

                        {switches.length > 0 && (
                          <Card className="bg-card border-border">
                            <CardHeader>
                              <CardTitle className="text-foreground flex items-center gap-2">
                                <Router className="w-5 h-5 text-blue-500" />
                                Switch Management
                              </CardTitle>
                              <CardDescription className="text-muted-foreground">
                                Configure ports, VLANs, and switching
                              </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                              <div className="text-sm text-foreground">
                                <p><strong>{switches.length}</strong> switch{switches.length !== 1 ? 'es' : ''} detected</p>
                                <p className="text-muted-foreground">Models: {[...new Set(switches.map(s => s.model))].join(', ')}</p>
                              </div>
                              <Link href={`/switch/${network.id}`}>
                                <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                                  Manage Switches
                                </Button>
                              </Link>
                            </CardContent>
                          </Card>
                        )}

                        {accessPoints.length > 0 && (
                          <Card className="bg-card border-border">
                            <CardHeader>
                              <CardTitle className="text-foreground flex items-center gap-2">
                                <Wifi className="w-5 h-5 text-purple-500" />
                                Wireless Management
                              </CardTitle>
                              <CardDescription className="text-muted-foreground">
                                Configure SSIDs and wireless settings
                              </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                              <div className="text-sm text-foreground">
                                <p><strong>{accessPoints.length}</strong> access point{accessPoints.length !== 1 ? 's' : ''} detected</p>
                                <p className="text-muted-foreground">Models: {[...new Set(accessPoints.map(ap => ap.model))].join(', ')}</p>
                              </div>
                              <Button className="w-full bg-purple-600 hover:bg-purple-700 text-white" disabled>
                                Coming Soon
                              </Button>
                            </CardContent>
                          </Card>
                        )}

                        {firewalls.length === 0 && switches.length === 0 && accessPoints.length === 0 && (
                          <Card className="bg-card border-border col-span-full">
                            <CardContent className="text-center py-8">
                              <p className="text-muted-foreground">No manageable devices found in this network</p>
                            </CardContent>
                          </Card>
                        )}
                      </>
                    );
                  })()}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'devices' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-foreground">Devices</h2>
              <div className="flex gap-2">
                <Button
                  onClick={() => handleDeviceAction('sync-status')}
                  className="bg-green-600 hover:bg-green-700"
                >
                  Sync Device Status
                </Button>
                <Button
                  onClick={() => handleDeviceAction('blink')}
                  disabled={selectedDevices.size === 0}
                  variant="secondary"
                  className="disabled:opacity-50"
                >
                  Blink Selected ({selectedDevices.size})
                </Button>
                <Button
                  onClick={() => handleDeviceAction('reboot')}
                  disabled={selectedDevices.size === 0}
                  variant="destructive"
                  className="disabled:opacity-50"
                >
                  Reboot Selected ({selectedDevices.size})
                </Button>
              </div>
            </div>
            
            {devices ? (
              <DeviceTable
                devices={devices}
                loading={false}
                selectedDevices={selectedDevices}
                onSelectionChange={setSelectedDevices}
                onDeviceAction={handleDeviceAction}
              />
            ) : devicesError ? (
              <div className="text-center py-8">
                <p className="text-destructive">Error loading devices</p>
              </div>
            ) : (
              <div className="text-center py-8">
                <LoadingDots color="hsl(var(--foreground))" />
              </div>
            )}
          </div>
        )}

        {activeTab === 'clients' && (
          <div>
            <h2 className="text-xl font-semibold mb-6 text-foreground">Network Clients</h2>
            <ClientTable
              clients={(clients as any) || []}
              loading={!clients}
              onClientClick={(client) => {
                console.log('Client clicked:', client);
              }}
            />
          </div>
        )}

        {activeTab === 'functions' && (
          <div>
            <h2 className="text-xl font-semibold mb-6 text-foreground">Network Functions</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="text-foreground">Device Management</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button
                    onClick={() => handleDeviceAction('sync')}
                    className="w-full"
                    variant="secondary"
                  >
                    Sync Devices from Meraki
                  </Button>
                  <Button
                    onClick={() => handleDeviceAction('sync-status')}
                    className="w-full bg-green-600 hover:bg-green-700"
                  >
                    Refresh Device Status
                  </Button>
                  <Button
                    onClick={() => handleDeviceAction('status-check')}
                    className="w-full"
                    variant="secondary"
                  >
                    Check All Device Status
                  </Button>
                </CardContent>
              </Card>
              
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="text-foreground">Security Management</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {devices && getDevicesByType(devices).firewalls.length > 0 ? (
                    <Link href={`/firewall/${network.id}`}>
                      <Button className="w-full bg-red-600 hover:bg-red-700 text-white">
                        Manage Firewall Rules
                      </Button>
                    </Link>
                  ) : (
                    <Button disabled className="w-full" variant="secondary">
                      No Firewalls Detected
                    </Button>
                  )}
                  <Button className="w-full bg-orange-600 hover:bg-orange-700">
                    Security Audit Report
                  </Button>
                </CardContent>
              </Card>

              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="text-foreground">Network Infrastructure</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {devices && getDevicesByType(devices).switches.length > 0 ? (
                    <Link href={`/switch/${network.id}`}>
                      <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                        Manage Switch Ports
                      </Button>
                    </Link>
                  ) : (
                    <Button disabled className="w-full" variant="secondary">
                      No Switches Detected
                    </Button>
                  )}
                  <Button className="w-full" variant="secondary">
                    View Network Topology
                  </Button>
                </CardContent>
              </Card>
              
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="text-foreground">Network Analysis</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button className="w-full bg-purple-600 hover:bg-purple-700">
                    Generate Traffic Report
                  </Button>
                  <Button className="w-full" variant="secondary">
                    View Client Usage
                  </Button>
                </CardContent>
              </Card>

              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="text-foreground">Maintenance</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button className="w-full bg-yellow-600 hover:bg-yellow-700">
                    Update Firmware
                  </Button>
                  <Button className="w-full" variant="destructive">
                    Emergency Reboot All
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
