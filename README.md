# P2P File Share - Privacy-First File Transfer

A lightweight, privacy-first browser-based file sharing application that sends files directly between peers using WebRTC DataChannels. The server only handles ephemeral signaling (SDP and ICE candidate exchange) and never touches or stores file data.

## Features

✨ **Core Features**
- Direct peer-to-peer file transfer using WebRTC DataChannels
- Minimal signaling server (only handles connection setup)
- Room-based connections with shareable links
- Drag-and-drop file selection
- Multiple file support
- Real-time transfer progress with speed and ETA
- Chunked file streaming (64KB chunks by default)
- Backpressure handling to prevent buffer overruns
- No file storage on server - complete privacy

🔒 **Privacy & Security**
- Files never touch the server - only peer-to-peer transfer
- Ephemeral room management (in-memory only)
- Secure WebRTC connections
- Requires HTTPS in production for WebRTC

## Quick Start

### Local Development

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Start the application**
   ```bash
   npm run dev
   ```

3. **Open two browser windows**
   - Window 1: Go to `http://localhost:5000`
   - Click "Create New Room"
   - Copy the shareable link
   - Window 2: Paste the link or enter the room code
   - Wait for connection to establish
   - Select files to transfer!

### Testing Locally

To test file transfers between devices on your local network:

1. Start the application on one device
2. Find your local IP address:
   - Mac/Linux: `ifconfig | grep inet`
   - Windows: `ipconfig`
3. Create a room on the first device
4. On the second device, navigate to `http://[YOUR_IP]:5000/?room=[ROOM_CODE]`
5. Wait for the connection and start transferring files

## Architecture

### Components

- **Signaling Server** (`server/routes.ts`)
  - WebSocket server on `/ws` path
  - Manages ephemeral rooms in-memory
  - Forwards SDP offers/answers and ICE candidates
  - Handles peer join/leave events
  - Automatic room cleanup when empty

- **Frontend** (`client/src/`)
  - Single-page React application
  - WebRTC peer connection management
  - DataChannel-based file transfer
  - Chunked streaming with progress tracking
  - Responsive, accessible UI

### How It Works

1. **Room Creation**: User creates a room, gets a unique room ID
2. **Signaling**: Users connect to WebSocket server and join the same room
3. **WebRTC Handshake**:
   - Initiator creates offer (SDP)
   - Offer sent through signaling server
   - Peer responds with answer (SDP)
   - ICE candidates exchanged for NAT traversal
4. **DataChannel**: Once connected, peers establish a DataChannel named "file"
5. **File Transfer**:
   - Sender sends file metadata first
   - File chunked into 64KB pieces
   - Chunks sent with backpressure handling (checks bufferedAmount)
   - Receiver assembles chunks into Blob
   - Download link presented when complete

## Configuration

### ICE Servers

Default configuration uses public STUN servers:
```typescript
{
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
  ]
}
```

### Chunk Size

Default: 64KB chunks
- Adjustable via `DEFAULT_P2P_CONFIG.chunkSize` in `shared/schema.ts`
- Recommended range: 16KB - 128KB
- Larger chunks = faster transfers but less granular progress
- Smaller chunks = more overhead but better progress tracking

### Backpressure Threshold

Default: 256KB buffered amount threshold
- Sender pauses when DataChannel buffer exceeds this
- Prevents overwhelming the receiver
- Adjustable via `DEFAULT_P2P_CONFIG.maxBufferedAmount`

## Production Deployment

### Requirements

1. **HTTPS Required**
   - WebRTC requires secure context
   - Use a reverse proxy (nginx, Caddy) with TLS
   - Or deploy to a platform with automatic HTTPS

2. **TURN Server (Recommended)**
   - Required for restrictive NATs and firewalls
   - Use coturn or a cloud TURN service
   - Configuration:
     ```typescript
     {
       iceServers: [
         { urls: 'stun:stun.l.google.com:19302' },
         {
           urls: 'turn:your-turn-server.com:3478',
           username: 'username',
           credential: 'password'
         }
       ]
     }
     ```

### Setting up coturn (TURN Server)

```bash
# Install coturn
sudo apt-get install coturn

# Edit /etc/turnserver.conf
listening-port=3478
fingerprint
lt-cred-mech
user=username:password
realm=yourdomain.com
external-ip=YOUR_PUBLIC_IP

# Start coturn
sudo systemctl start coturn
sudo systemctl enable coturn
```

### Scaling Considerations

- **Stateless Signaling**: Current implementation stores rooms in-memory
  - For multi-instance deployments, use Redis or similar for room state
  - Or use sticky sessions to route connections to same instance
  
- **Room Cleanup**: Rooms auto-cleanup when empty
  - Add TTL-based cleanup for abandoned rooms
  - Implement rate limiting on room creation

- **Security Enhancements**:
  - Add optional room passwords
  - Implement room expiration
  - Add rate limiting on WebSocket connections
  - Monitor for abuse patterns

## Technical Details

### WebRTC DataChannel

- **Binary Type**: ArrayBuffer
- **Ordered**: true (chunks arrive in order)
- **Reliable**: true (guaranteed delivery)
- **Channel Name**: "file"

### File Streaming

Uses File API and Blob slicing:
```typescript
const chunk = file.slice(start, end);
const arrayBuffer = await chunk.arrayBuffer();
dataChannel.send(arrayBuffer);
```

### Progress Tracking

Real-time calculation:
- **Speed**: Bytes transferred / Time elapsed
- **ETA**: Remaining bytes / Current speed
- Updated every chunk (smooth progress bar)

## Browser Compatibility

Requires modern browsers with:
- WebRTC DataChannel support
- File API
- Blob/ArrayBuffer
- WebSocket

Tested on:
- Chrome/Edge 90+
- Firefox 88+
- Safari 15+

## Limitations & Known Issues

- **Maximum File Size**: Depends on browser memory limits
- **Mobile Safari**: May have memory constraints on large files
- **Restrictive NATs**: May require TURN server for connectivity
- **No Resume**: Transfer must restart if connection drops
- **Single Peer**: Currently supports 1:1 transfers only

## Future Enhancements

- [ ] Pause/Resume capability with chunk checksums
- [ ] Multiple parallel transfers
- [ ] End-to-end encryption (AES-GCM)
- [ ] Room password protection
- [ ] Image preview/thumbnails
- [ ] Transfer speed optimization
- [ ] Multi-peer support (broadcast to multiple peers)
- [ ] Mobile app wrappers (Capacitor/React Native)

## Security Considerations

### Current Security

✅ Peer-to-peer transfer (no server storage)
✅ Ephemeral signaling (no persistent data)
✅ WebRTC encryption (DTLS/SRTP)

### Recommendations

- Always use HTTPS in production
- Implement room password protection
- Add rate limiting to prevent abuse
- Consider client-side encryption for sensitive data
- Set room expiration times
- Monitor and log suspicious activity

## License

MIT

## Contributing

Contributions welcome! Please open an issue or PR.

## Support

For issues or questions, please open a GitHub issue.
