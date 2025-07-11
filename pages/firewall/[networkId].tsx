import { GetServerSideProps } from 'next';
import { useRouter } from 'next/router';
import { useState, useMemo } from 'react';
import Layout from '@/components/layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Shield, Wifi, Activity, Settings, Plus, Edit, Trash2, Filter, Globe, Lock, Search } from 'lucide-react';
import { getNetworkDevices, getFirewallRules, getLayer7FirewallRules, getContentFilteringRules } from '@/lib/api/network';
import { NetworkProps, DeviceProps, FirewallRule, Layer7FirewallRule, ContentFilteringRule } from '@/lib/types/firewall';
import Breadcrumb from '@/components/breadcrumb';
import { FirewallRuleTable } from '@/components/firewall-rule-table';

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
  
  // Debug logging
  console.log('Layer 7 Rules received:', layer7Rules);
  console.log('Content Filtering received:', contentFiltering);
  
  const [rules, setRules] = useState<FirewallRule[]>(firewallRules || []);
  const [layer7FirewallRules, setLayer7FirewallRules] = useState<Layer7FirewallRule[]>(Array.isArray(layer7Rules) ? layer7Rules : []);
  const [contentFilter, setContentFilter] = useState<ContentFilteringRule>(() => {
    // Provide a simple, safe default
    if (!contentFiltering) {
      return {
        allowedUrlPatterns: [],
        blockedUrlPatterns: [],
        blockedUrlCategories: [],
        urlCategoryListSize: 'topSites'
      };
    }
    
    // Safely copy the props to state
    return {
      allowedUrlPatterns: contentFiltering.allowedUrlPatterns || [],
      blockedUrlPatterns: contentFiltering.blockedUrlPatterns || [],
      blockedUrlCategories: contentFiltering.blockedUrlCategories || [],
      urlCategoryListSize: contentFiltering.urlCategoryListSize || 'topSites'
    };
  });
  const [isEditing, setIsEditing] = useState(false);
  const [newBlockedSite, setNewBlockedSite] = useState('');
  
  // Search states
  const [layer7Search, setLayer7Search] = useState('');
  const [countriesSearch, setCountriesSearch] = useState('');

  const mxDevices = devices.filter(device => device.productType === 'appliance');

  // Country code to name mapping function
  const getCountryInfo = (code: string) => {
    const countryMap: Record<string, string> = {
      'AF': 'Afghanistan',
      'AL': 'Albania',
      'DZ': 'Algeria',
      'AS': 'American Samoa',
      'AD': 'Andorra',
      'AO': 'Angola',
      'AI': 'Anguilla',
      'AQ': 'Antarctica',
      'AG': 'Antigua and Barbuda',
      'AR': 'Argentina',
      'AM': 'Armenia',
      'AW': 'Aruba',
      'AU': 'Australia',
      'AT': 'Austria',
      'AZ': 'Azerbaijan',
      'BS': 'Bahamas',
      'BH': 'Bahrain',
      'BD': 'Bangladesh',
      'BB': 'Barbados',
      'BY': 'Belarus',
      'BE': 'Belgium',
      'BZ': 'Belize',
      'BJ': 'Benin',
      'BM': 'Bermuda',
      'BT': 'Bhutan',
      'BO': 'Bolivia',
      'BA': 'Bosnia and Herzegovina',
      'BW': 'Botswana',
      'BR': 'Brazil',
      'BN': 'Brunei',
      'BG': 'Bulgaria',
      'BF': 'Burkina Faso',
      'BI': 'Burundi',
      'KH': 'Cambodia',
      'CM': 'Cameroon',
      'CA': 'Canada',
      'CV': 'Cape Verde',
      'CL': 'Chile',
      'CN': 'China',
      'CO': 'Colombia',
      'CU': 'Cuba',
      'CY': 'Cyprus',
      'CZ': 'Czech Republic',
      'DK': 'Denmark',
      'DJ': 'Djibouti',
      'DM': 'Dominica',
      'DO': 'Dominican Republic',
      'EC': 'Ecuador',
      'EG': 'Egypt',
      'SV': 'El Salvador',
      'GQ': 'Equatorial Guinea',
      'ER': 'Eritrea',
      'EE': 'Estonia',
      'ET': 'Ethiopia',
      'FJ': 'Fiji',
      'FI': 'Finland',
      'FR': 'France',
      'GA': 'Gabon',
      'GM': 'Gambia',
      'DE': 'Germany',
      'GH': 'Ghana',
      'GR': 'Greece',
      'GT': 'Guatemala',
      'GN': 'Guinea',
      'GY': 'Guyana',
      'HT': 'Haiti',
      'IN': 'India',
      'ID': 'Indonesia',
      'IR': 'Iran',
      'IQ': 'Iraq',
      'IE': 'Ireland',
      'IL': 'Israel',
      'IT': 'Italy',
      'JP': 'Japan',
      'JO': 'Jordan',
      'KZ': 'Kazakhstan',
      'KE': 'Kenya',
      'KP': 'North Korea',
      'KR': 'South Korea',
      'KW': 'Kuwait',
      'LV': 'Latvia',
      'LB': 'Lebanon',
      'LY': 'Libya',
      'LT': 'Lithuania',
      'MY': 'Malaysia',
      'MX': 'Mexico',
      'MM': 'Myanmar',
      'NL': 'Netherlands',
      'NZ': 'New Zealand',
      'NG': 'Nigeria',
      'NO': 'Norway',
      'PK': 'Pakistan',
      'PL': 'Poland',
      'PT': 'Portugal',
      'RO': 'Romania',
      'RU': 'Russia',
      'SA': 'Saudi Arabia',
      'ZA': 'South Africa',
      'ES': 'Spain',
      'SE': 'Sweden',
      'CH': 'Switzerland',
      'SY': 'Syria',
      'TH': 'Thailand',
      'TR': 'Turkey',
      'UA': 'Ukraine',
      'AE': 'United Arab Emirates',
      'GB': 'United Kingdom',
      'US': 'United States',
      'VE': 'Venezuela',
      'VN': 'Vietnam',
      'YE': 'Yemen',
      'ZM': 'Zambia',
      'ZW': 'Zimbabwe'
    };
    return {
      name: countryMap[code] || code,
      flagUrl: `/flags/1x1/${code.toLowerCase()}.svg`
    };
  };

  // Filtered data based on search
  const filteredLayer7Rules = useMemo(() => {
    const nonCountryRules = layer7FirewallRules.filter(rule => rule.type !== 'blockedCountries');
    if (!layer7Search) return nonCountryRules;
    
    return nonCountryRules.filter(rule => {
      const searchLower = layer7Search.toLowerCase();
      const policy = rule.policy.toLowerCase();
      const type = rule.type.toLowerCase();
      const value = (() => {
        if (rule.type === 'application' && rule.valueObj?.name) {
          return rule.valueObj.name.toLowerCase();
        }
        if (rule.type === 'applicationCategory') {
          const val = rule.value as any;
          return (typeof val === 'object' && val && val.name ? String(val.name) : String(val || '')).toLowerCase();
        }
        return String(rule.value || '').toLowerCase();
      })();
      
      return policy.includes(searchLower) || 
             type.includes(searchLower) || 
             value.includes(searchLower);
    });
  }, [layer7FirewallRules, layer7Search]);

  const filteredCountryRules = useMemo(() => {
    const countryRules = layer7FirewallRules.filter(rule => 
      rule.type === 'blockedCountries' && rule.policy === 'deny'
    );
    
    if (!countriesSearch) return countryRules;
    
    return countryRules.filter(rule => {
      const countries = Array.isArray(rule.value) ? rule.value : [];
      const searchLower = countriesSearch.toLowerCase();
      
      return countries.some(countryCode => {
        const countryInfo = getCountryInfo(countryCode);
        return countryCode.toLowerCase().includes(searchLower) ||
               countryInfo.name.toLowerCase().includes(searchLower);
      });
    });
  }, [layer7FirewallRules, countriesSearch]);

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

        {/* Cache Controls */}
        <div className="flex items-center justify-between py-1">
          <div className="flex items-center gap-2">
            <Badge variant="secondary">
              Last Updated: {new Date().toLocaleTimeString()}
            </Badge>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={async () => {
                try {
                  const response = await fetch('/api/firewall/cache-management', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ action: 'clear-network', networkId }),
                  });
                  
                  if (response.ok) {
                    alert('Network cache cleared successfully');
                  }
                } catch (error) {
                  console.error('Error clearing cache:', error);
                  alert('Failed to clear cache');
                }
              }}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Clear Network Cache
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={async () => {
                try {
                  const response = await fetch('/api/firewall/cache-management', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ action: 'clear-expired' }),
                  });
                  
                  if (response.ok) {
                    alert('Expired cache entries cleared');
                  }
                } catch (error) {
                  console.error('Error clearing expired cache:', error);
                  alert('Failed to clear expired cache');
                }
              }}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Clear Expired
            </Button>
          </div>
        </div>

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
            <div className="grid gap-6 lg:grid-cols-3">
              {/* Main Layer 7 Rules Table */}
              <div className="lg:col-span-2">
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
                    {/* Search bar */}
                    <div className="mb-4">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                        <Input
                          placeholder="Search rules by policy, type, or value..."
                          value={layer7Search}
                          onChange={(e) => setLayer7Search(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                    </div>
                    {filteredLayer7Rules.length === 0 ? (
                      <div className="text-center py-8">
                        <Lock className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                        <p className="text-muted-foreground mb-4">
                          {layer7Search ? 'No rules match your search' : 'No Layer 7 firewall rules configured'}
                        </p>
                        {!layer7Search && (
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
                        )}
                      </div>
                    ) : (
                      <div className="max-h-96 overflow-y-auto custom-scrollbar">
                        <table className="w-full">
                          <thead className="sticky top-0 bg-background border-b">
                            <tr className="text-left">
                              <th className="p-3 font-medium text-sm">Policy</th>
                              <th className="p-3 font-medium text-sm">Type</th>
                              <th className="p-3 font-medium text-sm">Target</th>
                              <th className="p-3 font-medium text-sm">Value</th>
                              <th className="p-3 font-medium text-sm">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredLayer7Rules.map((rule, index) => {
                                const originalIndex = layer7FirewallRules.findIndex(r => r === rule);
                                return (
                              <tr key={index} className="border-b hover:bg-muted/50">
                                <td className="p-3">
                                  <Badge 
                                    variant={rule.policy === 'deny' ? 'destructive' : 'default'}
                                    className="text-xs"
                                  >
                                    {rule.policy === 'deny' ? 'Deny' : 'Allow'}
                                  </Badge>
                                </td>
                                <td className="p-3 text-sm">
                                  {rule.type.replace(/([A-Z])/g, ' $1').trim()}
                                </td>
                                <td className="p-3 text-sm font-medium">
                                  {rule.type === 'application' && rule.valueObj?.name ? rule.valueObj.name :
                                   rule.type === 'applicationCategory' ? (() => {
                                     const value = rule.value as any;
                                     return typeof value === 'object' && value && value.name ? String(value.name) : String(value || 'Unknown');
                                   })() :
                                   rule.type === 'host' ? String(rule.value || 'Unknown') :
                                   rule.type === 'port' ? `Port ${String(rule.value || 'Unknown')}` :
                                   rule.type === 'ipRange' ? String(rule.value || 'Unknown') :
                                   'Layer 7 Rule'}
                                </td>
                                <td className="p-3 text-sm text-muted-foreground">
                                  {rule.type === 'application' && rule.valueObj ? 
                                    `ID: ${rule.valueObj.id || 'N/A'}` :
                                    (() => {
                                      const value = rule.value as any;
                                      return typeof value === 'object' && value && value.name ? String(value.name) : String(value || 'N/A');
                                    })()}
                                </td>
                                <td className="p-3">
                                  <div className="flex gap-1">
                                    <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => {
                                      console.log('Edit Layer 7 rule:', rule);
                                    }}>
                                      <Edit className="w-3 h-3 mr-1" />
                                      Edit
                                    </Button>
                                    <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => {
                                      const newRules = layer7FirewallRules.filter((_, i) => i !== originalIndex);
                                      setLayer7FirewallRules(newRules);
                                    }}>
                                      <Trash2 className="w-3 h-3 mr-1" />
                                      Delete
                                    </Button>
                                  </div>
                                </td>
                              </tr>
                                );
                              })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Blocked Countries Section (no card wrapper) */}
              <div className="lg:col-span-1">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold flex items-center gap-2">
                        <Globe className="w-4 h-4" />
                        Blocked Countries
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Geo-blocking via IP ranges
                      </p>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => {
                      // Add a sample blocked country rule
                      const newRule: Layer7FirewallRule = {
                        policy: 'deny',
                        type: 'blockedCountries',
                        value: ['CN', 'RU', 'KP'] // Sample blocked countries
                      };
                      setLayer7FirewallRules([...layer7FirewallRules, newRule]);
                    }}>
                      <Plus className="w-3 h-3" />
                    </Button>
                  </div>
                  
                  {/* Search bar for countries */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                    <Input
                      placeholder="Search countries..."
                      value={countriesSearch}
                      onChange={(e) => setCountriesSearch(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  
                  {/* Countries content with matching height */}
                  <div className="max-h-96 overflow-y-auto custom-scrollbar border rounded-lg bg-card">
                    {(() => {
                      if (filteredCountryRules.length === 0) {
                        return (
                          <div className="text-center py-8 px-4">
                            <Globe className="w-8 h-8 mx-auto text-muted-foreground mb-3" />
                            <p className="text-sm text-muted-foreground mb-3">
                              {countriesSearch ? 'No countries match your search' : 'No countries blocked'}
                            </p>
                            {!countriesSearch && (
                              <Button size="sm" variant="outline" onClick={() => {
                                const newRule: Layer7FirewallRule = {
                                  policy: 'deny',
                                  type: 'blockedCountries',
                                  value: ['CN', 'RU', 'KP']
                                };
                                setLayer7FirewallRules([...layer7FirewallRules, newRule]);
                              }}>
                                <Plus className="w-3 h-3 mr-1" />
                                Block Country
                              </Button>
                            )}
                          </div>
                        );
                      }

                      return (
                        <div className="space-y-3 p-4">
                          {filteredCountryRules.map((rule, ruleIndex) => {
                            const globalIndex = layer7FirewallRules.findIndex(r => r === rule);
                            const countries = Array.isArray(rule.value) ? rule.value : [];
                            
                            // Filter countries based on search
                            const filteredCountries = countriesSearch 
                              ? countries.filter(countryCode => {
                                  const countryInfo = getCountryInfo(countryCode);
                                  const searchLower = countriesSearch.toLowerCase();
                                  return countryCode.toLowerCase().includes(searchLower) ||
                                         countryInfo.name.toLowerCase().includes(searchLower);
                                })
                              : countries;
                            
                            if (filteredCountries.length === 0) return null;
                            
                            return (
                              <div key={ruleIndex} className="border rounded-lg bg-red-50 dark:bg-red-950/20">
                                {/* Header */}
                                <div className="flex items-center justify-between p-3 border-b bg-red-100 dark:bg-red-900/30 rounded-t-lg">
                                  <div className="flex items-center space-x-3">
                                    <div className="w-6 h-4 bg-red-500 rounded-sm flex items-center justify-center">
                                      <span className="text-white text-xs font-bold">🚫</span>
                                    </div>
                                    <div>
                                      <p className="font-medium text-sm">{filteredCountries.length} Countries Blocked</p>
                                      <p className="text-xs text-muted-foreground">Country Code Block</p>
                                    </div>
                                  </div>
                                  <Button 
                                    size="sm" 
                                    variant="outline"
                                    className="h-7 px-2"
                                    onClick={() => {
                                      const newRules = layer7FirewallRules.filter((_, i) => i !== globalIndex);
                                      setLayer7FirewallRules(newRules);
                                    }}
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </Button>
                                </div>
                                
                                {/* Country List */}
                                <div className="max-h-48 overflow-y-auto custom-scrollbar">
                                  {filteredCountries.map((countryCode, countryIndex) => {
                                    const countryInfo = getCountryInfo(countryCode);
                                    return (
                                      <div key={countryIndex} className="flex items-center justify-between p-2 border-b last:border-b-0 hover:bg-red-100 dark:hover:bg-red-900/20">
                                        <div className="flex items-center space-x-3">
                                          <img 
                                            src={countryInfo.flagUrl} 
                                            alt={`${countryInfo.name} flag`}
                                            className="w-5 h-4 object-cover rounded-sm"
                                            onError={(e) => {
                                              // Fallback to a generic flag icon if image fails to load
                                              e.currentTarget.src = '/flags/1x1/xx.svg';
                                            }}
                                          />
                                          <div>
                                            <div className="flex items-center space-x-2">
                                              <Badge variant="secondary" className="text-xs font-mono">
                                                {countryCode}
                                              </Badge>
                                              <span className="text-sm font-medium">{countryInfo.name}</span>
                                            </div>
                                          </div>
                                        </div>
                                        <Button 
                                          size="sm" 
                                          variant="ghost"
                                          className="h-6 w-6 p-0 hover:bg-red-200 dark:hover:bg-red-800"
                                          onClick={() => {
                                            // Remove this specific country from the rule
                                            const updatedCountries = countries.filter(c => c !== countryCode);
                                            if (updatedCountries.length === 0) {
                                              // If no countries left, remove the entire rule
                                              const newRules = layer7FirewallRules.filter((_, i) => i !== globalIndex);
                                              setLayer7FirewallRules(newRules);
                                            } else {
                                              // Update the rule with remaining countries
                                              const newRules = [...layer7FirewallRules];
                                              newRules[globalIndex] = {
                                                ...rule,
                                                value: updatedCountries
                                              };
                                              setLayer7FirewallRules(newRules);
                                            }
                                          }}
                                        >
                                          <Trash2 className="w-3 h-3" />
                                        </Button>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="rules" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Layer 3 Firewall Rules</CardTitle>
                <CardDescription>
                  Network access control based on IP addresses, ports, and protocols
                </CardDescription>
              </CardHeader>
              <CardContent>
                <FirewallRuleTable 
                  rules={rules} 
                  setRules={setRules}
                  mxDevices={mxDevices}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="content-filtering" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Blocked URL Patterns</CardTitle>
                  <CardDescription>
                    Block specific websites and domains
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    {contentFilter.blockedUrlPatterns.map((pattern, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center space-x-3">
                          <Shield className="w-4 h-4 text-red-500" />
                          <span className="font-mono text-sm">{pattern}</span>
                        </div>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => {
                            const newPatterns = contentFilter.blockedUrlPatterns.filter((_, i) => i !== index);
                            setContentFilter({
                              ...contentFilter,
                              blockedUrlPatterns: newPatterns
                            });
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                    
                    {contentFilter.blockedUrlPatterns.length === 0 && (
                      <div className="text-center py-4 text-muted-foreground">
                        No patterns blocked
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Enter URL pattern..."
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
                            blockedUrlPatterns: [...contentFilter.blockedUrlPatterns, newBlockedSite.trim()]
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

              <Card>
                <CardHeader>
                  <CardTitle>Allowed URL Patterns</CardTitle>
                  <CardDescription>
                    Explicitly allow specific websites and domains
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    {contentFilter.allowedUrlPatterns.map((pattern, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center space-x-3">
                          <Shield className="w-4 h-4 text-green-500" />
                          <span className="font-mono text-sm">{pattern}</span>
                        </div>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => {
                            const newPatterns = contentFilter.allowedUrlPatterns.filter((_, i) => i !== index);
                            setContentFilter({
                              ...contentFilter,
                              allowedUrlPatterns: newPatterns
                            });
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                    
                    {contentFilter.allowedUrlPatterns.length === 0 && (
                      <div className="text-center py-4 text-muted-foreground">
                        No patterns allowed
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Enter URL pattern to allow..."
                      className="flex-1 px-3 py-2 border rounded-md text-sm"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                          setContentFilter({
                            ...contentFilter,
                            allowedUrlPatterns: [...contentFilter.allowedUrlPatterns, e.currentTarget.value.trim()]
                          });
                          e.currentTarget.value = '';
                        }
                      }}
                    />
                    <Button 
                      size="sm"
                      onClick={(e) => {
                        const input = (e.target as HTMLElement).parentElement?.querySelector('input');
                        if (input?.value.trim()) {
                          setContentFilter({
                            ...contentFilter,
                            allowedUrlPatterns: [...contentFilter.allowedUrlPatterns, input.value.trim()]
                          });
                          input.value = '';
                        }
                      }}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Blocked URL Categories</CardTitle>
                  <CardDescription>
                    Block entire categories of websites
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    {contentFilter.blockedUrlCategories.map((category, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center space-x-3">
                          <Filter className="w-4 h-4 text-red-500" />
                          <span className="text-sm">{category}</span>
                        </div>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => {
                            const newCategories = contentFilter.blockedUrlCategories.filter((_, i) => i !== index);
                            setContentFilter({
                              ...contentFilter,
                              blockedUrlCategories: newCategories
                            });
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                    
                    {contentFilter.blockedUrlCategories.length === 0 && (
                      <div className="text-center py-4 text-muted-foreground">
                        No categories blocked
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Enter category name..."
                      className="flex-1 px-3 py-2 border rounded-md text-sm"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                          setContentFilter({
                            ...contentFilter,
                            blockedUrlCategories: [...contentFilter.blockedUrlCategories, e.currentTarget.value.trim()]
                          });
                          e.currentTarget.value = '';
                        }
                      }}
                    />
                    <Button 
                      size="sm"
                      onClick={(e) => {
                        const input = (e.target as HTMLElement).parentElement?.querySelector('input');
                        if (input?.value.trim()) {
                          setContentFilter({
                            ...contentFilter,
                            blockedUrlCategories: [...contentFilter.blockedUrlCategories, input.value.trim()]
                          });
                          input.value = '';
                        }
                      }}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>URL Category List Size</CardTitle>
                  <CardDescription>
                    Configure the scope of URL category filtering
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {['topSites', 'fullList'].map((option) => (
                      <div key={option} className="flex items-center space-x-3">
                        <input
                          type="radio"
                          id={option}
                          name="urlCategoryListSize"
                          value={option}
                          checked={contentFilter.urlCategoryListSize === option}
                          onChange={(e) => {
                            setContentFilter({
                              ...contentFilter,
                              urlCategoryListSize: e.target.value as 'topSites' | 'fullList'
                            });
                          }}
                          className="w-4 h-4"
                        />
                        <label htmlFor={option} className="text-sm">
                          {option === 'topSites' ? 'Top Sites Only' : 'Full Category List'}
                        </label>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="flex justify-end">
              <Button 
                onClick={async () => {
                  try {
                    const response = await fetch(`/api/firewall/content-filtering/${networkId}`, {
                      method: 'PUT',
                      headers: {
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify(contentFilter),
                    });
                    
                    if (response.ok) {
                      alert('Content filtering rules updated successfully!');
                    } else {
                      throw new Error('Failed to update content filtering rules');
                    }
                  } catch (error) {
                    console.error('Error updating content filtering rules:', error);
                    alert('Failed to update content filtering rules. Please try again.');
                  }
                }}
              >
                Save Content Filtering Rules
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="vpn" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>VPN Configuration</CardTitle>
                <CardDescription>
                  Configure site-to-site VPN connections and client VPN settings
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <Wifi className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">VPN configuration coming soon</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="monitoring" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Security Monitoring</CardTitle>
                <CardDescription>
                  Real-time security events and intrusion detection alerts
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <Activity className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Security monitoring dashboard coming soon</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const { networkId } = context.params!;
  
  try {
    const [devices, firewallRules, layer7Rules, contentFiltering] = await Promise.all([
      getNetworkDevices(networkId as string),
      getFirewallRules(networkId as string),
      getLayer7FirewallRules(networkId as string),
      getContentFilteringRules(networkId as string)
    ]);

    // Mock network data for now
    const network = {
      id: networkId as string,
      name: `Network ${networkId}`,
      organizationId: 'org-123'
    };

    return {
      props: {
        network,
        devices: devices || [],
        firewallRules: firewallRules || [],
        layer7Rules: layer7Rules || [],
        contentFiltering: contentFiltering || {
          allowedUrlPatterns: [],
          blockedUrlPatterns: [],
          blockedUrlCategories: [],
          urlCategoryListSize: 'topSites'
        }
      }
    };
  } catch (error) {
    console.error('Error loading firewall page data:', error);
    
    // Fallback data
    const network = {
      id: networkId as string,
      name: `Network ${networkId}`,
      organizationId: 'org-123'
    };

    return {
      props: {
        network,
        devices: [],
        firewallRules: [],
        layer7Rules: [],
        contentFiltering: {
          allowedUrlPatterns: [],
          blockedUrlPatterns: [],
          blockedUrlCategories: [],
          urlCategoryListSize: 'topSites' as const
        }
      }
    };
  }
};
