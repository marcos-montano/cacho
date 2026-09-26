/**
 * @file localAdapter.ts
 * Local (same-device) Pass & Play network adapter.
 *
 * No real network I/O — events are dispatched synchronously via an in-memory
 * bus. This is the adapter used for all local multiplayer and offline play.
 */

import type { GameEvent } from '../core/types';
import type { NetworkAdapter } from './adapter';

export class LocalAdapter implements NetworkAdapter {
  readonly isOnline = false;

  private listeners: Array<(event: GameEvent) => void> = [];

  connect(_roomCode: string): Promise<string> {
    // No actual connection needed
    return Promise.resolve(_roomCode || 'LOCAL');
  }

  disconnect(): void {
    this.listeners = [];
  }

  /** In local mode, sending immediately fans out to all local subscribers. */
  send(event: GameEvent): void {
    for (const listener of this.listeners) listener(event);
  }

  onEvent(listener: (event: GameEvent) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }
}
