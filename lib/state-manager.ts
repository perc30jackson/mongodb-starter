import clientPromise from './mongodb';
import { ObjectId } from 'mongodb';

interface UserState {
  _id?: ObjectId;
  userId: string;
  component: string; // 'organizations-table', 'device-table', etc.
  state: {
    filters?: Record<string, any>;
    sorting?: {
      column: string;
      direction: 'asc' | 'desc';
    };
    selectedItems?: string[];
    viewMode?: string;
    pageSize?: number;
    expandedRows?: string[];
    columnWidths?: Record<string, number>;
    hiddenColumns?: string[];
    searchQuery?: string;
  };
  lastUpdated: Date;
  expiresAt?: Date;
}

interface TablePreferences {
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  filters?: Record<string, any>;
  pageSize?: number;
  selectedColumns?: string[];
  searchQuery?: string;
}

class StateManager {
  private collection: any;
  
  constructor() {
    this.initCollection();
  }

  private async initCollection() {
    try {
      const client = await clientPromise;
      const db = client.db();
      this.collection = db.collection('userStates');
      
      // Create index for efficient lookups
      await this.collection.createIndex({ userId: 1, component: 1 });
      
      // Create index for automatic cleanup (optional expiration)
      await this.collection.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
    } catch (error) {
      console.error('Failed to initialize state collection:', error);
    }
  }

  async saveTableState(
    userId: string, 
    component: string, 
    preferences: TablePreferences
  ): Promise<void> {
    try {
      if (!this.collection) await this.initCollection();
      
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days

      await this.collection.replaceOne(
        { userId, component },
        {
          userId,
          component,
          state: preferences,
          lastUpdated: now,
          expiresAt
        },
        { upsert: true }
      );

      console.log(`Table state saved: ${component} for user ${userId}`);
    } catch (error) {
      console.error('Failed to save table state:', error);
    }
  }

  async getTableState(
    userId: string, 
    component: string
  ): Promise<TablePreferences | null> {
    try {
      if (!this.collection) await this.initCollection();
      
      const userState = await this.collection.findOne({
        userId,
        component,
        $or: [
          { expiresAt: { $exists: false } },
          { expiresAt: { $gt: new Date() } }
        ]
      });

      if (userState) {
        console.log(`Table state loaded: ${component} for user ${userId}`);
        return userState.state;
      }
      
      return null;
    } catch (error) {
      console.error('Failed to get table state:', error);
      return null;
    }
  }

  async saveAppState(
    userId: string,
    component: string,
    state: Record<string, any>
  ): Promise<void> {
    try {
      if (!this.collection) await this.initCollection();
      
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days

      await this.collection.replaceOne(
        { userId, component },
        {
          userId,
          component,
          state,
          lastUpdated: now,
          expiresAt
        },
        { upsert: true }
      );

      console.log(`App state saved: ${component} for user ${userId}`);
    } catch (error) {
      console.error('Failed to save app state:', error);
    }
  }

  async getAppState(
    userId: string,
    component: string
  ): Promise<Record<string, any> | null> {
    try {
      if (!this.collection) await this.initCollection();
      
      const userState = await this.collection.findOne({
        userId,
        component,
        $or: [
          { expiresAt: { $exists: false } },
          { expiresAt: { $gt: new Date() } }
        ]
      });

      if (userState) {
        console.log(`App state loaded: ${component} for user ${userId}`);
        return userState.state;
      }
      
      return null;
    } catch (error) {
      console.error('Failed to get app state:', error);
      return null;
    }
  }

  async clearUserStates(userId: string): Promise<void> {
    try {
      if (!this.collection) await this.initCollection();
      
      const result = await this.collection.deleteMany({ userId });
      console.log(`Cleared ${result.deletedCount} states for user ${userId}`);
    } catch (error) {
      console.error('Failed to clear user states:', error);
    }
  }

  async clearExpiredStates(): Promise<void> {
    try {
      if (!this.collection) await this.initCollection();
      
      const result = await this.collection.deleteMany({
        expiresAt: { $lt: new Date() }
      });
      console.log(`Cleared ${result.deletedCount} expired states`);
    } catch (error) {
      console.error('Failed to clear expired states:', error);
    }
  }

  async getUserStateStats(userId: string): Promise<{
    totalStates: number;
    statesByComponent: Record<string, Date>;
  }> {
    try {
      if (!this.collection) await this.initCollection();
      
      const states = await this.collection.find({ userId }).toArray();
      
      const statesByComponent: Record<string, Date> = {};
      states.forEach((state: UserState) => {
        statesByComponent[state.component] = state.lastUpdated;
      });

      return {
        totalStates: states.length,
        statesByComponent
      };
    } catch (error) {
      console.error('Failed to get user state stats:', error);
      return {
        totalStates: 0,
        statesByComponent: {}
      };
    }
  }
}

// Export singleton instance
export const stateManager = new StateManager();

// Helper function to generate user ID from session (implement based on your auth)
export function getUserId(req: any): string {
  // For now, use a simple approach - in production, get from session/JWT
  return req.headers['x-user-id'] || 'anonymous';
}

// Component identifiers for state management
export const stateComponents = {
  organizationsTable: 'organizations-table',
  deviceTable: 'device-table',
  clientTable: 'client-table', 
  firewallTable: 'firewall-table',
  networkDirectory: 'network-directory',
  organizationView: 'organization-view',
  dashboardLayout: 'dashboard-layout'
} as const;
