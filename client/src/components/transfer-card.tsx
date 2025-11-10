import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { FileText, Image as ImageIcon, Pause, Play, X } from 'lucide-react';
import type { FileTransfer } from '@shared/schema';

interface TransferCardProps {
  transfer: FileTransfer;
  onPause?: (id: string) => void;
  onResume?: (id: string) => void;
  onCancel?: (id: string) => void;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

function formatSpeed(bytesPerSecond: number): string {
  return `${formatBytes(bytesPerSecond)}/s`;
}

function formatTime(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.round(seconds % 60);
  return `${minutes}m ${remainingSeconds}s`;
}

export function TransferCard({ transfer, onPause, onResume, onCancel }: TransferCardProps) {
  const progress = transfer.totalBytes > 0 
    ? (transfer.bytesTransferred / transfer.totalBytes) * 100 
    : 0;

  const isImage = transfer.metadata.type.startsWith('image/');
  const Icon = isImage ? ImageIcon : FileText;

  const canPause = transfer.status === 'transferring' && transfer.direction === 'sending';
  const canResume = transfer.status === 'paused' && transfer.direction === 'sending';
  const canCancel = ['pending', 'transferring', 'paused'].includes(transfer.status);

  return (
    <Card data-testid={`card-transfer-${transfer.id}`}>
      <CardContent className="p-4">
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <div className="mt-0.5 shrink-0">
                <Icon className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-base truncate" data-testid={`text-filename-${transfer.id}`}>
                  {transfer.metadata.name}
                </h4>
                <p className="text-sm text-muted-foreground" data-testid={`text-filesize-${transfer.id}`}>
                  {formatBytes(transfer.metadata.size)}
                  {transfer.direction === 'receiving' && ' • Receiving'}
                  {transfer.direction === 'sending' && ' • Sending'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              {canPause && onPause && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onPause(transfer.id)}
                  aria-label="Pause transfer"
                  data-testid={`button-pause-${transfer.id}`}
                >
                  <Pause className="h-4 w-4" />
                </Button>
              )}
              {canResume && onResume && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onResume(transfer.id)}
                  aria-label="Resume transfer"
                  data-testid={`button-resume-${transfer.id}`}
                >
                  <Play className="h-4 w-4" />
                </Button>
              )}
              {canCancel && onCancel && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onCancel(transfer.id)}
                  aria-label="Cancel transfer"
                  data-testid={`button-cancel-${transfer.id}`}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          <Progress value={progress} className="h-2" data-testid={`progress-${transfer.id}`} />

          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span data-testid={`text-progress-${transfer.id}`}>
              {formatBytes(transfer.bytesTransferred)} / {formatBytes(transfer.totalBytes)}
            </span>
            {transfer.status === 'transferring' && (
              <span data-testid={`text-speed-${transfer.id}`}>
                {formatSpeed(transfer.speed)} • {formatTime(transfer.eta)} left
              </span>
            )}
            {transfer.status === 'paused' && (
              <span className="text-yellow-600 dark:text-yellow-400">Paused</span>
            )}
            {transfer.status === 'completed' && (
              <span className="text-green-600 dark:text-green-400">Complete</span>
            )}
            {transfer.status === 'error' && (
              <span className="text-destructive">Error: {transfer.error}</span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
