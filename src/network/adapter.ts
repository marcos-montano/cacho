/**
 * @file adapter.ts
 * Generic synchronization adapter interface.
 *
 * Decouples the game engine from any specific transport mechanism.
 * The UI only calls methods on this interface; the concrete implementation
 * decides whether to sync locally (Pass & Play) or over the network (Firebase/WebRTC).
 */

import type { GameEvent } from '../core/types';

export interface NetworkAdapter {
  /** Connect to or create a room. Resolves with the assigned room code. */
  connect(roomCode: string): Promise<string>;

  /** Disconnect and clean up. */
  disconnect(): void;

  /** Broadcast a game event to all players in the room. */
  send(event: GameEvent): void;

  /** Subscribe to incoming events from remote players. */
  onEvent(listener: (event: GameEvent) => void): () => void;

  /** Whether this adapter requires a network connection. */
  readonly isOnline: boolean;
}
