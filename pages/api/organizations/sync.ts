import type { NextApiRequest, NextApiResponse } from 'next';
import MerakiAPI from '@/lib/meraki';
import { cache, cacheKeys, cacheTTL } from '@/lib/cache';

// Rate limiting: Delay between API calls (in milliseconds)
const API_DELAY = 2000; // 2 seconds between calls
const MAX_CONCURRENT_REQUESTS = 2; // Maximum concurrent requests

// Helper function to delay execution
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

interface SyncProgress {
  stage: string;
  completed: number;
  total: number;
  currentItem?: string;
  isComplete: boolean;
  error?: string;
}

// Store sync progress in memory (in production, use Redis or database)
const syncProgress = new Map<string, SyncProgress>();

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'POST') {
    return startSync(req, res);
  } else if (req.method === 'GET') {
    return getSyncProgress(req, res);
  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
}

async function startSync(req: NextApiRequest, res: NextApiResponse) {
  const { syncId = 'default' } = req.body;
  
  try {
    const apiKey = process.env.MERAKI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'Meraki API key not configured' });
    }

    // Check if sync is already in progress
    if (syncProgress.has(syncId)) {
      const progress = syncProgress.get(syncId)!;
      if (!progress.isComplete) {
        return res.status(409).json({ 
          error: 'Sync already in progress',
          progress 
        });
      }
    }

    // Initialize sync progress
    syncProgress.set(syncId, {
      stage: 'Starting sync...',
      completed: 0,
      total: 100,
      isComplete: false
    });

    // Start the sync process asynchronously
    performSlowSync(apiKey, syncId).catch(error => {
      console.error('Sync error:', error);
      syncProgress.set(syncId, {
        stage: 'Error occurred',
        completed: 0,
        total: 100,
        isComplete: true,
        error: error.message
      });
    });

    res.status(200).json({ 
      message: 'Sync started',
      syncId,
      progress: syncProgress.get(syncId)
    });

  } catch (error) {
    console.error('Error starting sync:', error);
    res.status(500).json({ 
      error: 'Failed to start sync',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

async function getSyncProgress(req: NextApiRequest, res: NextApiResponse) {
  const { syncId = 'default' } = req.query;
  
  const progress = syncProgress.get(syncId as string);
  if (!progress) {
    return res.status(404).json({ error: 'Sync not found' });
  }

  res.status(200).json({ progress });
}

async function performSlowSync(apiKey: string, syncId: string) {
  const meraki = new MerakiAPI(apiKey);
  
  try {
    // Stage 1: Fetch organizations
    syncProgress.set(syncId, {
      stage: 'Fetching organizations...',
      completed: 0,
      total: 100,
      isComplete: false
    });

    await delay(API_DELAY);
    const organizations = await meraki.getOrganizations();
    
    if (!organizations || organizations.length === 0) {
      throw new Error('No organizations found');
    }

    // Cache organizations
    await cache.set(cacheKeys.organizations(), organizations, {
      type: 'organizations',
      ttl: cacheTTL.organizations
    });

    syncProgress.set(syncId, {
      stage: 'Processing organizations...',
      completed: 20,
      total: 100,
      currentItem: `${organizations.length} organizations found`,
      isComplete: false
    });

    // Stage 2: Process each organization with rate limiting
    const totalOrgs = organizations.length;
    let processedOrgs = 0;

    // Process organizations in batches
    for (let i = 0; i < organizations.length; i += MAX_CONCURRENT_REQUESTS) {
      const batch = organizations.slice(i, i + MAX_CONCURRENT_REQUESTS);
      
      // Process batch concurrently but with delay between batches
      await Promise.all(batch.map(async (org: any, batchIndex: number) => {
        const orgIndex = i + batchIndex;
        
        try {
          syncProgress.set(syncId, {
            stage: 'Syncing organization details...',
            completed: 20 + (orgIndex / totalOrgs) * 60,
            total: 100,
            currentItem: `${org.name} (${orgIndex + 1}/${totalOrgs})`,
            isComplete: false
          });

          // Add delay between requests within batch
          if (batchIndex > 0) {
            await delay(API_DELAY / 2);
          }

          // Fetch organization details (using existing method pattern)
          let orgDetails;
          try {
            const detailsResponse = await fetch(`https://api.meraki.com/api/v1/organizations/${org.id}`, {
              headers: { 'X-Cisco-Meraki-API-Key': apiKey }
            });
            orgDetails = await detailsResponse.json();
          } catch (error) {
            console.warn(`Failed to fetch details for org ${org.id}:`, error);
            orgDetails = org; // Use basic org data as fallback
          }
          
          // Cache organization details
          await cache.set(cacheKeys.organizationDetails(org.id), orgDetails, {
            type: 'organization-details',
            ttl: cacheTTL.organizationDetails
          });

          // Small delay before fetching inventory
          await delay(500);

          // Fetch inventory
          const inventory = await meraki.getOrganizationInventory(org.id);
          
          // Cache inventory
          await cache.set(cacheKeys.organizationInventory(org.id), inventory, {
            type: 'organization-inventory',
            ttl: cacheTTL.inventory
          });

        } catch (error) {
          console.warn(`Failed to sync organization ${org.name}:`, error);
          // Continue with other organizations
        }
      }));

      processedOrgs += batch.length;
      
      // Delay between batches
      if (i + MAX_CONCURRENT_REQUESTS < organizations.length) {
        await delay(API_DELAY);
      }
    }

    // Stage 3: Final cache optimization
    syncProgress.set(syncId, {
      stage: 'Optimizing cache...',
      completed: 90,
      total: 100,
      currentItem: 'Finalizing sync',
      isComplete: false
    });

    await delay(1000);

    // Mark as complete
    syncProgress.set(syncId, {
      stage: 'Sync completed',
      completed: 100,
      total: 100,
      currentItem: `Successfully synced ${organizations.length} organizations`,
      isComplete: true
    });

    console.log(`Slow sync completed for ${organizations.length} organizations`);

  } catch (error) {
    console.error('Sync failed:', error);
    throw error;
  }
}
