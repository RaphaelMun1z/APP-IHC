import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../core/auth/auth.service';
import { StorageService } from '../core/data/storage.service';
import { Feedback } from '../shared/ui/feedback';
import { Modal } from '../shared/ui/modal';
import { errorMessage } from '../shared/utils/errors';

@Component({
  selector: 'app-layout',
  imports: [RouterLink, RouterLinkActive, RouterOutlet, Feedback, Modal],
  templateUrl: './app-layout.html',
  styleUrl: './app-layout.scss',
  host: { '(document:keydown.escape)': 'accountOpen.set(false)' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppLayout {
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  readonly storage = inject(StorageService);
  readonly accountOpen = signal(false);
  readonly profileOpen = signal(false);
  private readonly navigationError = signal('');
  readonly message = computed(() => this.navigationError() || this.auth.error());
  readonly navigation = [
    { path: '/inicio', short: 'IN', title: 'Início' },
    { path: '/turmas', short: 'TU', title: 'Turmas' },
    { path: '/registro-aula', short: 'AU', title: 'Registro de aula' },
    { path: '/presencas', short: 'FR', title: 'Frequência' },
    { path: '/avaliacao', short: 'AV', title: 'Avaliação' },
    { path: '/historico', short: 'HI', title: 'Histórico' },
  ];
  readonly storageMessages = computed(() => Object.values(this.storage.errors()));
  logout(): void {
    // The login entry guard ends the session only after canDeactivate succeeds.
    this.accountOpen.set(false);
    void this.router
      .navigate(['/login'], { info: 'logout' })
      .catch((error: unknown) => this.report(error));
  }
  report(error: unknown): void {
    this.navigationError.set(errorMessage(error));
  }
}
