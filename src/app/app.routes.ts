import { inject } from '@angular/core';
import { Router } from '@angular/router';
import type { Routes } from '@angular/router';
import { authGuard, coordinationGuard, loginEntryGuard } from './core/auth/auth.guards';
import { classAccessGuard } from './core/navigation/class-access.guard';
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
  { path: '', pathMatch: 'full', redirectTo: 'turmas' },
  { path: 'index.html', pathMatch: 'full', redirectTo: 'turmas' },
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
    title: 'Entrar | IPB',
    loadComponent: () => import('./features/auth/login').then((module) => module.Login),
  },
  {
    path: '',
    canActivate: [authGuard],
    canActivateChild: [authGuard],
    loadComponent: () => import('./layouts/app-layout').then((module) => module.AppLayout),
    children: [
      { path: 'inicio', pathMatch: 'full', redirectTo: 'turmas' },
      {
        path: 'turmas',
        title: 'Minhas turmas | IPB',
        loadComponent: () => import('./features/classes/classes').then((module) => module.Classes),
      },
      {
        path: 'perfil',
        title: 'Meu perfil | IPB',
        loadComponent: () => import('./features/profile/profile').then((module) => module.Profile),
      },
      {
        path: 'pontos-mensais',
        title: 'Ponto mensal | IPB',
        loadComponent: () => import('./features/profile/monthly-time').then((m) => m.MonthlyTime),
      },
      {
        path: 'turmas/:turma',
        canActivate: [classAccessGuard],
        loadComponent: () => import('./features/classes/class-shell').then((m) => m.ClassShell),
        children: [
          { path: '', pathMatch: 'full', redirectTo: 'visao-geral' },
          {
            path: 'alunos/:aluno/editar',
            data: { section: 'student-registration' },
            canDeactivate: [unsavedChangesGuard],
            loadComponent: () =>
              import('./features/classes/student-registration').then((m) => m.StudentRegistration),
          },
          {
            path: 'alunos/novo',
            data: { section: 'student-registration' },
            canDeactivate: [unsavedChangesGuard],
            loadComponent: () =>
              import('./features/classes/student-registration').then((m) => m.StudentRegistration),
          },
          ...['visao-geral', 'alunos', 'aulas'].map((section) => ({
            path: section,
            data: { section },
            loadComponent: () =>
              import('./features/classes/class-details').then((m) => m.ClassDetails),
          })),
          {
            path: 'aulas/nova',
            data: { section: 'aulas' },
            canDeactivate: [unsavedChangesGuard],
            loadComponent: () =>
              import('./features/lessons/lesson-editor').then((m) => m.LessonEditor),
          },
          {
            path: 'aulas/:id/editar',
            data: { section: 'aulas' },
            canDeactivate: [unsavedChangesGuard],
            loadComponent: () =>
              import('./features/lessons/lesson-editor').then((m) => m.LessonEditor),
          },
          {
            path: 'registros/:id',
            data: { section: 'lesson' },
            loadComponent: () =>
              import('./features/lessons/lesson-workspace').then((m) => m.LessonWorkspace),
            children: [
              {
                path: '',
                pathMatch: 'full',
                loadComponent: () =>
                  import('./features/history/record-page').then((m) => m.RecordPage),
              },
              {
                path: 'frequencia',
                canDeactivate: [unsavedChangesGuard],
                loadComponent: () =>
                  import('./features/attendance/attendance').then((m) => m.Attendance),
              },
              {
                path: 'avaliacoes',
                canDeactivate: [unsavedChangesGuard],
                loadComponent: () =>
                  import('./features/assessments/assessments').then((m) => m.Assessments),
              },
            ],
          },
          {
            path: 'frequencia',
            canDeactivate: [unsavedChangesGuard],
            loadComponent: () =>
              import('./features/attendance/attendance').then((m) => m.Attendance),
          },
          {
            path: 'avaliacoes',
            canDeactivate: [unsavedChangesGuard],
            loadComponent: () =>
              import('./features/assessments/assessments').then((m) => m.Assessments),
          },
          {
            path: 'avaliacoes/:aulaId',
            canDeactivate: [unsavedChangesGuard],
            loadComponent: () =>
              import('./features/assessments/assessments').then((m) => m.Assessments),
          },
          {
            path: 'gerenciar',
            canDeactivate: [unsavedChangesGuard],
            loadComponent: () =>
              import('./features/coordination/class-editor').then((m) => m.ClassEditor),
          },
        ],
      },
      {
        path: 'historico/:id',
        loadComponent: () => import('./features/history/record-page').then((m) => m.RecordPage),
      },
      {
        path: 'registro-aula',
        title: 'Registro de aula | IPB',
        canDeactivate: [unsavedChangesGuard],
        loadComponent: () =>
          import('./features/lessons/lesson-editor').then((module) => module.LessonEditor),
      },
      {
        path: 'presencas',
        title: 'Frequência | IPB',
        canDeactivate: [unsavedChangesGuard],
        loadComponent: () =>
          import('./features/attendance/attendance').then((module) => module.Attendance),
      },
      {
        path: 'avaliacao',
        title: 'Avaliação dos alunos | IPB',
        canDeactivate: [unsavedChangesGuard],
        loadComponent: () =>
          import('./features/assessments/assessments').then((module) => module.Assessments),
      },
      {
        path: 'avaliacao/:aulaId',
        title: 'Avaliação dos alunos | IPB',
        canDeactivate: [unsavedChangesGuard],
        loadComponent: () =>
          import('./features/assessments/assessments').then((module) => module.Assessments),
      },
      { path: 'historico', pathMatch: 'full', redirectTo: 'turmas' },
      ...['', 'cadastros', 'vinculos'].map((view) => ({
        path: view ? 'coordenacao/' + view : 'coordenacao',
        data: { view },
        canDeactivate: [unsavedChangesGuard],
        title: 'Coordenação pedagógica | IPB',
        canActivate: [coordinationGuard],
        loadComponent: () => import('./features/coordination/academic-catalog').then((m) => m.AcademicCatalog),
      })),
      {
        path: 'turma-form',
        canDeactivate: [unsavedChangesGuard],
        title: 'Turma | IPB',
        loadComponent: () =>
          import('./features/coordination/class-editor').then((module) => module.ClassEditor),
      },
    ],
  },
  {
    path: '**',
    title: 'Página não encontrada | IPB',
    loadComponent: () => import('./shared/ui/not-found').then((module) => module.NotFound),
  },
];
