import { z } from "zod";

// Legacy user types (not used in P2P app but needed for compilation)
export interface User {
  id: string;
  username: string;
  createdAt?: number;
}

export interface InsertUser {
  username: string;
  createdAt?: number;
}

// Environment-agnostic WebRTC types (serializable across Node and browser)
export interface SessionDescription {
  type: 'offer' | 'answer' | 'pranswer' | 'rollback';
  sdp: string;
}

export interface IceCandidate {
  candidate: string;
  sdpMid: string | null;
  sdpMLineIndex: number | null;
  usernameFragment: string | null;
}

export interface IceServer {
  urls: string | string[];
  username?: string;
  credential?: string;
}

// WebRTC signaling message types (sent over WebSocket)
export type SignalingMessage = 
  | { type: 'join', roomId: string }
  | { type: 'offer', offer: SessionDescription }
  | { type: 'answer', answer: SessionDescription }
  | { type: 'ice-candidate', candidate: IceCandidate }
  | { type: 'peer-joined' }
  | { type: 'peer-left' }
  | { type: 'error', message: string };

// Connection states
export type ConnectionState = 
  | 'disconnected'
  | 'connecting' 
  | 'connected'
  | 'peer-left'
  | 'error';

// File metadata sent as JSON over DataChannel
export interface FileMetadata {
  id: string;
  name: string;
  size: number;
  type: string;
  totalChunks: number;
}

// DataChannel control messages (sent as JSON strings)
export type FileControlMessage = 
  | { type: 'file-metadata', metadata: FileMetadata }
  | { type: 'chunk-ack', fileId: string, chunkIndex: number }
  | { type: 'transfer-complete', fileId: string }
  | { type: 'transfer-cancel', fileId: string }
  | { type: 'transfer-pause', fileId: string }
  | { type: 'transfer-resume', fileId: string };

// Note: File chunks are sent as raw ArrayBuffer (not wrapped in JSON)
// Format: First send FileControlMessage with type 'file-metadata' as JSON string
// Then send each chunk as raw ArrayBuffer with chunk index tracked separately

// Transfer status
export type TransferStatus = 
  | 'pending' 
  | 'transferring' 
  | 'paused' 
  | 'completed' 
  | 'cancelled' 
  | 'error';

// Base transfer info (shared between sender and receiver)
export interface TransferInfo {
  id: string;
  metadata: FileMetadata;
  status: TransferStatus;
  bytesTransferred: number;
  totalBytes: number;
  speed: number; // bytes per second
  eta: number; // estimated seconds remaining
  startTime: number;
  lastUpdateTime: number;
  error?: string;
}

// Sender-side transfer (has access to File object)
export interface SendingTransfer extends TransferInfo {
  direction: 'sending';
  currentChunkIndex: number;
}

// Receiver-side transfer (assembles chunks into blob)
export interface ReceivingTransfer extends TransferInfo {
  direction: 'receiving';
  receivedChunks: ArrayBuffer[];
  expectedChunks: number;
}

// Union type for all transfers
export type FileTransfer = SendingTransfer | ReceivingTransfer;

// Configuration
export interface P2PConfig {
  iceServers: IceServer[];
  chunkSize: number; // bytes per chunk (16KB - 64KB recommended)
  maxBufferedAmount: number; // backpressure threshold
}

export const DEFAULT_P2P_CONFIG: P2PConfig = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
  ],
  chunkSize: 64 * 1024, // 64KB chunks
  maxBufferedAmount: 256 * 1024 // 256KB buffer threshold
};

// Helper to serialize control messages for DataChannel
export function serializeControlMessage(message: FileControlMessage): string {
  return JSON.stringify(message);
}

// Helper to deserialize control messages from DataChannel
export function deserializeControlMessage(data: string): FileControlMessage {
  return JSON.parse(data) as FileControlMessage;
}

// Helper to check if DataChannel message is control message or chunk
export function isControlMessage(data: unknown): data is string {
  return typeof data === 'string';
}
