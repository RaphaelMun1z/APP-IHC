import { ChangeDetectionStrategy, Component, Injectable, signal } from '@angular/core';

interface ConfirmRequest {
  title: string;
  message: string;
  confirmLabel: string;
  confirmIcon: string;
  items: readonly string[];
  moreCount: number;
  itemNoun: string;
  resolve: (confirmed: boolean) => void;
}

@Injectable({ providedIn: 'root' })
export class ConfirmDialogService {
  readonly request = signal<ConfirmRequest | null>(null);

  confirm(
    message: string,
    options: {
      title?: string;
      confirmLabel?: string;
      confirmIcon?: string;
      items?: readonly string[];
      itemNoun?: string;
    } = {},
  ): Promise<boolean> {
    return new Promise((resolve) => {
      this.request.set({
        title: options.title ?? 'Confirmar ação',
        message,
        confirmLabel: options.confirmLabel ?? 'Confirmar',
        confirmIcon: options.confirmIcon ?? 'check',
        items: (options.items ?? []).slice(0, 10),
        moreCount: Math.max(0, (options.items?.length ?? 0) - 10),
        itemNoun: options.itemNoun ?? 'itens',
        resolve,
      });
    });
  }

  answer(confirmed: boolean): void {
    const request = this.request();
    this.request.set(null);
    request?.resolve(confirmed);
  }
}

@Component({
  selector: 'app-confirm-dialog',
  template: `
    @if (confirm.request(); as request) {
      <div class="confirm-backdrop" (click)="confirm.answer(false)">
        <section
          class="confirm-dialog"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="confirm-dialog-title"
          aria-describedby="confirm-dialog-message"
          (click)="$event.stopPropagation()"
          (keydown.escape)="confirm.answer(false)"
        >
          <header class="confirm-heading">
            <span class="material-symbols-outlined" aria-hidden="true">warning</span>
            <h2 id="confirm-dialog-title">{{ request.title }}</h2>
          </header>
          <p class="confirm-copy" id="confirm-dialog-message">{{ request.message }}</p>
          @if (request.items.length) {
            <ul class="confirm-items" aria-label="Registros que serão excluídos">
              @for (item of request.items; track item) {
                <li>{{ item }}</li>
              }
            </ul>
            @if (request.moreCount) {
              <p class="confirm-more">E mais {{ request.moreCount }} {{ request.itemNoun }}.</p>
            }
          }
          <div class="confirm-actions">
            <button class="app-button" type="button" (click)="confirm.answer(false)">
              <span class="material-symbols-outlined" aria-hidden="true">close</span>Cancelar
            </button>
            <button class="app-button danger" type="button" (click)="confirm.answer(true)">
              <span class="material-symbols-outlined" aria-hidden="true">{{ request.confirmIcon }}</span>
              {{ request.confirmLabel }}
            </button>
          </div>
        </section>
      </div>
    }
  `,
  styles: `
    .confirm-backdrop {
      position: fixed;
      z-index: 30001;
      inset: 0;
      display: grid;
      place-items: center;
      padding: 1rem;
      background: rgb(15 23 42 / 55%);
    }
    .confirm-dialog {
      width: min(28rem, 100%);
      max-height: calc(100dvh - 2rem);
      overflow: auto;
      padding: 1.5rem;
      border: 1px solid #cbd5e1;
      border-radius: 1rem;
      background: #fff;
      color: #17211b;
      box-shadow: 0 24px 64px rgb(15 23 42 / 28%);
    }
    .confirm-heading { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1rem; }
    .confirm-heading > span { color: #b45309; font-size: 1.5rem; }
    h2 { margin: 0; font-size: 1.2rem; }
    .confirm-copy { margin: 0; line-height: 1.55; }
    .confirm-items {
      display: grid;
      gap: 0.375rem;
      max-height: 13rem;
      margin: 0.875rem 0 0;
      padding: 0;
      overflow: auto;
      list-style: none;
    }
    .confirm-items li {
      padding: 0.5rem 0.75rem;
      border: 1px solid #e2e8f0;
      border-radius: 0.5rem;
      background: #f8fafc;
      font-size: 0.875rem;
    }
    .confirm-more { margin: 0.625rem 0 0; color: #64748b; font-size: 0.8125rem; }
    .confirm-actions { display: flex; justify-content: flex-end; gap: 0.75rem; margin-top: 1.5rem; }
    .confirm-actions button { display: inline-flex; align-items: center; justify-content: center; gap: 0.375rem; }
    .confirm-actions .material-symbols-outlined { font-size: 1.125rem; }
    .app-button.danger { border-color: #b91c1c; background: #b91c1c; color: white; }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfirmDialog {
  constructor(readonly confirm: ConfirmDialogService) {}
}
