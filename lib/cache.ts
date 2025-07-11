import clientPromise from './mongodb';
import { ObjectId } from 'mongodb';

interface CacheEntry {
  _id?: ObjectId;
  key: string;
  data: any;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
  type: string; // 'organizations', 'organization-stats', 'devices', 'networks', etc.
}

interface CacheOptions {
  ttl?: number; // Time to live in seconds (default: 300 = 5 minutes)
  type: string;
}

class DataCache {
  private collection: any;
  
  constructor() {
    this.initCollection();
  }

  private async initCollection() {
    try {
      const client = await clientPromise;
      const db = client.db();
      this.collection = db.collection('cache');
      
      // Create index for automatic cleanup of expired entries
      await this.collection.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
      
      // Create index for efficient key lookups
      await this.collection.createIndex({ key: 1, type: 1 });
    } catch (error) {
      console.error('Failed to initialize cache collection:', error);
    }
  }

  async get<T>(key: string, type: string): Promise<T | null> {
    try {
      if (!this.collection) await this.initCollection();
      
      const entry = await this.collection.findOne({
        key,
        type,
        expiresAt: { $gt: new Date() }
      });

      if (entry) {
        console.log(`Cache HIT: ${type}:${key}`);
        return entry.data;
      }
      
      console.log(`Cache MISS: ${type}:${key}`);
      return null;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  async set(key: string, data: any, options: CacheOptions): Promise<void> {
    try {
      if (!this.collection) await this.initCollection();
      
      const ttl = options.ttl || 300; // Default 5 minutes
      const now = new Date();
      const expiresAt = new Date(now.getTime() + ttl * 1000);

      await this.collection.replaceOne(
        { key, type: options.type },
        {
          key,
          data,
          type: options.type,
          expiresAt,
          createdAt: now,
          updatedAt: now
        },
        { upsert: true }
      );

      console.log(`Cache SET: ${options.type}:${key} (TTL: ${ttl}s)`);
    } catch (error) {
      console.error('Cache set error:', error);
    }
  }

  async invalidate(key: string, type: string): Promise<void> {
    try {
      if (!this.collection) await this.initCollection();
      
      await this.collection.deleteOne({ key, type });
      console.log(`Cache INVALIDATED: ${type}:${key}`);
    } catch (error) {
      console.error('Cache invalidate error:', error);
    }
  }

  async invalidateByType(type: string): Promise<void> {
    try {
      if (!this.collection) await this.initCollection();
      
      const result = await this.collection.deleteMany({ type });
      console.log(`Cache INVALIDATED by type: ${type} (${result.deletedCount} entries)`);
    } catch (error) {
      console.error('Cache invalidate by type error:', error);
    }
  }

  async clear(): Promise<void> {
    try {
      if (!this.collection) await this.initCollection();
      
      const result = await this.collection.deleteMany({});
      console.log(`Cache CLEARED: ${result.deletedCount} entries removed`);
    } catch (error) {
      console.error('Cache clear error:', error);
    }
  }

  // Get cache statistics
  async getStats(): Promise<{
    totalEntries: number;
    entriesByType: Record<string, number>;
    oldestEntry?: Date;
    newestEntry?: Date;
  }> {
    try {
      if (!this.collection) await this.initCollection();
      
      const [totalCount, typeStats, timeStats] = await Promise.all([
        this.collection.countDocuments(),
        this.collection.aggregate([
          { $group: { _id: '$type', count: { $sum: 1 } } }
        ]).toArray(),
        this.collection.aggregate([
          {
            $group: {
              _id: null,
              oldest: { $min: '$createdAt' },
              newest: { $max: '$createdAt' }
            }
          }
        ]).toArray()
      ]);

      const entriesByType: Record<string, number> = {};
      typeStats.forEach((stat: any) => {
        entriesByType[stat._id] = stat.count;
      });

      return {
        totalEntries: totalCount,
        entriesByType,
        oldestEntry: timeStats[0]?.oldest,
        newestEntry: timeStats[0]?.newest
      };
    } catch (error) {
      console.error('Cache stats error:', error);
      return {
        totalEntries: 0,
        entriesByType: {}
      };
    }
  }
}

// Export singleton instance
export const cache = new DataCache();

// Cache key generators
export const cacheKeys = {
  organizations: () => 'all-organizations',
  organizationStats: (orgId: string) => `org-stats-${orgId}`,
  organizationDetails: (orgId: string) => `org-details-${orgId}`,
  organizationNetworks: (orgId: string) => `org-networks-${orgId}`,
  organizationInventory: (orgId: string) => `org-inventory-${orgId}`,
  networkDevices: (networkId: string) => `network-devices-${networkId}`,
  networkClients: (networkId: string) => `network-clients-${networkId}`,
  firewallRules: (networkId: string) => `firewall-rules-${networkId}`,
  wirelessConfig: (networkId: string) => `wireless-config-${networkId}`,
  userSession: (userId: string) => `user-session-${userId}`,
  appState: (userId: string, component: string) => `app-state-${userId}-${component}`
};

// Cache TTL constants (in seconds)
export const cacheTTL = {
  organizations: 300, // 5 minutes
  organizationStats: 180, // 3 minutes  
  organizationDetails: 1800, // 30 minutes (increased from 5 minutes to reduce API calls)
  inventory: 600, // 10 minutes
  devices: 120, // 2 minutes
  clients: 60, // 1 minute
  firewallRules: 300, // 5 minutes
  wirelessConfig: 300, // 5 minutes
  userSession: 1800, // 30 minutes
  appState: 3600 // 1 hour
};

// Network and Organization caching functions
export async function getNetworkCache(networkId: string) {
  return cache.get(`network:${networkId}`, 'network');
}

export async function setNetworkCache(networkId: string, data: any, ttl: number = 900) { // 15 minutes
  return cache.set(`network:${networkId}`, data, { ttl, type: 'network' });
}

export async function getOrganizationCache(organizationId: string) {
  return cache.get(`organization:${organizationId}`, 'organization');
}

export async function setOrganizationCache(organizationId: string, data: any, ttl: number = 1800) { // 30 minutes
  return cache.set(`organization:${organizationId}`, data, { ttl, type: 'organization' });
}

export async function getOrganizationNetworksCache(organizationId: string) {
  return cache.get(`org-networks:${organizationId}`, 'organization-networks');
}

export async function setOrganizationNetworksCache(organizationId: string, data: any, ttl: number = 600) { // 10 minutes
  return cache.set(`org-networks:${organizationId}`, data, { ttl, type: 'organization-networks' });
}

export async function getOrganizationDevicesCache(organizationId: string) {
  return cache.get(`org-devices:${organizationId}`, 'organization-devices');
}

export async function setOrganizationDevicesCache(organizationId: string, data: any, ttl: number = 300) { // 5 minutes
  return cache.set(`org-devices:${organizationId}`, data, { ttl, type: 'organization-devices' });
}

export async function invalidateOrganizationCache(organizationId: string) {
  await cache.invalidate(`organization:${organizationId}`, 'organization');
  await cache.invalidate(`org-networks:${organizationId}`, 'organization-networks');
  await cache.invalidate(`org-devices:${organizationId}`, 'organization-devices');
}

export async function invalidateNetworkCache(networkId: string) {
  await cache.invalidate(`network:${networkId}`, 'network');
  await cache.invalidate(`network-devices:${networkId}`, 'network-devices');
}
