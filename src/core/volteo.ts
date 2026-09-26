/**
 * @file volteo.ts
 * El Volteo (The Die Flip) rule implementation.
 *
 * After a player takes their second roll, they enter the Volteo phase:
 *   1. MANDATORY flip: must pick exactly 1 die and flip it to its opposite face.
 *   2. OPTIONAL flip:  may pick a second (different) die and flip it, or skip.
 *
 * Opposite face rule – opposite sides of a standard die always sum to 7:
 *   1 ↔ 6,  2 ↔ 5,  3 ↔ 4
 */

import type { Die, DieFace } from './types';

/** Map from each face value to its mathematical opposite (7 − n). */
export const OPPOSITE: Record<DieFace, DieFace> = {
  1: 6,
  2: 5,
  3: 4,
  4: 3,
  5: 2,
  6: 1,
};

/**
 * Returns the opposite face of a given die value.
 * @example invert(3) → 4
 */
export function invert(val: DieFace): DieFace {
  return OPPOSITE[val];
}

/**
 * Applies a volteo flip to the die with the given id.
 * Mutates the die in-place and marks it as flipped.
 *
 * @throws {Error} if the die was already flipped this turn.
 * @throws {Error} if dieId is not found.
 */
export function applyFlip(dice: Die[], dieId: number, flippedDieIds: Set<number>): Die {
  if (flippedDieIds.has(dieId)) {
    throw new Error(`Die ${dieId} was already flipped this turn.`);
  }
  const die = dice.find((d) => d.id === dieId);
  if (!die) {
    throw new Error(`Die with id ${dieId} not found.`);
  }
  die.val = invert(die.val);
  die.flipped = true;
  return die;
}

/**
 * Returns whether a die is a legal target for a volteo flip.
 * A die may NOT be flipped if it has already been flipped this turn.
 */
export function canFlip(dieId: number, flippedDieIds: Set<number>): boolean {
  return !flippedDieIds.has(dieId);
}

/**
 * Describes all possible single-die flips and the resulting dice array.
 * Useful for the "Volteo Assistant" hint system.
 *
 * @param dice       Current dice state.
 * @param flippedIds Die IDs already flipped this turn.
 * @returns Array of { dieId, afterFlip[] } objects for each flippable die.
 */
export function enumerateFlipOptions(
  dice: Die[],
  flippedIds: Set<number>,
): Array<{ dieId: number; fromVal: DieFace; toVal: DieFace }> {
  return dice
    .filter((d) => canFlip(d.id, flippedIds))
    .map((d) => ({
      dieId: d.id,
      fromVal: d.val,
      toVal: invert(d.val),
    }));
}
