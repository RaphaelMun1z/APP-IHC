import { Injectable, inject } from '@angular/core';
import { catchError, finalize, map, of, shareReplay, tap, throwError } from 'rxjs';
import type { Observable } from 'rxjs';
import { AuthApi } from './auth.api';
import { SessionState } from './session-state';
import { DataState } from '../api/data-state';
import { RequestState } from '../api/request-state';
import { storageKeys } from '../data/storage-keys';
import { ApiFailure } from '../api/contracts';
import { errorMessage } from '../../shared/utils/errors';
import { API_CONFIG } from '../api/api.config';
import { demoAccess } from './demo-access';

@Injectable({ providedIn: 'root' })
export class AuthService {
  readonly demoAccess = inject(API_CONFIG).mode === 'mock' ? demoAccess : null;
  private readonly api = inject(AuthApi);
  private readonly state = inject(SessionState);
  private readonly data = inject(DataState);
  private readonly requests = inject(RequestState);
  private restoring?: Observable<boolean>;
  readonly user = this.state.user.asReadonly();
  readonly error = this.state.error.asReadonly();

  restore(): Observable<boolean> {
    if (this.state.checked()) return of(!!this.user());
    if (this.restoring) return this.restoring;
    this.restoring = this.api.session().pipe(
      tap((user) => {
        this.state.user.set(user);
        this.state.checked.set(true);
        this.state.error.set('');
      }),
      map(() => true),
      catchError((error: unknown) => {
        if (error instanceof ApiFailure && error.status === 401) return of(false);
        this.state.error.set(errorMessage(error));
        return throwError(() => error);
      }),
      finalize(() => {
        this.restoring = undefined;
      }),
      shareReplay({ bufferSize: 1, refCount: true }),
    );
    return this.restoring;
  }

  async login(username: string, password: string, remember: boolean): Promise<void> {
    await this.requests.mutate(
      this.api.login({ username, password }).pipe(
        tap((user) => {
          this.data.reset();
          this.state.user.set(user);
          this.state.checked.set(true);
          this.state.error.set('');
          try {
            if (remember) localStorage.setItem(storageKeys.username, username.trim());
            else localStorage.removeItem(storageKeys.username);
          } catch {
            /* Optional preference; authentication already succeeded. */
          }
        }),
      ),
    );
  }
  rememberedUsername(): string {
    try {
      return localStorage.getItem(storageKeys.username) ?? '';
    } catch {
      return '';
    }
  }
  forgetUsername(): void {
    try {
      localStorage.removeItem(storageKeys.username);
    } catch {
      /* Optional preference. */
    }
  }
  async logout(): Promise<void> {
    try {
      await this.requests.mutate(
        this.api.logout().pipe(
          tap(() => {
            this.state.user.set(null);
            this.state.checked.set(true);
            this.state.error.set('');
            this.data.reset();
          }),
        ),
      );
    } catch (error: unknown) {
      this.state.error.set(errorMessage(error));
      throw error;
    }
  }
}
