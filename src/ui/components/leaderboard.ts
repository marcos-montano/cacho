/**
 * @file leaderboard.ts
 * Match leaderboard overlay with per-category score breakdown.
 * Shows rank, avatar, name, each Taquilla cell, and total score.
 */

import type { Category, Player } from '../../core/types';
import { computeTotalScore } from '../../core/scoring';

const CATEGORY_META: Record<Category, { es: string; en: string; short: string }> = {
  ones:     { es: 'Balas',    en: 'Ones',      short: '1s' },
  twos:     { es: 'Tontos',   en: 'Twos',      short: '2s' },
  threes:   { es: 'Trenes',   en: 'Threes',    short: '3s' },
  escalera: { es: 'Escalera', en: 'Straight',  short: '≡' },
  full:     { es: 'Full',     en: 'Full House', short: 'FH' },
  poker:    { es: 'Póker',    en: 'Four-of-a-kind', short: '4K' },
  fours:    { es: 'Cuadras',  en: 'Fours',     short: '4s' },
  fives:    { es: 'Quinas',   en: 'Fives',     short: '5s' },
  sixes:    { es: 'Senas',    en: 'Sixes',     short: '6s' },
  grande1:  { es: 'Grande I', en: 'Grande I',  short: 'G1' },
  grande2:  { es: 'Grande II',en: 'Grande II', short: 'G2' },
};

const ALL_CATS: Category[] = [
  'ones','twos','threes','escalera','full','poker','fours','fives','sixes','grande1','grande2'
];

export class Leaderboard {
  private overlay: HTMLElement;

  constructor() {
    this.overlay = document.createElement('div');
    this.overlay.id = 'leaderboard-overlay';
    this.overlay.className = 'overlay hidden leaderboard-overlay';
    document.body.appendChild(this.overlay);
  }

  show(players: Player[], winnerId: number): void {
    const sorted = [...players].sort(
      (a, b) => computeTotalScore(b.scores) - computeTotalScore(a.scores)
    );

    const medals = ['🥇', '🥈', '🥉'];

    this.overlay.innerHTML = `
      <div class="lb-card">
        <div class="lb-header">
          <div class="lb-title">🏆 Resultados Finales</div>
          <button id="lb-close" class="htp-close" aria-label="Close">✕</button>
        </div>

        <div class="lb-podium">
          ${sorted.slice(0, 3).map((p, i) => `
            <div class="lb-pod lb-pod-${i}${p.id === winnerId ? ' lb-winner' : ''}">
              <div class="lb-medal">${medals[i] ?? ''}</div>
              <div class="lb-pod-avatar">${p.avatar}</div>
              <div class="lb-pod-name">${p.name}</div>
              <div class="lb-pod-pts">${computeTotalScore(p.scores)} pts</div>
            </div>
          `).join('')}
        </div>

        <div class="lb-breakdown-wrap">
          <table class="lb-table">
            <thead>
              <tr>
                <th class="lb-th-rank">#</th>
                <th class="lb-th-player">Jugador</th>
                ${ALL_CATS.map(c => `<th class="lb-th-cat" title="${CATEGORY_META[c].es}">${CATEGORY_META[c].short}</th>`).join('')}
                <th class="lb-th-total">Total</th>
              </tr>
            </thead>
            <tbody>
              ${sorted.map((p, i) => {
                const total = computeTotalScore(p.scores);
                return `
                  <tr class="lb-row${p.id === winnerId ? ' lb-row-winner' : ''}">
                    <td class="lb-td-rank">${medals[i] ?? (i + 1)}</td>
                    <td class="lb-td-player">
                      <span class="lb-av">${p.avatar}</span>
                      <span class="lb-nm">${p.name}</span>
                    </td>
                    ${ALL_CATS.map(cat => {
                      const val = p.scores[cat];
                      const isScratched = p.scratched.has(cat);
                      if (val === undefined) return `<td class="lb-td-cat lb-td-open">—</td>`;
                      if (isScratched) return `<td class="lb-td-cat lb-td-scratch">✕</td>`;
                      return `<td class="lb-td-cat">${val}</td>`;
                    }).join('')}
                    <td class="lb-td-total">${total}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>

        <button id="lb-play-again" class="overlay-btn lb-play-again-btn">🎲 Jugar de nuevo</button>
      </div>
    `;

    document.getElementById('lb-close')!.addEventListener('click', () => this.hide());
    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) this.hide();
    });

    this.overlay.classList.remove('hidden');
  }

  onPlayAgain(cb: () => void): void {
    // Delegate; the button is created dynamically – wire up after show()
    this.overlay.addEventListener('click', (e) => {
      if ((e.target as HTMLElement).id === 'lb-play-again') cb();
    });
  }

  hide(): void {
    this.overlay.classList.add('hidden');
  }
}
