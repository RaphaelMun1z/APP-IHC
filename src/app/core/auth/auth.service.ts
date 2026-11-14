import { Injectable, computed, signal } from '@angular/core';
import type { Session } from '../models/domain';
import { isSession } from '../data/validators';
import { storageKeys } from '../data/storage-keys';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly current = signal<Session | null>(this.readSession());
  readonly user = this.current.asReadonly();
  readonly isCoordinator = computed(() => this.user()?.perfil === 'coordenacao');
  private readonly sessionError = signal('');
  readonly error = this.sessionError.asReadonly();

  login(username: string, password: string, remember: boolean): void {
    const role = username.trim().toLowerCase();
    // Public demonstration access, retained from the original app; this is not server authentication.
    if ((role !== 'professor' && role !== 'coordenacao') || password !== 'ipb123')
      throw new Error('Usuário ou senha incorretos.');
    const user: Session =
      role === 'professor'
        ? { id: 'professor-01', nome: 'Mariana Oliveira', perfil: role }
        : { id: 'coordenacao-01', nome: 'Coordenação pedagógica', perfil: role };
    try {
      sessionStorage.setItem(storageKeys.session, JSON.stringify(user));
    } catch {
      throw new Error('Permita o armazenamento do navegador para acessar a demonstração.');
    }
    this.current.set(user);
    this.sessionError.set('');
    try {
      if (remember) localStorage.setItem(storageKeys.username, username.trim());
      else localStorage.removeItem(storageKeys.username);
    } catch {
      /* Remembering a username is optional; the session was saved successfully. */
    }
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
  logout(): void {
    try {
      sessionStorage.removeItem(storageKeys.session);
    } catch {
      const message = 'Não foi possível encerrar a sessão. Verifique o armazenamento do navegador.';
      this.sessionError.set(message);
      throw new Error(message);
    }
    this.current.set(null);
    this.sessionError.set('');
  }
  private readSession(): Session | null {
    try {
      const value: unknown = JSON.parse(sessionStorage.getItem(storageKeys.session) ?? 'null');
      return isSession(value) ? value : null;
    } catch {
      return null;
    }
  }
}
