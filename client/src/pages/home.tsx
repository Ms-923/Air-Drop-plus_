import { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'wouter';
import { RoomManager } from '@/components/room-manager';
import { ConnectionStatus } from '@/components/connection-status';
import { FileDropZone } from '@/components/file-drop-zone';
import { TransferCard } from '@/components/transfer-card';
import { DownloadSection } from '@/components/download-section';
import { useToast } from '@/hooks/use-toast';
import type { ConnectionState, FileTransfer } from '@shared/schema';

export default function Home() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const [roomId, setRoomId] = useState<string>('');
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [transfers, setTransfers] = useState<FileTransfer[]>([]);
  const [completedFiles, setCompletedFiles] = useState<Array<{ id: string, name: string, blob: Blob }>>([]);
  
  // Keep track of File objects for sending (not in shared schema)
  const pendingFilesRef = useRef<Map<string, File>>(new Map());
  
  const wsRef = useRef<WebSocket | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);
  const isInitiatorRef = useRef<boolean>(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const room = params.get('room');
    if (room) {
      setRoomId(room);
    }
  }, []);

  const handleFilesSelected = useCallback((files: File[]) => {
    if (connectionState !== 'connected') {
      toast({
        title: 'Not connected',
        description: 'Please wait for a peer to connect before sending files.',
        variant: 'destructive'
      });
      return;
    }

    toast({
      title: 'Files added',
      description: `${files.length} file(s) ready to send`
    });
  }, [connectionState, toast]);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-6 py-8">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            P2P File Share
          </h1>
          <p className="text-sm text-muted-foreground">
            Privacy-first file transfer using direct peer-to-peer connections
          </p>
        </header>

        <div className="space-y-8">
          <RoomManager 
            roomId={roomId}
            connectionState={connectionState}
            onRoomCreated={setRoomId}
            onJoinRoom={setRoomId}
          />

          {roomId && (
            <>
              <ConnectionStatus state={connectionState} />
              
              {connectionState === 'connected' && (
                <FileDropZone onFilesSelected={handleFilesSelected} />
              )}

              {transfers.length > 0 && (
                <div className="space-y-4">
                  <h2 className="text-xl font-semibold">Active Transfers</h2>
                  <div className="space-y-3">
                    {transfers.map(transfer => (
                      <TransferCard key={transfer.id} transfer={transfer} />
                    ))}
                  </div>
                </div>
              )}

              {completedFiles.length > 0 && (
                <DownloadSection files={completedFiles} />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
