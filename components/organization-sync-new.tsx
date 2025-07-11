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
  const [isSyncing, setIsSyncing] = useState(false);
  const [progress, setProgress] = useState<SyncProgress[]>([]);
  const [currentProgress, setCurrentProgress] = useState(0);

  const startSync = async () => {
    setIsSyncing(true);
    setProgress([]);
    setCurrentProgress(0);

    try {
      const response = await fetch('/api/sync/organizations', {
        method: 'POST',
        headers: {
          'Accept': 'text/event-stream',
        },
      });

      if (!response.body) {
        throw new Error('No response body');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data: SyncProgress = JSON.parse(line.slice(6));
              setProgress(prev => [...prev, data]);
              
              // Update progress percentage
              if (data.current && data.total) {
                setCurrentProgress((data.current / data.total) * 100);
              }
              
              // Call completion callback
              if (data.status === 'completed' && onSyncComplete) {
                onSyncComplete();
              }
            } catch (error) {
              console.error('Error parsing SSE data:', error);
            }
          }
        }
      }
    } catch (error) {
      console.error('Sync error:', error);
      setProgress(prev => [...prev, {
        status: 'error',
        message: `Sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      }]);
    } finally {
      setIsSyncing(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'warning':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case 'info':
        return <Info className="h-4 w-4 text-blue-500" />;
      default:
        return <RefreshCw className="h-4 w-4 text-gray-500 animate-spin" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-600';
      case 'error':
        return 'text-red-600';
      case 'warning':
        return 'text-yellow-600';
      case 'info':
        return 'text-blue-600';
      default:
        return 'text-gray-600';
    }
  };

  const latestProgress = progress[progress.length - 1];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RefreshCw className="h-5 w-5" />
          Organization Data Sync
        </CardTitle>
        <CardDescription>
          Synchronize organization data from Meraki API with rate limiting to avoid hitting API limits
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4">
          <Button 
            onClick={startSync} 
            disabled={isSyncing}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Syncing...' : 'Start Sync'}
          </Button>
          
          {isSyncing && (
            <div className="flex-1">
              <Progress value={currentProgress} className="h-2" />
              <p className="text-sm text-muted-foreground mt-1">
                {Math.round(currentProgress)}% complete
              </p>
            </div>
          )}
        </div>

        {/* Rate Limiter Status */}
        {latestProgress?.rateLimiter && (
          <Card className="bg-muted/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Rate Limiter Status</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Queue Length:</span>
                  <span className="ml-2 font-mono">{latestProgress.rateLimiter.queueLength}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Processing:</span>
                  <span className="ml-2 font-mono">{latestProgress.rateLimiter.isProcessing ? 'Yes' : 'No'}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Calls/Window:</span>
                  <span className="ml-2 font-mono">
                    {latestProgress.rateLimiter.callsInCurrentWindow}/{latestProgress.rateLimiter.maxCallsPerWindow}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Window Remaining:</span>
                  <span className="ml-2 font-mono">{Math.round(latestProgress.rateLimiter.windowRemainingMs / 1000)}s</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Progress Log */}
        {progress.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Sync Progress</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="max-h-64 overflow-y-auto space-y-2">
                {progress.slice(-10).map((item, index) => (
                  <div key={index} className="flex items-start gap-2 text-sm">
                    {getStatusIcon(item.status)}
                    <div className="flex-1">
                      <p className={getStatusColor(item.status)}>{item.message}</p>
                      {item.error && (
                        <p className="text-red-500 text-xs mt-1">Error: {item.error}</p>
                      )}
                      {(item.networkCount !== undefined || item.deviceCount !== undefined) && (
                        <div className="text-xs text-muted-foreground mt-1">
                          {item.networkCount !== undefined && `Networks: ${item.networkCount}`}
                          {item.deviceCount !== undefined && ` • Devices: ${item.deviceCount}`}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </CardContent>
    </Card>
  );
}
