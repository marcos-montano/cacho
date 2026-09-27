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
import { PeerAdapter, generateRoomCode, type NetworkAdapter } from './core/network';
import QRCode from 'qrcode';

import { DiceArea } from './ui/components/dice';
import { Scoreboard } from './ui/components/scoreboard';
import { ActionBar } from './ui/components/actionbar';
import { PlayerBar } from './ui/components/playerbar';
import { Toast } from './ui/components/toast';
import { HowToPlayModal } from './ui/components/howtoplay';
import { VolteoAssistant } from './ui/components/volteo_assistant';
import { Leaderboard } from './ui/components/leaderboard';
import { fireConfetti } from './ui/animations/confetti';

// ---------------------------------------------------------------------------
// Language state (shared globally so scoreboard / hints follow it)
// ---------------------------------------------------------------------------
export type Lang = 'es' | 'en';
let currentLang: Lang = 'es';

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
const howToPlay = new HowToPlayModal();
const leaderboard = new Leaderboard();
let volteoAssistant: VolteoAssistant | null = null;

let network: NetworkAdapter | null = null;
let isHost: boolean = false;
let myPlayerId: number | null = null; // Used to block inputs if it's not our turn in multiplayer

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
        <div class="setup-actions-row">
          <h2>¿Quiénes juegan?</h2>
          <div class="setup-meta-btns">
            <button id="btn-lang-toggle" class="btn-meta" title="Switch language">🇧🇴 ES</button>
            <button id="btn-how-to-play" class="btn-meta" title="How to Play">📖 Reglas</button>
          </div>
        </div>
        <div id="player-list" class="player-list"></div>
        <button id="btn-add-player" class="btn-add-player">＋ Add Player</button>
        <button id="btn-start-game" class="btn-start-game">🎲 Start Local Game</button>
        
        <div class="network-setup">
          <h3>Juego en Línea / Online Game</h3>
          <div class="network-actions">
            <button id="btn-host-game" class="btn-network">🌐 Host Game</button>
            <div class="join-group">
              <input type="text" id="input-room-code" placeholder="Room Code" maxlength="4" style="text-transform: uppercase;">
              <button id="btn-join-game" class="btn-network">Join</button>
            </div>
          </div>
          <div id="network-status" class="network-status"></div>
          <div id="room-code-display" class="room-code-display" style="display: none;">
            <p>Share this code: <strong id="room-code-text"></strong></p>
            <div id="qrcode"></div>
          </div>
        </div>
      </div>
    </div>

    <!-- ── Game Screen ──────────────────────── -->
    <div id="screen-game" class="screen">
      <div class="game-layout">
        <!-- Player bar -->
        <div id="player-bar-mount"></div>

        <!-- Main game area -->
        <div class="game-main">
          <!-- Phase banner with how-to & lang buttons -->
          <div id="phase-banner" class="phase-banner">
            <div class="phase-banner-inner">
              <div id="phase-player" class="phase-player"></div>
              <div id="phase-label"  class="phase-label"></div>
              <div id="phase-hint"   class="phase-hint"></div>
            </div>
            <div class="phase-meta-btns">
              <button id="btn-game-lang" class="btn-meta btn-meta-sm" title="Switch language">🇧🇴</button>
              <button id="btn-game-htp"  class="btn-meta btn-meta-sm" title="How to Play">📖</button>
            </div>
          </div>

          <!-- Cubilete + Dice + Volteo Assistant (side by side) -->
          <div class="dice-va-row">
            <!-- Left: cubilete + dice -->
            <div class="dice-col">
              <div id="cubilete-zone" class="cubilete-zone">
                <img id="cubilete" class="cubilete" src="/cubilete.jpg" alt="El Cubilete" title="El Cubilete — ¡Agita!" />
              </div>
              <div id="dice-mount"></div>
            </div>
            <!-- Right: Volteo Assistant -->
            <div id="va-mount" class="va-col"></div>
          </div>

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
        <button id="btn-see-leaderboard" class="btn-see-leaderboard">📊 Ver Tabla de Resultados</button>
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
// Language toggle helpers
// ---------------------------------------------------------------------------

function applyLangLabel(): void {
  const label = currentLang === 'es' ? '🇧🇴 ES' : '🇺🇸 EN';
  const labelSm = currentLang === 'es' ? '🇧🇴' : '🇺🇸';
  const htpLabel = currentLang === 'es' ? '📖 Reglas' : '📖 Rules';
  document.getElementById('btn-lang-toggle')?.textContent && (document.getElementById('btn-lang-toggle')!.textContent = label);
  document.getElementById('btn-game-lang')?.textContent && (document.getElementById('btn-game-lang')!.textContent = labelSm);
  document.getElementById('btn-how-to-play')?.textContent && (document.getElementById('btn-how-to-play')!.textContent = htpLabel);
}

