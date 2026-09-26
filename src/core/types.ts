/**
 * @file types.ts
 * Core TypeScript interfaces and enums for the Cacho Alalay game engine.
 * All game state, dice, players, and network events are typed here.
 * Zero DOM dependency – safe to use in tests, engine, and network adapters.
 */

// ---------------------------------------------------------------------------
// Dice
// ---------------------------------------------------------------------------

/** Values a single die can show: 1–6. */
export type DieFace = 1 | 2 | 3 | 4 | 5 | 6;

/** A single die object tracked during a player's turn. */
export interface Die {
  /** Die index (0–4). */
  id: number;
  /** Current face value. */
  val: DieFace;
  /** Whether the player has selected this die to keep before Roll 2. */
  kept: boolean;
  /** Whether this die was flipped during El Volteo phase. */
  flipped: boolean;
}

// ---------------------------------------------------------------------------
// Scoring Categories (La Taquilla)
// ---------------------------------------------------------------------------

/**
 * All 11 scoring categories in the 3×3 Taquilla scorecard.
 *
 * Column 1 – Chicos (Low numbers):   ones, twos, threes
 * Column 2 – Juegos (Combinations):  escalera, full, poker
 * Column 3 – Grandes (High numbers): fours, fives, sixes
 * Bottom   – Grande 1 & 2:           grande1, grande2
 */
export type Category =
  | 'ones'     // Balas  (1s)
  | 'twos'     // Tontos (2s)
  | 'threes'   // Trenes (3s)
  | 'fours'    // Cuadras (4s)
  | 'fives'    // Quinas  (5s)
  | 'sixes'    // Senas   (6s)
  | 'escalera' // Straight (1-2-3-4-5 or 2-3-4-5-6)
  | 'full'     // Full House (3+2)
  | 'poker'    // Four of a Kind
  | 'grande1'  // Five of a Kind – first slot
  | 'grande2'; // Five of a Kind – second slot

/** Ordered list of all categories (matches left-to-right, top-to-bottom taquilla). */
export const ALL_CATEGORIES: Category[] = [
  'ones', 'twos', 'threes',
  'escalera', 'full', 'poker',
  'fours', 'fives', 'sixes',
  'grande1', 'grande2',
];

// ---------------------------------------------------------------------------
// Turn Phase State Machine
// ---------------------------------------------------------------------------

/**
 * The turn progresses through these phases in order:
 *
 * INIT → ROLLED_1 → (optionally) VOLTEO_MANDATORY → VOLTEO_OPTIONAL → SCORING → TURN_COMPLETE
 *
 * If the player stands "De Mano" after Roll 1, it jumps directly to SCORING.
 * If La Dormida is rolled on Roll 1, the phase jumps to DORMIDA_WIN.
 */
export type TurnPhase =
  | 'INIT'              // Waiting for Roll 1
  | 'ROLLED_1'          // Roll 1 done; choose De Mano or take Roll 2
  | 'VOLTEO_MANDATORY'  // Roll 2 done; MUST flip exactly 1 die
  | 'VOLTEO_OPTIONAL'   // Mandatory flip done; MAY flip 1 more die (or skip)
  | 'SCORING'           // Select a Taquilla category (or Tachar)
  | 'DORMIDA_WIN'       // Five of a Kind on Roll 1 → instant match win
  | 'TURN_COMPLETE';    // Turn finished; hand off to next player

// ---------------------------------------------------------------------------
// Player
// ---------------------------------------------------------------------------

/** A player record. */
export interface Player {
  /** Unique numeric identifier. */
  id: number;
  /** Display name (editable). */
  name: string;
  /** Emoji or text avatar shown next to the player. */
  avatar: string;
  /**
   * Maps each filled category to points scored.
   * 0 means the slot was "tachado" (scratched with an X).
   * Missing key means the slot is still open.
   */
  scores: Partial<Record<Category, number>>;
  /** Set of categories that were explicitly scratched (Tachar). */
  scratched: Set<Category>;
}

// ---------------------------------------------------------------------------
// Match-Level Game State
// ---------------------------------------------------------------------------

export interface GameState {
  /** All participating players in seat order. */
  players: Player[];
  /** Index into players[] indicating whose turn it is. */
  activePlayerIndex: number;
  /** Current turn phase. */
  turnPhase: TurnPhase;
  /** The 5 dice on the table. */
  dice: Die[];
  /** How many rolls have been used this turn (0, 1, or 2). */
  rollsUsed: number;
  /**
   * True if Roll 1 was kept as "De Mano" (no Roll 2 taken).
   * Qualifies juego combinations for the +5 pt bonus.
   */
  isDeMano: boolean;
  /** How many volteo flips have been performed this turn (0, 1, or 2). */
  flipsDone: number;
  /** Die IDs flipped so far this turn (prevents flipping the same die twice). */
  flippedDieIds: Set<number>;
  /** Room code for online play (empty string when local-only). */
  roomCode: string;
  /** Whether the match has ended. */
  gameOver: boolean;
}

// ---------------------------------------------------------------------------
// Events emitted by the game engine (used by UI and network adapter)
// ---------------------------------------------------------------------------

export type GameEvent =
  | { type: 'DICE_ROLLED'; dice: Die[] }
  | { type: 'DIE_KEPT'; dieId: number; kept: boolean }
  | { type: 'DIE_FLIPPED'; dieId: number; oldVal: DieFace; newVal: DieFace }
  | { type: 'DE_MANO_STOOD' }
  | { type: 'CATEGORY_SCORED'; category: Category; points: number; isDeMano: boolean }
  | { type: 'CATEGORY_SCRATCHED'; category: Category }
  | { type: 'DORMIDA'; winnerId: number }
  | { type: 'GAME_OVER'; winnerId: number; scores: Record<number, number> }
  | { type: 'TURN_CHANGED'; nextPlayerId: number };
