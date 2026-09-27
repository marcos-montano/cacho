/**
 * @file actionbar.ts
 * Action button bar: Roll, Stand De Mano, Roll 2, Flip Die, Skip Flip.
 * Buttons are shown/hidden and enabled/disabled based on TurnPhase.
 */

import type { TurnPhase } from '../../core/types';

export interface ActionBarCallbacks {
  onRoll1: () => void;
  onRoll2: () => void;
  onStandDeMano: () => void;
  onSkipFlip: () => void;
}

interface BtnDef {
  id: string;
  label: string;
  className: string;
  phases: TurnPhase[];
  action: keyof ActionBarCallbacks;
  icon: string;
}

const BUTTON_DEFS: BtnDef[] = [
  {
    id: 'btn-roll1',
    label: 'Roll Dice',
    className: 'btn btn-roll',
    phases: ['INIT'],
    action: 'onRoll1',
    icon: '🎲',
  },
  {
    id: 'btn-demano',
    label: 'Stand De Mano',
    className: 'btn btn-demano',
    phases: ['ROLLED_1'],
    action: 'onStandDeMano',
    icon: '✋',
  },
  {
    id: 'btn-roll2',
    label: 'Roll Again',
    className: 'btn btn-roll',
    phases: ['ROLLED_1'],
    action: 'onRoll2',
    icon: '🎲',
  },
  {
    id: 'btn-skip-flip',
    label: 'Skip Flip',
    className: 'btn btn-skip',
    phases: ['VOLTEO_OPTIONAL'],
    action: 'onSkipFlip',
    icon: '⏭',
  },
];

export class ActionBar {
  private container: HTMLElement;
  private callbacks: ActionBarCallbacks;
  private buttons: Map<string, HTMLButtonElement> = new Map();

  constructor(container: HTMLElement, callbacks: ActionBarCallbacks) {
    this.container = container;
    this.callbacks = callbacks;
    this.container.className = 'action-bar';
    this._build();
  }

  private _build(): void {
    this.container.innerHTML = '';
    this.buttons.clear();

    for (const def of BUTTON_DEFS) {
      const btn = document.createElement('button');
      btn.id = def.id;
      btn.className = def.className;
      btn.innerHTML = `${def.icon} ${def.label}`;
      btn.addEventListener('click', () => {
        const cb = this.callbacks[def.action];
        if (cb) (cb as () => void)();
      });
      this.buttons.set(def.id, btn);
      this.container.appendChild(btn);
    }
  }

  /** Show/hide and enable/disable buttons based on current phase. */
  render(phase: TurnPhase, flipModeActive: boolean): void {
    for (const def of BUTTON_DEFS) {
      const btn = this.buttons.get(def.id);
      if (!btn) continue;

      const visible = def.phases.includes(phase);
      btn.style.display = visible ? '' : 'none';
      btn.disabled = !visible;
    }

    // Flip instruction hint (shown during volteo phases)
    let flipHint = this.container.querySelector<HTMLElement>('.flip-hint');

    if (phase === 'VOLTEO_MANDATORY' || phase === 'VOLTEO_OPTIONAL') {
      if (!flipHint) {
        flipHint = document.createElement('div');
        flipHint.className = 'flip-hint btn btn-flip';
        flipHint.style.pointerEvents = 'none';
        flipHint.style.opacity = flipModeActive ? '1' : '0.65';
        flipHint.innerHTML =
          phase === 'VOLTEO_MANDATORY'
            ? '↕ Click a die to flip (required)'
            : '↕ Click a die to flip (optional)';
        this.container.appendChild(flipHint);
      } else {
        flipHint.style.display = '';
        flipHint.style.opacity = flipModeActive ? '1' : '0.65';
        flipHint.innerHTML =
          phase === 'VOLTEO_MANDATORY'
            ? '↕ Click a die to flip (required)'
            : '↕ Click a die to flip (optional)';
      }
    } else {
      if (flipHint) flipHint.style.display = 'none';
    }

    // Scoring instruction
    let scoreHint = this.container.querySelector<HTMLElement>('.score-hint');
    if (phase === 'SCORING') {
      if (!scoreHint) {
        scoreHint = document.createElement('div');
        scoreHint.className = 'score-hint btn btn-demano';
        scoreHint.style.pointerEvents = 'none';
        scoreHint.innerHTML = '👆 Click a category in the Taquilla to score';
        this.container.appendChild(scoreHint);
      } else {
        scoreHint.style.display = '';
      }
    } else {
      if (scoreHint) scoreHint.style.display = 'none';
    }
  }
}