function toggleLang(): void {
  currentLang = currentLang === 'es' ? 'en' : 'es';
  applyLangLabel();
  if (engine) syncUI();
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

  document.getElementById('btn-lang-toggle')!.addEventListener('click', toggleLang);
  document.getElementById('btn-how-to-play')!.addEventListener('click', () => howToPlay.show());

  // Network buttons
  document.getElementById('btn-host-game')!.addEventListener('click', async () => {
    isHost = true;
    const roomCode = generateRoomCode();
    myPlayerId = 1; // Host is always player 1 to start
    
    document.getElementById('network-status')!.textContent = 'Connecting...';
    
    network = new PeerAdapter(true, roomCode, () => {
      document.getElementById('network-status')!.textContent = 'Room created! Waiting for players...';
      const rcd = document.getElementById('room-code-display')!;
      rcd.style.display = 'block';
      document.getElementById('room-code-text')!.textContent = roomCode;
      
      const shareUrl = `${window.location.origin}/?room=${roomCode}`;
      const canvas = document.createElement('canvas');
      QRCode.toCanvas(canvas, shareUrl, (err: Error | null | undefined) => {
        if (!err) {
          const qrDiv = document.getElementById('qrcode')!;
          qrDiv.innerHTML = '';
          qrDiv.appendChild(canvas);
        }
      });

      // Host starts game when they want
      const btnStart = document.getElementById('btn-start-game')!;
      btnStart.textContent = '🎲 Start Multiplayer Game';
      btnStart.onclick = () => {
        startGame(); // Starts and broadcasts state
      };
    }, (err) => {
      document.getElementById('network-status')!.textContent = `Error: ${err.message}`;
    });

    setupNetworkHandlers();
  });

  document.getElementById('btn-join-game')!.addEventListener('click', () => {
    isHost = false;
    const codeInput = document.getElementById('input-room-code') as HTMLInputElement;
    const roomCode = codeInput.value.toUpperCase();
    if (roomCode.length !== 4) {
      alert('Room code must be 4 letters');
      return;
    }
    
    document.getElementById('network-status')!.textContent = 'Joining room...';
    
    network = new PeerAdapter(false, roomCode, () => {
      document.getElementById('network-status')!.textContent = 'Connected! Waiting for host to start...';
      myPlayerId = setupPlayers.length; // Will be reassigned by host eventually
      // Send join message
      const myPlayerInfo = createPlayer(myPlayerId, setupPlayers[0].name, setupPlayers[0].avatar);
      network!.broadcast({ type: 'PLAYER_JOIN', player: myPlayerInfo });
    }, (err) => {
      document.getElementById('network-status')!.textContent = `Error: ${err.message}`;
    });

    setupNetworkHandlers();
  });
  
  // Auto-join from URL
  const urlParams = new URLSearchParams(window.location.search);
  const room = urlParams.get('room');
  if (room) {
    (document.getElementById('input-room-code') as HTMLInputElement).value = room;
    // Auto click join after a small delay
    setTimeout(() => document.getElementById('btn-join-game')!.click(), 500);
  }
}

function setupNetworkHandlers() {
  if (!network) return;
  network.onMessage((msg) => {
    switch (msg.type) {
      case 'PLAYER_JOIN':
        if (isHost) {
          // Add player to local setup
          setupPlayers.push({ name: msg.player.name, avatar: msg.player.avatar });
          renderSetupScreen();
          // We could send state back, but we'll just wait for host to click start
        }
        break;
      case 'STATE_SYNC':
        // Overwrite local engine state entirely
        if (!engine) {
          // Client initializes engine if not present
          engine = new GameEngine(msg.state.players);
          transitionToGameScreen();
        }
        engine.restoreState(msg.state);
        syncUI();
        break;
      case 'REMOTE_ACTION':
        // A client requested an action
        if (isHost && engine) {
          handleRemoteAction(msg.action, msg.payload);
        }
        break;
    }
  });
}

