import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import type { SignalingMessage } from "@shared/schema";
import { randomUUID } from "crypto";

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);

  // WebSocket server for WebRTC signaling on /ws path
  // This ensures it doesn't conflict with Vite's HMR websocket
  const wss = new WebSocketServer({ 
    server: httpServer, 
    path: '/ws' 
  });

  // Track client IDs to room mappings
  const clientRooms = new Map<string, string>();

  wss.on('connection', (ws: WebSocket) => {
    const clientId = randomUUID();
    console.log(`[WebSocket] New client connected: ${clientId}`);

    ws.on('message', (data: Buffer) => {
      try {
        const message: SignalingMessage = JSON.parse(data.toString());
        console.log(`[WebSocket] Message from ${clientId}:`, message.type);

        switch (message.type) {
          case 'join': {
            const { roomId } = message;
            
            // Create room if it doesn't exist
            if (!storage.getRoom(roomId)) {
              storage.createRoom(roomId);
            }

            // Add client to room
            const added = storage.addClientToRoom(roomId, clientId, ws);
            
            if (added) {
              clientRooms.set(clientId, roomId);
              
              // Notify other client in room that a peer has joined
              const otherClient = storage.getOtherClientInRoom(roomId, clientId);
              if (otherClient && otherClient.readyState === WebSocket.OPEN) {
                otherClient.send(JSON.stringify({ type: 'peer-joined' }));
                console.log(`[WebSocket] Notified peer in room ${roomId} of new join`);
              }
            } else {
              // Room is full or error occurred
              if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ 
                  type: 'error', 
                  message: 'Room is full or unavailable' 
                }));
              }
            }
            break;
          }

          case 'offer':
          case 'answer':
          case 'ice-candidate': {
            // Forward signaling messages to the other peer in the room
            const roomId = clientRooms.get(clientId);
            
            if (!roomId) {
              console.error(`[WebSocket] Client ${clientId} not in any room`);
              if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ 
                  type: 'error', 
                  message: 'Not in a room' 
                }));
              }
              break;
            }

            const otherClient = storage.getOtherClientInRoom(roomId, clientId);
            
            if (otherClient && otherClient.readyState === WebSocket.OPEN) {
              // Forward the exact message to the peer
              otherClient.send(JSON.stringify(message));
              console.log(`[WebSocket] Forwarded ${message.type} in room ${roomId}`);
            } else {
              console.warn(`[WebSocket] No peer to forward ${message.type} to in room ${roomId}`);
              if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ 
                  type: 'error', 
                  message: 'No peer connected' 
                }));
              }
            }
            break;
          }

          default:
            console.warn(`[WebSocket] Unknown message type from ${clientId}`);
        }
      } catch (error) {
        console.error('[WebSocket] Error processing message:', error);
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ 
            type: 'error', 
            message: 'Invalid message format' 
          }));
        }
      }
    });

    ws.on('close', () => {
      console.log(`[WebSocket] Client disconnected: ${clientId}`);
      
      const roomId = clientRooms.get(clientId);
      if (roomId) {
        // Notify the other peer that this client left
        const otherClient = storage.getOtherClientInRoom(roomId, clientId);
        if (otherClient && otherClient.readyState === WebSocket.OPEN) {
          otherClient.send(JSON.stringify({ type: 'peer-left' }));
          console.log(`[WebSocket] Notified peer in room ${roomId} of disconnect`);
        }

        // Remove client from room
        storage.removeClientFromRoom(roomId, clientId);
        clientRooms.delete(clientId);
      }
    });

    ws.on('error', (error) => {
      console.error(`[WebSocket] Error for client ${clientId}:`, error);
    });
  });

  console.log('[WebSocket] Signaling server initialized on /ws');

  return httpServer;
}
