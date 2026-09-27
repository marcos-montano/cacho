/**
 * @file main.ts
 * Cacho Alalay – Application entry point.
 *
 * Manages three screens:
 *   1. #screen-setup   → Player setup (names, avatars)
 *   2. #screen-game    → Live game (dice, scoreboard, action bar)
 *   3. #screen-gameover → Winner announcement + final scores
 *
 * Orchestrates GameEngine, all UI components, overlays, and animations.
 */

import './style.css';

import { GameEngine, createPlayer } from './core/engine';
import type { Category, GameState, Player } from './core/types';
import { ALL_CATEGORIES } from './core/types';
import { calculateScore, previewAllScores } from './core/scoring';

import { DiceArea } from './ui/components/dice';
import { Scoreboard } from './ui/components/scoreboard';
import { ActionBar } from './ui/components/actionbar';
import { PlayerBar } from './ui/components/playerbar';
import { Toast } from './ui/components/toast';
import { fireConfetti } from './ui/animations/confetti';

// ---------------------------------------------------------------------------
// Available avatars
// ---------------------------------------------------------------------------
const AVATARS = [
  '🎲','🎯','🦁','🐯','🦊','🐻','🐼','🦅','🦜','🐉',
  '⭐','🌙','🔥','❄️','🌊','🌴','🏆','💎','👑','🎭',
];

// Default player names
const DEFAULT_NAMES = ['Jugador 1', 'Jugador 2', 'Jugador 3', 'Jugador 4', 'Jugador 5', 'Jugador 6'];

// ---------------------------------------------------------------------------
// Reactive player config for setup screen
// ---------------------------------------------------------------------------
interface PlayerConfig {
  name: string;
  avatar: string;
}

let setupPlayers: PlayerConfig[] = [
  { name: 'Jugador 1', avatar: '🎲' },
  { name: 'Jugador 2', avatar: '🎯' },
];

// ---------------------------------------------------------------------------
// Engine & component references (initialized when game starts)
// ---------------------------------------------------------------------------
let engine: GameEngine | null = null;
let diceArea: DiceArea | null = null;
let scoreboard: Scoreboard | null = null;
let actionBar: ActionBar | null = null;
let playerBar: PlayerBar | null = null;
const toast = new Toast();

// Flip mode: during volteo phases, clicking a die flips it instead of keeping it
let flipMode = false;

// ---------------------------------------------------------------------------
// HTML skeleton injection
// ---------------------------------------------------------------------------

function buildHTML(): void {
  document.getElementById('app')!.innerHTML = `
    <!-- ── Setup Screen ─────────────────────── -->
    <div id="screen-setup" class="screen active">
      <header class="app-header">
        <div class="app-logo">Cacho Alalay</div>
        <div class="app-subtitle">Juego Boliviano de Dados · Dice Game</div>
      </header>

      <div class="setup-card">
        <h2>¿Quiénes juegan?</h2>
        <div id="player-list" class="player-list"></div>
        <button id="btn-add-player" class="btn-add-player">＋ Add Player</button>
        <button id="btn-start-game" class="btn-start-game">🎲 Start Game</button>
      </div>
    </div>

    <!-- ── Game Screen ──────────────────────── -->
    <div id="screen-game" class="screen">
      <div class="game-layout">
        <!-- Player bar -->
        <div id="player-bar-mount"></div>

        <!-- Main game area -->
        <div class="game-main">
          <!-- Phase banner -->
          <div id="phase-banner" class="phase-banner">
            <div id="phase-player" class="phase-player"></div>
            <div id="phase-label" class="phase-label"></div>
            <div id="phase-hint"  class="phase-hint"></div>
          </div>

          <!-- Dice -->
          <div id="dice-mount"></div>

          <!-- Scoreboard -->
          <div id="scoreboard-mount"></div>
        </div>

        <!-- Action bar -->
        <div id="action-bar-mount"></div>
      </div>
    </div>

    <!-- ── Game Over Screen ──────────────────── -->
    <div id="screen-gameover" class="screen">
      <header class="app-header">
        <div class="app-logo">Cacho Alalay</div>
      </header>
      <div class="gameover-card">
        <div class="winner-trophy">🏆</div>
        <div id="winner-name"  class="winner-name"></div>
        <div id="winner-sub"   class="winner-sub">¡Ganador!</div>
        <div id="final-scores" class="final-scores"></div>
        <button id="btn-play-again" class="btn-play-again">🎲 Play Again</button>
      </div>
    </div>

    <!-- ── Pass Device Overlay ───────────────── -->
    <div id="overlay-pass" class="overlay hidden">
      <div class="overlay-card">
        <div class="overlay-emoji">🤲</div>
        <div id="overlay-pass-title"    class="overlay-title"></div>
        <div id="overlay-pass-subtitle" class="overlay-subtitle"></div>
        <button id="overlay-pass-btn" class="overlay-btn">Listo – ¡A jugar!</button>
      </div>
    </div>

    <!-- ── La Dormida Overlay ────────────────── -->
    <div id="overlay-dormida" class="overlay hidden dormida-overlay">
      <div class="overlay-card">
        <div class="overlay-emoji">😴✨</div>
        <div class="overlay-title">¡La Dormida!</div>
        <div id="overlay-dormida-subtitle" class="overlay-subtitle"></div>
        <button id="overlay-dormida-btn" class="overlay-btn">Ver Resultados</button>
      </div>
    </div>
  `;
}