function handleRemoteAction(action: string, payload: any) {
  // Only host executes these to prevent conflicts, then broadcasts state
  try {
    if (action === 'roll1') engine!.roll1();
    else if (action === 'roll2') engine!.roll2();
    else if (action === 'keep') engine!.toggleKeep(payload.dieId);
    else if (action === 'flip') engine!.flipDie(payload.dieId);
    else if (action === 'unflip') engine!.unflipDie(payload.dieId);
    else if (action === 'score') engine!.scoreCategory(payload.cat);
    else if (action === 'demano') engine!.standDeMano();
    else if (action === 'skipflip') engine!.skipOptionalFlip();
    
    // Broadcast new state
    broadcastState();
    syncUI();
  } catch (e) {
    console.error('Remote action failed:', e);
  }
}

function broadcastState() {
  if (isHost && network && engine) {
    network.broadcast({ type: 'STATE_SYNC', state: engine.getState() });
  }
}

function sendRemoteAction(action: string, payload: any = {}) {
  if (!network) return;
  if (isHost) {
    handleRemoteAction(action, payload);
  } else {
    network.broadcast({ type: 'REMOTE_ACTION', action, payload });
  }
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
  
  // Track whether La Dormida triggered to avoid double game-over screen
  let dormidaFired = false;

  // Subscribe to engine events
  engine.on((event) => {
    const state = engine!.getState();
    switch (event.type) {
      case 'DICE_ROLLED':
        animateCubilete();
        diceArea?.animateRoll(event.dice);
        break;
      case 'DIE_FLIPPED':
        diceArea?.animateFlip(event.dieId);
        toast.show(`↕ ${state.players[state.activePlayerIndex].name} flipped a die`);
        break;
      case 'DE_MANO_STOOD':
        toast.show(currentLang === 'es'
          ? '✋ De Mano — ¡+5 bono en Juegos!'
          : '✋ Standing De Mano — +5 bonus for Combinations!');
        break;
      case 'CATEGORY_SCORED':
        toast.show(`✅ ${event.category.toUpperCase()}: +${event.points} pts${event.isDeMano ? ' (De Mano!)' : ''}`);
        break;
      case 'CATEGORY_SCRATCHED':
        toast.show(`✕ ${event.category.toUpperCase()} ${currentLang === 'es' ? 'tachado' : 'scratched'}`);
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
          setTimeout(() => showGameOver(event.winnerId, event.scores, state), 500);
        }
        break;
    }
    syncUI();
  });

  if (isHost && network) {
    broadcastState();
  }

  transitionToGameScreen();
}

function transitionToGameScreen(): void {
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

  // Volteo assistant
  const vaMount = document.getElementById('va-mount')!;
  vaMount.innerHTML = '';
  const vaContainer = document.createElement('div');
  vaMount.appendChild(vaContainer);
  volteoAssistant = new VolteoAssistant(vaContainer);

  // Game buttons in game screen
  document.getElementById('btn-game-lang')!.addEventListener('click', toggleLang);
  document.getElementById('btn-game-htp')!.addEventListener('click', () => howToPlay.show());

  flipMode = false;
  showScreen('screen-game');
  syncUI();
}

// ---------------------------------------------------------------------------
// Cubilete shake animation
// ---------------------------------------------------------------------------

function animateCubilete(): void {
  const el = document.getElementById('cubilete');
  if (!el) return;
  el.classList.remove('cubilete-shake');
  void el.offsetWidth; // reflow
  el.classList.add('cubilete-shake');
  el.addEventListener('animationend', () => el.classList.remove('cubilete-shake'), { once: true });
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

  // Determine if we're in scoring phase (or can score by skipping optional flip)
  const canScoreNow = phase === 'SCORING' || phase === 'VOLTEO_OPTIONAL';
  let potentials: Partial<Record<Category, number>> = {};
  if (canScoreNow) {
    const openCats = ALL_CATEGORIES.filter((c) => activePlayer.scores[c] === undefined);
    potentials = previewAllScores(openCats, state.dice, state.isDeMano);
  }

  // Scoreboard — show as clickable if scoring OR in optional volteo phase
  scoreboard?.render(state.players, canScoreNow, potentials, state.activePlayerIndex, currentLang);

  // Volteo Assistant
  const isVolteo = phase === 'VOLTEO_MANDATORY' || phase === 'VOLTEO_OPTIONAL';
  if (isVolteo) {
    const openCats = ALL_CATEGORIES.filter((c) => activePlayer.scores[c] === undefined);
    volteoAssistant?.render(
      state.dice,
      state.flippedDieIds,
      openCats,
      state.isDeMano,
      true,
    );
  } else {
    volteoAssistant?.render(state.dice, state.flippedDieIds, [], state.isDeMano, false);
  }

  // Action bar
  flipMode = phase === 'VOLTEO_MANDATORY' || phase === 'VOLTEO_OPTIONAL';
  actionBar?.render(phase, flipMode);
}

