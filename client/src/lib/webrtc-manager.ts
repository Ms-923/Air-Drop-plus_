import type {
  SignalingMessage,
  SessionDescription,
  IceCandidate,
  ConnectionState,
  DEFAULT_P2P_CONFIG,
  FileControlMessage,
  FileMetadata,
  SendingTransfer,
  ReceivingTransfer,
  serializeControlMessage,
  deserializeControlMessage,
  isControlMessage
} from '@shared/schema';
import { DEFAULT_P2P_CONFIG as P2P_CONFIG } from '@shared/schema';

export interface WebRTCManagerCallbacks {
  onConnectionStateChange: (state: ConnectionState) => void;
  onDataChannelMessage: (message: FileControlMessage | ArrayBuffer) => void;
  onError: (error: string) => void;
}

export class WebRTCManager {
  private ws: WebSocket | null = null;
  private pc: RTCPeerConnection | null = null;
  private dataChannel: RTCDataChannel | null = null;
  private isInitiator: boolean = false;
  private roomId: string = '';
  private callbacks: WebRTCManagerCallbacks;

  constructor(callbacks: WebRTCManagerCallbacks) {
    this.callbacks = callbacks;
  }

  async connect(roomId: string): Promise<void> {
    this.roomId = roomId;

    // Connect to WebSocket signaling server
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      console.log('[WebRTC] WebSocket connected');
      this.callbacks.onConnectionStateChange('connecting');
      
      // Join the room
      const joinMessage: SignalingMessage = { type: 'join', roomId };
      this.ws!.send(JSON.stringify(joinMessage));
    };

    this.ws.onmessage = async (event) => {
      try {
        const message: SignalingMessage = JSON.parse(event.data);
        await this.handleSignalingMessage(message);
      } catch (error) {
        console.error('[WebRTC] Error handling signaling message:', error);
        this.callbacks.onError('Failed to process signaling message');
      }
    };

    this.ws.onerror = (error) => {
      console.error('[WebRTC] WebSocket error:', error);
      this.callbacks.onError('WebSocket connection error');
      this.callbacks.onConnectionStateChange('error');
    };

