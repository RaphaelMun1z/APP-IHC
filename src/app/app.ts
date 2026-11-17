import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { DataState } from './core/api/data-state';
import { RequestState } from './core/api/request-state';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  template: `
    <div class="app-content" [inert]="requests.saving()" [attr.aria-busy]="requests.pending() > 0">
      <router-outlet />
    </div>
    @if (!data.ready() && requests.pending() > 0) {
      <div class="loading-screen" role="status" aria-label="Carregando aplicativo">
        <img src="assets/ipb_logo.png" alt="IPB" />
      </div>
    } @else if (requests.pending() > 0) {
      <div class="api-progress" role="status">
        {{ requests.saving() ? 'Salvando…' : 'Carregando…' }}
      </div>
    }
  `,
  styles: `
    .app-content {
      display: contents;
    }
    .loading-screen {
      position: fixed;
      z-index: 20000;
      inset: 0;
      display: grid;
      place-items: center;
      overflow: hidden;
      background: linear-gradient(125deg, #0f172a, #172554, #164e63, #312e81, #0f172a);
      background-size: 350% 350%;
      animation: loading-gradient 12s ease infinite;
    }
    .loading-screen::before {
      position: absolute;
      inset: -25%;
      background: radial-gradient(ellipse at center, rgb(96 165 250 / 20%), transparent 52%);
      content: '';
      animation: loading-glow 6s ease-in-out infinite alternate;
    }
    .loading-screen img {
      position: relative;
      width: clamp(9rem, 22vw, 14rem);
      filter: drop-shadow(0 0 2rem rgb(191 219 254 / 18%));
      animation: loading-logo 2.4s ease-in-out infinite;
    }
    @keyframes loading-gradient {
      0%, 100% { background-position: 0% 50%; }
      50% { background-position: 100% 50%; }
    }
    @keyframes loading-glow {
      from { opacity: 0.45; transform: scale(0.92); }
      to { opacity: 1; transform: scale(1.08); }
    }
    @keyframes loading-logo {
      0%, 100% { opacity: 0.9; transform: scale(0.98); }
      50% { opacity: 1; transform: scale(1); }
    }
    @media (prefers-reduced-motion: reduce) {
      .loading-screen,
      .loading-screen::before,
      .loading-screen img { animation: none; }
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
  readonly data = inject(DataState);
}