// ---------------------------------------------------------------------------
// Screen routing
// ---------------------------------------------------------------------------

type ScreenId = 'screen-setup' | 'screen-game' | 'screen-gameover';

function showScreen(id: ScreenId): void {
  document.querySelectorAll<HTMLElement>('.screen').forEach((el) => el.classList.remove('active'));
  document.getElementById(id)?.classList.add('active');
  window.scrollTo(0, 0);
}

// ---------------------------------------------------------------------------
// Setup screen
// ---------------------------------------------------------------------------

function renderSetupScreen(): void {
  const list = document.getElementById('player-list')!;
  list.innerHTML = '';

  setupPlayers.forEach((p, i) => {
    const row = document.createElement('div');
    row.className = 'player-row';
    row.id = `setup-player-row-${i}`;

    // Avatar button
    const avatarBtn = document.createElement('button');
    avatarBtn.className = 'player-avatar-btn';
    avatarBtn.id = `avatar-btn-${i}`;
    avatarBtn.textContent = p.avatar;
    avatarBtn.title = 'Change avatar';
    avatarBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleAvatarPicker(i, avatarBtn);
    });

    // Name input
    const nameInput = document.createElement('input');
    nameInput.className = 'player-name-input';
    nameInput.id = `player-name-${i}`;
    nameInput.type = 'text';
    nameInput.placeholder = DEFAULT_NAMES[i] ?? `Player ${i + 1}`;
    nameInput.value = p.name;
    nameInput.maxLength = 16;
    nameInput.addEventListener('input', () => {
      setupPlayers[i].name = (nameInput.value.trim() || DEFAULT_NAMES[i]) ?? `Player ${i + 1}`;
    });

    // Remove button (only if >2 players)
    const removeBtn = document.createElement('button');
    removeBtn.className = 'player-remove-btn';
    removeBtn.id = `remove-player-${i}`;
    removeBtn.textContent = '✕';
    removeBtn.title = 'Remove player';
    removeBtn.disabled = setupPlayers.length <= 2;
    removeBtn.addEventListener('click', () => {
      setupPlayers.splice(i, 1);
      renderSetupScreen();
    });

    row.append(avatarBtn, nameInput, removeBtn);
    list.appendChild(row);
  });

  const addBtn = document.getElementById('btn-add-player') as HTMLButtonElement;
  addBtn.disabled = setupPlayers.length >= 6;
}

function toggleAvatarPicker(playerIndex: number, anchorBtn: HTMLElement): void {
  // Remove any existing picker
  document.querySelectorAll('.avatar-picker-popup').forEach((el) => el.remove());

  const picker = document.createElement('div');
  picker.className = 'avatar-picker-popup';

  AVATARS.forEach((emoji) => {
    const btn = document.createElement('button');
    btn.className = 'avatar-option';
    btn.textContent = emoji;
    btn.addEventListener('click', () => {
      setupPlayers[playerIndex].avatar = emoji;
      picker.remove();
      renderSetupScreen();
    });
    picker.appendChild(btn);
  });

  anchorBtn.parentElement!.style.position = 'relative';
  anchorBtn.parentElement!.appendChild(picker);

  // Close on outside click
  setTimeout(() => {
    document.addEventListener('click', () => picker.remove(), { once: true });
  }, 10);
}