    this.ws.onclose = () => {
      console.log('[WebRTC] WebSocket closed');
      this.cleanup();
    };
  }

  private async handleSignalingMessage(message: SignalingMessage): Promise<void> {
    console.log('[WebRTC] Received signaling message:', message.type);

    switch (message.type) {
      case 'peer-joined':
        // We are the initiator - create offer
        this.isInitiator = true;
        await this.createPeerConnection();
        await this.createOffer();
        break;

      case 'offer':
        // We are the answerer - create answer
        this.isInitiator = false;
        await this.createPeerConnection();
        await this.handleOffer(message.offer);
        break;

      case 'answer':
        await this.handleAnswer(message.answer);
        break;

      case 'ice-candidate':
        await this.handleIceCandidate(message.candidate);
        break;

      case 'peer-left':
        this.callbacks.onConnectionStateChange('peer-left');
        this.cleanup();
        break;

      case 'error':
        this.callbacks.onError(message.message);
        this.callbacks.onConnectionStateChange('error');
        break;
    }
  }

  private async createPeerConnection(): Promise<void> {
    // Create RTCPeerConnection with STUN servers
    this.pc = new RTCPeerConnection({
      iceServers: P2P_CONFIG.iceServers.map(server => ({
        urls: server.urls,
        username: server.username,
        credential: server.credential
      }))
    });

    // ICE candidate handler
    this.pc.onicecandidate = (event) => {
      if (event.candidate && this.ws && this.ws.readyState === WebSocket.OPEN) {
        const candidate: IceCandidate = {
          candidate: event.candidate.candidate,
          sdpMid: event.candidate.sdpMid,
          sdpMLineIndex: event.candidate.sdpMLineIndex,
          usernameFragment: event.candidate.usernameFragment
        };
        
        const message: SignalingMessage = { 
          type: 'ice-candidate', 
          candidate 
        };
        this.ws.send(JSON.stringify(message));
      }
    };

    // Connection state handler
    this.pc.onconnectionstatechange = () => {
      console.log('[WebRTC] Connection state:', this.pc?.connectionState);
      
      switch (this.pc?.connectionState) {
        case 'connected':
          this.callbacks.onConnectionStateChange('connected');
          break;
        case 'disconnected':
        case 'failed':
          this.callbacks.onConnectionStateChange('error');
          break;
        case 'closed':
          this.callbacks.onConnectionStateChange('disconnected');
          break;
      }
    };

    // If initiator, create data channel
    if (this.isInitiator) {
      this.createDataChannel();
    } else {
      // If answerer, wait for data channel
      this.pc.ondatachannel = (event) => {
        this.dataChannel = event.channel;
        this.setupDataChannel();
      };
    }
  }

  private createDataChannel(): void {
    if (!this.pc) return;

    this.dataChannel = this.pc.createDataChannel('file', {
      ordered: true
    });
    
    this.setupDataChannel();
  }

  private setupDataChannel(): void {
    if (!this.dataChannel) return;

    this.dataChannel.binaryType = 'arraybuffer';

    this.dataChannel.onopen = () => {
      console.log('[WebRTC] DataChannel opened');
      this.callbacks.onConnectionStateChange('connected');
    };

    this.dataChannel.onmessage = (event) => {
      // Check if it's a control message (JSON string) or chunk (ArrayBuffer)
      if (typeof event.data === 'string') {
        try {
          const controlMessage: FileControlMessage = JSON.parse(event.data);
          this.callbacks.onDataChannelMessage(controlMessage);
        } catch (error) {
          console.error('[WebRTC] Error parsing control message:', error);
        }
      } else if (event.data instanceof ArrayBuffer) {
        this.callbacks.onDataChannelMessage(event.data);
      }
    };

    this.dataChannel.onerror = (error) => {
      console.error('[WebRTC] DataChannel error:', error);
      this.callbacks.onError('Data channel error');
    };

    this.dataChannel.onclose = () => {
      console.log('[WebRTC] DataChannel closed');
      this.callbacks.onConnectionStateChange('disconnected');
    };
  }

  private async createOffer(): Promise<void> {
    if (!this.pc) return;

    try {
      const offer = await this.pc.createOffer();
      await this.pc.setLocalDescription(offer);

      const sessionDesc: SessionDescription = {
        type: offer.type as 'offer',
        sdp: offer.sdp!
      };

      const message: SignalingMessage = { 
        type: 'offer', 
        offer: sessionDesc 
      };
      
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify(message));
      }
    } catch (error) {
      console.error('[WebRTC] Error creating offer:', error);
      this.callbacks.onError('Failed to create offer');
    }
  }

  private async handleOffer(offer: SessionDescription): Promise<void> {
    if (!this.pc) return;

    try {
      await this.pc.setRemoteDescription(new RTCSessionDescription(offer));
      
      const answer = await this.pc.createAnswer();
      await this.pc.setLocalDescription(answer);

      const sessionDesc: SessionDescription = {
        type: answer.type as 'answer',
        sdp: answer.sdp!
      };

      const message: SignalingMessage = { 
        type: 'answer', 
        answer: sessionDesc 
      };
      
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify(message));
      }
    } catch (error) {
      console.error('[WebRTC] Error handling offer:', error);
      this.callbacks.onError('Failed to handle offer');
    }
  }

  private async handleAnswer(answer: SessionDescription): Promise<void> {
    if (!this.pc) return;

    try {
      await this.pc.setRemoteDescription(new RTCSessionDescription(answer));
    } catch (error) {
      console.error('[WebRTC] Error handling answer:', error);
      this.callbacks.onError('Failed to handle answer');
    }
  }

  private async handleIceCandidate(candidate: IceCandidate): Promise<void> {
    if (!this.pc) return;

    try {
      const iceCandidate = new RTCIceCandidate({
        candidate: candidate.candidate,
        sdpMid: candidate.sdpMid,
        sdpMLineIndex: candidate.sdpMLineIndex
      });
      
      await this.pc.addIceCandidate(iceCandidate);
    } catch (error) {
      console.error('[WebRTC] Error adding ICE candidate:', error);
    }
  }

  sendControlMessage(message: FileControlMessage): void {
    if (this.dataChannel && this.dataChannel.readyState === 'open') {
      this.dataChannel.send(JSON.stringify(message));
    }
  }

  sendChunk(chunk: ArrayBuffer): void {
    if (this.dataChannel && this.dataChannel.readyState === 'open') {
      this.dataChannel.send(chunk);
    }
  }

  getBufferedAmount(): number {
    return this.dataChannel?.bufferedAmount || 0;
  }

  isConnected(): boolean {
    return this.dataChannel?.readyState === 'open';
  }

  cleanup(): void {
    if (this.dataChannel) {
      this.dataChannel.close();
      this.dataChannel = null;
    }

    if (this.pc) {
      this.pc.close();
      this.pc = null;
    }

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.close();
      this.ws = null;
    }
  }

  disconnect(): void {
    this.cleanup();
    this.callbacks.onConnectionStateChange('disconnected');
  }
}
