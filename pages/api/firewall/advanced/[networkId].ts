import { NextApiRequest, NextApiResponse } from 'next';
import {
  getFirewallRules,
  getFirewallL7Rules,
  updateFirewallL7Rules,
  getFirewallPortForwardingRules,
  updateFirewallPortForwardingRules,
  getFirewallOneToOneNatRules,
  updateFirewallOneToOneNatRules,
  getFirewallOneToManyNatRules,
  getContentFilteringRules,
  updateContentFilteringRules,
  getSecurityIntrusion,
  getSecurityMalware,
  getFirewalledServices,
  getFirewalledService,
  updateFirewalledService
} from '@/lib/api/network';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { networkId, type, service } = req.query;

  if (!networkId || typeof networkId !== 'string') {
    return res.status(400).json({ error: 'Network ID is required' });
  }

  try {
    switch (req.method) {
      case 'GET':
        return await handleGet(req, res, networkId, type as string, service as string);
      case 'PUT':
        return await handlePut(req, res, networkId, type as string, service as string);
      default:
        res.setHeader('Allow', ['GET', 'PUT']);
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Advanced firewall API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function handleGet(req: NextApiRequest, res: NextApiResponse, networkId: string, type: string, service?: string) {
  switch (type) {
    case 'l7-rules':
      const l7Rules = await getFirewallL7Rules(networkId);
      return res.status(200).json(l7Rules);

    case 'port-forwarding':
      const portForwardingRules = await getFirewallPortForwardingRules(networkId);
      return res.status(200).json(portForwardingRules);

    case 'one-to-one-nat':
      const oneToOneNat = await getFirewallOneToOneNatRules(networkId);
      return res.status(200).json(oneToOneNat);

    case 'one-to-many-nat':
      const oneToManyNat = await getFirewallOneToManyNatRules(networkId);
      return res.status(200).json(oneToManyNat);

    case 'content-filtering':
      const contentFiltering = await getContentFilteringRules(networkId);
      return res.status(200).json(contentFiltering);

    case 'security-intrusion':
      const securityIntrusion = await getSecurityIntrusion(networkId);
      return res.status(200).json(securityIntrusion);

    case 'security-malware':
      const securityMalware = await getSecurityMalware(networkId);
      return res.status(200).json(securityMalware);

    case 'firewalled-services':
      if (service) {
        const firewallService = await getFirewalledService(networkId, service);
        return res.status(200).json(firewallService);
      } else {
        const firewalledServices = await getFirewalledServices(networkId);
        return res.status(200).json(firewalledServices);
      }

    case 'overview':
      // Get a comprehensive overview of all firewall settings
      const [
        l3Rules,
        l7RulesData,
        portForwarding,
        oneToOne,
        oneToMany,
        contentFilter,
        intrusion,
        malware,
        services
      ] = await Promise.allSettled([
        getFirewallRules(networkId),
        getFirewallL7Rules(networkId),
        getFirewallPortForwardingRules(networkId),
        getFirewallOneToOneNatRules(networkId),
        getFirewallOneToManyNatRules(networkId),
        getContentFilteringRules(networkId),
        getSecurityIntrusion(networkId),
        getSecurityMalware(networkId),
        getFirewalledServices(networkId)
      ]);

      const overview = {
        l3Rules: l3Rules.status === 'fulfilled' ? l3Rules.value : null,
        l7Rules: l7RulesData.status === 'fulfilled' ? l7RulesData.value : null,
        portForwarding: portForwarding.status === 'fulfilled' ? portForwarding.value : null,
        oneToOneNat: oneToOne.status === 'fulfilled' ? oneToOne.value : null,
        oneToManyNat: oneToMany.status === 'fulfilled' ? oneToMany.value : null,
        contentFiltering: contentFilter.status === 'fulfilled' ? contentFilter.value : null,
        securityIntrusion: intrusion.status === 'fulfilled' ? intrusion.value : null,
        securityMalware: malware.status === 'fulfilled' ? malware.value : null,
        firewalledServices: services.status === 'fulfilled' ? services.value : null,
        timestamp: new Date().toISOString()
      };

      return res.status(200).json(overview);

    default:
      return res.status(400).json({ error: 'Invalid type parameter' });
  }
}

async function handlePut(req: NextApiRequest, res: NextApiResponse, networkId: string, type: string, service?: string) {
  const { rules, config } = req.body;

  switch (type) {
    case 'l7-rules':
      if (!rules) {
        return res.status(400).json({ error: 'Rules array is required' });
      }
      const updatedL7Rules = await updateFirewallL7Rules(networkId, rules);
      return res.status(200).json(updatedL7Rules);

    case 'port-forwarding':
      if (!rules) {
        return res.status(400).json({ error: 'Rules array is required' });
      }
      const updatedPortForwarding = await updateFirewallPortForwardingRules(networkId, rules);
      return res.status(200).json(updatedPortForwarding);

    case 'one-to-one-nat':
      if (!rules) {
        return res.status(400).json({ error: 'Rules array is required' });
      }
      const updatedOneToOne = await updateFirewallOneToOneNatRules(networkId, rules);
      return res.status(200).json(updatedOneToOne);

    case 'content-filtering':
      if (!config) {
        return res.status(400).json({ error: 'Configuration object is required' });
      }
      const updatedContentFiltering = await updateContentFilteringRules(networkId, config);
      return res.status(200).json(updatedContentFiltering);

    case 'firewalled-service':
      if (!service || !config) {
        return res.status(400).json({ error: 'Service name and configuration are required' });
      }
      const updatedService = await updateFirewalledService(networkId, service, config);
      return res.status(200).json(updatedService);

    default:
      return res.status(400).json({ error: 'Invalid type parameter for PUT operation' });
  }
}
