/**
 * @file howtoplay.ts
 * Illustrated "How to Play" modal for Cacho Alalay.
 * Covers rules, El Volteo, La Taquilla, De Mano bonus, and La Dormida.
 * Supports bilingual display (ES / EN) via a toggle injected into the modal.
 */

const SLIDES_ES = [
  {
    icon: '🎲',
    title: 'Cacho Alalay',
    body: `Juego boliviano de dados para 2–6 jugadores. Cada jugador lanza 5 dados hasta dos veces por turno, aplica <strong>El Volteo</strong> y elige una categoría en <strong>La Taquilla</strong> para sumar puntos.`,
  },
  {
    icon: '🎯',
    title: 'El Turno',
    body: `<strong>Tirada 1:</strong> Lanza los 5 dados.<br>
    Puedes guardar dados y lanzar los demás, o quedarte <em>De Mano</em> (bono +5 pts en Juegos).<br>
    <strong>Tirada 2:</strong> Lanza los dados no guardados.`,
  },
  {
    icon: '↕️',
    title: 'El Volteo',
    body: `Después de la Tirada 2, debes voltear <strong>exactamente un dado</strong> a su cara opuesta (1↔6, 2↔5, 3↔4).<br>
    Opcionalmente puedes voltear un segundo dado.<br>
    ¡Úsalo para mejorar tu combinación!`,
  },
  {
    icon: '📋',
    title: 'La Taquilla',
    body: `La Taquilla tiene <strong>11 categorías</strong> en 3 columnas:<br>
    <strong>Chicos:</strong> Balas🎱(1s), Tontos(2s), Trenes(3s)<br>
    <strong>Juegos:</strong> Escalera, Full, Póker<br>
    <strong>Grandes:</strong> Cuadras(4s), Quinas(5s), Senas(6s)<br>
    <strong>Grande I &amp; II:</strong> 5 iguales = 50 pts`,
  },
  {
    icon: '✋',
    title: 'De Mano',
    body: `Si te quedas con la <strong>Tirada 1</strong> sin lanzar de nuevo, estás <em>De Mano</em>.<br>
    Esto te da <strong>+5 puntos</strong> en Juegos (Escalera: 25, Full: 35, Póker: 45).<br>
    ¡Sin El Volteo tampoco!`,
  },
  {
    icon: '✕',
    title: 'Tachar (X)',
    body: `Si los dados no calzan con ninguna categoría útil, puedes <strong>Tachar</strong> cualquier casilla vacía.<br>
    Tachar registra <strong>0 puntos</strong> (marca X) en esa categoría.<br>
    Cada categoría puede marcarse solo una vez.`,
  },
  {
    icon: '😴',
    title: '¡La Dormida!',
    body: `Si en la <strong>Tirada 1</strong> sacas <strong>5 dados iguales</strong>, ¡es La Dormida!<br>
    El jugador que la saque gana el juego <strong>instantáneamente</strong>, ¡sin importar los puntajes!`,
  },
  {
    icon: '🏆',
    title: '¿Cómo ganar?',
    body: `Cuando todos los jugadores hayan llenado su Taquilla (11 categorías),<br>
    el jugador con el <strong>puntaje total más alto</strong> gana el partido.<br>
    ¡Buena suerte y que gane el mejor!`,
  },
];

const SLIDES_EN = [
  {
    icon: '🎲',
    title: 'Cacho Alalay',
    body: `Bolivian dice game for 2–6 players. Each player rolls 5 dice up to twice per turn, applies <strong>El Volteo</strong> (The Flip), then picks a category on <strong>La Taquilla</strong> (The Scoreboard) to earn points.`,
  },
  {
    icon: '🎯',
    title: 'Your Turn',
    body: `<strong>Roll 1:</strong> Roll all 5 dice.<br>
    You may keep some dice and re-roll the rest, or stand <em>De Mano</em> (earns +5 bonus on Combinations).<br>
    <strong>Roll 2:</strong> Roll any dice you didn't keep.`,
  },
  {
    icon: '↕️',
    title: 'El Volteo — The Flip',
    body: `After Roll 2, you <strong>must</strong> flip exactly one die to its opposite face (1↔6, 2↔5, 3↔4).<br>
    You may then optionally flip one more die.<br>
    Use the flip to upgrade your combo!`,
  },
  {
    icon: '📋',
    title: 'La Taquilla — The Scoreboard',
    body: `La Taquilla has <strong>11 categories</strong> in 3 columns:<br>
    <strong>Chicos:</strong> Balas🎱(1s), Tontos(2s), Trenes(3s)<br>
    <strong>Juegos:</strong> Escalera (Straight), Full (Full House), Póker (4-of-a-kind)<br>
    <strong>Grandes:</strong> Cuadras(4s), Quinas(5s), Senas(6s)<br>
    <strong>Grande I &amp; II:</strong> 5-of-a-kind = 50 pts`,
  },
  {
    icon: '✋',
    title: 'De Mano Bonus',
    body: `If you keep your <strong>Roll 1</strong> without re-rolling, you are <em>De Mano</em>.<br>
    This grants <strong>+5 bonus points</strong> on Combinations (Escalera: 25, Full: 35, Póker: 45).<br>
    No El Volteo is applied either!`,
  },
  {
    icon: '✕',
    title: 'Tachar — Scratch',
    body: `If the dice don't match any useful category, you can <strong>Tachar</strong> (scratch) any empty slot.<br>
    Tachar scores <strong>0 points</strong> (marks an X) in that category.<br>
    Each category can only be used once.`,
  },
  {
    icon: '😴',
    title: '¡La Dormida! — Instant Win',
    body: `If on your very <strong>first roll</strong> you get <strong>5 of the same</strong> dice, that's La Dormida!<br>
    You win the entire match <strong>instantly</strong>, regardless of everyone else's scores!`,
  },
  {
    icon: '🏆',
    title: 'How to Win',
    body: `Once every player has filled their Taquilla (all 11 categories),<br>
    the player with the <strong>highest total score</strong> wins the match.<br>
    Good luck — may the best player win!`,
  },
];

