import { GetServerSideProps } from 'next';
import { useRouter } from 'next/router';
import { useState } from 'react';
import Layout from '@/components/layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Shield, Wifi, Activity, Settings, Plus, Edit, Trash2, Filter, Globe, Lock } from 'lucide-react';
import { getNetworkDevices, getFirewallRules, getLayer7FirewallRules, getContentFilteringRules } from '@/lib/api/network';
import { NetworkProps, DeviceProps, FirewallRule, Layer7FirewallRule, ContentFilteringRule } from '@/lib/types/firewall';
import Breadcrumb from '@/components/breadcrumb';
import { FirewallRuleTable } from '@/components/firewall-rule-table';
import { FirewallCacheMonitor } from '@/components/firewall-cache-monitor';

interface FirewallPageProps {
  network: NetworkProps;
  devices: DeviceProps[];
  firewallRules: FirewallRule[];
  layer7Rules: Layer7FirewallRule[];
  contentFiltering: ContentFilteringRule;
}

export default function FirewallPage({ network, devices, firewallRules, layer7Rules, contentFiltering }: FirewallPageProps) {
  const router = useRouter();
  const { networkId } = router.query;
  const [rules, setRules] = useState<FirewallRule[]>(firewallRules);
  const [layer7FirewallRules, setLayer7FirewallRules] = useState<Layer7FirewallRule[]>(layer7Rules);
  const [contentFilter, setContentFilter] = useState<ContentFilteringRule>(contentFiltering);
  const [isEditing, setIsEditing] = useState(false);
  const [newBlockedSite, setNewBlockedSite] = useState('');

  const mxDevices = devices.filter(device => device.productType === 'appliance');

  return (
    <Layout>
      <div className="container mx-auto p-6 space-y-6">
        <Breadcrumb />
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Firewall Management</h1>
            <p className="text-muted-foreground">
              Configure and monitor MX security appliances for {network.name}
            </p>
          </div>
          <Button onClick={() => router.back()} variant="outline">
            Back to Network
          </Button>
        </div>

        {/* Cache Monitor */}
        <FirewallCacheMonitor networkId={networkId as string} />

        <Tabs defaultValue="rules" className="space-y-4">
          <TabsList>
            <TabsTrigger value="rules">
              <Settings className="w-4 h-4 mr-2" />
              Layer 3 Firewall
            </TabsTrigger>
            <TabsTrigger value="layer7">
              <Lock className="w-4 h-4 mr-2" />
              Layer 7 Firewall
            </TabsTrigger>
            <TabsTrigger value="content-filtering">
              <Filter className="w-4 h-4 mr-2" />
              Content Filtering
            </TabsTrigger>
            <TabsTrigger value="vpn">
              <Wifi className="w-4 h-4 mr-2" />
              VPN Settings
            </TabsTrigger>
            <TabsTrigger value="monitoring">
              <Activity className="w-4 h-4 mr-2" />
              Monitoring
            </TabsTrigger>
          </TabsList>

          <TabsContent value="layer7" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Layer 7 Firewall Rules</CardTitle>
                    <CardDescription>
                      Application-based blocking rules. Based on Meraki API: /networks/{`{networkId}`}/appliance/firewall/l7FirewallRules
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => {
                      const newRule: Layer7FirewallRule = {
                        policy: 'deny',
                        type: 'applicationCategory',
                        value: 'Social Networking'
                      };
                      setLayer7FirewallRules([...layer7FirewallRules, newRule]);
                    }}>
                      <Plus className="w-4 h-4 mr-2" />
                      Add Rule
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={async () => {
                        try {
                          const response = await fetch(`/api/firewall/layer7/${networkId}`, {
                            method: 'PUT',
                            headers: {
                              'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({ rules: layer7FirewallRules }),
                          });
                          
                          if (response.ok) {
                            alert('Layer 7 firewall rules updated successfully!');
                          } else {
                            throw new Error('Failed to update Layer 7 rules');
                          }
                        } catch (error) {
                          console.error('Error updating Layer 7 rules:', error);
                          alert('Failed to update Layer 7 firewall rules. Please try again.');
                        }
                      }}
                    >
                      Save Rules
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid gap-4">
                    {layer7FirewallRules.map((rule, index) => (
                      <Card key={index} className={`border-l-4 ${
                        rule.policy === 'deny' ? 'border-l-red-500' : 'border-l-green-500'
                      }`}>
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-lg">
                              {rule.type === 'application' && rule.valueObj ? rule.valueObj.name :
                               rule.type === 'applicationCategory' ? `${rule.value} Category` :
                               rule.type === 'host' ? `Host: ${rule.value}` :
                               rule.type === 'port' ? `Port: ${rule.value}` :
                               rule.type === 'ipRange' ? `IP Range: ${rule.value}` :
                               'Layer 7 Rule'}
                            </CardTitle>
                            <Badge variant={rule.policy === 'deny' ? 'destructive' : 'default'}>
                              {rule.policy === 'deny' ? 'Deny' : 'Allow'}
                            </Badge>
                          </div>
                          <CardDescription>
                            {rule.policy === 'deny' ? 'Blocks' : 'Allows'} access to {rule.type === 'application' ? 'application' :
                                            rule.type === 'applicationCategory' ? 'application category' :
                                            rule.type === 'host' ? 'host' :
                                            rule.type === 'port' ? 'port' :
                                            rule.type === 'ipRange' ? 'IP range' : 'resource'}
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div className="space-y-2">
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Type:</span>
                                <span className="capitalize">{rule.type.replace(/([A-Z])/g, ' $1').trim()}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Value:</span>
                                <span>
                                  {rule.type === 'application' && rule.valueObj ? 
                                    `${rule.valueObj.name} (ID: ${rule.valueObj.id})` :
                                    rule.value || 'N/A'}
                                </span>
                              </div>
                            </div>
                            <div className="space-y-2">
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Policy:</span>
                                <span className="capitalize">{rule.policy}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Status:</span>
                                <span className="text-green-600">Active</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-2 pt-2">
                            <Button size="sm" variant="outline" onClick={() => {
                              // Handle rule editing
                              console.log('Edit Layer 7 rule:', rule);
                            }}>
                              <Edit className="w-4 h-4 mr-2" />
                              Edit
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => {
                              const newRules = layer7FirewallRules.filter((_, i) => i !== index);
                              setLayer7FirewallRules(newRules);
                            }}>
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                    
                    {layer7FirewallRules.length === 0 && (
                      <div className="text-center py-8">
                        <Lock className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                        <p className="text-muted-foreground mb-4">No Layer 7 firewall rules configured</p>
                        <Button onClick={() => {
                          const newRule: Layer7FirewallRule = {
                            policy: 'deny',
                            type: 'applicationCategory',
                            value: 'Social Networking'
                          };
                          setLayer7FirewallRules([newRule]);
                        }}>
                          <Plus className="w-4 h-4 mr-2" />
                          Create First Rule
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="content-filtering" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Web Content Categories</CardTitle>
                  <CardDescription>
                    Configure content filtering by category
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    {[
                      'Social Networking',
                      'Adult Content', 
                      'Gaming',
                      'Streaming Media',
                      'News & Information',
                      'Business & Finance',
                      'Educational'
                    ].map((category, index) => {
                      const isBlocked = contentFilter.categories.includes(category);
                      return (
                        <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center space-x-3">
                            <Globe className="w-4 h-4 text-muted-foreground" />
                            <span className="font-medium">{category}</span>
                          </div>
                          <Badge variant={isBlocked ? 'destructive' : 'default'}>
                            {isBlocked ? 'Blocked' : 'Allowed'}
                          </Badge>
                        </div>
                      );
                    })}
                  </div>
                  <Button className="w-full" variant="outline">
                    <Settings className="w-4 h-4 mr-2" />
                    Configure Categories
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Custom Blocked Sites</CardTitle>
                  <CardDescription>
                    Manually block specific websites and domains
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    {contentFilter.blockedSites.map((site, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center space-x-3">
                          <Shield className="w-4 h-4 text-red-500" />
                          <span className="font-mono text-sm">{site}</span>
                        </div>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => {
                            const newSites = contentFilter.blockedSites.filter((_, i) => i !== index);
                            setContentFilter({
                              ...contentFilter,
                              blockedSites: newSites
                            });
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Enter domain or URL..."
                      className="flex-1 px-3 py-2 border rounded-md text-sm"
                      value={newBlockedSite}
                      onChange={(e) => setNewBlockedSite(e.target.value)}
                    />
                    <Button 
                      size="sm"
                      onClick={() => {
                        if (newBlockedSite.trim()) {
                          setContentFilter({
                            ...contentFilter,
                            blockedSites: [...contentFilter.blockedSites, newBlockedSite.trim()]
                          });
                          setNewBlockedSite('');
                        }
                      }}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Content Filtering Settings</CardTitle>
                <CardDescription>
                  Global content filtering configuration
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-4">
                    <h4 className="font-medium">Safe Search</h4>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Google Safe Search</span>
                        <Badge variant={contentFilter.safeSearch.google ? 'default' : 'secondary'}>
                          {contentFilter.safeSearch.google ? 'Enabled' : 'Disabled'}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Bing Safe Search</span>
                        <Badge variant={contentFilter.safeSearch.bing ? 'default' : 'secondary'}>
                          {contentFilter.safeSearch.bing ? 'Enabled' : 'Disabled'}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">YouTube Restricted Mode</span>
                        <Badge variant={contentFilter.safeSearch.youtube ? 'default' : 'secondary'}>
                          {contentFilter.safeSearch.youtube ? 'Enabled' : 'Disabled'}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-medium">Advanced Options</h4>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Block Malware</span>
                        <Badge variant={contentFilter.advancedOptions.blockMalware ? 'default' : 'secondary'}>
                          {contentFilter.advancedOptions.blockMalware ? 'Enabled' : 'Disabled'}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Block Phishing</span>
                        <Badge variant={contentFilter.advancedOptions.blockPhishing ? 'default' : 'secondary'}>
                          {contentFilter.advancedOptions.blockPhishing ? 'Enabled' : 'Disabled'}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">HTTPS Inspection</span>
                        <Badge variant={contentFilter.advancedOptions.httpsInspection ? 'default' : 'secondary'}>
                          {contentFilter.advancedOptions.httpsInspection ? 'Enabled' : 'Disabled'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 pt-6 border-t">
                  <Button
                    onClick={async () => {
                      try {
                        const response = await fetch(`/api/firewall/content-filtering/${networkId}`, {
                          method: 'PUT',
                          headers: {
                            'Content-Type': 'application/json',
                          },
                          body: JSON.stringify({ rules: contentFilter }),
                        });
                        
                        if (response.ok) {
                          alert('Content filtering settings updated successfully!');
                        } else {
                          throw new Error('Failed to update content filtering');
                        }
                      } catch (error) {
                        console.error('Error updating content filtering:', error);
                        alert('Failed to update content filtering settings. Please try again.');
                      }
                    }}
                  >
                    Save Configuration
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => {
                      setContentFilter(contentFiltering);
                    }}
                  >
                    Reset to Defaults
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="rules" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Layer 3 Firewall Rules</CardTitle>
                    <CardDescription>
                      Configure network security policies and access control for {network.name}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => setIsEditing(!isEditing)}>
                      <Edit className="w-4 h-4 mr-2" />
                      {isEditing ? 'View Mode' : 'Edit Mode'}
                    </Button>
                    <Button size="sm" onClick={() => {
                      const newRule: FirewallRule = {
                        comment: 'New Rule',
                        policy: 'allow',
                        protocol: 'tcp',
                        srcCidr: 'Any',
                        destCidr: 'Any',
                        srcPort: 'Any',
                        destPort: 'Any',
                        syslogEnabled: false
                      };
                      setRules([...rules, newRule]);
                      setIsEditing(true);
                    }}>
                      <Plus className="w-4 h-4 mr-2" />
                      Add Rule
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {rules && rules.length > 0 ? (
                    <FirewallRuleTable
                      rules={rules}
                      loading={false}
                      isEditing={isEditing}
                      onRuleEdit={(rule, index) => {
                        // Handle rule editing
                        console.log('Edit rule:', rule, 'at index:', index);
                      }}
                      onRuleDelete={(index) => {
                        const newRules = rules.filter((_, i) => i !== index);
                        setRules(newRules);
                      }}
                    />
                  ) : (
                    <div className="text-center py-8">
                      <Shield className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                      <p className="text-muted-foreground mb-4">No firewall rules configured</p>
                      <Button onClick={() => {
                        const defaultRule: FirewallRule = {
                          comment: 'Default Allow Rule',
                          policy: 'allow',
                          protocol: 'any',
                          srcCidr: 'Any',
                          destCidr: 'Any',
                          srcPort: 'Any',
                          destPort: 'Any',
                          syslogEnabled: false
                        };
                        setRules([defaultRule]);
                        setIsEditing(true);
                      }}>
                        <Plus className="w-4 h-4 mr-2" />
                        Create First Rule
                      </Button>
                    </div>
                  )}
                  
                  {isEditing && rules.length > 0 && (
                    <div className="flex gap-2 pt-4 border-t">
                      <Button 
                        onClick={async () => {
                          try {
                            const response = await fetch(`/api/firewall/${networkId}`, {
                              method: 'PUT',
                              headers: {
                                'Content-Type': 'application/json',
                              },
                              body: JSON.stringify({ rules }),
                            });
                            
                            if (response.ok) {
                              setIsEditing(false);
                              alert('Firewall rules updated successfully!');
                            } else {
                              throw new Error('Failed to update rules');
                            }
                          } catch (error) {
                            console.error('Error updating firewall rules:', error);
                            alert('Failed to update firewall rules. Please try again.');
                          }
                        }}
                      >
                        Save Changes
                      </Button>
                      <Button 
                        variant="outline" 
                        onClick={() => {
                          setRules(firewallRules);
                          setIsEditing(false);
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="vpn" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>VPN Configuration</CardTitle>
                <CardDescription>
                  Site-to-site VPN and client VPN settings
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">VPN configuration interface coming soon...</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="monitoring" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Security Monitoring</CardTitle>
                <CardDescription>
                  Real-time security events and threat detection
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Security monitoring dashboard coming soon...</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
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
    
    // Get firewall rules
    const firewallRules = await getFirewallRules(networkId);
    
    // Get Layer 7 firewall rules
    const layer7Rules = await getLayer7FirewallRules(networkId);
    
    // Get content filtering rules
    const contentFiltering = await getContentFilteringRules(networkId);
    
    return {
      props: {
        network,
        devices,
        firewallRules,
        layer7Rules,
        contentFiltering,
      },
    };
  } catch (error) {
    console.error('Error fetching firewall data:', error);
    return {
      notFound: true,
    };
  }
};
