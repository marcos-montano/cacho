import { describe, it, expect } from 'vitest';
import { serializeNetworkMessage, deserializeNetworkMessage, type NetworkMessage } from '../src/core/network';
import { GameEngine, createPlayer } from '../src/core/engine';

describe('Network message serialization', () => {
  it('serializes and deserializes Set instances cleanly without BinaryPack errors', () => {
    const p1 = createPlayer(1, 'Alice', '🎲');
    const p2 = createPlayer(2, 'Bob', '🎯');
    p1.scratched.add('ones');
    p1.scratched.add('twos');

    const engine = new GameEngine([p1, p2]);
    const state = engine.getState();
    state.flippedDieIds.add(0);
    state.flippedDieIds.add(2);

    const msg: NetworkMessage = {
      type: 'STATE_SYNC',
      state,
    };

    // Serialize to string
    const serialized = serializeNetworkMessage(msg);
    expect(typeof serialized).toBe('string');
    // Ensure no raw Set representation is in the JSON string
    expect(serialized).not.toContain('Set');

    // Deserialize back
    const deserialized = deserializeNetworkMessage(serialized);
    expect(deserialized.type).toBe('STATE_SYNC');
    if (deserialized.type === 'STATE_SYNC') {
      expect(deserialized.state.flippedDieIds instanceof Set).toBe(true);
      expect(deserialized.state.flippedDieIds.has(0)).toBe(true);
      expect(deserialized.state.flippedDieIds.has(2)).toBe(true);

      const restoredP1 = deserialized.state.players[0];
      expect(restoredP1.scratched instanceof Set).toBe(true);
      expect(restoredP1.scratched.has('ones')).toBe(true);
      expect(restoredP1.scratched.has('twos')).toBe(true);
    }
  });
});
