import { NextApiRequest, NextApiResponse } from 'next';
import {
  createDevicePingTest,
  getDevicePingTest,
  createDeviceArpTableRequest,
  getDeviceArpTable,
  createDeviceCableTest,
  getDeviceCableTest
} from '@/lib/api/network';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { serial, tool } = req.query;

  if (typeof serial !== 'string') {
    return res.status(400).json({ error: 'Device serial is required' });
  }

  if (typeof tool !== 'string') {
    return res.status(400).json({ error: 'Tool type is required' });
  }

  try {
    switch (req.method) {
      case 'GET':
        await handleGet(req, res, serial, tool);
        break;
      case 'POST':
        await handlePost(req, res, serial, tool);
        break;
      default:
        res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Device live tools API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function handleGet(req: NextApiRequest, res: NextApiResponse, serial: string, tool: string) {
  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Test/Request ID is required' });
  }

  switch (tool) {
    case 'ping':
      const pingResult = await getDevicePingTest(serial, id);
      res.status(200).json(pingResult);
      break;

    case 'arpTable':
      const arpTable = await getDeviceArpTable(serial, id);
      res.status(200).json(arpTable);
      break;

    case 'cableTest':
      const cableTestResult = await getDeviceCableTest(serial, id);
      res.status(200).json(cableTestResult);
      break;

    default:
      res.status(400).json({ error: 'Invalid tool type' });
  }
}

async function handlePost(req: NextApiRequest, res: NextApiResponse, serial: string, tool: string) {
  switch (tool) {
    case 'ping':
      const { target, count } = req.body;
      if (!target) {
        return res.status(400).json({ error: 'Ping target is required' });
      }
      const pingTest = await createDevicePingTest(serial, target, count);
      res.status(201).json(pingTest);
      break;

    case 'arpTable':
      const arpRequest = await createDeviceArpTableRequest(serial);
      res.status(201).json(arpRequest);
      break;

    case 'cableTest':
      const { ports } = req.body;
      if (!ports || !Array.isArray(ports)) {
        return res.status(400).json({ error: 'Ports array is required' });
      }
      const cableTest = await createDeviceCableTest(serial, ports);
      res.status(201).json(cableTest);
      break;

    default:
      res.status(400).json({ error: 'Invalid tool type' });
  }
}
