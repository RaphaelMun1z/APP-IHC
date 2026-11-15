import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { RequestState } from './core/api/request-state';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  template: `
    <div class="app-content" [inert]="requests.saving()" [attr.aria-busy]="requests.pending() > 0">
      <router-outlet />
    </div>
    @if (requests.pending() > 0) {
      <div class="api-progress" role="status">
        {{ requests.saving() ? 'Salvando…' : 'Carregando…' }}
      </div>
    }
  `,
  styles: `
    .app-content {
      display: contents;
    }
    .api-progress {
      position: fixed;
      z-index: 10000;
      bottom: 1rem;
      left: 50%;
      transform: translateX(-50%);
      padding: 0.6rem 1rem;
      border-radius: 8px;
      background: #fff;
      color: #253449;
      box-shadow: 0 2px 12px #0003;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  readonly requests = inject(RequestState);
}
