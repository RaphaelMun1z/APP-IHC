import { inject } from '@angular/core';
import { Router } from '@angular/router';
import type { Routes } from '@angular/router';
import { authGuard, coordinatorGuard, loginEntryGuard } from './core/auth/auth.guards';
import { unsavedChangesGuard } from './core/navigation/unsaved-changes';

const pages = [
  'login',
  'inicio',
  'turmas',
  'registro-aula',
  'presencas',
  'avaliacao',
  'historico',
  'coordenacao',
  'turma-form',
];
export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'inicio' },
  { path: 'index.html', pathMatch: 'full', redirectTo: 'inicio' },
  ...pages.map((path) => ({
    path: `${path}.html`,
    redirectTo: () => {
      const router = inject(Router);
      const queryParams = router.getCurrentNavigation()?.extractedUrl.queryParams;
      return router.createUrlTree([`/${path}`], { queryParams });
    },
  })),
  {
    path: 'login',
    canActivate: [loginEntryGuard],
    title: 'Entrar | IPB · APP 1',
    loadComponent: () => import('./features/auth/login').then((module) => module.Login),
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./layouts/app-layout').then((module) => module.AppLayout),
    children: [
      {
        path: 'inicio',
        title: 'Início | IPB · APP 1',
        loadComponent: () => import('./features/home/home').then((module) => module.Home),
      },
      {
        path: 'turmas',
        title: 'Minhas turmas | IPB · APP 1',
        loadComponent: () => import('./features/classes/classes').then((module) => module.Classes),
      },
      {
        path: 'registro-aula',
        title: 'Registro de aula | IPB · APP 1',
        canDeactivate: [unsavedChangesGuard],
        loadComponent: () =>
          import('./features/lessons/lesson-editor').then((module) => module.LessonEditor),
      },
      {
        path: 'presencas',
        title: 'Frequência | IPB · APP 1',
        canDeactivate: [unsavedChangesGuard],
        loadComponent: () =>
          import('./features/attendance/attendance').then((module) => module.Attendance),
      },
      {
        path: 'avaliacao',
        title: 'Avaliação dos alunos | IPB · APP 1',
        canDeactivate: [unsavedChangesGuard],
        loadComponent: () =>
          import('./features/assessments/assessments').then((module) => module.Assessments),
      },
      {
        path: 'historico',
        title: 'Histórico | IPB · APP 1',
        loadComponent: () => import('./features/history/history').then((module) => module.History),
      },
      {
        path: 'coordenacao',
        canActivate: [coordinatorGuard],
        title: 'Coordenação pedagógica | IPB · APP 1',
        loadComponent: () =>
          import('./features/coordination/coordination').then((module) => module.Coordination),
      },
      {
        path: 'turma-form',
        canActivate: [coordinatorGuard],
        canDeactivate: [unsavedChangesGuard],
        title: 'Turma | IPB · APP 1',
        loadComponent: () =>
          import('./features/coordination/class-editor').then((module) => module.ClassEditor),
      },
    ],
  },
  {
    path: '**',
    title: 'Página não encontrada | IPB · APP 1',
    loadComponent: () => import('./shared/ui/not-found').then((module) => module.NotFound),
  },
];
