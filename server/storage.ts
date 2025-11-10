import { type User, type InsertUser } from "@shared/schema";
import { randomUUID } from "crypto";
import type { WebSocket } from "ws";

// Room management for WebRTC signaling
export interface Room {
  id: string;
  clients: Map<string, WebSocket>;
  createdAt: number;
}

// Modified storage interface for P2P file sharing
export interface IStorage {
  // User methods (legacy - not used in P2P app)
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Room management methods
  createRoom(roomId: string): Room;
  getRoom(roomId: string): Room | undefined;
  addClientToRoom(roomId: string, clientId: string, ws: WebSocket): boolean;
  removeClientFromRoom(roomId: string, clientId: string): void;
  getOtherClientInRoom(roomId: string, clientId: string): WebSocket | undefined;
  cleanupRoom(roomId: string): void;
  getAllRooms(): Map<string, Room>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private rooms: Map<string, Room>;

  constructor() {
    this.users = new Map();
    this.rooms = new Map();
    
    // Periodic cleanup of empty rooms (every 5 minutes)
    setInterval(() => {
      this.cleanupEmptyRooms();
    }, 5 * 60 * 1000);
  }

  // Legacy user methods
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  // Room management methods
  createRoom(roomId: string): Room {
    if (this.rooms.has(roomId)) {
      return this.rooms.get(roomId)!;
    }
    
    const room: Room = {
      id: roomId,
      clients: new Map(),
      createdAt: Date.now()
    };
    
    this.rooms.set(roomId, room);
    console.log(`[Room] Created room: ${roomId}`);
    return room;
  }

  getRoom(roomId: string): Room | undefined {
    return this.rooms.get(roomId);
  }

  addClientToRoom(roomId: string, clientId: string, ws: WebSocket): boolean {
    const room = this.getRoom(roomId);
    if (!room) {
      console.error(`[Room] Room not found: ${roomId}`);
      return false;
    }

    // Limit to 2 clients per room (P2P connection)
    if (room.clients.size >= 2) {
      console.warn(`[Room] Room ${roomId} is full`);
      return false;
    }

    room.clients.set(clientId, ws);
    console.log(`[Room] Client ${clientId} joined room ${roomId} (${room.clients.size}/2)`);
    return true;
  }

  removeClientFromRoom(roomId: string, clientId: string): void {
    const room = this.getRoom(roomId);
    if (!room) return;

    room.clients.delete(clientId);
    console.log(`[Room] Client ${clientId} left room ${roomId} (${room.clients.size}/2)`);

    // Only remove the room from the map if completely empty
    // Don't close sockets - remaining peer should stay connected
    if (room.clients.size === 0) {
      this.rooms.delete(roomId);
      console.log(`[Room] Removed empty room: ${roomId}`);
    }
  }

  getOtherClientInRoom(roomId: string, clientId: string): WebSocket | undefined {
    const room = this.getRoom(roomId);
    if (!room) return undefined;

    // Find the other client in the room (not the sender)
    for (const [id, ws] of room.clients.entries()) {
      if (id !== clientId) {
        return ws;
      }
    }

    return undefined;
  }

  cleanupRoom(roomId: string): void {
    // Just remove the room from the map
    // Don't forcibly close client connections - they may still be active
    this.rooms.delete(roomId);
    console.log(`[Room] Cleaned up room: ${roomId}`);
  }

  cleanupEmptyRooms(): void {
    const now = Date.now();
    const maxAge = 60 * 60 * 1000; // 1 hour

    for (const [roomId, room] of this.rooms.entries()) {
      // Remove empty rooms older than 1 hour
      if (room.clients.size === 0 && (now - room.createdAt) > maxAge) {
        this.cleanupRoom(roomId);
      }
    }
  }

  getAllRooms(): Map<string, Room> {
    return this.rooms;
  }
}

export const storage = new MemStorage();