function initSetupListeners(): void {
  document.getElementById('btn-add-player')!.addEventListener('click', () => {
    if (setupPlayers.length < 6) {
      const i = setupPlayers.length;
      setupPlayers.push({
        name: DEFAULT_NAMES[i] ?? `Player ${i + 1}`,
        avatar: AVATARS[i % AVATARS.length],
      });
      renderSetupScreen();
    }
  });

  document.getElementById('btn-start-game')!.addEventListener('click', () => {
    startGame();
  });
}

// ---------------------------------------------------------------------------
// Game initialization
// ---------------------------------------------------------------------------

function startGame(): void {
  // Create engine with configured players
  const players: Player[] = setupPlayers.map((p, i) =>
    createPlayer(i + 1, (p.name || DEFAULT_NAMES[i]) ?? `Player ${i + 1}`, p.avatar),
  );

  engine = new GameEngine(players);

  // Mount components
  const diceMount = document.getElementById('dice-mount')!;
  diceMount.innerHTML = '';
  const diceContainer = document.createElement('div');
  diceMount.appendChild(diceContainer);
  diceArea = new DiceArea(diceContainer, { onDieClick: handleDieClick });

  const playerBarMount = document.getElementById('player-bar-mount')!;
  playerBarMount.innerHTML = '';
  const pbContainer = document.createElement('div');
  playerBarMount.appendChild(pbContainer);
  playerBar = new PlayerBar(pbContainer);

  const scoreboardMount = document.getElementById('scoreboard-mount')!;
  scoreboardMount.innerHTML = '';
  scoreboard = new Scoreboard(scoreboardMount, { onCategoryClick: handleCategoryClick });

  const actionBarMount = document.getElementById('action-bar-mount')!;
  actionBarMount.innerHTML = '';
  const abContainer = document.createElement('div');
  actionBarMount.appendChild(abContainer);
  actionBar = new ActionBar(abContainer, {
    onRoll1: handleRoll1,
    onRoll2: handleRoll2,
    onStandDeMano: handleStandDeMano,
    onSkipFlip: handleSkipFlip,
  });

  // Track whether La Dormida triggered to avoid double game-over screen
  let dormidaFired = false;

  // Subscribe to engine events
  engine.on((event) => {
    const state = engine!.getState();
    switch (event.type) {
      case 'DICE_ROLLED':
        diceArea?.animateRoll(event.dice);
        break;
      case 'DIE_FLIPPED':
        diceArea?.animateFlip(event.dieId);
        toast.show(`↕ ${state.players[state.activePlayerIndex].name} flipped a die`);
        break;
      case 'DE_MANO_STOOD':
        toast.show('✋ Standing De Mano — +5 bonus for Juegos!');
        break;
      case 'CATEGORY_SCORED':
        toast.show(`✅ ${event.category.toUpperCase()}: +${event.points} pts${event.isDeMano ? ' (De Mano bonus!)' : ''}`);
        break;
      case 'CATEGORY_SCRATCHED':
        toast.show(`✕ ${event.category.toUpperCase()} scratched (Tachar)`);
        break;
      case 'DORMIDA':
        dormidaFired = true;
        showDormidaOverlay(state);
        break;
      case 'TURN_CHANGED':
        showPassDeviceOverlay(state);
        break;
      case 'GAME_OVER':
        if (!dormidaFired) {
          // Small delay to let scoring toast clear
          setTimeout(() => showGameOver(event.winnerId, event.scores, state), 500);
        }
        break;
    }
    syncUI();
  });

  flipMode = false;
  showScreen('screen-game');
  syncUI();
}

// ---------------------------------------------------------------------------
// UI sync — called after every engine action
// ---------------------------------------------------------------------------

