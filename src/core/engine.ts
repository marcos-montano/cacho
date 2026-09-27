/**
 * @file engine.ts
 * Cacho Alalay Game Engine – the central turn state machine.
 *
 * Manages all legal turn transitions, enforces rules, emits typed events.
 * Zero DOM dependency. Communicates with the UI and network layer through
 * the EventEmitter callback pattern.
 *
 * Turn flow:
 *   INIT
 *     → roll1() → ROLLED_1
 *         → standDeMano() → SCORING → scoreCategory() → TURN_COMPLETE
 *         → roll2()       → VOLTEO_MANDATORY
 *             → flipDie(mandatory)  → VOLTEO_OPTIONAL
 *                 → flipDie(optional) or skipOptionalFlip() → SCORING
 *                     → scoreCategory() → TURN_COMPLETE
 */

import { ALL_CATEGORIES, type Category, type Die, type DieFace, type GameEvent, type GameState, type Player, type TurnPhase } from './types';
import { applyFlip, canFlip } from './volteo';
import { calculateScore, computeTotalScore, isGrande } from './scoring';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Returns a random integer in [min, max] inclusive. */
function randomFace(): DieFace {
  return (Math.floor(Math.random() * 6) + 1) as DieFace;
}

/** Deep clone a Die array (avoids accidental mutation across references). */
function cloneDice(dice: Die[]): Die[] {
  return dice.map((d) => ({ ...d }));
}

/** Creates a brand-new 5-die set with random values. */
function freshDice(): Die[] {
  return Array.from({ length: 5 }, (_, i) => ({
    id: i,
    val: randomFace(),
    kept: false,
    flipped: false,
  }));
}

/** Creates a fresh player record. */
export function createPlayer(id: number, name: string, avatar = '🎲'): Player {
  return { id, name, avatar, scores: {}, scratched: new Set<Category>() };
}

// ---------------------------------------------------------------------------
// GameEngine class
// ---------------------------------------------------------------------------

export class GameEngine {
  private state: GameState;
  private listeners: Array<(event: GameEvent) => void> = [];

  // ------------------------------------------------------------------
  // Construction & initial state
  // ------------------------------------------------------------------

  constructor(players: Player[]) {
    if (players.length < 2 || players.length > 6) {
      throw new RangeError('Cacho requires 2–6 players.');
    }
    this.state = {
      players,
      activePlayerIndex: 0,
      turnPhase: 'INIT',
      dice: freshDice(),
      rollsUsed: 0,
      isDeMano: false,
      flipsDone: 0,
      flippedDieIds: new Set(),
      roomCode: '',
      gameOver: false,
    };
  }

  // ------------------------------------------------------------------
  // Event bus
  // ------------------------------------------------------------------