const PHASE_LABELS: Record<string, { es: { label: string; hint: string }; en: { label: string; hint: string } }> = {
  INIT:             { es: { label: '🎲 ¡Lanza los dados!',          hint: 'Presiona Lanzar para empezar tu turno' },
                      en: { label: '🎲 Roll the dice!',             hint: 'Press Roll Dice to begin your turn' } },
  ROLLED_1:         { es: { label: '🤔 Elige tu jugada',            hint: 'Guarda dados, estate De Mano, o lanza de nuevo' },
                      en: { label: '🤔 Choose your move',           hint: 'Keep dice, Stand De Mano, or Roll Again' } },
  VOLTEO_MANDATORY: { es: { label: '↕ El Volteo — Voltea un dado',  hint: 'Debes voltear exactamente un dado a su cara opuesta' },
                      en: { label: '↕ El Volteo — Flip a die',      hint: 'You must flip exactly one die to its opposite face' } },
  VOLTEO_OPTIONAL:  { es: { label: '↕ El Volteo — Opcional',        hint: 'Voltea un dado más, o Salta al puntaje' },
                      en: { label: '↕ El Volteo — Optional flip',   hint: 'Flip one more die, or Skip to scoring' } },
  SCORING:          { es: { label: '📝 Elige una categoría',         hint: 'Haz clic en la Taquilla para puntuar' },
                      en: { label: '📝 Choose a Taquilla category',  hint: 'Click a row in the scoreboard' } },
  TURN_COMPLETE:    { es: { label: '✓ Turno completo',               hint: 'Pasando al siguiente jugador...' },
                      en: { label: '✓ Turn complete',                hint: 'Passing to next player...' } },
  DORMIDA_WIN:      { es: { label: '😴 ¡La Dormida!',               hint: '¡Cinco iguales en el primer lanzamiento!' },
                      en: { label: '😴 ¡La Dormida!',               hint: 'Five of a kind on Roll 1 — instant win!' } },
};

function updatePhaseBanner(state: GameState): void {
  const phase = state.turnPhase;
  const activePlayer = state.players[state.activePlayerIndex];

  const playerEl  = document.getElementById('phase-player')!;
  const labelEl   = document.getElementById('phase-label')!;
  const hintEl    = document.getElementById('phase-hint')!;

  playerEl.textContent = `${activePlayer.avatar} ${activePlayer.name}${currentLang === 'es' ? '' : "'s Turn"}`;

  const info = PHASE_LABELS[phase]?.[currentLang] ?? { label: phase, hint: '' };
  labelEl.textContent = info.label;

  const deManoHint = currentLang === 'es'
    ? '✋ De Mano — elegible para +5 bono'
    : '✋ De Mano — eligible for +5 bonus';
  hintEl.textContent = state.isDeMano ? deManoHint : info.hint;
}

// ---------------------------------------------------------------------------
// Engine action handlers
// ---------------------------------------------------------------------------

function checkTurn(): boolean {
  if (network && myPlayerId !== null && engine) {
    const activePlayer = engine.getState().players[engine.getState().activePlayerIndex];
    if (activePlayer.id !== myPlayerId) {
      toast.show('Wait for your turn!');
      return false;
    }
  }
  return true;
}

function handleRoll1(): void {
  if (!checkTurn()) return;
  if (!network) {
    try { engine?.roll1(); syncUI(); } catch (e) { toast.show(`⚠️ ${(e as Error).message}`); }
  } else {
    sendRemoteAction('roll1');
  }
}

function handleRoll2(): void {
  if (!checkTurn()) return;
  if (!network) {
    try { engine?.roll2(); syncUI(); } catch (e) { toast.show(`⚠️ ${(e as Error).message}`); }
  } else {
    sendRemoteAction('roll2');
  }
}

function handleStandDeMano(): void {
  if (!checkTurn()) return;
  if (!network) {
    try { engine?.standDeMano(); syncUI(); } catch (e) { toast.show(`⚠️ ${(e as Error).message}`); }
  } else {
    sendRemoteAction('demano');
  }
}

function handleSkipFlip(): void {
  if (!checkTurn()) return;
  if (!network) {
    try { engine?.skipOptionalFlip(); syncUI(); } catch (e) { toast.show(`⚠️ ${(e as Error).message}`); }
  } else {
    sendRemoteAction('skipflip');
  }
}

