/**
 * @file volteo_assistant.ts
 * Volteo Assistant hint system for the El Volteo phases.
 *
 * Rendered as a draggable, closable floating panel that is completely
 * detached from the dice layout so it never overlaps.
 * A small "bubble" button re-opens it when closed.
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

/**
 * Draggable, closable floating Volteo Assistant panel.
 * The panel is appended to document.body and stays fixed on screen.
 * A re-open bubble appears when the panel is closed.
 */
export class VolteoAssistant {
  // The floating panel itself (fixed, detached from game layout)
  private panel: HTMLElement;
  // The small re-open bubble
  private bubble: HTMLButtonElement;

  private onDieClick?: (dieId: number) => void;
  private isClosed: boolean = false;   // panel hidden by user, bubble visible
  private isDragging: boolean = false;
  private dragStartX: number = 0;
  private dragStartY: number = 0;
  private panelStartX: number = 0;
  private panelStartY: number = 0;

  private lastArgs?: {
    dice: Die[];
    flippedIds: Set<number>;
    openCategories: Category[];
    isDeMano: boolean;
  };

  constructor(mountContainer: HTMLElement, onDieClick?: (dieId: number) => void) {
    void mountContainer; // kept for API compatibility
    this.onDieClick = onDieClick;

    // ── Build the floating panel ──────────────────────────────────────────
    this.panel = document.createElement('div');
    this.panel.className = 'va-panel hidden';
    this.panel.id = 'volteo-assistant';
    document.body.appendChild(this.panel);

    // ── Build the re-open bubble ──────────────────────────────────────────
    this.bubble = document.createElement('button');
    this.bubble.className = 'va-bubble hidden';
    this.bubble.id = 'va-bubble';
    this.bubble.setAttribute('aria-label', 'Abrir Volteo Assistant');
    this.bubble.innerHTML = '🔍';
    this.bubble.title = 'Abrir Volteo Assistant';
    this.bubble.addEventListener('click', () => this._openPanel());
    document.body.appendChild(this.bubble);
  }

  /** Make the panel fully hidden (e.g. outside volteo phases) */
  hide(): void {
    this.lastArgs = undefined;
    this.panel.classList.add('hidden');
    this.bubble.classList.add('hidden');
  }

  /** Re-open the panel when the bubble is clicked — re-renders from last state */
  private _openPanel(): void {
    this.isClosed = false;
    if (this.lastArgs) {
      // Re-render fully with the last known state
      this.render(
        this.lastArgs.dice,
        this.lastArgs.flippedIds,
        this.lastArgs.openCategories,
        this.lastArgs.isDeMano,
        true,
      );
    } else {
      this.bubble.classList.add('hidden');
      this.panel.classList.remove('hidden');
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
      this.hide();
      return;
    }

    this.lastArgs = { dice, flippedIds, openCategories, isDeMano };
    const hints = analyzeFlipOptions(dice, flippedIds, openCategories, isDeMano);
    if (hints.length === 0) {
      this.hide();
      return;
    }

    hints.sort((a, b) => b.bestGain - a.bestGain);

    // If user had closed the panel, just keep the bubble visible
    if (this.isClosed) {
      this.bubble.classList.remove('hidden');
      this.panel.classList.add('hidden');
      // Update bubble badge
      this.bubble.innerHTML = `🔍<span class="va-bubble-badge">${hints.filter(h => h.bestGain > 0).length}</span>`;
      return;
    }

    // Show panel
    this.bubble.classList.add('hidden');
    this.panel.classList.remove('hidden');

    this.panel.innerHTML = `
      <div class="va-drag-handle" title="Arrastra para mover">
        <div class="va-header-left">
          <span class="va-icon">🔍</span>
          <span class="va-title">Volteo</span>
          <span class="va-badge">${hints.length}</span>
        </div>
        <div class="va-header-actions">
          <button type="button" class="va-close-btn" title="Cerrar">✕</button>
        </div>
      </div>
      <ul class="va-list">
        ${hints.map((h, i) => `
          <li class="va-item${i === 0 && h.bestGain > 0 ? ' va-best' : ''}" data-die="${h.dieId}" title="Voltear Dado ${h.dieId + 1}">
            <span class="va-die">🎲${h.dieId + 1}</span>
            <span class="va-arrow">${h.fromVal}→${h.toVal}</span>
            ${h.bestGain > 0
              ? `<span class="va-gain">+${h.bestGain} ${CAT_NAMES[h.bestCat!]}</span>`
              : `<span class="va-nogain">—</span>`}
          </li>
        `).join('')}
      </ul>
    `;

    // Close button
    this.panel.querySelector('.va-close-btn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.isClosed = true;
      this.panel.classList.add('hidden');
      this.bubble.classList.remove('hidden');
      // update badge on bubble
      const goodHints = hints.filter(h => h.bestGain > 0).length;
      this.bubble.innerHTML = `🔍${goodHints > 0 ? `<span class="va-bubble-badge">${goodHints}</span>` : ''}`;
    });

    // Die click: flip
    if (this.onDieClick) {
      this.panel.querySelectorAll<HTMLElement>('.va-item').forEach((item) => {
        item.addEventListener('click', () => {
          const dieId = Number(item.dataset.die);
          if (!isNaN(dieId) && this.onDieClick) {
            this.onDieClick(dieId);
          }
        });
      });
    }

    // Drag support
    this._attachDrag();
  }

  private _attachDrag(): void {
    const handle = this.panel.querySelector<HTMLElement>('.va-drag-handle');
    if (!handle) return;

    const onPointerDown = (e: PointerEvent) => {
      // Don't drag when clicking the close button
      if ((e.target as HTMLElement).classList.contains('va-close-btn')) return;
      this.isDragging = true;
      handle.setPointerCapture(e.pointerId);

      const rect = this.panel.getBoundingClientRect();
      this.dragStartX = e.clientX;
      this.dragStartY = e.clientY;
      this.panelStartX = rect.left;
      this.panelStartY = rect.top;

      this.panel.style.transition = 'none';
      this.panel.classList.add('va-dragging');
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!this.isDragging) return;
      const dx = e.clientX - this.dragStartX;
      const dy = e.clientY - this.dragStartY;
      const newX = this.panelStartX + dx;
      const newY = this.panelStartY + dy;

      // Clamp to viewport
      const pw = this.panel.offsetWidth;
      const ph = this.panel.offsetHeight;
      const clampedX = Math.max(8, Math.min(newX, window.innerWidth - pw - 8));
      const clampedY = Math.max(8, Math.min(newY, window.innerHeight - ph - 8));

      this.panel.style.left = `${clampedX}px`;
      this.panel.style.top = `${clampedY}px`;
      this.panel.style.right = 'auto';
      this.panel.style.bottom = 'auto';
    };

    const onPointerUp = () => {
      if (!this.isDragging) return;
      this.isDragging = false;
      this.panel.style.transition = '';
      this.panel.classList.remove('va-dragging');
    };

    handle.addEventListener('pointerdown', onPointerDown);
    handle.addEventListener('pointermove', onPointerMove);
    handle.addEventListener('pointerup', onPointerUp);
    handle.addEventListener('pointercancel', onPointerUp);
  }

  /** Clean up when the game is torn down */
  destroy(): void {
    this.panel.remove();
    this.bubble.remove();
  }
}
