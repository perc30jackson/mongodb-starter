import { NextApiRequest, NextApiResponse } from 'next';
import { backgroundTaskManager } from '../../../lib/background-tasks';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    // Get task status
    try {
      const status = backgroundTaskManager.getTaskStatus();
      res.status(200).json(status);
    } catch (error) {
      res.status(500).json({ 
        error: 'Failed to get task status',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  } else if (req.method === 'POST') {
    // Run a specific task manually
    try {
      const { action, taskName } = req.body;
      
      if (action === 'start') {
        backgroundTaskManager.start();
        res.status(200).json({ message: 'Background tasks started' });
      } else if (action === 'stop') {
        backgroundTaskManager.shutdown();
        res.status(200).json({ message: 'Background tasks stopped' });
      } else if (action === 'run' && taskName) {
        const result = await backgroundTaskManager.runTaskNow(taskName);
        res.status(200).json({ 
          message: `Task ${taskName} executed`,
          result 
        });
      } else {
        res.status(400).json({ error: 'Invalid action or missing taskName' });
      }
    } catch (error) {
      res.status(500).json({ 
        error: 'Failed to execute action',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
