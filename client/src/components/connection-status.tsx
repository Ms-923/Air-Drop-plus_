import { Badge } from '@/components/ui/badge';
import { Signal, CheckCircle2, XCircle, UserMinus, Loader2 } from 'lucide-react';
import type { ConnectionState } from '@shared/schema';

interface ConnectionStatusProps {
  state: ConnectionState;
}

export function ConnectionStatus({ state }: ConnectionStatusProps) {
  const getStatusConfig = () => {
    switch (state) {
      case 'connected':
        return {
          icon: CheckCircle2,
          label: 'Connected',
          variant: 'default' as const,
          className: 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20'
        };
      case 'connecting':
        return {
          icon: Loader2,
          label: 'Connecting...',
          variant: 'secondary' as const,
          className: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20 animate-pulse'
        };
      case 'peer-left':
        return {
          icon: UserMinus,
          label: 'Peer Left',
          variant: 'secondary' as const,
          className: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20'
        };
      case 'error':
        return {
          icon: XCircle,
          label: 'Connection Error',
          variant: 'destructive' as const,
          className: ''
        };
      case 'disconnected':
      default:
        return {
          icon: Signal,
          label: 'Waiting for peer...',
          variant: 'outline' as const,
          className: 'text-muted-foreground'
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  return (
    <div className="flex items-center justify-between p-4 border rounded-lg bg-card" data-testid="status-connection">
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-card-foreground">Connection Status</span>
        <Badge 
          variant={config.variant}
          className={`gap-1.5 ${config.className}`}
          data-testid={`badge-status-${state}`}
        >
          <Icon className={`h-3.5 w-3.5 ${state === 'connecting' ? 'animate-spin' : ''}`} />
          {config.label}
        </Badge>
      </div>
    </div>
  );
}