export class HowToPlayModal {
  private overlay: HTMLElement;
  private currentSlide = 0;
  private lang: 'es' | 'en' = 'es';

  constructor() {
    this.overlay = document.createElement('div');
    this.overlay.id = 'htp-overlay';
    this.overlay.className = 'overlay hidden htp-overlay';
    this.overlay.innerHTML = this._buildHTML();
    document.body.appendChild(this.overlay);
    this._bindEvents();
  }

  private _buildHTML(): string {
    return `
      <div class="htp-card">
        <div class="htp-header">
          <div class="htp-title-row">
            <span class="htp-logo">📖 Reglas</span>
            <button id="htp-lang-toggle" class="htp-lang-btn" title="Switch language">🇧🇴 ES</button>
          </div>
          <button id="htp-close" class="htp-close" aria-label="Close">✕</button>
        </div>
        <div class="htp-slide-area" id="htp-slide-area"></div>
        <div class="htp-dots" id="htp-dots"></div>
        <div class="htp-nav">
          <button id="htp-prev" class="htp-nav-btn" aria-label="Previous">← Anterior</button>
          <button id="htp-next" class="htp-nav-btn htp-nav-primary" aria-label="Next">Siguiente →</button>
        </div>
      </div>
    `;
  }

  private _bindEvents(): void {
    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) this.hide();
    });
    document.getElementById('htp-close')!.addEventListener('click', () => this.hide());
    document.getElementById('htp-prev')!.addEventListener('click', () => this._navigate(-1));
    document.getElementById('htp-next')!.addEventListener('click', () => this._navigate(1));
    document.getElementById('htp-lang-toggle')!.addEventListener('click', () => {
      this.lang = this.lang === 'es' ? 'en' : 'es';
      this._renderSlide();
    });
  }

  private _slides() {
    return this.lang === 'es' ? SLIDES_ES : SLIDES_EN;
  }

  private _navigate(dir: number): void {
    const slides = this._slides();
    this.currentSlide = Math.max(0, Math.min(slides.length - 1, this.currentSlide + dir));
    this._renderSlide();
  }

  private _renderSlide(): void {
    const slides = this._slides();
    const slide = slides[this.currentSlide];

    // Update lang button
    const langBtn = document.getElementById('htp-lang-toggle')!;
    langBtn.textContent = this.lang === 'es' ? '🇧🇴 ES' : '🇺🇸 EN';

    // Slide content
    const area = document.getElementById('htp-slide-area')!;
    area.innerHTML = `
      <div class="htp-slide htp-slide-in">
        <div class="htp-slide-icon">${slide.icon}</div>
        <div class="htp-slide-title">${slide.title}</div>
        <div class="htp-slide-body">${slide.body}</div>
      </div>
    `;

    // Dots
    const dotsEl = document.getElementById('htp-dots')!;
    dotsEl.innerHTML = slides.map((_, i) =>
      `<span class="htp-dot${i === this.currentSlide ? ' active' : ''}" id="htp-dot-${i}"></span>`
    ).join('');
    dotsEl.querySelectorAll('.htp-dot').forEach((dot, i) => {
      dot.addEventListener('click', () => {
        this.currentSlide = i;
        this._renderSlide();
      });
    });

    // Nav buttons
    const prevBtn = document.getElementById('htp-prev') as HTMLButtonElement;
    const nextBtn = document.getElementById('htp-next') as HTMLButtonElement;
    prevBtn.disabled = this.currentSlide === 0;
    const isLast = this.currentSlide === slides.length - 1;
    nextBtn.textContent = isLast
      ? (this.lang === 'es' ? '¡A jugar! 🎲' : 'Let\'s play! 🎲')
      : (this.lang === 'es' ? 'Siguiente →' : 'Next →');
    nextBtn.disabled = false;
    nextBtn.onclick = isLast ? () => this.hide() : () => this._navigate(1);
  }

  show(): void {
    this.currentSlide = 0;
    this._renderSlide();
    this.overlay.classList.remove('hidden');
  }

  hide(): void {
    this.overlay.classList.add('hidden');
  }
}
