import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Play, 
  Square, 
  RefreshCw, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Activity,
  Database 
} from 'lucide-react';

interface TaskStatus {
  isScheduled: boolean;
  recentRuns: number;
  successRate: number;
  lastRun: {
    success: boolean;
    duration: number;
    timestamp: string;
    itemsProcessed?: number;
    error?: string;
  } | null;
}

interface BackgroundTasksStatus {
  isRunning: boolean;
  tasks: Record<string, TaskStatus>;
  circuitBreakerOpen: boolean;
}

export default function BackgroundTaskMonitor() {
  const [status, setStatus] = useState<BackgroundTasksStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<string>('');

  const fetchStatus = async () => {
    try {
      const response = await fetch('/api/admin/background-tasks');
      if (response.ok) {
        const data = await response.json();
        setStatus(data);
        setLastUpdate(new Date().toLocaleTimeString());
      }
    } catch (error) {
      console.error('Failed to fetch background task status:', error);
    }
  };

  const executeAction = async (action: string, taskName?: string) => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/background-tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, taskName })
      });
      
      if (response.ok) {
        await fetchStatus(); // Refresh status
      }
    } catch (error) {
      console.error('Failed to execute action:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };

  const getStatusColor = (task: TaskStatus) => {
    if (!task.lastRun) return 'secondary';
    if (task.successRate < 50) return 'destructive';
    if (task.successRate < 80) return 'outline';
    return 'default';
  };

  const getStatusIcon = (task: TaskStatus) => {
    if (!task.lastRun) return <Clock className="h-4 w-4" />;
    if (task.lastRun.success) return <CheckCircle className="h-4 w-4 text-green-500" />;
    return <XCircle className="h-4 w-4 text-red-500" />;
  };

  if (!status) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Activity className="h-5 w-5" />
            <span>Background Tasks</span>
          </CardTitle>
          <CardDescription>Loading task status...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-8">
            <RefreshCw className="h-6 w-6 animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <Activity className="h-5 w-5" />
                <span>Background Task Manager</span>
              </CardTitle>
              <CardDescription>
                Monitor and control background data synchronization tasks
              </CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant={status.isRunning ? 'default' : 'secondary'}>
                {status.isRunning ? 'Running' : 'Stopped'}
              </Badge>
              {status.circuitBreakerOpen && (
                <Badge variant="destructive">Circuit Breaker Open</Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm text-muted-foreground">
              Last updated: {lastUpdate}
            </div>
            <div className="flex space-x-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={fetchStatus}
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              {status.isRunning ? (
                <Button 
                  variant="destructive" 
                  size="sm" 
                  onClick={() => executeAction('stop')}
                  disabled={loading}
                >
                  <Square className="h-4 w-4 mr-2" />
                  Stop Tasks
                </Button>
              ) : (
                <Button 
                  variant="default" 
                  size="sm" 
                  onClick={() => executeAction('start')}
                  disabled={loading}
                >
                  <Play className="h-4 w-4 mr-2" />
                  Start Tasks
                </Button>
              )}
            </div>
          </div>

          <Tabs defaultValue="overview" className="space-y-4">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="details">Task Details</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(status.tasks).map(([taskName, task]) => (
                  <Card key={taskName}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-medium">
                          {taskName.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </CardTitle>
                        {getStatusIcon(task)}
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs">
                          <span>Success Rate:</span>
                          <Badge variant={getStatusColor(task)} className="text-xs">
                            {task.successRate}%
                          </Badge>
                        </div>
                        {task.lastRun && (
                          <>
                            <div className="flex justify-between text-xs">
                              <span>Duration:</span>
                              <span>{formatDuration(task.lastRun.duration)}</span>
                            </div>
                            {task.lastRun.itemsProcessed !== undefined && (
                              <div className="flex justify-between text-xs">
                                <span>Items:</span>
                                <span>{task.lastRun.itemsProcessed}</span>
                              </div>
                            )}
                          </>
                        )}
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="w-full mt-2"
                          onClick={() => executeAction('run', taskName)}
                          disabled={loading || !status.isRunning}
                        >
                          Run Now
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="details" className="space-y-4">
              <div className="space-y-4">
                {Object.entries(status.tasks).map(([taskName, task]) => (
                  <Card key={taskName}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">
                          {taskName.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </CardTitle>
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(task)}
                          <Badge variant={task.isScheduled ? 'default' : 'secondary'}>
                            {task.isScheduled ? 'Scheduled' : 'Manual'}
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <div className="font-medium">Recent Runs</div>
                          <div className="text-muted-foreground">{task.recentRuns}</div>
                        </div>
                        <div>
                          <div className="font-medium">Success Rate</div>
                          <div className="text-muted-foreground">{task.successRate}%</div>
                        </div>
                        {task.lastRun && (
                          <>
                            <div>
                              <div className="font-medium">Last Duration</div>
                              <div className="text-muted-foreground">
                                {formatDuration(task.lastRun.duration)}
                              </div>
                            </div>
                            <div>
                              <div className="font-medium">Items Processed</div>
                              <div className="text-muted-foreground">
                                {task.lastRun.itemsProcessed || 0}
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                      {task.lastRun?.error && (
                        <div className="mt-4 p-3 bg-destructive/10 rounded-md">
                          <div className="font-medium text-destructive text-sm">Last Error:</div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {task.lastRun.error}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
