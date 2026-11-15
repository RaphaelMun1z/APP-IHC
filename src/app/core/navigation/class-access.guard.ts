import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { ClassesStore } from '../../features/classes/classes.store';
import { contextParam } from './context';
import { DataState } from '../api/data-state';

export const classAccessGuard: CanActivateFn = (route) =>
  !inject(DataState).ready() ||
  !!inject(ClassesStore).get(contextParam(route, 'turma') ?? '') ||
  inject(Router).createUrlTree(['/turmas'], { queryParams: { indisponivel: '1' } });
