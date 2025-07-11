import { cache, cacheKeys } from './cache';
import CircuitBreaker from './circuit-breaker';

const circuitBreaker = CircuitBreaker.getInstance();

let merakiClient: any = null;

async function getMerakiClient() {
  if (!merakiClient) {
    const { default: MerakiAPI } = await import('./meraki');
    const apiKey = process.env.MERAKI_API_KEY;
    if (!apiKey) {
      console.warn('MERAKI_API_KEY not set, skipping background tasks');
      return null;
    }
    merakiClient = new MerakiAPI(apiKey);
  }
  return merakiClient;
}

// Rate limiting helpers
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

interface TaskResult {
  success: boolean;
  error?: string;
  itemsProcessed?: number;
  duration?: number;
}

class BackgroundTaskManager {
  private isRunning = false;
  private tasks: Map<string, NodeJS.Timeout> = new Map();
  private taskHistory: Map<string, TaskResult[]> = new Map();

  constructor() {
    this.setupGracefulShutdown();
  }

  private setupGracefulShutdown() {
    process.on('SIGINT', () => this.shutdown());
    process.on('SIGTERM', () => this.shutdown());
  }

  start() {
    if (this.isRunning) return;
    
    console.log('🚀 Starting background task manager...');
    this.isRunning = true;

    // Schedule tasks with different intervals
    this.scheduleTask('sync-organizations', this.syncOrganizations.bind(this), 5 * 60 * 1000); // 5 minutes
    this.scheduleTask('sync-networks', this.syncNetworks.bind(this), 10 * 60 * 1000); // 10 minutes
    this.scheduleTask('sync-devices', this.syncDevices.bind(this), 15 * 60 * 1000); // 15 minutes
    this.scheduleTask('cache-cleanup', this.cleanupExpiredCache.bind(this), 30 * 60 * 1000); // 30 minutes
    this.scheduleTask('warm-cache', this.warmCache.bind(this), 60 * 60 * 1000); // 1 hour

    console.log('✅ Background tasks scheduled');
  }

  private scheduleTask(name: string, task: () => Promise<TaskResult>, interval: number) {
    // Run immediately
    this.runTask(name, task);
    
    // Schedule recurring
    const timer = setInterval(async () => {
      await this.runTask(name, task);
    }, interval);
    
    this.tasks.set(name, timer);
  }

  private async runTask(name: string, task: () => Promise<TaskResult>) {
    if (!circuitBreaker.canExecute('meraki-api')) {
      console.log(`⚠️ Skipping task ${name} - circuit breaker is open`);
      return;
    }

    const startTime = Date.now();
    console.log(`⏳ Running background task: ${name}`);
    
    try {
      const result = await task();
      const duration = Date.now() - startTime;
      
      result.duration = duration;
      this.recordTaskResult(name, result);
      
      if (result.success) {
        console.log(`✅ Task ${name} completed in ${duration}ms - ${result.itemsProcessed || 0} items processed`);
      } else {
        console.error(`❌ Task ${name} failed: ${result.error}`);
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      const result: TaskResult = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration
      };
      
      this.recordTaskResult(name, result);
      console.error(`❌ Task ${name} failed with exception:`, error);
    }
  }

  private recordTaskResult(name: string, result: TaskResult) {
    if (!this.taskHistory.has(name)) {
      this.taskHistory.set(name, []);
    }
    
    const history = this.taskHistory.get(name)!;
    history.push({
      ...result,
      timestamp: new Date().toISOString()
    } as any);
    
    // Keep only last 50 results
    if (history.length > 50) {
      history.splice(0, history.length - 50);
    }
  }

