import { DEFAULT_P2P_CONFIG as P2P_CONFIG } from '@shared/schema';
import type { 
  FileMetadata, 
  FileControlMessage,
  SendingTransfer,
  ReceivingTransfer,
  FileTransfer
} from '@shared/schema';
import type { WebRTCManager } from './webrtc-manager';
import { randomUUID } from '@/lib/utils';

export interface FileTransferCallbacks {
  onTransferUpdate: (transfer: FileTransfer) => void;
  onTransferComplete: (transfer: FileTransfer, blob?: Blob) => void;
  onError: (fileId: string, error: string) => void;
}

export class FileTransferManager {
  private webrtc: WebRTCManager;
  private callbacks: FileTransferCallbacks;
  private sendingTransfers: Map<string, { transfer: SendingTransfer, file: File }> = new Map();
  private receivingTransfers: Map<string, ReceivingTransfer> = new Map();
  private sendingIntervals: Map<string, number> = new Map();

  constructor(webrtc: WebRTCManager, callbacks: FileTransferCallbacks) {
    this.webrtc = webrtc;
    this.callbacks = callbacks;
  }

  async sendFiles(files: File[]): Promise<void> {
    // Send files sequentially to avoid chunk corruption
    for (const file of files) {
      await this.sendFile(file);
    }
  }

  private async sendFile(file: File): Promise<void> {
    return new Promise((resolve, reject) => {
      const fileId = randomUUID();
      const totalChunks = Math.ceil(file.size / P2P_CONFIG.chunkSize);

      const metadata: FileMetadata = {
        id: fileId,
        name: file.name,
        size: file.size,
        type: file.type,
        totalChunks
      };

      // Create sending transfer state
      const transfer: SendingTransfer = {
        id: fileId,
        direction: 'sending',
        metadata,
        status: 'pending',
        bytesTransferred: 0,
        totalBytes: file.size,
        speed: 0,
        eta: 0,
        startTime: Date.now(),
        lastUpdateTime: Date.now(),
        currentChunkIndex: 0
      };

      this.sendingTransfers.set(fileId, { transfer, file });
      this.callbacks.onTransferUpdate(transfer);

      // Send metadata to peer
      const metadataMessage: FileControlMessage = {
        type: 'file-metadata',
        metadata
      };
      this.webrtc.sendControlMessage(metadataMessage);

      // Start sending chunks
      transfer.status = 'transferring';
      this.callbacks.onTransferUpdate(transfer);
      
      this.sendChunks(fileId, resolve, reject);
    });
  }

  private sendChunks(fileId: string, onComplete: () => void, onError: (error: Error) => void): void {
    const data = this.sendingTransfers.get(fileId);
    if (!data) {
      onError(new Error('Transfer data not found'));
      return;
    }

    const { transfer, file } = data;
    const chunkSize = P2P_CONFIG.chunkSize;
    const maxBufferedAmount = P2P_CONFIG.maxBufferedAmount;

    const sendNextChunk = async () => {
      if (transfer.status !== 'transferring') {
        return;
      }

      // Check backpressure
      if (this.webrtc.getBufferedAmount() > maxBufferedAmount) {
        // Wait and retry
        setTimeout(() => sendNextChunk(), 50);
        return;
      }

      const start = transfer.currentChunkIndex * chunkSize;
      const end = Math.min(start + chunkSize, file.size);

      if (start >= file.size) {
        // All chunks sent
        transfer.status = 'completed';
        transfer.bytesTransferred = file.size;
        this.callbacks.onTransferUpdate(transfer);
        this.callbacks.onTransferComplete(transfer);
        
        // Send completion message
        const completeMessage: FileControlMessage = {
          type: 'transfer-complete',
          fileId
        };
        this.webrtc.sendControlMessage(completeMessage);
        
        // Resolve the promise to allow next file to send
        onComplete();
        return;
      }

      try {
        const chunk = file.slice(start, end);
        const arrayBuffer = await chunk.arrayBuffer();
        
        // Send chunk
        this.webrtc.sendChunk(arrayBuffer);
        
        // Update progress
        transfer.currentChunkIndex++;
        transfer.bytesTransferred = end;
        
        const now = Date.now();
        const elapsed = (now - transfer.startTime) / 1000; // seconds
        transfer.speed = elapsed > 0 ? transfer.bytesTransferred / elapsed : 0;
        
        const remaining = file.size - transfer.bytesTransferred;
        transfer.eta = transfer.speed > 0 ? remaining / transfer.speed : 0;
        transfer.lastUpdateTime = now;
        
        this.callbacks.onTransferUpdate(transfer);
        
        // Send next chunk
        setTimeout(() => sendNextChunk(), 0);
      } catch (error) {
        console.error('[FileTransfer] Error sending chunk:', error);
        transfer.status = 'error';
        transfer.error = 'Failed to send chunk';
        this.callbacks.onTransferUpdate(transfer);
        this.callbacks.onError(fileId, 'Failed to send chunk');
        onError(error as Error);
      }
    };

    // Start sending
    sendNextChunk();
  }

