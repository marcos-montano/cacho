/**
 * @file scoreboard.ts
 * Parchment-style Taquilla scoreboard component.
 * Renders all 11 categories for all players. During SCORING phase,
 * open categories are clickable to assign scores or Tachar.
 * Supports bilingual display (ES / EN).
 */

import type { Category, Player } from '../../core/types';
import { computeTotalScore } from '../../core/scoring';
import type { Lang } from '../../main';

// Human-readable category metadata — both languages
const CATEGORY_META: Record<Category, { es: string; en: string; sub_es: string; sub_en: string }> = {
  ones:     { es: 'Balas',    en: 'Ones',         sub_es: 'Unos (1s)',         sub_en: 'Ones (1s)' },
  twos:     { es: 'Tontos',   en: 'Twos',         sub_es: 'Dos (2s)',          sub_en: 'Twos (2s)' },
  threes:   { es: 'Trenes',   en: 'Threes',       sub_es: 'Treses (3s)',       sub_en: 'Threes (3s)' },
  escalera: { es: 'Escalera', en: 'Straight',     sub_es: 'Escalera 20/25 pts',sub_en: 'Straight 20/25 pts' },
  full:     { es: 'Full',     en: 'Full House',   sub_es: 'Full 30/35 pts',   sub_en: 'Full House 30/35 pts' },
  poker:    { es: 'Póker',    en: 'Four-of-Kind', sub_es: 'Póker 40/45 pts',  sub_en: 'Four of a Kind 40/45 pts' },
  fours:    { es: 'Cuadras',  en: 'Fours',        sub_es: 'Cuatros (4s)',      sub_en: 'Fours (4s)' },
  fives:    { es: 'Quinas',   en: 'Fives',        sub_es: 'Cincos (5s)',       sub_en: 'Fives (5s)' },
  sixes:    { es: 'Senas',    en: 'Sixes',        sub_es: 'Seises (6s)',       sub_en: 'Sixes (6s)' },
  grande1:  { es: 'Grande I', en: 'Grande I',     sub_es: '5 Iguales 50 pts', sub_en: 'Five of a Kind 50 pts' },
  grande2:  { es: 'Grande II',en: 'Grande II',    sub_es: '5 Iguales 50 pts', sub_en: 'Five of a Kind 50 pts' },
};

const SECTIONS_ES: { label: string; cats: Category[] }[] = [
  { label: 'Chicos', cats: ['ones', 'twos', 'threes'] },
  { label: 'Juegos', cats: ['escalera', 'full', 'poker'] },
  { label: 'Grandes', cats: ['fours', 'fives', 'sixes'] },
  { label: 'Grande', cats: ['grande1', 'grande2'] },
];

const SECTIONS_EN: { label: string; cats: Category[] }[] = [
  { label: 'Chicos (Low)', cats: ['ones', 'twos', 'threes'] },
  { label: 'Juegos (Combos)', cats: ['escalera', 'full', 'poker'] },
  { label: 'Grandes (High)', cats: ['fours', 'fives', 'sixes'] },
  { label: 'Grande (5-of-a-kind)', cats: ['grande1', 'grande2'] },
];

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

  /** Full re-render when players or scores change. */
  render(
    players: Player[],
    isScoring: boolean,
    potentials: Partial<Record<Category, number>>,
    activePlayerIndex: number,
    lang: Lang = 'es',
  ): void {
    const SECTIONS = lang === 'es' ? SECTIONS_ES : SECTIONS_EN;
    this.container.innerHTML = '';

    const section = document.createElement('div');
    section.className = 'scoreboard-section';

    const title = document.createElement('div');
    title.className = 'scoreboard-title';
    title.textContent = 'La Taquilla';
    section.appendChild(title);

    const board = document.createElement('div');
    board.className = 'scoreboard';

    const table = document.createElement('table');
    table.className = 'score-table';

    // Header row
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');

    const catTh = document.createElement('th');
    catTh.textContent = 'Categoría';
    headerRow.appendChild(catTh);

    for (const player of players) {
      const th = document.createElement('th');
      th.textContent = `${player.avatar} ${player.name}`;
      th.style.maxWidth = '80px';
      headerRow.appendChild(th);
    }
    thead.appendChild(headerRow);
    table.appendChild(thead);

    // Body rows
    const tbody = document.createElement('tbody');

    for (const sec of SECTIONS) {
      // Section header
      const secRow = document.createElement('tr');
      secRow.className = 'score-section-header';
      const secTd = document.createElement('td');
      secTd.colSpan = players.length + 1;
      secTd.textContent = sec.label;
      secRow.appendChild(secTd);
      tbody.appendChild(secRow);

      for (const cat of sec.cats) {
        const row = document.createElement('tr');
        row.className = 'score-row';
        row.id = `score-row-${cat}`;

        const nameTd = document.createElement('td');
        nameTd.className = 'cat-name';
        const catName = lang === 'es' ? CATEGORY_META[cat].es : CATEGORY_META[cat].en;
        const catSub  = lang === 'es' ? CATEGORY_META[cat].sub_es : CATEGORY_META[cat].sub_en;
        nameTd.innerHTML = `${catName}<small>${catSub}</small>`;
        row.appendChild(nameTd);

        for (let pi = 0; pi < players.length; pi++) {
          const player = players[pi];
          const cell = document.createElement('td');
          cell.className = 'score-cell';
          cell.id = `score-cell-${cat}-${player.id}`;

          const scored = player.scores[cat];
          const isActive = pi === activePlayerIndex;

          if (scored !== undefined) {
            // Already filled
            if (player.scratched.has(cat)) {
              cell.className = 'score-cell scratched';
              cell.textContent = '✕';
            } else {
              cell.textContent = String(scored);
            }
          } else if (isScoring && isActive) {
            // Current player can score this category
            const potential = potentials[cat];
            if (potential !== undefined && potential > 0) {
              cell.className = 'score-cell potential';
              cell.textContent = `+${potential}`;
            } else {
              cell.className = 'score-cell empty';
              cell.textContent = '—';
            }
            row.classList.add('is-scoring');
            row.style.cursor = 'pointer';
            row.addEventListener('click', () => this.onCategoryClick(cat));
          } else {
            cell.className = 'score-cell empty';
            cell.textContent = '—';
          }

          row.appendChild(cell);
        }

        tbody.appendChild(row);
      }
    }

    // Total row
    const totalRow = document.createElement('tr');
    totalRow.className = 'score-total-row';
    const totalLabelTd = document.createElement('td');
    totalLabelTd.textContent = lang === 'es' ? 'Total' : 'Total';
    totalRow.appendChild(totalLabelTd);

    for (const player of players) {
      const td = document.createElement('td');
      td.textContent = String(computeTotalScore(player.scores));
      td.id = `total-${player.id}`;
      totalRow.appendChild(td);
    }
    tbody.appendChild(totalRow);

    table.appendChild(tbody);
    board.appendChild(table);
    section.appendChild(board);
    this.container.appendChild(section);
  }
}