function syncUI(): void {
  if (!engine) return;
  const state = engine.getState();
  const phase = state.turnPhase;
  const activePlayer = state.players[state.activePlayerIndex];

  // Player bar
  playerBar?.render(state.players, state.activePlayerIndex);

  // Phase banner
  updatePhaseBanner(state);

  // Dice — determine mode
  const diceMode =
    phase === 'SCORING' || phase === 'TURN_COMPLETE' ? 'locked' :
    phase === 'VOLTEO_MANDATORY' || phase === 'VOLTEO_OPTIONAL' ? 'flipping' :
    'idle';
  diceArea?.render(state.dice, diceMode);

  // Determine if we're in scoring phase and compute potentials
  const isScoring = phase === 'SCORING';
  let potentials: Partial<Record<Category, number>> = {};
  if (isScoring) {
    const openCats = ALL_CATEGORIES.filter((c) => activePlayer.scores[c] === undefined);
    potentials = previewAllScores(openCats, state.dice, state.isDeMano);
  }

  // Scoreboard
  scoreboard?.render(state.players, isScoring, potentials, state.activePlayerIndex);

  // Action bar
  flipMode = phase === 'VOLTEO_MANDATORY' || phase === 'VOLTEO_OPTIONAL';
  actionBar?.render(phase, flipMode);
}

function updatePhaseBanner(state: GameState): void {
  const phase = state.turnPhase;
  const activePlayer = state.players[state.activePlayerIndex];

  const playerEl  = document.getElementById('phase-player')!;
  const labelEl   = document.getElementById('phase-label')!;
  const hintEl    = document.getElementById('phase-hint')!;

  playerEl.textContent = `${activePlayer.avatar} ${activePlayer.name}'s Turn`;

  const labels: Partial<Record<typeof phase, { label: string; hint: string }>> = {
    INIT:             { label: '🎲 Roll the dice!',             hint: 'Press Roll Dice to begin your turn' },
    ROLLED_1:         { label: '🤔 Choose your move',           hint: 'Keep dice, Stand De Mano, or Roll Again' },
    VOLTEO_MANDATORY: { label: '↕ El Volteo — Flip a die',      hint: 'You must flip exactly one die to its opposite face' },
    VOLTEO_OPTIONAL:  { label: '↕ El Volteo — Optional flip',   hint: 'Flip one more die, or Skip to scoring' },
    SCORING:          { label: '📝 Choose a Taquilla category',  hint: 'Click a row in the scoreboard' },
    TURN_COMPLETE:    { label: '✓ Turn complete',                hint: 'Passing to next player...' },
    DORMIDA_WIN:      { label: '😴 ¡La Dormida!',               hint: 'Five of a kind on Roll 1 — instant win!' },
  };

  const info = labels[phase] ?? { label: phase, hint: '' };
  labelEl.textContent = info.label;
  hintEl.textContent  = state.isDeMano ? '✋ De Mano — eligible for +5 bonus' : info.hint;
}

// ---------------------------------------------------------------------------
// Engine action handlers
// ---------------------------------------------------------------------------

function handleRoll1(): void {
  try { engine?.roll1(); } catch (e) { toast.show(`⚠️ ${(e as Error).message}`); }
}

function handleRoll2(): void {
  try { engine?.roll2(); } catch (e) { toast.show(`⚠️ ${(e as Error).message}`); }
  syncUI();
}

function handleStandDeMano(): void {
  try { engine?.standDeMano(); } catch (e) { toast.show(`⚠️ ${(e as Error).message}`); }
}

function handleSkipFlip(): void {
  try { engine?.skipOptionalFlip(); } catch (e) { toast.show(`⚠️ ${(e as Error).message}`); }
}

function handleDieClick(dieId: number): void {
  if (!engine) return;
  const state = engine.getState();
  const phase = state.turnPhase;

  if (phase === 'ROLLED_1') {
    // Toggle keep
    try {
      engine.toggleKeep(dieId);
      syncUI();
    } catch (e) {
      toast.show(`⚠️ ${(e as Error).message}`);
    }
  } else if (phase === 'VOLTEO_MANDATORY' || phase === 'VOLTEO_OPTIONAL') {
    // Flip die
    try {
      engine.flipDie(dieId);
    } catch (e) {
      toast.show(`⚠️ ${(e as Error).message}`);
    }
  }
}

