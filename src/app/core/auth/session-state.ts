import { Injectable, signal } from '@angular/core';
import type { Session } from '../models/domain';

@Injectable({ providedIn: 'root' })
export class SessionState {
  readonly user = signal<Session | null>(null);
  readonly checked = signal(false);
  readonly error = signal('');
}
