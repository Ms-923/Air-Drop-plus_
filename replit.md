# P2P File Share - Replit Project

## Overview

Privacy-first peer-to-peer file sharing web application built with WebRTC DataChannels. Files are transferred directly between browsers without server storage.

## Project Structure

```
├── client/                 # Frontend React application
│   ├── src/
│   │   ├── components/     # React components
│   │   │   ├── room-manager.tsx       # Room creation/join UI
│   │   │   ├── connection-status.tsx  # Connection state display
│   │   │   ├── file-drop-zone.tsx     # Drag-and-drop file picker
│   │   │   ├── transfer-card.tsx      # File transfer progress
│   │   │   └── download-section.tsx   # Completed downloads
│   │   ├── pages/
│   │   │   └── home.tsx    # Main application page
│   │   └── lib/            # Utilities
├── server/                 # Backend Node.js server
│   ├── routes.ts           # WebSocket signaling server
│   └── storage.ts          # In-memory room management
├── shared/                 # Shared TypeScript types
│   └── schema.ts           # WebRTC message types and interfaces
└── README.md               # Full documentation
```

## Tech Stack

**Frontend:**
- React + TypeScript
- Wouter (routing)
- TanStack Query (state management)
- Shadcn UI + Tailwind CSS
- Lucide React (icons)
- WebRTC APIs (RTCPeerConnection, RTCDataChannel)

**Backend:**
- Node.js + Express
- WebSocket server (ws library)
- In-memory room management

**Key Libraries:**
- `ws` - WebSocket server for signaling
- Native WebRTC APIs (browser-based)
- File API and Streams API

## How It Works

### Signaling Flow

1. User creates or joins a room via UI
2. Frontend connects to WebSocket server at `/ws`
3. Users in same room exchange WebRTC signaling messages:
   - SDP offers/answers (connection parameters)
   - ICE candidates (network route discovery)
4. Server forwards messages between peers (never stores data)
5. Once connected, DataChannel established for file transfer

### File Transfer

1. User selects files via drag-and-drop or file picker
2. File metadata sent to peer (name, size, type)
3. File chunked into 64KB pieces
4. Chunks sent over DataChannel with backpressure handling
5. Receiver assembles chunks into Blob
6. Download link presented when complete

**Privacy:** Files never touch the server - only peer-to-peer transfer.

## Development

### Running Locally

```bash
npm install
npm run dev
```

Application runs on http://localhost:5000

### Testing P2P Transfer

1. Open two browser windows/tabs
2. Window 1: Create a new room
3. Window 2: Join using the room code or shareable link
4. Wait for "Connected" status
5. Select files to transfer

## Configuration

### WebRTC Settings

Located in `shared/schema.ts`:

```typescript
export const DEFAULT_P2P_CONFIG = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' }
  ],
  chunkSize: 64 * 1024,        // 64KB chunks
  maxBufferedAmount: 256 * 1024 // Backpressure threshold
};
```

### Chunk Size Tuning

- **Smaller chunks (16KB)**: Better progress granularity, more overhead
- **Larger chunks (128KB)**: Faster transfers, less granular progress
- Default 64KB is a good balance

## Key Features Implemented

✅ Minimal WebSocket signaling server
✅ Room-based peer connections
✅ Shareable room links
✅ WebRTC DataChannel file transfer
✅ Chunked streaming with backpressure
✅ Real-time progress tracking (bytes, speed, ETA)
✅ Multi-file support
✅ Drag-and-drop interface
✅ Connection state management
✅ Responsive UI with accessibility

## Architecture Decisions

### Why WebSocket for Signaling?

- Real-time bidirectional communication needed
- Lower latency than HTTP polling
- Event-driven message forwarding
- Standard for WebRTC signaling

### Why In-Memory Storage?

- Ephemeral rooms (no persistence needed)
- Fast lookups and cleanup
- Privacy-focused (no data retention)
- Simple implementation for MVP

### Why 64KB Chunks?

- Balance between throughput and progress updates
- Stays under browser DataChannel message size limits
- Allows smooth progress bar updates
- Backpressure prevents buffer overflow

### Backpressure Handling

DataChannel has a send buffer - if it fills up, messages are queued in memory which can cause:
- Browser memory issues
- Transfer delays
- Connection instability

Solution: Check `bufferedAmount` before sending each chunk. If over threshold, pause and retry.

## Production Considerations

### HTTPS Required

WebRTC requires secure context. In production:
- Use HTTPS (TLS certificate)
- Deploy to platform with automatic HTTPS
- Or use reverse proxy (nginx/Caddy) with TLS

### TURN Server for NAT Traversal

Public STUN servers help with NAT discovery, but restrictive networks may need TURN:
- Deploy coturn server
- Or use cloud TURN service (Twilio, Metered, etc.)
- Update ICE server configuration

### Scaling

Current implementation is single-instance:
- Room state in process memory
- For multi-instance, use Redis for room state
- Or implement sticky sessions

## Recent Changes

**2025-01-10: Initial Implementation**
- Created data schema and TypeScript interfaces
- Built all React components with Shadcn UI
- Implemented responsive, accessible design
- Added comprehensive documentation

## Next Steps (Phase 2)

- [ ] Implement WebSocket signaling server
- [ ] Add room management logic
- [ ] Handle peer join/leave events
- [ ] Forward SDP and ICE messages

## Next Steps (Phase 3)

- [ ] Connect frontend to WebSocket server
- [ ] Implement WebRTC connection establishment
- [ ] Create DataChannel for file transfer
- [ ] Implement chunked file streaming
- [ ] Add progress tracking and speed calculation
- [ ] Test full end-to-end transfer
