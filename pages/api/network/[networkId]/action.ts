import type { NextApiRequest, NextApiResponse } from 'next';
import { 
  blinkDeviceLeds, 
  rebootDevice, 
  getDeviceStatus,
  syncDevicesFromMeraki 
} from '@/lib/api/network';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { networkId } = req.query;
    const { action, devices } = req.body;

    if (!networkId || typeof networkId !== 'string') {
      return res.status(400).json({ message: 'Network ID is required' });
    }

    if (!action || !Array.isArray(devices)) {
      return res.status(400).json({ message: 'Invalid request body' });
    }

    const results = [];

    for (const deviceSerial of devices) {
      try {
        let result;
        switch (action) {
          case 'blink':
            result = await blinkDeviceLeds(deviceSerial, 20);
            break;
          case 'reboot':
            result = await rebootDevice(deviceSerial);
            break;
          case 'status-check':
            result = await getDeviceStatus(networkId, deviceSerial);
            break;
          case 'sync':
            if (devices.length === 1) {
              await syncDevicesFromMeraki(networkId);
              result = { success: true, message: 'Devices synced' };
            } else {
              result = { success: false, message: 'Sync should be called for single device only' };
            }
            break;
          default:
            result = { success: false, message: 'Unknown action' };
        }
        results.push({ device: deviceSerial, result });
      } catch (error) {
        results.push({ 
          device: deviceSerial, 
          result: { 
            success: false, 
            error: error instanceof Error ? error.message : 'Unknown error' 
          } 
        });
      }
    }

    return res.status(200).json({ results });
  } catch (error) {
    console.error('Error performing device action:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
