import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Copy, Check, Plus, LogIn } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { ConnectionState } from '@shared/schema';

interface RoomManagerProps {
  roomId: string;
  connectionState: ConnectionState;
  onRoomCreated: (roomId: string) => void;
  onJoinRoom: (roomId: string) => void;
}

function generateRoomId(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

export function RoomManager({ roomId, connectionState, onRoomCreated, onJoinRoom }: RoomManagerProps) {
  const [joinRoomInput, setJoinRoomInput] = useState('');
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const handleCreateRoom = () => {
    const newRoomId = generateRoomId();
    onRoomCreated(newRoomId);
    const newUrl = `${window.location.origin}/?room=${newRoomId}`;
    window.history.pushState({}, '', `/?room=${newRoomId}`);
    toast({
      title: 'Room created',
      description: 'Share the link with someone to start transferring files'
    });
  };

  const handleJoinRoom = () => {
    if (joinRoomInput.trim()) {
      const trimmedRoomId = joinRoomInput.trim().toLowerCase();
      onJoinRoom(trimmedRoomId);
      window.history.pushState({}, '', `/?room=${trimmedRoomId}`);
      toast({
        title: 'Joining room',
        description: `Connecting to room ${trimmedRoomId}...`
      });
    }
  };

  const handleCopyLink = async () => {
    const shareableLink = `${window.location.origin}/?room=${roomId}`;
    try {
      await navigator.clipboard.writeText(shareableLink);
      setCopied(true);
      toast({
        title: 'Link copied',
        description: 'Share this link with someone to connect'
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast({
        title: 'Failed to copy',
        description: 'Please copy the link manually',
        variant: 'destructive'
      });
    }
  };

  if (roomId) {
    return (
      <Card data-testid="card-room-active">
        <CardHeader>
          <CardTitle className="text-2xl">Room Active</CardTitle>
          <CardDescription>
            Share this link to connect with another device
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <label className="text-sm font-medium text-muted-foreground mb-2 block">
                Room Code
              </label>
              <p className="text-4xl font-bold font-mono tracking-wider text-foreground">
                {roomId}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Input
              value={`${window.location.origin}/?room=${roomId}`}
              readOnly
              className="font-mono text-sm"
              data-testid="input-shareable-link"
            />
            <Button
              variant="outline"
              size="icon"
              onClick={handleCopyLink}
              aria-label="Copy shareable link"
              data-testid="button-copy-link"
            >
              {copied ? (
                <Check className="h-4 w-4" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <Card data-testid="card-create-room">
        <CardHeader>
          <CardTitle>Create Room</CardTitle>
          <CardDescription>
            Start a new room and share the link
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={handleCreateRoom} 
            className="w-full"
            size="lg"
            data-testid="button-create-room"
          >
            <Plus className="mr-2 h-5 w-5" />
            Create New Room
          </Button>
        </CardContent>
      </Card>

      <Card data-testid="card-join-room">
        <CardHeader>
          <CardTitle>Join Room</CardTitle>
          <CardDescription>
            Enter a room code to connect
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              placeholder="Enter room code"
              value={joinRoomInput}
              onChange={(e) => setJoinRoomInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleJoinRoom()}
              className="font-mono"
              data-testid="input-room-code"
            />
            <Button 
              onClick={handleJoinRoom}
              disabled={!joinRoomInput.trim()}
              data-testid="button-join-room"
            >
              <LogIn className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
