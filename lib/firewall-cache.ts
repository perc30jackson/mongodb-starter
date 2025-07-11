import clientPromise from '@/lib/mongodb';
import { FirewallRule, Layer7FirewallRule, ContentFilteringRule } from '@/lib/api/network';

// Cache TTL in seconds
const CACHE_TTL = {
  FIREWALL_RULES: 300, // 5 minutes
  LAYER7_RULES: 300,   // 5 minutes
  CONTENT_FILTERING: 600, // 10 minutes
};

interface CachedFirewallData {
  networkId: string;
  data: FirewallRule[];
  lastUpdated: Date;
  ttl: number;
}

interface CachedLayer7Data {
  networkId: string;
  data: Layer7FirewallRule[];
  lastUpdated: Date;
  ttl: number;
}

interface CachedContentFilterData {
  networkId: string;
  data: ContentFilteringRule;
  lastUpdated: Date;
  ttl: number;
}

export class FirewallCache {
  private static async getCollection(collectionName: string) {
    const client = await clientPromise;
    const db = client.db('meraki-dashboard');
    return db.collection(collectionName);
  }

  // Firewall Rules Cache
  static async getFirewallRules(networkId: string): Promise<FirewallRule[] | null> {
    try {
      const collection = await this.getCollection('firewall_rules_cache');
      const cached = await collection.findOne({ networkId }) as CachedFirewallData | null;
      
      if (!cached) {
        console.log(`Cache MISS: firewall-rules:${networkId}`);
        return null;
      }

      const now = new Date();
      const ageInSeconds = (now.getTime() - cached.lastUpdated.getTime()) / 1000;
      
      if (ageInSeconds > cached.ttl) {
        console.log(`Cache EXPIRED: firewall-rules:${networkId} (age: ${ageInSeconds}s)`);
        await collection.deleteOne({ networkId });
        return null;
      }

      console.log(`Cache HIT: firewall-rules:${networkId}`);
      return cached.data;
    } catch (error) {
      console.error('Error getting firewall rules from cache:', error);
      return null;
    }
  }

  static async setFirewallRules(networkId: string, data: FirewallRule[]): Promise<void> {
    try {
      const collection = await this.getCollection('firewall_rules_cache');
      const cacheData: CachedFirewallData = {
        networkId,
        data,
        lastUpdated: new Date(),
        ttl: CACHE_TTL.FIREWALL_RULES
      };
      
      await collection.replaceOne(
        { networkId },
        cacheData,
        { upsert: true }
      );
      
      console.log(`Cache SET: firewall-rules:${networkId} (TTL: ${CACHE_TTL.FIREWALL_RULES}s)`);
    } catch (error) {
      console.error('Error setting firewall rules cache:', error);
    }
  }

  // Layer 7 Rules Cache
  static async getLayer7Rules(networkId: string): Promise<Layer7FirewallRule[] | null> {
    try {
      const collection = await this.getCollection('layer7_rules_cache');
      const cached = await collection.findOne({ networkId }) as CachedLayer7Data | null;
      
      if (!cached) {
        console.log(`Cache MISS: layer7-rules:${networkId}`);
        return null;
      }

      const now = new Date();
      const ageInSeconds = (now.getTime() - cached.lastUpdated.getTime()) / 1000;
      
      if (ageInSeconds > cached.ttl) {
        console.log(`Cache EXPIRED: layer7-rules:${networkId} (age: ${ageInSeconds}s)`);
        await collection.deleteOne({ networkId });
        return null;
      }

      console.log(`Cache HIT: layer7-rules:${networkId}`);
      return cached.data;
    } catch (error) {
      console.error('Error getting Layer 7 rules from cache:', error);
      return null;
    }
  }

  static async setLayer7Rules(networkId: string, data: Layer7FirewallRule[]): Promise<void> {
    try {
      const collection = await this.getCollection('layer7_rules_cache');
      const cacheData: CachedLayer7Data = {
        networkId,
        data,
        lastUpdated: new Date(),
        ttl: CACHE_TTL.LAYER7_RULES
      };
      
      await collection.replaceOne(
        { networkId },
        cacheData,
        { upsert: true }
      );
      
      console.log(`Cache SET: layer7-rules:${networkId} (TTL: ${CACHE_TTL.LAYER7_RULES}s)`);
    } catch (error) {
      console.error('Error setting Layer 7 rules cache:', error);
    }
  }

  // Content Filtering Cache
  static async getContentFiltering(networkId: string): Promise<ContentFilteringRule | null> {
    try {
      const collection = await this.getCollection('content_filtering_cache');
      const cached = await collection.findOne({ networkId }) as CachedContentFilterData | null;
      
      if (!cached) {
        console.log(`Cache MISS: content-filtering:${networkId}`);
        return null;
      }

      const now = new Date();
      const ageInSeconds = (now.getTime() - cached.lastUpdated.getTime()) / 1000;
      
      if (ageInSeconds > cached.ttl) {
        console.log(`Cache EXPIRED: content-filtering:${networkId} (age: ${ageInSeconds}s)`);
        await collection.deleteOne({ networkId });
        return null;
      }

      console.log(`Cache HIT: content-filtering:${networkId}`);
      return cached.data;
    } catch (error) {
      console.error('Error getting content filtering from cache:', error);
      return null;
    }
  }

  static async setContentFiltering(networkId: string, data: ContentFilteringRule): Promise<void> {
    try {
      const collection = await this.getCollection('content_filtering_cache');
      const cacheData: CachedContentFilterData = {
        networkId,
        data,
        lastUpdated: new Date(),
        ttl: CACHE_TTL.CONTENT_FILTERING
      };
      
      await collection.replaceOne(
        { networkId },
        cacheData,
        { upsert: true }
      );
      
      console.log(`Cache SET: content-filtering:${networkId} (TTL: ${CACHE_TTL.CONTENT_FILTERING}s)`);
    } catch (error) {
      console.error('Error setting content filtering cache:', error);
    }
  }

  // Clear cache for a specific network
  static async clearNetworkCache(networkId: string): Promise<void> {
    try {
      const firewallCollection = await this.getCollection('firewall_rules_cache');
      const layer7Collection = await this.getCollection('layer7_rules_cache');
      const contentCollection = await this.getCollection('content_filtering_cache');
      
      await Promise.all([
        firewallCollection.deleteOne({ networkId }),
        layer7Collection.deleteOne({ networkId }),
        contentCollection.deleteOne({ networkId })
      ]);
      
      console.log(`Cache CLEARED: all firewall data for network ${networkId}`);
    } catch (error) {
      console.error('Error clearing network cache:', error);
    }
  }

  // Clear all expired cache entries
  static async clearExpiredCache(): Promise<void> {
    try {
      const collections = [
        'firewall_rules_cache',
        'layer7_rules_cache', 
        'content_filtering_cache'
      ];

      for (const collectionName of collections) {
        const collection = await this.getCollection(collectionName);
        const now = new Date();
        
        // Find and delete expired entries
        const expiredEntries = await collection.find({}).toArray();
        const toDelete = expiredEntries.filter(entry => {
          const ageInSeconds = (now.getTime() - entry.lastUpdated.getTime()) / 1000;
          return ageInSeconds > entry.ttl;
        });

        if (toDelete.length > 0) {
          const idsToDelete = toDelete.map(entry => entry._id);
          await collection.deleteMany({ _id: { $in: idsToDelete } });
          console.log(`Cleared ${toDelete.length} expired entries from ${collectionName}`);
        }
      }
    } catch (error) {
      console.error('Error clearing expired cache:', error);
    }
  }
}
