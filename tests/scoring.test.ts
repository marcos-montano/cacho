/**
 * @file scoring.test.ts
 * Unit tests for all Taquilla scoring categories.
 */

import { describe, it, expect } from 'vitest';
import type { Die } from '../src/core/types';
import {
  countFaces,
  isEscalera,
  isFull,
  isPoker,
  isGrande,
  calculateScore,
  computeTotalScore,
  previewAllScores,
} from '../src/core/scoring';

// ---------------------------------------------------------------------------
// Test helper: build a Die array from raw values
// ---------------------------------------------------------------------------

function dice(...vals: number[]): Die[] {
  return vals.map((v, i) => ({ id: i, val: v as Die['val'], kept: false, flipped: false }));
}

// ---------------------------------------------------------------------------
// countFaces
// ---------------------------------------------------------------------------

describe('countFaces', () => {
  it('counts each face correctly', () => {
    const result = countFaces(dice(1, 1, 2, 5, 5));
    expect(result[1]).toBe(2);
    expect(result[2]).toBe(1);
    expect(result[5]).toBe(2);
    expect(result[6]).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// isEscalera
// ---------------------------------------------------------------------------

describe('isEscalera (Straight)', () => {
  it('detects 1-2-3-4-5 in any order', () => {
    expect(isEscalera(dice(3, 1, 5, 2, 4))).toBe(true);
  });

  it('detects 2-3-4-5-6 in any order', () => {
    expect(isEscalera(dice(6, 2, 4, 3, 5))).toBe(true);
  });

  it('rejects non-straights', () => {
    expect(isEscalera(dice(1, 2, 3, 4, 6))).toBe(false);
    expect(isEscalera(dice(1, 1, 2, 3, 4))).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// isFull
// ---------------------------------------------------------------------------

describe('isFull (Full House)', () => {
  it('detects 3+2 correctly', () => {
    expect(isFull(dice(2, 2, 2, 5, 5))).toBe(true);
    expect(isFull(dice(6, 6, 4, 4, 4))).toBe(true);
  });

  it('rejects four of a kind (4+1)', () => {
    expect(isFull(dice(3, 3, 3, 3, 5))).toBe(false);
  });

  it('rejects five of a kind', () => {
    expect(isFull(dice(4, 4, 4, 4, 4))).toBe(false);
  });

  it('rejects random distributions', () => {
    expect(isFull(dice(1, 2, 3, 4, 5))).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// isPoker
// ---------------------------------------------------------------------------

describe('isPoker (Four of a Kind)', () => {
  it('detects 4 of the same', () => {
    expect(isPoker(dice(6, 6, 6, 6, 2))).toBe(true);
  });

  it('detects 5 of the same (also qualifies)', () => {
    expect(isPoker(dice(3, 3, 3, 3, 3))).toBe(true);
  });

  it('rejects 3 of a kind', () => {
    expect(isPoker(dice(5, 5, 5, 1, 2))).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// isGrande
// ---------------------------------------------------------------------------

describe('isGrande (Five of a Kind)', () => {
  it('detects five of the same', () => {
    expect(isGrande(dice(1, 1, 1, 1, 1))).toBe(true);
    expect(isGrande(dice(6, 6, 6, 6, 6))).toBe(true);
  });

  it('rejects four of a kind', () => {
    expect(isGrande(dice(4, 4, 4, 4, 2))).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// calculateScore – numeric categories
// ---------------------------------------------------------------------------

describe('calculateScore – number categories', () => {
  it('scores ones (Balas)', () => {
    expect(calculateScore('ones', dice(1, 1, 1, 3, 5), false)).toBe(3);
    expect(calculateScore('ones', dice(2, 3, 4, 5, 6), false)).toBe(0);
  });

  it('scores twos (Tontos)', () => {
    expect(calculateScore('twos', dice(2, 2, 3, 4, 5), false)).toBe(4);
  });

  it('scores threes (Trenes)', () => {
    expect(calculateScore('threes', dice(3, 3, 3, 1, 2), false)).toBe(9);
  });

  it('scores fours (Cuadras)', () => {
    expect(calculateScore('fours', dice(4, 4, 4, 4, 1), false)).toBe(16);
  });

  it('scores fives (Quinas)', () => {
    expect(calculateScore('fives', dice(5, 5, 5, 5, 5), false)).toBe(25);
  });

  it('scores sixes (Senas)', () => {
    expect(calculateScore('sixes', dice(6, 6, 6, 6, 6), false)).toBe(30);
  });
});

// ---------------------------------------------------------------------------
// calculateScore – Escalera
// ---------------------------------------------------------------------------

describe('calculateScore – escalera', () => {
  it('scores 25 pts De Mano', () => {
    expect(calculateScore('escalera', dice(1, 2, 3, 4, 5), true)).toBe(25);
  });

  it('scores 20 pts Volteada', () => {
    expect(calculateScore('escalera', dice(2, 3, 4, 5, 6), false)).toBe(20);
  });

  it('scores 0 if not an Escalera', () => {
    expect(calculateScore('escalera', dice(1, 1, 2, 3, 4), false)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// calculateScore – Full
// ---------------------------------------------------------------------------

describe('calculateScore – full (Full House)', () => {
  it('scores 35 pts De Mano', () => {
    expect(calculateScore('full', dice(3, 3, 3, 6, 6), true)).toBe(35);
  });

  it('scores 30 pts Volteada', () => {
    expect(calculateScore('full', dice(5, 5, 1, 1, 1), false)).toBe(30);
  });

  it('scores 0 if not a Full House', () => {
    expect(calculateScore('full', dice(1, 2, 3, 4, 5), false)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// calculateScore – Póker
// ---------------------------------------------------------------------------

describe('calculateScore – poker (Four of a Kind)', () => {
  it('scores 45 pts De Mano', () => {
    expect(calculateScore('poker', dice(2, 2, 2, 2, 5), true)).toBe(45);
  });

  it('scores 40 pts Volteada', () => {
    expect(calculateScore('poker', dice(6, 6, 6, 6, 1), false)).toBe(40);
  });

  it('scores 0 if only three of a kind', () => {
    expect(calculateScore('poker', dice(4, 4, 4, 1, 2), false)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// calculateScore – Grande
// ---------------------------------------------------------------------------

describe('calculateScore – grande', () => {
  it('scores 50 pts for grande1', () => {
    expect(calculateScore('grande1', dice(5, 5, 5, 5, 5), false)).toBe(50);
  });

  it('scores 50 pts for grande2', () => {
    expect(calculateScore('grande2', dice(1, 1, 1, 1, 1), true)).toBe(50);
  });

  it('scores 0 if not five of a kind', () => {
    expect(calculateScore('grande1', dice(1, 1, 1, 1, 2), false)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// computeTotalScore
// ---------------------------------------------------------------------------

describe('computeTotalScore', () => {
  it('sums all filled category scores', () => {
    const scores = { ones: 3, twos: 6, escalera: 25, full: 0, grande1: 50 };
    expect(computeTotalScore(scores)).toBe(84);
  });

  it('handles an empty scorecard', () => {
    expect(computeTotalScore({})).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// previewAllScores
// ---------------------------------------------------------------------------

describe('previewAllScores', () => {
  it('returns potential points for each open category', () => {
    const d = dice(1, 2, 3, 4, 5); // Escalera
    const preview = previewAllScores(['ones', 'escalera', 'full'], d, true);
    expect(preview.ones).toBe(1);
    expect(preview.escalera).toBe(25);
    expect(preview.full).toBe(0);
  });
});
