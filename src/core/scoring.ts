/**
 * @file scoring.ts
 * Pure scoring logic for all Cacho Alalay Taquilla categories.
 *
 * Each function takes the current 5-die values and returns the point value
 * for that category. They are PURE FUNCTIONS – no side effects, no DOM.
 *
 * De Mano bonus (+5 pts) applies to Juegos (Escalera, Full, Póker) when
 * the player chose to stand on Roll 1 without taking Roll 2.
 */

import type { Category, Die, DieFace } from './types';

// ---------------------------------------------------------------------------
// Face-count helper
// ---------------------------------------------------------------------------

/** Returns a map of { face: count } for the given dice values. */
export function countFaces(dice: Die[]): Record<DieFace, number> {
  const counts: Record<DieFace, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
  for (const d of dice) {
    counts[d.val]++;
  }
  return counts;
}

// ---------------------------------------------------------------------------
// Combination detectors (return boolean)
// ---------------------------------------------------------------------------

/**
 * Escalera (Straight): 1-2-3-4-5 or 2-3-4-5-6.
 */
export function isEscalera(dice: Die[]): boolean {
  const sorted = dice
    .map((d) => d.val)
    .sort((a, b) => a - b)
    .join('');
  return sorted === '12345' || sorted === '23456';
}

/**
 * Full House: 3 of one face + 2 of another.
 */
export function isFull(dice: Die[]): boolean {
  const counts = Object.values(countFaces(dice)).filter((c) => c > 0).sort();
  return counts.length === 2 && counts[0] === 2 && counts[1] === 3;
}

/**
 * Póker (Four of a Kind): at least 4 dice showing the same face.
 */
export function isPoker(dice: Die[]): boolean {
  return Object.values(countFaces(dice)).some((c) => c >= 4);
}

/**
 * Grande (Five of a Kind): all 5 dice showing the same face.
 */
export function isGrande(dice: Die[]): boolean {
  return Object.values(countFaces(dice)).some((c) => c === 5);
}

// ---------------------------------------------------------------------------
// Per-category point calculators
// ---------------------------------------------------------------------------

/**
 * Score for numeric categories (Balas, Tontos, Trenes, Cuadras, Quinas, Senas).
 * Simply sums all dice showing the target face.
 */
export function scoreNumeric(face: DieFace, dice: Die[]): number {
  return countFaces(dice)[face] * face;
}

/**
 * Score for Escalera.
 * De Mano: 25 pts | Volteada (Roll 2 taken): 20 pts.
 */
export function scoreEscalera(dice: Die[], isDeMano: boolean): number {
  if (!isEscalera(dice)) return 0;
  return isDeMano ? 25 : 20;
}

/**
 * Score for Full House.
 * De Mano: 35 pts | Volteada: 30 pts.
 */
export function scoreFull(dice: Die[], isDeMano: boolean): number {
  if (!isFull(dice)) return 0;
  return isDeMano ? 35 : 30;
}

/**
 * Score for Póker (Four of a Kind).
 * De Mano: 45 pts | Volteada: 40 pts.
 */
export function scorePoker(dice: Die[], isDeMano: boolean): number {
  if (!isPoker(dice)) return 0;
  return isDeMano ? 45 : 40;
}

/**
 * Score for Grande (Five of a Kind) – same for both Grande 1 and Grande 2 slots.
 * Always 50 pts regardless of De Mano status.
 *
 * Note: La Dormida (Grande on Roll 1) triggers an instant match win and is
 * handled at the engine level, not here.
 */
export function scoreGrande(dice: Die[]): number {
  return isGrande(dice) ? 50 : 0;
}

// ---------------------------------------------------------------------------
// Unified calculator – resolves any category
// ---------------------------------------------------------------------------

/**
 * Calculates the score the current dice would earn in the given category.
 * Returns 0 when the combination does not match (player may Tachar with 0).
 *
 * @param category - The Taquilla slot to evaluate.
 * @param dice     - Current 5 dice.
 * @param isDeMano - True if the player stood on Roll 1 (qualifies for bonus pts).
 */
export function calculateScore(
  category: Category,
  dice: Die[],
  isDeMano: boolean,
): number {
  switch (category) {
    case 'ones':     return scoreNumeric(1, dice);
    case 'twos':     return scoreNumeric(2, dice);
    case 'threes':   return scoreNumeric(3, dice);
    case 'fours':    return scoreNumeric(4, dice);
    case 'fives':    return scoreNumeric(5, dice);
    case 'sixes':    return scoreNumeric(6, dice);
    case 'escalera': return scoreEscalera(dice, isDeMano);
    case 'full':     return scoreFull(dice, isDeMano);
    case 'poker':    return scorePoker(dice, isDeMano);
    case 'grande1':
    case 'grande2':  return scoreGrande(dice);
    default:         return 0;
  }
}

/**
 * Returns a map of { category → potentialPoints } for all open categories.
 * Used by the score-preview hint system in the UI.
 *
 * @param openCategories - Categories not yet filled or scratched.
 * @param dice           - Current dice.
 * @param isDeMano       - De Mano status this turn.
 */
export function previewAllScores(
  openCategories: Category[],
  dice: Die[],
  isDeMano: boolean,
): Partial<Record<Category, number>> {
  const preview: Partial<Record<Category, number>> = {};
  for (const cat of openCategories) {
    preview[cat] = calculateScore(cat, dice, isDeMano);
  }
  return preview;
}

/**
 * Computes the total score for a player from their filled scorecard.
 */
export function computeTotalScore(scores: Partial<Record<Category, number>>): number {
  return Object.values(scores).reduce<number>((sum, pts) => sum + (pts ?? 0), 0);
}
