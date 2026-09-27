/**
 * @file toast.ts
 * Lightweight toast notification system.
 * Appears at top center, auto-dismisses after ~2.5s.
 */

export class Toast {
  private container: HTMLElement;

  constructor() {
    this.container = document.createElement('div');
    this.container.className = 'toast-container';
    this.container.id = 'toast-container';
    document.body.appendChild(this.container);
  }

  show(message: string): void {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    this.container.appendChild(toast);

    // Remove after animation completes (~2.5s)
    setTimeout(() => {
      toast.remove();
    }, 2600);
  }
}
