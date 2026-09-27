/**
 * @file dice.ts
 * Dice rendering and interaction component.
 * Renders 5 dice with pip layouts, handles click events for keep/flip.
 */

import type { Die } from '../../core/types';

// Pip grid layout for each face value (9 cells, true = pip visible)
// Grid: top-left, top-center, top-right | mid-left, mid-center, mid-right | bot-left, bot-center, bot-right
const PIP_LAYOUTS: Record<number, boolean[]> = {
  1: [false, false, false,  false, true,  false,  false, false, false],
  2: [true,  false, false,  false, false, false,  false, false, true ],
  3: [true,  false, false,  false, true,  false,  false, false, true ],
  4: [true,  false, true,   false, false, false,  true,  false, true ],
  5: [true,  false, true,   false, true,  false,  true,  false, true ],
  6: [true,  false, true,   true,  false, true,   true,  false, true ],
};

export type DieMode = 'idle' | 'rolling' | 'keeping' | 'flipping' | 'locked';

export interface DiceAreaOptions {
  onDieClick: (dieId: number) => void;
}

/** Renders and manages the 5-dice area. */
export class DiceArea {
  private container: HTMLElement;
  private onDieClick: (dieId: number) => void;
  private dieElements: HTMLElement[] = [];
  private dieWrapElements: HTMLElement[] = [];

  constructor(container: HTMLElement, options: DiceAreaOptions) {
    this.container = container;
    this.onDieClick = options.onDieClick;
    this.container.className = 'dice-area';
    this._build();
  }

  private _build(): void {
    this.container.innerHTML = '';
    this.dieElements = [];
    this.dieWrapElements = [];

    for (let i = 0; i < 5; i++) {
      const wrap = document.createElement('div');
      wrap.className = 'die-wrap';
      wrap.id = `die-wrap-${i}`;

      const dieEl = document.createElement('div');
      dieEl.className = 'die';
      dieEl.id = `die-${i}`;
      dieEl.setAttribute('role', 'button');
      dieEl.setAttribute('aria-label', `Die ${i + 1}`);
      dieEl.addEventListener('click', () => this.onDieClick(i));

      // 9 pip cells
      for (let p = 0; p < 9; p++) {
        const pip = document.createElement('span');
        pip.className = 'pip';
        dieEl.appendChild(pip);
      }

      const badge = document.createElement('div');
      badge.className = 'die-badge badge-empty';
      badge.id = `die-badge-${i}`;

      wrap.appendChild(dieEl);
      wrap.appendChild(badge);
      this.container.appendChild(wrap);
      this.dieElements.push(dieEl);
      this.dieWrapElements.push(wrap);
    }
  }

  /** Update all 5 dice from engine state. */
  render(dice: Die[], mode: DieMode): void {
    for (const die of dice) {
      const el = this.dieElements[die.id];
      const badge = document.getElementById(`die-badge-${die.id}`) as HTMLElement;

      if (!el) continue;

      // Update pip visibility
      const layout = PIP_LAYOUTS[die.val];
      const pips = el.querySelectorAll('.pip');
      pips.forEach((pip, idx) => {
        if (layout[idx]) {
          pip.classList.remove('invisible');
        } else {
          pip.classList.add('invisible');
        }
      });

      // Update ARIA label
      el.setAttribute('aria-label', `Die ${die.id + 1}: ${die.val}`);

      // Reset classes
      el.classList.remove('kept', 'flipped', 'locked');
      badge.className = 'die-badge badge-empty';
      badge.textContent = '';

      // Apply state classes
      if (die.kept) {
        el.classList.add('kept');
        badge.className = 'die-badge badge-kept';
        badge.textContent = '✓ held';
      }

      if (die.flipped) {
        el.classList.add('flipped');
        badge.className = 'die-badge badge-flipped';
        badge.textContent = '↕ flipped';
      }

      if (mode === 'locked') {
        el.classList.add('locked');
      }
    }
  }

  /** Animate all non-kept dice as rolling. */
  animateRoll(dice: Die[]): void {
    for (const die of dice) {
      if (!die.kept) {
        const el = this.dieElements[die.id];
        el?.classList.remove('rolling');
        void el?.offsetWidth; // reflow
        el?.classList.add('rolling');
        el?.addEventListener('animationend', () => el.classList.remove('rolling'), { once: true });
      }
    }
  }

  /** Animate a specific die with the volteo flip effect. */
  animateFlip(dieId: number): void {
    const el = this.dieElements[dieId];
    el?.classList.remove('volteo-anim');
    void el?.offsetWidth;
    el?.classList.add('volteo-anim');
    el?.addEventListener('animationend', () => el.classList.remove('volteo-anim'), { once: true });
  }
}
