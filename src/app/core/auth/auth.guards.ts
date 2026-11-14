import { inject } from '@angular/core';
import { Router } from '@angular/router';
import type { CanActivateFn } from '@angular/router';
import { AuthService } from './auth.service';
export const authGuard: CanActivateFn = (_, state) =>
  inject(AuthService).user()
    ? true
    : inject(Router).createUrlTree(['/login'], { queryParams: { retorno: state.url } });
export const coordinatorGuard: CanActivateFn = () =>
  inject(AuthService).isCoordinator() ? true : inject(Router).createUrlTree(['/inicio']);
// canDeactivate runs before this guard, so cancellation keeps the session intact.
export const loginEntryGuard: CanActivateFn = () => {
  const router = inject(Router);
  const auth = inject(AuthService);
  if (router.currentNavigation()?.extras.info !== 'logout') return true;
  try {
    auth.logout();
    return true;
  } catch {
    return false;
  } // AuthService exposes the failure to the existing layout.
};

export function safeReturn(raw: string | null, coordinator: boolean): string {
  if (!raw || raw.startsWith('//') || raw.includes('://') || raw.includes('\\')) return '/inicio';
  const target = raw.replace(/^\.\//, '').replace(/^\//, '');
  const [path] = target.split('?');
  const normalized = path.replace(/\.html$/, '');
  if (
    ![
      'inicio',
      'turmas',
      'registro-aula',
      'presencas',
      'avaliacao',
      'historico',
      ...(coordinator ? ['coordenacao', 'turma-form'] : []),
    ].includes(normalized)
  )
    return '/inicio';
  return `/${target.replace(/\.html(?=\?|$)/, '')}`;
}