function handleDieClick(dieId: number): void {
  if (!engine) return;
  if (!checkTurn()) return;

  const state = engine.getState();
  const phase = state.turnPhase;
  const die = state.dice.find((d) => d.id === dieId);

  if (phase === 'ROLLED_1') {
    if (!network) {
      try {
        engine.toggleKeep(dieId);
        syncUI();
      } catch (e) {
        toast.show(`⚠️ ${(e as Error).message}`);
      }
    } else {
      sendRemoteAction('keep', { dieId });
    }
  } else if (phase === 'VOLTEO_MANDATORY' || phase === 'VOLTEO_OPTIONAL') {
    if (die?.flipped) {
      if (!network) {
        try {
          engine.unflipDie(dieId);
          syncUI();
        } catch (e) {
          toast.show(`⚠️ ${(e as Error).message}`);
        }
      } else {
        sendRemoteAction('unflip', { dieId });
      }
    } else {
      if (!network) {
        try {
          engine.flipDie(dieId);
          syncUI();
        } catch (e) {
          toast.show(`⚠️ ${(e as Error).message}`);
        }
      } else {
        sendRemoteAction('flip', { dieId });
      }
    }
  } else if (phase === 'SCORING') {
    if (die?.flipped && state.flippedDieIds.has(dieId)) {
      if (!network) {
        try {
          engine.unflipDie(dieId);
          syncUI();
          toast.show(currentLang === 'es' ? '↩ Volteo deshecho' : '↩ Flip undone');
        } catch (e) {
          toast.show(`⚠️ ${(e as Error).message}`);
        }
      } else {
        sendRemoteAction('unflip', { dieId });
      }
    }
  }
}

function handleCategoryClick(cat: Category): void {
  if (!engine) return;
  if (!checkTurn()) return;

  const state = engine.getState();

  // Allow scoring from SCORING or VOLTEO_OPTIONAL (auto-skip the optional flip)
  if (state.turnPhase !== 'SCORING' && state.turnPhase !== 'VOLTEO_OPTIONAL') return;

  const activePlayer = state.players[state.activePlayerIndex];
  if (activePlayer.scores[cat] !== undefined) {
    toast.show(currentLang === 'es' ? '⚠️ ¡Esa categoría ya está llena!' : '⚠️ That category is already filled!');
    return;
  }

  // If in optional volteo phase, auto-skip it first locally
  if (state.turnPhase === 'VOLTEO_OPTIONAL') {
    if (!network) {
      try {
        engine.skipOptionalFlip();
      } catch (e) {
        toast.show(`⚠️ ${(e as Error).message}`);
        return;
      }
    } else {
      // In network mode, host handles auto-skip.
    }
  }

  // Calculate what the score would be
  const pts = calculateScore(cat, state.dice, state.isDeMano);

  if (pts === 0) {
    // Confirm scratch (Tachar)
    const msg = currentLang === 'es'
      ? `Los dados no coinciden con "${cat}". ¿Puntuar 0 (Tachar ✕)?`
      : `The dice don't match "${cat}". Score 0 (Tachar ✕)?`;
    const confirmed = window.confirm(msg);
    if (!confirmed) return;
  }

  if (!network) {
    try {
      engine.scoreCategory(cat);
      syncUI();
    } catch (e) {
      toast.show(`⚠️ ${(e as Error).message}`);
    }
  } else {
    sendRemoteAction('score', { cat });
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
  subEl.textContent   = currentLang === 'es'
    ? `¡Es tu turno! Pasa el dispositivo y presiona Listo.`
    : `It's your turn! Pass the device and press Ready.`;

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

  subEl.textContent = currentLang === 'es'
    ? `${winner.avatar} ${winner.name} sacó Cinco Iguales en el primer lanzamiento. ¡Victoria instantánea!`
    : `${winner.avatar} ${winner.name} rolled Five of a Kind on the first roll! Instant victory!`;
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
  document.getElementById('winner-sub')!.textContent = currentLang === 'es' ? '¡Ganador!' : 'Winner!';

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

  // See Leaderboard button
  document.getElementById('btn-see-leaderboard')!.onclick = () => {
    leaderboard.show(state.players, winnerId);
  };

  document.getElementById('btn-play-again')!.onclick = () => {
    showScreen('screen-setup');
  };

  // Also allow play again from leaderboard
  leaderboard.onPlayAgain(() => {
    leaderboard.hide();
    showScreen('screen-setup');
  });
}

// ---------------------------------------------------------------------------
// Bootstrap
// ---------------------------------------------------------------------------

buildHTML();
renderSetupScreen();
initSetupListeners();