  /** Subscribe to game events (UI, network adapter). */
  on(listener: (event: GameEvent) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private emit(event: GameEvent): void {
    for (const listener of this.listeners) listener(event);
  }

  // ------------------------------------------------------------------
  // State access (read-only snapshot)
  // ------------------------------------------------------------------

  /** Returns a deep-cloned snapshot of the current game state (safe for UI). */
  getState(): GameState {
    return {
      ...this.state,
      dice: cloneDice(this.state.dice),
      players: this.state.players.map((p) => ({
        ...p,
        scores: { ...p.scores },
        scratched: new Set(p.scratched),
      })),
      flippedDieIds: new Set(this.state.flippedDieIds),
    };
  }

  /** Restores the engine to an exact state (used for multiplayer sync). */
  restoreState(state: GameState): void {
    this.state = {
      ...state,
      dice: cloneDice(state.dice),
      players: state.players.map((p) => ({
        ...p,
        scores: { ...p.scores },
        scratched: new Set(p.scratched),
      })),
      flippedDieIds: new Set(state.flippedDieIds),
    };
  }

  private get active(): Player {
    return this.state.players[this.state.activePlayerIndex];
  }

  // ------------------------------------------------------------------
  // Assertions
  // ------------------------------------------------------------------

  private assertPhase(...allowed: TurnPhase[]): void {
    if (!allowed.includes(this.state.turnPhase)) {
      throw new Error(
        `Action not allowed in phase "${this.state.turnPhase}". Expected: ${allowed.join(' | ')}`,
      );
    }
  }

  private assertGameActive(): void {
    if (this.state.gameOver) throw new Error('Match is already over.');
  }

  // ------------------------------------------------------------------
  // Roll 1
  // ------------------------------------------------------------------

  /**
   * Performs the first roll of the turn.
   * All 5 dice are (re)rolled with random values.
   * Detects La Dormida (Five of a Kind on Roll 1 → instant match win).
   */
  roll1(): void {
    this.assertGameActive();
    this.assertPhase('INIT');

    this.state.dice = freshDice();
    this.state.rollsUsed = 1;
    this.state.isDeMano = false;
    this.emit({ type: 'DICE_ROLLED', dice: cloneDice(this.state.dice) });

    // La Dormida check: Grande on Roll 1 = instant win
    if (isGrande(this.state.dice)) {
      this.state.turnPhase = 'DORMIDA_WIN';
      this.state.gameOver = true;
      this.emit({ type: 'DORMIDA', winnerId: this.active.id });
      const allScores = Object.fromEntries(
        this.state.players.map((p) => [p.id, computeTotalScore(p.scores)]),
      ) as Record<number, number>;
      this.emit({ type: 'GAME_OVER', winnerId: this.active.id, scores: allScores });
      return;
    }

    this.state.turnPhase = 'ROLLED_1';
  }

  // ------------------------------------------------------------------
  // Stand De Mano (skip Roll 2)
  // ------------------------------------------------------------------

  /**
   * Player chooses to stand on Roll 1 without taking Roll 2.
   * Grants the De Mano +5 bonus for Juego combinations.
   * Advances directly to SCORING.
   */
  standDeMano(): void {
    this.assertGameActive();
    this.assertPhase('ROLLED_1');

    this.state.isDeMano = true;
    this.state.turnPhase = 'SCORING';
    this.emit({ type: 'DE_MANO_STOOD' });
  }

  // ------------------------------------------------------------------
  // Toggle die kept (before Roll 2)
  // ------------------------------------------------------------------

  /**
   * Toggles whether a die is "kept" (held on the felt) before Roll 2.
   * Only legal in ROLLED_1 phase.
   */
  toggleKeep(dieId: number): void {
    this.assertGameActive();
    this.assertPhase('ROLLED_1');

    const die = this.state.dice.find((d) => d.id === dieId);
    if (!die) throw new Error(`Die ${dieId} not found.`);
    die.kept = !die.kept;
    this.emit({ type: 'DIE_KEPT', dieId, kept: die.kept });
  }

  // ------------------------------------------------------------------
  // Roll 2
  // ------------------------------------------------------------------

  /**
   * Performs the second roll: re-rolls all dice that are NOT kept.
   * Enters VOLTEO_MANDATORY afterwards.
   */
  roll2(): void {
    this.assertGameActive();
    this.assertPhase('ROLLED_1');

    for (const die of this.state.dice) {
      if (!die.kept) {
        die.val = randomFace();
        die.flipped = false;
      }
    }
    this.state.rollsUsed = 2;
    this.state.isDeMano = false;
    this.emit({ type: 'DICE_ROLLED', dice: cloneDice(this.state.dice) });
    this.state.turnPhase = 'VOLTEO_MANDATORY';
  }

  // ------------------------------------------------------------------
  // Volteo (Die Flip)
  // ------------------------------------------------------------------

  /**
   * Flips one die to its mathematical opposite (7 − face).
   *
   * - In VOLTEO_MANDATORY phase: first flip is required; transitions to VOLTEO_OPTIONAL.
   * - In VOLTEO_OPTIONAL phase: second flip is optional; transitions to SCORING.
   *
   * @throws if the die was already flipped this turn or the phase is wrong.
   */
  flipDie(dieId: number): void {
    this.assertGameActive();
    this.assertPhase('VOLTEO_MANDATORY', 'VOLTEO_OPTIONAL');

    if (!canFlip(dieId, this.state.flippedDieIds)) {
      throw new Error(`Die ${dieId} was already flipped this turn.`);
    }

    const die = this.state.dice.find((d) => d.id === dieId)!;
    const oldVal = die.val;
    applyFlip(this.state.dice, dieId, this.state.flippedDieIds);
    this.state.flippedDieIds.add(dieId);
    this.state.flipsDone++;

    this.emit({ type: 'DIE_FLIPPED', dieId, oldVal, newVal: die.val });

    if (this.state.turnPhase === 'VOLTEO_MANDATORY') {
      this.state.turnPhase = 'VOLTEO_OPTIONAL';
    } else {
      // Second (optional) flip used → go to scoring
      this.state.turnPhase = 'SCORING';
    }
  }

  /**
   * Undoes the last volteo flip. The die is reverted to its pre-flip value.
   *
   * - If undoing from VOLTEO_OPTIONAL (only 1 flip done so far), reverts back to VOLTEO_MANDATORY.
   * - If undoing the 2nd flip (was in SCORING after optional flip), reverts back to VOLTEO_OPTIONAL.
   *
   * @param dieId - The die that was previously flipped and should be unflipped.
   */
  unflipDie(dieId: number): void {
    this.assertGameActive();
    this.assertPhase('VOLTEO_OPTIONAL', 'SCORING');

    if (!this.state.flippedDieIds.has(dieId)) {
      throw new Error(`Die ${dieId} has not been flipped this turn.`);
    }

    const die = this.state.dice.find((d) => d.id === dieId);
    if (!die) throw new Error(`Die ${dieId} not found.`);

    // Flip back (opposite of opposite = original)
    const oldVal = die.val;
    die.val = (7 - die.val) as DieFace;
    die.flipped = false;
    this.state.flippedDieIds.delete(dieId);
    this.state.flipsDone--;

    this.emit({ type: 'DIE_FLIPPED', dieId, oldVal, newVal: die.val });

    if (this.state.turnPhase === 'SCORING') {
      // Undoing the 2nd (optional) flip → back to optional
      this.state.turnPhase = 'VOLTEO_OPTIONAL';
    } else {
      // In VOLTEO_OPTIONAL, undoing the mandatory flip → back to mandatory
      this.state.turnPhase = 'VOLTEO_MANDATORY';
    }
  }

  /**
   * Player skips the optional second volteo flip.
   * Only legal in VOLTEO_OPTIONAL phase.
   */
  skipOptionalFlip(): void {
    this.assertGameActive();
    this.assertPhase('VOLTEO_OPTIONAL');
    this.state.turnPhase = 'SCORING';
  }

  // ------------------------------------------------------------------
  // Scoring / Tachar
  // ------------------------------------------------------------------

  /**
   * Assigns a Taquilla category for the current roll.
   * - If the dice match the category, the calculated points are recorded.
   * - If not, the slot is scratched (Tachar) with 0 pts.
   *
   * After scoring, checks for end-of-match and either ends the game or
   * advances to the next player.
   */
  scoreCategory(category: Category): void {
    this.assertGameActive();
    this.assertPhase('SCORING');

    const player = this.active;

    if (player.scores[category] !== undefined) {
      throw new Error(`Category "${category}" is already filled for ${player.name}.`);
    }

    const points = calculateScore(category, this.state.dice, this.state.isDeMano);
    player.scores[category] = points;

    if (points === 0) {
      player.scratched.add(category);
      this.emit({ type: 'CATEGORY_SCRATCHED', category });
    } else {
      this.emit({ type: 'CATEGORY_SCORED', category, points, isDeMano: this.state.isDeMano });
    }

    this.state.turnPhase = 'TURN_COMPLETE';
    this._advanceTurn();
  }

  // ------------------------------------------------------------------
  // Internal: advance turn / check end
  // ------------------------------------------------------------------

  private _advanceTurn(): void {
    const allDone = this.state.players.every(
      (p) => Object.keys(p.scores).length === ALL_CATEGORIES.length,
    );

    if (allDone) {
      this._endGame();
      return;
    }

    this.state.activePlayerIndex =
      (this.state.activePlayerIndex + 1) % this.state.players.length;
    this._resetTurn();

    this.emit({ type: 'TURN_CHANGED', nextPlayerId: this.active.id });
  }

  private _resetTurn(): void {
    this.state.turnPhase = 'INIT';
    this.state.rollsUsed = 0;
    this.state.isDeMano = false;
    this.state.flipsDone = 0;
    this.state.flippedDieIds = new Set();
    this.state.dice = freshDice();
    this.state.dice.forEach((d) => {
      d.kept = false;
      d.flipped = false;
    });
  }

  private _endGame(): void {
    this.state.gameOver = true;
    const allScores = Object.fromEntries(
      this.state.players.map((p) => [p.id, computeTotalScore(p.scores)]),
    ) as Record<number, number>;
    const winnerId = parseInt(
      Object.entries(allScores).sort(([, a], [, b]) => b - a)[0][0],
      10,
    );
    this.emit({ type: 'GAME_OVER', winnerId, scores: allScores });
  }

  // ------------------------------------------------------------------
  // Player management (add before match starts)
  // ------------------------------------------------------------------

  /**
   * Adds a new player. Only allowed before Roll 1 of the first turn.
   */
  addPlayer(name: string, avatar = '🎲'): Player {
    if (this.state.players.length >= 6) {
      throw new RangeError('Maximum 6 players per table.');
    }
    if (this.state.rollsUsed > 0 || this.state.activePlayerIndex > 0) {
      throw new Error('Cannot add players once the match has started.');
    }
    const id = this.state.players.length + 1;
    const player = createPlayer(id, name, avatar);
    this.state.players.push(player);
    return player;
  }

  /**
   * Resets the entire match with the same player roster.
   */
  resetMatch(): void {
    this.state.players.forEach((p) => {
      p.scores = {};
      p.scratched = new Set();
    });
    this.state.activePlayerIndex = 0;
    this.state.gameOver = false;
    this._resetTurn();
  }
}