  handleControlMessage(message: FileControlMessage): void {
    switch (message.type) {
      case 'file-metadata':
        this.handleFileMetadata(message.metadata);
        break;
      
      case 'transfer-complete':
        this.handleTransferComplete(message.fileId);
        break;
      
      case 'transfer-cancel':
        this.handleTransferCancel(message.fileId);
        break;
    }
  }

  private handleFileMetadata(metadata: FileMetadata): void {
    const transfer: ReceivingTransfer = {
      id: metadata.id,
      direction: 'receiving',
      metadata,
      status: 'transferring',
      bytesTransferred: 0,
      totalBytes: metadata.size,
      speed: 0,
      eta: 0,
      startTime: Date.now(),
      lastUpdateTime: Date.now(),
      receivedChunks: [],
      expectedChunks: metadata.totalChunks
    };

    this.receivingTransfers.set(metadata.id, transfer);
    this.callbacks.onTransferUpdate(transfer);
  }

  handleChunk(chunk: ArrayBuffer): void {
    // Find the active receiving transfer (should only be one due to sequential sending)
    // Files are sent one at a time, so we process the first active transfer
    let activeTransfer: ReceivingTransfer | null = null;
    
    for (const transfer of this.receivingTransfers.values()) {
      if (transfer.status === 'transferring') {
        activeTransfer = transfer;
        break;
      }
    }
    
    if (!activeTransfer) {
      console.warn('[FileTransfer] Received chunk but no active transfer');
      return;
    }
    
    activeTransfer.receivedChunks.push(chunk);
    activeTransfer.bytesTransferred += chunk.byteLength;
    
    const now = Date.now();
    const elapsed = (now - activeTransfer.startTime) / 1000;
    activeTransfer.speed = elapsed > 0 ? activeTransfer.bytesTransferred / elapsed : 0;
    
    const remaining = activeTransfer.totalBytes - activeTransfer.bytesTransferred;
    activeTransfer.eta = activeTransfer.speed > 0 ? remaining / activeTransfer.speed : 0;
    activeTransfer.lastUpdateTime = now;
    
    this.callbacks.onTransferUpdate(activeTransfer);
  }

  private handleTransferComplete(fileId: string): void {
    const transfer = this.receivingTransfers.get(fileId);
    if (!transfer) return;

    // Assemble chunks into blob
    const blob = new Blob(transfer.receivedChunks, { type: transfer.metadata.type });
    
    transfer.status = 'completed';
    transfer.bytesTransferred = transfer.totalBytes;
    this.callbacks.onTransferUpdate(transfer);
    this.callbacks.onTransferComplete(transfer, blob);
  }

  private handleTransferCancel(fileId: string): void {
    const sending = this.sendingTransfers.get(fileId);
    if (sending) {
      sending.transfer.status = 'cancelled';
      this.callbacks.onTransferUpdate(sending.transfer);
      this.sendingTransfers.delete(fileId);
    }

    const receiving = this.receivingTransfers.get(fileId);
    if (receiving) {
      receiving.status = 'cancelled';
      this.callbacks.onTransferUpdate(receiving);
      this.receivingTransfers.delete(fileId);
    }
  }

  cancelTransfer(fileId: string): void {
    const message: FileControlMessage = {
      type: 'transfer-cancel',
      fileId
    };
    this.webrtc.sendControlMessage(message);
    this.handleTransferCancel(fileId);
  }

  cleanup(): void {
    // Clear all intervals
    for (const intervalId of this.sendingIntervals.values()) {
      clearInterval(intervalId);
    }
    this.sendingIntervals.clear();
    
    this.sendingTransfers.clear();
    this.receivingTransfers.clear();
  }
}
