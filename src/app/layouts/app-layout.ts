import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../core/auth/auth.service';
import { StorageService } from '../core/data/storage.service';
import { PageHeader } from '../shared/ui/page-header';
import { Feedback } from '../shared/ui/feedback';
import { errorMessage } from '../shared/utils/errors';
import { DataState } from '../core/api/data-state';
import { BootstrapService } from '../core/api/bootstrap.service';
import { RequestState } from '../core/api/request-state';
import { ConfirmDialog } from '../shared/ui/confirm-dialog';
import { Tooltip } from '../shared/ui/tooltip';
import { animateRouteView } from '../core/navigation/page-transition';

@Component({
  selector: 'app-layout',
  imports: [RouterLink, RouterLinkActive, RouterOutlet, Feedback, PageHeader, ConfirmDialog, Tooltip],
  templateUrl: './app-layout.html',
  styleUrl: './app-layout.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppLayout {
  readonly data = inject(DataState);
  readonly bootstrap = inject(BootstrapService);
  readonly requests = inject(RequestState);
  readonly auth = inject(AuthService);
  readonly initials = computed(() =>
    (this.auth.user()?.nome ?? '')
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((name) => name[0])
      .join(''),
  );
  private readonly router = inject(Router);
  readonly storage = inject(StorageService);
  private readonly navigationError = signal('');
  readonly message = computed(() => this.navigationError() || this.auth.error());
  readonly isCoordinator = computed(() => this.auth.user()?.perfil === 'coordenacao');
  readonly navigation = computed(() => [
    { path: '/turmas', icon: 'groups', title: 'Turmas' },
    { path: '/pontos-mensais', icon: 'schedule', title: 'Ponto mensal' },
    ...(this.isCoordinator() ? [{ path: '/coordenacao', icon: 'school', title: 'Coordenação' }] : []),
  ]);
  readonly storageMessages = computed(() => Object.values(this.storage.errors()));
  animatePage(): void {
    animateRouteView('.page-view > router-outlet + *');
    animateRouteView('.page-header');
  }

  logout(): void {
    // The login entry guard ends the session only after canDeactivate succeeds.
    void this.router
      .navigate(['/login'], { info: 'logout' })
      .catch((error: unknown) => this.report(error));
  }
  report(error: unknown): void {
    this.navigationError.set(errorMessage(error));
  }
}
