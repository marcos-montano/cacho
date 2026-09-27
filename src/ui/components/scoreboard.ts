/**
 * @file scoreboard.ts
 * Per-player Taquilla scoreboard — redesigned as individual 3×3 card matrices.
 *
 * Each player gets their own compact card showing the traditional 3×3 grid:
 *
 *   ┌──────────┬──────────┬──────────┐
 *   │  Balas   │ Escalera │ Cuadras  │
 *   │  Tontos  │  Full    │  Quinas  │
 *   │  Trenes  │  Póker   │  Senas   │
 *   ├──────────┴──────────┴──────────┤
 *   │    Grande I  │    Grande II    │
 *   └─────────────────────────────── ┘
 *
 * During SCORING phase the active player's open cells show potential pts
 * and are clickable. Supports bilingual display (ES / EN).
 */

import type { Category, Player } from '../../core/types';
import { computeTotalScore } from '../../core/scoring';
import type { Lang } from '../../main';

// ---------------------------------------------------------------------------
// Category metadata
// ---------------------------------------------------------------------------

interface CatMeta {
  es: string; en: string;
  sub_es: string; sub_en: string;
}

const CATEGORY_META: Record<Category, CatMeta> = {
  ones:     { es: 'Balas',    en: 'Ones',         sub_es: '1s', sub_en: '1s' },
  twos:     { es: 'Tontos',   en: 'Twos',         sub_es: '2s', sub_en: '2s' },
  threes:   { es: 'Trenes',   en: 'Threes',       sub_es: '3s', sub_en: '3s' },
  escalera: { es: 'Escalera', en: 'Straight',     sub_es: '20/25', sub_en: '20/25' },
  full:     { es: 'Full',     en: 'Full House',   sub_es: '30/35', sub_en: '30/35' },
  poker:    { es: 'Póker',    en: 'Four-of-Kind', sub_es: '40/45', sub_en: '40/45' },
  fours:    { es: 'Cuadras',  en: 'Fours',        sub_es: '4s', sub_en: '4s' },
  fives:    { es: 'Quinas',   en: 'Fives',        sub_es: '5s', sub_en: '5s' },
  sixes:    { es: 'Senas',    en: 'Sixes',        sub_es: '6s', sub_en: '6s' },
  grande1:  { es: 'Grande I', en: 'Grande I',     sub_es: '50 pts', sub_en: '50 pts' },
  grande2:  { es: 'Grande II',en: 'Grande II',    sub_es: '50 pts', sub_en: '50 pts' },
};

// The classic 3-column layout of La Taquilla (read row-by-row)
const GRID_ROWS: [Category, Category, Category][] = [
  ['ones',     'escalera', 'fours'],
  ['twos',     'full',     'fives'],
  ['threes',   'poker',    'sixes'],
];

const GRANDE_ROW: [Category, Category] = ['grande1', 'grande2'];

// ---------------------------------------------------------------------------
// Scoreboard component
// ---------------------------------------------------------------------------

export interface ScoreboardOptions {
  onCategoryClick: (cat: Category) => void;
}

export class Scoreboard {
  private container: HTMLElement;
  private onCategoryClick: (cat: Category) => void;

  constructor(container: HTMLElement, options: ScoreboardOptions) {
    this.container = container;
    this.onCategoryClick = options.onCategoryClick;
  }

  render(
    players: Player[],
    isScoring: boolean,
    potentials: Partial<Record<Category, number>>,
    activePlayerIndex: number,
    lang: Lang = 'es',
  ): void {
    this.container.innerHTML = '';

    const wrap = document.createElement('div');
    wrap.className = 'sb-wrap';

    for (let pi = 0; pi < players.length; pi++) {
      const player = players[pi];
      const isActive = pi === activePlayerIndex;
      const total = computeTotalScore(player.scores);

      const card = document.createElement('div');
      card.className = `sb-player-card${isActive ? ' sb-active' : ''}`;
      card.id = `sb-card-${player.id}`;

      // Card header
      const header = document.createElement('div');
      header.className = 'sb-card-header';
      header.innerHTML = `
        <span class="sb-avatar">${player.avatar}</span>
        <span class="sb-pname">${player.name}</span>
        <span class="sb-total" id="sb-total-${player.id}">${total} pts</span>
      `;
      card.appendChild(header);

      // 3×3 grid
      const grid = document.createElement('div');
      grid.className = 'sb-grid';

      // Column headers (Chicos / Juegos / Grandes)
      const colHdrs = document.createElement('div');
      colHdrs.className = 'sb-col-headers';
      const cols = lang === 'es'
        ? ['Chicos', 'Juegos', 'Grandes']
        : ['Low', 'Combos', 'High'];
      colHdrs.innerHTML = cols.map(c => `<div class="sb-col-hdr">${c}</div>`).join('');
      grid.appendChild(colHdrs);

      // Rows
      for (const [catA, catB, catC] of GRID_ROWS) {
        const row = document.createElement('div');
        row.className = 'sb-row';
        for (const cat of [catA, catB, catC]) {
          row.appendChild(this._makeCell(cat, player, isActive, isScoring, potentials, lang));
        }
        grid.appendChild(row);
      }

      // Grande row (spans full width, split 50/50)
      const grandeRow = document.createElement('div');
      grandeRow.className = 'sb-row sb-grande-row';
      for (const cat of GRANDE_ROW) {
        grandeRow.appendChild(this._makeCell(cat, player, isActive, isScoring, potentials, lang));
      }
      grid.appendChild(grandeRow);

      card.appendChild(grid);
      wrap.appendChild(card);
    }

    this.container.appendChild(wrap);
  }

  private _makeCell(
    cat: Category,
    player: Player,
    isActive: boolean,
    isScoring: boolean,
    potentials: Partial<Record<Category, number>>,
    lang: Lang,
  ): HTMLElement {
    const meta = CATEGORY_META[cat];
    const name = lang === 'es' ? meta.es : meta.en;
    const sub  = lang === 'es' ? meta.sub_es : meta.sub_en;
    const scored = player.scores[cat];
    const isScratched = player.scratched.has(cat);
    const clickable = isScoring && isActive && scored === undefined;
    const potential = potentials[cat];

    const cell = document.createElement('div');
    cell.className = 'sb-cell';
    cell.id = `sb-cell-${cat}-${player.id}`;

    if (clickable) {
      cell.classList.add('sb-cell-open');
      if (potential !== undefined && potential > 0) {
        cell.classList.add('sb-cell-potential');
      }
      cell.setAttribute('role', 'button');
      cell.setAttribute('tabindex', '0');
      cell.addEventListener('click', () => this.onCategoryClick(cat));
      cell.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') this.onCategoryClick(cat);
      });
    }

    // Value display
    let valueHTML = '';
    if (scored !== undefined) {
      if (isScratched) {
        valueHTML = `<span class="sb-val sb-val-scratch">✕</span>`;
      } else {
        valueHTML = `<span class="sb-val sb-val-scored">${scored}</span>`;
      }
    } else if (clickable && potential !== undefined && potential > 0) {
      valueHTML = `<span class="sb-val sb-val-pot">+${potential}</span>`;
    } else {
      valueHTML = `<span class="sb-val sb-val-empty">—</span>`;
    }

    cell.innerHTML = `
      <div class="sb-cell-name">${name}</div>
      <div class="sb-cell-sub">${sub}</div>
      ${valueHTML}
    `;

    return cell;
  }
}
