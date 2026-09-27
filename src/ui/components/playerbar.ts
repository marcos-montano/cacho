/**
 * @file playerbar.ts
 * Top player chip bar — shows all players with avatar, name, total score,
 * and highlights the active player.
 */

import type { Player } from '../../core/types';
import { computeTotalScore } from '../../core/scoring';

export class PlayerBar {
  private container: HTMLElement;

  constructor(container: HTMLElement) {
    this.container = container;
    this.container.className = 'player-bar';
    this.container.id = 'player-bar';
  }

  render(players: Player[], activePlayerIndex: number): void {
    this.container.innerHTML = '';

    for (let i = 0; i < players.length; i++) {
      const player = players[i];
      const isActive = i === activePlayerIndex;

      const chip = document.createElement('div');
      chip.className = 'player-chip' + (isActive ? ' active' : '');
      chip.id = `player-chip-${player.id}`;

      const dot = document.createElement('div');
      dot.className = 'chip-turn-indicator';

      const avatar = document.createElement('div');
      avatar.className = 'chip-avatar';
      avatar.textContent = player.avatar;

      const name = document.createElement('div');
      name.className = 'chip-name';
      name.textContent = player.name;

      const score = document.createElement('div');
      score.className = 'chip-score';
      score.textContent = String(computeTotalScore(player.scores));

      chip.appendChild(dot);
      chip.appendChild(avatar);
      chip.appendChild(name);
      chip.appendChild(score);

      this.container.appendChild(chip);
    }
  }
}