function handleCategoryClick(cat: Category): void {
  if (!engine) return;
  const state = engine.getState();

  if (state.turnPhase !== 'SCORING') return;

  const activePlayer = state.players[state.activePlayerIndex];
  if (activePlayer.scores[cat] !== undefined) {
    toast.show('⚠️ That category is already filled!');
    return;
  }

  // Calculate what the score would be
  const pts = calculateScore(cat, state.dice, state.isDeMano);

  if (pts === 0) {
    // Confirm scratch (Tachar)
    const confirmed = window.confirm(
      `The dice don't match "${cat}". Score 0 (Tachar ✕)?`,
    );
    if (!confirmed) return;
  }

  try {
    engine.scoreCategory(cat);
  } catch (e) {
    toast.show(`⚠️ ${(e as Error).message}`);
  }
}

// ---------------------------------------------------------------------------
// Overlays
// ---------------------------------------------------------------------------

function showPassDeviceOverlay(state: GameState): void {
  const overlay = document.getElementById('overlay-pass')!;
  const titleEl  = document.getElementById('overlay-pass-title')!;
  const subEl    = document.getElementById('overlay-pass-subtitle')!;

  const nextPlayer = state.players[state.activePlayerIndex];
  titleEl.textContent = `${nextPlayer.avatar} ${nextPlayer.name}`;
  subEl.textContent   = `It's your turn! Pass the device and press Ready.`;

  overlay.classList.remove('hidden');

  document.getElementById('overlay-pass-btn')!.onclick = () => {
    overlay.classList.add('hidden');
    syncUI();
  };
}

function showDormidaOverlay(state: GameState): void {
  const overlay = document.getElementById('overlay-dormida')!;
  const subEl   = document.getElementById('overlay-dormida-subtitle')!;
  const winner  = state.players[state.activePlayerIndex];

  subEl.textContent = `${winner.avatar} ${winner.name} rolled Five of a Kind on the first roll! Instant victory!`;
  overlay.classList.remove('hidden');
  fireConfetti(120);

  document.getElementById('overlay-dormida-btn')!.onclick = () => {
    overlay.classList.add('hidden');
    // Show game over — compute total scores
    const scores: Record<number, number> = {};
    for (const p of state.players) {
      scores[p.id] = 0; // Dormida: winner wins instantly, others 0
    }
    showGameOver(winner.id, scores, state);
  };
}

// ---------------------------------------------------------------------------
// Game Over screen
// ---------------------------------------------------------------------------

function showGameOver(
  winnerId: number,
  scores: Record<number, number>,
  state: GameState,
): void {
  showScreen('screen-gameover');
  fireConfetti(100);

  const winner = state.players.find((p) => p.id === winnerId)!;
  document.getElementById('winner-name')!.textContent = `${winner.avatar} ${winner.name}`;

  const finalScoresEl = document.getElementById('final-scores')!;
  finalScoresEl.innerHTML = '';

  // Sort by score descending
  const sorted = [...state.players].sort((a, b) => (scores[b.id] ?? 0) - (scores[a.id] ?? 0));

  for (const player of sorted) {
    const row = document.createElement('div');
    row.className = 'final-score-row' + (player.id === winnerId ? ' winner-row' : '');

    const info = document.createElement('div');
    info.className = 'final-player-info';
    info.innerHTML = `<span class="final-avatar">${player.avatar}</span><span class="final-name">${player.name}</span>`;

    const pts = document.createElement('div');
    pts.className = 'final-pts';
    pts.textContent = `${scores[player.id] ?? 0} pts`;

    row.appendChild(info);
    row.appendChild(pts);
    finalScoresEl.appendChild(row);
  }

  document.getElementById('btn-play-again')!.onclick = () => {
    // Reset to setup with same players
    showScreen('screen-setup');
  };
}

// ---------------------------------------------------------------------------
// Bootstrap
// ---------------------------------------------------------------------------

buildHTML();
renderSetupScreen();
initSetupListeners();