  // Background task implementations
  private async syncOrganizations(): Promise<TaskResult> {
    try {
      const meraki = await getMerakiClient();
      if (!meraki) return { success: false, error: 'No Meraki client available' };

      console.log('🔄 Syncing organizations...');
      const organizations = await meraki.getOrganizations();
      
      if (Array.isArray(organizations)) {
        await cache.set(cacheKeys.organizations(), organizations, { ttl: 300, type: 'organizations' });
        return { success: true, itemsProcessed: organizations.length };
      }
      
      return { success: false, error: 'Invalid organizations data' };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  private async syncNetworks(): Promise<TaskResult> {
    try {
      const meraki = await getMerakiClient();
      if (!meraki) return { success: false, error: 'No Meraki client available' };

      // Get organizations first
      const organizations = await cache.get(cacheKeys.organizations(), 'organizations') || [];
      if (!Array.isArray(organizations) || organizations.length === 0) {
        return { success: false, error: 'No organizations found in cache' };
      }

      let totalNetworks = 0;
      
      for (const org of organizations) {
        try {
          console.log(`🔄 Syncing networks for organization: ${org.name}`);
          
          // Add delay to avoid rate limiting
          await delay(2000);
          
          const networks = await meraki.getOrganizationNetworks(org.id);
          if (Array.isArray(networks)) {
            await cache.set(
              cacheKeys.organizationNetworks(org.id), 
              networks, 
              { ttl: 600, type: 'organization-networks' }
            );
            totalNetworks += networks.length;
          }
        } catch (error) {
          console.error(`Failed to sync networks for org ${org.id}:`, error);
          // Continue with other organizations
        }
      }
      
      return { success: true, itemsProcessed: totalNetworks };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  private async syncDevices(): Promise<TaskResult> {
    try {
      const meraki = await getMerakiClient();
      if (!meraki) return { success: false, error: 'No Meraki client available' };

      // Get organizations
      const organizations = await cache.get(cacheKeys.organizations(), 'organizations') || [];
      if (!Array.isArray(organizations)) {
        return { success: false, error: 'No organizations found' };
      }

      let totalDevices = 0;
      
      for (const org of organizations.slice(0, 3)) { // Limit to first 3 orgs to avoid rate limits
        try {
          // Get networks for this org
          const networks = await cache.get(
            cacheKeys.organizationNetworks(org.id), 
            'organization-networks'
          ) || [];
          
          if (!Array.isArray(networks)) continue;
          
          for (const network of networks.slice(0, 5)) { // Limit to 5 networks per org
            try {
              console.log(`🔄 Syncing devices for network: ${network.name}`);
              
              // Add delay to avoid rate limiting
              await delay(3000);
              
              const devices = await meraki.getNetworkDevices(network.id);
              if (Array.isArray(devices)) {
                await cache.set(
                  cacheKeys.networkDevices(network.id), 
                  devices, 
                  { ttl: 120, type: 'network-devices' }
                );
                totalDevices += devices.length;
              }
            } catch (error) {
              console.error(`Failed to sync devices for network ${network.id}:`, error);
              // Continue with other networks
            }
          }
        } catch (error) {
          console.error(`Failed to process org ${org.id}:`, error);
        }
      }
      
      return { success: true, itemsProcessed: totalDevices };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  private async cleanupExpiredCache(): Promise<TaskResult> {
    try {
      console.log('🧹 Cleaning up expired cache entries...');
      
      // Cleanup would be handled by MongoDB TTL index
      // For now, just return success
      return { success: true, itemsProcessed: 0 };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  private async warmCache(): Promise<TaskResult> {
    try {
      console.log('🔥 Warming cache with commonly accessed data...');
      
      // Warm up commonly accessed endpoints
      const tasks = [
        this.syncOrganizations(),
        // Add small delay between tasks
        delay(1000).then(() => this.syncNetworks())
      ];
      
      const results = await Promise.allSettled(tasks);
      const successful = results.filter(r => r.status === 'fulfilled').length;
      
      return { success: true, itemsProcessed: successful };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  // Public methods for monitoring
  getTaskStatus() {
    const status: Record<string, any> = {};
    
    for (const [name, history] of this.taskHistory.entries()) {
      const recent = history.slice(-5); // Last 5 runs
      const successRate = recent.filter(r => r.success).length / recent.length;
      
      status[name] = {
        isScheduled: this.tasks.has(name),
        recentRuns: recent.length,
        successRate: Math.round(successRate * 100),
        lastRun: recent[recent.length - 1] || null
      };
    }
    
    return {
      isRunning: this.isRunning,
      tasks: status,
      circuitBreakerOpen: !circuitBreaker.canExecute('meraki-api')
    };
  }

  shutdown() {
    console.log('🛑 Shutting down background task manager...');
    this.isRunning = false;
    
    for (const [name, timer] of this.tasks.entries()) {
      clearInterval(timer);
      console.log(`✅ Stopped task: ${name}`);
    }
    
    this.tasks.clear();
    console.log('✅ Background task manager shut down');
  }

  // Manual task triggers for testing
  async runTaskNow(taskName: string): Promise<TaskResult> {
    const taskMap: Record<string, () => Promise<TaskResult>> = {
      'sync-organizations': this.syncOrganizations.bind(this),
      'sync-networks': this.syncNetworks.bind(this),
      'sync-devices': this.syncDevices.bind(this),
      'cache-cleanup': this.cleanupExpiredCache.bind(this),
      'warm-cache': this.warmCache.bind(this)
    };

    const task = taskMap[taskName];
    if (!task) {
      return { success: false, error: `Unknown task: ${taskName}` };
    }

    const startTime = Date.now();
    console.log(`⏳ Running manual task: ${taskName}`);
    
    try {
      const result = await task();
      const duration = Date.now() - startTime;
      
      result.duration = duration;
      this.recordTaskResult(taskName, result);
      
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      const result: TaskResult = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration
      };
      
      this.recordTaskResult(taskName, result);
      return result;
    }
  }
}

// Global instance
export const backgroundTaskManager = new BackgroundTaskManager();

// Auto-start in production
if (process.env.NODE_ENV === 'production' || process.env.ENABLE_BACKGROUND_TASKS === 'true') {
  // Start after a short delay to allow the application to initialize
  setTimeout(() => {
    backgroundTaskManager.start();
  }, 5000);
}
