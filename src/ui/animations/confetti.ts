/**
 * @file confetti.ts
 * Confetti celebration effect for game-over and special events.
 */

const COLORS = [
  '#f0c040', '#ffe082', '#22c55e', '#38bdf8',
  '#f472b6', '#a78bfa', '#fb923c', '#e8dfc0',
];

export function fireConfetti(count = 80): void {
  for (let i = 0; i < count; i++) {
    setTimeout(() => {
      const piece = document.createElement('div');
      piece.className = 'confetti-piece';
      piece.style.left = `${Math.random() * 100}vw`;
      piece.style.background = COLORS[Math.floor(Math.random() * COLORS.length)];
      piece.style.animationDuration = `${2 + Math.random() * 2.5}s`;
      piece.style.animationDelay = `${Math.random() * 0.5}s`;
      piece.style.transform = `rotate(${Math.random() * 360}deg)`;
      piece.style.width = `${7 + Math.random() * 8}px`;
      piece.style.height = `${9 + Math.random() * 8}px`;
      document.body.appendChild(piece);

      piece.addEventListener('animationend', () => piece.remove(), { once: true });
    }, i * 18);
  }
}
