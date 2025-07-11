import { NextApiRequest, NextApiResponse } from 'next';
import {
  getPolicyObjects,
  createPolicyObject,
  updatePolicyObject,
  deletePolicyObject,
  getPolicyObjectGroups,
  createPolicyObjectGroup,
  updatePolicyObjectGroup,
  deletePolicyObjectGroup
} from '@/lib/api/network';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { organizationId, type, objectId } = req.query;

  if (!organizationId || typeof organizationId !== 'string') {
    return res.status(400).json({ error: 'Organization ID is required' });
  }

  try {
    switch (req.method) {
      case 'GET':
        return await handleGet(req, res, organizationId, type as string);
      case 'POST':
        return await handlePost(req, res, organizationId, type as string);
      case 'PUT':
        return await handlePut(req, res, organizationId, type as string, objectId as string);
      case 'DELETE':
        return await handleDelete(req, res, organizationId, type as string, objectId as string);
      default:
        res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Policy objects API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function handleGet(req: NextApiRequest, res: NextApiResponse, organizationId: string, type: string) {
  switch (type) {
    case 'objects':
      const objects = await getPolicyObjects(organizationId);
      return res.status(200).json(objects);

    case 'groups':
      const groups = await getPolicyObjectGroups(organizationId);
      return res.status(200).json(groups);

    case 'overview':
      const [objectsResult, groupsResult] = await Promise.allSettled([
        getPolicyObjects(organizationId),
        getPolicyObjectGroups(organizationId)
      ]);

      const overview = {
        objects: objectsResult.status === 'fulfilled' ? objectsResult.value : [],
        groups: groupsResult.status === 'fulfilled' ? groupsResult.value : [],
        timestamp: new Date().toISOString(),
        statistics: {
          totalObjects: objectsResult.status === 'fulfilled' ? objectsResult.value.length : 0,
          totalGroups: groupsResult.status === 'fulfilled' ? groupsResult.value.length : 0,
          objectsByCategory: {},
          groupsByCategory: {}
        }
      };

      // Calculate statistics
      if (objectsResult.status === 'fulfilled') {
        overview.statistics.objectsByCategory = objectsResult.value.reduce((acc: any, obj: any) => {
          acc[obj.category] = (acc[obj.category] || 0) + 1;
          return acc;
        }, {});
      }

      if (groupsResult.status === 'fulfilled') {
        overview.statistics.groupsByCategory = groupsResult.value.reduce((acc: any, group: any) => {
          acc[group.category] = (acc[group.category] || 0) + 1;
          return acc;
        }, {});
      }

      return res.status(200).json(overview);

    default:
      return res.status(400).json({ error: 'Invalid type parameter' });
  }
}

async function handlePost(req: NextApiRequest, res: NextApiResponse, organizationId: string, type: string) {
  const data = req.body;

  if (!data) {
    return res.status(400).json({ error: 'Request body is required' });
  }

  switch (type) {
    case 'objects':
      // Validate required fields for policy object
      if (!data.name || !data.category || !data.type) {
        return res.status(400).json({ 
          error: 'Name, category, and type are required for policy objects' 
        });
      }

      // Validate type-specific fields
      if (data.type === 'cidr' && !data.cidr) {
        return res.status(400).json({ error: 'CIDR is required for cidr type objects' });
      }
      if (data.type === 'fqdn' && !data.fqdn) {
        return res.status(400).json({ error: 'FQDN is required for fqdn type objects' });
      }
      if (data.type === 'ipAndMask' && (!data.ip || !data.mask)) {
        return res.status(400).json({ error: 'IP and mask are required for ipAndMask type objects' });
      }

      const newObject = await createPolicyObject(organizationId, data);
      return res.status(201).json(newObject);

    case 'groups':
      // Validate required fields for policy object group
      if (!data.name || !data.category || !Array.isArray(data.objectIds)) {
        return res.status(400).json({ 
          error: 'Name, category, and objectIds array are required for policy object groups' 
        });
      }

      const newGroup = await createPolicyObjectGroup(organizationId, data);
      return res.status(201).json(newGroup);

    default:
      return res.status(400).json({ error: 'Invalid type parameter' });
  }
}

async function handlePut(req: NextApiRequest, res: NextApiResponse, organizationId: string, type: string, objectId: string) {
  const data = req.body;

  if (!objectId) {
    return res.status(400).json({ error: 'Object ID is required for updates' });
  }

  if (!data) {
    return res.status(400).json({ error: 'Request body is required' });
  }

  switch (type) {
    case 'objects':
      const updatedObject = await updatePolicyObject(organizationId, objectId, data);
      return res.status(200).json(updatedObject);

    case 'groups':
      const updatedGroup = await updatePolicyObjectGroup(organizationId, objectId, data);
      return res.status(200).json(updatedGroup);

    default:
      return res.status(400).json({ error: 'Invalid type parameter' });
  }
}

async function handleDelete(req: NextApiRequest, res: NextApiResponse, organizationId: string, type: string, objectId: string) {
  if (!objectId) {
    return res.status(400).json({ error: 'Object ID is required for deletion' });
  }

  switch (type) {
    case 'objects':
      await deletePolicyObject(organizationId, objectId);
      return res.status(204).end();

    case 'groups':
      await deletePolicyObjectGroup(organizationId, objectId);
      return res.status(204).end();

    default:
      return res.status(400).json({ error: 'Invalid type parameter' });
  }
}
