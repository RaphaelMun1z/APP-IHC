import { inject } from '@angular/core';
import { Router } from '@angular/router';
import type { CanActivateFn } from '@angular/router';
import { AuthService } from './auth.service';
import { BootstrapService } from '../api/bootstrap.service';
import { catchError, map, of, switchMap } from 'rxjs';
export const authGuard: CanActivateFn = (_, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const bootstrap = inject(BootstrapService);
  const login = () => router.createUrlTree(['/login'], { queryParams: { retorno: state.url } });
  return auth.restore().pipe(
    switchMap((authenticated) =>
      authenticated
        ? bootstrap.load().pipe(map(() => (auth.user() ? true : login())))
        : of(login()),
    ),
    catchError(() => of(login())),
  );
};
// canDeactivate runs before this guard, so cancellation keeps the session intact.
export const loginEntryGuard: CanActivateFn = async () => {
  const router = inject(Router);
  const auth = inject(AuthService);
  if (router.currentNavigation()?.extras.info !== 'logout') return true;
  try {
    await auth.logout();
    return true;
  } catch {
    return false;
  } // AuthService exposes the failure to the existing layout.
};
export const coordinationGuard: CanActivateFn = (route) =>
  inject(AuthService).user()?.perfil === 'coordenacao' ||
  inject(Router).createUrlTree(['/turmas'], { queryParams: route.queryParams });

export function safeReturn(raw: string | null): string {
  if (!raw || raw.startsWith('//') || raw.includes('://') || raw.includes('\\')) return '/turmas';
  const target = raw.replace(/^\.\//, '').replace(/^\//, '');
  const [path] = target.split('?');
  const normalized = path.replace(/\.html$/, '');
  const contextual = new RegExp(
    '^turmas/[^/]+(?:/(?:visao-geral|alunos|alunos/novo|alunos/[^/]+/editar|aulas|frequencia|avaliacoes(?:/[^/]+)?|registros/[^/]+(?:/(?:frequencia|avaliacoes))?|aulas/nova|aulas/[^/]+/editar|gerenciar))?$',
  ).test(normalized);
  if (
    !contextual &&
    !/^(?:historico|avaliacao)\/[^/]+$/.test(normalized) &&
    ![
      'inicio',
      'turmas',
      'registro-aula',
      'presencas',
      'avaliacao',
      'historico',
      'turma-form',
      'coordenacao',
      'coordenacao/cadastros',
      'coordenacao/vinculos',
      'pontos-mensais',
      'perfil',
    ].includes(normalized)
  )
    return '/turmas';
  return `/${target.replace(/\.html(?=\?|$)/, '')}`;
}
