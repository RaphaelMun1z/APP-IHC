import { inject, runInInjectionContext, EnvironmentInjector } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import type { HttpInterceptorFn } from '@angular/common/http';
import {
  catchError,
  finalize,
  of,
  switchMap,
  throwError,
  timeout,
  timer,
  TimeoutError,
} from 'rxjs';
import { API_CONFIG } from './api.config';
import { ApiFailure } from './contracts';
import type { ApiErrorBody } from './contracts';
import { RequestState } from './request-state';
import { DataState } from './data-state';
import { SessionState } from '../auth/session-state';

function apiPath(url: string, baseUrl: string): string | null {
  const base = baseUrl.replace(/\/$/, '');
  const path = url.split('?')[0];
  return path === base ? '/' : path.startsWith(`${base}/`) ? path.slice(base.length) : null;
}
function errorBody(value: unknown): value is ApiErrorBody {
  return (
    typeof value === 'object' &&
    value !== null &&
    'message' in value &&
    typeof value.message === 'string' &&
    'code' in value &&
    typeof value.code === 'string'
  );
}

const httpMessages: Readonly<Record<number, string>> = {
  0: 'Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.',
  400: 'Confira os dados informados.',
  401: 'Sua sessão expirou. Entre novamente.',
  403: 'Você não tem permissão para esta operação.',
  404: 'Recurso não encontrado.',
  409: 'O registro foi alterado. Atualize os dados e tente novamente.',
  422: 'Confira os valores informados nos campos.',
  500: 'O servidor não conseguiu concluir a operação. Tente novamente.',
  503: 'O serviço está indisponível. Tente novamente em instantes.',
};

function failureBody(error: unknown, status: number): ApiErrorBody {
  if (error instanceof TimeoutError) {
    return { code: 'TIMEOUT', message: 'O servidor demorou para responder. Tente novamente.' };
  }

  const payload: unknown = error instanceof HttpErrorResponse ? error.error : null;
  if (status >= 400 && status < 500 && errorBody(payload)) return payload;
  return {
    code: status === 0 ? 'CONNECTION_ERROR' : `HTTP_${status}`,
    message: httpMessages[status] ?? 'Não foi possível concluir a operação. Tente novamente.',
  };
}

export const apiInterceptor: HttpInterceptorFn = (request, next) => {
  const config = inject(API_CONFIG);
  if (apiPath(request.url, config.baseUrl) === null) return next(request);
  const requests = inject(RequestState);
  const session = inject(SessionState);
  const data = inject(DataState);
  requests.pending.update((count) => count + 1);
  return next(request.clone({ withCredentials: true })).pipe(
    timeout(config.timeoutMs),
    catchError((error: unknown) => {
      const status = error instanceof HttpErrorResponse ? error.status : 0;
      const body = failureBody(error, status);
      if (
        status === 401 &&
        !(request.method === 'POST' && apiPath(request.url, config.baseUrl) === '/auth/session')
      ) {
        session.user.set(null);
        session.checked.set(true);
        session.error.set(body.message);
        data.reset();
      }
      return throwError(() => new ApiFailure(status, body));
    }),
    finalize(() => requests.pending.update((count) => count - 1)),
  );
};

export const mockInterceptor: HttpInterceptorFn = (request, next) => {
  const config = inject(API_CONFIG);
  const path = apiPath(request.url, config.baseUrl);
  if (config.mode !== 'mock' || path === null) return next(request);
  const injector = inject(EnvironmentInjector);
  return timer(config.mock.latencyMs).pipe(
    switchMap(() => import('./mock/mock-api')),
    switchMap(({ MockApi }) => {
      if (config.mock.failureStatus !== null)
        throw new HttpErrorResponse({
          status: config.mock.failureStatus,
          url: request.urlWithParams,
          error: { code: 'MOCK_FAILURE', message: 'Falha simulada na API.' },
        });
      const handle = () =>
        runInInjectionContext(injector, () => inject(MockApi).handle(request, path));
      // Tabs share the mock collection, so serialize its read/check/append operation.
      if (path === '/pontos-mensais' && request.method === 'POST' && navigator.locks) {
        return navigator.locks.request('ipb:monthly-time:create', handle);
      }
      return of(handle());
    }),
  );
};
