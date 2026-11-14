import { Injectable, signal } from '@angular/core';
import { isDate } from '../../shared/utils/dates';

/** UI filters only: pedagogical data remains in the existing stores. */
@Injectable({ providedIn: 'root' })
export class ClassNavigationState {
  private readonly key = 'ipb-navegacao-turmas-v1';
  private readonly dates = signal<Readonly<Record<string, string>>>(this.read());
  private read(): Readonly<Record<string, string>> {
    try {
      const value: unknown = JSON.parse(sessionStorage.getItem(this.key) ?? '{}');
      if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
      return Object.fromEntries(
        Object.entries(value).filter(
          ([key, date]) =>
            /^[^/]+\/(frequencia|avaliacoes)$/.test(key) &&
            typeof date === 'string' &&
            isDate(date),
        ),
      );
    } catch {
      return {};
    }
  }
  remember(turma: string, section: string, date: string): void {
    this.dates.update((values) => ({ ...values, [`${turma}/${section}`]: date }));
    try {
      sessionStorage.setItem(this.key, JSON.stringify(this.dates()));
    } catch {
      /* Optional UI preference; never blocks pedagogical work. */
    }
  }
  params(turma: string, section: string): { data?: string } {
    const data = this.dates()[`${turma}/${section}`];
    return data ? { data } : {};
  }
}
