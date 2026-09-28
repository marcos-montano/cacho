/**
 * @file volteo_assistant.ts
 * Volteo Assistant hint system for the El Volteo phases.
 *
 * Analyses all possible single-die flips and tells the player
 * which flip would unlock the best scoring combination.
 * Also provides simple probability tips for numeric categories.
 */

import type { Die, Category } from '../../core/types';
import { enumerateFlipOptions } from '../../core/volteo';
import { calculateScore } from '../../core/scoring';

export interface FlipHint {
  dieId: number;
  fromVal: number;
  toVal: number;
  bestCat: Category | null;
  bestGain: number;
  label: string;
}

/**
 * Simulates flipping each die and returns the best category gain for each option.
 */
export function analyzeFlipOptions(
  dice: Die[],
  flippedIds: Set<number>,
  openCategories: Category[],
  isDeMano: boolean,
): FlipHint[] {
  const options = enumerateFlipOptions(dice, flippedIds);

  return options.map((opt) => {
    // Simulate the flip
    const simDice = dice.map((d) =>
      d.id === opt.dieId ? { ...d, val: opt.toVal as Die['val'], flipped: true } : { ...d }
    );

    let bestCat: Category | null = null;
    let bestGain = 0;

    for (const cat of openCategories) {
      const score = calculateScore(cat, simDice, isDeMano);
      if (score > bestGain) {
        bestGain = score;
        bestCat = cat;
      }
    }

    const catLabel = bestCat ? CAT_NAMES[bestCat] : null;
    let label = `Die ${opt.dieId + 1}: ${opt.fromVal} → ${opt.toVal}`;
    if (catLabel && bestGain > 0) {
      label += ` — unlocks ${catLabel} (+${bestGain} pts)`;
    } else {
      label += ' — no immediate combo';
    }

    return { dieId: opt.dieId, fromVal: opt.fromVal, toVal: opt.toVal, bestCat, bestGain, label };
  });
}

const CAT_NAMES: Record<Category, string> = {
  ones:     'Balas',
  twos:     'Tontos',
  threes:   'Trenes',
  fours:    'Cuadras',
  fives:    'Quinas',
  sixes:    'Senas',
  escalera: 'Escalera',
  full:     'Full',
  poker:    'Póker',
  grande1:  'Grande I',
  grande2:  'Grande II',
};

/** Renders the Volteo Assistant floating hint box under/beside the dice area. */
export class VolteoAssistant {
  private container: HTMLElement;
  private onDieClick?: (dieId: number) => void;
  private isMinimized: boolean = false;
  private lastArgs?: {
    dice: Die[];
    flippedIds: Set<number>;
    openCategories: Category[];
    isDeMano: boolean;
  };

  constructor(container: HTMLElement, onDieClick?: (dieId: number) => void) {
    this.container = container;
    this.onDieClick = onDieClick;
    this.container.className = 'volteo-assistant hidden';
    this.container.id = 'volteo-assistant';
  }

  toggleMinimize(): void {
    this.isMinimized = !this.isMinimized;
    if (this.lastArgs) {
      this.render(
        this.lastArgs.dice,
        this.lastArgs.flippedIds,
        this.lastArgs.openCategories,
        this.lastArgs.isDeMano,
        true,
      );
    }
  }

  render(
    dice: Die[],
    flippedIds: Set<number>,
    openCategories: Category[],
    isDeMano: boolean,
    visible: boolean,
  ): void {
    if (!visible) {
      this.lastArgs = undefined;
      this.container.classList.add('hidden');
      return;
    }

    this.lastArgs = { dice, flippedIds, openCategories, isDeMano };
    const hints = analyzeFlipOptions(dice, flippedIds, openCategories, isDeMano);
    if (hints.length === 0) {
      this.container.classList.add('hidden');
      return;
    }

    // Sort: best gain first
    hints.sort((a, b) => b.bestGain - a.bestGain);

    this.container.classList.remove('hidden');
    if (this.isMinimized) {
      this.container.classList.add('va-minimized');
    } else {
      this.container.classList.remove('va-minimized');
    }

    this.container.innerHTML = `
      <div class="va-header">
        <div class="va-header-left" role="button" tabindex="0" title="Click to collapse/expand">
          <span class="va-icon">🔍</span>
          <span class="va-title">Volteo Assistant</span>
          <span class="va-badge">${hints.length}</span>
        </div>
        <button type="button" class="va-toggle-btn" title="${this.isMinimized ? 'Expand' : 'Minimize'}">
          ${this.isMinimized ? '➕' : '➖'}
        </button>
      </div>
      <ul class="va-list">
        ${hints.map((h, i) => `
          <li class="va-item${i === 0 && h.bestGain > 0 ? ' va-best' : ''}" data-die="${h.dieId}" title="Click to flip Die ${h.dieId + 1}">
            <span class="va-die">🎲 Dado ${h.dieId + 1}</span>
            <span class="va-arrow">${h.fromVal} → ${h.toVal}</span>
            ${h.bestGain > 0
              ? `<span class="va-gain">+${h.bestGain} ${CAT_NAMES[h.bestCat!]}</span>`
              : `<span class="va-nogain">sin juego</span>`}
          </li>
        `).join('')}
      </ul>
    `;

    // Attach listeners
    const toggleBtn = this.container.querySelector('.va-toggle-btn');
    toggleBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleMinimize();
    });

    const headerLeft = this.container.querySelector('.va-header-left');
    headerLeft?.addEventListener('click', () => {
      this.toggleMinimize();
    });

    if (this.onDieClick) {
      const items = this.container.querySelectorAll<HTMLElement>('.va-item');
      items.forEach((item) => {
        item.addEventListener('click', () => {
          const dieId = Number(item.dataset.die);
          if (!isNaN(dieId) && this.onDieClick) {
            this.onDieClick(dieId);
          }
        });
      });
    }
  }
}
