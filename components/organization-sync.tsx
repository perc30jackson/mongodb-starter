import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { RefreshCw, CheckCircle, XCircle, AlertCircle, Info } from 'lucide-react';

interface SyncProgress {
  status: 'starting' | 'progress' | 'completed' | 'error' | 'warning' | 'info';
  message: string;
  step?: string;
  current?: number;
  total?: number;
  organizationName?: string;
  networkName?: string;
  networkCount?: number;
  deviceCount?: number;
  skippedCount?: number;
  count?: number;
  error?: string;
  rateLimiter?: {
    queueLength: number;
    callsInCurrentWindow: number;
    maxCallsPerWindow: number;
    windowRemainingMs: number;
    isProcessing: boolean;
  };
}

interface OrganizationSyncProps {
  onSyncComplete?: () => void;
}

export default function OrganizationSync({ onSyncComplete }: OrganizationSyncProps) {
  const [issyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState<SyncProgress | null>(null);
  const [syncId, setSyncId] = useState<string>('');

  // Poll for sync progress
  useEffect(() => {
    if (!issyncing || !syncId) return;

    const pollProgress = async () => {
      try {
        const response = await fetch(`/api/organizations/sync?syncId=${syncId}`);
        if (response.ok) {
          const data = await response.json();
          setSyncProgress(data.progress);
          
          if (data.progress.isComplete) {
            setIsSyncing(false);
            if (onSyncComplete) {
              onSyncComplete();
            }
          }
        }
      } catch (error) {
        console.error('Error polling sync progress:', error);
      }
    };

    const interval = setInterval(pollProgress, 1000); // Poll every second
    return () => clearInterval(interval);
  }, [issyncing, syncId, onSyncComplete]);

  const startSync = async () => {
    try {
      setIsSyncing(true);
      const newSyncId = `sync-${Date.now()}`;
      setSyncId(newSyncId);
      setSyncProgress({
        stage: 'Initializing...',
        completed: 0,
        total: 100,
        isComplete: false
      });

      const response = await fetch('/api/organizations/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ syncId: newSyncId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to start sync');
      }

      const data = await response.json();
      setSyncProgress(data.progress);
    } catch (error) {
      console.error('Error starting sync:', error);
      setIsSyncing(false);
      setSyncProgress({
        stage: 'Error',
        completed: 0,
        total: 100,
        isComplete: true,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  const getStatusIcon = () => {
    if (!syncProgress) return null;
    
    if (syncProgress.error) {
      return <AlertCircle className="h-5 w-5 text-red-500" />;
    }
    
    if (syncProgress.isComplete && !syncProgress.error) {
      return <CheckCircle className="h-5 w-5 text-green-500" />;
    }
    
    if (issyncing) {
      return <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />;
    }
    
    return <RefreshCw className="h-5 w-5" />;
  };

  const getProgressPercentage = () => {
    if (!syncProgress) return 0;
    return Math.min(100, Math.max(0, (syncProgress.completed / syncProgress.total) * 100));
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {getStatusIcon()}
          Organization Data Sync
        </CardTitle>
        <CardDescription>
          Synchronize organization data from Cisco Meraki with rate limiting to avoid API limits
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {syncProgress && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">{syncProgress.stage}</span>
              <span className="text-muted-foreground">
                {Math.round(getProgressPercentage())}%
              </span>
            </div>
            
            <Progress value={getProgressPercentage()} className="h-2" />
            
            {syncProgress.currentItem && (
              <p className="text-sm text-muted-foreground">
                {syncProgress.currentItem}
              </p>
            )}
            
            {syncProgress.error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-700">
                  <strong>Error:</strong> {syncProgress.error}
                </p>
              </div>
            )}
            
            {syncProgress.isComplete && !syncProgress.error && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                <p className="text-sm text-green-700">
                  Sync completed successfully! Data has been cached and is ready for use.
                </p>
              </div>
            )}
          </div>
        )}
        
        <div className="flex items-center gap-4">
          <Button
            onClick={startSync}
            disabled={issyncing}
            className="flex items-center gap-2"
          >
            {issyncing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            {issyncing ? 'Syncing...' : 'Start Sync'}
          </Button>
          
          {syncProgress && !issyncing && (
            <p className="text-sm text-muted-foreground">
              Last sync: {syncProgress.isComplete ? 'Completed' : 'In progress'}
            </p>
          )}
        </div>
        
        <div className="text-xs text-muted-foreground">
          <p>
            <strong>Rate Limited:</strong> This sync process includes delays between API calls 
            to respect Cisco Meraki API rate limits. This may take several minutes to complete.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
