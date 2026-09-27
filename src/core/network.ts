import Peer, { type DataConnection } from 'peerjs';
import type { GameEvent, GameState } from './types';

// The events that can be sent over the network
export interface LobbyClient {
  clientId: string;
  name: string;
  avatar: string;
  playerId: number;
}

export type NetworkMessage =
  | { type: 'STATE_SYNC'; state: GameState }
  | { type: 'GAME_START'; state: GameState }
  | { type: 'GAME_EVENT'; event: GameEvent }
  | { type: 'PLAYER_JOIN'; player: { name: string; avatar: string }; clientId: string }
  | { type: 'LOBBY_SYNC'; clients: LobbyClient[]; players: Array<{ name: string; avatar: string }> }
  | { type: 'MATCH_RESET' }
  | { type: 'REMOTE_ACTION'; action: string; payload: any };

export interface NetworkAdapter {
  isHost: boolean;
  roomCode: string;
  onMessage(handler: (msg: NetworkMessage) => void): void;
  broadcast(msg: NetworkMessage): void;
  disconnect(): void;
}

export class PeerAdapter implements NetworkAdapter {
  isHost: boolean;
  roomCode: string;
  private peer: Peer | null = null;
  private connections: DataConnection[] = []; // Used by host to talk to clients
  private hostConnection: DataConnection | null = null; // Used by client to talk to host
  private messageHandlers: Array<(msg: NetworkMessage) => void> = [];

  constructor(isHost: boolean, roomCode: string, onReady: () => void, onError: (err: Error) => void) {
    this.isHost = isHost;
    this.roomCode = roomCode;

    // Use a public peerjs server but with a specific prefix for our game
    const peerId = isHost ? `cacho-alalay-${roomCode}` : undefined;
    
    if (peerId) {
      this.peer = new Peer(peerId, { debug: 1 });
    } else {
      this.peer = new Peer({ debug: 1 });
    }

    this.peer.on('open', (id) => {
      console.log('PeerJS connected with ID:', id);
      if (!isHost) {
        // Client connects to host
        const conn = this.peer!.connect(`cacho-alalay-${roomCode}`, { reliable: true });
        conn.on('open', () => {
          this.hostConnection = conn;
          this.setupConnection(conn);
          onReady();
        });
        conn.on('error', (err) => onError(new Error(`Connection error: ${err.message}`)));
      } else {
        onReady();
      }
    });

    if (isHost) {
      this.peer.on('connection', (conn) => {
        console.log('Client connected:', conn.peer);
        this.connections.push(conn);
        this.setupConnection(conn);
        
        // Remove on close
        conn.on('close', () => {
          this.connections = this.connections.filter(c => c !== conn);
        });
      });
    }

    this.peer.on('error', (err) => {
      console.error('PeerJS error:', err);
      onError(err);
    });
  }

  private setupConnection(conn: DataConnection) {
    conn.on('data', (data) => {
      try {
        const msg = deserializeNetworkMessage(data);
        // If host, rebroadcast to others so everyone is in sync
        if (this.isHost) {
          const rawStr = typeof data === 'string' ? data : serializeNetworkMessage(msg);
          this.connections.forEach(c => {
            if (c !== conn) c.send(rawStr);
          });
        }
        this.messageHandlers.forEach(h => h(msg));
      } catch (err) {
        console.error('Error handling network data:', err);
      }
    });
  }

  onMessage(handler: (msg: NetworkMessage) => void): void {
    this.messageHandlers.push(handler);
  }

  broadcast(msg: NetworkMessage): void {
    const serialized = serializeNetworkMessage(msg);
    if (this.isHost) {
      this.connections.forEach(conn => conn.send(serialized));
    } else if (this.hostConnection) {
      this.hostConnection.send(serialized);
    }
  }

  disconnect(): void {
    this.connections.forEach(c => c.close());
    if (this.hostConnection) this.hostConnection.close();
    if (this.peer) this.peer.destroy();
  }
}

export function serializeNetworkMessage(msg: NetworkMessage): string {
  return JSON.stringify(msg, (_key, value) => {
    if (value instanceof Set) {
      return Array.from(value);
    }
    return value;
  });
}

export function deserializeNetworkMessage(raw: unknown): NetworkMessage {
  const msg: NetworkMessage = typeof raw === 'string' ? JSON.parse(raw) : (raw as NetworkMessage);
  if (msg.type === 'STATE_SYNC' || msg.type === 'GAME_START') {
    if (msg.state) {
      msg.state.flippedDieIds = new Set(msg.state.flippedDieIds || []);
      if (Array.isArray(msg.state.players)) {
        msg.state.players.forEach((p) => {
          p.scratched = new Set(p.scratched || []);
        });
      }
    }
  }
  return msg;
}

export function generateRoomCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let result = '';
  for (let i = 0; i < 4; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}
