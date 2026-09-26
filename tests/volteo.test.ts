/**
 * @file volteo.test.ts
 * Unit tests for El Volteo (die flip) mechanics.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import type { Die } from '../src/core/types';
import {
  OPPOSITE,
  invert,
  applyFlip,
  canFlip,
  enumerateFlipOptions,
} from '../src/core/volteo';

function makeDice(...vals: number[]): Die[] {
  return vals.map((v, i) => ({ id: i, val: v as Die['val'], kept: false, flipped: false }));
}

// ---------------------------------------------------------------------------
// OPPOSITE map
// ---------------------------------------------------------------------------

describe('OPPOSITE face map', () => {
  it('covers all 6 faces and each pair sums to 7', () => {
    for (const [face, opp] of Object.entries(OPPOSITE)) {
      expect(Number(face) + opp).toBe(7);
    }
  });

  it('is its own inverse', () => {
    expect(OPPOSITE[OPPOSITE[1]]).toBe(1);
    expect(OPPOSITE[OPPOSITE[6]]).toBe(6);
    expect(OPPOSITE[OPPOSITE[3]]).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// invert()
// ---------------------------------------------------------------------------

describe('invert()', () => {
  it('inverts 1 to 6', () => expect(invert(1)).toBe(6));
  it('inverts 6 to 1', () => expect(invert(6)).toBe(1));
  it('inverts 2 to 5', () => expect(invert(2)).toBe(5));
  it('inverts 5 to 2', () => expect(invert(5)).toBe(2));
  it('inverts 3 to 4', () => expect(invert(3)).toBe(4));
  it('inverts 4 to 3', () => expect(invert(4)).toBe(3));
});

// ---------------------------------------------------------------------------
// applyFlip()
// ---------------------------------------------------------------------------

describe('applyFlip()', () => {
  let dice: Die[];
  let flipped: Set<number>;

  beforeEach(() => {
    dice = makeDice(1, 2, 3, 4, 5);
    flipped = new Set<number>();
  });

  it('flips die 0 from 1 to 6', () => {
    applyFlip(dice, 0, flipped);
    expect(dice[0].val).toBe(6);
    expect(dice[0].flipped).toBe(true);
  });

  it('marks the die as flipped in the returned object', () => {
    const result = applyFlip(dice, 2, flipped);
    expect(result.flipped).toBe(true);
    expect(result.val).toBe(4); // 3 → 4
  });

  it('throws if the die was already flipped', () => {
    flipped.add(1);
    expect(() => applyFlip(dice, 1, flipped)).toThrow();
  });

  it('throws if dieId does not exist', () => {
    expect(() => applyFlip(dice, 99, flipped)).toThrow();
  });

  it('does not mutate other dice', () => {
    const before = dice.map((d) => d.val);
    applyFlip(dice, 3, flipped);
    dice.forEach((d, i) => {
      if (d.id !== 3) expect(d.val).toBe(before[i]);
    });
  });
});

// ---------------------------------------------------------------------------
// canFlip()
// ---------------------------------------------------------------------------

describe('canFlip()', () => {
  it('returns true when die has not been flipped', () => {
    expect(canFlip(0, new Set())).toBe(true);
  });

  it('returns false when die is in the flipped set', () => {
    expect(canFlip(2, new Set([2]))).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// enumerateFlipOptions()
// ---------------------------------------------------------------------------

describe('enumerateFlipOptions()', () => {
  it('returns all 5 dice when none are flipped', () => {
    const dice = makeDice(1, 2, 3, 4, 5);
    const opts = enumerateFlipOptions(dice, new Set());
    expect(opts).toHaveLength(5);
  });

  it('excludes already-flipped dice', () => {
    const dice = makeDice(6, 6, 6, 6, 6);
    const opts = enumerateFlipOptions(dice, new Set([0, 1]));
    expect(opts).toHaveLength(3);
    expect(opts.map((o) => o.dieId)).not.toContain(0);
    expect(opts.map((o) => o.dieId)).not.toContain(1);
  });

  it('correctly reports toVal for each option', () => {
    const dice = makeDice(3, 5, 1, 2, 6);
    const opts = enumerateFlipOptions(dice, new Set());
    const die2 = opts.find((o) => o.dieId === 2)!;
    expect(die2.fromVal).toBe(1);
    expect(die2.toVal).toBe(6);
  });
});
