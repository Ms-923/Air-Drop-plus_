import { useState, useEffect, useRef, useCallback } from 'react';
import { RoomManager } from '@/components/room-manager';
import { ConnectionStatus } from '@/components/connection-status';
import { FileDropZone } from '@/components/file-drop-zone';
import { TransferCard } from '@/components/transfer-card';
import { DownloadSection } from '@/components/download-section';
import { useToast } from '@/hooks/use-toast';
import { WebRTCManager } from '@/lib/webrtc-manager';
import { FileTransferManager } from '@/lib/file-transfer-manager';
import type { ConnectionState, FileTransfer, FileControlMessage } from '@shared/schema';

export default function Home() {
  const { toast } = useToast();
  
  const [roomId, setRoomId] = useState<string>('');
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [transfers, setTransfers] = useState<Map<string, FileTransfer>>(new Map());
  const [completedFiles, setCompletedFiles] = useState<Array<{ id: string, name: string, blob: Blob }>>([]);
  
  const webrtcManagerRef = useRef<WebRTCManager | null>(null);
  const fileTransferManagerRef = useRef<FileTransferManager | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const room = params.get('room');
    if (room) {
      setRoomId(room);
    }
  }, []);

  useEffect(() => {
    if (!roomId) return;

    // Initialize WebRTC manager
    const webrtcManager = new WebRTCManager({
      onConnectionStateChange: (state) => {
        console.log('[Home] Connection state changed:', state);
        setConnectionState(state);
        
        if (state === 'connected') {
          toast({
            title: 'Connected',
            description: 'Peer connection established. You can now transfer files!'
          });
        } else if (state === 'peer-left') {
          toast({
            title: 'Peer disconnected',
            description: 'Your peer has left the room.',
            variant: 'destructive'
          });
        } else if (state === 'error') {
          toast({
            title: 'Connection error',
            description: 'Failed to establish connection. Please try again.',
            variant: 'destructive'
          });
        }
      },
      onDataChannelMessage: (message) => {
        if (message instanceof ArrayBuffer) {
          // Handle file chunk
          fileTransferManagerRef.current?.handleChunk(message);
        } else {
          // Handle control message
          fileTransferManagerRef.current?.handleControlMessage(message as FileControlMessage);
        }
      },
      onError: (error) => {
        console.error('[Home] WebRTC error:', error);
        toast({
          title: 'Error',
          description: error,
          variant: 'destructive'
        });
      }
    });

    webrtcManagerRef.current = webrtcManager;

    // Initialize file transfer manager
    const fileTransferManager = new FileTransferManager(webrtcManager, {
      onTransferUpdate: (transfer) => {
        setTransfers(prev => new Map(prev).set(transfer.id, transfer));
      },
      onTransferComplete: (transfer, blob) => {
        setTransfers(prev => new Map(prev).set(transfer.id, transfer));
        
        if (blob && transfer.direction === 'receiving') {
          // Add to completed files for download
          setCompletedFiles(prev => [...prev, {
            id: transfer.id,
            name: transfer.metadata.name,
            blob
          }]);
          
          toast({
            title: 'File received',
            description: `${transfer.metadata.name} is ready to download`
          });
        } else if (transfer.direction === 'sending') {
          toast({
            title: 'File sent',
            description: `${transfer.metadata.name} sent successfully`
          });
        }
      },
      onError: (fileId, error) => {
        console.error('[Home] File transfer error:', fileId, error);
        toast({
          title: 'Transfer error',
          description: error,
          variant: 'destructive'
        });
      }
    });

    fileTransferManagerRef.current = fileTransferManager;

    // Connect to room
    webrtcManager.connect(roomId);

    // Cleanup on unmount
    return () => {
      fileTransferManager.cleanup();
      webrtcManager.cleanup();
    };
  }, [roomId, toast]);

  const handleRoomCreated = useCallback((newRoomId: string) => {
    setRoomId(newRoomId);
  }, []);

  const handleJoinRoom = useCallback((newRoomId: string) => {
    setRoomId(newRoomId);
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

    fileTransferManagerRef.current?.sendFiles(files);
    
    toast({
      title: 'Files queued',
      description: `${files.length} file(s) ready to send`
    });
  }, [connectionState, toast]);

  const handleCancelTransfer = useCallback((fileId: string) => {
    fileTransferManagerRef.current?.cancelTransfer(fileId);
  }, []);

  const transfersList = Array.from(transfers.values()).filter(
    t => t.status !== 'completed'
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-6 py-8">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            P2P File Share
          </h1>
          <p className="text-sm text-muted-foreground">
            Privacy-first file transfer using direct peer-to-peer connections. Files never touch the server.
          </p>
        </header>

        <div className="space-y-8">
          <RoomManager 
            roomId={roomId}
            connectionState={connectionState}
            onRoomCreated={handleRoomCreated}
            onJoinRoom={handleJoinRoom}
          />

          {roomId && (
            <>
              <ConnectionStatus state={connectionState} />
              
              {connectionState === 'connected' && (
                <FileDropZone onFilesSelected={handleFilesSelected} />
              )}

              {connectionState === 'connecting' && (
                <div className="p-6 border rounded-lg bg-card text-center">
                  <p className="text-muted-foreground">
                    Waiting for peer to connect...
                  </p>
                </div>
              )}

              {transfersList.length > 0 && (
                <div className="space-y-4">
                  <h2 className="text-xl font-semibold">Active Transfers</h2>
                  <div className="space-y-3">
                    {transfersList.map(transfer => (
                      <TransferCard 
                        key={transfer.id} 
                        transfer={transfer}
                        onCancel={handleCancelTransfer}
                      />
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
